import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
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
  const isDesktop = width >= 640;
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette, isDesktop);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <IconSparkles size={22} color={palette.primary} strokeWidth={2} />
              </View>
              <View style={styles.headerTextWrap}>
                <View style={styles.headerTagRow}>
                  <Text style={styles.headerTag}>CONFIGURACIÓN DE ENTRENAMIENTO</Text>
                </View>
                <Text style={styles.title}>Nueva Sesión de Billar</Text>
                <Text style={styles.subtitle}>
                  Elige cómo deseas configurar o cargar las posiciones en la mesa
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconX size={20} color={palette.muted} />
            </TouchableOpacity>
          </View>

          {/* Motivational Quote Banner */}
          {quote ? (
            <View style={styles.quoteCard}>
              <IconSparkles size={16} color={palette.primary} />
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
                  <IconBook size={24} color={palette.primary} strokeWidth={2} />
                </View>
                <View style={[styles.cardTagBadge, { backgroundColor: `${palette.primary}15`, borderColor: `${palette.primary}40` }]}>
                  <Text style={[styles.cardTagText, { color: palette.primary }]}>BILLIARD-BIBLE</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Elegir del Catálogo</Text>
                <Text style={styles.cardDesc}>
                  Banda previa, Bricoles, Pase bola, Rondas y sistemas maestros UMB organizados por categoría y nivel.
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.cardActionCue, { color: palette.primary }]}>Explorar Jugadas</Text>
                <IconArrowRight size={16} color={palette.primary} strokeWidth={2.5} />
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
                  <IconDeviceGamepad2 size={24} color={palette.secondary} strokeWidth={2} />
                </View>
                <View style={[styles.cardTagBadge, { backgroundColor: `${palette.secondary}15`, borderColor: `${palette.secondary}40` }]}>
                  <Text style={[styles.cardTagText, { color: palette.secondary }]}>INTERACTIVO</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Armar en Simulador</Text>
                <Text style={styles.cardDesc}>
                  Coloca las 3 bolas libremente en la mesa virtual, ajusta efecto, fuerza y ángulo de ataque para practicar.
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.cardActionCue, { color: palette.secondary }]}>Abrir Mesa Virtual</Text>
                <IconArrowRight size={16} color={palette.secondary} strokeWidth={2.5} />
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
                  <IconCamera size={24} color={palette.tertiary} strokeWidth={2} />
                </View>
                <View style={[styles.cardTagBadge, { backgroundColor: `${palette.tertiary}15`, borderColor: `${palette.tertiary}40` }]}>
                  <Text style={[styles.cardTagText, { color: palette.tertiary }]}>VISIÓN AI</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Escanear con Foto</Text>
                <Text style={styles.cardDesc}>
                  Toma una foto de tu mesa física o pega una captura de YouTube para clonar la posición con calibración proyectiva.
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.cardActionCue, { color: palette.tertiary }]}>Escanear Mesa</Text>
                <IconArrowRight size={16} color={palette.tertiary} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>, isDesktop: boolean) =>
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
      padding: isDesktop ? 28 : theme.spacing.lg,
      gap: 18,
      width: isDesktop ? '100%' : undefined,
      maxWidth: isDesktop ? 840 : undefined,
      maxHeight: isDesktop ? '90%' : '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.65,
      shadowRadius: 30,
      elevation: 25,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
    },
    headerIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
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
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.7,
      color: palette.primary,
      textTransform: 'uppercase',
    },
    title: {
      color: palette.text,
      fontSize: isDesktop ? 22 : 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    subtitle: {
      color: palette.muted,
      fontSize: isDesktop ? 13 : 12,
      marginTop: 2,
      lineHeight: 18,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    quoteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: `${palette.primary}10`,
      borderWidth: 1,
      borderColor: `${palette.primary}25`,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    quoteText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
      fontStyle: 'italic',
      lineHeight: 17,
    },
    cardsGrid: {
      flexDirection: isDesktop ? 'row' : 'column',
      gap: isDesktop ? 16 : 12,
      marginTop: 4,
    },
    actionCard: {
      flex: isDesktop ? 1 : undefined,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: isDesktop ? 20 : 16,
      justifyContent: 'space-between',
      gap: 14,
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
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTagBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    cardTagText: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    cardBody: {
      gap: 6,
      flex: 1,
    },
    cardTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: '700',
    },
    cardDesc: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardActionCue: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
