import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import type { RadarPoint } from './mockData';

interface RadarChartProps {
  data: RadarPoint[];
  size?: number;
  maxValue?: number;
}

const LEVELS = 5;
const LABEL_OFFSET = 24;

export function RadarChart({ data, size = 260, maxValue = 100 }: RadarChartProps) {
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  const center = size / 2;
  const radius = (size - LABEL_OFFSET * 2) / 2;
  const angleStep = (2 * Math.PI) / data.length;

  function getPoint(index: number, value: number): { x: number; y: number } {
    const angle = angleStep * index - Math.PI / 2;
    const ratio = Math.min(value / maxValue, 1);
    return {
      x: center + radius * ratio * Math.cos(angle),
      y: center + radius * ratio * Math.sin(angle),
    };
  }

  const gridPolygons = Array.from({ length: LEVELS }, (_, level) => {
    const levelValue = ((level + 1) / LEVELS) * maxValue;
    const points = data
      .map((_, i) => getPoint(i, levelValue))
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
    return points;
  });

  const dataPoints = data.map((d, i) => getPoint(i, d.value));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridPolygons.map((points, i) => (
          <Polygon
            key={`grid-${i}`}
            points={points}
            fill="none"
            stroke={palette.border}
            strokeWidth={1}
          />
        ))}

        {data.map((_, i) => {
          const end = getPoint(i, maxValue);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke={palette.border}
              strokeWidth={1}
            />
          );
        })}

        <Polygon
          points={dataPolygon}
          fill={`${palette.primary}30`}
          stroke={palette.primary}
          strokeWidth={2}
        />

        {dataPoints.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill={palette.primary} />
        ))}

        {data.map((d, i) => {
          const labelPoint = getPoint(i, maxValue + 12);
          return (
            <SvgText
              key={`label-${i}`}
              x={labelPoint.x}
              y={labelPoint.y}
              fontSize={11}
              fontWeight="600"
              fill={palette.muted}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {d.metric}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.legendGrid}>
        {data.map((d) => (
          <View key={d.metric} style={styles.legendItem}>
            <Text style={styles.legendLabel}>{d.metric}</Text>
            <Text style={styles.legendValue}>{d.value}</Text>
          </View>
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
      alignItems: 'center',
      gap: 12,
    },
    legendGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 100,
    },
    legendLabel: {
      fontSize: 12,
      color: palette.muted,
    },
    legendValue: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.text,
      fontVariant: ['tabular-nums'],
    },
  });
