import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'primary' | 'accent';
}

export function KpiCard({ icon, label, value, tone = 'primary' }: KpiCardProps) {
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const isAccent = tone === 'accent';

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, isAccent ? styles.iconAccent : styles.iconPrimary]}>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 140,
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconPrimary: {
      backgroundColor: `${palette.primary}20`,
    },
    iconAccent: {
      backgroundColor: `${palette.accent}20`,
    },
    value: {
      color: palette.text,
      fontSize: 22,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    label: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '600',
    },
  });
