import { memo, useMemo } from 'react';
import Svg, { G, Text as SvgText, Circle } from 'react-native-svg';

import { DEFAULT_TABLE } from '@bandaro/core';

import { useTablePreferences, type TablePreferences } from './tablePreferences';

type Orientation = 'horizontal' | 'vertical';
type DiamondSide = 'top' | 'bottom' | 'left' | 'right';

export interface NumberAnchor {
    id: string;
    diamondIndex?: number;
    side?: DiamondSide;
    x?: number;
    y?: number;
    value: string;
    color: string;
    variableType: 'arrival' | 'attack' | 'departure' | 'custom';
}

export interface Formula {
    id: string;
    expression: string;
    variables: {
        arrival?: string;
        attack?: string;
        departure?: string;
        custom?: string;
    };
}

interface SystemNumberingOverlayProps {
    orientation?: Orientation;
    tableWidth?: number;
    tableHeight?: number;
    railThickness?: number;
    cushionThickness?: number;
    anchors?: NumberAnchor[];
    formula?: Formula;
    opacity?: number;
    isEditMode?: boolean;
    tablePreferences?: TablePreferences;
}

interface DiamondPosition {
    x: number;
    y: number;
    side: DiamondSide;
    index: number;
}

function getDiamondPositions(
    playX: number,
    playY: number,
    playW: number,
    playH: number,
    railThickness: number,
    hasCorners: boolean = true
): DiamondPosition[] {
    const positions: DiamondPosition[] = [];
    const offset = railThickness * 0.5;

    const longIndices = hasCorners ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7];
    const shortIndices = hasCorners ? [0, 1, 2, 3, 4] : [1, 2, 3];

    // Top diamonds
    for (const i of longIndices) {
        positions.push({
            x: playX + (playW * i) / 8,
            y: playY - offset,
            side: 'top',
            index: i,
        });
    }

    // Bottom diamonds
    for (const i of longIndices) {
        positions.push({
            x: playX + (playW * i) / 8,
            y: playY + playH + offset,
            side: 'bottom',
            index: i,
        });
    }

    // Left diamonds
    for (const i of shortIndices) {
        positions.push({
            x: playX - offset,
            y: playY + (playH * i) / 4,
            side: 'left',
            index: i,
        });
    }

    // Right diamonds
    for (const i of shortIndices) {
        positions.push({
            x: playX + playW + offset,
            y: playY + (playH * i) / 4,
            side: 'right',
            index: i,
        });
    }

    return positions;
}

function SystemNumberingOverlayBase(props: Readonly<SystemNumberingOverlayProps>) {
    const {
        orientation = 'horizontal',
        tableWidth = DEFAULT_TABLE.width,
        tableHeight = DEFAULT_TABLE.height,
        railThickness = DEFAULT_TABLE.railThickness,
        cushionThickness = DEFAULT_TABLE.cushionThickness,
        anchors = [],
        formula,
        opacity = 0.9,
        isEditMode = false,
        tablePreferences: propsPrefs,
    } = props;

    const { preferences: reactivePrefs } = useTablePreferences(propsPrefs);
    const hasCorners = (reactivePrefs?.diamondCount === '9_5' || !reactivePrefs?.diamondCount) && reactivePrefs?.showCornerDiamonds !== false;

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

    const diamondPositions = useMemo(() => {
        return getDiamondPositions(
            layout.playX,
            layout.playY,
            layout.playW,
            layout.playH,
            railThickness,
            hasCorners
        );
    }, [layout, railThickness, hasCorners]);

    const renderedAnchors = useMemo(() => {
        return anchors.map((anchor) => {
            // Free-positioned anchor
            if (anchor.x !== undefined && anchor.y !== undefined) {
                return {
                    ...anchor,
                    x: anchor.x,
                    y: anchor.y,
                    diamond: null,
                };
            }

            // Diamond-anchored
            const diamond = diamondPositions.find(
                (d) => d.side === anchor.side && d.index === anchor.diamondIndex
            );

            if (!diamond) return null;

            // Offset the number further outside the table
            const labelOffset = railThickness * 1.2;
            let labelX = diamond.x;
            let labelY = diamond.y;

            switch (diamond.side) {
                case 'top':
                    labelY -= labelOffset;
                    break;
                case 'bottom':
                    labelY += labelOffset;
                    break;
                case 'left':
                    labelX -= labelOffset;
                    break;
                case 'right':
                    labelX += labelOffset;
                    break;
            }

            return {
                ...anchor,
                x: labelX,
                y: labelY,
                diamond,
            };
        }).filter(Boolean);
    }, [anchors, diamondPositions, railThickness]);

    const formulaText = useMemo(() => {
        if (!formula) return null;

        let text = formula.expression;
        
        // Replace variables with their values
        if (formula.variables.arrival) {
            text = text.replace(/\{arrival\}/g, formula.variables.arrival);
        }
        if (formula.variables.attack) {
            text = text.replace(/\{attack\}/g, formula.variables.attack);
        }
        if (formula.variables.departure) {
            text = text.replace(/\{departure\}/g, formula.variables.departure);
        }
        if (formula.variables.custom) {
            text = text.replace(/\{custom\}/g, formula.variables.custom);
        }

        return text;
    }, [formula]);

    return (
        <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
            <G opacity={opacity}>
                {/* Render anchored numbers */}
                {renderedAnchors.map((anchor: any) => (
                    <G key={anchor.id}>
                        <Circle
                            cx={anchor.x}
                            cy={anchor.y}
                            r={railThickness * 0.6}
                            fill={anchor.color}
                            opacity={0.2}
                        />
                        {isEditMode && (
                            <Circle
                                cx={anchor.x}
                                cy={anchor.y}
                                r={railThickness * 0.7}
                                fill="none"
                                stroke={anchor.color}
                                strokeWidth={0.5}
                                strokeDasharray="2 1"
                                opacity={0.6}
                            />
                        )}
                        <SvgText
                            x={anchor.x}
                            y={anchor.y}
                            fontSize={railThickness * 0.8}
                            fontWeight="bold"
                            fill={anchor.color}
                            textAnchor="middle"
                            alignmentBaseline="middle"
                        >
                            {anchor.value}
                        </SvgText>
                    </G>
                ))}

                {/* Render formula at top-left corner */}
                {formulaText && (
                    <G>
                        <SvgText
                            x={layout.playX - railThickness * 2}
                            y={layout.playY - railThickness * 2.5}
                            fontSize={railThickness * 0.7}
                            fontWeight="600"
                            fill="#ffffff"
                            opacity={0.8}
                        >
                            {formulaText}
                        </SvgText>
                    </G>
                )}
            </G>
        </Svg>
    );
}

export const SystemNumberingOverlay = memo(SystemNumberingOverlayBase);
