import React, { memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import {
    IconX,
    IconRoute,
    IconEye,
    IconRefresh,
    IconTarget,
    IconSparkles,
} from '@/src/presentation/components/icons';
import { useColorScheme } from '@/components/useColorScheme';
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

const STROKE_STYLE_OPTIONS: { id: GuideStrokeStyle; label: string; preview: string }[] = [
    { id: 'solid', label: 'Solid', preview: '━━━━━━' },
    { id: 'dashed', label: 'Dashed', preview: '━  ━  ━' },
    { id: 'dotted', label: 'Dotted', preview: '•  •  •  •' },
];

const WEIGHT_PRESETS: { label: string; weight: number }[] = [
    { label: 'Fine (0.6)', weight: 0.6 },
    { label: 'Medium (1.0)', weight: 1.0 },
    { label: 'Bold (1.8)', weight: 1.8 },
];

export const TrajectoryGuideCustomizer = memo(function TrajectoryGuideCustomizer({
    visible,
    onClose,
    config,
    onChangeConfig,
}: TrajectoryGuideCustomizerProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme !== 'light';
    const palette = getPalette(colorScheme);

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
                <View style={[styles.modalCard, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : palette.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleWrap}>
                            <IconSparkles size={20} color="#00d2ff" strokeWidth={2.2} />
                            <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                Trajectory Guide Engine
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={handleReset}
                                accessibilityLabel="Reset to defaults">
                                <IconRefresh size={16} color={isDark ? '#94a3b8' : palette.muted} strokeWidth={2} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={onClose}
                                accessibilityLabel="Close customizer">
                                <IconX size={18} color={isDark ? '#f8fafc' : palette.text} strokeWidth={2.4} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* SECCIÓN 1: GUÍA DE PUNTERÍA (AIMING GUIDE / PREDICTION) */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionHeaderLabelWrap}>
                                    <IconTarget size={16} color="#38bdf8" strokeWidth={2.2} />
                                    <Text style={styles.sectionTitle}>Aiming Guide (Prediction)</Text>
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
                                            <Text style={styles.togglePillTextActive}>Visible</Text>
                                        </>
                                    ) : (
                                        <>
                                            <IconEye size={13} color="#94a3b8" strokeWidth={2.2} />
                                            <Text style={styles.togglePillTextInactive}>Hidden</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.sectionSubtitle}>
                                Pre-shot trajectory calculated with zero discrepancy from physics engine.
                            </Text>

                            {/* Visibility Mode Selector: Full vs Exit Only */}
                            <View style={styles.modeSelectorWrap}>
                                <TouchableOpacity
                                    style={[
                                        styles.modeOptionBtn,
                                        config.aimMode === 'full' && styles.modeOptionBtnActive,
                                    ]}
                                    onPress={() => updateField('aimMode', 'full')}>
                                    <Text
                                        style={[
                                            styles.modeOptionText,
                                            config.aimMode === 'full' && styles.modeOptionTextActive,
                                        ]}>
                                        Show Full Trajectory
                                    </Text>
                                    <Text style={styles.modeOptionHint}>Complete multi-rail carom path</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modeOptionBtn,
                                        config.aimMode === 'exit_only' && styles.modeOptionBtnActive,
                                    ]}
                                    onPress={() => updateField('aimMode', 'exit_only')}>
                                    <Text
                                        style={[
                                            styles.modeOptionText,
                                            config.aimMode === 'exit_only' && styles.modeOptionTextActive,
                                        ]}>
                                        Exit Trajectory Only
                                    </Text>
                                    <Text style={styles.modeOptionHint}>Cue ball path after first impact</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* SECCIÓN 2: GUÍA DE EJECUCIÓN (EXECUTION GUIDE / TRAIL) */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionHeaderLabelWrap}>
                                    <IconRoute size={16} color="#facc15" strokeWidth={2.2} />
                                    <Text style={styles.sectionTitle}>Execution Guide (Trail)</Text>
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
                                            <Text style={styles.togglePillTextActive}>Visible</Text>
                                        </>
                                    ) : (
                                        <>
                                            <IconEye size={13} color="#94a3b8" strokeWidth={2.2} />
                                            <Text style={styles.togglePillTextInactive}>Hidden</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.sectionSubtitle}>
                                Actual path traveled by the balls during and after the shot execution.
                            </Text>
                        </View>

                        {/* SECCIÓN 3: PROPIEDADES DE TRAZO (PHOTOSHOP STYLE) */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Stroke Style (Estilo de Trazo)</Text>
                            <View style={styles.strokeStyleRow}>
                                {STROKE_STYLE_OPTIONS.map((styleOpt) => {
                                    const isSelected = config.strokeStyle === styleOpt.id;
                                    return (
                                        <TouchableOpacity
                                            key={styleOpt.id}
                                            style={[styles.styleBtn, isSelected && styles.styleBtnActive]}
                                            onPress={() => updateField('strokeStyle', styleOpt.id)}>
                                            <Text style={[styles.stylePreview, isSelected && styles.stylePreviewActive]}>
                                                {styleOpt.preview}
                                            </Text>
                                            <Text style={[styles.styleBtnLabel, isSelected && styles.styleBtnLabelActive]}>
                                                {styleOpt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.divider} />

                            {/* Grosor de Línea (Thickness) */}
                            <View style={styles.weightHeaderRow}>
                                <Text style={styles.sectionTitle}>Thickness (Stroke Weight)</Text>
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
                                            key={preset.label}
                                            style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                                            onPress={() => updateField('strokeWeight', preset.weight)}>
                                            <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                                                {preset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Stepper de Precisión */}
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={styles.stepBtn}
                                    onPress={() => handleAdjustWeight(-0.1)}>
                                    <Text style={styles.stepBtnText}>- 0.1</Text>
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
                                    style={styles.stepBtn}
                                    onPress={() => handleAdjustWeight(0.1)}>
                                    <Text style={styles.stepBtnText}>+ 0.1</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* SECCIÓN 4: ESTRICTEZ DE COLORES (COLOR STRICTNESS) */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Color Strictness (Reglamento)</Text>
                            <Text style={styles.sectionSubtitle}>
                                Simulator trajectory lines strictly match the official 3-cushion ball colors:
                            </Text>

                            <View style={styles.colorsStrictRow}>
                                <View style={styles.colorPill}>
                                    <View style={[styles.colorDot, { backgroundColor: STRICT_BALL_GUIDE_COLORS.white.stroke }]} />
                                    <Text style={styles.colorPillText}>White (Blanca)</Text>
                                </View>
                                <View style={styles.colorPill}>
                                    <View style={[styles.colorDot, { backgroundColor: STRICT_BALL_GUIDE_COLORS.yellow.stroke }]} />
                                    <Text style={styles.colorPillText}>Yellow (Amarilla)</Text>
                                </View>
                                <View style={styles.colorPill}>
                                    <View style={[styles.colorDot, { backgroundColor: STRICT_BALL_GUIDE_COLORS.red.stroke }]} />
                                    <Text style={styles.colorPillText}>Red (Roja)</Text>
                                </View>
                            </View>
                            <Text style={styles.strictNote}>
                                Catalog custom colors are suppressed to guarantee maximum visual clarity and tactical precision.
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
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
