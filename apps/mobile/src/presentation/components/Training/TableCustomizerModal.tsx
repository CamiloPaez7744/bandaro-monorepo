import { memo, useState, useEffect } from 'react';
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
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
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

const getQuickColors = (lang: string) => [
  { name: lang === 'en' ? 'Crimson Red' : 'Rojo Carmesí', hex: '#b91c1c' },
  { name: lang === 'en' ? 'Imperial Purple' : 'Púrpura Imperial', hex: '#6b21a8' },
  { name: lang === 'en' ? 'Electric Blue' : 'Azul Eléctrico', hex: '#0284c7' },
  { name: lang === 'en' ? 'Emerald Green' : 'Verde Esmeralda', hex: '#047857' },
  { name: lang === 'en' ? 'Pure Carbon' : 'Carbón Puro', hex: '#18181b' },
  { name: lang === 'en' ? 'Warm Amber' : 'Ámbar Cálido', hex: '#b45309' },
];

const getArenaSkinTexts = (skin: (typeof TABLE_ARENA_SKINS)[0], lang: string) => {
  if (lang === 'en') {
    switch (skin.id) {
      case 'rebel_skull':
        return {
          name: 'Rebel Skull Arena',
          subtitle: 'Street & Rock Skull Edition',
          description: 'Bold design featuring the iconic Skull watermark, high-contrast charcoal cloth, ebony wood and chrome corner fittings.',
        };
      case 'tournament_umb':
        return {
          name: 'UMB Tournament Arena',
          subtitle: 'Official Simonis 300 Rapide',
          description: 'The official world championship table. Classic blue cloth, mahogany rails and satin brass corners.',
        };
      case 'royal_high_roller':
        return {
          name: 'Royal High Roller',
          subtitle: 'Las Vegas VIP Edition',
          description: 'Absolute luxury: midnight blue cloth with gold inlays, piano black lacquer finish and 24K gold corner plates.',
        };
      case 'neo_tokyo_cyber':
        return {
          name: 'Neo-Tokyo Cybercarom',
          subtitle: 'Futuristic & Luminescent',
          description: 'Cyberpunk arcade aesthetic: graphite/electric cyan cloth, black carbon fiber frame and glowing cyan neon inserts.',
        };
      case 'monte_carlo_luxe':
        return {
          name: 'Monte Carlo Grand Luxe',
          subtitle: 'European Riviera Casino',
          description: 'Refined emerald green baize with warm walnut borders and antique bronze finishes.',
        };
      default:
        return { name: skin.name, subtitle: skin.subtitle, description: skin.description };
    }
  }
  return { name: skin.name, subtitle: skin.subtitle, description: skin.description };
};

const getClothPresetTexts = (preset: (typeof CLOTH_SKIN_PRESETS)[0], lang: string) => {
  if (lang === 'en') {
    switch (preset.id) {
      case 'tournament_blue':
        return { name: 'Tournament Blue', description: 'Official UMB Simonis 300 Rapide' };
      case 'simonis_green':
        return { name: 'Classic Green', description: 'Traditional carom billiards green' };
      case 'dufferin_burgundy':
        return { name: 'Burgundy Wine', description: 'Elegant velvet garnet' };
      case 'royal_navy':
        return { name: 'Navy Blue', description: 'Deep midnight blue with high visibility' };
      case 'slate_charcoal':
        return { name: 'Anthracite Gray', description: 'Modern minimalist style' };
      case 'golden_camel':
        return { name: 'Golden Camel', description: 'Warm classic habano tone' };
      default:
        return { name: preset.name, description: preset.description };
    }
  }
  return { name: preset.name, description: preset.description };
};

const getDecalName = (decal: (typeof TABLE_DECAL_DEFS)[0], lang: string) => {
  if (lang === 'en') {
    switch (decal.id) {
      case 'none':
        return 'No Decal';
      case 'blackhole':
        return 'Black Hole';
      case 'skull':
        return 'Rebel Skull';
      case 'constelacion':
        return 'Polar Constellation';
      case 'pulpo':
        return 'Carom Octopus';
      case 'tiburon':
        return 'Predator Shark';
      case 'tigre':
        return 'Royal Tiger';
      case 'trofeo':
        return 'UMB Trophy';
      default:
        return decal.name;
    }
  }
  return decal.name;
};

const getCueTexts = (cue: (typeof CUE_SKIN_PRESETS)[0], lang: string) => {
  if (lang === 'en') {
    switch (cue.id) {
      case 'venom_azure':
        return {
          name: 'Venom Azure WS',
          tag: 'Pro Edition',
          subtitle: 'Pro Edition • Electric Blue Neon',
        };
      case 'classic_gold':
        return {
          name: 'Classic Ebony & Gold',
          tag: 'Selected Maple',
          subtitle: 'Canadian Maple • 24K Gold Inlays',
        };
      case 'carbon_stealth':
        return {
          name: 'Carbon Stealth Pro',
          tag: 'Aerospace Carbon',
          subtitle: 'Aerospace Carbon • Matte Stealth',
        };
      default:
        return {
          name: cue.name,
          tag: cue.subtitle.split('•')[0].trim(),
          subtitle: cue.subtitle,
        };
    }
  }
  return {
    name: cue.name,
    tag: cue.subtitle.split('•')[0].trim(),
    subtitle: cue.subtitle,
  };
};

function TableCustomizerModalBase({
  visible,
  preferences,
  onClose,
  onChangePreferences,
}: TableCustomizerModalProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { t, language } = useI18n();
  const colorScheme = useColorScheme();
  const palette = getPalette(colorScheme);
  const isDark = colorScheme === 'dark';
  const s = getStyles(palette, isDark);

  const [customHex, setCustomHex] = useState(
    preferences.clothColor.startsWith('#') ? preferences.clothColor : '#0f766e'
  );

  useEffect(() => {
    if (preferences.clothColor.startsWith('#')) {
      setCustomHex(preferences.clothColor);
    }
  }, [preferences.clothColor, visible]);

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
                <Text style={[s.headerTitle, isMobile && { fontSize: 14 }]}>
                  {language === 'en' ? 'Customize Canonical Table' : 'Personalizar Mesa Canónica'}
                </Text>
                <Text style={[s.headerSubtitle, isMobile && { fontSize: 10.5 }]} numberOfLines={1}>
                  {language === 'en' ? 'Configure skins, sight types and cloth' : 'Configura skins, tipo de miras y paño'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={onClose}
              accessibilityLabel={t('common.close')}
              activeOpacity={0.7}>
              <IconX size={18} color={isDark ? '#94a39d' : palette.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, isMobile && { padding: 12, gap: 14 }]}>
            {/* SECCIÓN 0: SKINS OFICIALES DE ARENA (ESTILO 8-BALL POOL & TORNEO) */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? 'Themed Arena Skins (Tournament Style)' : 'Skins Temáticas de Arena (Estilo Torneo)'}
              </Text>
              <Text style={s.sectionDesc}>
                {language === 'en'
                  ? 'Apply complete competition sets inspired by the world’s top halls:'
                  : 'Aplica sets completos de competición inspirados en los mejores salones del mundo:'}
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.arenaSkinsScroll}>
                {TABLE_ARENA_SKINS.map((skin) => {
                  const isActive = preferences.activeSkinId === skin.id;
                  const skinTexts = getArenaSkinTexts(skin, language);
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
                        {skinTexts.name}
                      </Text>
                      <Text style={s.arenaSkinSub} numberOfLines={1}>
                        {skinTexts.subtitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* SECCIÓN 1: POSICIÓN DE SALIDA OFICIAL (BREAK SHOT: UMB VS PBA) */}
            <View style={s.section}>
              <View style={s.sectionHeaderWithBadge}>
                <Text style={s.sectionTitle}>
                  {language === 'en' ? '1. Canonical Break Position' : '1. Posición de Salida Canónica'}
                </Text>
                <View
                  style={[
                    s.badgePill,
                    {
                      backgroundColor:
                        preferences.breakFormat === 'umb' ? '#0284c7' : '#d97706',
                    },
                  ]}>
                  <Text style={s.badgePillText}>
                    {preferences.breakFormat === 'umb'
                      ? (language === 'en' ? 'WORLD UMB' : 'UMB MUNDIAL')
                      : 'PBA TOUR'}
                  </Text>
                </View>
              </View>
              <Text style={s.sectionDesc}>
                {language === 'en'
                  ? 'Configure default official break position upon restarting or starting training:'
                  : 'Configura la posición oficial de salida por defecto al reiniciar o iniciar entrenamientos:'}
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
                    {language === 'en' ? 'World UMB' : 'UMB Mundial'}
                  </Text>
                  <Text style={s.shapeCardSub}>
                    {language === 'en'
                      ? 'Traditional break: Red at foot (3/4), Yellow at head (1/4), White at 18.25 cm'
                      : 'Salida tradicional: Roja en pie (3/4), Amarilla en salida (1/4) y Blanca a 18.25 cm'}
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
                    {language === 'en'
                      ? '9-spot grid with draw-based formations (1-5-9, 3-5-7, 2-5-8...)'
                      : 'Grilla de 9 spots con formaciones por sorteo (1-5-9, 3-5-7, 2-5-8...)'}
                  </Text>
                </Pressable>
              </View>

              {/* Sub-configuración según el formato elegido */}
              {preferences.breakFormat === 'umb' ? (
                <View style={s.subOptionBox}>
                  <Text style={s.subOptionTitle}>
                    {language === 'en' ? 'Cue Ball Side (UMB):' : 'Lado de la Bola Blanca Tiradora (UMB):'}
                  </Text>
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
                        {language === 'en' ? 'Right Side (Standard 18.25 cm)' : 'Lado Derecho (Estándar 18.25 cm)'}
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
                        {language === 'en' ? 'Left Side (18.25 cm)' : 'Lado Izquierdo (18.25 cm)'}
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
                    <Text style={s.subOptionTitle}>
                      {language === 'en' ? 'PBA Tactical Formation (9 Spots):' : 'Formación Táctica PBA (9 Spots):'}
                    </Text>
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
                      <Text style={s.randomPbaBtnText}>
                        {language === 'en' ? 'Draw (Random)' : 'Sortear (Azar)'}
                      </Text>
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
                            {fId === '159'
                              ? (language === 'en' ? 'Canonical' : 'Canónica')
                              : fId === '357'
                              ? (language === 'en' ? 'Inverted' : 'Invertida')
                              : fId === '258'
                              ? (language === 'en' ? 'Center' : 'Central')
                              : fId}
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
              <Text style={s.sectionTitle}>
                {language === 'en' ? '2. Individual Cloth Skin & Color' : '2. Skin & Color del Paño Individual'}
              </Text>
              <Text style={s.sectionDesc}>
                {language === 'en'
                  ? 'Choose an official tournament cloth or define your own custom color:'
                  : 'Elige un paño oficial de torneo o define tu propio color personalizado:'}
              </Text>

              <View style={s.presetsGrid}>
                {CLOTH_SKIN_PRESETS.map((p) => {
                  const isActive = preferences.clothColor === p.id;
                  const clothTexts = getClothPresetTexts(p, language);
                  return (
                    <Pressable
                      key={p.id}
                      style={[
                        s.presetCard,
                        !isMobile && s.presetCardWide,
                        isActive && s.presetCardActive,
                      ]}
                      onPress={() => update({ clothColor: p.id })}>
                      <View style={[s.swatchCircle, { backgroundColor: p.hex }]}>
                        {isActive && <IconCheck size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <View style={s.presetInfo}>
                        <Text style={[s.presetName, isActive && s.presetNameActive]}>
                          {clothTexts.name}
                        </Text>
                        <Text style={s.presetDesc} numberOfLines={1}>
                          {clothTexts.description}
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
                    <Text style={s.customInputLabel}>
                      {language === 'en' ? 'Custom Hex Color' : 'Color Hexadecimal Libre'}
                    </Text>
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
                  {getQuickColors(language).map((c) => (
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

            {/* 3. SECCIÓN: FORMA DE LAS MIRAS (DIAMANTES VS PUNTOS) */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? '3. Sight / Marker Shape' : '3. Forma de las Miras (Marcadores)'}
              </Text>
              <Text style={s.sectionDesc}>
                {language === 'en'
                  ? 'Choose between elongated diamonds or traditional circular spots:'
                  : 'Elige entre rombos alargados o puntos circulares tradicionales:'}
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
                    {language === 'en' ? 'Diamonds (Rhombuses)' : 'Diamantes (Rombos)'}
                  </Text>
                  <Text style={s.shapeCardSub}>
                    {language === 'en'
                      ? 'Point with precision towards the center of the table'
                      : 'Apuntan con precisión hacia el centro de la mesa'}
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
                    {language === 'en' ? 'Circular Spots' : 'Puntos Circulares'}
                  </Text>
                  <Text style={s.shapeCardSub}>
                    {language === 'en'
                      ? 'Traditional round mother-of-pearl / ivory markers'
                      : 'Marcadores redondos tradicionales de nácar / marfil'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 4. SECCIÓN: CONTEO DE MIRAS Y ESQUINAS */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? '4. Sight Count & Corners' : '4. Conteo de Miras & Esquinas'}
              </Text>
              <Text style={s.sectionDesc}>
                {language === 'en'
                  ? 'Distribution of markers along the cushions:'
                  : 'Distribución de marcadores a lo largo de las bandas:'}
              </Text>

              <View style={s.optionsRow}>
                <Pressable
                  style={[
                    s.countCard,
                    preferences.diamondCount === '9_5' && s.countCardActive,
                  ]}
                  onPress={() => update({ diamondCount: '9_5', showCornerDiamonds: true })}>
                  <Text
                    style={[
                      s.countCardBadge,
                      preferences.diamondCount === '9_5' && s.countCardBadgeActive,
                    ]}>
                    {language === 'en' ? '9 & 5' : '9 y 5'}
                  </Text>
                  <Text style={s.countCardTitle}>
                    {language === 'en' ? 'With Corners' : 'Con Esquinas'}
                  </Text>
                  <Text style={s.countCardSub}>
                    {language === 'en'
                      ? '9 on long cushion, 5 on short cushion (UMB Standard)'
                      : '9 en banda larga, 5 en banda corta (Estándar UMB)'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    s.countCard,
                    preferences.diamondCount === '7_3' && s.countCardActive,
                  ]}
                  onPress={() => update({ diamondCount: '7_3', showCornerDiamonds: false })}>
                  <Text
                    style={[
                      s.countCardBadge,
                      preferences.diamondCount === '7_3' && s.countCardBadgeActive,
                    ]}>
                    {language === 'en' ? '7 & 3' : '7 y 3'}
                  </Text>
                  <Text style={s.countCardTitle}>
                    {language === 'en' ? 'Without Corners' : 'Sin Esquinas'}
                  </Text>
                  <Text style={s.countCardSub}>
                    {language === 'en'
                      ? '7 on long cushion, 3 on short cushion (Inner only)'
                      : '7 en banda larga, 3 en banda corta (Interiores)'}
                  </Text>
                </Pressable>
              </View>

              {/* Interruptor específico para diamantes de esquina */}
              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.switchLabel}>
                    {language === 'en' ? 'Show Corner Sights' : 'Mostrar Miras de Esquina'}
                  </Text>
                  <Text style={s.switchSub}>
                    {language === 'en'
                      ? 'Places two markers at each corner aligned with cushion edge'
                      : 'Coloca dos marcadores en cada esquina alineados con el filo de la banda'}
                  </Text>
                </View>
                <Switch
                  value={preferences.diamondCount === '9_5' && preferences.showCornerDiamonds !== false}
                  onValueChange={(val) => update({
                    showCornerDiamonds: val,
                    diamondCount: val ? '9_5' : '7_3',
                  })}
                  trackColor={{ false: '#334155', true: '#059669' }}
                  thumbColor={(preferences.diamondCount === '9_5' && preferences.showCornerDiamonds !== false) ? '#10b981' : '#cbd5e1'}
                />
              </View>
            </View>

            {/* 5. SECCIÓN: GUÍAS TÁCTICAS Y SISTEMA DE DIAMANTES */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? '5. Tactical Guides & Grid' : '5. Guías Tácticas & Cuadrícula'}
              </Text>

              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.switchLabel}>
                    {language === 'en' ? '8×4 Tactical Grid' : 'Cuadrícula Táctica 8×4'}
                  </Text>
                  <Text style={s.switchSub}>
                    {language === 'en'
                      ? 'Dashed lines connecting diamonds in 35.5 cm modules'
                      : 'Líneas punteadas que unen los diamantes en módulos de 35.5 cm'}
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
                  <Text style={s.switchLabel}>
                    {language === 'en' ? 'Diamond Numbering' : 'Numeración de Diamantes'}
                  </Text>
                  <Text style={s.switchSub}>
                    {language === 'en'
                      ? 'Base 50 System values (0..80 long cushion, 0..40 short cushion)'
                      : 'Valores del Sistema Base 50 (0..80 en larga, 0..40 en corta)'}
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

            {/* 6. SECCIÓN: TONO DEL PASAMANOS (MADERA) */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? '6. Wood Finish' : '6. Acabado de la Madera'}
              </Text>
              <View style={s.woodRow}>
                {(
                  [
                    { id: 'ebony', label: language === 'en' ? 'Black Ebony' : 'Ébano Negro', color: '#1e120c' },
                    { id: 'mahogany', label: language === 'en' ? 'Royal Mahogany' : 'Caoba Real', color: '#3b1812' },
                    { id: 'walnut', label: language === 'en' ? 'Warm Walnut' : 'Nogal Cálido', color: '#3a2718' },
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

            {/* 7. SECCIÓN: CANTONERAS METÁLICAS DE ESQUINA */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? '7. Metal Corner Castings' : '7. Cantoneras Metálicas de Esquina'}
              </Text>
              <Text style={s.sectionDesc}>
                {language === 'en'
                  ? 'Polished reinforcement fittings with arcade carom styling:'
                  : 'Herrajes de refuerzo pulidos con remaches estilo arcade de billar:'}
              </Text>
              <View style={s.woodRow}>
                {(
                  [
                    { id: 'brass', label: language === 'en' ? 'Brass' : 'Bronce', color: '#b45309' },
                    { id: 'gold_24k', label: language === 'en' ? '24K Gold' : 'Oro 24K', color: '#f59e0b' },
                    { id: 'chrome', label: language === 'en' ? 'Chrome' : 'Cromo', color: '#94a3b8' },
                    { id: 'neon_cyan', label: language === 'en' ? 'Neon' : 'Neón', color: '#06b6d4' },
                    { id: 'antique_bronze', label: language === 'en' ? 'Antique' : 'Antiguo', color: '#78350f' },
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

            {/* 8. SECCIÓN: EFECTOS VISUALES & ILUMINACIÓN DE TORNEO */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? '8. Spotlight & Atmosphere' : '8. Iluminación Cenital & Atmósfera'}
              </Text>

              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.switchLabel}>
                    {language === 'en' ? 'Tournament Spotlight' : 'Foco Cenital de Torneo'}
                  </Text>
                  <Text style={s.switchSub}>
                    {language === 'en'
                      ? 'Diffuse oval lighting on the cloth inspired by tournament tables'
                      : 'Iluminación oval difusa sobre el paño inspirada en mesas de competición'}
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

            {/* 9. SECCIÓN: CALCOMANÍAS & MARCA DE AGUA DEL PAÑO (STICKERS / SKINS) */}
            <View style={s.section}>
              <View style={s.switchRow}>
                <View style={s.switchTextCol}>
                  <Text style={s.sectionTitle}>
                    {language === 'en' ? '9. Cloth Decal (Stickers / Watermark)' : '9. Calcomanía de Paño (Stickers / Decals)'}
                  </Text>
                  <Text style={s.switchSub}>
                    {language === 'en'
                      ? 'Engrave a central illustration or emblem onto the cloth with watermark effect'
                      : 'Graba una ilustración o emblema central en el paño con efecto marca de agua'}
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
                    {language === 'en' ? 'Select central table design:' : 'Selecciona el diseño central para la mesa:'}
                  </Text>

                  <View style={s.decalVisualGrid}>
                    {TABLE_DECAL_DEFS.map((decal) => {
                      const isSelected = preferences.tableDecal === decal.id;
                      return (
                        <TouchableOpacity
                          key={decal.id}
                          style={[
                            s.decalVisualCard,
                            !isMobile && s.decalVisualCardWide,
                            isSelected && s.decalVisualCardActive,
                          ]}
                          onPress={() => update({ tableDecal: decal.id })}
                          activeOpacity={0.75}>
                          <View style={s.decalVisualPreview}>
                            {decal.isImage && decal.imageSource ? (
                              <Image
                                source={decal.imageSource}
                                style={s.decalVisualImage}
                                resizeMode="contain"
                              />
                            ) : (
                              <Text style={s.decalVisualEmptyIcon}>{decal.badge}</Text>
                            )}
                          </View>
                          <Text style={[s.decalVisualName, isSelected && s.decalVisualNameActive]} numberOfLines={1}>
                            {getDecalName(decal, language)}
                          </Text>
                          {isSelected && (
                            <View style={s.decalVisualCheckDot}>
                              <IconCheck size={11} color="#0a100d" strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selector de Transparencia / Marca de Agua */}
                  {preferences.tableDecal !== 'none' && (
                    <View style={s.opacitySection}>
                      <Text style={s.opacityTitle}>
                        {language === 'en' ? 'Watermark Opacity (Intensity):' : 'Intensidad de la Marca de Agua (Transparencia):'}
                      </Text>
                      <View style={s.opacityOptionsRow}>
                        {[
                          { label: language === 'en' ? 'Subtle (10%)' : 'Muy Sutil (10%)', val: 0.10 },
                          { label: language === 'en' ? 'Watermark (20%) ⭐' : 'Marca de Agua (20%) ⭐', val: 0.20 },
                          { label: language === 'en' ? 'Pronounced (30%)' : 'Marcado (30%)', val: 0.30 },
                          { label: language === 'en' ? 'Vibrant (45%)' : 'Intenso (45%)', val: 0.45 },
                        ].map((op) => {
                          const isActive = Math.abs((preferences.decalOpacity ?? 0.20) - op.val) < 0.04;
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

            {/* SECCIÓN: MODELO DE TACO DE BILLAR */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                {language === 'en' ? 'Official Billiard Cue (Cue Skin)' : 'Taco de Billar Oficial (Cue Skin)'}
              </Text>
              <Text style={s.sectionDesc}>
                {language === 'en'
                  ? 'Choose the visual design of your competition cue:'
                  : 'Elige el diseño visual de tu taco de competición:'}
              </Text>

              <View style={[s.cuesGrid, !isMobile && s.cuesGridWide]}>
                {CUE_SKIN_PRESETS.map((cue) => {
                  const isSelected = (preferences.cueSkin ?? 'venom_azure') === cue.id;
                  const isCarbon = cue.id === 'carbon_stealth';
                  const isClassic = cue.id === 'classic_gold';
                  const cueTexts = getCueTexts(cue, language);

                  return (
                    <TouchableOpacity
                      key={cue.id}
                      style={[
                        s.visualCueCard,
                        !isMobile && s.visualCueCardWide,
                        isSelected && { borderColor: cue.accentColor, backgroundColor: `${cue.primaryColor}18` },
                      ]}
                      onPress={() => update({ cueSkin: cue.id })}
                      activeOpacity={0.8}>
                      {/* 1. Realistic Cue Stick Visual Graphic */}
                      <View style={s.cueStickGraphicRow}>
                        {/* Rubber Bumper */}
                        <View style={s.cueBumper} />
                        {/* Butt Sleeve */}
                        <View style={[s.cueButtSleeve, { backgroundColor: isCarbon ? '#18181b' : isClassic ? '#2b1810' : '#0f172a' }]}>
                          <View style={[s.cueAccentRing, { backgroundColor: cue.accentColor }]} />
                        </View>
                        {/* Grip / Wrap */}
                        <View style={[s.cueWrapGrip, { backgroundColor: isCarbon ? '#09090b' : isClassic ? '#1c1917' : '#020617' }]}>
                          <View style={[s.cueWrapTexture, { borderColor: `${cue.accentColor}40` }]} />
                        </View>
                        {/* Forearm with Inlaid Flames */}
                        <View style={[s.cueForearm, { backgroundColor: isCarbon ? '#1c1917' : isClassic ? '#3b2314' : '#0f172a' }]}>
                          <View style={[s.cueInlayFlame, { borderLeftColor: cue.accentColor }]} />
                        </View>
                        {/* Joint Collar (Metal) */}
                        <View style={[s.cueJointCollar, { backgroundColor: isClassic ? '#f59e0b' : '#cbd5e1' }]} />
                        {/* Shaft */}
                        <View style={[s.cueShaft, { backgroundColor: isCarbon ? '#27272a' : isClassic ? '#fde047' : '#0284c7' }]}>
                          <View style={[s.cueShaftGlow, { backgroundColor: isCarbon ? '#3f3f46' : isClassic ? '#fef08a' : '#38bdf8' }]} />
                        </View>
                        {/* Ferrule (Ivory White) */}
                        <View style={s.cueFerrule} />
                        {/* Tip (Master Chalk Blue) */}
                        <View style={s.cueTip} />
                      </View>

                      {/* 2. Cue Info Row (Name + Edition Tag) */}
                      <View style={s.cueInfoRow}>
                        <Text style={[s.visualCueName, isSelected && { color: cue.accentColor }]}>
                          {cueTexts.name}
                        </Text>
                        <View style={[s.cueTagPill, { borderColor: `${cue.accentColor}60`, backgroundColor: `${cue.accentColor}18` }]}>
                          <Text style={[s.cueTagPillText, { color: cue.accentColor }]}>
                            {cueTexts.tag}
                          </Text>
                        </View>
                      </View>

                      {isSelected && (
                        <View style={[s.visualCueCheckBadge, { backgroundColor: cue.accentColor }]}>
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
              <IconRefresh size={16} color={isDark ? '#94a39d' : palette.muted} />
              <Text style={s.resetBtnText}>{language === 'en' ? 'Reset' : 'Restablecer'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.applyBtn} onPress={onClose} activeOpacity={0.8}>
              <IconCheck size={18} color="#0a100d" strokeWidth={2.6} />
              <Text style={s.applyBtnText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const TableCustomizerModal = memo(TableCustomizerModalBase);
export default TableCustomizerModal;

const getStyles = (palette: ReturnType<typeof getPalette>, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(5, 10, 8, 0.82)' : 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContainer: {
      width: '95%',
      maxWidth: 1040,
      maxHeight: '90%',
      backgroundColor: isDark ? '#0f1713' : palette.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#1e382e' : palette.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.5 : 0.15,
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
      borderBottomColor: isDark ? '#1a3027' : palette.border,
      backgroundColor: isDark ? '#13221b' : palette.surfaceLow,
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
      color: isDark ? '#f1f5f3' : palette.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: isDark ? '#8aa196' : palette.muted,
      marginTop: 2,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: isDark ? '#1a2c24' : '#e2e8f0',
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
      color: isDark ? '#8aa196' : palette.muted,
      lineHeight: 16,
    },
    arenaSkinsScroll: {
      gap: 12,
      paddingVertical: 4,
    },
    arenaSkinCard: {
      width: 140,
      backgroundColor: isDark ? '#14231c' : '#f8fafc',
      borderRadius: 14,
      padding: 10,
      borderWidth: 1.5,
      borderColor: isDark ? '#1d3329' : '#e2e8f0',
      alignItems: 'center',
      gap: 6,
    },
    arenaSkinCardActive: {
      borderColor: '#10b981',
      backgroundColor: isDark ? '#133526' : '#ecfdf5',
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
      ...StyleSheet.absoluteFill,
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
      color: isDark ? '#e2e8f0' : palette.text,
      textAlign: 'center',
    },
    arenaSkinNameActive: {
      color: isDark ? '#34d399' : '#059669',
    },
    arenaSkinSub: {
      fontSize: 10,
      color: isDark ? '#8aa196' : palette.muted,
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
      backgroundColor: isDark ? '#14231c' : '#f8fafc',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1.5,
      borderColor: isDark ? '#1d3329' : '#e2e8f0',
    },
    presetCardWide: {
      width: '31.8%',
    },
    presetCardActive: {
      borderColor: '#10b981',
      backgroundColor: isDark ? '#133526' : '#ecfdf5',
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
      color: isDark ? '#e2e8f0' : palette.text,
    },
    presetNameActive: {
      color: isDark ? '#4ade80' : '#059669',
    },
    presetDesc: {
      fontSize: 10,
      color: isDark ? '#718096' : palette.muted,
      marginTop: 1,
    },
    customColorBox: {
      marginTop: 8,
      backgroundColor: isDark ? '#14231c' : '#f8fafc',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1.5,
      borderColor: isDark ? '#1d3329' : '#e2e8f0',
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
      color: isDark ? '#8aa196' : palette.muted,
      marginBottom: 4,
    },
    hexInput: {
      height: 36,
      backgroundColor: isDark ? '#0a100d' : '#ffffff',
      borderRadius: 8,
      paddingHorizontal: 12,
      color: isDark ? '#f1f5f3' : palette.text,
      fontSize: 13,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      borderWidth: 1,
      borderColor: isDark ? '#264236' : '#cbd5e1',
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
      borderColor: isDark ? '#ffffff' : '#0f172a',
      transform: [{ scale: 1.15 }],
    },
    optionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    shapeCard: {
      flex: 1,
      backgroundColor: isDark ? '#14231c' : '#f8fafc',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: isDark ? '#1d3329' : '#e2e8f0',
      alignItems: 'center',
      gap: 6,
    },
    shapeCardActive: {
      borderColor: '#10b981',
      backgroundColor: isDark ? '#133526' : '#ecfdf5',
    },
    shapeIconBox: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: isDark ? '#0a100d' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#264236' : '#e2e8f0',
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
      color: isDark ? '#e2e8f0' : palette.text,
      textAlign: 'center',
    },
    shapeCardTitleActive: {
      color: isDark ? '#4ade80' : '#059669',
    },
    shapeCardSub: {
      fontSize: 11,
      color: isDark ? '#718096' : palette.muted,
      textAlign: 'center',
      lineHeight: 14,
    },
    countCard: {
      flex: 1,
      backgroundColor: isDark ? '#14231c' : '#f8fafc',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: isDark ? '#1d3329' : '#e2e8f0',
      alignItems: 'center',
      gap: 6,
    },
    countCardActive: {
      borderColor: '#10b981',
      backgroundColor: isDark ? '#133526' : '#ecfdf5',
    },
    countCardBadge: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#94a39d' : palette.muted,
      backgroundColor: isDark ? '#0a100d' : '#ffffff',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? '#264236' : '#e2e8f0',
    },
    countCardBadgeActive: {
      color: '#10b981',
      borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    countCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : palette.text,
      textAlign: 'center',
    },
    countCardSub: {
      fontSize: 11,
      color: isDark ? '#718096' : palette.muted,
      textAlign: 'center',
      lineHeight: 14,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#14231c' : '#f8fafc',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: isDark ? '#1e382d' : '#e2e8f0',
      marginTop: 4,
    },
    switchTextCol: {
      flex: 1,
      paddingRight: 12,
    },
    switchLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#e2e8f0' : palette.text,
    },
    switchSub: {
      fontSize: 11,
      color: isDark ? '#718096' : palette.muted,
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
      backgroundColor: isDark ? '#14231c' : '#f8fafc',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: isDark ? '#1d3329' : '#e2e8f0',
    },
    woodBtnActive: {
      borderColor: '#10b981',
      backgroundColor: isDark ? '#133526' : '#ecfdf5',
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
      color: isDark ? '#94a39d' : palette.muted,
    },
    woodBtnTextActive: {
      color: isDark ? '#f1f5f3' : '#065f46',
    },
    decalVisualGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    decalVisualCard: {
      width: '23%',
      minWidth: 68,
      backgroundColor: isDark ? '#12231c' : '#f8fafc',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? '#1e382d' : '#e2e8f0',
      padding: 6,
      alignItems: 'center',
      gap: 5,
      position: 'relative',
    },
    decalVisualCardWide: {
      width: '11.4%',
      minWidth: 92,
      padding: 8,
    },
    decalVisualCardActive: {
      borderColor: '#10b981',
      backgroundColor: isDark ? '#173b2a' : '#ecfdf5',
      shadowColor: '#10b981',
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    decalVisualPreview: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 8,
      backgroundColor: isDark ? '#0a1611' : '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    decalVisualImage: {
      width: '88%',
      height: '88%',
    },
    decalVisualEmptyIcon: {
      fontSize: 22,
      color: '#64748b',
    },
    decalVisualName: {
      fontSize: 10.5,
      fontWeight: '700',
      color: isDark ? '#94a39d' : palette.muted,
      textAlign: 'center',
    },
    decalVisualNameActive: {
      color: isDark ? '#34d399' : '#059669',
    },
    decalVisualCheckDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 17,
      height: 17,
      borderRadius: 8.5,
      backgroundColor: '#10b981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    opacitySection: {
      marginTop: 12,
      padding: 12,
      backgroundColor: isDark ? '#0c1913' : '#f8fafc',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#193328' : '#e2e8f0',
      gap: 8,
    },
    opacityTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#cbd5e1' : palette.text,
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
      backgroundColor: isDark ? '#13241d' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#1e382d' : '#e2e8f0',
    },
    opacityBtnActive: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    opacityBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#94a39d' : palette.muted,
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
      borderTopColor: isDark ? '#1a3027' : palette.border,
      backgroundColor: isDark ? '#13221b' : palette.surfaceLow,
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: isDark ? '#1a2c24' : '#e2e8f0',
    },
    resetBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#94a39d' : palette.muted,
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
    cuesGrid: {
      gap: 10,
      marginTop: 8,
    },
    cuesGridWide: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    visualCueCard: {
      padding: 10,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
      borderWidth: 1.5,
      borderColor: isDark ? '#1e293b' : '#e2e8f0',
      gap: 8,
      position: 'relative',
    },
    visualCueCardWide: {
      width: '49%',
    },
    cueStickGraphicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 18,
      backgroundColor: isDark ? 'rgba(2, 6, 23, 0.75)' : '#f1f5f9',
      borderRadius: 9,
      paddingHorizontal: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    },
    cueBumper: {
      width: 5,
      height: 12,
      backgroundColor: '#020617',
      borderTopLeftRadius: 3,
      borderBottomLeftRadius: 3,
    },
    cueButtSleeve: {
      width: 40,
      height: 11,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cueAccentRing: {
      width: 3,
      height: 11,
    },
    cueWrapGrip: {
      width: 65,
      height: 10,
      borderWidth: 0.5,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
    cueWrapTexture: {
      flex: 1,
      borderTopWidth: 1,
      borderBottomWidth: 1,
    },
    cueForearm: {
      width: 55,
      height: 9,
      justifyContent: 'center',
      position: 'relative',
    },
    cueInlayFlame: {
      position: 'absolute',
      right: 2,
      width: 0,
      height: 0,
      borderTopWidth: 4,
      borderBottomWidth: 4,
      borderLeftWidth: 18,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    cueJointCollar: {
      width: 6,
      height: 8.5,
    },
    cueShaft: {
      flex: 1,
      height: 7.5,
      position: 'relative',
      justifyContent: 'center',
    },
    cueShaftGlow: {
      width: '100%',
      height: 2,
      opacity: 0.6,
    },
    cueFerrule: {
      width: 6,
      height: 6.5,
      backgroundColor: '#f8fafc',
    },
    cueTip: {
      width: 4,
      height: 6,
      backgroundColor: '#0284c7',
      borderTopRightRadius: 2,
      borderBottomRightRadius: 2,
    },
    cueInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    visualCueName: {
      fontSize: 13.5,
      fontWeight: '800',
      color: isDark ? '#f1f5f3' : palette.text,
      letterSpacing: 0.3,
    },
    cueTagPill: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 8,
      borderWidth: 1,
    },
    cueTagPillText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    visualCueCheckBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDark ? '#1e293b' : '#e2e8f0',
    },
    subOptionTitle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: isDark ? '#94a3b8' : palette.muted,
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
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderWidth: 1.5,
      borderColor: isDark ? '#334155' : '#cbd5e1',
      alignItems: 'center',
    },
    subOptionBtnActive: {
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
    },
    subOptionBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#94a3b8' : palette.muted,
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
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderWidth: 1.5,
      borderColor: isDark ? '#334155' : '#cbd5e1',
      alignItems: 'center',
    },
    pbaCardActive: {
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    pbaCardTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: isDark ? '#cbd5e1' : palette.text,
    },
    pbaCardTitleActive: {
      color: '#fbbf24',
    },
    pbaCardName: {
      fontSize: 9.5,
      color: isDark ? '#64748b' : palette.muted,
      marginTop: 1,
    },
  });
