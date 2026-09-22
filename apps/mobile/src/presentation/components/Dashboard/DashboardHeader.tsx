import { StyleSheet, Text, View } from 'react-native';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface DashboardHeaderProps {
  userName?: string;
  subtitle: string;
}

export function DashboardHeader({ userName, subtitle }: DashboardHeaderProps) {
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : 'Dashboard';

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      gap: 4,
    },
    greeting: {
      fontSize: 26,
      fontWeight: '800',
      color: palette.text,
    },
    subtitle: {
      fontSize: 14,
      color: palette.muted,
    },
  });
