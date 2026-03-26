import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Match } from '@/src/domain/entities/Match';
import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

interface MatchCardProps {
  partida: Match;
  onPress?: () => void;
}

export function MatchCard({ partida, onPress }: MatchCardProps) {
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const objetivoA = partida.distanciaObjetivoA ?? partida.distanciaObjetivo ?? 20;
  const objetivoB = partida.distanciaObjetivoB ?? partida.distanciaObjetivo ?? 20;

  const content = (
    <>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{partida.jugadorA.nombre} vs {partida.jugadorB.nombre}</Text>
        <Text style={[styles.status, partida.estado === 'FINALIZADA' ? styles.done : styles.live]}>
          {partida.estado === 'FINALIZADA' ? t('match.status.finished') : t('match.status.live')}
        </Text>
      </View>
      <Text style={styles.score}>{partida.marcadorA} - {partida.marcadorB}</Text>
      <Text style={styles.meta}>{t('match.meta', { entries: partida.entradas.length, a: objetivoA, b: objetivoB })}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {content}
    </Pressable>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      gap: 6,
    },
    cardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.995 }],
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      flex: 1,
      fontWeight: '700',
      color: palette.text,
    },
    status: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    live: {
      color: palette.accent,
    },
    done: {
      color: '#22c55e',
    },
    score: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.primary,
    },
    meta: {
      color: palette.muted,
      fontSize: 12,
    },
  });
