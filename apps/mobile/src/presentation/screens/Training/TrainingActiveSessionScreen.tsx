import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IconArrowLeft,
  IconFlame,
  IconPlus,
  IconSparkles,
  IconTrophy,
} from '@tabler/icons-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { getPalette, theme } from '@/constants/theme';
import {
  TrainingPlayTable,
  type TablePoint,
} from '@/src/presentation/components/Training/TrainingPlayTable';
import { RecordHitsOverlay } from '@/src/presentation/components/Training/RecordHitsOverlay';
import {
  getRandomTrainingQuote,
  type TrainingQuote,
} from '@/src/presentation/screens/Training/trainingQuotes';
import { TrainingPositionSelectorModal } from '@/src/presentation/components/Training/TrainingPositionSelectorModal';
import { CameraCaptureModal } from '@/src/presentation/components/Snapshot/CameraCaptureModal';
import { ShotCatalogScreen } from '@/src/presentation/screens/Catalog/ShotCatalogScreen';
import { fetchShotDetail } from '@/src/infrastructure/catalog/catalogApi';
import { adaptCatalogShot, type CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';
import {
  TrainingCelebrationModal,
  type TrainingCelebrationSessionSummary,
} from '@/src/presentation/components/Training/TrainingCelebrationModal';
import {
  getRandomCongratulationQuote,
  type CongratulationQuote,
} from '@/src/presentation/screens/Training/congratulationQuotes';
import { saveTrainingSessionToBackend } from '@/src/infrastructure/training/trainingApi';

export interface PositionData {
  id: string;
  name: string;
  category: string;
  hint?: string;
  difficulty: number;
  white: TablePoint;
  yellow: TablePoint;
  red: TablePoint;
  trajectory?: TablePoint[];
}

const TRAINING_STORAGE_KEY = '@billar/training_sessions';

// Built-in foundational 3-cushion practice positions
const DEFAULT_POSITIONS: PositionData[] = [
  {
    id: 'bricole-50',
    name: 'Bricole Clásico de Banda Corta',
    category: 'Banda Previa',
    hint: 'Ataque al diamante 2.5 de banda larga con 2 puntas de efecto.',
    difficulty: 3,
    white: { x: 71, y: 105 },
    yellow: { x: 213, y: 35 },
    red: { x: 248, y: 105 },
    trajectory: [
      { x: 71, y: 105 },
      { x: 142, y: 138 },
      { x: 279, y: 70 },
      { x: 213, y: 6 },
      { x: 213, y: 35 },
      { x: 248, y: 105 },
    ],
  },
  {
    id: 'pase-bola-caudron',
    name: 'Pase Bola a 3 Bandas Larga-Corta-Larga',
    category: 'Pase Bola',
    hint: 'Grosor 1/2 bola, efecto corrido a las 1:30.',
    difficulty: 4,
    white: { x: 50, y: 70 },
    yellow: { x: 100, y: 70 },
    red: { x: 230, y: 110 },
    trajectory: [
      { x: 50, y: 70 },
      { x: 100, y: 70 },
      { x: 180, y: 6 },
      { x: 278, y: 55 },
      { x: 210, y: 138 },
      { x: 230, y: 110 },
    ],
  },
  {
    id: 'cabaña-tuzul',
    name: 'Cabaña Sistema Tuzul',
    category: 'Cabañas & Rodadas',
    hint: 'Ángulo cerrado con retención de efecto horario.',
    difficulty: 3,
    white: { x: 80, y: 30 },
    yellow: { x: 140, y: 30 },
    red: { x: 60, y: 110 },
    trajectory: [
      { x: 80, y: 30 },
      { x: 140, y: 30 },
      { x: 278, y: 30 },
      { x: 190, y: 138 },
      { x: 6, y: 80 },
      { x: 60, y: 110 },
    ],
  },
];

export function TrainingActiveSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 920;
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette, isWideScreen);

  const params = useLocalSearchParams<{
    shotId?: string;
    customName?: string;
    whiteX?: string;
    whiteY?: string;
    yellowX?: string;
    yellowY?: string;
    redX?: string;
    redY?: string;
  }>();

  // Session State
  const [positions, setPositions] = useState<PositionData[]>(DEFAULT_POSITIONS);
  const [currentPosIndex, setCurrentPosIndex] = useState(0);
  const [targetReps, setTargetReps] = useState(10);
  const [madeHits, setMadeHits] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [quote, setQuote] = useState<TrainingQuote>(getRandomTrainingQuote());

  // Modals
  const [selectorModalVisible, setSelectorModalVisible] = useState(false);
  const [catalogPickerVisible, setCatalogPickerVisible] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [celebrationModalVisible, setCelebrationModalVisible] = useState(false);
  const [celebrationSummary, setCelebrationSummary] = useState<TrainingCelebrationSessionSummary | null>(null);
  const [celebrationQuote, setCelebrationQuote] = useState<CongratulationQuote>(getRandomCongratulationQuote());

  // Cumulative Session Records: positionId -> { target, hits }
  const [sessionResults, setSessionResults] = useState<Record<string, { target: number; hits: number }>>({});

  // Refresh motivational quote on entry or new position
  const refreshQuote = useCallback(() => {
    setQuote(getRandomTrainingQuote());
  }, []);

  // Handle selecting a shot from the interactive Catalog Picker
  const handleSelectCatalogShot = useCallback(
    (shot: CatalogShot) => {
      const newPos: PositionData = {
        id: `catalog-${shot.id}`,
        name: `${shot.categoryName} #${shot.id}`,
        category: shot.categoryName,
        hint: shot.tips || shot.description || 'Ajusta tu efecto y fuerza de acuerdo con los rieles.',
        difficulty: shot.isDifficult ? 4 : 2,
        white: shot.white,
        yellow: shot.yellow,
        red: shot.red,
        trajectory: shot.cueBallTrajectory,
      };

      setPositions((prev) => {
        // If current session only contains the initial default positions, replace them with the user's first choice
        const hasOnlyDefaults =
          prev.length === DEFAULT_POSITIONS.length &&
          prev.every((p, i) => p.id === DEFAULT_POSITIONS[i].id);

        if (hasOnlyDefaults) {
          setCurrentPosIndex(0);
          return [newPos];
        }

        const existingIndex = prev.findIndex((p) => p.id === newPos.id);
        if (existingIndex !== -1) {
          setCurrentPosIndex(existingIndex);
          return prev;
        }

        const updated = [...prev, newPos];
        setCurrentPosIndex(updated.length - 1);
        return updated;
      });

      setMadeHits(0);
      setIsSimulating(false);
      setCatalogPickerVisible(false);
      refreshQuote();
    },
    [refreshQuote]
  );

  // Load external shot if passed via params
  useEffect(() => {
    if (params.shotId) {
      const shotIdNum = parseInt(params.shotId, 10);
      if (!isNaN(shotIdNum)) {
        fetchShotDetail(shotIdNum)
          .then((raw) => {
            const adapted = adaptCatalogShot(raw);
            const catalogPos: PositionData = {
              id: `catalog-${adapted.id}`,
              name: `${adapted.categoryName} #${adapted.id}`,
              category: adapted.categoryName,
              hint: adapted.tips || adapted.description || 'Ajusta tu efecto y fuerza de acuerdo con los rieles.',
              difficulty: adapted.isDifficult ? 4 : 2,
              white: adapted.white,
              yellow: adapted.yellow,
              red: adapted.red,
              trajectory: adapted.cueBallTrajectory,
            };
            setPositions((prev) => {
              const hasOnlyDefaults =
                prev.length === DEFAULT_POSITIONS.length &&
                prev.every((p, i) => p.id === DEFAULT_POSITIONS[i].id);
              if (hasOnlyDefaults) {
                return [catalogPos];
              }
              const filtered = prev.filter((p) => p.id !== catalogPos.id);
              return [catalogPos, ...filtered];
            });
            setCurrentPosIndex(0);
            setMadeHits(0);
          })
          .catch((err) => {
            console.warn('Error loading shotId for training session', err);
          });
      }
    } else if (params.whiteX && params.whiteY) {
      const customPos: PositionData = {
        id: `custom-${Date.now()}`,
        name: params.customName || 'Mesa Calibrada (Foto)',
        category: 'Foto / Mesa Calibrada',
        hint: 'Posición calibrada con visión artificial. Repite los tiros para consolidar tu ejecución y porcentaje de acierto.',
        difficulty: 3,
        white: { x: parseFloat(params.whiteX), y: parseFloat(params.whiteY) },
        yellow: { x: parseFloat(params.yellowX || '142'), y: parseFloat(params.yellowY || '71') },
        red: { x: parseFloat(params.redX || '220'), y: parseFloat(params.redY || '71') },
        trajectory: [],
      };
      setPositions((prev) => {
        const hasOnlyDefaults =
          prev.length === DEFAULT_POSITIONS.length &&
          prev.every((p, i) => p.id === DEFAULT_POSITIONS[i].id);

        if (hasOnlyDefaults) {
          return [customPos];
        }
        const exists = prev.some((p) => p.white.x === customPos.white.x && p.white.y === customPos.white.y);
        if (exists) return prev;
        return [customPos, ...prev];
      });
      setCurrentPosIndex(0);
      setMadeHits(0);
    }
  }, [params.shotId, params.whiteX, params.whiteY, params.yellowX, params.yellowY, params.redX, params.redY, params.customName]);

  const currentPos = positions[currentPosIndex] || DEFAULT_POSITIONS[0];

  const handleToggleSolution = () => {
    setIsSimulating((prev) => !prev);
  };

  const handleResetPosition = () => {
    setIsSimulating(false);
  };

  const handleNextPosition = () => {
    // Save results of current position
    setSessionResults((prev) => ({
      ...prev,
      [currentPos.id]: { target: targetReps, hits: madeHits },
    }));

    if (currentPosIndex < positions.length - 1) {
      setCurrentPosIndex((prev) => prev + 1);
      setMadeHits(0);
      setIsSimulating(false);
      refreshQuote();
    } else {
      // If reached the end of queue, offer finish or wrap
      handleFinishSession();
    }
  };

  const saveSessionToStorage = async (record: any) => {
    try {
      const raw = await AsyncStorage.getItem(TRAINING_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(record);
      await AsyncStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving training session record to storage:', e);
    }
  };

  const handleFinishSession = async () => {
    // Include current position if not yet recorded
    const finalResults = {
      ...sessionResults,
      [currentPos.id]: { target: targetReps, hits: madeHits },
    };

    let totalTarget = 0;
    let totalHits = 0;
    Object.values(finalResults).forEach((res) => {
      totalTarget += res.target;
      totalHits += res.hits;
    });

    const finalPct = totalTarget > 0 ? Math.round((totalHits / totalTarget) * 100) : 0;

    const sessionRecord = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString(),
      positionsCount: Object.keys(finalResults).length,
      totalTarget,
      totalHits,
      accuracy: finalPct,
      positions: Object.entries(finalResults).map(([id, val]) => {
        const found = positions.find((p) => p.id === id);
        return {
          id,
          name: found?.name || id,
          category: found?.category || 'Entrenamiento',
          target: val.target,
          hits: val.hits,
          accuracy: val.target > 0 ? Math.round((val.hits / val.target) * 100) : 0,
        };
      }),
    };

    // 1. Save to local device storage (AsyncStorage)
    await saveSessionToStorage(sessionRecord);

    // 2. Persist to backend PostgreSQL API
    let backendSaved = false;
    try {
      const backendRes = await saveTrainingSessionToBackend({
        id: sessionRecord.id,
        totalTarget: sessionRecord.totalTarget,
        totalHits: sessionRecord.totalHits,
        accuracy: sessionRecord.accuracy,
        positionsCount: sessionRecord.positionsCount,
        positions: sessionRecord.positions,
      });
      backendSaved = backendRes.success;
    } catch (e) {
      console.warn('Could not sync training session to backend:', e);
    }

    // 3. Display celebratory trophy modal with randomized congratulatory message
    setCelebrationSummary({
      ...sessionRecord,
      savedToBackend: backendSaved,
    });
    setCelebrationQuote(getRandomCongratulationQuote());
    setCelebrationModalVisible(true);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContainer,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.xl + insets.bottom + 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.maxWidthWrap}>
        {/* Top Header & Session Progress Bar */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityLabel="Volver"
            >
              <IconArrowLeft size={20} color={palette.text} />
            </TouchableOpacity>

            <View style={styles.sessionTitleCol}>
              <Text style={styles.sessionTitle}>SESIÓN DE ENTRENAMIENTO</Text>
              <Text style={styles.sessionSubtitle}>
                Jugada {currentPosIndex + 1} de {positions.length}
              </Text>
            </View>

            <View style={styles.sessionBadge}>
              <IconFlame size={15} color={palette.primary} />
              <Text style={styles.sessionBadgeText}>SERIE ACTIVA</Text>
            </View>
          </View>

          {/* Session Progress Rail */}
          <View style={styles.progressRail}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentPosIndex + 1) / positions.length) * 100}%`,
                },
              ]}
            />
          </View>

          {/* Positions Pill Selector & Add Button */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsScrollContainer}
          >
            {positions.map((pos, idx) => {
              const isSelected = idx === currentPosIndex;
              const hasRecorded = sessionResults[pos.id];
              return (
                <TouchableOpacity
                  key={pos.id}
                  style={[
                    styles.positionPill,
                    isSelected && styles.positionPillSelected,
                  ]}
                  onPress={() => {
                    setCurrentPosIndex(idx);
                    setMadeHits(hasRecorded ? hasRecorded.hits : 0);
                    setIsSimulating(false);
                  }}
                >
                  <Text
                    style={[
                      styles.positionPillText,
                      isSelected && styles.positionPillTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {idx + 1}. {pos.category}
                  </Text>
                  {hasRecorded ? (
                    <View style={styles.pillHitDot} />
                  ) : null}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.addPositionPill}
              onPress={() => setSelectorModalVisible(true)}
            >
              <IconPlus size={14} color={palette.primary} />
              <Text style={styles.addPositionPillText}>Nueva Jugada</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Responsive Body Row (2-column workstation on desktop web, stacked on mobile) */}
        <View style={styles.bodyRow}>
          {/* Left Column: Tactical Info, Billiard Table, and Motivational Quote */}
          <View style={styles.leftColumn}>
            {/* Position Info Bar */}
            <View style={styles.positionInfoBar}>
              <View style={styles.positionTitleRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{currentPos.category}</Text>
                </View>
                <Text style={styles.positionName}>{currentPos.name}</Text>
              </View>
              {currentPos.hint && (
                <Text style={styles.positionHint}>{currentPos.hint}</Text>
              )}
            </View>

            {/* 2:1 Carom Billiard Table */}
            <View style={styles.tableWrapper}>
              <TrainingPlayTable
                whiteBall={currentPos.white}
                yellowBall={currentPos.yellow}
                redBall={currentPos.red}
                trajectory={currentPos.trajectory}
                isSimulating={isSimulating}
                onSimulationEnd={() => setIsSimulating(false)}
              />
            </View>

            {/* Motivational Coaching Quote Card */}
            <View style={styles.quoteCard}>
              <View style={styles.quoteIconWrap}>
                <IconSparkles size={18} color={palette.primary} />
              </View>
              <View style={styles.quoteTextWrap}>
                <Text style={styles.quoteBody}>"{quote.text}"</Text>
                {quote.author && (
                  <Text style={styles.quoteAuthor}>— {quote.author}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Right Column: Record Hits Overlay & Actions */}
          <View style={styles.rightColumn}>
            <RecordHitsOverlay
              targetReps={targetReps}
              madeHits={madeHits}
              difficulty={currentPos.difficulty}
              isSimulating={isSimulating}
              onTargetRepsChange={setTargetReps}
              onMadeHitsChange={setMadeHits}
              onToggleSolution={handleToggleSolution}
              onResetPosition={handleResetPosition}
              onNextPosition={handleNextPosition}
              onFinishSession={handleFinishSession}
              isLastPosition={currentPosIndex === positions.length - 1}
            />
          </View>
        </View>
      </View>

      {/* Position Selector Modal */}
      <TrainingPositionSelectorModal
        visible={selectorModalVisible}
        onClose={() => setSelectorModalVisible(false)}
        onSelectCatalog={() => {
          setSelectorModalVisible(false);
          setCatalogPickerVisible(true);
        }}
        onOpenSimulator={() => {
          setSelectorModalVisible(false);
          router.push('/training/simulate');
        }}
        onCapturePhoto={() => {
          setSelectorModalVisible(false);
          setCameraModalVisible(true);
        }}
        quote={quote.text}
      />

      {/* Interactive Catalog Picker Modal */}
      <Modal
        visible={catalogPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCatalogPickerVisible(false)}
      >
        <ShotCatalogScreen
          mode="picker"
          onSelectShot={handleSelectCatalogShot}
          onClosePicker={() => setCatalogPickerVisible(false)}
        />
      </Modal>

      {/* Camera Capture & Calibration Studio Modal */}
      <CameraCaptureModal
        visible={cameraModalVisible}
        onClose={() => setCameraModalVisible(false)}
        onSelectPosition={(pos) => {
          const newPos: PositionData = {
            id: `snapshot-${Date.now()}`,
            name: pos.name || 'Posición Capturada',
            category: 'Captura / YouTube',
            hint: 'Posición extraída y calibrada con visión por computadora.',
            difficulty: 3,
            white: pos.white,
            yellow: pos.yellow,
            red: pos.red,
          };
          setPositions((prev) => {
            const next = [...prev, newPos];
            setCurrentPosIndex(next.length - 1);
            return next;
          });
          setMadeHits(0);
          setSessionResults((prev) => ({
            ...prev,
            [newPos.id]: { target: targetReps, hits: 0 },
          }));
        }}
      />

      {/* Session Complete Celebration Trophy Modal */}
      <TrainingCelebrationModal
        visible={celebrationModalVisible}
        session={celebrationSummary}
        quote={celebrationQuote}
        onClose={() => {
          setCelebrationModalVisible(false);
          router.replace('/training');
        }}
        onNewSession={() => {
          setCelebrationModalVisible(false);
          setPositions(DEFAULT_POSITIONS);
          setCurrentPosIndex(0);
          setMadeHits(0);
          setSessionResults({});
          refreshQuote();
        }}
      />
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>, isWideScreen: boolean) =>
  StyleSheet.create({
    scrollContainer: {
      backgroundColor: palette.background,
      minHeight: '100%',
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
    },
    maxWidthWrap: {
      width: '100%',
      maxWidth: isWideScreen ? 1160 : 720,
      gap: 14,
    },
    bodyRow: {
      flexDirection: isWideScreen ? 'row' : 'column',
      gap: 18,
      alignItems: 'flex-start',
    },
    leftColumn: {
      flex: isWideScreen ? 1.35 : undefined,
      width: '100%',
      gap: 14,
    },
    rightColumn: {
      flex: isWideScreen ? 1 : undefined,
      width: '100%',
      gap: 14,
    },
    header: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 12,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.md,
      backgroundColor: palette.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionTitleCol: {
      flex: 1,
      marginHorizontal: 12,
    },
    sessionTitle: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: palette.muted,
      textTransform: 'uppercase',
    },
    sessionSubtitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.text,
      marginTop: 2,
    },
    sessionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: `${palette.primary}18`,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: `${palette.primary}30`,
    },
    sessionBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.primary,
      letterSpacing: 0.4,
    },
    progressRail: {
      height: 5,
      backgroundColor: palette.surfaceLow,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: palette.primary,
      borderRadius: 3,
    },
    pillsScrollContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 4,
    },
    positionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.sm,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
    },
    positionPillSelected: {
      backgroundColor: `${palette.primary}22`,
      borderColor: palette.primary,
    },
    positionPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.muted,
    },
    positionPillTextSelected: {
      color: palette.primary,
      fontWeight: '700',
    },
    pillHitDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: palette.primary,
    },
    addPositionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.sm,
      backgroundColor: `${palette.primary}12`,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: `${palette.primary}40`,
    },
    addPositionPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.primary,
    },
    quoteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: `${palette.primary}10`,
      borderRadius: theme.radius.md,
      padding: 12,
      borderLeftWidth: 3.5,
      borderLeftColor: palette.primary,
    },
    quoteIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${palette.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quoteTextWrap: {
      flex: 1,
    },
    quoteBody: {
      fontSize: 13,
      fontStyle: 'italic',
      fontWeight: '600',
      color: palette.text,
      lineHeight: 18,
    },
    quoteAuthor: {
      fontSize: 11,
      color: palette.muted,
      marginTop: 2,
    },
    positionInfoBar: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 6,
    },
    positionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryBadge: {
      backgroundColor: `${palette.primary}18`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: `${palette.primary}33`,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: '800',
      color: palette.primary,
      textTransform: 'uppercase',
    },
    positionName: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.text,
      flexShrink: 1,
    },
    positionHint: {
      fontSize: 13,
      color: palette.muted,
      lineHeight: 18,
    },
    tableWrapper: {
      width: '100%',
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      ...Platform.select({
        web: {
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        },
        default: {
          elevation: 6,
        },
      }),
    },
  });
