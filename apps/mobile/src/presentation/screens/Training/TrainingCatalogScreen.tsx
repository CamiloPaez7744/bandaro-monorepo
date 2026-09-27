import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconPlayerPlay,
  IconSparkles,
  IconArrowRight,
  IconFlame,
  IconBolt,
  IconTrendingUp,
  IconCheck,
  IconLock,
  IconTrophy,
  IconStar,
  IconStarFilled,
  IconBrain,
  IconSchool,
  IconBook,
  IconDeviceGamepad2,
  IconX,
} from '@/src/presentation/components/icons';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { TrainingPlayTable } from '@/src/presentation/components/Training/TrainingPlayTable';
import { CameraCaptureModal } from '@/src/presentation/components/Snapshot/CameraCaptureModal';
import { TrainingPositionSelectorModal } from '@/src/presentation/components/Training/TrainingPositionSelectorModal';
import { getRandomTrainingQuote } from '@/src/presentation/screens/Training/trainingQuotes';
import { TRAINING_SYSTEMS, type TrainingSystem } from '@/src/presentation/screens/Training/trainingData';
import {
  TRAINING_ROUTE_LEVELS,
  type RouteLevel,
  type RouteNode,
} from '@/src/presentation/screens/Training/trainingRouteData';
import { apiFetch } from '@/src/infrastructure/security/cryptoClient';

export function TrainingCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const isWideScreen = width >= 900;
  const styles = getStyles(palette, isWideScreen);

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('level-1');
  const [routeLevels, setRouteLevels] = useState<RouteLevel[]>(TRAINING_ROUTE_LEVELS);
  const [userStats, setUserStats] = useState({ currentStreak: 14, totalXp: 1450, accuracyAvg: 68 });
  const quote = useMemo(() => getRandomTrainingQuote(), []);

  useEffect(() => {
    let isMounted = true;
    async function loadDbRoute() {
      try {
        const res = await apiFetch('/training/route');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.levels && data.levels.length > 0) {
            setRouteLevels(data.levels);
            if (data.userStats) {
              setUserStats(data.userStats);
            }
          }
        }
      } catch (err) {
        console.warn('[TrainingCatalog] Offline fallback to local levels:', err);
      }
    }
    loadDbRoute();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeLevel = useMemo(() => {
    return (
      routeLevels.find((lvl) => lvl.id === selectedLevelId) ||
      routeLevels[0]
    );
  }, [routeLevels, selectedLevelId]);

  const onOpenSystem = (system: TrainingSystem) => {
    router.push({ pathname: '/training/[systemId]', params: { systemId: system.id } });
  };

  const onStartNodePractice = (node: RouteNode) => {
    if (node.status === 'locked') return;
    router.push('/training/session');
  };

  const completedModulesCount = activeLevel.nodes.filter(
    (n) => n.status === 'completed'
  ).length;
  const totalModulesCount = activeLevel.nodes.length;
  const progressPct =
    totalModulesCount > 0
      ? Math.round((completedModulesCount / totalModulesCount) * 100)
      : 0;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.lg + insets.bottom + 36,
        },
      ]}
    >
      <View style={styles.maxWidthWrap}>
        {/* 1. Hero Unit Header Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlowCircle} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroTagBadge}>
              <IconSparkles size={13} color={palette.primary} strokeWidth={2.5} />
              <Text style={styles.heroTagText}>{t('training.route.heroTag')}</Text>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatChip}>
                <IconFlame size={14} color="#f59e0b" strokeWidth={2.5} />
                <Text style={styles.heroStatValue}>{userStats.currentStreak} {t('common.days')}</Text>
              </View>
              <View style={styles.heroStatChip}>
                <IconBolt size={14} color={palette.primary} strokeWidth={2.5} />
                <Text style={styles.heroStatValue}>+{userStats.totalXp} XP</Text>
              </View>
              <View style={styles.heroStatChip}>
                <IconTrendingUp size={14} color="#06b6d4" strokeWidth={2.5} />
                <Text style={styles.heroStatValue}>{Math.round(userStats.accuracyAvg)}% {t('common.accuracy')}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.heroTitle}>{t('training.route.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('training.route.subtitle')}
          </Text>

          {/* Progress Indicator */}
          <View style={styles.overallProgressBox}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{t('training.route.progressLabel')}</Text>
              <Text style={styles.progressValue}>
                {t('training.route.modulesProgress', {
                  completed: completedModulesCount,
                  total: totalModulesCount,
                  pct: progressPct,
                })}
              </Text>
            </View>
            <View style={styles.progressBarRail}>
              <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        </View>

        {/* 2. Main Standout Action: Iniciar Sesión de Entrenamiento */}
        <TouchableOpacity
          style={styles.startSessionHeroButton}
          activeOpacity={0.88}
          onPress={() => setShowSelectorModal(true)}
        >
          <View style={styles.startSessionGlowEffect} />
          <View style={styles.startSessionLeft}>
            <View style={styles.startSessionIconWrap}>
              <IconPlayerPlay size={26} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View style={styles.startSessionTextCol}>
              <View style={styles.startSessionBadgeRow}>
                <IconSparkles size={12} color="#ffffff" />
                <Text style={styles.startSessionBadgeText}>{t('training.route.startBadge')}</Text>
              </View>
              <Text style={styles.startSessionTitle}>{t('training.route.startTitle')}</Text>
              <Text style={styles.startSessionDesc}>
                {t('training.route.startDesc')}
              </Text>
            </View>
          </View>
          <View style={styles.startSessionArrowCircle}>
            <IconArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* 3. Level Selector Tabs (Iniciación, Geometría, Sistemas, Competición) */}
        <View style={styles.levelSelectorSection}>
          <Text style={styles.sectionHeading}>{t('training.route.sectionHeading')}</Text>
          <Text style={styles.sectionSubheading}>
            {t('training.route.sectionSubheading')}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelPillsScroll}>
            {routeLevels.map((lvl) => {
              const isSelected = lvl.id === selectedLevelId;
              return (
                <TouchableOpacity
                  key={lvl.id}
                  style={[
                    styles.levelPill,
                    isSelected && { backgroundColor: `${lvl.color}22`, borderColor: lvl.color },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedLevelId(lvl.id)}
                >
                  <View style={[styles.levelPillDot, { backgroundColor: lvl.color }]} />
                  <Text
                    style={[
                      styles.levelPillText,
                      isSelected && { color: lvl.color, fontWeight: '800' },
                    ]}
                  >
                    {lvl.name.split(':')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Level Banner */}
          <View style={[styles.activeLevelCard, { borderLeftColor: activeLevel.color }]}>
            <View style={styles.activeLevelHeaderRow}>
              <View style={[styles.activeLevelBadge, { backgroundColor: `${activeLevel.color}18`, borderColor: `${activeLevel.color}40` }]}>
                <Text style={[styles.activeLevelBadgeText, { color: activeLevel.color }]}>
                  {activeLevel.tag}
                </Text>
              </View>
              <Text style={styles.activeLevelSub}>{activeLevel.subtitle}</Text>
            </View>
            <Text style={styles.activeLevelDesc}>{activeLevel.description}</Text>
          </View>
        </View>

        {/* 4. Duolingo-style Winding Skill Tree Path & Companion Panel */}
        <View style={styles.workspaceRow}>
          {/* LEFT / CENTER: Winding Path Tree */}
          <View style={styles.skillTreeContainer}>
            <View style={styles.pathHeaderWaypoint}>
              <View style={styles.waypointDot} />
              <Text style={styles.waypointText}>{t('training.route.waypoints')}</Text>
            </View>

            {/* Nodes Stack */}
            <View style={styles.nodesStack}>
              {activeLevel.nodes.map((node, idx) => {
                const isCompleted = node.status === 'completed';
                const isActive = node.status === 'active';
                const isLocked = node.status === 'locked';
                const isBoss = !!node.isBoss;

                // Alternate horizontal offset: 0 -> center, 1 -> right, 2 -> left, 3 -> right...
                const offsetStyle =
                  idx % 3 === 1
                    ? styles.nodeAlignRight
                    : idx % 3 === 2
                    ? styles.nodeAlignLeft
                    : styles.nodeAlignCenter;

                return (
                  <View key={node.id} style={[styles.nodeWrapper, offsetStyle]}>
                    {/* Node Visual Button */}
                    <TouchableOpacity
                      style={[
                        styles.nodeCircleBtn,
                        isBoss && styles.nodeBossBtn,
                        isCompleted && styles.nodeCompleted,
                        isActive && styles.nodeActive,
                        isLocked && styles.nodeLocked,
                      ]}
                      activeOpacity={isLocked ? 1 : 0.8}
                      onPress={() => onStartNodePractice(node)}
                    >
                      {isActive && <View style={styles.activeBeaconRing} />}
                      <View style={styles.nodeCircleInner}>
                        {isCompleted ? (
                          <IconCheck size={32} color={palette.primary} strokeWidth={3} />
                        ) : isActive ? (
                          isBoss ? (
                            <IconTrophy size={34} color="#f59e0b" strokeWidth={2.5} />
                          ) : (
                            <IconPlayerPlay size={32} color={palette.primary} strokeWidth={2.5} />
                          )
                        ) : (
                          <IconLock size={26} color={palette.muted} strokeWidth={2} />
                        )}
                      </View>

                      {/* Completed / Boss Badge */}
                      {isCompleted && (
                        <View style={styles.completedBadgeCheck}>
                          <Text style={styles.completedBadgeCheckText}>✓</Text>
                        </View>
                      )}
                      {isBoss && (
                        <View style={styles.bossBadgeFlag}>
                          <Text style={styles.bossBadgeFlagText}>{t('training.route.milestone')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Stars Indicator */}
                    {isCompleted && (
                      <View style={styles.starsRow}>
                        {[1, 2, 3].map((s) => (
                          <IconStarFilled
                            key={s}
                            size={13}
                            color={s <= node.stars ? '#f59e0b' : palette.border}
                          />
                        ))}
                      </View>
                    )}

                    {/* Active Challenge Floating Callout Banner */}
                    {isActive && (
                      <View style={styles.activeCalloutCard}>
                        <View style={styles.activeCalloutTop}>
                          <View style={styles.activeCalloutTag}>
                            <Text style={styles.activeCalloutTagText}>{t('training.route.nextChallenge')}</Text>
                          </View>
                          <Text style={styles.activeCalloutStep}>
                            {t('training.route.readyCount', { completed: node.completedCount, total: node.positionsCount })}
                          </Text>
                        </View>
                        <Text style={styles.activeCalloutTitle}>{node.title}</Text>
                        <Text style={styles.activeCalloutDesc}>{node.subtitle}</Text>
                        <TouchableOpacity
                          style={styles.activeCalloutActionBtn}
                          onPress={() => onStartNodePractice(node)}
                        >
                          <Text style={styles.activeCalloutActionText}>{t('training.route.resume')}</Text>
                          <IconArrowRight size={14} color="#ffffff" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Node Text & Status */}
                    <View style={styles.nodeTextContainer}>
                      <Text style={[styles.nodeDayText, isCompleted && { color: palette.primary }]}>
                        {t('training.route.dayStatus', {
                          day: node.dayNumber,
                          status: isCompleted ? t('common.completed') : isActive ? t('common.active') : t('common.locked'),
                        })}
                      </Text>
                      <Text style={styles.nodeTitleText}>{node.title}</Text>
                      <Text style={styles.nodeSubText}>{node.subtitle}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* RIGHT: Companion Panel (Coach's Tip & Reinforce System) */}
          <View style={styles.companionPanel}>
            {/* 1. Coach's Tip Card (José María Quetglas Pedagogy) */}
            <View style={styles.coachCard}>
              <View style={styles.coachCardHeader}>
                <View style={styles.coachIconWrap}>
                  <IconBrain size={22} color={palette.primary} strokeWidth={2} />
                </View>
                <View style={styles.coachHeaderTextCol}>
                  <Text style={styles.coachTag}>{t('training.route.coachTag')}</Text>
                  <Text style={styles.coachTitle}>{t('training.route.coachTitle')}</Text>
                </View>
              </View>

              <View style={styles.coachQuoteBox}>
                <Text style={styles.coachQuoteText}>
                  {t('training.route.coachQuote')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.coachGuideBtn}
                activeOpacity={0.8}
                onPress={() => setShowTheoryModal(true)}
              >
                <IconSchool size={16} color={palette.primary} strokeWidth={2} />
                <Text style={styles.coachGuideBtnText}>{t('training.route.viewTheory')}</Text>
                <IconArrowRight size={14} color={palette.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* 2. System to Reinforce Card */}
            <View style={styles.reinforceCard}>
              <View style={styles.reinforceHeader}>
                <View style={styles.reinforceIconWrap}>
                  <IconBook size={20} color={palette.secondary} strokeWidth={2} />
                </View>
                <View style={styles.coachHeaderTextCol}>
                  <Text style={[styles.coachTag, { color: palette.secondary }]}>{t('training.route.reinforceTag')}</Text>
                  <Text style={styles.coachTitle}>{t('training.route.reinforceTitle')}</Text>
                </View>
              </View>

              <View style={styles.thumbnailWrapper}>
                <TrainingPlayTable
                  whiteBall={{ x: 71, y: 105 }}
                  yellowBall={{ x: 142, y: 71 }}
                  redBall={{ x: 213, y: 35 }}
                  trajectory={[
                    { x: 71, y: 105 },
                    { x: 142, y: 71 },
                    { x: 284, y: 35 },
                  ]}
                  trajectoryColor="#10B981"
                  showGrid={false}
                  showDiamondNumbers={false}
                  style={styles.thumbnailTable}
                />
              </View>

              <TouchableOpacity
                style={[styles.reinforceActionBtn, { backgroundColor: palette.secondary }]}
                activeOpacity={0.85}
                onPress={() => router.push('/training/session')}
              >
                <IconPlayerPlay size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.reinforceActionBtnText}>{t('training.route.practicePosition')}</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Quick Systems Library Shortcut */}
            <View style={styles.libraryShortcutCard}>
              <Text style={styles.libraryShortcutTitle}>{t('training.route.systemsTitle')}</Text>
              <Text style={styles.libraryShortcutDesc}>
                {t('training.route.systemsDesc')}
              </Text>
              <View style={styles.systemsChipsRow}>
                {TRAINING_SYSTEMS.map((sys) => (
                  <TouchableOpacity
                    key={sys.id}
                    style={styles.systemChip}
                    onPress={() => onOpenSystem(sys)}
                  >
                    <Text style={styles.systemChipText}>{sys.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Selector Modal (Customized and Centered on Web) */}
      <TrainingPositionSelectorModal
        visible={showSelectorModal}
        quote={quote.text}
        onClose={() => setShowSelectorModal(false)}
        onSelectCatalog={() => {
          setShowSelectorModal(false);
          router.push('/catalog');
        }}
        onOpenSimulator={() => router.push('/training/simulate')}
        onCapturePhoto={() => setShowCameraModal(true)}
      />

      {/* Camera Capture & Calibration Studio Modal */}
      <CameraCaptureModal
        visible={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onSelectPosition={(pos) => {
          setShowCameraModal(false);
          const q = new URLSearchParams({
            whiteX: String(pos.white.x),
            whiteY: String(pos.white.y),
            yellowX: String(pos.yellow.x),
            yellowY: String(pos.yellow.y),
            redX: String(pos.red.x),
            redY: String(pos.red.y),
            customName: pos.name || 'Mesa Calibrada (Foto)',
          });
          router.push(`/training/session?${q.toString()}`);
        }}
      />

      {/* Biomechanical Theory Modal (José María Quetglas) */}
      <Modal
        visible={showTheoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTheoryModal(false)}
      >
        <Pressable style={styles.theoryOverlay} onPress={() => setShowTheoryModal(false)}>
          <Pressable style={styles.theoryDialog} onPress={(e) => e.stopPropagation()}>
            <View style={styles.theoryHeader}>
              <View style={styles.theoryHeaderLeft}>
                <View style={styles.theoryIconCircle}>
                  <IconSchool size={22} color={palette.primary} strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.theoryTag}>{t('training.theory.tag')}</Text>
                  <Text style={styles.theoryTitle}>{t('training.theory.title')}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowTheoryModal(false)}
              >
                <IconX size={20} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.theoryBody}>
              <View style={styles.theorySection}>
                <Text style={styles.theorySectionHeading}>{t('training.theory.sec1Title')}</Text>
                <Text style={styles.theoryParagraph}>
                  {t('training.theory.sec1Desc')}
                </Text>
              </View>

              <View style={styles.theorySection}>
                <Text style={styles.theorySectionHeading}>{t('training.theory.sec2Title')}</Text>
                <Text style={styles.theoryParagraph}>
                  {t('training.theory.sec2Desc')}
                </Text>
              </View>

              <View style={styles.theorySection}>
                <Text style={styles.theorySectionHeading}>{t('training.theory.sec3Title')}</Text>
                <Text style={styles.theoryParagraph}>
                  {t('training.theory.sec3Desc')}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.theoryCloseActionBtn}
              onPress={() => setShowTheoryModal(false)}
            >
              <Text style={styles.theoryCloseActionBtnText}>{t('training.theory.dismiss')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>, isWideScreen: boolean) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.background,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      minHeight: '100%',
    },
    maxWidthWrap: {
      width: '100%',
      maxWidth: isWideScreen ? 1140 : 640,
      gap: 16,
    },
    heroCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: `${palette.primary}45`,
      padding: isWideScreen ? 24 : theme.spacing.md,
      backgroundColor: palette.card,
      position: 'relative',
      overflow: 'hidden',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    heroGlowCircle: {
      position: 'absolute',
      right: -30,
      top: -30,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: `${palette.primary}12`,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 10,
    },
    heroTagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      backgroundColor: `${palette.primary}18`,
      borderWidth: 1,
      borderColor: `${palette.primary}35`,
    },
    heroTagText: {
      color: palette.primary,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    heroStatChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: palette.surfaceLow,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: palette.border,
    },
    heroStatValue: {
      fontSize: 11.5,
      fontWeight: '700',
      color: palette.text,
    },
    heroTitle: {
      color: palette.text,
      fontSize: isWideScreen ? 30 : 24,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      color: palette.muted,
      fontSize: 13.5,
      lineHeight: 20,
    },
    overallProgressBox: {
      backgroundColor: palette.surfaceLow,
      borderRadius: theme.radius.md,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: palette.border,
    },
    progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    progressLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: palette.muted,
      letterSpacing: 0.5,
    },
    progressValue: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.primary,
    },
    progressBarRail: {
      height: 6,
      backgroundColor: palette.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: palette.primary,
      borderRadius: 3,
    },
    startSessionHeroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.primary,
      borderRadius: theme.radius.lg,
      padding: isWideScreen ? 20 : 16,
      position: 'relative',
      overflow: 'hidden',
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 8,
    },
    startSessionGlowEffect: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 140,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    startSessionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    startSessionIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    startSessionTextCol: {
      flex: 1,
      gap: 3,
    },
    startSessionBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    startSessionBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      opacity: 0.9,
    },
    startSessionTitle: {
      color: '#ffffff',
      fontSize: isWideScreen ? 18 : 16,
      fontWeight: '800',
    },
    startSessionDesc: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 12,
      lineHeight: 16,
    },
    startSessionArrowCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    levelSelectorSection: {
      gap: 10,
      marginTop: 6,
    },
    sectionHeading: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.text,
      letterSpacing: -0.3,
    },
    sectionSubheading: {
      fontSize: 12.5,
      color: palette.muted,
      marginTop: -4,
    },
    levelPillsScroll: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 6,
    },
    levelPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.radius.full,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    levelPillDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    levelPillText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: palette.muted,
    },
    activeLevelCard: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.md,
      padding: 14,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 6,
    },
    activeLevelHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    activeLevelBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
    },
    activeLevelBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    activeLevelSub: {
      fontSize: 12.5,
      fontWeight: '700',
      color: palette.text,
    },
    activeLevelDesc: {
      fontSize: 11.5,
      color: palette.muted,
      lineHeight: 16,
    },
    workspaceRow: {
      flexDirection: isWideScreen ? 'row' : 'column',
      gap: 20,
      marginTop: 8,
      alignItems: 'flex-start',
    },
    skillTreeContainer: {
      flex: isWideScreen ? 1.25 : undefined,
      width: '100%',
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: isWideScreen ? 24 : 16,
      alignItems: 'center',
      position: 'relative',
    },
    pathHeaderWaypoint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: palette.surfaceLow,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 24,
    },
    waypointDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: palette.primary,
    },
    waypointText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: palette.muted,
      letterSpacing: 0.6,
    },
    nodesStack: {
      width: '100%',
      gap: 32,
      paddingBottom: 16,
    },
    nodeWrapper: {
      width: '100%',
      alignItems: 'center',
      position: 'relative',
    },
    nodeAlignCenter: {
      alignSelf: 'center',
    },
    nodeAlignRight: {
      alignSelf: isWideScreen ? 'flex-end' : 'center',
      paddingRight: isWideScreen ? 60 : 0,
    },
    nodeAlignLeft: {
      alignSelf: isWideScreen ? 'flex-start' : 'center',
      paddingLeft: isWideScreen ? 60 : 0,
    },
    nodeCircleBtn: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: palette.surfaceLow,
      borderWidth: 3,
      borderColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    nodeBossBtn: {
      width: 84,
      height: 84,
      borderRadius: 22,
      borderColor: '#f59e0b',
    },
    nodeCompleted: {
      borderColor: palette.primary,
      backgroundColor: `${palette.primary}12`,
    },
    nodeActive: {
      borderColor: palette.primary,
      backgroundColor: `${palette.primary}25`,
    },
    nodeLocked: {
      opacity: 0.6,
    },
    activeBeaconRing: {
      position: 'absolute',
      top: -8,
      left: -8,
      right: -8,
      bottom: -8,
      borderRadius: 46,
      borderWidth: 2,
      borderColor: `${palette.primary}50`,
    },
    nodeCircleInner: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    completedBadgeCheck: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: palette.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completedBadgeCheckText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '900',
    },
    bossBadgeFlag: {
      position: 'absolute',
      top: -6,
      right: -6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: '#f59e0b',
    },
    bossBadgeFlagText: {
      color: '#000000',
      fontSize: 9,
      fontWeight: '900',
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: palette.surfaceLow,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginTop: 6,
    },
    activeCalloutCard: {
      backgroundColor: palette.surfaceLow,
      borderRadius: theme.radius.md,
      padding: 12,
      marginTop: 10,
      borderWidth: 1,
      borderColor: `${palette.primary}40`,
      width: '100%',
      maxWidth: 280,
      alignItems: 'center',
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    activeCalloutTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 2,
    },
    activeCalloutTag: {
      backgroundColor: palette.primary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    activeCalloutTagText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '800',
    },
    activeCalloutStep: {
      fontSize: 10,
      fontWeight: '700',
      color: palette.primary,
    },
    activeCalloutTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.text,
      textAlign: 'center',
    },
    activeCalloutDesc: {
      fontSize: 11,
      color: palette.muted,
      textAlign: 'center',
      lineHeight: 15,
    },
    activeCalloutActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.primary,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: theme.radius.full,
      marginTop: 6,
    },
    activeCalloutActionText: {
      color: '#ffffff',
      fontSize: 11.5,
      fontWeight: '800',
    },
    nodeTextContainer: {
      alignItems: 'center',
      marginTop: 8,
      gap: 2,
    },
    nodeDayText: {
      fontSize: 10.5,
      fontWeight: '800',
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    nodeTitleText: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.text,
      textAlign: 'center',
    },
    nodeSubText: {
      fontSize: 11.5,
      color: palette.muted,
      textAlign: 'center',
    },
    companionPanel: {
      flex: isWideScreen ? 1 : undefined,
      width: '100%',
      gap: 16,
    },
    coachCard: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      padding: 18,
      borderWidth: 1,
      borderColor: `${palette.primary}35`,
      gap: 12,
    },
    coachCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    coachIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${palette.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coachHeaderTextCol: {
      flex: 1,
      gap: 2,
    },
    coachTag: {
      fontSize: 9.5,
      fontWeight: '800',
      color: palette.primary,
      letterSpacing: 0.5,
    },
    coachTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: palette.text,
    },
    coachQuoteBox: {
      backgroundColor: palette.surfaceLow,
      padding: 12,
      borderRadius: theme.radius.md,
      borderLeftWidth: 3,
      borderLeftColor: palette.primary,
    },
    coachQuoteText: {
      fontSize: 12,
      color: palette.text,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    coachGuideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.radius.md,
      backgroundColor: `${palette.primary}12`,
    },
    coachGuideBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.primary,
      flex: 1,
      marginLeft: 8,
    },
    reinforceCard: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 12,
    },
    reinforceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    reinforceIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: `${palette.secondary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailWrapper: {
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: palette.border,
    },
    thumbnailTable: {
      width: '100%',
      aspectRatio: 316 / 174,
    },
    reinforceActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: theme.radius.md,
    },
    reinforceActionBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    libraryShortcutCard: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 8,
    },
    libraryShortcutTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.text,
    },
    libraryShortcutDesc: {
      fontSize: 11.5,
      color: palette.muted,
      lineHeight: 16,
    },
    systemsChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    systemChip: {
      backgroundColor: palette.surfaceLow,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
    },
    systemChipText: {
      fontSize: 11.5,
      color: palette.text,
      fontWeight: '600',
    },
    theoryOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    theoryDialog: {
      backgroundColor: palette.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      padding: 24,
      width: '100%',
      maxWidth: 640,
      maxHeight: '85%',
      gap: 16,
    },
    theoryHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    theoryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    theoryIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${palette.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    theoryTag: {
      fontSize: 10,
      fontWeight: '800',
      color: palette.primary,
      letterSpacing: 0.6,
    },
    theoryTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.text,
    },
    closeBtn: {
      padding: 4,
    },
    theoryBody: {
      flex: 1,
    },
    theorySection: {
      marginBottom: 16,
      gap: 4,
    },
    theorySectionHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.primary,
    },
    theoryParagraph: {
      fontSize: 12.5,
      color: palette.text,
      lineHeight: 19,
    },
    theoryCloseActionBtn: {
      backgroundColor: palette.primary,
      paddingVertical: 12,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    theoryCloseActionBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
  });
