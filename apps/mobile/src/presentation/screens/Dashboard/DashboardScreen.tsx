import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/components/useAuth';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import type { Match } from '@/src/domain/entities/Match';
import { MatchCard } from '@/src/presentation/components/MatchCard';
import { StatChip } from '@/src/presentation/components/StatChip';
import { container } from '@/src/presentation/container';
import { useStatistics } from '@/src/presentation/hooks/useStatistics';
import { AnimatedFlameBadge } from '@/src/presentation/components/Catalog/AnimatedFlameBadge';
import { fetchTrainingSessions } from '@/src/infrastructure/training/trainingApi';
import {
  IconArrowRight,
  IconBarbell,
  IconChartBar,
  IconFlame,
  IconRotateClockwise,
  IconSparkles,
  IconTarget,
  IconTrophy,
} from '@/src/presentation/components/icons';

const CHART_WIDTH = 340;
const CHART_HEIGHT = 160;
const CHART_PADDING = 16;
const TRAINING_STORAGE_KEY = '@billar/training_sessions';

export interface TrainingSessionRecord {
  id: string;
  date: string;
  totalTarget: number;
  totalHits: number;
  accuracy: number;
  positionsCount: number;
  positions: Array<{
    id: string;
    name: string;
    category: string;
    target: number;
    hits: number;
    accuracy: number;
  }>;
}

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
  const { t, language } = useI18n();
  const { user, session, isAuthenticated, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const { estadisticas } = useStatistics();

  const [partidas, setMatchs] = useState<Match[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSessionRecord[]>([]);
  const [historyTab, setHistoryTab] = useState<'matches' | 'training'>('matches');

  // Load matches and remote or local training sessions on screen focus
  useFocusEffect(
    useCallback(() => {
      // Refresh user profile from database to get live streak and stats
      refresh?.().catch?.(() => {});

      // Load official matches
      container.obtenerHistory.execute().then((items) => setMatchs(items));

      // Load training sessions: from DB if authenticated, otherwise from local storage
      if (isAuthenticated && user && session?.accessToken) {
        fetchTrainingSessions(session.accessToken, user.id)
          .then((remoteSessions) => {
            if (remoteSessions && Array.isArray(remoteSessions)) {
              setTrainingSessions(remoteSessions);
            } else {
              setTrainingSessions([]);
            }
          })
          .catch(() => {
            loadLocalSessions();
          });
      } else {
        loadLocalSessions();
      }

      function loadLocalSessions() {
        AsyncStorage.getItem(TRAINING_STORAGE_KEY)
          .then((raw) => {
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  setTrainingSessions(parsed);
                }
              } catch {
                // ignore invalid JSON
              }
            }
          })
          .catch(() => {});
      }
    }, [isAuthenticated, user, session, refresh])
  );

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

  // Global training accuracy (from database user profile or sessions)
  const trainingAccuracy = useMemo(() => {
    if (isAuthenticated && user?.accuracyAvg !== undefined && Number(user.accuracyAvg) > 0) {
      return Math.round(Number(user.accuracyAvg));
    }
    if (trainingSessions.length === 0) return 0;
    let totalTarget = 0;
    let totalHits = 0;
    trainingSessions.forEach((s) => {
      totalTarget += s.totalTarget || 0;
      totalHits += s.totalHits || 0;
    });
    return totalTarget > 0 ? Math.round((totalHits / totalTarget) * 100) : 0;
  }, [isAuthenticated, user, trainingSessions]);

  // Streak calculation (pure PostgreSQL database user streak for authenticated users)
  const streakDays = useMemo(() => {
    if (isAuthenticated && user) {
      return typeof user.currentStreak === 'number' ? user.currentStreak : 0;
    }
    // Guest fallback: count consecutive active training days up to today
    if (trainingSessions.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    const dates = new Set(trainingSessions.map((s) => s.date?.split('T')[0]).filter(Boolean));
    if (!dates.has(today)) return 0;
    let count = 0;
    const cur = new Date();
    while (true) {
      const dStr = cur.toISOString().split('T')[0];
      if (dates.has(dStr)) {
        count++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [isAuthenticated, user, trainingSessions]);

  // 7-day weekly activity tracker (Sun to Sat or last 7 days)
  const weeklyActivity = useMemo(() => {
    const today = new Date();
    const days: { label: string; active: boolean; isToday: boolean }[] = [];

    const activeDates = new Set<string>();
    trainingSessions.forEach((s) => {
      if (s.date) activeDates.add(s.date.split('T')[0]);
    });
    partidas.forEach((m) => {
      if (m.fechaInicio) activeDates.add(m.fechaInicio.split('T')[0]);
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const hasActivity = activeDates.has(dateStr);
      const isToday = i === 0;
      const isActive = hasActivity || (isToday && streakDays > 0);

      days.push({
        label: diaCorto(d.toISOString(), t),
        active: isActive,
        isToday,
      });
    }

    return days;
  }, [partidas, streakDays, t, trainingSessions]);

  const dataAverage = useMemo(() => {
    const source = isAuthenticated && user ? partidasDelUser : partidas;
    const finalizadas = source.filter((p) => p.estado === 'FINALIZADA');
    const ordenadas = [...finalizadas].sort(
      (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
    );
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

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.md + insets.bottom + 80,
        },
      ]}
      showsVerticalScrollIndicator={false}>
      {/* Top Welcome & Identity */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('dashboard.title')}</Text>
          <Text style={styles.subtitle}>
            {isAuthenticated && user
              ? t('dashboard.subtitle.personal', { alias: user.alias })
              : t('dashboard.subtitle.global')}
          </Text>
        </View>

        {isAuthenticated && user && (
          <View style={[styles.userBadge, { backgroundColor: `${palette.primary}18`, borderColor: `${palette.primary}44` }]}>
            <IconTrophy size={14} color={palette.primary} />
            <Text style={[styles.userBadgeText, { color: palette.primary }]}>
              {language === 'en' ? 'Pro Level' : 'Nivel Maestro'}
            </Text>
          </View>
        )}
      </View>

      {/* Racha & Constancia Card (Cyber-Billiard Flame & Weekly Tracker) */}
      <View style={[styles.streakCard, { backgroundColor: palette.card, borderColor: '#F59E0B44' }]}>
        <View style={styles.streakHeader}>
          <View style={styles.streakFlameWrap}>
            <AnimatedFlameBadge size={28} />
            <View>
              <Text style={styles.streakDaysNumber}>
                {t('dashboard.streak.days', { count: streakDays })}
              </Text>
              <Text style={[styles.streakLabel, { color: palette.muted }]}>
                {t('dashboard.streak.title')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.smartReviewBtn, { backgroundColor: `${palette.primary}18`, borderColor: palette.primary }]}
            onPress={() => router.push('/training/session')}
            activeOpacity={0.8}>
            <IconTarget size={14} color={palette.primary} />
            <Text style={[styles.smartReviewBtnText, { color: palette.primary }]}>
              {language === 'en' ? 'Train' : 'Entrenar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Day Dots Tracker */}
        <View style={styles.weeklyTrackerRow}>
          {weeklyActivity.map((day, idx) => (
            <View key={idx} style={styles.weekDayCol}>
              <View
                style={[
                  styles.weekDayDot,
                  day.active
                    ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
                    : { backgroundColor: palette.surfaceLow, borderColor: palette.border },
                  day.isToday && { borderWidth: 2, borderColor: palette.primary },
                ]}>
                {day.active && <IconFlame size={12} color="#FFFFFF" strokeWidth={2.5} />}
              </View>
              <Text
                style={[
                  styles.weekDayLabel,
                  { color: day.isToday ? palette.primary : palette.muted },
                  day.isToday && { fontWeight: '800' },
                ]}>
                {day.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Primary CTAs */}
      <View style={styles.ctaRow}>
        <TouchableOpacity style={styles.cta} onPress={() => router.push('/match/new')} activeOpacity={0.85}>
          <IconTrophy size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.ctaText}>{t('dashboard.newMatch')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/training')} activeOpacity={0.85}>
          <IconBarbell size={18} color={palette.primary} strokeWidth={2.2} />
          <Text style={styles.ctaSecondaryText}>{t('dashboard.training')}</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats Chips */}
      <View style={styles.statsRow}>
        <StatChip
          label={isAuthenticated && user ? t('dashboard.stat.personalAvg') : t('dashboard.stat.generalAvg')}
          value={(isAuthenticated && user ? estadisticasUser.promedio : estadisticas.promedioGeneral).toFixed(3)}
        />
        <StatChip
          label={t('dashboard.stat.bestRun')}
          value={String(isAuthenticated && user ? estadisticasUser.serieMayor : estadisticas.serieMayor)}
        />
        <StatChip
          label={t('dashboard.training.accuracy')}
          value={`${trainingAccuracy}%`}
        />
      </View>

      {/* Interactive SVG Average Chart */}
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

      {/* APARTADO DE HISTORIAL INTEGRAL (Partidas Oficiales + Entrenamientos) */}
      <View style={styles.historySection}>
        <View style={styles.historyTabsRow}>
          <Pressable
            style={[
              styles.historyTabBtn,
              historyTab === 'matches'
                ? [styles.historyTabActive, { backgroundColor: palette.primary, borderColor: palette.primary }]
                : [styles.historyTabInactive, { backgroundColor: palette.card, borderColor: palette.border }],
            ]}
            onPress={() => setHistoryTab('matches')}>
            <IconTrophy size={14} color={historyTab === 'matches' ? '#FFFFFF' : palette.muted} />
            <Text
              style={[
                styles.historyTabText,
                historyTab === 'matches' ? styles.historyTabTextActive : { color: palette.muted },
              ]}>
              {t('dashboard.tabs.matches')} ({partidas.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.historyTabBtn,
              historyTab === 'training'
                ? [styles.historyTabActive, { backgroundColor: palette.primary, borderColor: palette.primary }]
                : [styles.historyTabInactive, { backgroundColor: palette.card, borderColor: palette.border }],
            ]}
            onPress={() => setHistoryTab('training')}>
            <IconTarget size={14} color={historyTab === 'training' ? '#FFFFFF' : palette.muted} />
            <Text
              style={[
                styles.historyTabText,
                historyTab === 'training' ? styles.historyTabTextActive : { color: palette.muted },
              ]}>
              {t('dashboard.tabs.training')} ({trainingSessions.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab 1: Official Matches List */}
        {historyTab === 'matches' && (
          <View style={styles.list}>
            {partidas.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={styles.empty}>{t('history.empty')}</Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: palette.primary }]}
                  onPress={() => router.push('/match/new')}>
                  <Text style={styles.emptyActionBtnText}>{t('dashboard.newMatch')}</Text>
                </TouchableOpacity>
              </View>
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
        )}

        {/* Tab 2: Training Sessions History */}
        {historyTab === 'training' && (
          <View style={styles.list}>
            {trainingSessions.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={styles.empty}>{t('dashboard.training.empty')}</Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: palette.primary }]}
                  onPress={() => router.push('/training')}>
                  <Text style={styles.emptyActionBtnText}>{t('dashboard.training')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              trainingSessions.map((session, idx) => {
                const accColor =
                  session.accuracy >= 75
                    ? '#10B981'
                    : session.accuracy >= 50
                    ? '#F59E0B'
                    : '#EF4444';

                const formattedDate = session.date
                  ? new Date(session.date).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : `#${idx + 1}`;

                return (
                  <View
                    key={session.id || idx}
                    style={[styles.trainingSessionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <View style={styles.trainingSessionHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.trainingDate, { color: palette.muted }]}>{formattedDate}</Text>
                        <Text style={[styles.trainingDrillsCount, { color: palette.text }]}>
                          {t('dashboard.training.drills', { count: session.positionsCount || session.positions?.length || 1 })}
                        </Text>
                      </View>

                      {/* Accuracy Badge */}
                      <View style={[styles.accuracyBadge, { backgroundColor: `${accColor}18`, borderColor: `${accColor}66` }]}>
                        <Text style={[styles.accuracyBadgeText, { color: accColor }]}>
                          {session.accuracy}%
                        </Text>
                      </View>
                    </View>

                    {/* Stats details bar */}
                    <View style={[styles.trainingSessionDetails, { backgroundColor: palette.surfaceLow }]}>
                      <View style={styles.detailMetric}>
                        <Text style={[styles.detailLabel, { color: palette.muted }]}>
                          {language === 'en' ? 'Hits' : 'Aciertos'}
                        </Text>
                        <Text style={[styles.detailValue, { color: palette.text }]}>
                          {session.totalHits} / {session.totalTarget}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.repeatSessionBtn}
                        onPress={() => router.push('/training/session')}>
                        <IconRotateClockwise size={14} color={palette.primary} />
                        <Text style={[styles.repeatSessionBtnText, { color: palette.primary }]}>
                          {language === 'en' ? 'Practice' : 'Repetir'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.md,
      gap: 16,
      backgroundColor: palette.background,
      minHeight: '100%',
    },
    topHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      fontSize: 26,
      color: palette.text,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 13,
      marginTop: 2,
    },
    userBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.full,
      borderWidth: 1,
    },
    userBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    streakCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1.5,
      padding: theme.spacing.md,
      gap: 14,
    },
    streakHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    streakFlameWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    streakDaysNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: '#F59E0B',
    },
    streakLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    smartReviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      borderWidth: 1,
    },
    smartReviewBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    weeklyTrackerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 4,
    },
    weekDayCol: {
      alignItems: 'center',
      gap: 6,
    },
    weekDayDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDayLabel: {
      fontSize: 10,
      fontWeight: '600',
    },
    ctaRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    cta: {
      flex: 1,
      backgroundColor: palette.primary,
      borderRadius: theme.radius.md,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    ctaText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    ctaSecondary: {
      flex: 1,
      borderRadius: theme.radius.md,
      borderWidth: 1.2,
      borderColor: palette.primary,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${palette.primary}12`,
    },
    ctaSecondaryText: {
      color: palette.primary,
      fontWeight: '700',
      fontSize: 14,
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
      fontSize: 16,
      fontWeight: '800',
    },
    chartSubtitle: {
      color: palette.muted,
      fontSize: 11,
      marginTop: 2,
    },
    chartSummary: {
      alignItems: 'flex-end',
    },
    chartSummaryValue: {
      color: palette.text,
      fontSize: 22,
      fontWeight: '800',
    },
    chartSummaryDelta: {
      fontSize: 11,
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
    historySection: {
      gap: 12,
      marginTop: 4,
    },
    historyTabsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    historyTabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1,
    },
    historyTabActive: {},
    historyTabInactive: {},
    historyTabText: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    historyTabTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    list: {
      gap: 10,
    },
    emptyBox: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    empty: {
      color: palette.muted,
      textAlign: 'center',
      fontSize: 13,
    },
    emptyActionBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: theme.radius.sm,
    },
    emptyActionBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    trainingSessionCard: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      padding: 12,
      gap: 10,
    },
    trainingSessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    trainingDate: {
      fontSize: 11,
      fontWeight: '600',
    },
    trainingDrillsCount: {
      fontSize: 14,
      fontWeight: '700',
      marginTop: 2,
    },
    accuracyBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radius.full,
      borderWidth: 1,
    },
    accuracyBadgeText: {
      fontSize: 12,
      fontWeight: '800',
    },
    trainingSessionDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radius.sm,
    },
    detailMetric: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailLabel: {
      fontSize: 11,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '700',
    },
    repeatSessionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    repeatSessionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
  });

export default DashboardScreen;
