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
  Image,
  useWindowDimensions,
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
  TABLE_ARENA_SKINS,
  CUE_SKIN_PRESETS,
  applyArenaSkin,
  type CornerMetalStyle,
  type CueSkinId,
  type DiamondCount,
  type DiamondShape,
  type TablePreferences,
  type WoodFinish,
} from './tablePreferences';
import { TABLE_DECAL_DEFS } from './tableDecals';
import {
  type BreakFormat,
  type PbaFormationId,
  PBA_BREAK_FORMATIONS,
  getRandomPbaBreak,
} from '@bandaro/core';

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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
      <View style={[s.overlay, isMobile && { padding: 8 }]}>
        <View style={[s.modalContainer, isMobile && { width: '96%', maxHeight: '92%', borderRadius: 16 }]}>
          {/* Header */}
          <View style={[s.header, isMobile && { paddingHorizontal: 12, paddingVertical: 12 }]}>
            <View style={s.headerTitleRow}>
              <View style={s.headerIconBadge}>
                <IconSettings size={18} color="#10b981" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.headerTitle, isMobile && { fontSize: 14 }]}>Personalizar Mesa Canónica</Text>
                <Text style={[s.headerSubtitle, isMobile && { fontSize: 10.5 }]} numberOfLines={1}>
                  Configura skins, tipo de miras y paño
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <IconX size={18} color="#94a39d" />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, isMobile && { padding: 12, gap: 14 }]}>
            {/* SECCIÓN 0: SKINS OFICIALES DE ARENA (ESTILO 8-BALL POOL & TORNEO) */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Skins Temáticas de Arena (Estilo Torneo)</Text>
              <Text style={s.sectionDesc}>
                Aplica sets completos de competición inspirados en los mejores salones del mundo:
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.arenaSkinsScroll}>
                {TABLE_ARENA_SKINS.map((skin) => {
                  const isActive = preferences.activeSkinId === skin.id;
                  return (
                    <TouchableOpacity
                      key={skin.id}
                      style={[s.arenaSkinCard, isActive && s.arenaSkinCardActive]}
                      onPress={() => onChangePreferences(applyArenaSkin(skin.id, preferences))}
                      activeOpacity={0.8}>
                      <View
                        style={[
                          s.arenaPreviewBox,
                          {
                            backgroundColor: skin.clothColor,
                            borderColor: skin.accentGlow,
                          },
                        ]}>
                        <View
                          style={[
                            s.arenaPreviewBorder,
                            {
                              borderColor:
                                skin.woodFinish === 'ebony'
                                  ? '#1e120c'
                                  : skin.woodFinish === 'mahogany'
                                  ? '#3b1812'
                                  : '#3a2718',
                            },
                          ]}
                        />
                        <View
                          style={[
                            s.arenaPreviewCorner,
                            {
                              backgroundColor:
                                skin.cornerMetal === 'gold_24k'
                                  ? '#f59e0b'
                                  : skin.cornerMetal === 'chrome'
                                  ? '#cbd5e1'
                                  : skin.cornerMetal === 'neon_cyan'
                                  ? '#06b6d4'
                                  : skin.cornerMetal === 'antique_bronze'
                                  ? '#78350f'
                                  : '#d97706',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[s.arenaSkinName, isActive && s.arenaSkinNameActive]}>
                        {skin.name}
                      </Text>
                      <Text style={s.arenaSkinSub} numberOfLines={1}>
                        {skin.subtitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* SECCIÓN 1: POSICIÓN DE SALIDA OFICIAL (BREAK SHOT: UMB VS PBA) */}
            <View style={s.section}>
              <View style={s.sectionHeaderWithBadge}>
                <Text style={s.sectionTitle}>1. Posición de Salida Canónica</Text>
                <View
                  style={[
                    s.badgePill,
                    {
                      backgroundColor:
                        preferences.breakFormat === 'umb' ? '#0284c7' : '#d97706',
                    },
                  ]}>
                  <Text style={s.badgePillText}>
                    {preferences.breakFormat === 'umb' ? 'UMB MUNDIAL' : 'PBA TOUR'}
                  </Text>
                </View>
              </View>
              <Text style={s.sectionDesc}>
                Configura la posición oficial de salida por defecto al reiniciar o iniciar entrenamientos:
              </Text>

              <View style={s.optionsRow}>
                {/* Opción UMB */}
                <Pressable
                  style={[
                    s.shapeCard,
                    preferences.breakFormat === 'umb' && s.shapeCardActive,
                  ]}
                  onPress={() => update({ breakFormat: 'umb' })}>
                  <View style={s.shapeIconBox}>
                    <Text style={{ fontSize: 18 }}>🌍</Text>
                  </View>
                  <Text
                    style={[
                      s.shapeCardTitle,
                      preferences.breakFormat === 'umb' && s.shapeCardTitleActive,
                    ]}>
                    UMB Mundial
                  </Text>
                  <Text style={s.shapeCardSub}>
                    Salida tradicional: Roja en pie (3/4), Amarilla en salida (1/4) y Blanca a 18.25 cm
                  </Text>
                </Pressable>

                {/* Opción PBA */}
                <Pressable
                  style={[
                    s.shapeCard,
                    preferences.breakFormat === 'pba' && s.shapeCardActive,
                  ]}
                  onPress={() => update({ breakFormat: 'pba' })}>
                  <View style={s.shapeIconBox}>
                    <Text style={{ fontSize: 18 }}>🇰🇷</Text>
                  </View>
                  <Text
                    style={[
                      s.shapeCardTitle,
                      preferences.breakFormat === 'pba' && s.shapeCardTitleActive,
                    ]}>
                    PBA Pro Tour
                  </Text>
                  <Text style={s.shapeCardSub}>
                    Grilla de 9 spots con formaciones por sorteo (1-5-9, 3-5-7, 2-5-8...)
                  </Text>
                </Pressable>
              </View>

              {/* Sub-configuración según el formato elegido */}
              {preferences.breakFormat === 'umb' ? (
                <View style={s.subOptionBox}>
                  <Text style={s.subOptionTitle}>Lado de la Bola Blanca Tiradora (UMB):</Text>
                  <View style={s.subOptionRow}>
                    <TouchableOpacity
                      style={[
                        s.subOptionBtn,
                        preferences.umbSide === 'right' && s.subOptionBtnActive,
                      ]}
                      onPress={() => update({ umbSide: 'right' })}>
                      <Text
                        style={[
                          s.subOptionBtnText,
                          preferences.umbSide === 'right' && s.subOptionBtnTextActive,
                        ]}>
                        Lado Derecho (Estándar 18.25 cm)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.subOptionBtn,
                        preferences.umbSide === 'left' && s.subOptionBtnActive,
                      ]}
                      onPress={() => update({ umbSide: 'left' })}>
                      <Text
                        style={[
                          s.subOptionBtnText,
                          preferences.umbSide === 'left' && s.subOptionBtnTextActive,
                        ]}>
                        Lado Izquierdo (18.25 cm)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={s.subOptionBox}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}>
                    <Text style={s.subOptionTitle}>Formación Táctica PBA (9 Spots):</Text>
                    <TouchableOpacity
                      style={s.randomPbaBtn}
                      onPress={() => {
                        const rnd = getRandomPbaBreak();
                        if (rnd.formationId) {
                          update({ pbaFormation: rnd.formationId });
                        }
                      }}
                      activeOpacity={0.7}>
                      <IconRefresh size={12} color="#ffffff" />
                      <Text style={s.randomPbaBtnText}>Sortear (Azar)</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.pbaFormationsGrid}>
                    {(['159', '357', '258', '248', '268', '257', '259'] as PbaFormationId[]).map((fId) => {
                      const isSelected = preferences.pbaFormation === fId;
                      return (
                        <TouchableOpacity
                          key={fId}
                          style={[s.pbaCard, isSelected && s.pbaCardActive]}
                          onPress={() => update({ pbaFormation: fId })}
                          activeOpacity={0.8}>
                          <Text style={[s.pbaCardTitle, isSelected && s.pbaCardTitleActive]}>
                            {fId}
                          </Text>
                          <Text style={s.pbaCardName} numberOfLines={1}>
                            {fId === '159' ? 'Canónica' : fId === '357' ? 'Invertida' : fId === '258' ? 'Central' : fId}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* 2. SECCIÓN: COLOR & SKINS DEL PAÑO */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>1. Skin & Color del Paño Individual</Text>
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

            {/* 6. SECCIÓN: CANTONERAS METÁLICAS DE ESQUINA */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>6. Cantoneras Metálicas de Esquina</Text>
              <Text style={s.sectionDesc}>
                Herrajes de refuerzo pulidos con remaches estilo arcade de billar:
              </Text>
              <View style={s.woodRow}>
                {(
                  [
                    { id: 'brass', label: 'Bronce', color: '#b45309' },
                    { id: 'gold_24k', label: 'Oro 24K', color: '#f59e0b' },
                    { id: 'chrome', label: 'Cromo', color: '#94a3b8' },
                    { id: 'neon_cyan', label: 'Neón', color: '#06b6d4' },
                    { id: 'antique_bronze', label: 'Antiguo', color: '#78350f' },
                  ] as const
                ).map((m) => {
                  const isActive = preferences.cornerMetal === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      style={[s.woodBtn, isActive && s.woodBtnActive]}
                      onPress={() => update({ cornerMetal: m.id as CornerMetalStyle })}>
                      <View style={[s.woodDot, { backgroundColor: m.color }]} />
                      <Text style={[s.woodBtnText, isActive && s.woodBtnTextActive]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 7. SECCIÓN: EFECTOS VISUALES & ILUMINACIÓN DE TORNEO */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>7. Iluminación Cenital & Atmósfera</Text>

              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.switchLabel}>Foco Cenital de Torneo</Text>
                  <Text style={s.switchSub}>
                    Iluminación oval difusa sobre el paño inspirada en mesas de competición
                  </Text>
                </View>
                <Switch
                  value={preferences.showSpotlight}
                  onValueChange={(val) => update({ showSpotlight: val })}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor={preferences.showSpotlight ? '#10b981' : '#cbd5e1'}
                />
              </View>
            </View>

            {/* 6. SECCIÓN: CALCOMANÍAS & MARCA DE AGUA DEL PAÑO (STICKERS / SKINS) */}
            <View style={s.section}>
              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.sectionTitle}>6. Calcomanía de Paño (Stickers / Decals)</Text>
                  <Text style={s.switchSub}>
                    Graba una ilustración o emblema central en el paño con efecto marca de agua
                  </Text>
                </View>
                <Switch
                  value={preferences.showTableDecal}
                  onValueChange={(val) => update({ showTableDecal: val })}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor={preferences.showTableDecal ? '#10b981' : '#cbd5e1'}
                />
              </View>

              {preferences.showTableDecal && (
                <>
                  <Text style={[s.sectionDesc, { marginTop: 10 }]}>
                    Selecciona el diseño central para la mesa:
                  </Text>

                  <View style={s.decalGrid}>
                    {TABLE_DECAL_DEFS.map((decal) => {
                      const isSelected = preferences.tableDecal === decal.id;
                      return (
                        <TouchableOpacity
                          key={decal.id}
                          style={[s.decalCard, isSelected && s.decalCardActive]}
                          onPress={() => update({ tableDecal: decal.id })}
                          activeOpacity={0.75}>
                          <View style={s.decalBadgeBox}>
                            {decal.isImage && decal.imageSource ? (
                              <Image
                                source={decal.imageSource}
                                style={s.decalThumbImage}
                                resizeMode="contain"
                              />
                            ) : (
                              <Text style={s.decalBadgeIcon}>{decal.badge}</Text>
                            )}
                          </View>
                          <View style={s.decalInfo}>
                            <Text style={[s.decalName, isSelected && s.decalNameActive]}>
                              {decal.name}
                            </Text>
                            <Text style={s.decalDesc} numberOfLines={2}>
                              {decal.description}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={s.decalCheckDot}>
                              <IconCheck size={12} color="#0a100d" strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de Transparencia / Marca de Agua */}
                  {preferences.tableDecal !== 'none' && (
                    <View style={s.opacitySection}>
                      <Text style={s.opacityTitle}>Intensidad de la Marca de Agua (Transparencia):</Text>
                      <View style={s.opacityOptionsRow}>
                        {[
                          { label: 'Muy Sutil (10%)', val: 0.10 },
                          { label: 'Marca de Agua (18%) ⭐', val: 0.18 },
                          { label: 'Marcado (28%)', val: 0.28 },
                          { label: 'Intenso (40%)', val: 0.40 },
                        ].map((op) => {
                          const isActive = Math.abs((preferences.decalOpacity ?? 0.18) - op.val) < 0.04;
                          return (
                            <TouchableOpacity
                              key={op.val}
                              style={[s.opacityBtn, isActive && s.opacityBtnActive]}
                              onPress={() => update({ decalOpacity: op.val })}>
                              <Text style={[s.opacityBtnText, isActive && s.opacityBtnTextActive]}>
                                {op.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* 6. SECCIÓN: MODELO DE TACO DE BILLAR */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Taco de Billar Oficial (Cue Skin)</Text>
              <Text style={s.sectionDesc}>
                Elige el modelo y acabado estético de tu taco de competición:
              </Text>

              <View style={{ gap: 10, marginTop: 8 }}>
                {CUE_SKIN_PRESETS.map((cue) => {
                  const isSelected = (preferences.cueSkin ?? 'venom_azure') === cue.id;
                  return (
                    <TouchableOpacity
                      key={cue.id}
                      style={[
                        s.cueCard,
                        isSelected && { borderColor: cue.accentColor, backgroundColor: 'rgba(2, 132, 199, 0.12)' },
                      ]}
                      onPress={() => update({ cueSkin: cue.id })}
                      activeOpacity={0.8}>
                      <View style={[s.cueColorIndicator, { backgroundColor: cue.primaryColor, borderColor: cue.accentColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.cueCardTitle, isSelected && { color: cue.accentColor }]}>
                          {cue.name}
                        </Text>
                        <Text style={s.cueCardSub}>{cue.subtitle}</Text>
                        <Text style={s.cueCardDesc} numberOfLines={2}>
                          {cue.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[s.cueCheckBadge, { backgroundColor: cue.accentColor }]}>
                          <IconCheck size={12} color="#020617" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
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
  arenaSkinsScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  arenaSkinCard: {
    width: 140,
    backgroundColor: '#14231c',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#1d3329',
    alignItems: 'center',
    gap: 6,
  },
  arenaSkinCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#133526',
  },
  arenaPreviewBox: {
    width: 110,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arenaPreviewBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderRadius: 6,
  },
  arenaPreviewCorner: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  arenaSkinName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  arenaSkinNameActive: {
    color: '#34d399',
  },
  arenaSkinSub: {
    fontSize: 10,
    color: '#8aa196',
    textAlign: 'center',
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  woodBtn: {
    flex: 1,
    minWidth: 95,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#14231c',
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  decalGrid: {
    gap: 8,
    marginTop: 8,
  },
  decalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12231c',
    borderWidth: 1,
    borderColor: '#1e382d',
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  decalCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#173327',
  },
  decalBadgeBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0a1611',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e382d',
    overflow: 'hidden',
  },
  decalThumbImage: {
    width: 38,
    height: 38,
  },
  decalBadgeIcon: {
    fontSize: 20,
  },
  decalInfo: {
    flex: 1,
    gap: 2,
  },
  decalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f5f3',
  },
  decalNameActive: {
    color: '#34d399',
  },
  decalDesc: {
    fontSize: 11,
    color: '#94a39d',
    lineHeight: 14,
  },
  decalCheckDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opacitySection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0c1913',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#193328',
    gap: 8,
  },
  opacityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  opacityOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  opacityBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#13241d',
    borderWidth: 1,
    borderColor: '#1e382d',
  },
  opacityBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  opacityBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a39d',
  },
  opacityBtnTextActive: {
    color: '#0a100d',
    fontWeight: '700',
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
  cueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  cueColorIndicator: {
    width: 22,
    height: 48,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  cueCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cueCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 1,
  },
  cueCardDesc: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 14,
  },
  cueCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subOptionBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  subOptionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
  },
  subOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subOptionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
  },
  subOptionBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  subOptionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  subOptionBtnTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  randomPbaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#0284c7',
  },
  randomPbaBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  pbaFormationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pbaCard: {
    minWidth: 64,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
  },
  pbaCardActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  pbaCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  pbaCardTitleActive: {
    color: '#fbbf24',
  },
  pbaCardName: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 1,
  },
});
