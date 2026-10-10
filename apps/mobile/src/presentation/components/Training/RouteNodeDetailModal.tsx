import { useState, useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const TouchableOpacity = ({
  style,
  activeOpacity = 0.7,
  children,
  disabled,
  ...props
}: any) => (
  <Pressable
    {...props}
    disabled={disabled}
    style={({ pressed }) => [
      typeof style === 'function' ? style({ pressed }) : style,
      pressed && !disabled && { opacity: activeOpacity },
    ]}
  >
    {children}
  </Pressable>
);
import {
  IconArrowRight,
  IconBrain,
  IconCheck,
  IconLock,
  IconPlayerPlay,
  IconRoute,
  IconSchool,
  IconStarFilled,
  IconTrophy,
  IconX,
} from '@/src/presentation/components/icons';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { BilliardsTableThumbnail } from './BilliardsTableThumbnail';
import { type RouteNode } from '@/src/presentation/screens/Training/trainingRouteData';

export interface RouteNodeDetailModalProps {
  visible: boolean;
  node: RouteNode | null;
  onClose: () => void;
  onStartSession: (node: RouteNode) => void;
  onOpenTheory: () => void;
  onOpenSystem?: (systemId: string) => void;
}

export function RouteNodeDetailModal({
  visible,
  node,
  onClose,
  onStartSession,
  onOpenTheory,
  onOpenSystem,
}: RouteNodeDetailModalProps) {
  const { t, language } = useI18n();
  const palette = getPalette(useColorScheme());
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768;
  const styles = getStyles(palette, isWide);

  const [selectedPosIdx, setSelectedPosIdx] = useState(0);

  // Reset selected pos on node change
  useMemo(() => {
    setSelectedPosIdx(0);
  }, [node?.id]);

  if (!node) return null;

  const currentPos = node.positions[selectedPosIdx] ?? node.positions[0];
  const isCompleted = node.status === 'completed';
  const isActive = node.status === 'active';
  const isLocked = node.status === 'locked';

  const previewBalls = currentPos
    ? [
        {
          id: 'white' as const,
          x: currentPos.white.x,
          y: currentPos.white.y,
          color: '#f8fafc',
          border: '#cbd5e1',
        },
        {
          id: 'yellow' as const,
          x: currentPos.yellow.x,
          y: currentPos.yellow.y,
          color: '#facc15',
          border: '#ca8a04',
        },
        {
          id: 'red' as const,
          x: currentPos.red.x,
          y: currentPos.red.y,
          color: '#dc2626',
          border: '#991b1b',
        },
      ]
    : [];

  const previewPaths = currentPos?.trajectory && currentPos.trajectory.length > 1
    ? [
        {
          id: 'preview-path',
          points: currentPos.trajectory,
          color: '#06b6d4',
          width: 2.4,
          opacity: 0.95,
        },
      ]
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { maxHeight: Math.min(height * 0.92, 780) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.badgeRow}>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{node.category}</Text>
                </View>
                {node.isBoss && (
                  <View style={styles.bossBadge}>
                    <IconTrophy size={13} color="#f59e0b" />
                    <Text style={styles.bossBadgeText}>
                      {language === 'en' ? 'Level Milestone' : 'Hito de Nivel'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.title}>
                {language === 'en' ? `Day ${node.dayNumber}: ` : `Día ${node.dayNumber}: `}
                {node.title}
              </Text>
              <Text style={styles.subtitle}>{node.subtitle}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconX size={20} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Status & Stats Pill Row */}
            <View style={styles.statusRow}>
              {isCompleted ? (
                <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' }]}>
                  <IconCheck size={14} color="#10b981" strokeWidth={3} />
                  <Text style={[styles.statusPillText, { color: '#10b981' }]}>
                    {language === 'en' ? 'Completed' : 'Completado'}
                  </Text>
                  <View style={styles.starsInline}>
                    {[1, 2, 3].map((s) => (
                      <IconStarFilled
                        key={s}
                        size={12}
                        color={s <= node.stars ? '#f59e0b' : palette.border}
                      />
                    ))}
                  </View>
                </View>
              ) : isActive ? (
                <View style={[styles.statusPill, { backgroundColor: `${palette.primary}18`, borderColor: palette.primary }]}>
                  <IconPlayerPlay size={14} color={palette.primary} />
                  <Text style={[styles.statusPillText, { color: palette.primary }]}>
                    {language === 'en' ? 'Active Challenge' : 'Desafío Activo'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusPill, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                  <IconLock size={14} color={palette.muted} />
                  <Text style={[styles.statusPillText, { color: palette.muted }]}>
                    {language === 'en' ? 'Locked Station' : 'Estación Bloqueada'}
                  </Text>
                </View>
              )}

              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>XP</Text>
                <Text style={styles.statChipValue}>+{node.xp}</Text>
              </View>

              <View style={styles.statChip}>
                <Text style={styles.statChipLabel}>{language === 'en' ? 'Positions' : 'Tiros'}</Text>
                <Text style={styles.statChipValue}>{node.positions.length || node.positionsCount}</Text>
              </View>
            </View>

            {/* Billiards Table Preview Card */}
            {currentPos ? (
              <View style={styles.tableCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={styles.tableSectionTitle}>
                    {language === 'en' ? 'Canonical Layout' : 'Disposición en la Mesa'}
                  </Text>
                  {node.positions.length > 1 && (
                    <View style={styles.posSelectorRow}>
                      {node.positions.map((_, pIdx) => (
                        <TouchableOpacity
                          key={`pos-tab-${pIdx}`}
                          style={[styles.posTab, selectedPosIdx === pIdx && styles.posTabActive]}
                          onPress={() => setSelectedPosIdx(pIdx)}
                        >
                          <Text style={[styles.posTabText, selectedPosIdx === pIdx && styles.posTabTextActive]}>
                            {language === 'en' ? `Shot ${pIdx + 1}` : `Tiro ${pIdx + 1}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.tableWrap}>
                  <BilliardsTableThumbnail
                    orientation="horizontal"
                    style={styles.tableStage}
                    balls={previewBalls}
                    paths={previewPaths}
                    showZones
                  />
                </View>

                <View style={styles.positionFooter}>
                  <Text style={styles.positionLegend}>
                    ⚪ {language === 'en' ? 'Cue Ball' : 'Tiradora'} | 🟡 {language === 'en' ? 'Ball 2' : 'Bola 2'} | 🔴 {language === 'en' ? 'Ball 3' : 'Bola 3'}
                  </Text>
                  <Text style={styles.positionHint}>
                    {currentPos.hint ||
                      (language === 'en'
                        ? 'Execute with stable tempo and follow-through.'
                        : 'Ejecuta con tempo constante y traspaso fluido.')}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Coach's Didactic Advice Box */}
            <View style={styles.coachCard}>
              <View style={styles.coachHeader}>
                <IconBrain size={18} color={palette.primary} />
                <Text style={styles.coachHeaderTitle}>
                  {language === 'en' ? "Master Coach's Principle" : 'Consejo del Maestro Entrenador'}
                </Text>
              </View>
              <Text style={styles.coachTipText}>{node.coachTip}</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {!isLocked ? (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: palette.primary }]}
                  activeOpacity={0.88}
                  onPress={() => onStartSession(node)}
                >
                  <IconPlayerPlay size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={styles.primaryActionBtnText}>
                    {isCompleted
                      ? (language === 'en' ? 'Train Again & Perfect' : 'Entrenar de Nuevo y Perfeccionar')
                      : (language === 'en' ? 'Start Guided Training' : 'Iniciar Entrenamiento Guiado')}
                  </Text>
                  <IconArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
                </TouchableOpacity>
              ) : (
                <View style={styles.lockedBtnDisabled}>
                  <IconLock size={18} color={palette.muted} />
                  <Text style={styles.lockedBtnText}>
                    {language === 'en'
                      ? `Complete Day ${node.dayNumber - 1} to Unlock`
                      : `Completa el Día ${node.dayNumber - 1} para Desbloquear`}
                  </Text>
                </View>
              )}

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { borderColor: palette.primary }]}
                  activeOpacity={0.85}
                  onPress={onOpenTheory}
                >
                  <IconSchool size={16} color={palette.primary} />
                  <Text style={[styles.secondaryActionBtnText, { color: palette.primary }]}>
                    {language === 'en' ? 'View Theory & Biomechanics' : 'Ver Teoría & Biomecánica'}
                  </Text>
                </TouchableOpacity>

                {node.systemId && onOpenSystem ? (
                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, { borderColor: '#06b6d4' }]}
                    activeOpacity={0.85}
                    onPress={() => onOpenSystem(node.systemId!)}
                  >
                    <IconRoute size={16} color="#06b6d4" />
                    <Text style={[styles.secondaryActionBtnText, { color: '#06b6d4' }]}>
                      {language === 'en' ? 'Canonical Cheat Sheet' : 'Cheat Sheet & Diamantes'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>, isWide: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    card: {
      width: '100%',
      maxWidth: isWide ? 620 : 440,
      borderRadius: theme.radius.xl,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      gap: 12,
      ...Platform.select({
        web: {
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
        },
      }),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    headerLeft: {
      flex: 1,
      gap: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    categoryChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: `${palette.primary}18`,
    },
    categoryChipText: {
      color: palette.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bossBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    bossBadgeText: {
      color: '#f59e0b',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      color: palette.text,
      fontSize: 18,
      fontWeight: '900',
      lineHeight: 24,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 12.5,
      lineHeight: 18,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceLow,
    },
    scrollContent: {
      gap: 12,
      paddingBottom: 4,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusPillText: {
      fontSize: 12,
      fontWeight: '800',
    },
    starsInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginLeft: 2,
    },
    statChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
    },
    statChipLabel: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    statChipValue: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '900',
    },
    tableCard: {
      borderRadius: 14,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 10,
      gap: 8,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tableSectionTitle: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    posSelectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    posTab: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    posTabActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    posTabText: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    posTabTextActive: {
      color: '#fff',
      fontWeight: '900',
    },
    tableWrap: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    tableStage: {
      width: '100%',
      aspectRatio: 2 / 1,
    },
    positionFooter: {
      gap: 3,
    },
    positionLegend: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    positionHint: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
    coachCard: {
      borderRadius: 12,
      backgroundColor: `${palette.primary}0c`,
      borderWidth: 1,
      borderColor: `${palette.primary}25`,
      padding: 12,
      gap: 6,
    },
    coachHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    coachHeaderTitle: {
      color: palette.primary,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    coachTipText: {
      color: palette.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    actionsContainer: {
      gap: 8,
      marginTop: 4,
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: theme.radius.md,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }),
      elevation: 4,
    },
    primaryActionBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '900',
    },
    lockedBtnDisabled: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: theme.radius.md,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
    },
    lockedBtnText: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '700',
    },
    secondaryActionsRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    secondaryActionBtn: {
      flex: 1,
      minWidth: 160,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      backgroundColor: palette.card,
    },
    secondaryActionBtnText: {
      fontSize: 12,
      fontWeight: '800',
    },
  });
