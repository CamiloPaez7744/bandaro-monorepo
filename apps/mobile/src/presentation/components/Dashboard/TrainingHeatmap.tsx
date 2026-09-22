import { StyleSheet, Text, View } from 'react-native';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import type { HeatmapDay } from './mockData';

interface TrainingHeatmapProps {
  data: HeatmapDay[];
  lessLabel?: string;
  moreLabel?: string;
}

const CELL_SIZE = 14;
const CELL_GAP = 3;

function getIntensity(shots: number): number {
  if (shots === 0) return 0;
  if (shots < 12) return 1;
  if (shots < 24) return 2;
  if (shots < 36) return 3;
  return 4;
}

export function TrainingHeatmap({ data, lessLabel = 'Menos', moreLabel = 'Más' }: TrainingHeatmapProps) {
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  const rows: HeatmapDay[][] = [];
  for (let i = 0; i < 7; i++) {
    rows.push(data.filter((_, idx) => idx % 7 === i));
  }

  return (
    <View style={styles.container}>
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>{lessLabel}</Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[styles.legendCell, { backgroundColor: getBgColor(palette, level) }]}
          />
        ))}
        <Text style={styles.legendLabel}>{moreLabel}</Text>
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((day) => {
              const level = getIntensity(day.shots);
              return (
                <View
                  key={day.date}
                  style={[styles.cell, { backgroundColor: getBgColor(palette, level) }]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function getBgColor(palette: ReturnType<typeof getPalette>, level: number): string {
  switch (level) {
    case 0:
      return `${palette.primary}12`;
    case 1:
      return `${palette.primary}30`;
    case 2:
      return `${palette.primary}55`;
    case 3:
      return `${palette.primary}80`;
    case 4:
      return palette.primary;
    default:
      return `${palette.primary}12`;
  }
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      gap: 12,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    legendLabel: {
      fontSize: 10,
      color: palette.muted,
      fontWeight: '600',
      marginHorizontal: 2,
    },
    legendCell: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    grid: {
      gap: CELL_GAP,
    },
    row: {
      flexDirection: 'row',
      gap: CELL_GAP,
    },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderRadius: 2,
    },
  });
