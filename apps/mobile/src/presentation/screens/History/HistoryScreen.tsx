import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import type { Match } from '@/src/domain/entities/Match';
import { MatchCard } from '@/src/presentation/components/MatchCard';
import { container } from '@/src/presentation/container';

export function HistoryScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const [partidas, setMatchs] = useState<Match[]>([]);

  useFocusEffect(
    useCallback(() => {
      container.obtenerHistory.execute().then(setMatchs);
    }, [])
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.md + insets.bottom + 70,
        },
      ]}>
      <Text style={styles.title}>{t('history.title')}</Text>
      <Text style={styles.subtitle}>{t('history.subtitle')}</Text>
      <View style={styles.list}>
        {partidas.length === 0 ? (
          <Text style={styles.empty}>{t('history.empty')}</Text>
        ) : (
          partidas.map((p) => (
            <MatchCard
              key={p.id}
              partida={p}
              onPress={() => router.push({ pathname: '/match/summary', params: { id: p.id } })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      minHeight: '100%',
      backgroundColor: palette.background,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: palette.text,
    },
    subtitle: {
      color: palette.muted,
    },
    list: {
      gap: theme.spacing.sm,
    },
    empty: {
      color: palette.muted,
      textAlign: 'center',
      paddingVertical: 16,
    },
  });
