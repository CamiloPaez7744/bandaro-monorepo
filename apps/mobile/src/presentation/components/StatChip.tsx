import { StyleSheet, Text, View } from 'react-native';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface StatChipProps {
  label: string;
  value: string;
}

export function StatChip({ label, value }: StatChipProps) {
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: palette.card,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    label: {
      color: palette.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      marginBottom: 4,
      fontWeight: '700',
    },
    value: {
      color: palette.primary,
      fontSize: 22,
      fontWeight: '800',
    },
  });
