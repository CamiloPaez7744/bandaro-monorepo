import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import type { ProgressPoint } from './mockData';

interface ProgressChartProps {
  data: ProgressPoint[];
  height?: number;
  gradientId?: string;
}

const PADDING = 16;

export function ProgressChart({
  data,
  height = 160,
  gradientId = 'progressFill',
}: ProgressChartProps) {
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sin datos para graficar.</Text>
      </View>
    );
  }

  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min;

  const points = data.map((item, index) => {
    const x =
      data.length === 1
        ? PADDING + (320 - PADDING * 2) / 2
        : PADDING + (index / (data.length - 1)) * (320 - PADDING * 2);
    const normalized = range === 0 ? 0.5 : (item.value - min) / range;
    const y = height - PADDING - normalized * (height - PADDING * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const baselineY = height - PADDING;
  const areaPath = `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

  return (
    <View style={styles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 320 ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={palette.primary} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={palette.primary} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        <Path d={areaPath} fill={`url(#${gradientId})`} />
        <Path
          d={linePath}
          stroke={palette.primary}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <Circle key={`pt-${index}`} cx={point.x} cy={point.y} r={3.5} fill={palette.primary} />
        ))}
      </Svg>

      <View style={styles.labels}>
        {data.map((item, index) => (
          <Text key={`lb-${index}`} style={styles.labelText}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    labels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    labelText: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
    },
    empty: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    emptyText: {
      color: palette.muted,
      textAlign: 'center',
      paddingVertical: 14,
    },
  });
