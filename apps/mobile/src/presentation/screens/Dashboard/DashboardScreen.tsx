import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/useAuth';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import type { Match } from '@/src/domain/entities/Match';
import { MatchCard } from '@/src/presentation/components/MatchCard';
import { StatChip } from '@/src/presentation/components/StatChip';
import { container } from '@/src/presentation/container';
import { useStatistics } from '@/src/presentation/hooks/useStatistics';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const CHART_PADDING = 16;

function diaCorto(fechaISO: string, t: ReturnType<typeof useI18n>['t']) {
  const dias = [
    t('dashboard.day.sun'),
    t('dashboard.day.mon'),
    t('dashboard.day.tue'),
    t('dashboard.day.wed'),
    t('dashboard.day.thu'),
    t('dashboard.day.fri'),
    t('dashboard.day.sat'),
  ];
  const date = new Date(fechaISO);
  return Number.isNaN(date.getTime()) ? '-' : dias[date.getDay()];
}

export function DashboardScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const { estadisticas } = useStatistics();
  const [partidas, setMatchs] = useState<Match[]>([]);

  const alias = user?.alias?.trim().toLowerCase() ?? '';
  const nombre = user?.nombre?.trim().toLowerCase() ?? '';

  const coincideUser = useCallback(
    (nombrePlayer: string) => {
      const normalizado = nombrePlayer.trim().toLowerCase();
      return normalizado === alias || normalizado === nombre;
    },
    [alias, nombre]
  );

  const partidasDelUser = useMemo(() => {
    if (!isAuthenticated || !user) {
      return [] as Match[];
    }

    return partidas.filter((partida) => {
      return coincideUser(partida.jugadorA.nombre) || coincideUser(partida.jugadorB.nombre);
    });
  }, [coincideUser, isAuthenticated, partidas, user]);

  const estadisticasUser = useMemo(() => {
    if (partidasDelUser.length === 0) {
      return { promedio: 0, serieMayor: 0 };
    }

    let totalEntrysUser = 0;
    let totalCarambolasUser = 0;
    let serieMayor = 0;

    partidasDelUser.forEach((partida) => {
      const juegaComoA = coincideUser(partida.jugadorA.nombre);
      const entradasUser = partida.entradas.filter((entrada) => entrada.jugador === (juegaComoA ? 'A' : 'B'));

      totalEntrysUser += entradasUser.length;
      totalCarambolasUser += entradasUser.reduce((acc, entrada) => acc + entrada.carambolas, 0);
      const mayorMatch = entradasUser.reduce((acc, entrada) => Math.max(acc, entrada.carambolas), 0);
      serieMayor = Math.max(serieMayor, mayorMatch);
    });

    return {
      promedio: totalEntrysUser > 0 ? totalCarambolasUser / totalEntrysUser : 0,
      serieMayor,
    };
  }, [coincideUser, partidasDelUser]);

  const ultimasMatchs = useMemo(() => partidas.slice(0, 3), [partidas]);

  const dataAverage = useMemo(() => {
    const source = isAuthenticated && user ? partidasDelUser : partidas;
    const finalizadas = source.filter((p) => p.estado === 'FINALIZADA');
    const ordenadas = [...finalizadas].sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
    const ultimasSiete = ordenadas.slice(-7);

    return ultimasSiete.map((partida) => {
      let promedio = 0;

      if (isAuthenticated && user) {
        const juegaComoA = coincideUser(partida.jugadorA.nombre);
        const entradasUser = partida.entradas.filter((entrada) => entrada.jugador === (juegaComoA ? 'A' : 'B'));
        const carambolasUser = entradasUser.reduce((acc, entrada) => acc + entrada.carambolas, 0);
        promedio = entradasUser.length > 0 ? carambolasUser / entradasUser.length : 0;
      } else {
        const entradas = partida.entradas.length;
        const carambolas = partida.marcadorA + partida.marcadorB;
        promedio = entradas > 0 ? carambolas / entradas : 0;
      }

      return {
        label: diaCorto(partida.fechaInicio, t),
        value: promedio,
      };
    });
  }, [coincideUser, isAuthenticated, partidas, partidasDelUser, t, user]);

  const chartModel = useMemo(() => {
    if (dataAverage.length === 0) {
      return { linePath: '', areaPath: '', points: [] as Array<{ x: number; y: number }> };
    }

    const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
    const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;
    const min = Math.min(...dataAverage.map((d) => d.value));
    const max = Math.max(...dataAverage.map((d) => d.value));
    const range = max - min;

    const points = dataAverage.map((item, index) => {
      const x =
        dataAverage.length === 1
          ? CHART_PADDING + usableWidth / 2
          : CHART_PADDING + (index / (dataAverage.length - 1)) * usableWidth;
      const normalized = range === 0 ? 0.5 : (item.value - min) / range;
      const y = CHART_HEIGHT - CHART_PADDING - normalized * usableHeight;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const first = points[0];
    const last = points[points.length - 1];
    const baselineY = CHART_HEIGHT - CHART_PADDING;
    const areaPath = `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

    return { linePath, areaPath, points };
  }, [dataAverage]);

  const promedioActual = dataAverage.length > 0 ? dataAverage[dataAverage.length - 1].value : 0;
  const promedioAnterior = dataAverage.length > 1 ? dataAverage[dataAverage.length - 2].value : 0;
  const variacion =
    promedioAnterior > 0 ? ((promedioActual - promedioAnterior) / promedioAnterior) * 100 : promedioActual > 0 ? 100 : 0;

  useFocusEffect(
    useCallback(() => {
      container.obtenerHistory.execute().then((items) => setMatchs(items));
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
      <Text style={styles.title}>{t('dashboard.title')}</Text>
      <Text style={styles.subtitle}>
        {isAuthenticated && user ? t('dashboard.subtitle.personal', { alias: user.alias }) : t('dashboard.subtitle.global')}
      </Text>

      <View style={styles.ctaRow}>
        <TouchableOpacity style={styles.cta} onPress={() => router.push('/match/new')}>
          <Text style={styles.ctaText}>{t('dashboard.newMatch')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/training/index')}>
          <Text style={styles.ctaSecondaryText}>{t('dashboard.training')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatChip
          label={isAuthenticated && user ? t('dashboard.stat.personalAvg') : t('dashboard.stat.generalAvg')}
          value={(isAuthenticated && user ? estadisticasUser.promedio : estadisticas.promedioGeneral).toFixed(3)}
        />
        <StatChip
          label={t('dashboard.stat.bestRun')}
          value={String(isAuthenticated && user ? estadisticasUser.serieMayor : estadisticas.serieMayor)}
        />
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>{t('dashboard.chart.title')}</Text>
            <Text style={styles.chartSubtitle}>
              {isAuthenticated && user ? t('dashboard.chart.subtitle.personal') : t('dashboard.chart.subtitle.global')}
            </Text>
          </View>
          <View style={styles.chartSummary}>
            <Text style={styles.chartSummaryValue}>{promedioActual.toFixed(3)}</Text>
            <Text style={[styles.chartSummaryDelta, variacion >= 0 ? styles.up : styles.down]}>
              {variacion >= 0 ? '+' : ''}
              {variacion.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.chartWrap}>
          {dataAverage.length === 0 ? (
            <Text style={styles.empty}>
              {isAuthenticated && user
                ? t('dashboard.chart.empty.personal')
                : t('dashboard.chart.empty.global')}
            </Text>
          ) : (
            <>
              <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
                <Defs>
                  <LinearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={palette.primary} stopOpacity={0.28} />
                    <Stop offset="100%" stopColor={palette.primary} stopOpacity={0.02} />
                  </LinearGradient>
                </Defs>

                <Path d={chartModel.areaPath} fill="url(#avgFill)" />
                <Path d={chartModel.linePath} stroke={palette.primary} strokeWidth={3} fill="none" strokeLinecap="round" />
                {chartModel.points.map((point, index) => (
                  <Circle key={`pt-${index}`} cx={point.x} cy={point.y} r={3.5} fill={palette.primary} />
                ))}
              </Svg>
              <View style={styles.chartLabels}>
                {dataAverage.map((item, index) => (
                  <Text key={`lb-${index}`} style={styles.chartLabelText}>
                    {item.label}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('dashboard.section.recentMatches')}</Text>
      <View style={styles.list}>
        {ultimasMatchs.length === 0 ? (
          <Text style={styles.empty}>{t('dashboard.empty.matches')}</Text>
        ) : (
          ultimasMatchs.map((p) => <MatchCard key={p.id} partida={p} />)
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
      backgroundColor: palette.background,
      minHeight: '100%',
    },
    title: {
      fontSize: 28,
      color: palette.text,
      fontWeight: '800',
    },
    subtitle: {
      color: palette.muted,
    },
    cta: {
      flex: 1,
      backgroundColor: palette.primary,
      borderRadius: theme.radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ctaRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    ctaText: {
      color: 'white',
      fontWeight: '700',
      fontSize: 16,
    },
    ctaSecondary: {
      flex: 1,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.primary,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: `${palette.primary}14`,
    },
    ctaSecondaryText: {
      color: palette.primary,
      fontWeight: '800',
      fontSize: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    chartCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: theme.spacing.md,
      gap: 12,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    chartTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: '800',
    },
    chartSubtitle: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 2,
    },
    chartSummary: {
      alignItems: 'flex-end',
    },
    chartSummaryValue: {
      color: palette.text,
      fontSize: 24,
      fontWeight: '800',
    },
    chartSummaryDelta: {
      fontSize: 12,
      fontWeight: '700',
    },
    up: {
      color: '#22c55e',
    },
    down: {
      color: '#ef4444',
    },
    chartWrap: {
      gap: 8,
    },
    chartLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    chartLabelText: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '700',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
    },
    list: {
      gap: theme.spacing.sm,
    },
    empty: {
      color: palette.muted,
      textAlign: 'center',
      paddingVertical: 14,
    },
  });
