import { memo, useMemo } from 'react';
import Svg, { G, Line, Text as SvgText } from 'react-native-svg';

import { DEFAULT_TABLE } from '@bandaro/core';

type Orientation = 'horizontal' | 'vertical';

interface CushionRulerProps {
    orientation?: Orientation;
    tableWidth?: number;
    tableHeight?: number;
    railThickness?: number;
    cushionThickness?: number;
    color?: string;
    opacity?: number;
}

interface TickMark {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    length: number;
    isDiamond: boolean;
    isHalf: boolean;
    label?: string;
}

function generateRulerTicks(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isHorizontal: boolean,
    railThickness: number,
    numSegments: number,
    tickDirection: 'inward' | 'outward'
): TickMark[] {
    const ticks: TickMark[] = [];
    const length = isHorizontal ? endX - startX : endY - startY;
    const subdivisions = numSegments * 10; // 10 subdivisions per segment

    for (let i = 0; i <= subdivisions; i++) {
        const ratio = i / subdivisions;
        const pos = isHorizontal ? startX + length * ratio : startY + length * ratio;
        
        const isDiamond = i % 10 === 0;
        const isHalf = i % 5 === 0 && !isDiamond;
        
        let tickLength: number;
        if (isDiamond) {
            tickLength = railThickness * 0.6;
        } else if (isHalf) {
            tickLength = railThickness * 0.4;
        } else {
            tickLength = railThickness * 0.25;
        }

        let x1: number, y1: number, x2: number, y2: number;
        
        if (isHorizontal) {
            x1 = pos;
            x2 = pos;
            if (tickDirection === 'inward') {
                y1 = startY;
                y2 = startY + tickLength;
            } else {
                y1 = startY - tickLength;
                y2 = startY;
            }
        } else {
            y1 = pos;
            y2 = pos;
            if (tickDirection === 'inward') {
                x1 = startX;
                x2 = startX + tickLength;
            } else {
                x1 = startX - tickLength;
                x2 = startX;
            }
        }

        const tick: TickMark = { x1, y1, x2, y2, length: tickLength, isDiamond, isHalf };
        
        if (isDiamond && i > 0 && i < subdivisions) {
            const diamondNumber = i / 10;
            tick.label = diamondNumber.toString();
        }

        ticks.push(tick);
    }

    return ticks;
}

function CushionRulerBase(props: Readonly<CushionRulerProps>) {
    const {
        orientation = 'horizontal',
        tableWidth = DEFAULT_TABLE.width,
        tableHeight = DEFAULT_TABLE.height,
        railThickness = DEFAULT_TABLE.railThickness,
        cushionThickness = DEFAULT_TABLE.cushionThickness,
        color = '#ffffff',
        opacity = 0.6,
    } = props;

    const layout = useMemo(() => {
        const aspect = orientation === 'horizontal' ? 2 : 0.5;
        const basePlayW = tableWidth;
        const basePlayH = basePlayW / aspect;
        const cushionX = basePlayW + cushionThickness * 2;
        const cushionY = basePlayH + cushionThickness * 2;
        const railW = cushionX + railThickness * 2;
        const railH = cushionY + railThickness * 2;

        return {
            viewBox: { width: railW, height: railH },
            playX: railThickness + cushionThickness,
            playY: railThickness + cushionThickness,
            playW: basePlayW,
            playH: basePlayH,
            railW,
            railH,
        };
    }, [orientation, tableWidth, tableHeight, railThickness, cushionThickness]);

    const rulerTicks = useMemo(() => {
        const ticks: TickMark[] = [];
        
        // Calculate segments based on table geometry
        // Standard billiard table: long sides have 8 segments, short sides have 4 segments
        const longSideSegments = 8;
        const shortSideSegments = 4;

        // Top rail (long side) - marks point inward (downward)
        const topTicks = generateRulerTicks(
            layout.playX,
            layout.playY,
            layout.playX + layout.playW,
            layout.playY,
            true,
            railThickness,
            longSideSegments,
            'outward' // Points up into the rail
        );
        ticks.push(...topTicks);

        // Bottom rail (long side) - marks point inward (upward)
        const bottomTicks = generateRulerTicks(
            layout.playX,
            layout.playY + layout.playH,
            layout.playX + layout.playW,
            layout.playY + layout.playH,
            true,
            railThickness,
            longSideSegments,
            'inward' // Points up into the rail
        );
        ticks.push(...bottomTicks);

        // Left rail (short side) - marks point inward (rightward)
        const leftTicks = generateRulerTicks(
            layout.playX,
            layout.playY,
            layout.playX,
            layout.playY + layout.playH,
            false,
            railThickness,
            shortSideSegments,
            'outward' // Points left into the rail
        );
        ticks.push(...leftTicks);

        // Right rail (short side) - marks point inward (leftward)
        const rightTicks = generateRulerTicks(
            layout.playX + layout.playW,
            layout.playY,
            layout.playX + layout.playW,
            layout.playY + layout.playH,
            false,
            railThickness,
            shortSideSegments,
            'inward' // Points left into the rail
        );
        ticks.push(...rightTicks);

        return ticks;
    }, [layout, railThickness]);

    return (
        <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
            <G opacity={opacity}>
                {rulerTicks.map((tick, index) => (
                    <Line
                        key={`tick-${index}`}
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        stroke={color}
                        strokeWidth={tick.isDiamond ? 1.5 : tick.isHalf ? 1 : 0.5}
                        strokeLinecap="round"
                    />
                ))}
            </G>
        </Svg>
    );
}

export const CushionRuler = memo(CushionRulerBase);
