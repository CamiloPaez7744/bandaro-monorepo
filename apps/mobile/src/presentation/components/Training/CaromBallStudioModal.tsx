import React, { memo, useState, useCallback, useMemo } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
    Pressable,
} from 'react-native';
import Svg, {
    Circle,
    Defs,
    G,
    RadialGradient,
    Stop,
} from 'react-native-svg';
import { BallId, PbaFormationId, getRandomPbaBreak, PBA_BREAK_FORMATIONS } from '@bandaro/core';
import {
    IconCheck,
    IconRefresh,
    IconX,
    IconTarget,
    IconSettings,
} from '@/src/presentation/components/icons';
import {
    BALL_SKIN_PRESETS,
    type BallSkinId,
    type TablePreferences,
} from './tablePreferences';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';

interface CaromBallStudioModalProps {
    visible: boolean;
    cueBallId: BallId;
    tablePreferences: TablePreferences;
    onCueBallChange: (cueBallId: BallId) => void;
    onPreferencesChange: (newPrefs: TablePreferences) => void;
    onResetToBreakPosition?: () => void;
    onClose: () => void;
}

const getSkinTexts = (preset: (typeof BALL_SKIN_PRESETS)[0], lang: string) => {
    if (lang === 'en') {
        switch (preset.id) {
            case 'aramith_pro_cup':
                return {
                    name: 'Super Aramith Pro-Cup (UMB)',
                    subtitle: 'Official World UMB Standard',
                    origin: 'Belgium 🇧🇪',
                    description: 'Pure phenolic resin with the iconic 6 red measle dots for maximum spin reading accuracy.',
                };
            case 'cosmo_helix_pba':
                return {
                    name: 'Cosmo Helix Vision (PBA)',
                    subtitle: 'Official Korean PBA Tour Standard',
                    origin: 'South Korea 🇰🇷',
                    description: 'Vision technology for 4K TV broadcasts with 6 high-contrast neon cyan dots and rotation rings.',
                };
            case 'dynaspheres':
                return {
                    name: 'Dynaspheres Platinum Carom',
                    subtitle: 'Dynamic Compass Rotor Design',
                    origin: 'Belgium / International 🌐',
                    description: 'Concentric rotor pattern in platinum gray and cobalt to visualize the exact gyroscopic axis.',
                };
            case 'classic_solid':
                return {
                    name: 'Classic Traditional (Solid Vintage)',
                    subtitle: 'Smooth Ivory & Ruby Finish',
                    origin: 'Vintage 🏛️',
                    description: 'Smooth traditional competition balls with a subtle single identification dot.',
                };
            default:
                return {
                    name: preset.name,
                    subtitle: preset.subtitle,
                    origin: preset.origin,
                    description: preset.description,
                };
        }
    }
    return {
        name: preset.name,
        subtitle: preset.subtitle,
        origin: preset.origin,
        description: preset.description,
    };
};

export const CaromBallStudioModal = memo(function CaromBallStudioModal({
    visible,
    cueBallId,
    tablePreferences,
    onCueBallChange,
    onPreferencesChange,
    onResetToBreakPosition,
    onClose,
}: CaromBallStudioModalProps) {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const isMobile = windowWidth < 768;
    const { t, language } = useI18n();
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const isDark = colorScheme === 'dark';
    const s = getStyles(palette, isDark);

    const [activeTab, setActiveTab] = useState<'skins' | 'break' | 'tactical'>('skins');
    const studioUid = useMemo(() => `cbs_${Math.random().toString(36).slice(2, 8)}`, []);

    const currentBallSkin = tablePreferences.ballSkin ?? 'aramith_pro_cup';
    const currentBreakFormat = tablePreferences.breakFormat ?? 'umb';
    const currentPbaFormation = tablePreferences.pbaFormation ?? '159';
    const currentUmbSide = tablePreferences.umbSide ?? 'right';
    const showDots = tablePreferences.showBallDots !== false;

    const handleSelectCueBall = useCallback(
        (selectedId: BallId) => {
            onCueBallChange(selectedId);
            onPreferencesChange({
                ...tablePreferences,
                cueBallId: selectedId,
            });
        },
        [onCueBallChange, onPreferencesChange, tablePreferences]
    );

    const handleSelectSkin = useCallback(
        (skinId: BallSkinId) => {
            onPreferencesChange({
                ...tablePreferences,
                ballSkin: skinId,
            });
        },
        [tablePreferences, onPreferencesChange]
    );

    const handleSelectBreakFormat = useCallback(
        (format: 'umb' | 'pba') => {
            onPreferencesChange({
                ...tablePreferences,
                breakFormat: format,
            });
        },
        [tablePreferences, onPreferencesChange]
    );

    const handleSelectPbaFormation = useCallback(
        (formationId: PbaFormationId) => {
            onPreferencesChange({
                ...tablePreferences,
                pbaFormation: formationId,
            });
        },
        [tablePreferences, onPreferencesChange]
    );

    const handleSelectUmbSide = useCallback(
        (side: 'right' | 'left') => {
            onPreferencesChange({
                ...tablePreferences,
                umbSide: side,
            });
        },
        [tablePreferences, onPreferencesChange]
    );

    const handleToggleShowDots = useCallback(() => {
        onPreferencesChange({
            ...tablePreferences,
            showBallDots: !showDots,
        });
    }, [tablePreferences, showDots, onPreferencesChange]);

    const handleRandomizePba = useCallback(() => {
        const rnd = getRandomPbaBreak();
        if (rnd.formationId) {
            onPreferencesChange({
                ...tablePreferences,
                pbaFormation: rnd.formationId,
            });
        }
    }, [tablePreferences, onPreferencesChange]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}>
            <View style={s.overlay}>
                <View
                    style={[
                        s.container,
                        {
                            width: Math.min(windowWidth - 24, 620),
                            maxHeight: Math.min(windowHeight - 32, 700),
                        },
                    ]}>
                    {/* Header Premium */}
                    <View style={s.header}>
                        <View style={s.headerLeft}>
                            <View style={s.headerIconBadge}>
                                <Text style={{ fontSize: 18 }}>⚪</Text>
                            </View>
                            <View>
                                <Text style={s.headerTitle}>{language === 'en' ? 'Ball Studio & Break Setup' : 'Estudio de Bolas y Salida'}</Text>
                                <Text style={s.headerSub}>
                                    {language === 'en' ? 'Official competition skins and break shot configuration' : 'Skins oficiales de competición y configuración de break'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={s.closeBtn}
                            onPress={onClose}
                            accessibilityLabel={t('common.close')}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <IconX size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Podio Showroom de las 3 Bolas en 3D */}
                    <View style={s.podiumShowroom}>
                        <Text style={s.podiumLabel}>
                            {language === 'en' ? 'Current Set: ' : 'Set Actual: '}{
                                (() => {
                                    const found = BALL_SKIN_PRESETS.find((p) => p.id === currentBallSkin);
                                    return found ? getSkinTexts(found, language).name : '';
                                })()
                            }
                        </Text>
                        <View style={s.ballsRow}>
                            {/* Bola Blanca */}
                            <TouchableOpacity
                                style={[
                                    s.ballPodiumItem,
                                    cueBallId === 'white' && s.ballPodiumItemActive,
                                ]}
                                onPress={() => handleSelectCueBall('white')}
                                activeOpacity={0.8}>
                                <Svg width={54} height={54} viewBox="0 0 54 54">
                                    <Defs>
                                        <RadialGradient id={`${studioUid}_podiumWhite`} cx="35%" cy="35%" r="65%">
                                            <Stop offset="0%" stopColor="#ffffff" />
                                            <Stop offset="55%" stopColor="#f1f5f9" />
                                            <Stop offset="85%" stopColor="#cbd5e1" />
                                            <Stop offset="100%" stopColor="#94a3b8" />
                                        </RadialGradient>
                                    </Defs>
                                    <Circle cx={27} cy={30} r={22} fill="rgba(0,0,0,0.35)" />
                                    <Circle cx={27} cy={27} r={23} fill={`url(#${studioUid}_podiumWhite)`} stroke="#94a3b8" strokeWidth={1} />
                                    {showDots && currentBallSkin === 'aramith_pro_cup' && (
                                        <G>
                                            <Circle cx={27} cy={27} r={2.5} fill="#dc2626" />
                                            <Circle cx={17} cy={20} r={2.5} fill="#dc2626" />
                                            <Circle cx={37} cy={20} r={2.5} fill="#dc2626" />
                                            <Circle cx={37} cy={34} r={2.5} fill="#dc2626" />
                                            <Circle cx={17} cy={34} r={2.5} fill="#dc2626" />
                                        </G>
                                    )}
                                    {showDots && currentBallSkin === 'cosmo_helix_pba' && (
                                        <G>
                                            <Circle cx={27} cy={27} r={11} fill="none" stroke="rgba(0,229,255,0.45)" strokeWidth={1.2} strokeDasharray="3 2" />
                                            <Circle cx={27} cy={27} r={2.5} fill="#00e5ff" />
                                            <Circle cx={18} cy={21} r={2.5} fill="#00e5ff" />
                                            <Circle cx={36} cy={21} r={2.5} fill="#00e5ff" />
                                            <Circle cx={36} cy={33} r={2.5} fill="#00e5ff" />
                                            <Circle cx={18} cy={33} r={2.5} fill="#00e5ff" />
                                        </G>
                                    )}
                                    {showDots && currentBallSkin === 'dynaspheres' && (
                                        <G>
                                            <Circle cx={27} cy={27} r={12} fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth={1.2} />
                                            <Circle cx={27} cy={27} r={2.5} fill="#475569" />
                                            <Circle cx={18} cy={21} r={2.5} fill="#475569" />
                                            <Circle cx={36} cy={21} r={2.5} fill="#475569" />
                                            <Circle cx={36} cy={33} r={2.5} fill="#475569" />
                                            <Circle cx={18} cy={33} r={2.5} fill="#475569" />
                                        </G>
                                    )}
                                    {showDots && currentBallSkin === 'classic_solid' && (
                                        <Circle cx={27} cy={27} r={2.5} fill="#0f172a" />
                                    )}
                                    <Circle cx={20} cy={19} r={5} fill="rgba(255,255,255,0.85)" />
                                </Svg>
                                <View style={s.ballLabelWrap}>
                                    <Text style={[s.ballPodiumName, cueBallId === 'white' && s.ballPodiumNameActive]}>
                                        {t('common.white')}
                                    </Text>
                                    {cueBallId === 'white' && (
                                        <View style={s.cueBadge}>
                                            <Text style={s.cueBadgeText}>{language === 'en' ? 'CUE BALL' : 'TIRADORA'}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Bola Amarilla */}
                            <TouchableOpacity
                                style={[
                                    s.ballPodiumItem,
                                    cueBallId === 'yellow' && s.ballPodiumItemActive,
                                ]}
                                onPress={() => handleSelectCueBall('yellow')}
                                activeOpacity={0.8}>
                                <Svg width={54} height={54} viewBox="0 0 54 54">
                                    <Defs>
                                        <RadialGradient id={`${studioUid}_podiumYellow`} cx="35%" cy="35%" r="65%">
                                            <Stop offset="0%" stopColor="#fef08a" />
                                            <Stop offset="45%" stopColor="#facc15" />
                                            <Stop offset="80%" stopColor="#ca8a04" />
                                            <Stop offset="100%" stopColor="#a16207" />
                                        </RadialGradient>
                                    </Defs>
                                    <Circle cx={27} cy={30} r={22} fill="rgba(0,0,0,0.35)" />
                                    <Circle cx={27} cy={27} r={23} fill={`url(#${studioUid}_podiumYellow)`} stroke="#a16207" strokeWidth={1} />
                                    {showDots && currentBallSkin === 'aramith_pro_cup' && (
                                        <G>
                                            <Circle cx={27} cy={27} r={2.5} fill="#dc2626" />
                                            <Circle cx={17} cy={20} r={2.5} fill="#dc2626" />
                                            <Circle cx={37} cy={20} r={2.5} fill="#dc2626" />
                                            <Circle cx={37} cy={34} r={2.5} fill="#dc2626" />
                                            <Circle cx={17} cy={34} r={2.5} fill="#dc2626" />
                                        </G>
                                    )}
                                    {showDots && currentBallSkin === 'cosmo_helix_pba' && (
                                        <G>
                                            <Circle cx={27} cy={27} r={11} fill="none" stroke="rgba(30,58,138,0.45)" strokeWidth={1.2} strokeDasharray="3 2" />
                                            <Circle cx={27} cy={27} r={2.5} fill="#1e3a8a" />
                                            <Circle cx={18} cy={21} r={2.5} fill="#1e3a8a" />
                                            <Circle cx={36} cy={21} r={2.5} fill="#1e3a8a" />
                                            <Circle cx={36} cy={33} r={2.5} fill="#1e3a8a" />
                                            <Circle cx={18} cy={33} r={2.5} fill="#1e3a8a" />
                                        </G>
                                    )}
                                    {showDots && currentBallSkin === 'dynaspheres' && (
                                        <G>
                                            <Circle cx={27} cy={27} r={12} fill="none" stroke="rgba(29,78,216,0.5)" strokeWidth={1.2} />
                                            <Circle cx={27} cy={27} r={2.5} fill="#1d4ed8" />
                                            <Circle cx={18} cy={21} r={2.5} fill="#1d4ed8" />
                                            <Circle cx={36} cy={21} r={2.5} fill="#1d4ed8" />
                                            <Circle cx={36} cy={33} r={2.5} fill="#1d4ed8" />
                                            <Circle cx={18} cy={33} r={2.5} fill="#1d4ed8" />
                                        </G>
                                    )}
                                    {showDots && currentBallSkin === 'classic_solid' && (
                                        <Circle cx={27} cy={27} r={2.5} fill="#dc2626" />
                                    )}
                                    <Circle cx={20} cy={19} r={5} fill="rgba(255,255,255,0.75)" />
                                </Svg>
                                <View style={s.ballLabelWrap}>
                                    <Text style={[s.ballPodiumName, cueBallId === 'yellow' && s.ballPodiumNameActive]}>
                                        {t('common.yellow')}
                                    </Text>
                                    {cueBallId === 'yellow' && (
                                        <View style={s.cueBadge}>
                                            <Text style={s.cueBadgeText}>{language === 'en' ? 'CUE BALL' : 'TIRADORA'}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Bola Roja */}
                            <View style={s.ballPodiumItem}>
                                <Svg width={54} height={54} viewBox="0 0 54 54">
                                    <Defs>
                                        <RadialGradient id={`${studioUid}_podiumRed`} cx="35%" cy="35%" r="65%">
                                            <Stop offset="0%" stopColor="#f87171" />
                                            <Stop offset="45%" stopColor="#dc2626" />
                                            <Stop offset="80%" stopColor="#991b1b" />
                                            <Stop offset="100%" stopColor="#7f1d1d" />
                                        </RadialGradient>
                                    </Defs>
                                    <Circle cx={27} cy={30} r={22} fill="rgba(0,0,0,0.35)" />
                                    <Circle cx={27} cy={27} r={23} fill={`url(#${studioUid}_podiumRed)`} stroke="#7f1d1d" strokeWidth={1} />
                                    {showDots && currentBallSkin === 'cosmo_helix_pba' && (
                                        <Circle cx={27} cy={27} r={11} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.2} strokeDasharray="3 2" />
                                    )}
                                    {showDots && currentBallSkin === 'dynaspheres' && (
                                        <Circle cx={27} cy={27} r={12} fill="none" stroke="rgba(217,119,6,0.5)" strokeWidth={1.2} />
                                    )}
                                    <Circle cx={20} cy={19} r={5} fill="rgba(255,255,255,0.75)" />
                                </Svg>
                                <View style={s.ballLabelWrap}>
                                    <Text style={s.ballPodiumName}>{t('common.red')}</Text>
                                    <Text style={s.ballRoleSub}>{language === 'en' ? '1st OBJECT' : '1ª OBJETIVO'}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Barra de Pestañas */}
                    <View style={s.tabsRow}>
                        <TouchableOpacity
                            style={[s.tabBtn, activeTab === 'skins' && s.tabBtnActive]}
                            onPress={() => setActiveTab('skins')}>
                            <Text style={[s.tabBtnText, activeTab === 'skins' && s.tabBtnTextActive]}>
                                {language === 'en' ? 'Ball Sets (Skins)' : 'Sets de Bolas (Skins)'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.tabBtn, activeTab === 'break' && s.tabBtnActive]}
                            onPress={() => setActiveTab('break')}>
                            <Text style={[s.tabBtnText, activeTab === 'break' && s.tabBtnTextActive]}>
                                {language === 'en' ? 'Break Shot' : 'Salida (Break Shot)'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.tabBtn, activeTab === 'tactical' && s.tabBtnActive]}
                            onPress={() => setActiveTab('tactical')}>
                            <Text style={[s.tabBtnText, activeTab === 'tactical' && s.tabBtnTextActive]}>
                                {language === 'en' ? 'Ball Settings' : 'Ajustes de Bola'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Contenido scrolleable de pestañas */}
                    <ScrollView
                        style={s.scrollArea}
                        contentContainerStyle={s.scrollContent}
                        showsVerticalScrollIndicator={false}>
                        {activeTab === 'skins' && (
                            <View style={s.tabSection}>
                                <Text style={s.sectionTitle}>
                                    {language === 'en' ? 'Official Competition Sets' : 'Sets Oficiales de Competición'}
                                </Text>
                                <Text style={s.sectionDesc}>
                                    {language === 'en'
                                        ? 'Select ball design and markings according to pro circuit:'
                                        : 'Selecciona el diseño y marcajes de bolas según el circuito profesional:'}
                                </Text>

                                <View style={s.skinsList}>
                                    {BALL_SKIN_PRESETS.map((preset) => {
                                        const isSelected = currentBallSkin === preset.id;
                                        const skinTexts = getSkinTexts(preset, language);
                                        return (
                                            <TouchableOpacity
                                                key={preset.id}
                                                style={[s.skinCard, isSelected && s.skinCardActive]}
                                                onPress={() => handleSelectSkin(preset.id)}
                                                activeOpacity={0.8}>
                                                <View style={s.skinCardHeader}>
                                                    <View style={s.skinMetaRow}>
                                                        <Text style={s.skinOrigin}>{skinTexts.origin}</Text>
                                                        <Text style={[s.skinName, isSelected && s.skinNameActive]}>
                                                            {skinTexts.name}
                                                        </Text>
                                                    </View>
                                                    {isSelected && (
                                                        <View style={s.checkBadge}>
                                                            <IconCheck size={12} color="#ffffff" strokeWidth={3} />
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={s.skinSub}>{skinTexts.subtitle}</Text>
                                                <Text style={s.skinDesc}>{skinTexts.description}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {activeTab === 'break' && (
                            <View style={s.tabSection}>
                                <Text style={s.sectionTitle}>
                                    {language === 'en' ? 'Canonical Break Format' : 'Formato Canónico de Salida'}
                                </Text>
                                <Text style={s.sectionDesc}>
                                    {language === 'en'
                                        ? 'Choose between world federation traditional break (UMB) or Korean tour 9-spot system (PBA):'
                                        : 'Elige entre la salida tradicional de la federación mundial (UMB) o el sistema de 9 spots del tour coreano (PBA):'}
                                </Text>

                                {/* Selector UMB vs PBA */}
                                <View style={s.breakFormatSwitchRow}>
                                    <Pressable
                                        style={[
                                            s.formatCard,
                                            currentBreakFormat === 'umb' && s.formatCardActive,
                                        ]}
                                        onPress={() => handleSelectBreakFormat('umb')}>
                                        <Text style={{ fontSize: 20 }}>🌍</Text>
                                        <Text
                                            style={[
                                                s.formatCardTitle,
                                                currentBreakFormat === 'umb' && s.formatCardTitleActive,
                                            ]}>
                                            {language === 'en' ? 'World UMB' : 'UMB Mundial'}
                                        </Text>
                                        <Text style={s.formatCardDesc}>
                                            {language === 'en'
                                                ? 'Fixed 1/4 & 3/4 lines. Cue ball at 18.25 cm'
                                                : 'Líneas fijas 1/4 y 3/4. Tiradora a 18.25 cm'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            s.formatCard,
                                            currentBreakFormat === 'pba' && s.formatCardActive,
                                        ]}
                                        onPress={() => handleSelectBreakFormat('pba')}>
                                        <Text style={{ fontSize: 20 }}>🇰🇷</Text>
                                        <Text
                                            style={[
                                                s.formatCardTitle,
                                                currentBreakFormat === 'pba' && s.formatCardTitleActive,
                                            ]}>
                                            PBA Pro Tour
                                        </Text>
                                        <Text style={s.formatCardDesc}>
                                            {language === 'en'
                                                ? '9-spot grid with draw-based formations'
                                                : 'Grilla de 9 spots con formaciones por sorteo'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {/* Configuración específica según formato */}
                                {currentBreakFormat === 'umb' ? (
                                    <View style={s.breakDetailBox}>
                                        <Text style={s.breakDetailTitle}>
                                            {language === 'en' ? 'Cue Ball Side (UMB):' : 'Lado de la Bola Blanca Tiradora (UMB):'}
                                        </Text>
                                        <View style={s.umbSideRow}>
                                            <TouchableOpacity
                                                style={[
                                                    s.sideBtn,
                                                    currentUmbSide === 'right' && s.sideBtnActive,
                                                ]}
                                                onPress={() => handleSelectUmbSide('right')}>
                                                <Text
                                                    style={[
                                                        s.sideBtnText,
                                                        currentUmbSide === 'right' && s.sideBtnTextActive,
                                                    ]}>
                                                    {language === 'en' ? 'Right (Standard 18.25 cm)' : 'Derecha (Estándar 18.25 cm)'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    s.sideBtn,
                                                    currentUmbSide === 'left' && s.sideBtnActive,
                                                ]}
                                                onPress={() => handleSelectUmbSide('left')}>
                                                <Text
                                                    style={[
                                                        s.sideBtnText,
                                                        currentUmbSide === 'left' && s.sideBtnTextActive,
                                                    ]}>
                                                    {language === 'en' ? 'Left (18.25 cm)' : 'Izquierda (18.25 cm)'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={s.breakNote}>
                                            {language === 'en'
                                                ? 'Red at High Spot (X=213, Y=71), Yellow at Break Center (X=71, Y=71).'
                                                : 'Roja en Punto Alto ($X=213, Y=71$), Amarilla en Centro Salida ($X=71, Y=71$).'}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={s.breakDetailBox}>
                                        <View style={s.pbaHeaderRow}>
                                            <Text style={s.breakDetailTitle}>
                                                {language === 'en' ? 'PBA Tactical Formation (9 Spots):' : 'Formación Táctica PBA (9 Spots):'}
                                            </Text>
                                            <TouchableOpacity
                                                style={s.randomBtn}
                                                onPress={handleRandomizePba}
                                                activeOpacity={0.7}>
                                                <IconRefresh size={12} color="#ffffff" />
                                                <Text style={s.randomBtnText}>
                                                    {language === 'en' ? 'Draw Cards' : 'Sortear Cartas'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={s.pbaGrid}>
                                            {(['159', '357', '258', '248', '268', '257', '259'] as PbaFormationId[]).map((fId) => {
                                                const isSel = currentPbaFormation === fId;
                                                return (
                                                    <TouchableOpacity
                                                        key={fId}
                                                        style={[s.pbaCard, isSel && s.pbaCardActive]}
                                                        onPress={() => handleSelectPbaFormation(fId)}
                                                        activeOpacity={0.8}>
                                                        <Text style={[s.pbaCardNum, isSel && s.pbaCardNumActive]}>
                                                            {fId}
                                                        </Text>
                                                        <Text style={s.pbaCardLabel}>
                                                            {fId === '159' ? (language === 'en' ? 'Canonical' : 'Canónica') : fId === '357' ? (language === 'en' ? 'Inverted' : 'Invertida') : fId === '258' ? (language === 'en' ? 'Center' : 'Central') : fId}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {onResetToBreakPosition && (
                                    <TouchableOpacity
                                        style={s.applyBreakBtn}
                                        onPress={() => {
                                            onResetToBreakPosition();
                                            onClose();
                                        }}
                                        activeOpacity={0.8}>
                                        <IconRefresh size={14} color="#0f172a" strokeWidth={2.5} />
                                        <Text style={s.applyBreakBtnText}>
                                            {language === 'en'
                                                ? 'Place Balls on Selected Break Now'
                                                : 'Colocar Bolas en Salida Seleccionada Ahora'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {activeTab === 'tactical' && (
                            <View style={s.tabSection}>
                                <Text style={s.sectionTitle}>
                                    {language === 'en' ? 'Tactical Ball Settings' : 'Ajustes Tácticos de Bola'}
                                </Text>
                                <Text style={s.sectionDesc}>
                                    {language === 'en'
                                        ? 'Control cue ball and marker visibility on the table:'
                                        : 'Controla la bola de tiro y la visibilidad de los marcadores en la mesa:'}
                                </Text>

                                <View style={s.tacticalOptionBox}>
                                    <View style={s.tacticalRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.tacticalTitle}>
                                                {language === 'en' ? 'Active Cue Ball' : 'Bola de Ataque Activa'}
                                            </Text>
                                            <Text style={s.tacticalSub}>
                                                {language === 'en'
                                                    ? 'Select which ball you will shoot with'
                                                    : 'Selecciona con cuál bola ejecutarás el tiro'}
                                            </Text>
                                        </View>
                                        <View style={s.cueBallSwitch}>
                                            <TouchableOpacity
                                                style={[
                                                    s.cueSwitchBtn,
                                                    cueBallId === 'white' && s.cueSwitchBtnActive,
                                                ]}
                                                onPress={() => onCueBallChange('white')}>
                                                <Text
                                                    style={[
                                                        s.cueSwitchBtnText,
                                                        cueBallId === 'white' && s.cueSwitchBtnTextActive,
                                                    ]}>
                                                    {language === 'en' ? 'White' : 'Blanca'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    s.cueSwitchBtn,
                                                    cueBallId === 'yellow' && s.cueSwitchBtnActive,
                                                ]}
                                                onPress={() => onCueBallChange('yellow')}>
                                                <Text
                                                    style={[
                                                        s.cueSwitchBtnText,
                                                        cueBallId === 'yellow' && s.cueSwitchBtnTextActive,
                                                    ]}>
                                                    {language === 'en' ? 'Yellow' : 'Amarilla'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                <View style={s.tacticalOptionBox}>
                                    <View style={s.tacticalRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.tacticalTitle}>
                                                {language === 'en' ? 'Rotation Dots (Measle Dots)' : 'Puntos de Rotación (Measle Dots)'}
                                            </Text>
                                            <Text style={s.tacticalSub}>
                                                {language === 'en'
                                                    ? 'Show 6 rotation dots on the table to read spin'
                                                    : 'Muestra los 6 puntos de giro sobre la mesa para leer efectos'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[s.toggleBtn, showDots && s.toggleBtnActive]}
                                            onPress={handleToggleShowDots}>
                                            <View
                                                style={[
                                                    s.toggleThumb,
                                                    showDots && s.toggleThumbActive,
                                                ]}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={s.specsBox}>
                                    <Text style={s.specsTitle}>
                                        {language === 'en' ? 'Official Technical Specifications:' : 'Especificaciones Técnicas Oficiales:'}
                                    </Text>
                                    <Text style={s.specsItem}>
                                        {language === 'en' ? '• Diameter: 61.5 mm (UMB / PBA Rules)' : '• Diámetro: 61.5 mm (Reglamento UMB / PBA)'}
                                    </Text>
                                    <Text style={s.specsItem}>
                                        {language === 'en' ? '• Weight: ~210 grams' : '• Peso: ~210 gramos'}
                                    </Text>
                                    <Text style={s.specsItem}>
                                        {language === 'en' ? '• Material: High-density phenolic resin' : '• Material: Resina fenólica de alta densidad'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.8}>
                            <Text style={s.doneBtnText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const getStyles = (palette: ReturnType<typeof getPalette>, isDark: boolean) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: isDark ? 'rgba(5, 10, 20, 0.85)' : 'rgba(15, 23, 42, 0.60)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    container: {
        backgroundColor: palette.card,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : palette.border,
        overflow: 'hidden',
        shadowColor: isDark ? '#000' : '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.5 : 0.15,
        shadowRadius: 20,
        elevation: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    headerIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.10)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: palette.text,
        letterSpacing: 0.3,
    },
    headerSub: {
        fontSize: 11,
        color: palette.muted,
        marginTop: 1,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.surfaceLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    podiumShowroom: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : palette.surfaceLow,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.border,
        alignItems: 'center',
    },
    podiumLabel: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#38bdf8',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    ballsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
    },
    ballPodiumItem: {
        alignItems: 'center',
        padding: 6,
        borderRadius: 14,
    },
    ballPodiumItemActive: {
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.3)',
    },
    ballLabelWrap: {
        alignItems: 'center',
        marginTop: 4,
    },
    ballPodiumName: {
        fontSize: 11,
        fontWeight: '700',
        color: palette.text,
    },
    ballPodiumNameActive: {
        color: '#38bdf8',
        fontWeight: '800',
    },
    cueBadge: {
        backgroundColor: '#0284c7',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        marginTop: 2,
    },
    cueBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#ffffff',
    },
    ballRoleSub: {
        fontSize: 8,
        fontWeight: '600',
        color: '#ef4444',
        marginTop: 2,
    },
    tabsRow: {
        flexDirection: 'row',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : palette.surfaceLow,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabBtnActive: {
        borderBottomColor: '#38bdf8',
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.12)',
    },
    tabBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: palette.muted,
    },
    tabBtnTextActive: {
        color: palette.text,
        fontWeight: '800',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    tabSection: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: palette.text,
    },
    sectionDesc: {
        fontSize: 11.5,
        color: palette.muted,
        lineHeight: 16,
        marginBottom: 4,
    },
    skinsList: {
        gap: 8,
    },
    skinCard: {
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : palette.surfaceLow,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
        borderRadius: 14,
        padding: 12,
    },
    skinCardActive: {
        borderColor: '#38bdf8',
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.08)',
    },
    skinCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    skinMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    skinOrigin: {
        fontSize: 12,
    },
    skinName: {
        fontSize: 13,
        fontWeight: '700',
        color: palette.text,
    },
    skinNameActive: {
        color: '#38bdf8',
        fontWeight: '800',
    },
    checkBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#0284c7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    skinSub: {
        fontSize: 10.5,
        color: palette.muted,
        fontWeight: '600',
        marginBottom: 4,
    },
    skinDesc: {
        fontSize: 10.5,
        color: palette.muted,
        lineHeight: 14,
    },
    breakFormatSwitchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    formatCard: {
        flex: 1,
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : palette.surfaceLow,
        borderWidth: 1.5,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
    },
    formatCardActive: {
        borderColor: '#38bdf8',
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.08)',
    },
    formatCardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: palette.text,
        marginTop: 4,
    },
    formatCardTitleActive: {
        color: '#38bdf8',
        fontWeight: '800',
    },
    formatCardDesc: {
        fontSize: 10,
        color: palette.muted,
        textAlign: 'center',
        marginTop: 2,
    },
    breakDetailBox: {
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : palette.surfaceLow,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.border,
        borderRadius: 12,
        padding: 12,
        marginTop: 4,
    },
    breakDetailTitle: {
        fontSize: 11.5,
        fontWeight: '700',
        color: palette.text,
        marginBottom: 8,
    },
    umbSideRow: {
        flexDirection: 'row',
        gap: 8,
    },
    sideBtn: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : palette.card,
        borderWidth: 1.5,
        borderColor: isDark ? '#334155' : palette.border,
        alignItems: 'center',
    },
    sideBtnActive: {
        borderColor: '#38bdf8',
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.12)',
    },
    sideBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: palette.muted,
    },
    sideBtnTextActive: {
        color: '#38bdf8',
        fontWeight: '700',
    },
    breakNote: {
        fontSize: 10,
        color: palette.muted,
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
    },
    pbaHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    randomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: '#0284c7',
    },
    randomBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#ffffff',
    },
    pbaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    pbaCard: {
        minWidth: 64,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : palette.card,
        borderWidth: 1.5,
        borderColor: isDark ? '#334155' : palette.border,
        alignItems: 'center',
    },
    pbaCardActive: {
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    pbaCardNum: {
        fontSize: 12,
        fontWeight: '800',
        color: palette.text,
    },
    pbaCardNumActive: {
        color: '#fbbf24',
    },
    pbaCardLabel: {
        fontSize: 9,
        color: palette.muted,
        marginTop: 1,
    },
    applyBreakBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: '#38bdf8',
        marginTop: 4,
    },
    applyBreakBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    tacticalOptionBox: {
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : palette.surfaceLow,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.border,
        borderRadius: 12,
        padding: 12,
    },
    tacticalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    tacticalTitle: {
        fontSize: 12.5,
        fontWeight: '700',
        color: palette.text,
    },
    tacticalSub: {
        fontSize: 10.5,
        color: palette.muted,
        marginTop: 1,
    },
    cueBallSwitch: {
        flexDirection: 'row',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : palette.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? '#334155' : palette.border,
        padding: 2,
    },
    cueSwitchBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    cueSwitchBtnActive: {
        backgroundColor: '#0284c7',
    },
    cueSwitchBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: palette.muted,
    },
    cueSwitchBtnTextActive: {
        color: '#ffffff',
        fontWeight: '800',
    },
    toggleBtn: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: isDark ? '#334155' : palette.border,
        padding: 2,
        justifyContent: 'center',
    },
    toggleBtnActive: {
        backgroundColor: '#0284c7',
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ffffff',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    specsBox: {
        marginTop: 8,
        padding: 10,
        borderRadius: 10,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : palette.surfaceLow,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : palette.border,
        gap: 3,
    },
    specsTitle: {
        fontSize: 10.5,
        fontWeight: '700',
        color: palette.text,
        marginBottom: 2,
    },
    specsItem: {
        fontSize: 10,
        color: palette.muted,
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
        backgroundColor: palette.card,
        alignItems: 'flex-end',
    },
    doneBtn: {
        paddingVertical: 8,
        paddingHorizontal: 22,
        borderRadius: 10,
        backgroundColor: '#0284c7',
    },
    doneBtnText: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#ffffff',
    },
});
