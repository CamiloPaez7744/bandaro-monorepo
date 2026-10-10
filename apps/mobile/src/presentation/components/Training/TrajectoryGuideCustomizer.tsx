import React, { memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Platform,
    Modal,
    ScrollView,
    useWindowDimensions,
} from 'react-native';

const TouchableOpacity = ({
    style,
    activeOpacity = 0.7,
    children,
    disabled,
    ...props
}: any) => (
    <Pressable
        {...props}
        disabled={disabled}
        style={({ pressed }) => [
            typeof style === 'function' ? style({ pressed }) : style,
            pressed && !disabled && { opacity: activeOpacity },
        ]}
    >
        {children}
    </Pressable>
);
import {
    IconX,
    IconRoute,
    IconEye,
    IconRefresh,
    IconTarget,
    IconSparkles,
} from '@/src/presentation/components/icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
import {
    TrajectoryGuideConfig,
    DEFAULT_GUIDE_CONFIG,
    GuideStrokeStyle,
    AimGuideMode,
    STRICT_BALL_GUIDE_COLORS,
} from '@bandaro/core';

interface TrajectoryGuideCustomizerProps {
    visible: boolean;
    onClose: () => void;
    config: TrajectoryGuideConfig;
    onChangeConfig: (newConfig: TrajectoryGuideConfig) => void;
}

const STROKE_STYLE_OPTIONS: { id: GuideStrokeStyle; labelEn: string; labelEs: string; preview: string }[] = [
    { id: 'solid', labelEn: 'Solid', labelEs: 'Sólido', preview: '━━━━━━' },
    { id: 'dashed', labelEn: 'Dashed', labelEs: 'Discontinuo', preview: '━  ━  ━' },
    { id: 'dotted', labelEn: 'Dotted', labelEs: 'Punteado', preview: '•  •  •  •' },
];

const WEIGHT_PRESETS: { labelEn: string; labelEs: string; weight: number }[] = [
    { labelEn: 'Fine (0.6)', labelEs: 'Fino (0.6)', weight: 0.6 },
    { labelEn: 'Medium (1.0)', labelEs: 'Medio (1.0)', weight: 1.0 },
    { labelEn: 'Bold (1.8)', labelEs: 'Grueso (1.8)', weight: 1.8 },
];

export const TrajectoryGuideCustomizer = memo(function TrajectoryGuideCustomizer({
    visible,
    onClose,
    config,
    onChangeConfig,
}: TrajectoryGuideCustomizerProps) {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const colorScheme = useColorScheme();
    const isDark = colorScheme !== 'light';
    const palette = getPalette(colorScheme);
    const { language } = useI18n();
    const isEn = language === 'en';

    const updateField = useCallback(
        <K extends keyof TrajectoryGuideConfig>(field: K, value: TrajectoryGuideConfig[K]) => {
            onChangeConfig({
                ...config,
                [field]: value,
            });
        },
        [config, onChangeConfig]
    );

    const handleReset = useCallback(() => {
        onChangeConfig(DEFAULT_GUIDE_CONFIG);
    }, [onChangeConfig]);

    const handleAdjustWeight = useCallback(
        (delta: number) => {
            const next = Math.max(0.4, Math.min(3.0, Math.round((config.strokeWeight + delta) * 10) / 10));
            updateField('strokeWeight', next);
        },
        [config.strokeWeight, updateField]
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={[
                    styles.modalCard,
                    {
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : palette.card,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : palette.border,
                        maxHeight: isLandscape ? '94%' : '88%',
                    },
                ]}>
                    {/* Header */}
                    <View style={[styles.header, !isDark && { borderBottomColor: palette.border }]}>
                        <View style={styles.headerTitleWrap}>
                            <IconSparkles size={20} color="#00d2ff" strokeWidth={2.2} />
                            <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                {isEn ? 'Trajectory Guide Engine' : 'Motor de Guías de Trayectoria'}
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={[styles.iconBtn, !isDark && { backgroundColor: 'rgba(0, 0, 0, 0.05)' }]}
                                onPress={handleReset}
                                accessibilityLabel={isEn ? 'Reset to defaults' : 'Restablecer valores por defecto'}>
                                <IconRefresh size={16} color={isDark ? '#94a3b8' : palette.muted} strokeWidth={2} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconBtn, !isDark && { backgroundColor: 'rgba(0, 0, 0, 0.05)' }]}
                                onPress={onClose}
                                accessibilityLabel={isEn ? 'Close customizer' : 'Cerrar personalizador'}>
                                <IconX size={18} color={isDark ? '#f8fafc' : palette.text} strokeWidth={2.4} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* SECCIÓN 1: GUÍA DE PUNTERÍA (AIMING GUIDE / PREDICTION) */}
                        <View style={[styles.sectionCard, !isDark && { backgroundColor: '#f8fafc', borderColor: palette.border }]}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionHeaderLabelWrap}>
                                    <IconTarget size={16} color="#38bdf8" strokeWidth={2.2} />
                                    <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Aiming Guide (Prediction)' : 'Guía de Apuntado (Predicción)'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.togglePill,
                                        config.showAimGuide ? styles.togglePillActive : styles.togglePillInactive,
                                    ]}
                                    onPress={() => updateField('showAimGuide', !config.showAimGuide)}>
                                    {config.showAimGuide ? (
                                        <>
                                            <IconEye size={13} color="#ffffff" strokeWidth={2.2} />
                                            <Text style={styles.togglePillTextActive}>{isEn ? 'Visible' : 'Visible'}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <IconEye size={13} color={isDark ? '#94a3b8' : palette.muted} strokeWidth={2.2} />
                                            <Text style={[styles.togglePillTextInactive, !isDark && { color: palette.muted }]}>{isEn ? 'Hidden' : 'Oculto'}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.sectionSubtitle, { color: isDark ? '#94a3b8' : palette.muted }]}>
                                {isEn
                                    ? 'Pre-shot trajectory calculated with zero discrepancy from physics engine.'
                                    : 'Trayectoria previa al tiro calculada con cero discrepancia del motor físico.'}
                            </Text>

                            {/* Visibility Mode Selector: Straight vs Exit Only vs Full */}
                            <View style={styles.modeSelectorWrap}>
                                <TouchableOpacity
                                    style={[
                                        styles.modeOptionBtn,
                                        !isDark && { backgroundColor: '#f1f5f9', borderColor: palette.border },
                                        config.aimMode === 'straight' && styles.modeOptionBtnActive,
                                    ]}
                                    onPress={() => updateField('aimMode', 'straight')}>
                                    <Text
                                        style={[
                                            styles.modeOptionText,
                                            !isDark && { color: palette.text },
                                            config.aimMode === 'straight' && styles.modeOptionTextActive,
                                        ]}>
                                        {isEn ? 'Straight Angle (Default)' : 'Línea Recta (Por defecto)'}
                                    </Text>
                                    <Text style={[styles.modeOptionHint, !isDark && { color: palette.muted }]}>
                                        {isEn ? 'Short departure vector with ghost ball and exit stubs' : 'Vector corto con bola fantasma y desvíos de salida'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modeOptionBtn,
                                        !isDark && { backgroundColor: '#f1f5f9', borderColor: palette.border },
                                        config.aimMode === 'exit_only' && styles.modeOptionBtnActive,
                                    ]}
                                    onPress={() => updateField('aimMode', 'exit_only')}>
                                    <Text
                                        style={[
                                            styles.modeOptionText,
                                            !isDark && { color: palette.text },
                                            config.aimMode === 'exit_only' && styles.modeOptionTextActive,
                                        ]}>
                                        {isEn ? 'Exit Trajectory' : 'Solo Salida'}
                                    </Text>
                                    <Text style={[styles.modeOptionHint, !isDark && { color: palette.muted }]}>
                                        {isEn ? 'Path after first impact' : 'Trayectoria tras primer impacto'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modeOptionBtn,
                                        !isDark && { backgroundColor: '#f1f5f9', borderColor: palette.border },
                                        config.aimMode === 'full' && styles.modeOptionBtnActive,
                                    ]}
                                    onPress={() => updateField('aimMode', 'full')}>
                                    <Text
                                        style={[
                                            styles.modeOptionText,
                                            !isDark && { color: palette.text },
                                            config.aimMode === 'full' && styles.modeOptionTextActive,
                                        ]}>
                                        {isEn ? 'Full Path' : 'Completa'}
                                    </Text>
                                    <Text style={[styles.modeOptionHint, !isDark && { color: palette.muted }]}>
                                        {isEn ? 'Multi-rail prediction' : 'Predicción multi-bandas'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* SECCIÓN 2: GUÍA DE EJECUCIÓN (EXECUTION GUIDE / TRAIL) */}
                        <View style={[styles.sectionCard, !isDark && { backgroundColor: '#f8fafc', borderColor: palette.border }]}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionHeaderLabelWrap}>
                                    <IconRoute size={16} color="#facc15" strokeWidth={2.2} />
                                    <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Execution Guide (Trail)' : 'Guía de Ejecución (Estela)'}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.togglePill,
                                        config.showExecutionTrail ? styles.togglePillActive : styles.togglePillInactive,
                                    ]}
                                    onPress={() => updateField('showExecutionTrail', !config.showExecutionTrail)}>
                                    {config.showExecutionTrail ? (
                                        <>
                                            <IconEye size={13} color="#ffffff" strokeWidth={2.2} />
                                            <Text style={styles.togglePillTextActive}>{isEn ? 'Visible' : 'Visible'}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <IconEye size={13} color={isDark ? '#94a3b8' : palette.muted} strokeWidth={2.2} />
                                            <Text style={[styles.togglePillTextInactive, !isDark && { color: palette.muted }]}>{isEn ? 'Hidden' : 'Oculto'}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.sectionSubtitle, { color: isDark ? '#94a3b8' : palette.muted }]}>
                                {isEn
                                    ? 'Actual path traveled by the balls during and after the shot execution.'
                                    : 'Recorrido real realizado por las bolas durante y después del tiro.'}
                            </Text>
                        </View>

                        {/* SECCIÓN 3: PROPIEDADES DE TRAZO (PHOTOSHOP STYLE) */}
                        <View style={[styles.sectionCard, !isDark && { backgroundColor: '#f8fafc', borderColor: palette.border }]}>
                            <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                {isEn ? 'Stroke Style' : 'Estilo de Trazo'}
                            </Text>
                            <View style={styles.strokeStyleRow}>
                                {STROKE_STYLE_OPTIONS.map((styleOpt) => {
                                    const isSelected = config.strokeStyle === styleOpt.id;
                                    return (
                                        <TouchableOpacity
                                            key={styleOpt.id}
                                            style={[
                                                styles.styleBtn,
                                                !isDark && { backgroundColor: '#f1f5f9', borderColor: palette.border },
                                                isSelected && styles.styleBtnActive,
                                            ]}
                                            onPress={() => updateField('strokeStyle', styleOpt.id)}>
                                            <Text style={[styles.stylePreview, isSelected && styles.stylePreviewActive]}>
                                                {styleOpt.preview}
                                            </Text>
                                            <Text style={[
                                                styles.styleBtnLabel,
                                                !isDark && { color: palette.text },
                                                isSelected && styles.styleBtnLabelActive,
                                            ]}>
                                                {isEn ? styleOpt.labelEn : styleOpt.labelEs}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={[styles.divider, !isDark && { backgroundColor: palette.border }]} />

                            {/* Grosor de Línea (Thickness) */}
                            <View style={styles.weightHeaderRow}>
                                <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                    {isEn ? 'Thickness (Stroke Weight)' : 'Grosor de Línea'}
                                </Text>
                                <View style={styles.weightValueBadge}>
                                    <Text style={styles.weightValueText}>{config.strokeWeight.toFixed(1)} px</Text>
                                </View>
                            </View>

                            {/* Presets */}
                            <View style={styles.weightPresetsRow}>
                                {WEIGHT_PRESETS.map((preset) => {
                                    const isSelected = Math.abs(config.strokeWeight - preset.weight) < 0.05;
                                    return (
                                        <TouchableOpacity
                                            key={preset.labelEn}
                                            style={[
                                                styles.presetBtn,
                                                !isDark && { backgroundColor: '#f1f5f9', borderColor: palette.border },
                                                isSelected && styles.presetBtnActive,
                                            ]}
                                            onPress={() => updateField('strokeWeight', preset.weight)}>
                                            <Text style={[
                                                styles.presetBtnText,
                                                !isDark && { color: palette.text },
                                                isSelected && styles.presetBtnTextActive,
                                            ]}>
                                                {isEn ? preset.labelEn : preset.labelEs}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Stepper de Precisión */}
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={[styles.stepBtn, !isDark && { backgroundColor: '#e2e8f0' }]}
                                    onPress={() => handleAdjustWeight(-0.1)}>
                                    <Text style={[styles.stepBtnText, !isDark && { color: palette.text }]}>- 0.1</Text>
                                </TouchableOpacity>
                                <View style={styles.strokePreviewSample}>
                                    <View
                                        style={[
                                            styles.sampleLine,
                                            {
                                                height: Math.max(1, config.strokeWeight * 2),
                                                borderStyle: config.strokeStyle === 'dashed' ? 'dashed' : 'solid',
                                            },
                                        ]}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.stepBtn, !isDark && { backgroundColor: '#e2e8f0' }]}
                                    onPress={() => handleAdjustWeight(0.1)}>
                                    <Text style={[styles.stepBtnText, !isDark && { color: palette.text }]}>+ 0.1</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* SECCIÓN 4: ESTRICTEZ DE COLORES (COLOR STRICTNESS) */}
                        <View style={[styles.sectionCard, !isDark && { backgroundColor: '#f8fafc', borderColor: palette.border }]}>
                            <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                {isEn ? 'Color Strictness (Regulations)' : 'Reglamento de Colores'}
                            </Text>
                            <Text style={[styles.sectionSubtitle, { color: isDark ? '#94a3b8' : palette.muted }]}>
                                {isEn
                                    ? 'Simulator trajectory lines strictly match the official 3-cushion ball colors:'
                                    : 'Las líneas de trayectoria coinciden estrictamente con los colores oficiales de las bolas:'}
                            </Text>

                            <View style={styles.colorsStrictRow}>
                                <View style={[styles.colorPill, !isDark && { backgroundColor: '#f1f5f9' }]}>
                                    <View style={[styles.colorDot, { backgroundColor: STRICT_BALL_GUIDE_COLORS.white.stroke }]} />
                                    <Text style={[styles.colorPillText, !isDark && { color: palette.text }]}>
                                        {isEn ? 'White' : 'Blanca'}
                                    </Text>
                                </View>
                                <View style={[styles.colorPill, !isDark && { backgroundColor: '#f1f5f9' }]}>
                                    <View style={[styles.colorDot, { backgroundColor: STRICT_BALL_GUIDE_COLORS.yellow.stroke }]} />
                                    <Text style={[styles.colorPillText, !isDark && { color: palette.text }]}>
                                        {isEn ? 'Yellow' : 'Amarilla'}
                                    </Text>
                                </View>
                                <View style={[styles.colorPill, !isDark && { backgroundColor: '#f1f5f9' }]}>
                                    <View style={[styles.colorDot, { backgroundColor: STRICT_BALL_GUIDE_COLORS.red.stroke }]} />
                                    <Text style={[styles.colorPillText, !isDark && { color: palette.text }]}>
                                        {isEn ? 'Red' : 'Roja'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.strictNote, !isDark && { color: palette.muted }]}>
                                {isEn
                                    ? 'Catalog custom colors are suppressed to guarantee maximum visual clarity and tactical precision.'
                                    : 'Los colores del catálogo se suprimen para garantizar máxima claridad visual y precisión reglamentaria.'}
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '85%',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)' }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
            }),
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 16,
        gap: 12,
    },
    sectionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        gap: 10,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionHeaderLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f8fafc',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 16,
    },
    togglePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    togglePillActive: {
        backgroundColor: '#0284c7',
    },
    togglePillInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    togglePillTextActive: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    togglePillTextInactive: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
    },
    modeSelectorWrap: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    modeOptionBtn: {
        flex: 1,
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    modeOptionBtnActive: {
        backgroundColor: 'rgba(2, 132, 199, 0.22)',
        borderColor: '#0284c7',
    },
    modeOptionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        marginBottom: 2,
    },
    modeOptionTextActive: {
        color: '#38bdf8',
    },
    modeOptionHint: {
        fontSize: 10,
        color: '#64748b',
    },
    strokeStyleRow: {
        flexDirection: 'row',
        gap: 8,
    },
    styleBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 4,
    },
    styleBtnActive: {
        backgroundColor: 'rgba(2, 132, 199, 0.22)',
        borderColor: '#0284c7',
    },
    stylePreview: {
        fontSize: 14,
        color: '#94a3b8',
        letterSpacing: 2,
    },
    stylePreviewActive: {
        color: '#38bdf8',
        fontWeight: '800',
    },
    styleBtnLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
    },
    styleBtnLabelActive: {
        color: '#f8fafc',
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        marginVertical: 4,
    },
    weightHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    weightValueBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: 'rgba(56, 189, 248, 0.16)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.3)',
    },
    weightValueText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#38bdf8',
    },
    weightPresetsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    presetBtn: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
    },
    presetBtnActive: {
        backgroundColor: 'rgba(2, 132, 199, 0.22)',
        borderColor: '#0284c7',
    },
    presetBtnText: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    presetBtnTextActive: {
        color: '#38bdf8',
        fontWeight: '700',
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    stepBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    stepBtnText: {
        color: '#f8fafc',
        fontSize: 12,
        fontWeight: '700',
    },
    strokePreviewSample: {
        flex: 1,
        height: 16,
        justifyContent: 'center',
    },
    sampleLine: {
        width: '100%',
        backgroundColor: '#38bdf8',
        borderRadius: 2,
    },
    colorsStrictRow: {
        flexDirection: 'row',
        gap: 8,
    },
    colorPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    colorPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#f8fafc',
    },
    strictNote: {
        fontSize: 11,
        color: '#64748b',
        fontStyle: 'italic',
    },
});
