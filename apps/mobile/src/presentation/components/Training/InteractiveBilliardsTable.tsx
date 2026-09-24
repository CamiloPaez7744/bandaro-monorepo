import { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, type StyleProp, type ViewStyle, PanResponder, GestureResponderEvent, Platform } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Polygon, Polyline, RadialGradient, Rect, Stop, Path, Ellipse, Image as SvgImage } from 'react-native-svg';
import { IconHandClick, IconTarget } from '@/src/presentation/components/icons';
import { SKULL_DECAL_SOURCE } from './tableDecals';

import {
    Ball,
    BallId,
    Vec2,
    TrajectoryPrediction,
    DEFAULT_TABLE,
    vec2,
    vec2Sub,
    vec2Normalize,
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

interface AimGuideData {
    cueRayEnd: Vec2;
    ghostBallPos: Vec2 | null;
    targetBallGuide: {
        ballId: BallId;
        start: Vec2;
        end: Vec2;
        color: string;
    } | null;
    cueDeflectionGuide: {
        start: Vec2;
        end: Vec2;
    } | null;
    cushionHit: {
        point: Vec2;
        reflectedEnd: Vec2;
        reboundGhostPos?: Vec2;
        reboundTargetBall?: Ball;
    } | null;
}

function compute8BallAimGuide(
    balls: Ball[],
    cueBallId: BallId,
    aimDirection: Vec2
): AimGuideData | null {
    const cueBall = balls.find((b) => b.id === cueBallId);
    if (!cueBall) return null;

    const cuePos = cueBall.pos;
    const dir = vec2Normalize(aimDirection);
    const BALL_R = 3.075;
    const HIT_DIST = BALL_R * 2; // 6.15 cm

    // 1. Ray intersection with object balls
    let closestBallHit: { dist: number; ghostPos: Vec2; targetBall: Ball } | null = null;

    for (const ball of balls) {
        if (ball.id === cueBallId) continue;
        const toBall = vec2Sub(ball.pos, cuePos);
        const proj = toBall.x * dir.x + toBall.y * dir.y;
        if (proj <= 0) continue;

        const perpSq = (toBall.x * toBall.x + toBall.y * toBall.y) - proj * proj;
        if (perpSq >= HIT_DIST * HIT_DIST) continue;

        const halfChord = Math.sqrt(HIT_DIST * HIT_DIST - perpSq);
        const dist = proj - halfChord;
        if (dist <= 0) continue;

        if (!closestBallHit || dist < closestBallHit.dist) {
            closestBallHit = {
                dist,
                ghostPos: vec2(cuePos.x + dir.x * dist, cuePos.y + dir.y * dist),
                targetBall: ball,
            };
        }
    }

    // 2. Ray intersection with cushions
    const X_MIN = BALL_R;
    const X_MAX = TABLE_W - BALL_R;
    const Y_MIN = BALL_R;
    const Y_MAX = TABLE_H - BALL_R;

    let tX = Infinity;
    let normX = vec2(0, 0);
    if (dir.x > 0.0001) {
        tX = (X_MAX - cuePos.x) / dir.x;
        normX = vec2(-1, 0);
    } else if (dir.x < -0.0001) {
        tX = (X_MIN - cuePos.x) / dir.x;
        normX = vec2(1, 0);
    }

    let tY = Infinity;
    let normY = vec2(0, 0);
    if (dir.y > 0.0001) {
        tY = (Y_MAX - cuePos.y) / dir.y;
        normY = vec2(0, -1);
    } else if (dir.y < -0.0001) {
        tY = (Y_MIN - cuePos.y) / dir.y;
        normY = vec2(0, 1);
    }

    const cushionDist = Math.min(tX, tY);
    const cushionNormal = tX < tY ? normX : normY;

    // Hits an object ball first:
    if (closestBallHit && closestBallHit.dist < cushionDist) {
        const { ghostPos, targetBall } = closestBallHit;
        const norm = vec2Normalize(vec2Sub(targetBall.pos, ghostPos));
        const targetGuideLen = 28;
        const targetEnd = vec2(targetBall.pos.x + norm.x * targetGuideLen, targetBall.pos.y + norm.y * targetGuideLen);

        const dot = dir.x * norm.x + dir.y * norm.y;
        const tangent = vec2(dir.x - norm.x * dot, dir.y - norm.y * dot);
        const tanLen = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);

        let cueDeflectionGuide: { start: Vec2; end: Vec2 } | null = null;
        if (tanLen > 0.05) {
            const uTan = vec2(tangent.x / tanLen, tangent.y / tanLen);
            const defLen = 18;
            cueDeflectionGuide = {
                start: ghostPos,
                end: vec2(ghostPos.x + uTan.x * defLen, ghostPos.y + uTan.y * defLen),
            };
        }

        const color = targetBall.id === 'yellow' ? '#facc15' : '#ef4444';

        return {
            cueRayEnd: ghostPos,
            ghostBallPos: ghostPos,
            targetBallGuide: {
                ballId: targetBall.id,
                start: targetBall.pos,
                end: targetEnd,
                color,
            },
            cueDeflectionGuide,
            cushionHit: null,
        };
    }

    // Hits cushion first (Bricole / Antes de banda):
    const cushionPoint = vec2(cuePos.x + dir.x * cushionDist, cuePos.y + dir.y * cushionDist);
    const dotCN = dir.x * cushionNormal.x + dir.y * cushionNormal.y;
    const reflDir = vec2Normalize(vec2(dir.x - 2 * dotCN * cushionNormal.x, dir.y - 2 * dotCN * cushionNormal.y));
    const reflLen = 42;
    let reflectedEnd = vec2(cushionPoint.x + reflDir.x * reflLen, cushionPoint.y + reflDir.y * reflLen);

    // Check if cushion reflection hits an object ball
    let reboundGhostPos: Vec2 | undefined = undefined;
    let reboundTargetBall: Ball | undefined = undefined;

    for (const ball of balls) {
        if (ball.id === cueBallId) continue;
        const toBall = vec2Sub(ball.pos, cushionPoint);
        const proj = toBall.x * reflDir.x + toBall.y * reflDir.y;
        if (proj <= 0) continue;
        const perpSq = (toBall.x * toBall.x + toBall.y * toBall.y) - proj * proj;
        if (perpSq >= HIT_DIST * HIT_DIST) continue;
        const halfChord = Math.sqrt(HIT_DIST * HIT_DIST - perpSq);
        const dist = proj - halfChord;
        if (dist > 0 && dist < reflLen) {
            reflectedEnd = vec2(cushionPoint.x + reflDir.x * dist, cushionPoint.y + reflDir.y * dist);
            reboundGhostPos = reflectedEnd;
            reboundTargetBall = ball;
            break;
        }
    }

    return {
        cueRayEnd: cushionPoint,
        ghostBallPos: null,
        targetBallGuide: null,
        cueDeflectionGuide: null,
        cushionHit: {
            point: cushionPoint,
            reflectedEnd,
            reboundGhostPos,
            reboundTargetBall,
        },
    };
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
        white: { color: '#f8fafc', border: '#94a3b8', gradientId: 'ballWhite' },
        yellow: { color: '#facc15', border: '#ca8a04', gradientId: 'ballYellow' },
        red: { color: '#ef4444', border: '#991b1b', gradientId: 'ballRed' },
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
            const hitRadius = 15;
            for (const ball of ballsRef.current) {
                const dx = ball.pos.x - tableX;
                const dy = ball.pos.y - tableY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < hitRadius) {
                    return ball.id;
                }
            }
            return null;
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
                    
                    let clampedX = Math.max(ballRadius, Math.min(TABLE_W - ballRadius, tablePos.x));
                    let clampedY = Math.max(ballRadius, Math.min(TABLE_H - ballRadius, tablePos.y));

                    const otherBalls = ballsRef.current.filter((b) => b.id !== currentDraggingBall);
                    const minDistance = ballRadius * 2;
                    
                    for (const otherBall of otherBalls) {
                        const dx = clampedX - otherBall.pos.x;
                        const dy = clampedY - otherBall.pos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < minDistance) {
                            const angle = Math.atan2(dy, dx);
                            clampedX = otherBall.pos.x + Math.cos(angle) * minDistance;
                            clampedY = otherBall.pos.y + Math.sin(angle) * minDistance;
                            
                            clampedX = Math.max(ballRadius, Math.min(TABLE_W - ballRadius, clampedX));
                            clampedY = Math.max(ballRadius, Math.min(TABLE_H - ballRadius, clampedY));
                        }
                    }

                    onBallMoveRef.current(currentDraggingBall, vec2(clampedX, clampedY));
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
                setDraggingBallId(null);
                draggingNumberIdRef.current = null;
            },
            onPanResponderTerminate: () => {
                if (isDraggingCueRef.current) {
                    currentPowerRef.current = 0;
                    onPowerChangeRef.current?.(0);
                }
                isDraggingCueRef.current = false;
                setDraggingBallId(null);
                draggingNumberIdRef.current = null;
            },
        })
    ).current;

    const renderTrajectory = useMemo(() => {
        if (!showGuides || !trajectory || trajectory.paths.length === 0) return null;

        return trajectory.paths.map((path) => {
            if (path.points.length < 2) return null;

            // Encontrar el punto más cercano a la posición actual de la bola
            const currentBall = balls.find((b) => b.id === path.ballId);
            if (!currentBall) return null;

            let startIndex = 0;
            
            // Si estamos simulando, filtrar puntos ya recorridos
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

            // Filtrar puntos ya recorridos durante simulación
            const isCueBall = path.ballId === cueBallId;
            const filteredPoints = path.points.slice(startIndex);

            if (filteredPoints.length < 2) return null;

            const points = filteredPoints
                .map((p) => {
                    const svgPos = mapPointToSvg(p.pos, orientation, layout);
                    return `${svgPos.x},${svgPos.y}`;
                })
                .join(' ');

            const color = path.ballId === 'white' ? '#f8fafc' : path.ballId === 'yellow' ? '#facc15' : '#ef4444';
            
            // Different stroke widths for cue ball vs target balls - trazos delgados con 80% opacidad
            const glowWidth = isCueBall ? 1.4 : 1.0;
            const lineWidth = isCueBall ? 0.65 : 0.45;

            return (
                <G key={path.ballId} opacity={0.80}>
                    <Polyline
                        points={points}
                        fill="none"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth={glowWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth={lineWidth}
                        strokeDasharray="3 3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {filteredPoints
                        .filter((p) => p.type === 'cushion')
                        .map((p, idx) => {
                            const svgPos = mapPointToSvg(p.pos, orientation, layout);
                            return (
                                <Circle
                                    key={`cushion-${path.ballId}-${idx}`}
                                    cx={svgPos.x}
                                    cy={svgPos.y}
                                    r={isCueBall ? 1.5 : 1.0}
                                    fill={color}
                                    opacity={0.9}
                                />
                            );
                        })}
                </G>
            );
        });
    }, [trajectory, orientation, layout, balls, cueBallId, showGuides, isSimulating]);

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
                    <LinearGradient id="frameGradient" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={woodPalette.start} />
                        <Stop offset="30%" stopColor={woodPalette.mid} />
                        <Stop offset="70%" stopColor={woodPalette.bevel} />
                        <Stop offset="100%" stopColor={woodPalette.end} />
                    </LinearGradient>

                    {/* Gradiente de las bandas de caucho */}
                    <LinearGradient id="cushionGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={clothPalette.cushionTop} />
                        <Stop offset="100%" stopColor={clothPalette.cushionBottom} />
                    </LinearGradient>

                    {/* Gradiente base del paño Simonis */}
                    <RadialGradient id="feltGradient" cx="50%" cy="50%" r="65%">
                        <Stop offset="0%" stopColor={clothPalette.highlight} />
                        <Stop offset="65%" stopColor={clothPalette.base} />
                        <Stop offset="100%" stopColor={clothPalette.edge} />
                    </RadialGradient>

                    {/* Viñeta de iluminación cenital estilo 8 Ball Pool */}
                    <RadialGradient id="arenaSpotlight" cx="50%" cy="50%" r="55%">
                        <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.16} />
                        <Stop offset="40%" stopColor={clothPalette.highlight} stopOpacity={0.08} />
                        <Stop offset="75%" stopColor="#000000" stopOpacity={0.20} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.46} />
                    </RadialGradient>

                    {/* Gradiente de cantoneras metálicas esquineras */}
                    <LinearGradient id="cornerMetalGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={metalPalette.highlight} />
                        <Stop offset="30%" stopColor={metalPalette.mid} />
                        <Stop offset="70%" stopColor={metalPalette.base} />
                        <Stop offset="100%" stopColor={metalPalette.dark} />
                    </LinearGradient>

                    {/* Sombras de oclusión ambiental bajo la nariz de las bandas */}
                    {/* Sombras de oclusión ambiental bajo la nariz de las bandas con iluminación direccional */}
                    <LinearGradient id="topCushionShadow" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.62} />
                        <Stop offset="60%" stopColor="#000000" stopOpacity={0.24} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>
                    <LinearGradient id="bottomCushionShadow" x1="0" y1="1" x2="0" y2="0">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.35} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>
                    <LinearGradient id="leftCushionShadow" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.62} />
                        <Stop offset="60%" stopColor="#000000" stopOpacity={0.24} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>
                    <LinearGradient id="rightCushionShadow" x1="1" y1="0" x2="0" y2="0">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.35} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </LinearGradient>

                    {/* Sombra de oclusión y contacto de las bolas sobre el paño */}
                    <RadialGradient id="ballDropShadow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#000000" stopOpacity={0.72} />
                        <Stop offset="45%" stopColor="#000000" stopOpacity={0.38} />
                        <Stop offset="100%" stopColor="#000000" stopOpacity={0.0} />
                    </RadialGradient>

                    {/* Esferas 3D fotorrealistas de bolas de carambola estilo 8 Ball Pool */}
                    <RadialGradient id="ballWhite" cx="34%" cy="28%" r="68%">
                        <Stop offset="0%" stopColor="#ffffff" />
                        <Stop offset="28%" stopColor="#f8fafc" />
                        <Stop offset="58%" stopColor="#e2e8f0" />
                        <Stop offset="80%" stopColor="#94a3b8" />
                        <Stop offset="93%" stopColor="#64748b" />
                        <Stop offset="100%" stopColor="#334155" />
                    </RadialGradient>
                    <RadialGradient id="ballYellow" cx="34%" cy="28%" r="68%">
                        <Stop offset="0%" stopColor="#fffbeb" />
                        <Stop offset="26%" stopColor="#fef08a" />
                        <Stop offset="56%" stopColor="#facc15" />
                        <Stop offset="78%" stopColor="#ca8a04" />
                        <Stop offset="92%" stopColor="#854d0e" />
                        <Stop offset="100%" stopColor="#451a03" />
                    </RadialGradient>
                    <RadialGradient id="ballRed" cx="34%" cy="28%" r="68%">
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
                    fill="url(#frameGradient)"
                    stroke={woodPalette.bevel}
                    strokeWidth={1.2}
                />

                {/* 2. Cantoneras metálicas esquineras pulidas estilo 8 Ball Pool */}
                {(() => {
                    const railT = layout.railThickness;
                    const cornerSize = railT * 1.5;
                    const cornerR = railT * 0.4;
                    const rivetR = Math.max(1.0, railT * 0.08);
                    return (
                        <G>
                            {/* Esquina Superior Izquierda */}
                            <Path
                                d={`M ${layout.railX} ${layout.railY + cornerSize} L ${layout.railX} ${layout.railY + cornerR} Q ${layout.railX} ${layout.railY} ${layout.railX + cornerR} ${layout.railY} L ${layout.railX + cornerSize} ${layout.railY} L ${layout.railX + cornerSize} ${layout.railY + railT} L ${layout.railX + railT} ${layout.railY + cornerSize} Z`}
                                fill="url(#cornerMetalGrad)"
                                stroke={metalPalette.border}
                                strokeWidth={0.6}
                            />
                            <Circle cx={layout.railX + cornerSize * 0.55} cy={layout.railY + railT * 0.5} r={rivetR} fill={metalPalette.rivet} />
                            <Circle cx={layout.railX + railT * 0.5} cy={layout.railY + cornerSize * 0.55} r={rivetR} fill={metalPalette.rivet} />

                            {/* Esquina Superior Derecha */}
                            <Path
                                d={`M ${layout.railX + layout.railW - cornerSize} ${layout.railY} L ${layout.railX + layout.railW - cornerR} ${layout.railY} Q ${layout.railX + layout.railW} ${layout.railY} ${layout.railX + layout.railW} ${layout.railY + cornerR} L ${layout.railX + layout.railW} ${layout.railY + cornerSize} L ${layout.railX + layout.railW - railT} ${layout.railY + cornerSize} L ${layout.railX + layout.railW - cornerSize} ${layout.railY + railT} Z`}
                                fill="url(#cornerMetalGrad)"
                                stroke={metalPalette.border}
                                strokeWidth={0.6}
                            />
                            <Circle cx={layout.railX + layout.railW - cornerSize * 0.55} cy={layout.railY + railT * 0.5} r={rivetR} fill={metalPalette.rivet} />
                            <Circle cx={layout.railX + layout.railW - railT * 0.5} cy={layout.railY + cornerSize * 0.55} r={rivetR} fill={metalPalette.rivet} />

                            {/* Esquina Inferior Izquierda */}
                            <Path
                                d={`M ${layout.railX} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + railT} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + cornerSize} ${layout.railY + layout.railH - railT} L ${layout.railX + cornerSize} ${layout.railY + layout.railH} L ${layout.railX + cornerR} ${layout.railY + layout.railH} Q ${layout.railX} ${layout.railY + layout.railH} ${layout.railX} ${layout.railY + layout.railH - cornerR} Z`}
                                fill="url(#cornerMetalGrad)"
                                stroke={metalPalette.border}
                                strokeWidth={0.6}
                            />
                            <Circle cx={layout.railX + cornerSize * 0.55} cy={layout.railY + layout.railH - railT * 0.5} r={rivetR} fill={metalPalette.rivet} />
                            <Circle cx={layout.railX + railT * 0.5} cy={layout.railY + layout.railH - cornerSize * 0.55} r={rivetR} fill={metalPalette.rivet} />

                            {/* Esquina Inferior Derecha */}
                            <Path
                                d={`M ${layout.railX + layout.railW - cornerSize} ${layout.railY + layout.railH} L ${layout.railX + layout.railW - cornerSize} ${layout.railY + layout.railH - railT} L ${layout.railX + layout.railW - railT} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + layout.railW} ${layout.railY + layout.railH - cornerSize} L ${layout.railX + layout.railW} ${layout.railY + layout.railH - cornerR} Q ${layout.railX + layout.railW} ${layout.railY + layout.railH} ${layout.railX + layout.railW - cornerR} ${layout.railY + layout.railH} Z`}
                                fill="url(#cornerMetalGrad)"
                                stroke={metalPalette.border}
                                strokeWidth={0.6}
                            />
                            <Circle cx={layout.railX + layout.railW - cornerSize * 0.55} cy={layout.railY + layout.railH - railT * 0.5} r={rivetR} fill={metalPalette.rivet} />
                            <Circle cx={layout.railX + layout.railW - railT * 0.5} cy={layout.railY + layout.railH - cornerSize * 0.55} r={rivetR} fill={metalPalette.rivet} />
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
                    fill="url(#cushionGradient)"
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
                    fill="url(#feltGradient)"
                />

                {/* 5. Iluminación cenital de torneo estilo 8 Ball Pool */}
                {tablePreferences.showSpotlight && (
                    <Rect
                        x={layout.playX}
                        y={layout.playY}
                        width={layout.playW}
                        height={layout.playH}
                        rx={2}
                        fill="url(#arenaSpotlight)"
                        opacity={0.65}
                    />
                )}

                {/* 6. Sombras 3D bajo la nariz del caucho con iluminación direccional */}
                <Rect x={layout.playX} y={layout.playY} width={layout.playW} height={5.5} fill="url(#topCushionShadow)" />
                <Rect x={layout.playX} y={layout.playY + layout.playH - 3.2} width={layout.playW} height={3.2} fill="url(#bottomCushionShadow)" />
                <Rect x={layout.playX} y={layout.playY} width={5.5} height={layout.playH} fill="url(#leftCushionShadow)" />
                <Rect x={layout.playX + layout.playW - 3.2} y={layout.playY} width={3.2} height={layout.playH} fill="url(#rightCushionShadow)" />

                {/* Biselado de luz y sombra en la nariz de las bandas */}
                <Line x1={layout.playX} y1={layout.playY} x2={layout.playX + layout.playW} y2={layout.playY} stroke="rgba(255,255,255,0.40)" strokeWidth={0.8} />
                <Line x1={layout.playX} y1={layout.playY} x2={layout.playX} y2={layout.playY + layout.playH} stroke="rgba(255,255,255,0.40)" strokeWidth={0.8} />
                <Line x1={layout.playX} y1={layout.playY + layout.playH} x2={layout.playX + layout.playW} y2={layout.playY + layout.playH} stroke="rgba(0,0,0,0.40)" strokeWidth={0.8} />
                <Line x1={layout.playX + layout.playW} y1={layout.playY} x2={layout.playX + layout.playW} y2={layout.playY + layout.playH} stroke="rgba(0,0,0,0.40)" strokeWidth={0.8} />

                {/* 7. Marca de agua / Calcomanía central de paño (Sticker / Decal) */}
                {tablePreferences.showTableDecal && tablePreferences.tableDecal !== 'none' && (() => {
                    const decalOpacity = tablePreferences.decalOpacity ?? 0.18;
                    const centerX = layout.playX + layout.playW / 2;
                    const centerY = layout.playY + layout.playH / 2;
                    const minDim = Math.min(layout.playW, layout.playH);

                    if (tablePreferences.tableDecal === 'skull') {
                        const decalSize = minDim * 0.78;
                        return (
                            <SvgImage
                                key="decal-skull"
                                href={SKULL_DECAL_SOURCE}
                                x={centerX - decalSize / 2}
                                y={centerY - decalSize / 2}
                                width={decalSize}
                                height={decalSize}
                                opacity={decalOpacity}
                                preserveAspectRatio="xMidYMid meet"
                            />
                        );
                    }

                    if (tablePreferences.tableDecal === 'crown_filigree') {
                        return (
                            <G key="decal-crown" opacity={decalOpacity} transform={`translate(${centerX}, ${centerY}) scale(${minDim / 142})`}>
                                <Path
                                    d="M -22 10 L 22 10 L 25 -8 L 12 0 L 0 -16 L -12 0 L -25 -8 Z"
                                    fill="none"
                                    stroke="#fbbf24"
                                    strokeWidth={1.2}
                                />
                                <Circle cx={0} cy={-16} r={2} fill="#fbbf24" />
                                <Circle cx={-25} cy={-8} r={1.6} fill="#fbbf24" />
                                <Circle cx={25} cy={-8} r={1.6} fill="#fbbf24" />
                                <Circle cx={0} cy={2} r={3} fill="#fbbf24" opacity={0.6} />
                                <Circle cx={0} cy={0} r={28} fill="none" stroke="#fbbf24" strokeWidth={0.6} strokeDasharray="3 3" />
                            </G>
                        );
                    }

                    if (tablePreferences.tableDecal === 'cyber_rings') {
                        return (
                            <G key="decal-cyber" opacity={decalOpacity} transform={`translate(${centerX}, ${centerY}) scale(${minDim / 142})`}>
                                <Circle cx={0} cy={0} r={32} fill="none" stroke="#22d3ee" strokeWidth={0.8} />
                                <Circle cx={0} cy={0} r={28} fill="none" stroke="#06b6d4" strokeWidth={0.5} strokeDasharray="4 2" />
                                <Circle cx={0} cy={0} r={20} fill="none" stroke="#22d3ee" strokeWidth={0.6} />
                                <Line x1={-36} y1={0} x2={36} y2={0} stroke="#22d3ee" strokeWidth={0.6} />
                                <Line x1={0} y1={-36} x2={0} y2={36} stroke="#22d3ee" strokeWidth={0.6} />
                            </G>
                        );
                    }

                    if (tablePreferences.tableDecal === 'classic_carom') {
                        return (
                            <G key="decal-classic" opacity={decalOpacity} transform={`translate(${centerX}, ${centerY}) scale(${minDim / 142})`}>
                                <Circle cx={0} cy={-8} r={6} fill="none" stroke="#ffffff" strokeWidth={1} />
                                <Circle cx={-8} cy={6} r={6} fill="none" stroke="#fef08a" strokeWidth={1} />
                                <Circle cx={8} cy={6} r={6} fill="none" stroke="#fca5a5" strokeWidth={1} />
                                <Circle cx={0} cy={0} r={22} fill="none" stroke="#ffffff" strokeWidth={0.5} strokeDasharray="2 2" />
                            </G>
                        );
                    }

                    // Default: tournament_crest
                    return (
                        <G key="decal-crest" opacity={decalOpacity} transform={`translate(${centerX}, ${centerY}) scale(${minDim / 142})`}>
                            <Circle cx={0} cy={0} r={18} fill="none" stroke="#ffffff" strokeWidth={0.7} />
                            <Circle cx={0} cy={0} r={16.5} fill="none" stroke="#ffffff" strokeWidth={0.4} strokeDasharray="2 2" />
                            <Line x1={-12} y1={-12} x2={12} y2={12} stroke="#ffffff" strokeWidth={0.8} />
                            <Line x1={-12} y1={12} x2={12} y2={-12} stroke="#ffffff" strokeWidth={0.8} />
                            <Circle cx={0} cy={-5} r={2.2} fill="#ffffff" />
                            <Circle cx={-4.5} cy={4} r={2.2} fill="#ffffff" />
                            <Circle cx={4.5} cy={4} r={2.2} fill="#ffffff" />
                        </G>
                    );
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
                {tablePreferences.showCornerDiamonds && diamonds.corners.map((point, idx) => {
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

                {/* 10. Trazas dinámicas continuas estilo Billiard-Bible con 80% de opacidad (⚪ 🟡 🔴) */}
                {dynamicTrails && (
                    <G opacity={0.80}>
                        {(['white', 'yellow', 'red'] as BallId[]).map((ballId) => {
                            const trail = dynamicTrails[ballId];
                            if (!trail || trail.length < 2) return null;
                            const strokeColor = ballId === 'white' ? '#ffffff' : ballId === 'yellow' ? '#facc15' : '#ef4444';
                            const glowColor = ballId === 'white' ? 'rgba(255,255,255,0.22)' : ballId === 'yellow' ? 'rgba(250,204,21,0.22)' : 'rgba(239,68,68,0.22)';
                            const pointsStr = trail
                                .map((p) => {
                                    const svgPos = mapPointToSvg(p.pos, orientation, layout);
                                    return `${svgPos.x.toFixed(1)},${svgPos.y.toFixed(1)}`;
                                })
                                .join(' ');

                            return (
                                <G key={`dynamic-trail-${ballId}`}>
                                    {/* Resplandor exterior delgado */}
                                    <Polyline
                                        points={pointsStr}
                                        fill="none"
                                        stroke={glowColor}
                                        strokeWidth={1.5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {/* Línea viva interior nítida */}
                                    <Polyline
                                        points={pointsStr}
                                        fill="none"
                                        stroke={strokeColor}
                                        strokeWidth={0.75}
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

                {/* 11. Guía láser de puntería limpia y profesional estilo 8 Ball Pool */}
                {showGuides && !isSimulating && (() => {
                    const guideData = compute8BallAimGuide(balls, cueBallId, aimDirection);
                    if (!guideData) return null;

                    const cueBall = balls.find((b) => b.id === cueBallId);
                    if (!cueBall) return null;

                    const cueSvg = mapPointToSvg(cueBall.pos, orientation, layout);
                    const rayEndSvg = mapPointToSvg(guideData.cueRayEnd, orientation, layout);
                    const ghostSvg = guideData.ghostBallPos ? mapPointToSvg(guideData.ghostBallPos, orientation, layout) : null;

                    return (
                        <G pointerEvents="none">
                            {/* Resplandor suave del rayo primario */}
                            <Line
                                x1={cueSvg.x}
                                y1={cueSvg.y}
                                x2={rayEndSvg.x}
                                y2={rayEndSvg.y}
                                stroke="rgba(56, 189, 248, 0.35)"
                                strokeWidth={2.4}
                                strokeLinecap="round"
                            />
                            {/* Núcleo punteado de precisión del rayo */}
                            <Line
                                x1={cueSvg.x}
                                y1={cueSvg.y}
                                x2={rayEndSvg.x}
                                y2={rayEndSvg.y}
                                stroke="#ffffff"
                                strokeWidth={0.9}
                                strokeDasharray="3 3"
                                strokeLinecap="round"
                            />

                            {/* Impacto en bola: Bola Fantasma + Guía de Bola Objetivo + Deflexión */}
                            {ghostSvg && (
                                <G>
                                    {/* Bola Fantasma translúcida */}
                                    <Circle
                                        cx={ghostSvg.x}
                                        cy={ghostSvg.y}
                                        r={3.075}
                                        fill="rgba(56, 189, 248, 0.16)"
                                        stroke="#ffffff"
                                        strokeWidth={0.8}
                                    />
                                    <Circle
                                        cx={ghostSvg.x}
                                        cy={ghostSvg.y}
                                        r={3.075}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth={0.5}
                                        strokeDasharray="2 2"
                                    />
                                    <Circle cx={ghostSvg.x} cy={ghostSvg.y} r={0.8} fill="#38bdf8" />

                                    {/* Guía corta y nítida de la bola objetivo */}
                                    {guideData.targetBallGuide && (() => {
                                        const tStart = mapPointToSvg(guideData.targetBallGuide.start, orientation, layout);
                                        const tEnd = mapPointToSvg(guideData.targetBallGuide.end, orientation, layout);
                                        return (
                                            <G>
                                                <Line
                                                    x1={tStart.x}
                                                    y1={tStart.y}
                                                    x2={tEnd.x}
                                                    y2={tEnd.y}
                                                    stroke={guideData.targetBallGuide.color}
                                                    strokeWidth={1.4}
                                                    strokeDasharray="3 2"
                                                    strokeLinecap="round"
                                                    opacity={0.95}
                                                />
                                                <Circle cx={tEnd.x} cy={tEnd.y} r={1.2} fill={guideData.targetBallGuide.color} />
                                            </G>
                                        );
                                    })()}

                                    {/* Guía corta de deflexión / tangente de la bola blanca */}
                                    {guideData.cueDeflectionGuide && (() => {
                                        const cStart = mapPointToSvg(guideData.cueDeflectionGuide.start, orientation, layout);
                                        const cEnd = mapPointToSvg(guideData.cueDeflectionGuide.end, orientation, layout);
                                        return (
                                            <Line
                                                x1={cStart.x}
                                                y1={cStart.y}
                                                x2={cEnd.x}
                                                y2={cEnd.y}
                                                stroke="rgba(255,255,255,0.7)"
                                                strokeWidth={0.8}
                                                strokeDasharray="2.5 2.5"
                                                strokeLinecap="round"
                                            />
                                        );
                                    })()}
                                </G>
                            )}

                            {/* Impacto en banda (Bricole): Punto de rebote + Línea reflejada única */}
                            {guideData.cushionHit && (() => {
                                const cPoint = mapPointToSvg(guideData.cushionHit.point, orientation, layout);
                                const rEnd = mapPointToSvg(guideData.cushionHit.reflectedEnd, orientation, layout);
                                const rGhostSvg = guideData.cushionHit.reboundGhostPos
                                    ? mapPointToSvg(guideData.cushionHit.reboundGhostPos, orientation, layout)
                                    : null;
                                return (
                                    <G>
                                        <Circle cx={cPoint.x} cy={cPoint.y} r={2.8} fill="rgba(56, 189, 248, 0.3)" />
                                        <Circle cx={cPoint.x} cy={cPoint.y} r={1.4} fill="#38bdf8" />
                                        <Line
                                            x1={cPoint.x}
                                            y1={cPoint.y}
                                            x2={rEnd.x}
                                            y2={rEnd.y}
                                            stroke="#38bdf8"
                                            strokeWidth={0.9}
                                            strokeDasharray="3 3"
                                            strokeLinecap="round"
                                            opacity={0.85}
                                        />
                                        {rGhostSvg && (
                                            <G>
                                                <Circle
                                                    cx={rGhostSvg.x}
                                                    cy={rGhostSvg.y}
                                                    r={3.075}
                                                    fill="rgba(56, 189, 248, 0.16)"
                                                    stroke="#ffffff"
                                                    strokeWidth={0.8}
                                                />
                                                <Circle cx={rGhostSvg.x} cy={rGhostSvg.y} r={0.8} fill="#38bdf8" />
                                            </G>
                                        )}
                                    </G>
                                );
                            })()}
                        </G>
                    );
                })()}

                {/* 13. Bolas de Carambola en 3D fotorrealistas con física de rodadura real (8 Ball Pool) */}
                {balls.map((ball) => {
                    const mapped = mapPointToSvg(ball.pos, orientation, layout);
                    const ballStyle = ballColors[ball.id];
                    const isCueBall = ball.id === cueBallId;
                    const ballSkin: BallSkinId = tablePreferences.ballSkin ?? 'aramith_pro_cup';
                    const showDots = tablePreferences.showBallDots !== false;
                    const quat = ballRotationsRef.current[ball.id] ?? INITIAL_BALL_QUATERNION;
                    const isVertical = orientation === 'vertical';
                    const ballRadiusSvg = 2.75;

                    return (
                        <G key={ball.id}>
                            {/* Sombra de oclusión y contacto volumétrica sobre el paño */}
                            <Ellipse
                                cx={mapped.x + 0.5}
                                cy={mapped.y + 0.6}
                                rx={3.1}
                                ry={2.9}
                                fill="url(#ballDropShadow)"
                            />

                            {/* Cuerpo esférico 3D fotorrealista con gradiente multicapa */}
                            <Circle
                                cx={mapped.x}
                                cy={mapped.y}
                                r={ballRadiusSvg}
                                fill={`url(#${ballStyle.gradientId})`}
                                stroke={ballStyle.border}
                                strokeWidth={0.22}
                            />

                            {/* Marcajes oficiales en 3D que ruedan físicamente sobre la esfera */}
                            {showDots && (() => {
                                if (ballSkin === 'classic_solid') {
                                    if (ball.id === 'white' || ball.id === 'yellow') {
                                        const dotColor = ball.id === 'white' ? '#dc2626' : '#0f172a';
                                        return (
                                            <G pointerEvents="none">
                                                {SPHERE_CLASSIC_DOTS.map((pt, idx) => {
                                                    const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, 0.42, isVertical);
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

                                    return (
                                        <G pointerEvents="none">
                                            {/* Anillos de visión orbitales que giran con la bola */}
                                            {ringSegments1.map((d, i) => (
                                                <Path key={`pba-ring1-${i}`} d={d} fill="none" stroke={ringColor} strokeWidth={0.24} strokeDasharray="1.2 0.8" />
                                            ))}
                                            {ringSegments2.map((d, i) => (
                                                <Path key={`pba-ring2-${i}`} d={d} fill="none" stroke={ringColor} strokeWidth={0.24} strokeDasharray="1.2 0.8" />
                                            ))}

                                            {/* 6 puntos que rotan sobre la esfera con proyección ortográfica esférica */}
                                            {SPHERE_OCTAHEDRAL_DOTS.map((pt, idx) => {
                                                const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, 0.42, isVertical);
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
                                                        strokeWidth={0.12}
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

                                    return (
                                        <G pointerEvents="none">
                                            {ringSegments.map((d, i) => (
                                                <Path key={`dyna-ring-${i}`} d={d} fill="none" stroke={ringColor} strokeWidth={0.25} />
                                            ))}
                                            {SPHERE_OCTAHEDRAL_DOTS.map((pt, idx) => {
                                                const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, 0.36, isVertical);
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
                                    return (
                                        <G pointerEvents="none">
                                            {SPHERE_OCTAHEDRAL_DOTS.map((pt, idx) => {
                                                const proj = projectSpherePointToSvg(pt, quat, mapped, ballRadiusSvg, 0.44, isVertical);
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
                                                        strokeWidth={0.12}
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
                                    cx={mapped.x - 0.92}
                                    cy={mapped.y - 0.92}
                                    rx={1.22}
                                    ry={0.62}
                                    transform={`rotate(-42 ${mapped.x - 0.92} ${mapped.y - 0.92})`}
                                    fill="rgba(255, 255, 255, 0.62)"
                                />
                                {/* Pinpoint especular de foco puntual cenital */}
                                <Circle
                                    cx={mapped.x - 0.8}
                                    cy={mapped.y - 0.8}
                                    r={0.4}
                                    fill="#ffffff"
                                    opacity={0.96}
                                />
                                {/* Resplandor Fresnel secundario en el limbo opuesto (rebote del paño) */}
                                <Path
                                    d={`M ${(mapped.x - 0.4).toFixed(2)} ${(mapped.y + 2.7).toFixed(2)} A 2.75 2.75 0 0 0 ${(mapped.x + 2.7).toFixed(2)} ${(mapped.y - 0.4).toFixed(2)}`}
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.22)"
                                    strokeWidth={0.42}
                                    strokeLinecap="round"
                                />
                            </G>

                            {/* Anillo de selección táctil si es la bola tiradora */}
                            {isCueBall && !isSimulating && (
                                <G pointerEvents="none">
                                    <Circle
                                        cx={mapped.x}
                                        cy={mapped.y}
                                        r={4.7}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth={0.65}
                                        strokeDasharray="2.5 2.5"
                                        opacity={0.88}
                                    />
                                    <Circle
                                        cx={mapped.x}
                                        cy={mapped.y}
                                        r={5.5}
                                        fill="none"
                                        stroke="rgba(56, 189, 248, 0.25)"
                                        strokeWidth={0.5}
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
        width: '100%',
        overflow: 'visible',
    },
    pointerEventsNone: {
        pointerEvents: 'none',
    },
    editOverlay: {
        ...StyleSheet.absoluteFillObject,
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
