import React, { memo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';

import { useColorScheme } from '@/components/useColorScheme';
import { getPalette, theme } from '@/constants/theme';
import { WILLIE_HOPPE_SPINS, type HoppeSpinEffect } from './billiardsPlaySolver';

interface WillieHoppeClockProps {
  selectedSpin?: number; // -5 .. +7
  onSelectSpin?: (spin: HoppeSpinEffect) => void;
  size?: number;
  readOnly?: boolean;
}

interface ClockItem {
  spinCode: number;
  label: string;
  cx: number;
  cy: number;
  isRed: boolean;
}

const CLOCK_ITEMS: ClockItem[] = [
  { spinCode: 0, label: '0', cx: 100, cy: 30, isRed: true },
  { spinCode: 1, label: '1', cx: 130, cy: 37, isRed: true },
  { spinCode: 2, label: '2', cx: 154, cy: 53, isRed: true },
  { spinCode: 3, label: '3', cx: 167, cy: 77, isRed: true },
  { spinCode: 4, label: '4', cx: 170, cy: 104, isRed: true },
  { spinCode: 5, label: '5', cx: 160, cy: 132, isRed: false },
  { spinCode: 6, label: '6', cx: 140, cy: 155, isRed: false },
  { spinCode: 7, label: '7', cx: 110, cy: 168, isRed: false },
  // Negative / Left quadrant
  { spinCode: -1, label: '-1', cx: 74, cy: 40, isRed: false },
  { spinCode: -2, label: '-2', cx: 72, cy: 68, isRed: false },
  { spinCode: -3, label: '-3', cx: 75, cy: 98, isRed: false },
  { spinCode: -4, label: '-4', cx: 80, cy: 130, isRed: false },
  { spinCode: -5, label: '-5', cx: 86, cy: 158, isRed: false },
];

export const WillieHoppeClock = memo(function WillieHoppeClock({
  selectedSpin = 2,
  onSelectSpin,
  size = 180,
  readOnly = false,
}: WillieHoppeClockProps) {
  const palette = getPalette(useColorScheme());
  const activeSpin = WILLIE_HOPPE_SPINS[selectedSpin] || WILLIE_HOPPE_SPINS[2];

  return (
    <View style={[styles.container, { width: size }]}>
      <View style={[styles.svgWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {/* Main Cue Ball Dial Circle */}
          <Circle
            cx={100}
            cy={100}
            r={88}
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth={3}
          />

          {/* Inner shaded highlight */}
          <Circle
            cx={100}
            cy={100}
            r={86}
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={2}
          />

          {/* Reference Crosshair Axes (Dashed) */}
          <Line
            x1={100}
            y1={16}
            x2={100}
            y2={184}
            stroke="#1e293b"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
          <Line
            x1={16}
            y1={100}
            x2={184}
            y2={100}
            stroke="#1e293b"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
          <Line
            x1={40}
            y1={40}
            x2={160}
            y2={160}
            stroke="#1e293b"
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.7}
          />
          <Line
            x1={40}
            y1={160}
            x2={160}
            y2={40}
            stroke="#1e293b"
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.7}
          />

          {/* Center Pivot Point */}
          <Circle cx={100} cy={100} r={4} fill="#0f172a" />

          {/* Clock Dial Points */}
          {CLOCK_ITEMS.map((item) => {
            const isSelected = item.spinCode === selectedSpin;
            return (
              <G
                key={`hoppe-item-${item.spinCode}`}
                {...(Platform.OS === 'web'
                  ? ({
                      onClick: () => !readOnly && onSelectSpin?.(WILLIE_HOPPE_SPINS[item.spinCode]),
                      style: { cursor: readOnly ? 'default' : 'pointer' },
                    } as any)
                  : ({
                      onPress: () => !readOnly && onSelectSpin?.(WILLIE_HOPPE_SPINS[item.spinCode]),
                    } as any))}
              >
                {/* Chalk tip spot target */}
                <Circle
                  cx={item.cx}
                  cy={item.cy}
                  r={12}
                  fill={isSelected ? '#0284c7' : 'rgba(255, 255, 255, 0.35)'}
                  stroke={isSelected ? '#38bdf8' : 'rgba(0, 0, 0, 0.25)'}
                  strokeWidth={isSelected ? 2.5 : 1}
                />
                <SvgText
                  x={item.cx}
                  y={item.cy + 4.5}
                  fontSize={item.label.length > 1 ? 10 : 12}
                  fontWeight="bold"
                  fill={isSelected ? '#ffffff' : item.isRed ? '#dc2626' : '#0f172a'}
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Selected Effect Details Badge */}
      <View style={[styles.badge, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.badgeHeader}>
          <Text style={[styles.badgeTitle, { color: palette.text }]}>
            {activeSpin.label === '0' ? 'Efecto 0 (Centro)' : `Efecto ${activeSpin.label}`}
          </Text>
          <View style={styles.hourPill}>
            <Text style={styles.hourPillText}>{activeSpin.hour}</Text>
          </View>
        </View>
        <Text style={[styles.badgeDesc, { color: palette.muted }]} numberOfLines={2}>
          {activeSpin.description}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 3,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  hourPill: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hourPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
  },
  badgeDesc: {
    fontSize: 10.5,
    lineHeight: 14,
  },
});
