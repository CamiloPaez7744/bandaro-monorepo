import { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, type StyleProp, type ViewStyle, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';

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

type Orientation = 'horizontal' | 'vertical';

interface InteractiveBilliardsTableProps {
    orientation?: Orientation;
    style?: StyleProp<ViewStyle>;
    balls: Ball[];
    cueBallId: BallId;
    trajectory: TrajectoryPrediction | null;
    onBallMove?: (ballId: BallId, position: Vec2) => void;
    onAimChange?: (direction: Vec2) => void;
    isSimulating?: boolean;
    isEditMode?: boolean;
    showGuides?: boolean;
    maxCushionBounces?: number;
}

const TABLE_W = DEFAULT_TABLE.width;
const TABLE_H = DEFAULT_TABLE.height;

const longRailRatios = Array.from({ length: 7 }, (_, index) => (index + 1) / 8);
const shortRailRatios = Array.from({ length: 3 }, (_, index) => (index + 1) / 4);
const outerMargin = 0;
const railThickness = DEFAULT_TABLE.railThickness;
const cushionThickness = DEFAULT_TABLE.cushionThickness;
const longGridLines = 7;
const shortGridLines = 3;

function getLayout(orientation: Orientation) {
    const aspect = orientation === 'horizontal' ? 2 : 0.5;
    const basePlayW = TABLE_W;
    const basePlayH = basePlayW / aspect;
    const cushionX = basePlayW + cushionThickness * 2;
    const cushionY = basePlayH + cushionThickness * 2;
    const railW = cushionX + railThickness * 2;
    const railH = cushionY + railThickness * 2;
    const viewBoxW = railW + outerMargin * 2;
    const viewBoxH = railH + outerMargin * 2;

    const railX = outerMargin;
    const railY = outerMargin;
    const cx = outerMargin + railThickness;
    const cy = outerMargin + railThickness;
    const playX = cx + cushionThickness;
    const playY = cy + cushionThickness;

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
    const railCenterTop = layout.railY + railThickness / 2;
    const railCenterBottom = layout.railY + layout.railH - railThickness / 2;
    const railCenterLeft = layout.railX + railThickness / 2;
    const railCenterRight = layout.railX + layout.railW - railThickness / 2;

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

function InteractiveBilliardsTableBase(props: Readonly<InteractiveBilliardsTableProps>) {
    const {
        orientation = 'vertical',
        style,
        balls,
        cueBallId,
        trajectory,
        onBallMove,
        onAimChange,
        isSimulating = false,
        isEditMode = false,
        showGuides = true,
        maxCushionBounces = 5,
    } = props;

    const layout = getLayout(orientation);
    const containerRef = useRef<View>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [draggingBallId, setDraggingBallId] = useState<BallId | null>(null);
    
    const isEditModeRef = useRef(isEditMode);
    const isSimulatingRef = useRef(isSimulating);
    const ballsRef = useRef(balls);
    const cueBallIdRef = useRef(cueBallId);
    const containerSizeRef = useRef(containerSize);
    const layoutRef = useRef(layout);
    const orientationRef = useRef(orientation);
    const onBallMoveRef = useRef(onBallMove);
    const onAimChangeRef = useRef(onAimChange);
    const draggingBallIdRef = useRef<BallId | null>(null);

    useEffect(() => { isEditModeRef.current = isEditMode; }, [isEditMode]);
    useEffect(() => { isSimulatingRef.current = isSimulating; }, [isSimulating]);
    useEffect(() => { ballsRef.current = balls; }, [balls]);
    useEffect(() => { cueBallIdRef.current = cueBallId; }, [cueBallId]);
    useEffect(() => { containerSizeRef.current = containerSize; }, [containerSize]);
    useEffect(() => { layoutRef.current = layout; }, [layout]);
    useEffect(() => { orientationRef.current = orientation; }, [orientation]);
    useEffect(() => { onBallMoveRef.current = onBallMove; }, [onBallMove]);
    useEffect(() => { onAimChangeRef.current = onAimChange; }, [onAimChange]);
    useEffect(() => { draggingBallIdRef.current = draggingBallId; }, [draggingBallId]);

    const ballColors: Record<BallId, { color: string; border: string; gradientId: string }> = {
        white: { color: '#f8fafc', border: '#cbd5e1', gradientId: 'ballWhite' },
        yellow: { color: '#facc15', border: '#ca8a04', gradientId: 'ballYellow' },
        red: { color: '#dc2626', border: '#991b1b', gradientId: 'ballRed' },
    };

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

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isSimulatingRef.current,
            onMoveShouldSetPanResponder: () => !isSimulatingRef.current,
            onPanResponderGrant: (event: GestureResponderEvent) => {
                if (isSimulatingRef.current) return;

                const { locationX, locationY } = event.nativeEvent;
                const tablePos = screenToTableRef(locationX, locationY);

                if (isEditModeRef.current) {
                    const ballId = findBallAtPointRef(tablePos.x, tablePos.y);
                    if (ballId) {
                        setDraggingBallId(ballId);
                    }
                } else {
                    const cueBall = ballsRef.current.find((b) => b.id === cueBallIdRef.current);
                    if (cueBall && onAimChangeRef.current) {
                        const direction = vec2Normalize(vec2Sub(tablePos, cueBall.pos));
                        onAimChangeRef.current(direction);
                    }
                }
            },
            onPanResponderMove: (event: GestureResponderEvent) => {
                if (isSimulatingRef.current) return;

                const { locationX, locationY } = event.nativeEvent;
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
                } else if (!isEditModeRef.current && onAimChangeRef.current) {
                    const cueBall = ballsRef.current.find((b) => b.id === cueBallIdRef.current);
                    if (cueBall) {
                        const direction = vec2Normalize(vec2Sub(tablePos, cueBall.pos));
                        onAimChangeRef.current(direction);
                    }
                }
            },
            onPanResponderRelease: () => {
                setDraggingBallId(null);
            },
            onPanResponderTerminate: () => {
                setDraggingBallId(null);
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

            // Filtrar puntos por maxCushionBounces (solo para cue ball)
            const isCueBall = path.ballId === cueBallId;
            let filteredPoints = path.points.slice(startIndex);
            
            if (isCueBall && maxCushionBounces > 0) {
                let cushionCount = 0;
                const cutoffIndex = filteredPoints.findIndex((p) => {
                    if (p.type === 'cushion') {
                        cushionCount++;
                        return cushionCount > maxCushionBounces;
                    }
                    return false;
                });
                
                if (cutoffIndex !== -1) {
                    filteredPoints = filteredPoints.slice(0, cutoffIndex);
                }
            }

            if (filteredPoints.length < 2) return null;

            const points = filteredPoints
                .map((p) => {
                    const svgPos = mapPointToSvg(p.pos, orientation, layout);
                    return `${svgPos.x},${svgPos.y}`;
                })
                .join(' ');

            const color = path.ballId === 'white' ? '#f8fafc' : path.ballId === 'yellow' ? '#facc15' : '#ef4444';
            
            // Different stroke widths for cue ball vs target balls
            const glowWidth = isCueBall ? 1.8 : 1.2;
            const lineWidth = isCueBall ? 0.8 : 0.5;

            return (
                <G key={path.ballId}>
                    <Polyline
                        points={points}
                        fill="none"
                        stroke="rgba(255,255,255,0.14)"
                        strokeWidth={glowWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <Polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth={lineWidth}
                        strokeDasharray="4 4"
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
    }, [trajectory, orientation, layout, balls, cueBallId, showGuides, maxCushionBounces, isSimulating]);

    const diamonds = getDiamondPoints(orientation, layout);

    return (
        <View
            ref={containerRef}
            style={[styles.container, { aspectRatio: layout.viewBox.width / layout.viewBox.height }, style]}
            onLayout={(event) => {
                setContainerSize({
                    width: event.nativeEvent.layout.width,
                    height: event.nativeEvent.layout.height,
                });
            }}
            {...panResponder.panHandlers}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}>                <Defs>
                    <LinearGradient id="frameGradient" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#8b5a2b" />
                        <Stop offset="25%" stopColor="#a0692f" />
                        <Stop offset="50%" stopColor="#6d4423" />
                        <Stop offset="75%" stopColor="#8b5a2b" />
                        <Stop offset="100%" stopColor="#5d3a1f" />
                    </LinearGradient>
                    <LinearGradient id="cushionGradient" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#2f5647" />
                        <Stop offset="100%" stopColor="#1f382f" />
                    </LinearGradient>
                    <LinearGradient id="feltGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#2c8f68" />
                        <Stop offset="100%" stopColor="#226e51" />
                    </LinearGradient>
                    <LinearGradient id="shadowGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="rgba(31, 20, 13, 0.24)" />
                        <Stop offset="100%" stopColor="rgba(31, 20, 13, 0.04)" />
                    </LinearGradient>
                    <RadialGradient id="ballWhite" cx="35%" cy="35%" r="65%">
                        <Stop offset="0%" stopColor="#ffffff" />
                        <Stop offset="70%" stopColor="#e8e8e8" />
                        <Stop offset="100%" stopColor="#c8c8c8" />
                    </RadialGradient>
                    <RadialGradient id="ballYellow" cx="35%" cy="35%" r="65%">
                        <Stop offset="0%" stopColor="#ffe066" />
                        <Stop offset="70%" stopColor="#facc15" />
                        <Stop offset="100%" stopColor="#ca8a04" />
                    </RadialGradient>
                    <RadialGradient id="ballRed" cx="35%" cy="35%" r="65%">
                        <Stop offset="0%" stopColor="#f87171" />
                        <Stop offset="70%" stopColor="#dc2626" />
                        <Stop offset="100%" stopColor="#991b1b" />
                    </RadialGradient>
                </Defs>

                <Rect x={layout.railX} y={layout.railY} width={layout.railW} height={layout.railH} rx={10} fill="url(#frameGradient)" />
                <Rect x={layout.cushionX} y={layout.cushionY} width={layout.cushionW} height={layout.cushionH} rx={5} fill="url(#cushionGradient)" />
                <Rect x={layout.playX} y={layout.playY} width={layout.playW} height={layout.playH} rx={3} fill="url(#feltGradient)" />
                <Rect x={layout.playX} y={layout.playY} width={layout.playW} height={layout.playH} rx={3} fill="url(#shadowGradient)" opacity={0.28} />
                <Rect x={layout.playX + 1} y={layout.playY + 1} width={layout.playW - 2} height={layout.playH - 2} rx={2} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={0.5} opacity={0.6} />

                {Array.from({ length: orientation === 'horizontal' ? longGridLines : shortGridLines }, (_, index) => {
                    const ratio = (index + 1) / ((orientation === 'horizontal' ? longGridLines : shortGridLines) + 1);
                    return (
                        <Line
                            key={`long-grid-${index}`}
                            x1={layout.playX + layout.playW * ratio}
                            y1={layout.playY}
                            x2={layout.playX + layout.playW * ratio}
                            y2={layout.playY + layout.playH}
                            stroke="rgba(255,255,255,0.035)"
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
                            stroke="rgba(255,255,255,0.035)"
                            strokeWidth={0.7}
                        />
                    );
                })}

                {diamonds.longSide.map((point, idx) => (
                    <Circle key={`long-diamond-${idx}`} cx={point.x} cy={point.y} r={1.0} fill="#f8fafc" opacity={0.94} />
                ))}
                {diamonds.shortSide.map((point, idx) => (
                    <Circle key={`short-diamond-${idx}`} cx={point.x} cy={point.y} r={1.0} fill="#f8fafc" opacity={0.94} />
                ))}
                {diamonds.corners.map((point, idx) => (
                    <Circle key={`corner-diamond-${idx}`} cx={point.x} cy={point.y} r={1.0} fill="#f8fafc" opacity={0.94} />
                ))}

                {renderTrajectory}

                {balls.map((ball) => {
                    const mapped = mapPointToSvg(ball.pos, orientation, layout);
                    const ballStyle = ballColors[ball.id];
                    const isCueBall = ball.id === cueBallId;

                    return (
                        <G key={ball.id}>
                            <Circle cx={mapped.x + 0.4} cy={mapped.y + 0.4} r={3.075} fill="rgba(0,0,0,0.25)" />
                            <Circle
                                cx={mapped.x}
                                cy={mapped.y}
                                r={3.075}
                                fill={`url(#${ballStyle.gradientId})`}
                                stroke={ballStyle.border}
                                strokeWidth={0.4}
                            />
                            <Circle cx={mapped.x - 1} cy={mapped.y - 1} r={1.2} fill="rgba(255,255,255,0.85)" />
                            <Circle cx={mapped.x - 0.8} cy={mapped.y - 0.8} r={0.7} fill="rgba(255,255,255,0.95)" />
                            {isCueBall && (
                                <Circle
                                    cx={mapped.x}
                                    cy={mapped.y}
                                    r={4.5}
                                    fill="none"
                                    stroke="#fbbf24"
                                    strokeWidth={0.8}
                                    strokeDasharray="2 2"
                                    opacity={0.7}
                                />
                            )}
                        </G>
                    );
                })}
            </Svg>

            {isEditMode && (
                <View style={[styles.editOverlay, styles.pointerEventsNone]}>
                    <View style={styles.editBadge}>
                        <Text style={styles.editBadgeIcon}>{'\u270B'}</Text>
                    </View>
                </View>
            )}

            {!isEditMode && !isSimulating && (
                <View style={[styles.editOverlay, styles.pointerEventsNone]}>
                    <View style={styles.aimBadge}>
                        <Text style={styles.aimBadgeIcon}>{'\u{1F3AF}'}</Text>
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
        overflow: 'hidden',
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
        fontSize: 18,
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
        fontSize: 16,
    },
});
