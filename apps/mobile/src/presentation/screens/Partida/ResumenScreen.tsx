import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { Promedio } from '@/src/domain/value-objects/Promedio';
import { SerieMayor } from '@/src/domain/value-objects/SerieMayor';
import type { ResumenPartida } from '@/types';
import { StatChip } from '@/src/presentation/components/StatChip';
import { container } from '@/src/presentation/container';

const initialResumen: ResumenPartida = {
  promedioGeneral: 0,
  promedioJugadorA: 0,
  promedioJugadorB: 0,
  serieMayorA: 0,
  serieMayorB: 0,
  ganador: 'EMPATE',
};

export function ResumenScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const params = useLocalSearchParams<{ id: string }>();
  const [resumen, setResumen] = useState<ResumenPartida>(initialResumen);
  const [notas, setNotas] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!params.id) {
        return;
      }

      container.obtenerPartida.execute(params.id).then((partida) => {
        if (!partida) {
          return;
        }

        const entradasA = partida.entradas.filter((e) => e.jugador === 'A');
        const entradasB = partida.entradas.filter((e) => e.jugador === 'B');
        const ganador: ResumenPartida['ganador'] =
          partida.marcadorA === partida.marcadorB
            ? 'EMPATE'
            : partida.marcadorA > partida.marcadorB
              ? 'A'
              : 'B';

        setResumen({
          promedioGeneral: Promedio.calcular(partida.marcadorA + partida.marcadorB, partida.entradas.length),
          promedioJugadorA: Promedio.calcular(partida.marcadorA, entradasA.length),
          promedioJugadorB: Promedio.calcular(partida.marcadorB, entradasB.length),
          serieMayorA: SerieMayor.calcular(entradasA.map((e) => e.carambolas)),
          serieMayorB: SerieMayor.calcular(entradasB.map((e) => e.carambolas)),
          ganador,
        });
      });
    }, [params.id])
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.md + insets.bottom + 24,
        },
      ]}>
      <Text style={styles.title}>{t('summary.title')}</Text>
      <Text style={styles.subtitle}>
        {t('summary.winner', { winner: resumen.ganador === 'EMPATE' ? t('summary.winner.draw') : resumen.ganador })}
      </Text>

      <View style={styles.row}>
        <StatChip label={t('summary.avg')} value={resumen.promedioGeneral.toFixed(3)} />
        <StatChip label={t('summary.bestRun')} value={String(Math.max(resumen.serieMayorA, resumen.serieMayorB))} />
      </View>

      <View style={styles.row}>
        <StatChip label={t('summary.avgA')} value={resumen.promedioJugadorA.toFixed(3)} />
        <StatChip label={t('summary.avgB')} value={resumen.promedioJugadorB.toFixed(3)} />
      </View>

      <TextInput
        style={styles.notes}
        multiline
        value={notas}
        onChangeText={setNotas}
        placeholder={t('summary.notesPlaceholder')}
        placeholderTextColor={palette.muted}
      />
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.text,
    },
    subtitle: {
      color: palette.primary,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    notes: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.md,
      backgroundColor: palette.card,
      color: palette.text,
      padding: 12,
      textAlignVertical: 'top',
    },
  });
