import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  IconBook,
  IconCamera,
  IconChevronRight,
  IconDeviceGamepad2,
  IconSparkles,
  IconX,
} from '@tabler/icons-react-native';

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
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nueva Sesión de Entrenamiento</Text>
              <Text style={styles.subtitle}>
                Selecciona la posición de billar que deseas practicar
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconX size={20} color={palette.muted} />
            </TouchableOpacity>
          </View>

          {/* Motivational Quote Banner if provided */}
          {quote ? (
            <View style={styles.quoteCard}>
              <IconSparkles size={18} color={palette.primary} />
              <Text style={styles.quoteText}>{quote}</Text>
            </View>
          ) : null}

          {/* 3 Entry Options */}
          <View style={styles.optionsList}>
            {/* Option 1: Catalog */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onSelectCatalog();
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${palette.primary}18` }]}>
                <IconBook size={24} color={palette.primary} />
              </View>
              <View style={styles.optionTextCol}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Elegir del Catálogo</Text>
                  <Text style={styles.optionTag}>Billiard-Bible</Text>
                </View>
                <Text style={styles.optionDesc}>
                  Banda previa, Bricoles, Pase bola, Rondas y sistemas maestros UMB.
                </Text>
              </View>
              <IconChevronRight size={20} color={palette.muted} />
            </TouchableOpacity>

            {/* Option 2: Simulator */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onOpenSimulator();
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${palette.secondary}18` }]}>
                <IconDeviceGamepad2 size={24} color={palette.secondary} />
              </View>
              <View style={styles.optionTextCol}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Armar en Simulador</Text>
                  <Text style={[styles.optionTag, { color: palette.secondary, borderColor: `${palette.secondary}40` }]}>
                    Interactivo
                  </Text>
                </View>
                <Text style={styles.optionDesc}>
                  Coloca las bolas a tu gusto, ajusta efecto/fuerza y empieza a entrenar.
                </Text>
              </View>
              <IconChevronRight size={20} color={palette.muted} />
            </TouchableOpacity>

            {/* Option 3: Camera Photo */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onCapturePhoto();
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${palette.tertiary}18` }]}>
                <IconCamera size={24} color={palette.tertiary} />
              </View>
              <View style={styles.optionTextCol}>
                <View style={styles.optionTitleRow}>
                  <Text style={styles.optionTitle}>Tomar Foto de la Mesa</Text>
                  <Text style={[styles.optionTag, { color: palette.tertiary, borderColor: `${palette.tertiary}40` }]}>
                    Visión AI
                  </Text>
                </View>
                <Text style={styles.optionDesc}>
                  Escanea tu mesa física real con la cámara para clonar la posición.
                </Text>
              </View>
              <IconChevronRight size={20} color={palette.muted} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: palette.card,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      padding: theme.spacing.lg,
      gap: 16,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: {
      color: palette.text,
      fontSize: 18,
      fontWeight: '700',
    },
    subtitle: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    quoteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: `${palette.primary}12`,
      borderWidth: 1,
      borderColor: `${palette.primary}30`,
      borderRadius: theme.radius.md,
      padding: 12,
    },
    quoteText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
      fontStyle: 'italic',
      lineHeight: 17,
    },
    optionsList: {
      gap: 10,
      marginTop: 4,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.lg,
      padding: 14,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTextCol: {
      flex: 1,
      gap: 3,
    },
    optionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    optionTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: '700',
    },
    optionTag: {
      color: palette.primary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: `${palette.primary}40`,
    },
    optionDesc: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 16,
    },
  });
