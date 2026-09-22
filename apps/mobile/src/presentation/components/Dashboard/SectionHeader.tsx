import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  return (
    <View style={styles.row}>
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    textGroup: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.text,
    },
    subtitle: {
      fontSize: 13,
      color: palette.muted,
    },
  });
