import { memo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
import {
  IconAdjustments,
  IconArrowsExchange,
  IconCheck,
  IconLayoutColumns,
  IconMaximize,
  IconNumbers,
  IconRotateClockwise,
  IconRuler2,
  IconSettings,
  IconX,
} from '@tabler/icons-react-native';

export interface CanvasViewSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  // Overlays
  showWoodRails: boolean;
  onToggleWoodRails: (v: boolean) => void;
  showProjectedGrid: boolean;
  onToggleProjectedGrid: (v: boolean) => void;
  showDiamonds: boolean;
  onToggleDiamonds: (v: boolean) => void;
  showCornerDiamonds: boolean;
  onToggleCornerDiamonds: (v: boolean) => void;
  // Mode & Orientation
  tableOrientation: 'horizontal' | 'vertical';
  onChangeOrientation: (o: 'horizontal' | 'vertical') => void;
  tableCoverage: 'full' | 'half';
  onChangeTableCoverage: (c: 'full' | 'half') => void;
  halfTableZone: 'half_1' | 'half_2';
  onChangeHalfTableZone: (z: 'half_1' | 'half_2') => void;
  canvasZoom: 'fit' | 'expanded';
  onChangeCanvasZoom: (z: 'fit' | 'expanded') => void;
  // Shortcut to table skins
  onOpenTableCustomizer?: () => void;
}

const isWeb = Platform.OS === 'web';

const getC = (palette: ReturnType<typeof getPalette>, isDark: boolean) => ({
  bg: isDark ? '#0a100d' : palette.background,
  surface: isDark ? '#13201b' : palette.card,
  surfaceHigh: isDark ? '#1a2c26' : palette.surfaceLow,
  surfaceBorder: isDark ? '#29443b' : palette.border,
  primary: '#10b981',
  primaryDim: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
  text: isDark ? '#f1f5f3' : palette.text,
  textMuted: isDark ? '#94a39d' : palette.muted,
  accentCyan: isDark ? '#06b6d4' : '#0284c7',
  accentYellow: isDark ? '#eab308' : '#d97706',
});

function CanvasViewSettingsModalBase({
  visible,
  onClose,
  showWoodRails,
  onToggleWoodRails,
  showProjectedGrid,
  onToggleProjectedGrid,
  showDiamonds,
  onToggleDiamonds,
  showCornerDiamonds,
  onToggleCornerDiamonds,
  tableOrientation,
  onChangeOrientation,
  tableCoverage,
  onChangeTableCoverage,
  halfTableZone,
  onChangeHalfTableZone,
  canvasZoom,
  onChangeCanvasZoom,
  onOpenTableCustomizer,
}: CanvasViewSettingsModalProps) {
  const colorScheme = useColorScheme();
  const { language } = useI18n();
  const palette = getPalette(colorScheme);
  const isDark = colorScheme === 'dark';
  const C = getC(palette, isDark);
  const s = getStyles(C, isDark);
  const isEn = language === 'en';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />

        <View style={s.modalBox}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleWrap}>
              <View style={s.headerIconWrap}>
                <IconAdjustments size={18} color={C.primary} strokeWidth={2} />
              </View>
              <Text style={s.headerTitle}>
                {isEn ? 'Canvas View Settings' : 'Ajustes de Vista del Lienzo'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconX size={18} color={C.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            {/* Section 1: Visual Overlays */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {isEn ? 'VISUAL OVERLAYS ON PHOTO' : 'CAPAS VISUALES EN LA FOTO'}
              </Text>

              {/* Wood Rails */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>
                    {isEn ? 'Wood Rails' : 'Madera del Pasamanos'}
                  </Text>
                  <Text style={s.switchSub}>
                    {isEn ? 'Shows outer wood perimeter' : 'Muestra el perímetro exterior de madera'}
                  </Text>
                </View>
                <Switch
                  value={showWoodRails}
                  onValueChange={onToggleWoodRails}
                  trackColor={{ false: isDark ? '#243b32' : '#cbd5e1', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Tactical Grid */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>
                    {isEn ? 'Tactical Grid' : 'Cuadrícula Táctica'} {tableCoverage === 'half' ? '(4×4)' : '(8×4)'}
                  </Text>
                  <Text style={s.switchSub}>
                    {isEn ? 'Guide lines between diamonds projected on table' : 'Líneas guía entre diamantes proyectadas en la mesa'}
                  </Text>
                </View>
                <Switch
                  value={showProjectedGrid}
                  onValueChange={onToggleProjectedGrid}
                  trackColor={{ false: isDark ? '#243b32' : '#cbd5e1', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Diamonds */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>
                    {isEn ? 'Cushion Diamonds' : 'Diamantes en Bandas'}
                  </Text>
                  <Text style={s.switchSub}>
                    {isEn ? 'Reference inlays on wooden rails' : 'Incrustaciones de referencia en los pasamanos'}
                  </Text>
                </View>
                <Switch
                  value={showDiamonds}
                  onValueChange={onToggleDiamonds}
                  trackColor={{ false: isDark ? '#243b32' : '#cbd5e1', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Corner Diamonds */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>
                    {isEn ? 'Corner Diamonds' : 'Diamantes en las Esquinas'}
                  </Text>
                  <Text style={s.switchSub}>
                    {isEn ? 'Corner points aligned with opposing rails' : 'Puntos de esquina alineados a las bandas contrarias'}
                  </Text>
                </View>
                <Switch
                  value={showCornerDiamonds}
                  onValueChange={onToggleCornerDiamonds}
                  trackColor={{ false: isDark ? '#243b32' : '#cbd5e1', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Section 2: Mode & Orientation */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {isEn ? 'ORIENTATION & COVERAGE' : 'ORIENTACIÓN Y COBERTURA'}
              </Text>

              {/* Orientation */}
              <Text style={s.subLabel}>
                {isEn ? 'Table Orientation' : 'Orientación de la Mesa'}
              </Text>
              <View style={s.segmentedRow}>
                <TouchableOpacity
                  style={[
                    s.segBtn,
                    tableOrientation === 'horizontal' && s.segBtnActive,
                  ]}
                  onPress={() => onChangeOrientation('horizontal')}
                >
                  <Text
                    style={[
                      s.segBtnText,
                      tableOrientation === 'horizontal' && s.segBtnTextActive,
                    ]}
                  >
                    {isEn ? '▭ Horizontal (Long Rail Top)' : '▭ Horizontal (Larga Arriba)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.segBtn,
                    tableOrientation === 'vertical' && s.segBtnActive,
                  ]}
                  onPress={() => onChangeOrientation('vertical')}
                >
                  <Text
                    style={[
                      s.segBtnText,
                      tableOrientation === 'vertical' && s.segBtnTextActive,
                    ]}
                  >
                    {isEn ? '▯ Vertical (Long Rail Sides)' : '▯ Vertical (Larga a los Lados)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Coverage */}
              <Text style={[s.subLabel, { marginTop: 12 }]}>
                {isEn ? 'Table Coverage' : 'Cobertura de Mesa'}
              </Text>
              <View style={s.segmentedRow}>
                <TouchableOpacity
                  style={[
                    s.segBtn,
                    tableCoverage === 'full' && s.segBtnActive,
                  ]}
                  onPress={() => onChangeTableCoverage('full')}
                >
                  <Text
                    style={[
                      s.segBtnText,
                      tableCoverage === 'full' && s.segBtnTextActive,
                    ]}
                  >
                    {isEn ? 'Full Table (8×4)' : 'Mesa Completa (8×4)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.segBtn,
                    tableCoverage === 'half' && s.segBtnActive,
                  ]}
                  onPress={() => onChangeTableCoverage('half')}
                >
                  <Text
                    style={[
                      s.segBtnText,
                      tableCoverage === 'half' && s.segBtnTextActive,
                    ]}
                  >
                    {isEn ? 'Half Table (4×4)' : 'Media Mesa (4×4)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Half table zone switcher */}
              {tableCoverage === 'half' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={s.subLabel}>
                    {isEn ? 'Half Table Zone' : 'Zona de Media Mesa'}
                  </Text>
                  <View style={s.segmentedRow}>
                    <TouchableOpacity
                      style={[
                        s.segBtn,
                        halfTableZone === 'half_1' && s.segBtnActive,
                      ]}
                      onPress={() => onChangeHalfTableZone('half_1')}
                    >
                      <Text
                        style={[
                          s.segBtnText,
                          halfTableZone === 'half_1' && s.segBtnTextActive,
                        ]}
                      >
                        {isEn ? 'Half 1 (0-142 cm)' : 'Mitad 1 (0-142 cm)'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        s.segBtn,
                        halfTableZone === 'half_2' && s.segBtnActive,
                      ]}
                      onPress={() => onChangeHalfTableZone('half_2')}
                    >
                      <Text
                        style={[
                          s.segBtnText,
                          halfTableZone === 'half_2' && s.segBtnTextActive,
                        ]}
                      >
                        {isEn ? 'Half 2 (142-284 cm)' : 'Mitad 2 (142-284 cm)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Canvas Zoom */}
              <Text style={[s.subLabel, { marginTop: 12 }]}>
                {isEn ? 'Canvas Mode' : 'Modo del Lienzo'}
              </Text>
              <View style={s.segmentedRow}>
                <TouchableOpacity
                  style={[s.segBtn, canvasZoom === 'fit' && s.segBtnActive]}
                  onPress={() => onChangeCanvasZoom('fit')}
                >
                  <Text
                    style={[
                      s.segBtnText,
                      canvasZoom === 'fit' && s.segBtnTextActive,
                    ]}
                  >
                    {isEn ? 'Auto Fit' : 'Ajuste Automático'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.segBtn, canvasZoom === 'expanded' && s.segBtnActive]}
                  onPress={() => onChangeCanvasZoom('expanded')}
                >
                  <Text
                    style={[
                      s.segBtnText,
                      canvasZoom === 'expanded' && s.segBtnTextActive,
                    ]}
                  >
                    {isEn ? 'Expanded Canvas (72%)' : 'Lienzo Expandido (72%)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 3: Shortcut to Table Preferences */}
            {onOpenTableCustomizer && (
              <View style={s.section}>
                <TouchableOpacity
                  style={s.customizerShortcutBtn}
                  onPress={() => {
                    onClose();
                    onOpenTableCustomizer();
                  }}
                  activeOpacity={0.7}
                >
                  <IconSettings size={18} color={C.primary} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.customizerShortcutTitle}>
                      {isEn ? 'Customize Cloth & Table Skins' : 'Personalizar Paño y Skins de Mesa'}
                    </Text>
                    <Text style={s.customizerShortcutSub}>
                      {isEn ? 'Cloth color (Simonis), diamonds/dots, wood finish' : 'Color de paño (Simonis), rombos/círculos, madera'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.doneBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <IconCheck size={16} color="#0a100d" strokeWidth={2.5} />
              <Text style={s.doneBtnText}>{isEn ? 'Done' : 'Listo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const CanvasViewSettingsModal = memo(CanvasViewSettingsModalBase);
export default CanvasViewSettingsModal;

const getStyles = (C: ReturnType<typeof getC>, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(5, 10, 8, 0.85)' : 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    modalBox: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '90%',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.6 : 0.15,
      shadowRadius: 24,
      elevation: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.surfaceBorder,
      backgroundColor: C.surfaceHigh,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: C.primaryDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 18,
      gap: 18,
    },
    section: {
      backgroundColor: C.surfaceHigh,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      padding: 14,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: C.primary,
      letterSpacing: 0.8,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    switchLabelWrap: {
      flex: 1,
      paddingRight: 12,
    },
    switchTitle: {
      fontSize: 13.5,
      fontWeight: '600',
      color: C.text,
      marginBottom: 2,
    },
    switchSub: {
      fontSize: 11,
      color: C.textMuted,
    },
    subLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: C.textMuted,
      marginBottom: 4,
    },
    segmentedRow: {
      flexDirection: 'row',
      gap: 6,
    },
    segBtn: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segBtnActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    segBtnText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: C.textMuted,
      textAlign: 'center',
    },
    segBtnTextActive: {
      color: '#0a100d',
      fontWeight: '700',
    },
    customizerShortcutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 8,
      backgroundColor: C.primaryDim,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    customizerShortcutTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: C.primary,
    },
    customizerShortcutSub: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 2,
    },
    footer: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: C.surfaceBorder,
      backgroundColor: C.surfaceHigh,
      alignItems: 'flex-end',
    },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    doneBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#0a100d',
    },
  });
