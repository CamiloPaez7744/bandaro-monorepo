import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  IconCheck,
  IconEye,
  IconMinus,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconStar,
  IconStarFilled,
  IconX,
} from '@tabler/icons-react-native';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

export interface RecordHitsOverlayProps {
  targetReps: number;
  madeHits: number;
  difficulty: number;
  isSimulating: boolean;
  onTargetRepsChange: (reps: number) => void;
  onMadeHitsChange: (hits: number) => void;
  onToggleSolution: () => void;
  onResetPosition: () => void;
  onNextPosition: () => void;
  onFinishSession: () => void;
  isLastPosition?: boolean;
}

const PRESET_REPS = [5, 10, 15];

export function RecordHitsOverlay({
  targetReps,
  madeHits,
  difficulty = 3,
  isSimulating,
  onTargetRepsChange,
  onMadeHitsChange,
  onToggleSolution,
  onResetPosition,
  onNextPosition,
  onFinishSession,
  isLastPosition = false,
}: RecordHitsOverlayProps) {
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customInput, setCustomInput] = useState(String(targetReps));

  const handleIncrement = () => {
    if (madeHits < targetReps) {
      onMadeHitsChange(madeHits + 1);
    }
  };

  const handleDecrement = () => {
    if (madeHits > 0) {
      onMadeHitsChange(madeHits - 1);
    }
  };

  const handleSaveCustomReps = () => {
    const val = parseInt(customInput, 10);
    if (!isNaN(val) && val > 0 && val <= 100) {
      onTargetRepsChange(val);
      if (madeHits > val) {
        onMadeHitsChange(val);
      }
    }
    setShowConfigModal(false);
  };

  const accuracyPct = targetReps > 0 ? Math.round((madeHits / targetReps) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* 1. Quick Table Controls: Show Solution & Reset Position */}
      <View style={styles.tableControlsRow}>
        <TouchableOpacity
          style={[styles.ctrlBtn, isSimulating && styles.ctrlBtnActive]}
          activeOpacity={0.8}
          onPress={onToggleSolution}
        >
          {isSimulating ? (
            <IconPlayerPlay size={17} color={palette.primary} />
          ) : (
            <IconEye size={17} color={palette.primary} />
          )}
          <Text style={styles.ctrlBtnText}>
            {isSimulating ? t('common.simulating') : t('training.system.showSolution')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          activeOpacity={0.8}
          onPress={onResetPosition}
        >
          <IconRefresh size={17} color={palette.muted} />
          <Text style={[styles.ctrlBtnText, { color: palette.muted }]}>
            {t('common.reset')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Repetitions Quick-Select Bar */}
      <View style={styles.repsSelectorRow}>
        <Text style={styles.repsSelectorLabel}>{t('training.session.targetLabel')}</Text>
        <View style={styles.repsChips}>
          {PRESET_REPS.map((reps) => {
            const isSelected = targetReps === reps;
            return (
              <TouchableOpacity
                key={reps}
                style={[styles.repChip, isSelected && styles.repChipActive]}
                activeOpacity={0.8}
                onPress={() => onTargetRepsChange(reps)}
              >
                <Text
                  style={[
                    styles.repChipText,
                    isSelected && styles.repChipTextActive,
                  ]}
                >
                  {reps}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom Input Button */}
          <TouchableOpacity
            style={[
              styles.repChip,
              !PRESET_REPS.includes(targetReps) && styles.repChipActive,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              setCustomInput(String(targetReps));
              setShowConfigModal(true);
            }}
          >
            <Text
              style={[
                styles.repChipText,
                !PRESET_REPS.includes(targetReps) && styles.repChipTextActive,
              ]}
            >
              {!PRESET_REPS.includes(targetReps)
                ? t('training.session.customFree', { reps: targetReps })
                : t('training.session.customOther')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Record Hits Stepper Card */}
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <View>
            <Text style={styles.recordTitle}>{t('training.session.recordTitle')}</Text>
            <Text style={styles.recordSubtitle}>{t('training.session.recordSubtitle')}</Text>
          </View>

          {/* Stepper Counter */}
          <View style={styles.stepperWrap}>
            <TouchableOpacity
              style={[styles.stepBtn, madeHits === 0 && styles.stepBtnDisabled]}
              activeOpacity={0.7}
              onPress={handleDecrement}
              disabled={madeHits === 0}
            >
              <IconMinus size={18} color={madeHits === 0 ? palette.muted : palette.text} />
            </TouchableOpacity>

            <View style={styles.countDisplay}>
              <Text style={styles.countMain}>{madeHits}</Text>
              <Text style={styles.countTotal}>{t('training.session.ofTotal', { total: targetReps })}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.stepBtn,
                styles.stepBtnPrimary,
                madeHits >= targetReps && styles.stepBtnDisabled,
              ]}
              activeOpacity={0.7}
              onPress={handleIncrement}
              disabled={madeHits >= targetReps}
            >
              <IconPlus size={18} color={madeHits >= targetReps ? palette.muted : '#ffffff'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Accuracy Progress & Difficulty */}
        <View style={styles.metricsRow}>
          <View style={styles.difficultyGroup}>
            <Text style={styles.metricLabel}>{t('common.difficulty')}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) =>
                s <= difficulty ? (
                  <IconStarFilled key={s} size={15} color="#eab308" />
                ) : (
                  <IconStar key={s} size={15} color={palette.border} />
                )
              )}
            </View>
          </View>

          <View style={styles.accuracyPill}>
            <Text style={styles.accuracyLabel}>{t('common.effectiveness')}</Text>
            <Text style={styles.accuracyValue}>{accuracyPct}%</Text>
          </View>
        </View>

        {/* Progress Bar of Current Position */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(accuracyPct, 100)}%` },
            ]}
          />
        </View>

        {/* 4. Action Buttons (Next Position & Finish Session) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            onPress={onNextPosition}
          >
            <Text style={styles.btnSecondaryText}>{t('training.session.nextShot')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.8}
            onPress={onFinishSession}
          >
            <Text style={styles.btnPrimaryText}>{t('training.session.finishSession')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for Custom Repetitions Input */}
      <Modal
        visible={showConfigModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowConfigModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('training.session.setReps')}</Text>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <IconX size={20} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              {t('training.session.repsInputDesc')}
            </Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={customInput}
              onChangeText={setCustomInput}
              selectTextOnFocus
              maxLength={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveCustomReps}
              >
                <IconCheck size={16} color="#000000" />
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      gap: 12,
      width: '100%',
    },
    tableControlsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    ctrlBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.md,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    ctrlBtnActive: {
      backgroundColor: `${palette.primary}20`,
      borderColor: palette.primary,
    },
    ctrlBtnText: {
      color: palette.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    repsSelectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: palette.card,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    repsSelectorLabel: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    repsChips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    repChip: {
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    repChipActive: {
      backgroundColor: `${palette.primary}25`,
      borderColor: palette.primary,
    },
    repChipText: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    repChipTextActive: {
      color: palette.primary,
    },
    recordCard: {
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: theme.spacing.md,
      gap: 14,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.2)' }
        : {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
          }),
      elevation: 6,
    },
    recordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    recordTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: '800',
    },
    recordSubtitle: {
      color: palette.muted,
      fontSize: 11,
    },
    stepperWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.surfaceLow,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 3,
      gap: 4,
    },
    stepBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.sm,
      backgroundColor: palette.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnPrimary: {
      backgroundColor: palette.primary,
    },
    stepBtnDisabled: {
      opacity: 0.35,
    },
    countDisplay: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      minWidth: 64,
    },
    countMain: {
      color: palette.text,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 24,
    },
    countTotal: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    difficultyGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metricLabel: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    starsRow: {
      flexDirection: 'row',
      gap: 2,
    },
    accuracyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.surfaceLow,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: palette.border,
    },
    accuracyLabel: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '600',
    },
    accuracyValue: {
      color: palette.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    progressBarBg: {
      width: '100%',
      height: 6,
      backgroundColor: palette.surfaceLow,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: palette.primary,
      borderRadius: 3,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    btnSecondary: {
      flex: 1,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.md,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnSecondaryText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '700',
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: palette.primary,
      borderRadius: theme.radius.md,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? { boxShadow: `0 2px 6px ${palette.primary}4d` }
        : {
            shadowColor: palette.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }),
      elevation: 4,
    },
    btnPrimaryText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: palette.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 20,
      gap: 14,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: '700',
    },
    modalDesc: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 16,
    },
    modalInput: {
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.primary,
      borderRadius: theme.radius.md,
      color: palette.primary,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      paddingVertical: 8,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    modalCancelBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    modalCancelText: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    modalSaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.primary,
      borderRadius: theme.radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    modalSaveText: {
      color: '#000000',
      fontSize: 12,
      fontWeight: '800',
    },
  });
