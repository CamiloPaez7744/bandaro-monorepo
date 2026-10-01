import { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, type StyleProp, type ViewStyle, PanResponder, GestureResponderEvent, Platform } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Polygon, Polyline, RadialGradient, Rect, Stop, Path, Ellipse, Image as SvgImage } from 'react-native-svg';
import { IconHandClick, IconTarget } from '@/src/presentation/components/icons';
import { getTableDecalSource } from './tableDecals';

import {
    Ball,
    BallId,
    Vec2,
    TrajectoryPrediction,
    DEFAULT_TABLE,
    vec2,
    vec2Sub,
    vec2Normalize,
    TrajectoryGuideConfig,
    DEFAULT_GUIDE_CONFIG,
    STRICT_BALL_GUIDE_COLORS,
    getGuideStrokeDashArray,
    filterAimTrajectory,
} from '@bandaro/core';
import { CushionRuler } from './CushionRuler';
import { SystemNumberingOverlay, NumberAnchor, Formula } from './SystemNumberingOverlay';
import {
    DEFAULT_TABLE_PREFERENCES,
    resolveClothPalette,
    resolveWoodPalette,
    resolveCornerMetalPalette,
    type TablePreferences,
    type BallSkinId,
} from './tablePreferences';
import { CaromCueGadget } from './CaromCueGadget';
import {
    Quaternion,
    INITIAL_BALL_QUATERNION,
    updateBallOrientation,
    projectSpherePointToSvg,
    projectSphereRingToSvg,
    SPHERE_OCTAHEDRAL_DOTS,
    SPHERE_CLASSIC_DOTS,
    PBA_VISION_RING_1,
    PBA_VISION_RING_2,
    DYNASPHERES_RING,
} from './ballPhysics3D';
import type { CollisionPulse } from '../../hooks/useTrainingSimulation';

type Orientation = 'horizontal' | 'vertical';

interface InteractiveBilliardsTableProps {
    orientation?: Orientation;
    style?: StyleProp<ViewStyle>;
    balls: Ball[];
    cueBallId: BallId;
    trajectory: TrajectoryPrediction | null;
    dynamicTrails?: Record<BallId, { pos: Vec2; timestamp?: number }[]>;
    collisionPulses?: CollisionPulse[];
    aimDirection?: Vec2;
    powerLevel?: number;
    tablePreferences?: TablePreferences;
    categoryColor?: string;
    guideConfig?: TrajectoryGuideConfig;
    showCueStick?: boolean;
    showGhostBall?: boolean;
    onBallMove?: (ballId: BallId, position: Vec2) => void;
    onAimChange?: (direction: Vec2) => void;
    isSimulating?: boolean;
    isEditMode?: boolean;
    showGuides?: boolean;
    showRuler?: boolean;
    numberingAnchors?: NumberAnchor[];
    numberingFormula?: Formula | null;
    showNumbering?: boolean;
    onNumberingAnchorsChange?: (anchors: NumberAnchor[]) => void;
    onPowerChange?: (powerPercentage: number) => void;
    onShoot?: (powerPercentage: number) => void;
}

const TABLE_W = DEFAULT_TABLE.width;
const TABLE_H = DEFAULT_TABLE.height;

const longRailRatios = Array.from({ length: 7 }, (_, index) => (index + 1) / 8);
const shortRailRatios = Array.from({ length: 3 }, (_, index) => (index + 1) / 4);
const outerMargin = 0;
const longGridLines = 7;
const shortGridLines = 3;

function getLayout(orientation: Orientation) {
    const isVertical = orientation === 'vertical';
    const aspect = isVertical ? 0.5 : 2;
    // En orientación vertical (modo móvil / smartphone): pasamanos y bandas robustas y gruesas estilo 8 Ball Pool.
    // En orientación horizontal (modo web / desktop panorámico): pasamanos y bandas delgadas y elegantes originales (8.27 y 3.5).
    const railT = isVertical ? 22.0 : DEFAULT_TABLE.railThickness; // 8.27
    const cushionT = isVertical ? 8.5 : DEFAULT_TABLE.cushionThickness; // 3.5

    const basePlayW = TABLE_W;
    const basePlayH = basePlayW / aspect;
    const cushionX = basePlayW + cushionT * 2;
    const cushionY = basePlayH + cushionT * 2;
    const railW = cushionX + railT * 2;
    const railH = cushionY + railT * 2;
    const viewBoxW = railW + outerMargin * 2;
    const viewBoxH = railH + outerMargin * 2;

    const railX = outerMargin;
    const railY = outerMargin;
    const cx = outerMargin + railT;
    const cy = outerMargin + railT;
    const playX = cx + cushionT;
    const playY = cy + cushionT;

    return {
        viewBox: { width: viewBoxW, height: viewBoxH },
        tableX: railX,
        tableY: railY,
        tableW: railW,
        tableH: railH,
        playX,
        playY,
        playW: basePlayW,
        playH: basePlayH,
        railX,
        railY,
        railW,
        railH,
        cushionX: cx,
        cushionY: cy,
        cushionW: cushionX,
        cushionH: cushionY,
        railThickness: railT,
        cushionThickness: cushionT,
    };
}

function mapPointToSvg(point: Vec2, orientation: Orientation, layout: ReturnType<typeof getLayout>) {
    if (orientation === 'horizontal') {
        return {
            x: layout.playX + (point.x / TABLE_W) * layout.playW,
            y: layout.playY + (point.y / TABLE_H) * layout.playH,
        };
    }

    return {
        x: layout.playX + (point.y / TABLE_H) * layout.playW,
        y: layout.playY + ((TABLE_W - point.x) / TABLE_W) * layout.playH,
    };
}

function mapSvgToPoint(svgX: number, svgY: number, orientation: Orientation, layout: ReturnType<typeof getLayout>): Vec2 {
    if (orientation === 'horizontal') {
        return {
            x: ((svgX - layout.playX) / layout.playW) * TABLE_W,
            y: ((svgY - layout.playY) / layout.playH) * TABLE_H,
        };
    }

    return {
        x: TABLE_W - ((svgY - layout.playY) / layout.playH) * TABLE_W,
        y: ((svgX - layout.playX) / layout.playW) * TABLE_H,
    };
}

function getDiamondPoints(orientation: Orientation, layout: ReturnType<typeof getLayout>) {
    const railT = layout.railThickness;
    const railCenterTop = layout.railY + railT / 2;
    const railCenterBottom = layout.railY + layout.railH - railT / 2;
    const railCenterLeft = layout.railX + railT / 2;
    const railCenterRight = layout.railX + layout.railW - railT / 2;

    const playLeft = layout.playX;
    const playRight = layout.playX + layout.playW;
    const playTop = layout.playY;
    const playBottom = layout.playY + layout.playH;

    if (orientation === 'horizontal') {
        return {
            longSide: longRailRatios.flatMap((ratio) => [
                { x: layout.playX + layout.playW * ratio, y: railCenterTop },
                { x: layout.playX + layout.playW * ratio, y: railCenterBottom },
            ]),
            shortSide: shortRailRatios.flatMap((ratio) => [
                { x: railCenterLeft, y: layout.playY + layout.playH * ratio },
                { x: railCenterRight, y: layout.playY + layout.playH * ratio },
            ]),
            corners: [
                { x: playLeft, y: railCenterTop },
                { x: railCenterLeft, y: playTop },
                { x: playRight, y: railCenterTop },
                { x: railCenterRight, y: playTop },
                { x: playLeft, y: railCenterBottom },
                { x: railCenterLeft, y: playBottom },
                { x: playRight, y: railCenterBottom },
                { x: railCenterRight, y: playBottom },
            ],
        };
    }

    return {
        longSide: longRailRatios.flatMap((ratio) => [
            { x: railCenterLeft, y: layout.playY + layout.playH * ratio },
            { x: railCenterRight, y: layout.playY + layout.playH * ratio },
        ]),
        shortSide: shortRailRatios.flatMap((ratio) => [
            { x: layout.playX + layout.playW * ratio, y: railCenterTop },
            { x: layout.playX + layout.playW * ratio, y: railCenterBottom },
        ]),
        corners: [
            { x: railCenterLeft, y: playTop },
            { x: playLeft, y: railCenterTop },
            { x: railCenterRight, y: playTop },
            { x: playRight, y: railCenterTop },
            { x: railCenterLeft, y: playBottom },
            { x: playLeft, y: railCenterBottom },
            { x: railCenterRight, y: playBottom },
            { x: playRight, y: railCenterBottom },
        ],
    };
}

function getDiamondSvgPosition(
    side: 'top' | 'bottom' | 'left' | 'right',
    index: number,
    orientation: Orientation,
    layout: ReturnType<typeof getLayout>
): { x: number; y: number } | null {
    const railT = layout.railThickness;
    const labelOffset = railT * 1.15;
    const railCenterTop = layout.railY + railT / 2;
    const railCenterBottom = layout.railY + layout.railH - railT / 2;
    const railCenterLeft = layout.railX + railT / 2;
    const railCenterRight = layout.railX + layout.railW - railT / 2;

    let baseX: number;
    let baseY: number;

    switch (side) {
        case 'top':
            baseX = layout.playX + (layout.playW * index) / (orientation === 'horizontal' ? 8 : 4);
            baseY = railCenterTop;
            return { x: baseX, y: baseY - labelOffset };
        case 'bottom':
            baseX = layout.playX + (layout.playW * index) / (orientation === 'horizontal' ? 8 : 4);
            baseY = railCenterBottom;
            return { x: baseX, y: baseY + labelOffset };
        case 'left':
            baseX = railCenterLeft;
            baseY = layout.playY + (layout.playH * index) / (orientation === 'horizontal' ? 4 : 8);
            return { x: baseX - labelOffset, y: baseY };
        case 'right':
            baseX = railCenterRight;
            baseY = layout.playY + (layout.playH * index) / (orientation === 'horizontal' ? 4 : 8);
            return { x: baseX + labelOffset, y: baseY };
        default:
            return null;
    }
}


function resolveBallDragPosition(
    targetX: number,
    targetY: number,
    ballRadius: number,
    tableWidth: number,
    tableHeight: number,
    otherBalls: Ball[]
): Vec2 {
    const minX = ballRadius;
    const maxX = tableWidth - ballRadius;
    const minY = ballRadius;
    const maxY = tableHeight - ballRadius;
    const minDist = ballRadius * 2 + 0.05;

    let bestX = Math.max(minX, Math.min(maxX, targetX));
    let bestY = Math.max(minY, Math.min(maxY, targetY));

    for (let iter = 0; iter < 12; iter++) {
        let anyViolated = false;
        for (const ob of otherBalls) {
            const dx = bestX - ob.pos.x;
            const dy = bestY - ob.pos.y;
            const dist = Math.hypot(dx, dy);

            if (dist < minDist - 1e-4) {
                anyViolated = true;
                const candidates: Vec2[] = [];

                // 1. Proyección radial directa alejándose de la otra bola
                let dirX = dx;
                let dirY = dy;
                if (dist < 1e-4) {
                    dirX = ob.pos.x < (minX + maxX) / 2 ? 1 : -1;
                    dirY = ob.pos.y < (minY + maxY) / 2 ? 1 : -1;
                }
                const len = Math.hypot(dirX, dirY);
                const rx = ob.pos.x + (dirX / len) * minDist;
                const ry = ob.pos.y + (dirY / len) * minDist;
                if (rx >= minX - 1e-4 && rx <= maxX + 1e-4 && ry >= minY - 1e-4 && ry <= maxY + 1e-4) {
                    candidates.push({
                        x: Math.max(minX, Math.min(maxX, rx)),
                        y: Math.max(minY, Math.min(maxY, ry)),
                    });
                }

                // 2. Desplazamiento perimetral sobre las bandas para esquinas y laterales
                // Banda izquierda
                if (Math.abs(minX - ob.pos.x) < minDist) {
                    const reqDy = Math.sqrt(Math.max(0, minDist * minDist - (minX - ob.pos.x) * (minX - ob.pos.x)));
                    if (ob.pos.y + reqDy <= maxY + 1e-4) candidates.push({ x: minX, y: Math.min(maxY, ob.pos.y + reqDy) });
                    if (ob.pos.y - reqDy >= minY - 1e-4) candidates.push({ x: minX, y: Math.max(minY, ob.pos.y - reqDy) });
                }
                // Banda derecha
                if (Math.abs(maxX - ob.pos.x) < minDist) {
                    const reqDy = Math.sqrt(Math.max(0, minDist * minDist - (maxX - ob.pos.x) * (maxX - ob.pos.x)));
                    if (ob.pos.y + reqDy <= maxY + 1e-4) candidates.push({ x: maxX, y: Math.min(maxY, ob.pos.y + reqDy) });
                    if (ob.pos.y - reqDy >= minY - 1e-4) candidates.push({ x: maxX, y: Math.max(minY, ob.pos.y - reqDy) });
                }
                // Banda superior
                if (Math.abs(minY - ob.pos.y) < minDist) {
                    const reqDx = Math.sqrt(Math.max(0, minDist * minDist - (minY - ob.pos.y) * (minY - ob.pos.y)));
                    if (ob.pos.x + reqDx <= maxX + 1e-4) candidates.push({ x: Math.min(maxX, ob.pos.x + reqDx), y: minY });
                    if (ob.pos.x - reqDx >= minX - 1e-4) candidates.push({ x: Math.max(minX, ob.pos.x - reqDx), y: minY });
                }
                // Banda inferior
                if (Math.abs(maxY - ob.pos.y) < minDist) {
                    const reqDx = Math.sqrt(Math.max(0, minDist * minDist - (maxY - ob.pos.y) * (maxY - ob.pos.y)));
                    if (ob.pos.x + reqDx <= maxX + 1e-4) candidates.push({ x: Math.min(maxX, ob.pos.x + reqDx), y: maxY });
                    if (ob.pos.x - reqDx >= minX - 1e-4) candidates.push({ x: Math.max(minX, ob.pos.x - reqDx), y: maxY });
                }

                // Seleccionar el candidato más cercano al toque del usuario minimizando colisión con terceras bolas
                let bestCand: Vec2 | null = null;
                let bestScore = Infinity;
                for (const c of candidates) {
                    let penalty = 0;
                    for (const other of otherBalls) {
                        if (other === ob) continue;
                        const dOther = Math.hypot(c.x - other.pos.x, c.y - other.pos.y);
                        if (dOther < minDist) {
                            penalty += (minDist - dOther) * 1000;
                        }
                    }
                    const dSq = (c.x - targetX) ** 2 + (c.y - targetY) ** 2 + penalty;
                    if (dSq < bestScore) {
                        bestScore = dSq;
                        bestCand = c;
                    }
                }

                if (bestCand) {
                    bestX = bestCand.x;
                    bestY = bestCand.y;
                }
            }
        }
        if (!anyViolated) break;
    }

    return { x: bestX, y: bestY };
}

function InteractiveBilliardsTableBase(props: Readonly<InteractiveBilliardsTableProps>) {
    const {
        orientation = 'vertical',
        style,
        balls,
        cueBallId,
        trajectory,
        dynamicTrails,
        collisionPulses,
        aimDirection = vec2(1, 0),
        powerLevel = 0,
        tablePreferences = DEFAULT_TABLE_PREFERENCES,
        categoryColor,
        guideConfig = DEFAULT_GUIDE_CONFIG,
        showCueStick = true,
        showGhostBall = true,
        onBallMove,
        onAimChange,
        isSimulating = false,
        isEditMode = false,
        showGuides = true,
        showRuler = false,
        numberingAnchors = [],
        numberingFormula = null,
        showNumbering = false,
        onNumberingAnchorsChange,
        onPowerChange,
        onShoot,
    } = props;

    const tableUid = useMemo(() => `ibt_${Math.random().toString(36).slice(2, 8)}`, []);

    const clothPalette = useMemo(
        () => resolveClothPalette(tablePreferences.clothColor),
        [tablePreferences.clothColor]
    );
    const woodPalette = useMemo(
        () => resolveWoodPalette(tablePreferences.woodFinish),
        [tablePreferences.woodFinish]
    );
    const metalPalette = useMemo(
        () => resolveCornerMetalPalette(tablePreferences.cornerMetal),
        [tablePreferences.cornerMetal]
    );

    const layout = getLayout(orientation);
    const diamonds = useMemo(() => getDiamondPoints(orientation, layout), [orientation, layout]);
    const containerRef = useRef<View>(null);
    const containerSizeRef = useRef({ width: 0, height: 0 });
    const [draggingBallId, setDraggingBallId] = useState<BallId | null>(null);
    
    const isEditModeRef = useRef(isEditMode);
    const isSimulatingRef = useRef(isSimulating);
    const ballsRef = useRef(balls);
    const cueBallIdRef = useRef(cueBallId);
    const layoutRef = useRef(layout);
    const orientationRef = useRef(orientation);
    const onBallMoveRef = useRef(onBallMove);
    const onAimChangeRef = useRef(onAimChange);
    const onNumberingAnchorsChangeRef = useRef(onNumberingAnchorsChange);
    const numberingAnchorsRef = useRef(numberingAnchors);
    const showNumberingRef = useRef(showNumbering);
    const draggingBallIdRef = useRef<BallId | null>(null);
    const draggingNumberIdRef = useRef<string | null>(null);
    const onPowerChangeRef = useRef(onPowerChange);
    const onShootRef = useRef(onShoot);
    const aimDirectionRef = useRef(aimDirection);
    const isDraggingCueRef = useRef(false);
    const cueDragStartProjRef = useRef(0);
    const cueDragStartPowerRef = useRef(0);
    const currentPowerRef = useRef(powerLevel);

    isEditModeRef.current = isEditMode;
    isSimulatingRef.current = isSimulating;
    ballsRef.current = balls;
    cueBallIdRef.current = cueBallId;
    layoutRef.current = layout;
    orientationRef.current = orientation;
    onBallMoveRef.current = onBallMove;
    onAimChangeRef.current = onAimChange;
    onNumberingAnchorsChangeRef.current = onNumberingAnchorsChange;
    onPowerChangeRef.current = onPowerChange;
    onShootRef.current = onShoot;
    aimDirectionRef.current = aimDirection;
    currentPowerRef.current = powerLevel;
    numberingAnchorsRef.current = numberingAnchors;
    showNumberingRef.current = showNumbering;
    draggingBallIdRef.current = draggingBallId;

    const ballColors: Record<BallId, { color: string; border: string; gradientId: string }> = {
        white: { color: '#f8fafc', border: '#94a3b8', gradientId: `${tableUid}_ballWhite` },
        yellow: { color: '#facc15', border: '#ca8a04', gradientId: `${tableUid}_ballYellow` },
        red: { color: '#ef4444', border: '#991b1b', gradientId: `${tableUid}_ballRed` },
    };

    const ballRotationsRef = useRef<Record<BallId, Quaternion>>({
        white: [...INITIAL_BALL_QUATERNION],
        yellow: [...INITIAL_BALL_QUATERNION],
        red: [...INITIAL_BALL_QUATERNION],
    });
    const prevBallPositionsRef = useRef<Record<BallId, Vec2>>({
        white: { x: -1, y: -1 },
        yellow: { x: -1, y: -1 },
        red: { x: -1, y: -1 },
    });

    // Actualización continua de rotación física sobre la superficie esférica en 3D
    for (const b of balls) {
        const prev = prevBallPositionsRef.current[b.id];
        if (prev && prev.x >= 0 && prev.y >= 0) {
            const dx = b.pos.x - prev.x;
            const dy = b.pos.y - prev.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.001 && dist < 25) {
                ballRotationsRef.current[b.id] = updateBallOrientation(
                    ballRotationsRef.current[b.id],
                    dx,
                    dy,
                    b.spin?.x ?? 0,
                    b.radius || 3.075
                );
            } else if (dist >= 25) {
                ballRotationsRef.current[b.id] = [...INITIAL_BALL_QUATERNION];
            }
        }
        prevBallPositionsRef.current[b.id] = { ...b.pos };
    }

    const screenToTableRef = useCallback(
        (screenX: number, screenY: number): Vec2 => {
            const size = containerSizeRef.current;
            const lay = layoutRef.current;
            const orient = orientationRef.current;
            
            if (size.width === 0 || size.height === 0) {
                return vec2(0, 0);
            }

            const scaleX = lay.viewBox.width / size.width;
            const scaleY = lay.viewBox.height / size.height;

            const svgX = screenX * scaleX;
            const svgY = screenY * scaleY;

            return mapSvgToPoint(svgX, svgY, orient, lay);
        },
        []
    );

    const findBallAtPointRef = useCallback(
        (tableX: number, tableY: number): BallId | null => {
            const hitRadius = 18;
            let closestBallId: BallId | null = null;
            let minDistance = hitRadius;

            for (const ball of ballsRef.current) {
                const dx = ball.pos.x - tableX;
                const dy = ball.pos.y - tableY;
                const dist = Math.hypot(dx, dy);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestBallId = ball.id;
                }
            }
            return closestBallId;
        },
        []
    );

    const findNumberAtSvgPoint = useCallback(
        (svgX: number, svgY: number): string | null => {
            const lay = layoutRef.current;
            const orient = orientationRef.current;
            const anchors = numberingAnchorsRef.current;
            const hitRadius = lay.railThickness * 0.8;

            for (const anchor of anchors) {
                let ax: number;
                let ay: number;

                if (anchor.x !== undefined && anchor.y !== undefined) {
                    ax = anchor.x;
                    ay = anchor.y;
                } else if (anchor.side !== undefined && anchor.diamondIndex !== undefined) {
                    const diamond = getDiamondSvgPosition(anchor.side, anchor.diamondIndex, orient, lay);
                    if (!diamond) continue;
                    ax = diamond.x;
                    ay = diamond.y;
                } else {
                    continue;
                }

                const dx = ax - svgX;
                const dy = ay - svgY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < hitRadius) {
                    return anchor.id;
                }
            }
            return null;
        },
        []
    );

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isSimulatingRef.current,
            onMoveShouldSetPanResponder: () => !isSimulatingRef.current,
            onPanResponderGrant: (event: GestureResponderEvent) => {
                if (isSimulatingRef.current) return;

                const { locationX, locationY } = event.nativeEvent;
                const size = containerSizeRef.current;
                const lay = layoutRef.current;

                if (size.width === 0 || size.height === 0) return;

                const svgX = locationX * (lay.viewBox.width / size.width);
                const svgY = locationY * (lay.viewBox.height / size.height);

                if (isEditModeRef.current) {
                    // Check if tapping on a number (when numbering is visible)
                    if (showNumberingRef.current) {
                        const numberId = findNumberAtSvgPoint(svgX, svgY);
                        if (numberId) {
                            draggingNumberIdRef.current = numberId;
                            return;
                        }
                    }

                    // Check if tapping on a ball
                    const tablePos = screenToTableRef(locationX, locationY);
                    const ballId = findBallAtPointRef(tablePos.x, tablePos.y);
                    if (ballId) {
                        draggingBallIdRef.current = ballId;
                        setDraggingBallId(ballId);
                    }
                } else {
                    const tablePos = screenToTableRef(locationX, locationY);
                    const cueBall = ballsRef.current.find((b) => b.id === cueBallIdRef.current);
                    if (!cueBall) return;

                    const aimDir = vec2Normalize(aimDirectionRef.current);
                    const toTouch = vec2Sub(tablePos, cueBall.pos);
                    // Projection along reverse aim vector (where the cue stick body extends):
                    const projBack = toTouch.x * (-aimDir.x) + toTouch.y * (-aimDir.y);
                    const perpDist = Math.abs(toTouch.x * aimDir.y - toTouch.y * aimDir.x);

                    // If user touches along the cue stick body:
                    if (projBack > 4 && projBack < 280 && perpDist < 26) {
                        isDraggingCueRef.current = true;
                        cueDragStartProjRef.current = projBack;
                        cueDragStartPowerRef.current = currentPowerRef.current;
                        return;
                    }

                    // Otherwise user touched on table to aim:
                    isDraggingCueRef.current = false;
                    if (onAimChangeRef.current) {
                        const direction = vec2Normalize(toTouch);
                        onAimChangeRef.current(direction);
                    }
                }
            },
            onPanResponderMove: (event: GestureResponderEvent) => {
                if (isSimulatingRef.current) return;

                const { locationX, locationY } = event.nativeEvent;
                const size = containerSizeRef.current;
                const lay = layoutRef.current;

                if (size.width === 0 || size.height === 0) return;

                const svgX = locationX * (lay.viewBox.width / size.width);
                const svgY = locationY * (lay.viewBox.height / size.height);

                // Handle number dragging
                const currentDraggingNumber = draggingNumberIdRef.current;
                if (isEditModeRef.current && currentDraggingNumber && onNumberingAnchorsChangeRef.current) {
                    const anchors = numberingAnchorsRef.current;
                    const updatedAnchors = anchors.map((anchor) => {
                        if (anchor.id === currentDraggingNumber) {
                            return { ...anchor, x: svgX, y: svgY, side: undefined, diamondIndex: undefined };
                        }
                        return anchor;
                    });
                    onNumberingAnchorsChangeRef.current(updatedAnchors);
                    return;
                }

                // Handle ball dragging
                const tablePos = screenToTableRef(locationX, locationY);
                const currentDraggingBall = draggingBallIdRef.current;

                if (isEditModeRef.current && currentDraggingBall && onBallMoveRef.current) {
                    const draggingBall = ballsRef.current.find((b) => b.id === currentDraggingBall);
                    if (!draggingBall) return;

                    const ballRadius = draggingBall.radius;
                    
                    const otherBalls = ballsRef.current.filter((b) => b.id !== currentDraggingBall);
                    const resolved = resolveBallDragPosition(
                        tablePos.x,
                        tablePos.y,
                        ballRadius,
                        TABLE_W,
                        TABLE_H,
                        otherBalls
                    );

                    onBallMoveRef.current(currentDraggingBall, vec2(resolved.x, resolved.y));
                } else if (!isEditModeRef.current) {
                    const cueBall = ballsRef.current.find((b) => b.id === cueBallIdRef.current);
                    if (!cueBall) return;

                    if (isDraggingCueRef.current) {
                        const aimDir = vec2Normalize(aimDirectionRef.current);
                        const toTouch = vec2Sub(tablePos, cueBall.pos);
                        const currentProj = toTouch.x * (-aimDir.x) + toTouch.y * (-aimDir.y);
                        const delta = currentProj - cueDragStartProjRef.current;
                        // 45 units pull = 100% power
                        const newPower = Math.max(0, Math.min(100, Math.round(cueDragStartPowerRef.current + (delta / 45) * 100)));
                        currentPowerRef.current = newPower;
                        onPowerChangeRef.current?.(newPower);
                    } else if (onAimChangeRef.current) {
                        const toTouch = vec2Sub(tablePos, cueBall.pos);
                        const direction = vec2Normalize(toTouch);
                        onAimChangeRef.current(direction);
                    }
                }
            },
            onPanResponderRelease: () => {
                if (isDraggingCueRef.current) {
                    const shotPower = currentPowerRef.current;
                    if (shotPower >= 8 && onShootRef.current) {
                        onShootRef.current(shotPower);
                    }
                    currentPowerRef.current = 0;
                    onPowerChangeRef.current?.(0);
                    isDraggingCueRef.current = false;
                }
                draggingBallIdRef.current = null;
                setDraggingBallId(null);
                draggingNumberIdRef.current = null;
            },
            onPanResponderTerminate: () => {
                if (isDraggingCueRef.current) {
                    currentPowerRef.current = 0;
                    onPowerChangeRef.current?.(0);
                }
                isDraggingCueRef.current = false;
                draggingBallIdRef.current = null;
                setDraggingBallId(null);
                draggingNumberIdRef.current = null;
            },
        })
    ).current;

    const filteredAimGuide = useMemo(() => {
        if (!showGuides || guideConfig.showAimGuide === false || !trajectory || trajectory.paths.length === 0) {
            return null;
        }
        return filterAimTrajectory(trajectory, cueBallId, guideConfig.aimMode);
    }, [showGuides, guideConfig.showAimGuide, guideConfig.aimMode, trajectory, cueBallId]);

    const renderTrajectory = useMemo(() => {
        if (!filteredAimGuide || filteredAimGuide.paths.length === 0) return null;

        const baseWeight = guideConfig.strokeWeight;
        const dashArray = getGuideStrokeDashArray(guideConfig.strokeStyle);

        return (
            <G pointerEvents="none">
                {filteredAimGuide.paths.map((path) => {
                    if (path.points.length < 2) return null;

                    const currentBall = balls.find((b) => b.id === path.ballId);
                    if (!currentBall) return null;

                    let startIndex = 0;
                    if (isSimulating) {
                        let minDistance = Infinity;
                        for (let i = 0; i < path.points.length; i++) {
                            const point = path.points[i];
                            const dx = point.pos.x - currentBall.pos.x;
                            const dy = point.pos.y - currentBall.pos.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance < minDistance) {
                                minDistance = distance;
                                startIndex = i;
                            }
                        }
                    }

                    const isCueBall = path.ballId === cueBallId;
                    const filteredPoints = path.points.slice(startIndex);
                    if (filteredPoints.length < 2) return null;

                    const points = filteredPoints
                        .map((p) => {
                            const svgPos = mapPointToSvg(p.pos, orientation, layout);
                            return `${svgPos.x.toFixed(1)},${svgPos.y.toFixed(1)}`;
                        })
                        .join(' ');

                    // STRICT COLOR ENFORCEMENT: Strictly White, Yellow, Red per ball.
                    const ballColors = STRICT_BALL_GUIDE_COLORS[path.ballId];
                    const strokeColor = ballColors.stroke;
                    const glowColor = ballColors.glow;

                    const glowWidth = isCueBall ? baseWeight * 2.4 : baseWeight * 1.8;
                    const lineWidth = isCueBall ? baseWeight : baseWeight * 0.75;

                    return (
                        <G key={`aim-path-${path.ballId}`} opacity={0.88}>
                            {/* Resplandor exterior suave */}
                            <Polyline
                                points={points}
                                fill="none"
                                stroke={glowColor}
                                strokeWidth={glowWidth}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Trazo nítido principal con estilo configurable (Solid / Dashed / Dotted) */}
                            <Polyline
                                points={points}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth={lineWidth}
                                strokeDasharray={dashArray}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Puntos de impacto en banda calculados */}
                            {filteredPoints
                                .filter((p) => p.type === 'cushion')
                                .map((p, idx) => {
                                    const svgPos = mapPointToSvg(p.pos, orientation, layout);
                                    return (
                                        <Circle
                                            key={`cushion-${path.ballId}-${idx}`}
                                            cx={svgPos.x}
                                            cy={svgPos.y}
                                            r={isCueBall ? baseWeight * 1.5 : baseWeight * 1.0}
                                            fill={strokeColor}
                                            opacity={0.9}
                                        />
                                    );
                                })}
                        </G>
                    );
                })}

                {/* Bola fantasma en el primer impacto calculada por predictTrajectory con cero discrepancia */}
                {!isSimulating && showGhostBall && filteredAimGuide.ghostBallPos && (() => {
                    const ghostSvg = mapPointToSvg(filteredAimGuide.ghostBallPos, orientation, layout);
                    const isVertical = orientation === 'vertical';
                    const ghostRadius = isVertical ? 5.5 : 2.75;

                    return (
                        <G key="unified-ghost-ball">
                            <Circle
                                cx={ghostSvg.x}
                                cy={ghostSvg.y}
                                r={ghostRadius}
                                fill="rgba(255, 255, 255, 0.12)"
                                stroke="#ffffff"
                                strokeWidth={isVertical ? 0.7 : 0.4}
                                strokeDasharray="2 2"
                            />
                            <Circle
                                cx={ghostSvg.x}
                                cy={ghostSvg.y}
                                r={isVertical ? 1.0 : 0.5}
                                fill="#ffffff"
                            />
                        </G>
                    );
                })()}
            </G>
        );
    }, [filteredAimGuide, balls, cueBallId, isSimulating, orientation, layout, guideConfig, showGhostBall]);

    return (
        <View
            ref={containerRef}
            style={[styles.container, { aspectRatio: layout.viewBox.width / layout.viewBox.height }, style]}
            onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                containerSizeRef.current = { width, height };
            }}
            {...panResponder.panHandlers}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} style={{ overflow: 'visible' }}>
                <Defs>
                    {/* Gradiente del marco de madera noble */}
                    <LinearGradient id={`${tableUid}_frameGradient`} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={woodPalette.start} />
                        <Stop offset="30%" stopColor={woodPalette.mid} />
                        <Stop offset="70%" stopColor={woodPalette.bevel} />
                        <Stop offset="100%" stopColor={woodPalette.end} />
                    </LinearGradient>

                    {/* Gradiente de las bandas de caucho */}
                    <LinearGradient id={`${tableUid}_cushionGradient`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={clothPalette.cushionTop} />
                        <Stop offset="100%" stopColor={clothPalette.cushionBottom} />
                    </LinearGradient>

                    {/* Gradiente base del paño Simonis */}
                    <RadialGradient id={`${tableUid}_feltGradient`} cx="50%" cy="50%" r="65%">
                        <Stop offset="0%" stopColor={clothPalette.highlight} />
                        <Stop offset="65%" stopColor={clothPalette.base} />
                        <Stop offset="100%" stopColor={clothPalette.edge} />
                    </RadialGradient>

                    {/* Viñeta de iluminación cenital estilo 8 Ball Pool */}
                    <RadialGradient id={`${tableUid}_arenaSpotlight`} cx="50%" cy="50%" r="55%">
                        <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.16} />
                        <Stop offset="40%" stopColor={clothPalette.highlight} stopOpacity={0.08} />
                        <Stop offset="75%" stopColor="#000000" stopOpacity={0.20} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.46} />
                    </RadialGradient>

                    {/* Gradiente de cantoneras metálicas esquineras */}
                    <LinearGradient id={`${tableUid}_cornerMetalGrad`} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={metalPalette.highlight} />
                        <Stop offset="30%" stopColor={metalPalette.mid} />
                        <Stop offset="70%" stopColor={metalPalette.base} />
                        <Stop offset="100%" stopColor={metalPalette.dark} />
                    </LinearGradient>

                    {/* Sombras de oclusión ambiental bajo la nariz de las bandas con iluminación direccional */}
                    <LinearGradient id={`${tableUid}_topCushionShadow`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.62} />
                        <Stop offset="60%" stopColor="#000000" stopOpacity={0.24} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>
                    <LinearGradient id={`${tableUid}_bottomCushionShadow`} x1="0" y1="1" x2="0" y2="0">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.35} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>
                    <LinearGradient id={`${tableUid}_leftCushionShadow`} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.62} />
                        <Stop offset="60%" stopColor="#000000" stopOpacity={0.24} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>
                    <LinearGradient id={`${tableUid}_rightCushionShadow`} x1="1" y1="0" x2="0" y2="0">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.35} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>

                    {/* Sombra de oclusión y contacto de las bolas sobre el paño */}
                    <RadialGradient id={`${tableUid}_ballDropShadow`} cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.72} />
                        <Stop offset="45%" stopColor="#000000" stopOpacity={0.38} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </RadialGradient>

                    {/* Esferas 3D fotorrealistas de bolas de carambola estilo 8 Ball Pool */}
                    <RadialGradient id={`${tableUid}_ballWhite`} cx="34%" cy="28%" r="68%">
                        <Stop offset="0%" stopColor="#ffffff" />
                        <Stop offset="28%" stopColor="#f8fafc" />
                        <Stop offset="58%" stopColor="#e2e8f0" />
                        <Stop offset="80%" stopColor="#94a3b8" />
                        <Stop offset="93%" stopColor="#64748b" />
                        <Stop offset="100%" stopColor="#334155" />
                    </RadialGradient>
                    <RadialGradient id={`${tableUid}_ballYellow`} cx="34%" cy="28%" r="68%">
                        <Stop offset="0%" stopColor="#fffbeb" />
                        <Stop offset="26%" stopColor="#fef08a" />
                        <Stop offset="56%" stopColor="#facc15" />
                        <Stop offset="78%" stopColor="#ca8a04" />
                        <Stop offset="92%" stopColor="#854d0e" />
                        <Stop offset="100%" stopColor="#451a03" />
                    </RadialGradient>
                    <RadialGradient id={`${tableUid}_ballRed`} cx="34%" cy="28%" r="68%">
                        <Stop offset="0%" stopColor="#fee2e2" />
                        <Stop offset="26%" stopColor="#f87171" />
                        <Stop offset="56%" stopColor="#ef4444" />
                        <Stop offset="78%" stopColor="#dc2626" />
                        <Stop offset="92%" stopColor="#991b1b" />
                        <Stop offset="100%" stopColor="#450a0a" />
                    </RadialGradient>
                </Defs>

                {/* 1. Marco exterior de madera noble con bisel */}
                <Rect
                    x={layout.railX}
                    y={layout.railY}
                    width={layout.railW}
                    height={layout.railH}
                    rx={12}
                    fill={`url(#${tableUid}_frameGradient)`}
                    stroke={woodPalette.bevel}
                    strokeWidth={1.2}
                />

                {/* 2. Cantoneras metálicas esquineras pulidas estilo 8 Ball Pool / Carom Pro */}
                {(() => {
                    const railT = layout.railThickness;
                    const cushionT = layout.cushionThickness;
                    // Distancia exacta desde el borde exterior del marco hasta el diamante de la esquina
                    const diamondDist = railT + cushionT;
                    // Extensión generosa y elegante de los brazos metálicos que sobrepasa el diamante esquinero
                    const cornerExtension = Math.max(5.0, railT * 0.65);
                    const cornerSize = diamondDist + cornerExtension;
                    const cornerR = Math.min(12, railT * 0.55);
                    const innerR = Math.min(4, cushionT * 0.5);
                    const rivetR = Math.max(1.4, railT * 0.10);

                    // Posiciones exactas de los 8 diamantes esquineros (coincidencia 1:1 con diamonds.corners)
                    const cornerRivets = [
                        // Esquina Superior Izquierda (riel superior y riel izquierdo)
                        { cx: layout.playX, cy: layout.railY + railT * 0.5 },
                        { cx: layout.railX + railT * 0.5, cy: layout.playY },
                        // Esquina Superior Derecha (riel superior y riel derecho)
                        { cx: layout.playX + layout.playW, cy: layout.railY + railT * 0.5 },
                        { cx: layout.railX + layout.railW - railT * 0.5, cy: layout.playY },
                        // Esquina Inferior Izquierda (riel inferior y riel izquierdo)
                        { cx: layout.playX, cy: layout.railY + layout.railH - railT * 0.5 },
                        { cx: layout.railX + railT * 0.5, cy: layout.playY + layout.playH },
                        // Esquina Inferior Derecha (riel inferior y riel derecho)
                        { cx: layout.playX + layout.playW, cy: layout.railY + layout.railH - railT * 0.5 },
                        { cx: layout.railX + layout.railW - railT * 0.5, cy: layout.playY + layout.playH },
                    ];

                    return (
                        <G>
                            {/* Esquina Superior Izquierda */}
                            <Path
                                d={`M ${layout.railX} ${layout.railY + cornerSize} L ${layout.railX} ${layout.railY + cornerR} Q ${layout.railX} ${layout.railY} ${layout.railX + cornerR} ${layout.railY} L ${layout.railX + cornerSize} ${layout.railY} L ${layout.railX + cornerSize} ${layout.railY + railT} L ${layout.railX + railT + innerR} ${layout.railY + railT} Q ${layout.railX + railT} ${layout.railY + railT} ${layout.railX + railT} ${layout.railY + railT + innerR} L ${layout.railX + railT} ${layout.railY + cornerSize} Z`}
                                fill={`url(#${tableUid}_cornerMetalGrad)`}
                                stroke={metalPalette.border}
                                strokeWidth={0.7}
                            />

                            {/* Esquina Superior Derecha */}
                            <Path
                                d={`M ${layout.railX + layout.railW - cornerSize} ${layout.railY} L ${layout.railX + layout.railW - cornerR} ${layout.railY} Q ${layout.railX + layout.railW} ${layout.railY} ${layout.railX + layout.railW} ${layout.railY + cornerR} L ${layout.railX + layout.railW} ${layout.railY + cornerSize} L ${layout.railX + layout.railW - railT} ${layout.railY + cornerSize} L ${layout.railX + layout.railW - railT} ${layout.railY + railT + innerR} Q ${layout.railX + layout.railW - railT} ${layout.railY + railT} ${layout.railX + layout.railW - railT - innerR} ${layout.railY + railT} L ${layout.railX + layout.railW - cornerSize} ${layout.railY + railT} Z`}
                                fill={`url(#${tableUid}_cornerMetalGrad)`}
                                stroke={metalPalette.border}
                                strokeWidth={0.7}
                            />

                            {/* Esquina Inferior Izquierda */}
                            <Path
                                d={`M ${layout.railX} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + railT} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + railT} ${layout.railY + layout.railH - railT - innerR} Q ${layout.railX + railT} ${layout.railY + layout.railH - railT} ${layout.railX + railT + innerR} ${layout.railY + layout.railH - railT} L ${layout.railX + cornerSize} ${layout.railY + layout.railH - railT} L ${layout.railX + cornerSize} ${layout.railY + layout.railH} L ${layout.railX + cornerR} ${layout.railY + layout.railH} Q ${layout.railX} ${layout.railY + layout.railH} ${layout.railX} ${layout.railY + layout.railH - cornerR} Z`}
                                fill={`url(#${tableUid}_cornerMetalGrad)`}
                                stroke={metalPalette.border}
                                strokeWidth={0.7}
                            />

                            {/* Esquina Inferior Derecha */}
                            <Path
                                d={`M ${layout.railX + layout.railW - cornerSize} ${layout.railY + layout.railH} L ${layout.railX + layout.railW - cornerSize} ${layout.railY + layout.railH - railT} L ${layout.railX + layout.railW - railT - innerR} ${layout.railY + layout.railH - railT} Q ${layout.railX + layout.railW - railT} ${layout.railY + layout.railH - railT} ${layout.railX + layout.railW - railT} ${layout.railY + layout.railH - railT - innerR} L ${layout.railX + layout.railW - railT} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + layout.railW} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + layout.railW} ${layout.railY + layout.railH - cornerR} Q ${layout.railX + layout.railW} ${layout.railY + layout.railH} ${layout.railX + layout.railW - cornerR} ${layout.railY + layout.railH} Z`}
                                fill={`url(#${tableUid}_cornerMetalGrad)`}
                                stroke={metalPalette.border}
                                strokeWidth={0.7}
                            />

                            {/* Engastes y pernos metálicos sobre las cantoneras, exactamente alineados 1:1 con los diamantes esquineros */}
                            {cornerRivets.map((rivet, idx) => (
                                <G key={`corner-rivet-${idx}`}>
                                    {/* Engaste / bisel metálico exterior */}
                                    <Circle
                                        cx={rivet.cx}
                                        cy={rivet.cy}
                                        r={rivetR * 1.3}
                                        fill={metalPalette.dark}
                                        stroke={metalPalette.border}
                                        strokeWidth={0.4}
                                        opacity={0.85}
                                    />
                                    {/* Perno / remache central con brillo pulido */}
                                    <Circle
                                        cx={rivet.cx}
                                        cy={rivet.cy}
                                        r={rivetR * 0.85}
                                        fill={metalPalette.rivet}
                                    />
                                </G>
                            ))}
                        </G>
                    );
                })()}

                {/* 3. Bandas de caucho continuas de carambola (sin troneras) */}
                <Rect
                    x={layout.cushionX}
                    y={layout.cushionY}
                    width={layout.cushionW}
                    height={layout.cushionH}
                    rx={4}
                    fill={`url(#${tableUid}_cushionGradient)`}
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth={0.8}
                />

                {/* 4. Paño de juego Simonis */}
                <Rect
                    x={layout.playX}
                    y={layout.playY}
                    width={layout.playW}
                    height={layout.playH}
                    rx={2}
                    fill={`url(#${tableUid}_feltGradient)`}
                />

                {/* 5. Iluminación cenital de torneo estilo 8 Ball Pool */}
                {tablePreferences.showSpotlight && (
                    <Rect
                        x={layout.playX}
                        y={layout.playY}
                        width={layout.playW}
                        height={layout.playH}
                        rx={2}
                        fill={`url(#${tableUid}_arenaSpotlight)`}
                        opacity={0.65}
                    />
                )}

                {/* 6. Sombras 3D bajo la nariz del caucho con iluminación direccional */}
                <Rect x={layout.playX} y={layout.playY} width={layout.playW} height={5.5} fill={`url(#${tableUid}_topCushionShadow)`} />
                <Rect x={layout.playX} y={layout.playY + layout.playH - 3.2} width={layout.playW} height={3.2} fill={`url(#${tableUid}_bottomCushionShadow)`} />
                <Rect x={layout.playX} y={layout.playY} width={5.5} height={layout.playH} fill={`url(#${tableUid}_leftCushionShadow)`} />
                <Rect x={layout.playX + layout.playW - 3.2} y={layout.playY} width={3.2} height={layout.playH} fill={`url(#${tableUid}_rightCushionShadow)`} />

                {/* Biselado de luz y sombra en la nariz de las bandas */}
                <Line x1={layout.playX} y1={layout.playY} x2={layout.playX + layout.playW} y2={layout.playY} stroke="rgba(255,255,255,0.40)" strokeWidth={0.8} />
                <Line x1={layout.playX} y1={layout.playY} x2={layout.playX} y2={layout.playY + layout.playH} stroke="rgba(255,255,255,0.40)" strokeWidth={0.8} />
                <Line x1={layout.playX} y1={layout.playY + layout.playH} x2={layout.playX + layout.playW} y2={layout.playY + layout.playH} stroke="rgba(0,0,0,0.40)" strokeWidth={0.8} />
                <Line x1={layout.playX + layout.playW} y1={layout.playY} x2={layout.playX + layout.playW} y2={layout.playY + layout.playH} stroke="rgba(0,0,0,0.40)" strokeWidth={0.8} />

                {/* 7. Marca de agua / Calcomanía central de paño (Sticker / Decal) */}
                {tablePreferences.showTableDecal && tablePreferences.tableDecal !== 'none' && (() => {
                    const decalOpacity = tablePreferences.decalOpacity ?? 0.20;
                    const centerX = layout.playX + layout.playW / 2;
                    const centerY = layout.playY + layout.playH / 2;
                    const minDim = Math.min(layout.playW, layout.playH);
                    const decalSource = getTableDecalSource(tablePreferences.tableDecal);

                    if (decalSource) {
                        const decalSize = minDim * 0.78;
                        return (
                            <SvgImage
                                key={`decal-${tablePreferences.tableDecal}`}
                                href={decalSource}
                                x={centerX - decalSize / 2}
                                y={centerY - decalSize / 2}
                                width={decalSize}
                                height={decalSize}
                                opacity={decalOpacity}
                                preserveAspectRatio="xMidYMid meet"
                            />
                        );
                    }
                    return null;
                })()}

                {/* 8. Cuadrícula táctica 8x4 */}
                {tablePreferences.showGrid && (
                    <>
                        {Array.from({ length: orientation === 'horizontal' ? longGridLines : shortGridLines }, (_, index) => {
                            const ratio = (index + 1) / ((orientation === 'horizontal' ? longGridLines : shortGridLines) + 1);
                            return (
                                <Line
                                    key={`long-grid-${index}`}
                                    x1={layout.playX + layout.playW * ratio}
                                    y1={layout.playY}
                                    x2={layout.playX + layout.playW * ratio}
                                    y2={layout.playY + layout.playH}
                                    stroke="rgba(255,255,255,0.04)"
                                    strokeWidth={0.7}
                                />
                            );
                        })}
                        {Array.from({ length: orientation === 'horizontal' ? shortGridLines : longGridLines }, (_, index) => {
                            const ratio = (index + 1) / ((orientation === 'horizontal' ? shortGridLines : longGridLines) + 1);
                            return (
                                <Line
                                    key={`short-grid-${index}`}
                                    x1={layout.playX}
                                    y1={layout.playY + layout.playH * ratio}
                                    x2={layout.playX + layout.playW}
                                    y2={layout.playY + layout.playH * ratio}
                                    stroke="rgba(255,255,255,0.04)"
                                    strokeWidth={0.7}
                                />
                            );
                        })}
                    </>
                )}

                {/* 9. Diamantes incrustados (rombos o círculos pulidos) */}
                {diamonds.longSide.map((point, idx) => {
                    const isThick = orientation === 'vertical';
                    const dx = isThick ? 1.4 : (orientation === 'horizontal' ? 0.9 : 1.7);
                    const dy = isThick ? 2.4 : (orientation === 'horizontal' ? 1.7 : 0.9);
                    const circleR = isThick ? 1.8 : 1.1;
                    if (tablePreferences.diamondShape === 'circle') {
                        return (
                            <Circle
                                key={`long-diamond-${idx}`}
                                cx={point.x}
                                cy={point.y}
                                r={circleR}
                                fill="#f8fafc"
                                stroke="rgba(0,0,0,0.3)"
                                strokeWidth={0.2}
                                opacity={0.95}
                            />
                        );
                    }
                    return (
                        <Polygon
                            key={`long-diamond-${idx}`}
                            points={`${point.x},${point.y - dy} ${point.x + dx},${point.y} ${point.x},${point.y + dy} ${point.x - dx},${point.y}`}
                            fill="#f8fafc"
                            stroke="rgba(0,0,0,0.25)"
                            strokeWidth={0.2}
                            opacity={0.95}
                        />
                    );
                })}
                {diamonds.shortSide.map((point, idx) => {
                    const isThick = orientation === 'vertical';
                    const dx = isThick ? 2.4 : (orientation === 'horizontal' ? 1.7 : 0.9);
                    const dy = isThick ? 1.4 : (orientation === 'horizontal' ? 0.9 : 1.7);
                    const circleR = isThick ? 1.8 : 1.1;
                    if (tablePreferences.diamondShape === 'circle') {
                        return (
                            <Circle
                                key={`short-diamond-${idx}`}
                                cx={point.x}
                                cy={point.y}
                                r={circleR}
                                fill="#f8fafc"
                                stroke="rgba(0,0,0,0.3)"
                                strokeWidth={0.2}
                                opacity={0.95}
                            />
                        );
                    }
                    return (
                        <Polygon
                            key={`short-diamond-${idx}`}
                            points={`${point.x - dx},${point.y} ${point.x},${point.y - dy} ${point.x + dx},${point.y} ${point.x},${point.y + dy}`}
                            fill="#f8fafc"
                            stroke="rgba(0,0,0,0.25)"
                            strokeWidth={0.2}
                            opacity={0.95}
                        />
                    );
                })}
                {((tablePreferences.diamondCount === '9_5' || !tablePreferences.diamondCount) && tablePreferences.showCornerDiamonds !== false) && diamonds.corners.map((point, idx) => {
                    const isHorizontalRail = orientation === 'horizontal' ? idx % 2 === 0 : idx % 2 !== 0;
                    const isThick = orientation === 'vertical';
                    const dx = isHorizontalRail ? (isThick ? 2.4 : 0.9) : (isThick ? 1.4 : 1.7);
                    const dy = isHorizontalRail ? (isThick ? 1.4 : 1.7) : (isThick ? 2.4 : 0.9);
                    const circleR = isThick ? 1.6 : 1.0;
                    if (tablePreferences.diamondShape === 'circle') {
                        return (
                            <Circle
                                key={`corner-diamond-${idx}`}
                                cx={point.x}
                                cy={point.y}
                                r={circleR}
                                fill="#f8fafc"
                                stroke="rgba(0,0,0,0.3)"
                                strokeWidth={0.2}
                                opacity={0.95}
                            />
                        );
                    }
                    return (
                        <Polygon
                            key={`corner-diamond-${idx}`}
                            points={`${point.x},${point.y - dy} ${point.x + dx},${point.y} ${point.x},${point.y + dy} ${point.x - dx},${point.y}`}
                            fill="#f8fafc"
                            stroke="rgba(0,0,0,0.25)"
                            strokeWidth={0.2}
                            opacity={0.95}
                        />
                    );
                })}

                {/* 10. Trazas dinámicas continuas (Execution Guide / Trail) con configuración compartida */}
                {dynamicTrails && guideConfig.showExecutionTrail !== false && (
                    <G opacity={0.88}>
                        {(['white', 'yellow', 'red'] as BallId[]).map((ballId) => {
                            const trail = dynamicTrails[ballId];
                            if (!trail || trail.length < 2) return null;
                            const ballColors = STRICT_BALL_GUIDE_COLORS[ballId];
                            const strokeColor = ballColors.stroke;
                            const glowColor = ballColors.glow;
                            const pointsStr = trail
                                .map((p) => {
                                    const svgPos = mapPointToSvg(p.pos, orientation, layout);
                                    return `${svgPos.x.toFixed(1)},${svgPos.y.toFixed(1)}`;
                                })
                                .join(' ');

                            const baseWeight = guideConfig.strokeWeight;
                            const glowWidth = baseWeight * 2.2;
                            const lineWidth = baseWeight;
                            const dashArray = getGuideStrokeDashArray(guideConfig.strokeStyle);

                            return (
                                <G key={`dynamic-trail-${ballId}`}>
                                    {/* Resplandor exterior */}
                                    <Polyline
                                        points={pointsStr}
                                        fill="none"
                                        stroke={glowColor}
                                        strokeWidth={glowWidth}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {/* Línea viva interior con estilo configurable */}
                                    <Polyline
                                        points={pointsStr}
                                        fill="none"
                                        stroke={strokeColor}
                                        strokeWidth={lineWidth}
                                        strokeDasharray={dashArray}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </G>
                            );
                        })}
                    </G>
                )}

                {/* 10.5. Micro-impactos y ondas de choque de colisiones estilo 8 Ball Pool */}
                {collisionPulses && collisionPulses.length > 0 && (() => {
                    const now = Date.now();
                    return collisionPulses.map((pulse) => {
                        const age = Math.min(1, Math.max(0, (now - pulse.timestamp) / 340));
                        if (age >= 1) return null;
                        const svgPos = mapPointToSvg(pulse.pos, orientation, layout);
                        const isBallHit = pulse.type === 'ball';
                        const radius = isBallHit ? 1.6 + age * 5.4 : 1.2 + age * 3.8;
                        const strokeW = Math.max(0.3, 1.4 * (1 - age));
                        const opacity = (1 - age) * 0.95;

                        return (
                            <G key={pulse.id} pointerEvents="none">
                                {/* Anillo de choque exterior cian */}
                                <Circle
                                    cx={svgPos.x}
                                    cy={svgPos.y}
                                    r={radius * 1.35}
                                    fill="none"
                                    stroke="rgba(56, 189, 248, 0.75)"
                                    strokeWidth={strokeW * 0.7}
                                    opacity={opacity * 0.8}
                                />
                                {/* Onda de impacto nítida blanca */}
                                <Circle
                                    cx={svgPos.x}
                                    cy={svgPos.y}
                                    r={radius}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth={strokeW}
                                    opacity={opacity}
                                />
                                {/* Destello de contacto instantáneo */}
                                {age < 0.28 && (
                                    <Circle
                                        cx={svgPos.x}
                                        cy={svgPos.y}
                                        r={2.4 * (1 - age * 3.5)}
                                        fill="#ffffff"
                                        opacity={(1 - age * 3.5) * 0.95}
                                    />
                                )}
                            </G>
                        );
                    });
                })()}

                {/* 11. Guía de Puntería Unificada (Aiming Guide) calculada con el mismo motor físico */}
                {renderTrajectory}

                {/* 13. Bolas de Carambola en 3D fotorrealistas con física de rodadura real (8 Ball Pool) */}
                {balls.map((ball) => {
                    const mapped = mapPointToSvg(ball.pos, orientation, layout);
                    const ballStyle = ballColors[ball.id];
                    const isCueBall = ball.id === cueBallId;
                    const ballSkin: BallSkinId = tablePreferences.ballSkin ?? 'aramith_pro_cup';
                    const showDots = tablePreferences.showBallDots !== false;
                    const quat = ballRotationsRef.current[ball.id] ?? INITIAL_BALL_QUATERNION;
                    const isVertical = orientation === 'vertical';
                    const ballRadiusSvg = isVertical ? 5.5 : 2.75;

                    return (
                        <G key={ball.id}>
                            {/* Sombra de oclusión y contacto volumétrica sobre el paño */}
                            <Ellipse
                                cx={mapped.x + (isVertical ? 0.8 : 0.4)}
                                cy={mapped.y + (isVertical ? 1.1 : 0.55)}
                                rx={ballRadiusSvg * 1.13}
                                ry={ballRadiusSvg * 1.05}
                                fill={`url(#${tableUid}_ballDropShadow)`}
                            />

                            {/* Cuerpo esférico 3D fotorrealista con gradiente multicapa */}
                            <Circle
                                cx={mapped.x}
                                cy={mapped.y}
                                r={ballRadiusSvg}
                                fill={`url(#${ballStyle.gradientId})`}
                                stroke={ballStyle.border}
                                strokeWidth={isVertical ? 0.35 : 0.2}
                            />

                            {/* Marcajes oficiales en 3D que ruedan físicamente sobre la esfera */}
                            {showDots && (() => {
                                if (ballSkin === 'classic_solid') {
                                    if (ball.id === 'white' || ball.id === 'yellow') {
                                        const dotColor = ball.id === 'white' ? '#dc2626' : '#0f172a';
                                        const baseDotRadius = isVertical ? 0.84 : 0.42;
                                        return (
                                            <G pointerEvents="none">
                                                {SPHERE_CLASSIC_DOTS.map((pt, idx) => {
                                                    const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, baseDotRadius, isVertical);
                                                    if (!proj) return null;
                                                    return (
                                                        <Ellipse
                                                            key={`classic-dot-${ball.id}-${idx}`}
                                                            cx={proj.cx}
                                                            cy={proj.cy}
                                                            rx={proj.rx}
                                                            ry={proj.ry}
                                                            transform={`rotate(${proj.rotationDeg} ${proj.cx} ${proj.cy})`}
                                                            fill={dotColor}
                                                            opacity={proj.opacity * 0.9}
                                                        />
                                                    );
                                                })}
                                            </G>
                                        );
                                    }
                                    return null;
                                }

                                if (ballSkin === 'cosmo_helix_pba') {
                                    // Cosmo Helix Vision (PBA Tour): 6 puntos de alta visibilidad + anillos orbitales en 3D
                                    const dotColor = ball.id === 'white' ? '#00e5ff' : ball.id === 'yellow' ? '#1e3a8a' : '#ffffff';
                                    const strokeColor = ball.id === 'white' ? 'rgba(0,0,0,0.5)' : ball.id === 'yellow' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
                                    const ringColor = ball.id === 'white' ? 'rgba(0,229,255,0.65)' : ball.id === 'yellow' ? 'rgba(30,58,138,0.7)' : 'rgba(255,255,255,0.5)';

                                    const ringSegments1 = projectSphereRingToSvg(PBA_VISION_RING_1, quat, mapped, ballRadiusSvg, isVertical);
                                    const ringSegments2 = projectSphereRingToSvg(PBA_VISION_RING_2, quat, mapped, ballRadiusSvg, isVertical);
                                    const baseDotRadius = isVertical ? 0.84 : 0.42;

                                    return (
                                        <G pointerEvents="none">
                                            {/* Anillos de visión orbitales que giran con la bola */}
                                            {ringSegments1.map((d, i) => (
                                                <Path key={`pba-ring1-${i}`} d={d} fill="none" stroke={ringColor} strokeWidth={isVertical ? 0.38 : 0.22} strokeDasharray={isVertical ? "1.8 1.2" : "1.0 0.7"} />
                                            ))}
                                            {ringSegments2.map((d, i) => (
                                                <Path key={`pba-ring2-${i}`} d={d} fill="none" stroke={ringColor} strokeWidth={isVertical ? 0.38 : 0.22} strokeDasharray={isVertical ? "1.8 1.2" : "1.0 0.7"} />
                                            ))}

                                            {/* 6 puntos que rotan sobre la esfera con proyección ortográfica esférica */}
                                            {SPHERE_OCTAHEDRAL_DOTS.map((pt, idx) => {
                                                const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, baseDotRadius, isVertical);
                                                if (!proj) return null;
                                                return (
                                                    <Ellipse
                                                        key={`pba-dot-${ball.id}-${idx}`}
                                                        cx={proj.cx}
                                                        cy={proj.cy}
                                                        rx={proj.rx}
                                                        ry={proj.ry}
                                                        transform={`rotate(${proj.rotationDeg} ${proj.cx} ${proj.cy})`}
                                                        fill={dotColor}
                                                        stroke={strokeColor}
                                                        strokeWidth={isVertical ? 0.2 : 0.11}
                                                        opacity={proj.opacity}
                                                    />
                                                );
                                            })}
                                        </G>
                                    );
                                }

                                if (ballSkin === 'dynaspheres') {
                                    const dotColor = ball.id === 'white' ? '#334155' : ball.id === 'yellow' ? '#1d4ed8' : '#d97706';
                                    const ringColor = ball.id === 'white' ? 'rgba(51,65,85,0.6)' : ball.id === 'yellow' ? 'rgba(29,78,216,0.6)' : 'rgba(217,119,6,0.6)';
                                    const ringSegments = projectSphereRingToSvg(DYNASPHERES_RING, quat, mapped, ballRadiusSvg, isVertical);
                                    const baseDotRadius = isVertical ? 0.72 : 0.36;

                                    return (
                                        <G pointerEvents="none">
                                            {ringSegments.map((d, i) => (
                                                <Path key={`dyna-ring-${i}`} d={d} fill="none" stroke={ringColor} strokeWidth={isVertical ? 0.45 : 0.25} />
                                            ))}
                                            {SPHERE_OCTAHEDRAL_DOTS.map((pt, idx) => {
                                                const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, baseDotRadius, isVertical);
                                                if (!proj) return null;
                                                return (
                                                    <Ellipse
                                                        key={`dyna-dot-${ball.id}-${idx}`}
                                                        cx={proj.cx}
                                                        cy={proj.cy}
                                                        rx={proj.rx}
                                                        ry={proj.ry}
                                                        transform={`rotate(${proj.rotationDeg} ${proj.cx} ${proj.cy})`}
                                                        fill={dotColor}
                                                        opacity={proj.opacity}
                                                    />
                                                );
                                            })}
                                        </G>
                                    );
                                }

                                // Predeterminado: Aramith Super Pro-Cup (UMB) - 6 puntos polka en los 6 polos cardinales
                                if (ball.id === 'white' || ball.id === 'yellow') {
                                    const baseDotRadius = isVertical ? 0.88 : 0.44;
                                    return (
                                        <G pointerEvents="none">
                                            {SPHERE_OCTAHEDRAL_DOTS.map((pt, idx) => {
                                                const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, baseDotRadius, isVertical);
                                                if (!proj) return null;
                                                return (
                                                    <Ellipse
                                                        key={`procup-dot-${ball.id}-${idx}`}
                                                        cx={proj.cx}
                                                        cy={proj.cy}
                                                        rx={proj.rx}
                                                        ry={proj.ry}
                                                        transform={`rotate(${proj.rotationDeg} ${proj.cx} ${proj.cy})`}
                                                        fill="#dc2626"
                                                        stroke="rgba(0,0,0,0.28)"
                                                        strokeWidth={isVertical ? 0.2 : 0.11}
                                                        opacity={proj.opacity}
                                                    />
                                                );
                                            })}
                                        </G>
                                    );
                                }

                                return null;
                            })()}

                            {/* Destellos especulares y reflejo de caperuza fija estilo 8 Ball Pool */}
                            <G pointerEvents="none">
                                {/* Caperuza curva elíptica de brillo superior izquierdo */}
                                <Ellipse
                                    cx={mapped.x - ballRadiusSvg * 0.33}
                                    cy={mapped.y - ballRadiusSvg * 0.33}
                                    rx={ballRadiusSvg * 0.44}
                                    ry={ballRadiusSvg * 0.22}
                                    transform={`rotate(-42 ${mapped.x - ballRadiusSvg * 0.33} ${mapped.y - ballRadiusSvg * 0.33})`}
                                    fill="rgba(255, 255, 255, 0.65)"
                                />
                                {/* Pinpoint especular de foco puntual cenital */}
                                <Circle
                                    cx={mapped.x - ballRadiusSvg * 0.29}
                                    cy={mapped.y - ballRadiusSvg * 0.29}
                                    r={ballRadiusSvg * 0.145}
                                    fill="#ffffff"
                                    opacity={0.96}
                                />
                                {/* Resplandor Fresnel secundario en el limbo opuesto (rebote del paño) */}
                                <Path
                                    d={`M ${(mapped.x - ballRadiusSvg * 0.14).toFixed(2)} ${(mapped.y + ballRadiusSvg * 0.98).toFixed(2)} A ${ballRadiusSvg.toFixed(2)} ${ballRadiusSvg.toFixed(2)} 0 0 0 ${(mapped.x + ballRadiusSvg * 0.98).toFixed(2)} ${(mapped.y - ballRadiusSvg * 0.14).toFixed(2)}`}
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.25)"
                                    strokeWidth={isVertical ? 0.65 : 0.35}
                                    strokeLinecap="round"
                                />
                            </G>

                            {/* Anillo de selección táctil si es la bola tiradora */}
                            {isCueBall && !isSimulating && (
                                <G pointerEvents="none">
                                    <Circle
                                        cx={mapped.x}
                                        cy={mapped.y}
                                        r={ballRadiusSvg * 1.5}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth={isVertical ? 0.8 : 0.5}
                                        strokeDasharray={isVertical ? "3 3" : "2 2"}
                                        opacity={0.9}
                                    />
                                    <Circle
                                        cx={mapped.x}
                                        cy={mapped.y}
                                        r={ballRadiusSvg * 1.75}
                                        fill="none"
                                        stroke="rgba(56, 189, 248, 0.3)"
                                        strokeWidth={isVertical ? 0.6 : 0.35}
                                    />
                                </G>
                            )}
                        </G>
                    );
                })}

                {/* 14. Taco de Billar interactivo sobre la mesa estilo 8 Ball Pool */}
                {showCueStick && !isSimulating && (
                    (() => {
                        const cueBall = balls.find((b) => b.id === cueBallId);
                        if (!cueBall) return null;
                        if (isEditMode && draggingBallId === cueBallId) return null;
                        const mappedCue = mapPointToSvg(cueBall.pos, orientation, layout);
                        return (
                            <CaromCueGadget
                                cueBallSvgPos={mappedCue}
                                aimDirection={aimDirection}
                                tableOrientation={orientation}
                                powerLevel={powerLevel}
                                isSimulating={isSimulating}
                                visible={true}
                                cueSkin={tablePreferences.cueSkin}
                            />
                        );
                    })()
                )}
            </Svg>

            {showRuler && (
                <CushionRuler
                    orientation={orientation}
                    tableWidth={TABLE_W}
                    tableHeight={TABLE_H}
                    railThickness={layout.railThickness}
                    cushionThickness={layout.cushionThickness}
                />
            )}

            {showNumbering && (
                <SystemNumberingOverlay
                    orientation={orientation}
                    tableWidth={TABLE_W}
                    tableHeight={TABLE_H}
                    railThickness={layout.railThickness}
                    cushionThickness={layout.cushionThickness}
                    anchors={numberingAnchors}
                    formula={numberingFormula ?? undefined}
                    isEditMode={isEditMode}
                    tablePreferences={tablePreferences}
                />
            )}

            {isEditMode && (
                <View style={[styles.editOverlay, styles.pointerEventsNone]}>
                    <View style={styles.editBadge}>
                        <IconHandClick size={18} color="#78350f" strokeWidth={2} />
                    </View>
                </View>
            )}

            {!isEditMode && !isSimulating && (
                <View style={[styles.editOverlay, styles.pointerEventsNone]}>
                    <View style={styles.aimBadge}>
                        <IconTarget size={16} color="#1e3a5f" strokeWidth={2} />
                    </View>
                </View>
            )}
        </View>
    );
}

export const InteractiveBilliardsTable = memo(InteractiveBilliardsTableBase);

const styles = StyleSheet.create({
    container: {
        maxWidth: '100%',
        maxHeight: '100%',
        overflow: 'visible',
        alignSelf: 'center',
    },
    pointerEventsNone: {
        pointerEvents: 'none',
    },
    editOverlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 8,
    },
    editBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(251, 191, 36, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    editBadgeIcon: {
        // deprecated — replaced by IconHandClick
    },
    aimBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    aimBadgeIcon: {
        // deprecated — replaced by IconTarget
    },
});
