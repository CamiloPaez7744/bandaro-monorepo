import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/useAuth';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import type { Partida } from '@/src/domain/entities/Partida';
import { MatchCard } from '@/src/presentation/components/MatchCard';
import { StatChip } from '@/src/presentation/components/StatChip';
import { container } from '@/src/presentation/container';
import { useEstadisticas } from '@/src/presentation/hooks/useEstadisticas';

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
  const { estadisticas } = useEstadisticas();
  const [partidas, setPartidas] = useState<Partida[]>([]);

  const alias = user?.alias?.trim().toLowerCase() ?? '';
  const nombre = user?.nombre?.trim().toLowerCase() ?? '';

  const coincideUsuario = useCallback(
    (nombreJugador: string) => {
      const normalizado = nombreJugador.trim().toLowerCase();
      return normalizado === alias || normalizado === nombre;
    },
    [alias, nombre]
  );

  const partidasDelUsuario = useMemo(() => {
    if (!isAuthenticated || !user) {
      return [] as Partida[];
    }

    return partidas.filter((partida) => {
      return coincideUsuario(partida.jugadorA.nombre) || coincideUsuario(partida.jugadorB.nombre);
    });
  }, [coincideUsuario, isAuthenticated, partidas, user]);

  const estadisticasUsuario = useMemo(() => {
    if (partidasDelUsuario.length === 0) {
      return { promedio: 0, serieMayor: 0 };
    }

    let totalEntradasUsuario = 0;
    let totalCarambolasUsuario = 0;
    let serieMayor = 0;

    partidasDelUsuario.forEach((partida) => {
      const juegaComoA = coincideUsuario(partida.jugadorA.nombre);
      const entradasUsuario = partida.entradas.filter((entrada) => entrada.jugador === (juegaComoA ? 'A' : 'B'));

      totalEntradasUsuario += entradasUsuario.length;
      totalCarambolasUsuario += entradasUsuario.reduce((acc, entrada) => acc + entrada.carambolas, 0);
      const mayorPartida = entradasUsuario.reduce((acc, entrada) => Math.max(acc, entrada.carambolas), 0);
      serieMayor = Math.max(serieMayor, mayorPartida);
    });

    return {
      promedio: totalEntradasUsuario > 0 ? totalCarambolasUsuario / totalEntradasUsuario : 0,
      serieMayor,
    };
  }, [coincideUsuario, partidasDelUsuario]);

  const ultimasPartidas = useMemo(() => partidas.slice(0, 3), [partidas]);

  const dataPromedio = useMemo(() => {
    const source = isAuthenticated && user ? partidasDelUsuario : partidas;
    const finalizadas = source.filter((p) => p.estado === 'FINALIZADA');
    const ordenadas = [...finalizadas].sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
    const ultimasSiete = ordenadas.slice(-7);

    return ultimasSiete.map((partida) => {
      let promedio = 0;

      if (isAuthenticated && user) {
        const juegaComoA = coincideUsuario(partida.jugadorA.nombre);
        const entradasUsuario = partida.entradas.filter((entrada) => entrada.jugador === (juegaComoA ? 'A' : 'B'));
        const carambolasUsuario = entradasUsuario.reduce((acc, entrada) => acc + entrada.carambolas, 0);
        promedio = entradasUsuario.length > 0 ? carambolasUsuario / entradasUsuario.length : 0;
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
  }, [coincideUsuario, isAuthenticated, partidas, partidasDelUsuario, t, user]);

  const chartModel = useMemo(() => {
    if (dataPromedio.length === 0) {
      return { linePath: '', areaPath: '', points: [] as Array<{ x: number; y: number }> };
    }

    const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
    const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;
    const min = Math.min(...dataPromedio.map((d) => d.value));
    const max = Math.max(...dataPromedio.map((d) => d.value));
    const range = max - min;

    const points = dataPromedio.map((item, index) => {
      const x =
        dataPromedio.length === 1
          ? CHART_PADDING + usableWidth / 2
          : CHART_PADDING + (index / (dataPromedio.length - 1)) * usableWidth;
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
  }, [dataPromedio]);

  const promedioActual = dataPromedio.length > 0 ? dataPromedio[dataPromedio.length - 1].value : 0;
  const promedioAnterior = dataPromedio.length > 1 ? dataPromedio[dataPromedio.length - 2].value : 0;
  const variacion =
    promedioAnterior > 0 ? ((promedioActual - promedioAnterior) / promedioAnterior) * 100 : promedioActual > 0 ? 100 : 0;

  useFocusEffect(
    useCallback(() => {
      container.obtenerHistorial.execute().then((items) => setPartidas(items));
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

      <TouchableOpacity style={styles.cta} onPress={() => router.push('/partida/nueva')}>
        <Text style={styles.ctaText}>{t('dashboard.newMatch')}</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <StatChip
          label={isAuthenticated && user ? t('dashboard.stat.personalAvg') : t('dashboard.stat.generalAvg')}
          value={(isAuthenticated && user ? estadisticasUsuario.promedio : estadisticas.promedioGeneral).toFixed(3)}
        />
        <StatChip
          label={t('dashboard.stat.bestRun')}
          value={String(isAuthenticated && user ? estadisticasUsuario.serieMayor : estadisticas.serieMayor)}
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
          {dataPromedio.length === 0 ? (
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
                {dataPromedio.map((item, index) => (
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
        {ultimasPartidas.length === 0 ? (
          <Text style={styles.empty}>{t('dashboard.empty.matches')}</Text>
        ) : (
          ultimasPartidas.map((p) => <MatchCard key={p.id} partida={p} />)
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
      backgroundColor: palette.primary,
      borderRadius: theme.radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ctaText: {
      color: 'white',
      fontWeight: '700',
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
