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

const C = {
  bg: '#0a100d',
  surface: '#13201b',
  surfaceHigh: '#1a2c26',
  surfaceBorder: '#29443b',
  primary: '#10b981',
  primaryDim: 'rgba(16, 185, 129, 0.15)',
  text: '#f1f5f3',
  textMuted: '#94a39d',
  accentCyan: '#06b6d4',
  accentYellow: '#eab308',
};

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
              <Text style={s.headerTitle}>Ajustes de Vista del Lienzo</Text>
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
              <Text style={s.sectionTitle}>CAPAS VISUALES EN LA FOTO</Text>

              {/* Wood Rails */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>Madera del Pasamanos</Text>
                  <Text style={s.switchSub}>
                    Muestra el perímetro exterior de madera
                  </Text>
                </View>
                <Switch
                  value={showWoodRails}
                  onValueChange={onToggleWoodRails}
                  trackColor={{ false: '#243b32', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Tactical Grid */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>
                    Cuadrícula Táctica {tableCoverage === 'half' ? '(4×4)' : '(8×4)'}
                  </Text>
                  <Text style={s.switchSub}>
                    Líneas guía entre diamantes proyectadas en la mesa
                  </Text>
                </View>
                <Switch
                  value={showProjectedGrid}
                  onValueChange={onToggleProjectedGrid}
                  trackColor={{ false: '#243b32', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Diamonds */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>Diamantes en Bandas</Text>
                  <Text style={s.switchSub}>
                    Incrustaciones de referencia en los pasamanos
                  </Text>
                </View>
                <Switch
                  value={showDiamonds}
                  onValueChange={onToggleDiamonds}
                  trackColor={{ false: '#243b32', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Corner Diamonds */}
              <View style={s.switchRow}>
                <View style={s.switchLabelWrap}>
                  <Text style={s.switchTitle}>Diamantes en las Esquinas</Text>
                  <Text style={s.switchSub}>
                    Puntos de esquina alineados a las bandas contrarias
                  </Text>
                </View>
                <Switch
                  value={showCornerDiamonds}
                  onValueChange={onToggleCornerDiamonds}
                  trackColor={{ false: '#243b32', true: C.primary }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Section 2: Mode & Orientation */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>ORIENTACIÓN Y COBERTURA</Text>

              {/* Orientation */}
              <Text style={s.subLabel}>Orientación de la Mesa</Text>
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
                    ▭ Horizontal (Larga Arriba)
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
                    ▯ Vertical (Larga a los Lados)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Coverage */}
              <Text style={[s.subLabel, { marginTop: 12 }]}>
                Cobertura de Mesa
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
                    Mesa Completa (8×4)
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
                    Media Mesa (4×4)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Half table zone switcher */}
              {tableCoverage === 'half' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={s.subLabel}>Zona de Media Mesa</Text>
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
                        Mitad 1 (0-142 cm)
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
                        Mitad 2 (142-284 cm)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Canvas Zoom */}
              <Text style={[s.subLabel, { marginTop: 12 }]}>Modo del Lienzo</Text>
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
                    Ajuste Automático
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
                    Lienzo Expandido (72%)
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
                      Personalizar Paño y Skins de Mesa
                    </Text>
                    <Text style={s.customizerShortcutSub}>
                      Color de paño (Simonis), rombos/círculos, madera
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
              <Text style={s.doneBtnText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const CanvasViewSettingsModal = memo(CanvasViewSettingsModalBase);
export default CanvasViewSettingsModal;

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
    shadowOpacity: 0.6,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
