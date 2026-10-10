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
  IconBulb,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
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
import { apiFetch } from '@/src/infrastructure/security/cryptoClient';
import {
  TRAINING_ROUTE_LEVELS,
  type RouteNode,
} from '@/src/presentation/screens/Training/trainingRouteData';
import {
  TacticalSolverPanel,
  solveBilliardPosition,
  type TacticalSolution,
  type HoppeSpinEffect,
} from '@/src/presentation/components/Training';

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

// Built-in foundational 3-cushion tournament practice positions (canonical forward carom physics)
const DEFAULT_POSITIONS: PositionData[] = [
  {
    id: 'rodada-1',
    name: 'Rodada Canónica a 3 Bandas (L-C-L)',
    category: 'Rodadas',
    hint: 'Grosor 1/2 bola, efecto a favor a las 2:00. Corrido natural alrededor de la mesa tocando 3 bandas.',
    difficulty: 3,
    white: { x: 50.0, y: 110.0 },
    yellow: { x: 100.0, y: 65.0 },
    red: { x: 230.0, y: 105.0 },
    trajectory: [
      { x: 50.0, y: 110.0 },
      { x: 96.0, y: 68.0 },
      { x: 160.0, y: 4.0 },
      { x: 280.0, y: 55.0 },
      { x: 210.0, y: 138.0 },
      { x: 230.0, y: 105.0 },
    ],
  },
  {
    id: 'cajon-8',
    name: 'Cajón Clásico con Retroceso (C-L-C)',
    category: 'Cajones',
    hint: 'Grosor 1/2 bola con efecto ecuatorial. Salida a banda corta cerrando el cuadro pequeño hacia la bola roja.',
    difficulty: 3,
    white: { x: 95.0, y: 80.0 },
    yellow: { x: 50.0, y: 50.0 },
    red: { x: 75.0, y: 115.0 },
    trajectory: [
      { x: 95.0, y: 80.0 },
      { x: 54.0, y: 52.0 },
      { x: 4.0, y: 35.0 },
      { x: 55.0, y: 4.0 },
      { x: 4.0, y: 95.0 },
      { x: 75.0, y: 115.0 },
    ],
  },
  {
    id: 'bricole-4',
    name: 'Banda Previa a 3 Bandas (Bank Shot)',
    category: 'Banda Previa',
    hint: 'Ataque directo a banda antes de tocar bola. Entrar a la esquina con efecto 2:00 hacia la bola 2 y 3.',
    difficulty: 4,
    white: { x: 130.0, y: 110.0 },
    yellow: { x: 220.0, y: 40.0 },
    red: { x: 245.0, y: 85.0 },
    trajectory: [
      { x: 130.0, y: 110.0 },
      { x: 185.0, y: 4.0 },
      { x: 280.0, y: 32.0 },
      { x: 220.0, y: 40.0 },
      { x: 210.0, y: 138.0 },
      { x: 245.0, y: 85.0 },
    ],
  },
];

const getLocalizedPos = (pos: PositionData, lang: string): { name: string; category: string; hint?: string } => {
  if (lang === 'en') {
    switch (pos.id) {
      case 'rodada-1':
        return {
          name: 'Canonical 3-Cushion Round-the-Table (L-S-L)',
          category: 'Side Spin',
          hint: '6/8 thickness, mid-low contact with 3 tips of spin. Natural curve around 3 cushions.',
        };
      case 'cajon-8':
        return {
          name: 'Classic Short-Box with Draw (S-L-S)',
          category: 'Draw Shots',
          hint: '1/4 thickness with mid-high spin. Quick exit to short rail closing the small box.',
        };
      case 'bricole-4':
        return {
          name: 'Authentic 3-Cushion Bank Shot (Cushion First)',
          category: 'Cushion First',
          hint: 'Direct cushion attack before contact. Corner angle with 2:00 spin to sweep into red.',
        };
      default:
        return {
          name: pos.name,
          category: pos.category,
          hint: pos.hint,
        };
    }
  }
  return {
    name: pos.name,
    category: pos.category,
    hint: pos.hint,
  };
};

function adaptRoutePositionsToSessionPositions(node: RouteNode): PositionData[] {
  return node.positions.map((p, idx) => ({
    id: p.id || `${node.id}-pos-${idx + 1}`,
    name: `${node.title} (${idx + 1}/${node.positions.length})`,
    category: node.category,
    hint: node.coachTip,
    difficulty: 3,
    white: p.white,
    yellow: p.yellow,
    red: p.red,
    trajectory: p.trajectory || [],
  }));
}

export function TrainingActiveSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 920;
  const { t, language } = useI18n();
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
    nodeId?: string;
  }>();

  // Session State
  const [positions, setPositions] = useState<PositionData[]>(DEFAULT_POSITIONS);
  const [activeRouteNode, setActiveRouteNode] = useState<RouteNode | null>(null);
  const [currentPosIndex, setCurrentPosIndex] = useState(0);
  const [targetReps, setTargetReps] = useState(10);
  const [madeHits, setMadeHits] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [quote, setQuote] = useState<TrainingQuote>(getRandomTrainingQuote(language));

  // Modals
  const [selectorModalVisible, setSelectorModalVisible] = useState(false);
  const [catalogPickerVisible, setCatalogPickerVisible] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [celebrationModalVisible, setCelebrationModalVisible] = useState(false);
  const [celebrationSummary, setCelebrationSummary] = useState<TrainingCelebrationSessionSummary | null>(null);
  const [celebrationQuote, setCelebrationQuote] = useState<CongratulationQuote>(getRandomCongratulationQuote(language));

  // Cumulative Session Records: positionId -> { target, hits }
  const [sessionResults, setSessionResults] = useState<Record<string, { target: number; hits: number }>>({});

  // Sync quote when language changes
  useEffect(() => {
    setQuote(getRandomTrainingQuote(language));
  }, [language]);

  // Refresh motivational quote on entry or new position
  const refreshQuote = useCallback(() => {
    setQuote(getRandomTrainingQuote(language));
  }, [language]);

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
    } else if (params.nodeId) {
      let foundNode: RouteNode | null = null;
      for (const lvl of TRAINING_ROUTE_LEVELS) {
        const n = lvl.nodes.find((item) => item.id === params.nodeId);
        if (n) {
          foundNode = n;
          break;
        }
      }
      if (foundNode && foundNode.positions.length > 0) {
        setPositions(adaptRoutePositionsToSessionPositions(foundNode));
        setCurrentPosIndex(0);
        setMadeHits(0);
        setActiveRouteNode(foundNode);
      }
    }
  }, [params.shotId, params.whiteX, params.whiteY, params.yellowX, params.yellowY, params.redX, params.redY, params.customName, params.nodeId]);

  const currentPos = positions[currentPosIndex] || DEFAULT_POSITIONS[0];
  const localizedCurrentPos = getLocalizedPos(currentPos, language);

  const [systemDiamondMode, setSystemDiamondMode] = useState<'none' | 'llk_hoppe' | 'base_50'>('none');
  const [customSolutionTrajectory, setCustomSolutionTrajectory] = useState<TablePoint[] | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  // Reset solution visibility, animation, and custom trajectory when switching position
  useEffect(() => {
    setIsSimulating(false);
    setCustomSolutionTrajectory(null);
    setShowSolution(false);
  }, [currentPosIndex]);

  // Compute tactical solutions for current ball positions
  const tacticalSolutions = useMemo(() => {
    return solveBilliardPosition(
      currentPos.white,
      currentPos.yellow,
      currentPos.red,
      currentPos.trajectory
    );
  }, [currentPos]);

  const [activeSolution, setActiveSolution] = useState<TacticalSolution | null>(null);

  useEffect(() => {
    if (tacticalSolutions.length > 0) {
      setActiveSolution(tacticalSolutions[0]);
      if (tacticalSolutions[0].figureId === 'llk_hoppe') {
        setSystemDiamondMode('llk_hoppe');
      }
    }
  }, [tacticalSolutions]);

  const handleSimulateSolution = (sol: TacticalSolution) => {
    setCustomSolutionTrajectory(sol.trajectory);
    setShowSolution(true);
    setIsSimulating(true);
  };

  const handleSelectSpin = (spin: HoppeSpinEffect) => {
    setActiveSolution((prev) => (prev ? { ...prev, hoppeSpin: spin } : null));
  };

  const handleToggleSolution = () => {
    if (activeSolution) {
      handleSimulateSolution(activeSolution);
    } else {
      setIsSimulating((prev) => !prev);
    }
  };

  const handleResetPosition = () => {
    setIsSimulating(false);
    setCustomSolutionTrajectory(null);
    setShowSolution(false);
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
        const loc = found ? getLocalizedPos(found, language) : null;
        return {
          id,
          name: loc?.name || found?.name || id,
          category: loc?.category || found?.category || (language === 'en' ? 'Training' : 'Entrenamiento'),
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

      // If this session is part of the guided Learning Roadmap (nodeId is present)
      if (params.nodeId) {
        const calculatedStars = finalPct >= 80 ? 3 : finalPct >= 60 ? 2 : 1;
        const xpGained = activeRouteNode?.xp || 150;
        await apiFetch('/training/node-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: params.nodeId,
            stars: calculatedStars,
            completedCount: totalHits,
            accuracy: finalPct,
            xpGained,
          }),
        });
      }
    } catch (e) {
      console.warn('Could not sync training session to backend:', e);
    }

    // 3. Display celebratory trophy modal with randomized congratulatory message
    setCelebrationSummary({
      ...sessionRecord,
      savedToBackend: backendSaved,
    });
    setCelebrationQuote(getRandomCongratulationQuote(language));
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
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/training'))}
              accessibilityLabel={t('common.back')}
            >
              <IconArrowLeft size={20} color={palette.text} />
            </TouchableOpacity>

            <View style={styles.sessionTitleCol}>
              <Text style={styles.sessionTitle}>
                {activeRouteNode
                  ? (language === 'en'
                      ? `Day ${activeRouteNode.dayNumber}: ${activeRouteNode.title}`
                      : `Día ${activeRouteNode.dayNumber}: ${activeRouteNode.title}`)
                  : t('training.session.title')}
              </Text>
              <Text style={styles.sessionSubtitle}>
                {activeRouteNode
                  ? activeRouteNode.subtitle
                  : t('training.session.shotProgress', { current: currentPosIndex + 1, total: positions.length })}
              </Text>
            </View>

            <View style={styles.sessionBadge}>
              <IconFlame size={15} color={palette.primary} />
              <Text style={styles.sessionBadgeText}>{t('training.session.activeRun')}</Text>
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
                    setCustomSolutionTrajectory(null);
                    setShowSolution(false);
                  }}
                >
                  <Text
                    style={[
                      styles.positionPillText,
                      isSelected && styles.positionPillTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {idx + 1}. {getLocalizedPos(pos, language).category}
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
              <Text style={styles.addPositionPillText}>{t('training.session.newShot')}</Text>
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
                  <Text style={styles.categoryText}>{localizedCurrentPos.category}</Text>
                </View>
                <Text style={styles.positionName}>{localizedCurrentPos.name}</Text>

                <TouchableOpacity
                  style={[
                    styles.showSolutionBtn,
                    showSolution && styles.showSolutionBtnActive,
                  ]}
                  onPress={() => {
                    setShowSolution((prev) => !prev);
                    if (!showSolution && activeSolution) {
                      setCustomSolutionTrajectory(activeSolution.trajectory);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  {showSolution ? (
                    <IconEyeOff size={15} color="#ffffff" />
                  ) : (
                    <IconBulb size={15} color={palette.primary} />
                  )}
                  <Text
                    style={[
                      styles.showSolutionBtnText,
                      showSolution ? styles.showSolutionBtnTextActive : { color: palette.text },
                    ]}
                  >
                    {showSolution ? 'Ocultar Solución' : 'Mostrar Solución'}
                  </Text>
                </TouchableOpacity>
              </View>
              {localizedCurrentPos.hint && (
                <Text style={styles.positionHint}>{localizedCurrentPos.hint}</Text>
              )}
            </View>

            {/* 2:1 Carom Billiard Table */}
            <View style={styles.tableWrapper}>
              <TrainingPlayTable
                whiteBall={currentPos.white}
                yellowBall={currentPos.yellow}
                redBall={currentPos.red}
                trajectory={
                  (showSolution || isSimulating)
                    ? (customSolutionTrajectory || activeSolution?.trajectory || currentPos.trajectory || [])
                    : []
                }
                isSimulating={isSimulating}
                onSimulationEnd={() => {
                  setIsSimulating(false);
                }}
                systemMode={systemDiamondMode}
              />
            </View>

            {/* AI Tactical Play Solver & Willie Hoppe System */}
            {activeSolution && (
              <TacticalSolverPanel
                solution={activeSolution}
                solutions={tacticalSolutions}
                onSelectSolution={(sol) => {
                  setActiveSolution(sol);
                  setCustomSolutionTrajectory(sol.trajectory);
                  if (sol.figureId === 'llk_hoppe') {
                    setSystemDiamondMode('llk_hoppe');
                  }
                }}
                onSimulateSolution={handleSimulateSolution}
                isSimulating={isSimulating}
                systemDiamondMode={systemDiamondMode}
                onToggleDiamondMode={setSystemDiamondMode}
                onSelectSpin={handleSelectSpin}
                showSolution={showSolution}
                onToggleShowSolution={() => {
                  setShowSolution((prev) => !prev);
                  if (!showSolution && activeSolution) {
                    setCustomSolutionTrajectory(activeSolution.trajectory);
                  }
                }}
              />
            )}

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
            name: pos.name || (language === 'en' ? 'Captured Position' : 'Posición Capturada'),
            category: language === 'en' ? 'Capture / YouTube' : 'Captura / YouTube',
            hint: language === 'en' ? 'Position extracted and calibrated with computer vision.' : 'Posición extraída y calibrada con visión por computadora.',
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
          setPositions(activeRouteNode && activeRouteNode.positions.length > 0 ? adaptRoutePositionsToSessionPositions(activeRouteNode) : DEFAULT_POSITIONS);
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
    showSolutionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: palette.primary,
      backgroundColor: `${palette.primary}15`,
      marginLeft: 'auto',
    },
    showSolutionBtnActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    showSolutionBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: palette.primary,
    },
    showSolutionBtnTextActive: {
      color: '#ffffff',
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
