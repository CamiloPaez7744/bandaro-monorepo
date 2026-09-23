import { memo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  IconCheck,
  IconRefresh,
  IconSettings,
  IconX,
} from '@/src/presentation/components/icons';
import {
  CLOTH_SKIN_PRESETS,
  DEFAULT_TABLE_PREFERENCES,
  type DiamondCount,
  type DiamondShape,
  type TablePreferences,
  type WoodFinish,
} from './tablePreferences';

interface TableCustomizerModalProps {
  visible: boolean;
  preferences: TablePreferences;
  onClose: () => void;
  onChangePreferences: (newPrefs: TablePreferences) => void;
}

const CUSTOM_QUICK_COLORS = [
  { name: 'Rojo Carmesí', hex: '#b91c1c' },
  { name: 'Púrpura Imperial', hex: '#6b21a8' },
  { name: 'Azul Eléctrico', hex: '#0284c7' },
  { name: 'Verde Esmeralda', hex: '#047857' },
  { name: 'Carbón Puro', hex: '#18181b' },
  { name: 'Ámbar Cálido', hex: '#b45309' },
];

function TableCustomizerModalBase({
  visible,
  preferences,
  onClose,
  onChangePreferences,
}: TableCustomizerModalProps) {
  const [customHex, setCustomHex] = useState(
    preferences.clothColor.startsWith('#') ? preferences.clothColor : '#0f766e'
  );

  const update = (partial: Partial<TablePreferences>) => {
    onChangePreferences({ ...preferences, ...partial });
  };

  const handleApplyCustomHex = (hex: string) => {
    let clean = hex.trim();
    if (!clean.startsWith('#')) clean = `#${clean}`;
    setCustomHex(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      update({ clothColor: clean });
    }
  };

  const isCustomColor = preferences.clothColor.startsWith('#');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.modalContainer}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleRow}>
              <View style={s.headerIconBadge}>
                <IconSettings size={20} color="#10b981" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={s.headerTitle}>Personalizar Mesa Canónica</Text>
                <Text style={s.headerSubtitle}>
                  Configura skins, tipo de miras, esquinas y cuadrícula
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <IconX size={20} color="#94a39d" />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            {/* 1. SECCIÓN: COLOR & SKINS DEL PAÑO */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>1. Skin & Color del Paño</Text>
              <Text style={s.sectionDesc}>
                Elige un paño oficial de torneo o define tu propio color personalizado:
              </Text>

              <View style={s.presetsGrid}>
                {CLOTH_SKIN_PRESETS.map((p) => {
                  const isActive = preferences.clothColor === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      style={[s.presetCard, isActive && s.presetCardActive]}
                      onPress={() => update({ clothColor: p.id })}>
                      <View style={[s.swatchCircle, { backgroundColor: p.hex }]}>
                        {isActive && <IconCheck size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <View style={s.presetInfo}>
                        <Text style={[s.presetName, isActive && s.presetNameActive]}>
                          {p.name}
                        </Text>
                        <Text style={s.presetDesc} numberOfLines={1}>
                          {p.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Selector de Color Personalizado */}
              <View style={[s.customColorBox, isCustomColor && s.customColorBoxActive]}>
                <View style={s.customHeaderRow}>
                  <View style={[s.swatchCircle, { backgroundColor: customHex }]}>
                    {isCustomColor && <IconCheck size={14} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <View style={s.customInputWrapper}>
                    <Text style={s.customInputLabel}>Color Hexadecimal Libre</Text>
                    <TextInput
                      style={s.hexInput}
                      value={customHex}
                      onChangeText={handleApplyCustomHex}
                      placeholder="#10638c"
                      placeholderTextColor="#64748b"
                      autoCapitalize="none"
                      maxLength={7}
                    />
                  </View>
                </View>

                {/* Quick custom swatches */}
                <View style={s.quickPaletteRow}>
                  {CUSTOM_QUICK_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c.hex}
                      style={[
                        s.quickSwatch,
                        { backgroundColor: c.hex },
                        preferences.clothColor === c.hex && s.quickSwatchActive,
                      ]}
                      onPress={() => {
                        setCustomHex(c.hex);
                        update({ clothColor: c.hex });
                      }}>
                      {preferences.clothColor === c.hex && (
                        <IconCheck size={12} color="#ffffff" strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* 2. SECCIÓN: FORMA DE LAS MIRAS (DIAMANTES VS PUNTOS) */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>2. Forma de las Miras (Marcadores)</Text>
              <Text style={s.sectionDesc}>
                Elige entre rombos alargados o puntos circulares tradicionales:
              </Text>

              <View style={s.optionsRow}>
                <Pressable
                  style={[
                    s.shapeCard,
                    preferences.diamondShape === 'rhombus' && s.shapeCardActive,
                  ]}
                  onPress={() => update({ diamondShape: 'rhombus' })}>
                  <View style={s.shapeIconBox}>
                    <View style={s.rhombusShape} />
                  </View>
                  <Text
                    style={[
                      s.shapeCardTitle,
                      preferences.diamondShape === 'rhombus' && s.shapeCardTitleActive,
                    ]}>
                    Diamantes (Rombos)
                  </Text>
                  <Text style={s.shapeCardSub}>
                    Apuntan con precisión hacia el centro de la mesa
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    s.shapeCard,
                    preferences.diamondShape === 'circle' && s.shapeCardActive,
                  ]}
                  onPress={() => update({ diamondShape: 'circle' })}>
                  <View style={s.shapeIconBox}>
                    <View style={s.circleShape} />
                  </View>
                  <Text
                    style={[
                      s.shapeCardTitle,
                      preferences.diamondShape === 'circle' && s.shapeCardTitleActive,
                    ]}>
                    Puntos Circulares
                  </Text>
                  <Text style={s.shapeCardSub}>
                    Marcadores redondos tradicionales de nácar / marfil
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 3. SECCIÓN: CONTEO DE MIRAS Y ESQUINAS */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>3. Conteo de Miras & Esquinas</Text>
              <Text style={s.sectionDesc}>
                Distribución de marcadores a lo largo de las bandas:
              </Text>

              <View style={s.optionsRow}>
                <Pressable
                  style={[
                    s.countCard,
                    preferences.diamondCount === '9_5' && s.countCardActive,
                  ]}
                  onPress={() => update({ diamondCount: '9_5' })}>
                  <Text
                    style={[
                      s.countCardBadge,
                      preferences.diamondCount === '9_5' && s.countCardBadgeActive,
                    ]}>
                    9 y 5
                  </Text>
                  <Text style={s.countCardTitle}>Con Esquinas</Text>
                  <Text style={s.countCardSub}>
                    9 en banda larga, 5 en banda corta (Estándar UMB)
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    s.countCard,
                    preferences.diamondCount === '7_3' && s.countCardActive,
                  ]}
                  onPress={() => update({ diamondCount: '7_3' })}>
                  <Text
                    style={[
                      s.countCardBadge,
                      preferences.diamondCount === '7_3' && s.countCardBadgeActive,
                    ]}>
                    7 y 3
                  </Text>
                  <Text style={s.countCardTitle}>Sin Esquinas</Text>
                  <Text style={s.countCardSub}>
                    7 en banda larga, 3 en banda corta (Interiores)
                  </Text>
                </Pressable>
              </View>

              {/* Interruptor específico para diamantes de esquina */}
              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.switchLabel}>Mostrar Miras de Esquina</Text>
                  <Text style={s.switchSub}>
                    Coloca dos marcadores en cada esquina alineados con el filo de la banda
                  </Text>
                </View>
                <Switch
                  value={preferences.showCornerDiamonds}
                  onValueChange={(val) => update({ showCornerDiamonds: val })}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor={preferences.showCornerDiamonds ? '#10b981' : '#cbd5e1'}
                />
              </View>
            </View>

            {/* 4. SECCIÓN: GUÍAS TÁCTICAS Y SISTEMA DE DIAMANTES */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>4. Guías Tácticas & Cuadrícula</Text>

              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.switchLabel}>Cuadrícula Táctica 8×4</Text>
                  <Text style={s.switchSub}>
                    Líneas punteadas que unen los diamantes en módulos de 35.5 cm
                  </Text>
                </View>
                <Switch
                  value={preferences.showGrid}
                  onValueChange={(val) => update({ showGrid: val })}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor={preferences.showGrid ? '#10b981' : '#cbd5e1'}
                />
              </View>

              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.switchLabel}>Numeración de Diamantes</Text>
                  <Text style={s.switchSub}>
                    Valores del Sistema Base 50 (0..80 en larga, 0..40 en corta)
                  </Text>
                </View>
                <Switch
                  value={preferences.showDiamondNumbers}
                  onValueChange={(val) => update({ showDiamondNumbers: val })}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor={preferences.showDiamondNumbers ? '#10b981' : '#cbd5e1'}
                />
              </View>
            </View>

            {/* 5. SECCIÓN: TONO DEL PASAMANOS (MADERA) */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>5. Acabado de la Madera</Text>
              <View style={s.woodRow}>
                {(
                  [
                    { id: 'ebony', label: 'Ébano Negro', color: '#1e120c' },
                    { id: 'mahogany', label: 'Caoba Real', color: '#3b1812' },
                    { id: 'walnut', label: 'Nogal Cálido', color: '#3a2718' },
                  ] as const
                ).map((w) => {
                  const isActive = preferences.woodFinish === w.id;
                  return (
                    <Pressable
                      key={w.id}
                      style={[s.woodBtn, isActive && s.woodBtnActive]}
                      onPress={() => update({ woodFinish: w.id as WoodFinish })}>
                      <View style={[s.woodDot, { backgroundColor: w.color }]} />
                      <Text style={[s.woodBtnText, isActive && s.woodBtnTextActive]}>
                        {w.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.resetBtn}
              onPress={() => update(DEFAULT_TABLE_PREFERENCES)}
              activeOpacity={0.7}>
              <IconRefresh size={16} color="#94a39d" />
              <Text style={s.resetBtnText}>Restablecer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.applyBtn} onPress={onClose} activeOpacity={0.8}>
              <IconCheck size={18} color="#0a100d" strokeWidth={2.6} />
              <Text style={s.applyBtnText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const TableCustomizerModal = memo(TableCustomizerModalBase);
export default TableCustomizerModal;

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 8, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: '#0f1713',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e382e',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1a3027',
    backgroundColor: '#13221b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f3',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8aa196',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1a2c24',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 22,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.3,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#8aa196',
    lineHeight: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '48%',
    backgroundColor: '#14231c',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#1d3329',
  },
  presetCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#133526',
  },
  swatchCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  presetNameActive: {
    color: '#4ade80',
  },
  presetDesc: {
    fontSize: 10,
    color: '#718096',
    marginTop: 1,
  },
  customColorBox: {
    marginTop: 8,
    backgroundColor: '#14231c',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#1d3329',
    gap: 10,
  },
  customColorBoxActive: {
    borderColor: '#10b981',
  },
  customHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customInputWrapper: {
    flex: 1,
  },
  customInputLabel: {
    fontSize: 11,
    color: '#8aa196',
    marginBottom: 4,
  },
  hexInput: {
    height: 36,
    backgroundColor: '#0a100d',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#f1f5f3',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    borderWidth: 1,
    borderColor: '#264236',
  },
  quickPaletteRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  quickSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  quickSwatchActive: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  shapeCard: {
    flex: 1,
    backgroundColor: '#14231c',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1d3329',
    alignItems: 'center',
    gap: 6,
  },
  shapeCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#133526',
  },
  shapeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0a100d',
    borderWidth: 1,
    borderColor: '#264236',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  rhombusShape: {
    width: 14,
    height: 22,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '45deg' }, { scaleX: 0.65 }],
    borderColor: '#c27803',
    borderWidth: 1,
  },
  circleShape: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#c27803',
    borderWidth: 1,
  },
  shapeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  shapeCardTitleActive: {
    color: '#4ade80',
  },
  shapeCardSub: {
    fontSize: 11,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 14,
  },
  countCard: {
    flex: 1,
    backgroundColor: '#14231c',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1d3329',
    alignItems: 'center',
    gap: 6,
  },
  countCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#133526',
  },
  countCardBadge: {
    fontSize: 15,
    fontWeight: '800',
    color: '#94a39d',
    backgroundColor: '#0a100d',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#264236',
  },
  countCardBadgeActive: {
    color: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  countCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  countCardSub: {
    fontSize: 11,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14231c',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1e382d',
    marginTop: 4,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  switchSub: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
    lineHeight: 14,
  },
  woodRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  woodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#14231c',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1d3329',
  },
  woodBtnActive: {
    borderColor: '#10b981',
    backgroundColor: '#133526',
  },
  woodDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  woodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a39d',
  },
  woodBtnTextActive: {
    color: '#f1f5f3',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a3027',
    backgroundColor: '#13221b',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1a2c24',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a39d',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0a100d',
  },
});
