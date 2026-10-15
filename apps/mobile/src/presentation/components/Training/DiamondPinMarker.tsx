import React, { memo } from 'react';
import { G, Path, Circle, Text as SvgText } from 'react-native-svg';

export interface DiamondPinMarkerProps {
    x: number;
    y: number;
    label: string;
    pinColor: string; // e.g. '#facc15' (salida) | '#ef4444' (ataque) | '#10b981' (llegada)
    pinDirection: 'down' | 'up' | 'left' | 'right';
    isSelected?: boolean;
    scale?: number;
    role?: 'departure' | 'attack' | 'arrival_3rd' | 'arrival_4th';
}

function DiamondPinMarkerBase({
    x,
    y,
    label,
    pinColor,
    pinDirection,
    isSelected = false,
    scale = 1.0,
    role,
}: DiamondPinMarkerProps) {
    // Generate teardrop path and text positioning based on direction
    let pathD = '';
    let bulbX = 0;
    let bulbY = 0;
    let textYOffset = 0;

    switch (pinDirection) {
        case 'down':
            // Tip at (0, 0) pointing DOWN into top rail. Bulb is above at y = -9
            pathD = 'M 0,0 C -2.2,-2.5 -5,-5.5 -5,-9.5 A 5,5 0 1,1 5,-9.5 C 5,-5.5 2.2,-2.5 0,0 Z';
            bulbX = 0;
            bulbY = -9.5;
            textYOffset = 1.3;
            break;
        case 'up':
            // Tip at (0, 0) pointing UP into bottom rail. Bulb is below at y = 9
            pathD = 'M 0,0 C -2.2,2.5 -5,5.5 -5,9.5 A 5,5 0 1,0 5,9.5 C 5,5.5 2.2,2.5 0,0 Z';
            bulbX = 0;
            bulbY = 9.5;
            textYOffset = 1.3;
            break;
        case 'right':
            // Tip at (0, 0) pointing RIGHT into left rail. Bulb is at left x = -9
            pathD = 'M 0,0 C -2.5,-2.2 -5.5,-5 -9.5,-5 A 5,5 0 1,0 -9.5,5 C -5.5,5 -2.5,2.2 0,0 Z';
            bulbX = -9.5;
            bulbY = 0;
            textYOffset = 1.3;
            break;
        case 'left':
            // Tip at (0, 0) pointing LEFT into right rail. Bulb is at right x = 9
            pathD = 'M 0,0 C 2.5,-2.2 5.5,-5 9.5,-5 A 5,5 0 1,1 9.5,5 C 5.5,5 2.5,2.2 0,0 Z';
            bulbX = 9.5;
            bulbY = 0;
            textYOffset = 1.3;
            break;
    }

    const strokeColor = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
    const strokeWidth = isSelected ? 1.0 : 0.65;
    const bulbRadius = 3.8;
    const fontSize = label.length > 2 ? 3.0 : 3.6;

    return (
        <G
            transform={`translate(${x}, ${y}) scale(${scale})`}
            opacity={isSelected ? 1 : 0.96}
        >
            {/* Outer Drop Shadow */}
            <Path
                d={pathD}
                fill="rgba(0, 0, 0, 0.55)"
                transform="translate(0.6, 0.8)"
            />

            {/* Teardrop Pin Body */}
            <Path
                d={pathD}
                fill={pinColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />

            {/* Inner Dark Badge Background for High Contrast */}
            <Circle
                cx={bulbX}
                cy={bulbY}
                r={bulbRadius}
                fill="#070a12"
                stroke={isSelected ? '#ffffff' : pinColor}
                strokeWidth={0.6}
            />

            {/* Diamond Value Text - Bold & Legible */}
            <SvgText
                x={bulbX}
                y={bulbY + textYOffset}
                fontSize={fontSize}
                fontWeight="900"
                fill="#ffffff"
                textAnchor="middle"
            >
                {label}
            </SvgText>
        </G>
    );
}

export const DiamondPinMarker = memo(DiamondPinMarkerBase);
