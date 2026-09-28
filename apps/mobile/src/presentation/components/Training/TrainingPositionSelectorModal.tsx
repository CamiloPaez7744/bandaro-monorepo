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
  IconBook,
  IconCamera,
  IconChevronRight,
  IconDeviceGamepad2,
  IconSparkles,
  IconX,
  IconArrowRight,
} from '@/src/presentation/components/icons';

import { getPalette, theme } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

export interface TrainingPositionSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCatalog: () => void;
  onOpenSimulator: () => void;
  onCapturePhoto: () => void;
  quote?: string;
}

export function TrainingPositionSelectorModal({
  visible,
  onClose,
  onSelectCatalog,
  onOpenSimulator,
  onCapturePhoto,
  quote,
}: TrainingPositionSelectorModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 640;
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette, isDesktop, insets.bottom);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {!isDesktop && <View style={styles.sheetHandle} />}

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconCircle}>
                  <IconSparkles size={isDesktop ? 22 : 18} color={palette.primary} strokeWidth={2} />
                </View>
                <View style={styles.headerTextWrap}>
                  <View style={styles.headerTagRow}>
                    <Text style={styles.headerTag}>{t('training.selector.tag')}</Text>
                  </View>
                  <Text style={styles.title}>{t('training.selector.title')}</Text>
                  <Text style={styles.subtitle} numberOfLines={isDesktop ? 2 : 1}>
                    {t('training.selector.subtitle')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                accessibilityLabel={t('common.close')}
              >
                <IconX size={isDesktop ? 20 : 18} color={palette.muted} />
              </TouchableOpacity>
            </View>

            {/* Motivational Quote Banner */}
            {quote ? (
              <View style={styles.quoteCard}>
                <IconSparkles size={14} color={palette.primary} />
                <Text style={styles.quoteText}>{quote}</Text>
              </View>
            ) : null}

            {/* 3 Rich Visual Entry Options (Grid on Web, Responsive on Mobile) */}
            <View style={styles.cardsGrid}>
              {/* Option 1: Catalog */}
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: `${palette.primary}35` }]}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  onSelectCatalog();
                }}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardIconCircle, { backgroundColor: `${palette.primary}18` }]}>
                    <IconBook size={isDesktop ? 24 : 20} color={palette.primary} strokeWidth={2} />
                  </View>
                  <View style={[styles.cardTagBadge, { backgroundColor: `${palette.primary}15`, borderColor: `${palette.primary}40` }]}>
                    <Text style={[styles.cardTagText, { color: palette.primary }]}>{t('training.selector.catalogTag')}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{t('training.selector.catalogTitle')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('training.selector.catalogDesc')}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.cardActionCue, { color: palette.primary }]}>{t('training.selector.catalogAction')}</Text>
                  <IconArrowRight size={14} color={palette.primary} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              {/* Option 2: Simulator */}
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: `${palette.secondary}35` }]}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  onOpenSimulator();
                }}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardIconCircle, { backgroundColor: `${palette.secondary}18` }]}>
                    <IconDeviceGamepad2 size={isDesktop ? 24 : 20} color={palette.secondary} strokeWidth={2} />
                  </View>
                  <View style={[styles.cardTagBadge, { backgroundColor: `${palette.secondary}15`, borderColor: `${palette.secondary}40` }]}>
                    <Text style={[styles.cardTagText, { color: palette.secondary }]}>{t('training.selector.simTag')}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{t('training.selector.simTitle')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('training.selector.simDesc')}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.cardActionCue, { color: palette.secondary }]}>{t('training.selector.simAction')}</Text>
                  <IconArrowRight size={14} color={palette.secondary} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              {/* Option 3: Camera / Snapshot */}
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: `${palette.tertiary}35` }]}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  onCapturePhoto();
                }}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardIconCircle, { backgroundColor: `${palette.tertiary}18` }]}>
                    <IconCamera size={isDesktop ? 24 : 20} color={palette.tertiary} strokeWidth={2} />
                  </View>
                  <View style={[styles.cardTagBadge, { backgroundColor: `${palette.tertiary}15`, borderColor: `${palette.tertiary}40` }]}>
                    <Text style={[styles.cardTagText, { color: palette.tertiary }]}>AI VISION</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{t('training.selector.cameraTitle')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('training.selector.cameraDesc')}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.cardActionCue, { color: palette.tertiary }]}>{t('training.selector.cameraAction')}</Text>
                  <IconArrowRight size={14} color={palette.tertiary} strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>, isDesktop: boolean, bottomInset: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: isDesktop ? 'center' : 'flex-end',
      alignItems: isDesktop ? 'center' : 'stretch',
      padding: isDesktop ? 24 : 0,
    },
    sheet: {
      backgroundColor: palette.card,
      borderRadius: isDesktop ? 20 : undefined,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: isDesktop ? 'rgba(255, 255, 255, 0.12)' : palette.border,
      width: isDesktop ? '100%' : undefined,
      maxWidth: isDesktop ? 840 : undefined,
      maxHeight: isDesktop ? '90%' : '88%',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.65,
      shadowRadius: 30,
      elevation: 25,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 2,
    },
    sheetScroll: {
      flexGrow: 0,
      maxHeight: '100%',
    },
    sheetScrollContent: {
      padding: isDesktop ? 28 : 16,
      paddingBottom: isDesktop ? 28 : Math.max(18, bottomInset + 12),
      gap: isDesktop ? 18 : 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 14 : 10,
      flex: 1,
    },
    headerIconCircle: {
      width: isDesktop ? 44 : 36,
      height: isDesktop ? 44 : 36,
      borderRadius: isDesktop ? 22 : 18,
      backgroundColor: `${palette.primary}18`,
      borderWidth: 1,
      borderColor: `${palette.primary}35`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextWrap: {
      flex: 1,
      gap: 2,
    },
    headerTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTag: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.7,
      color: palette.primary,
      textTransform: 'uppercase',
    },
    title: {
      color: palette.text,
      fontSize: isDesktop ? 22 : 16,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    subtitle: {
      color: palette.muted,
      fontSize: isDesktop ? 13 : 11.5,
      marginTop: 2,
      lineHeight: isDesktop ? 18 : 15,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    quoteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: `${palette.primary}10`,
      borderWidth: 1,
      borderColor: `${palette.primary}25`,
      borderRadius: theme.radius.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    quoteText: {
      color: palette.text,
      fontSize: 11.5,
      fontWeight: '600',
      flex: 1,
      fontStyle: 'italic',
      lineHeight: 16,
    },
    cardsGrid: {
      flexDirection: isDesktop ? 'row' : 'column',
      gap: isDesktop ? 16 : 10,
      marginTop: 2,
    },
    actionCard: {
      flex: isDesktop ? 1 : undefined,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: isDesktop ? 20 : 12,
      justifyContent: 'space-between',
      gap: isDesktop ? 14 : 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardIconCircle: {
      width: isDesktop ? 48 : 36,
      height: isDesktop ? 48 : 36,
      borderRadius: isDesktop ? 12 : 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTagBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 6,
      borderWidth: 1,
    },
    cardTagText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    cardBody: {
      gap: 4,
      flex: 1,
    },
    cardTitle: {
      color: palette.text,
      fontSize: isDesktop ? 16 : 14,
      fontWeight: '700',
    },
    cardDesc: {
      color: palette.muted,
      fontSize: isDesktop ? 12 : 11,
      lineHeight: isDesktop ? 17 : 15,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: isDesktop ? 10 : 7,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardActionCue: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '700',
    },
  });
