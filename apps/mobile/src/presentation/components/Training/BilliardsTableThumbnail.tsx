import { memo, useId, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Polyline, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { Point2D } from '@/src/presentation/screens/Training/trainingData';
import { DiamondPinMarker } from './DiamondPinMarker';

type Orientation = 'horizontal' | 'vertical';

type BallTone = {
    id: 'white' | 'yellow' | 'red';
    x: number;
    y: number;
    color: string;
    border: string;
};

type TrajectoryPath = {
    id: string;
    points: Point2D[];
    color?: string;
    width?: number;
    dash?: number[];
    opacity?: number;
};

type AimGuide = {
    from: Point2D;
    to: Point2D;
    color?: string;
};

export type DiamondLabel = {
    x: number;
    y: number;
    text: string;
    color?: string;
    bgColor?: string;
};

export type DiamondPinItem = {
    x: number;
    y: number;
    label: string;
    pinColor: string;
    pinDirection: 'down' | 'up' | 'left' | 'right';
    role?: 'departure' | 'attack' | 'arrival_3rd' | 'arrival_4th';
    isSelected?: boolean;
};

interface BilliardsTableThumbnailProps {
    orientation?: Orientation;
    style?: StyleProp<ViewStyle>;
    balls?: BallTone[];
    path?: Point2D[];
    paths?: TrajectoryPath[];
    aim?: AimGuide;
    showPath?: boolean;
    showZones?: boolean;
    diamondLabels?: DiamondLabel[];
    diamondPins?: DiamondPinItem[];
}

const TABLE_W = 284;
const TABLE_H = 142;

const longRailRatios = Array.from({ length: 7 }, (_, index) => (index + 1) / 8);
const shortRailRatios = Array.from({ length: 3 }, (_, index) => (index + 1) / 4);
const outerMargin = 0;
const railThickness = 8.27;
const cushionThickness = 4.73;
const longGridLines = 7;
const shortGridLines = 3;

function getLayout(orientation: Orientation) {
    const aspect = orientation === 'horizontal' ? 2 : 0.5;
    const basePlayW = 284;
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

function mapPoint(point: Point2D, orientation: Orientation, layout: ReturnType<typeof getLayout>) {
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

function linePoints(points: Point2D[], orientation: Orientation, layout: ReturnType<typeof getLayout>) {
    return points
        .map((point) => {
            const mapped = mapPoint(point, orientation, layout);
            return `${mapped.x},${mapped.y}`;
        })
        .join(' ');
}

function BilliardsTableThumbnailBase(props: Readonly<BilliardsTableThumbnailProps>) {
    const {
        orientation = 'horizontal',
        style,
        balls = [],
        path = [],
        paths = [],
        aim,
        showPath = true,
        showZones = true,
        diamondLabels = [],
        diamondPins = [],
    } = props;
    const layout = getLayout(orientation);
    const uid = useId();
    const derivedPaths = useMemo<TrajectoryPath[]>(() => {
        if (paths.length > 0) return paths;
        if (path.length > 1) {
            return [{ id: 'solution', points: path, color: '#f8fafc', width: 2.25, dash: [8, 8], opacity: 1 }];
        }
        return [];
    }, [paths, path]);

    return (
        <View style={[styles.container, { aspectRatio: layout.viewBox.width / layout.viewBox.height }, style]}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}>
                <Defs>
                    <LinearGradient id={`${uid}-frameGradient`} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#8b5a2b" />
                        <Stop offset="25%" stopColor="#a0692f" />
                        <Stop offset="50%" stopColor="#6d4423" />
                        <Stop offset="75%" stopColor="#8b5a2b" />
                        <Stop offset="100%" stopColor="#5d3a1f" />
                    </LinearGradient>
                    <LinearGradient id={`${uid}-cushionGradient`} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#2f5647" />
                        <Stop offset="100%" stopColor="#1f382f" />
                    </LinearGradient>
                    <LinearGradient id={`${uid}-feltGradient`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#2c8f68" />
                        <Stop offset="100%" stopColor="#226e51" />
                    </LinearGradient>
                    <LinearGradient id={`${uid}-shadowGradient`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="rgba(31, 20, 13, 0.24)" />
                        <Stop offset="100%" stopColor="rgba(31, 20, 13, 0.04)" />
                    </LinearGradient>
                    <RadialGradient id={`${uid}-ballWhite`} cx="35%" cy="35%" r="65%">
                        <Stop offset="0%" stopColor="#ffffff" />
                        <Stop offset="70%" stopColor="#e8e8e8" />
                        <Stop offset="100%" stopColor="#c8c8c8" />
                    </RadialGradient>
                    <RadialGradient id={`${uid}-ballYellow`} cx="35%" cy="35%" r="65%">
                        <Stop offset="0%" stopColor="#ffe066" />
                        <Stop offset="70%" stopColor="#facc15" />
                        <Stop offset="100%" stopColor="#ca8a04" />
                    </RadialGradient>
                    <RadialGradient id={`${uid}-ballRed`} cx="35%" cy="35%" r="65%">
                        <Stop offset="0%" stopColor="#f87171" />
                        <Stop offset="70%" stopColor="#dc2626" />
                        <Stop offset="100%" stopColor="#991b1b" />
                    </RadialGradient>
                </Defs>

                <Rect x={layout.railX} y={layout.railY} width={layout.railW} height={layout.railH} rx={10} fill={`url(#${uid}-frameGradient)`} />
                <Rect x={layout.cushionX} y={layout.cushionY} width={layout.cushionW} height={layout.cushionH} rx={5} fill={`url(#${uid}-cushionGradient)`} />
                <Rect x={layout.playX} y={layout.playY} width={layout.playW} height={layout.playH} rx={3} fill={`url(#${uid}-feltGradient)`} />
                <Rect x={layout.playX} y={layout.playY} width={layout.playW} height={layout.playH} rx={3} fill={`url(#${uid}-shadowGradient)`} opacity={0.28} />
                <Rect x={layout.playX + 1} y={layout.playY + 1} width={layout.playW - 2} height={layout.playH - 2} rx={2} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={0.5} opacity={0.6} />

                {showZones ? (
                    <>
                        {Array.from({ length: orientation === 'horizontal' ? longGridLines : shortGridLines }, (_, index) => {
                            const ratio = (index + 1) / ((orientation === 'horizontal' ? longGridLines : shortGridLines) + 1);
                            return (
                                <Line
                                    key={`long-grid-${orientation}-${index}`}
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
                                    key={`short-grid-${orientation}-${index}`}
                                    x1={layout.playX}
                                    y1={layout.playY + layout.playH * ratio}
                                    x2={layout.playX + layout.playW}
                                    y2={layout.playY + layout.playH * ratio}
                                    stroke="rgba(255,255,255,0.035)"
                                    strokeWidth={0.7}
                                />
                            );
                        })}
                    </>
                ) : null}

                {(() => {
                    const diamonds = getDiamondPoints(orientation, layout);
                    return (
                        <>
                            {diamonds.longSide.map((point) => (
                                <Circle key={`long-diamond-${point.x}-${point.y}`} cx={point.x} cy={point.y} r={1.0} fill="#f8fafc" opacity={0.94} />
                            ))}
                            {diamonds.shortSide.map((point) => (
                                <Circle key={`short-diamond-${point.x}-${point.y}`} cx={point.x} cy={point.y} r={1.0} fill="#f8fafc" opacity={0.94} />
                            ))}
                            {diamonds.corners.map((point) => (
                                <Circle key={`corner-diamond-${point.x}-${point.y}`} cx={point.x} cy={point.y} r={1.0} fill="#f8fafc" opacity={0.94} />
                            ))}
                        </>
                    );
                })()}

                {aim ? (
                    <>
                        {(() => {
                            const from = mapPoint(aim.from, orientation, layout);
                            const to = mapPoint(aim.to, orientation, layout);
                            const aimColor = aim.color ?? '#fbbf24';
                            return (
                                <>
                                    <Line
                                        x1={from.x}
                                        y1={from.y}
                                        x2={to.x}
                                        y2={to.y}
                                        stroke="rgba(255,255,255,0.16)"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                    />
                                    <Line
                                        x1={from.x}
                                        y1={from.y}
                                        x2={to.x}
                                        y2={to.y}
                                        stroke={aimColor}
                                        strokeWidth={1.2}
                                        strokeLinecap="round"
                                        strokeDasharray="3 6"
                                    />
                                    <Circle cx={to.x} cy={to.y} r={2.0} fill={aimColor} />
                                </>
                            );
                        })()}
                    </>
                ) : null}

                {showPath && derivedPaths.length > 0
                    ? derivedPaths.map((trajectory: TrajectoryPath) => {
                          if (trajectory.points.length < 2) return null;
                          const pathStroke = trajectory.color ?? '#f8fafc';
                          const pathWidth = trajectory.width ?? 2;
                          const pathOpacity = trajectory.opacity ?? 1;

                          return (
                              <G key={trajectory.id} opacity={pathOpacity}>
                                  <Polyline
                                      points={linePoints(trajectory.points, orientation, layout)}
                                      fill="none"
                                      stroke="rgba(255,255,255,0.14)"
                                      strokeWidth={pathWidth + 2.0}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                  />
                                  <Polyline
                                      points={linePoints(trajectory.points, orientation, layout)}
                                      fill="none"
                                      stroke={pathStroke}
                                      strokeWidth={pathWidth}
                                      strokeDasharray={trajectory.dash ? trajectory.dash.join(' ') : undefined}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                  />
                                  {trajectory.points.slice(1, -1).map((point: Point2D, index: number) => {
                                      const mapped = mapPoint(point, orientation, layout);
                                      return <Circle key={`${trajectory.id}-bounce-${index}-${mapped.x}-${mapped.y}`} cx={mapped.x} cy={mapped.y} r={1.5} fill={pathStroke} opacity={0.9} />;
                                  })}
                              </G>
                          );
                      })
                    : null}

                {diamondLabels && diamondLabels.length > 0 && (
                    <G opacity={0.95}>
                        {diamondLabels.map((lbl, idx) => {
                            const mapped = mapPoint({ x: lbl.x, y: lbl.y }, orientation, layout);
                            const textColor = lbl.color ?? '#38bdf8';
                            const bg = lbl.bgColor ?? 'rgba(15, 23, 42, 0.9)';
                            return (
                                <G key={`dl-${idx}-${lbl.x}-${lbl.y}`}>
                                    <Circle
                                        cx={mapped.x}
                                        cy={mapped.y}
                                        r={3.8}
                                        fill={bg}
                                        stroke={textColor}
                                        strokeWidth={0.5}
                                    />
                                    <SvgText
                                        x={mapped.x}
                                        y={mapped.y + 1.4}
                                        fontSize={3.2}
                                        fontWeight="bold"
                                        fill={textColor}
                                        textAnchor="middle"
                                    >
                                        {lbl.text}
                                    </SvgText>
                                </G>
                            );
                        })}
                    </G>
                )}

                {/* Canonical Diamond Pins (Teardrop Pins matching numeración.png) */}
                {diamondPins && diamondPins.length > 0 && (
                    <G opacity={0.98}>
                        {diamondPins.map((pin, idx) => {
                            const mapped = mapPoint({ x: pin.x, y: pin.y }, orientation, layout);
                            return (
                                <DiamondPinMarker
                                    key={`pin-${idx}-${pin.role}-${pin.label}-${pin.x}-${pin.y}`}
                                    x={mapped.x}
                                    y={mapped.y}
                                    label={pin.label}
                                    pinColor={pin.pinColor}
                                    pinDirection={pin.pinDirection}
                                    isSelected={pin.isSelected}
                                    role={pin.role}
                                />
                            );
                        })}
                    </G>
                )}

                {balls.map((ball) => {
                    const mapped = mapPoint({ x: ball.x, y: ball.y }, orientation, layout);
                    const gradientId = ball.id === 'white' ? `${uid}-ballWhite` : ball.id === 'yellow' ? `${uid}-ballYellow` : `${uid}-ballRed`;
                    return (
                        <G key={ball.id}>
                            <Circle cx={mapped.x + 0.4} cy={mapped.y + 0.4} r={3.075} fill="rgba(0,0,0,0.25)" />
                            <Circle cx={mapped.x} cy={mapped.y} r={3.075} fill={`url(#${gradientId})`} stroke={ball.border} strokeWidth={0.4} />
                            <Circle cx={mapped.x - 1} cy={mapped.y - 1} r={1.2} fill="rgba(255,255,255,0.85)" />
                            <Circle cx={mapped.x - 0.8} cy={mapped.y - 0.8} r={0.7} fill="rgba(255,255,255,0.95)" />
                        </G>
                    );
                })}
            </Svg>
        </View>
    );
}

export const BilliardsTableThumbnail = memo(BilliardsTableThumbnailBase);

const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
    },
});
