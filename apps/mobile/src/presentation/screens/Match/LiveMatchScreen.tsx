import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { container } from '@/src/presentation/container';
import { useMatchLiveMatch } from '@/src/presentation/hooks/useMatchLiveMatch';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CLOCK_MAX = 40;
const RADIUS = 88;
const CIRCLE_SIZE = 192;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function LiveMatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const params = useLocalSearchParams<{ id: string }>();

  const [carambolasPorTiro, setCarambolasPorTiro] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const animatedScaleA = useRef(new Animated.Value(1)).current;
  const animatedScaleB = useRef(new Animated.Value(1)).current;
  const pulseClock = useRef(new Animated.Value(1)).current;

  const { partida, shotClock, isClockPaused, registrar, puedeFinalizar, toggleClockPause, restartClock, deshacerUltimaEntry } =
    useMatchLiveMatch(params.id);

  const onFinalizar = async () => {
    if (!partida) {
      return;
    }

    const result = await container.finalizarMatch.execute(partida.id);
    router.replace({ pathname: '/match/summary', params: { id: result.partida.id } });
  };

  const onRegisterEntry = async (falta = false) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      await registrar(falta ? 0 : carambolasPorTiro, falta);
      setCarambolasPorTiro(0);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('live.errorRegister'));
    }
  };

  const onDeshacer = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    try {
      await deshacerUltimaEntry();
      setCarambolasPorTiro(0);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('live.errorUndo'));
    }
  };

  useEffect(() => {
    if (!partida) {
      return;
    }

    Animated.parallel([
      Animated.spring(animatedScaleA, {
        toValue: partida.turnoActual === 'A' ? 1.04 : 0.96,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(animatedScaleB, {
        toValue: partida.turnoActual === 'B' ? 1.04 : 0.96,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animatedScaleA, animatedScaleB, partida]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseClock, {
        toValue: 1.07,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pulseClock, {
        toValue: 1,
        duration: 280,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulseClock, shotClock]);

  const entradasReverso = useMemo(() => (partida ? [...partida.entradas].reverse() : []), [partida]);
  const estadisticas = useMemo(() => {
    if (!partida) {
      return {
        a: { ga: 0, efectividad: 0 },
        b: { ga: 0, efectividad: 0 },
      };
    }

    const objetivoA = partida.distanciaObjetivoA ?? partida.distanciaObjetivo ?? 20;
    const objetivoB = partida.distanciaObjetivoB ?? partida.distanciaObjetivo ?? 20;

    const entradasA = partida.entradas.filter((entrada) => entrada.jugador === 'A').length;
    const entradasB = partida.entradas.filter((entrada) => entrada.jugador === 'B').length;

    const gaA = entradasA > 0 ? partida.marcadorA / entradasA : 0;
    const gaB = entradasB > 0 ? partida.marcadorB / entradasB : 0;

    const efectividadA = objetivoA > 0 ? (partida.marcadorA / objetivoA) * 100 : 0;
    const efectividadB = objetivoB > 0 ? (partida.marcadorB / objetivoB) * 100 : 0;

    return {
      a: { ga: gaA, efectividad: efectividadA },
      b: { ga: gaB, efectividad: efectividadB },
    };
  }, [partida]);

  if (!partida) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: theme.spacing.md + insets.top,
            paddingBottom: theme.spacing.md + insets.bottom + 24,
          },
        ]}>
        <Text style={styles.title}>{t('live.loading')}</Text>
      </View>
    );
  }

  const objetivoA = partida.distanciaObjetivoA ?? partida.distanciaObjetivo ?? 20;
  const objetivoB = partida.distanciaObjetivoB ?? partida.distanciaObjetivo ?? 20;
  const entradaActual = Math.floor(partida.entradas.length / 2) + 1;
  const progreso = shotClock / CLOCK_MAX;
  const offset = CIRCUMFERENCE * (1 - progreso);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.md + insets.bottom + 24,
        },
      ]}>
      <View style={styles.entryWrap}>
        <Text style={styles.entryChip}>{t('live.entry')}</Text>
        <Text style={styles.entryNumber}>{entradaActual}</Text>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.playerColumn}>
          <Animated.View style={[styles.scoreCard, { transform: [{ scale: animatedScaleA }] }]}>
            <View
              style={[
                styles.sideIndicator,
                styles.sideIndicatorLeft,
                partida.turnoActual === 'A' ? styles.sideIndicatorActive : styles.sideIndicatorInactive,
              ]}
            />
            <Text style={styles.playerActive}>{partida.jugadorA.nombre}</Text>
            <Text style={styles.score}>{partida.marcadorA}</Text>
            <Text style={styles.ballTag}>
              {t('live.ball', { ball: partida.bolaPlayerA === 'BLANCA' ? t('live.ball.white') : t('live.ball.yellow') })}
            </Text>
            <Text style={styles.target}>{t('live.target', { value: objetivoA })}</Text>
            <View style={styles.statsWrap}>
              <Text style={styles.statLine}>
                <Text style={styles.statLabel}>{t('live.avg')}: </Text>
                <Text style={styles.statValue}>{estadisticas.a.ga.toFixed(3)}</Text>
              </Text>
              <Text style={styles.statLine}>
                <Text style={styles.statLabel}>{t('live.effectiveness')}: </Text>
                <Text style={styles.statValue}>{estadisticas.a.efectividad.toFixed(1)}%</Text>
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[styles.sumButton, partida.turnoActual !== 'A' && styles.sumButtonDisabled]}
            disabled={partida.turnoActual !== 'A'}
              onPress={() => setCarambolasPorTiro((prev) => prev + 1)}>
            <Text style={styles.sumIcon}>+</Text>
              <Text style={styles.sumText}>{t('live.turn')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.playerColumn}>
          <Animated.View style={[styles.scoreCard, { transform: [{ scale: animatedScaleB }] }]}>
            <View
              style={[
                styles.sideIndicator,
                styles.sideIndicatorRight,
                partida.turnoActual === 'B' ? styles.sideIndicatorActive : styles.sideIndicatorInactive,
              ]}
            />
            <Text style={styles.playerMuted}>{partida.jugadorB.nombre}</Text>
            <Text style={styles.score}>{partida.marcadorB}</Text>
            <Text style={styles.ballTag}>
              {t('live.ball', { ball: partida.bolaPlayerB === 'BLANCA' ? t('live.ball.white') : t('live.ball.yellow') })}
            </Text>
            <Text style={styles.target}>{t('live.target', { value: objetivoB })}</Text>
            <View style={styles.statsWrap}>
              <Text style={styles.statLine}>
                <Text style={styles.statLabel}>{t('live.avg')}: </Text>
                <Text style={styles.statValue}>{estadisticas.b.ga.toFixed(3)}</Text>
              </Text>
              <Text style={styles.statLine}>
                <Text style={styles.statLabel}>{t('live.effectiveness')}: </Text>
                <Text style={styles.statValue}>{estadisticas.b.efectividad.toFixed(1)}%</Text>
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={[styles.sumButton, partida.turnoActual !== 'B' && styles.sumButtonDisabled]}
            disabled={partida.turnoActual !== 'B'}
              onPress={() => setCarambolasPorTiro((prev) => prev + 1)}>
            <Text style={styles.sumIcon}>+</Text>
              <Text style={styles.sumText}>{t('live.turn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.shotSection}>
        <Animated.View style={{ transform: [{ scale: pulseClock }] }}>
          <View style={styles.clockWrap}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.clockSvg}>
              <Circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} stroke={palette.border} strokeWidth={8} fill="none" />
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={palette.primary}
                strokeWidth={8}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.clockTextWrap}>
              <Text style={styles.clockValue}>{shotClock}</Text>
              <Text style={styles.clockLabel}>{t('live.seconds')}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleClockPause}>
            <Text style={styles.controlButtonText}>{isClockPaused ? t('live.resume') : t('live.pause')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={restartClock}>
            <Text style={styles.controlButtonText}>{t('live.restart')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stepperRow}>
        <Text style={styles.stepperTitle}>{t('live.carambolasPerTurn')}</Text>
        <View style={styles.stepperControls}>
          <Pressable style={styles.stepperBtn} onPress={() => setCarambolasPorTiro((prev) => Math.max(0, prev - 1))}>
            <Text style={styles.stepperBtnText}>-</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{carambolasPorTiro}</Text>
          <Pressable style={styles.stepperBtn} onPress={() => setCarambolasPorTiro((prev) => Math.min(15, prev + 1))}>
            <Text style={styles.stepperBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <TouchableOpacity style={styles.finish} onPress={() => onRegisterEntry(false)}>
        <Text style={styles.finishText}>{t('live.finishTurn')}</Text>
      </TouchableOpacity>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickButton} onPress={onDeshacer}>
          <Text style={styles.quickText}>{t('live.undo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={() => setShowHistory((prev) => !prev)}>
          <Text style={styles.quickText}>{t('live.history')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={() => onRegisterEntry(true)}>
          <Text style={styles.quickText}>{t('live.fault')}</Text>
        </TouchableOpacity>
      </View>

      {showHistory ? (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>{t('live.historyTitle')}</Text>
          {entradasReverso.length === 0 ? (
            <Text style={styles.historyEmpty}>{t('live.historyEmpty')}</Text>
          ) : (
            entradasReverso.map((entrada) => (
              <View key={entrada.numero} style={styles.historyItem}>
                <Text style={styles.historyText}>
                  {t('live.historyItem', {
                    num: entrada.numero,
                    player: entrada.jugador,
                    result: entrada.falta ? t('live.historyFault') : t('live.historyCarambolas', { value: entrada.carambolas }),
                  })}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      <TouchableOpacity disabled={!puedeFinalizar} style={[styles.finalizarMatch, !puedeFinalizar && styles.disabled]} onPress={onFinalizar}>
        <Text style={styles.buttonText}>{t('live.finishMatch')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.background,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
      paddingBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.text,
    },
    entryWrap: {
      alignItems: 'center',
      paddingVertical: 6,
    },
    entryChip: {
      alignSelf: 'center',
      backgroundColor: `${palette.primary}33`,
      color: palette.primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
    },
    entryNumber: {
      marginTop: 6,
      color: palette.text,
      fontSize: 44,
      fontWeight: '900',
    },
    scoreRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    playerColumn: {
      flex: 1,
      gap: 10,
    },
    scoreCard: {
      borderRadius: theme.radius.md,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      position: 'relative',
      overflow: 'hidden',
      minHeight: 132,
      justifyContent: 'center',
    },
    sideIndicator: {
      position: 'absolute',
      top: 0,
      width: 4,
      height: '100%',
    },
    sideIndicatorLeft: {
      left: 0,
    },
    sideIndicatorRight: {
      right: 0,
    },
    sideIndicatorActive: {
      backgroundColor: palette.primary,
    },
    sideIndicatorInactive: {
      backgroundColor: palette.border,
    },
    playerActive: {
      color: palette.primary,
      fontWeight: '700',
      marginBottom: 2,
    },
    playerMuted: {
      color: palette.muted,
      fontWeight: '700',
      marginBottom: 2,
    },
    score: {
      fontSize: 42,
      fontWeight: '900',
      color: palette.text,
      lineHeight: 46,
    },
    target: {
      marginTop: 4,
      color: palette.muted,
      fontWeight: '600',
      fontSize: 12,
    },
    ballTag: {
      marginTop: 2,
      color: palette.primary,
      fontWeight: '700',
      fontSize: 11,
      textTransform: 'uppercase',
    },
    statsWrap: {
      marginTop: 8,
      gap: 2,
    },
    statLine: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    statLabel: {
      color: palette.muted,
      fontWeight: '700',
    },
    statValue: {
      color: palette.text,
      fontWeight: '800',
    },
    sumButton: {
      backgroundColor: palette.primary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      gap: 2,
      boxShadow: `0px 8px 10px ${palette.primary}59`,
      elevation: 8,
    },
    sumButtonDisabled: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      boxShadow: 'none',
      elevation: 0,
    },
    sumIcon: {
      fontSize: 28,
      color: 'white',
      fontWeight: '900',
    },
    sumText: {
      color: 'white',
      fontWeight: '800',
      letterSpacing: 1,
    },
    shotSection: {
      alignItems: 'center',
      gap: 12,
      paddingTop: 4,
    },
    clockWrap: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockSvg: {
      position: 'absolute',
    },
    clockTextWrap: {
      alignItems: 'center',
    },
    clockValue: {
      color: palette.text,
      fontSize: 40,
      fontWeight: '900',
      lineHeight: 42,
    },
    clockLabel: {
      color: palette.primary,
      fontWeight: '800',
      fontSize: 12,
      letterSpacing: 1,
    },
    controlRow: {
      flexDirection: 'row',
      gap: 10,
    },
    controlButton: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
    },
    controlButtonText: {
      color: palette.text,
      fontWeight: '800',
      fontSize: 12,
    },
    stepperRow: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 12,
      gap: 10,
    },
    stepperTitle: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    stepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    stepperBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperBtnText: {
      color: palette.text,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 24,
    },
    stepperValue: {
      minWidth: 30,
      textAlign: 'center',
      color: palette.text,
      fontSize: 24,
      fontWeight: '900',
    },
    finish: {
      backgroundColor: palette.primary,
      borderRadius: theme.radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
      boxShadow: `0px 8px 10px ${palette.primary}59`,
      elevation: 8,
    },
    finishText: {
      color: 'white',
      fontWeight: '800',
      fontSize: 16,
      letterSpacing: 0.8,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickButton: {
      flex: 1,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    quickText: {
      color: palette.primary,
      fontWeight: '800',
      fontSize: 11,
      letterSpacing: 0.6,
    },
    historyCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 12,
      gap: 8,
    },
    historyTitle: {
      color: palette.text,
      fontWeight: '800',
      fontSize: 14,
    },
    historyEmpty: {
      color: palette.muted,
      fontSize: 12,
    },
    historyItem: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: palette.background,
    },
    historyText: {
      color: palette.text,
      fontWeight: '600',
      fontSize: 12,
    },
    finalizarMatch: {
      backgroundColor: '#14532d',
      borderRadius: theme.radius.lg,
      paddingVertical: 13,
      alignItems: 'center',
    },
    disabled: {
      opacity: 0.45,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '700',
      letterSpacing: 0.6,
    },
  });
