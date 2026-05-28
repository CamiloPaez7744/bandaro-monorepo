import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { InteractiveBilliardsTable } from '@/src/presentation/components/Training/InteractiveBilliardsTable';
import { useTrainingSimulation } from '@/src/presentation/hooks/useTrainingSimulation';
import { getTrainingSystemById } from '@/src/presentation/screens/Training/trainingData';
import { BallId, Vec2, vec2, Ball, vec2Sub, SpinEffect } from '@bandaro/core';

type Orientation = 'horizontal' | 'vertical';

export function TrainingSimulationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ systemId: string }>();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);

    const system = useMemo(
        () => (params.systemId ? getTrainingSystemById(params.systemId) : null),
        [params.systemId]
    );

    const initialPositions = useMemo(() => {
        if (!system || system.positions.length === 0) {
            return {
                white: vec2(50, 71),
                yellow: vec2(200, 50),
                red: vec2(234, 92),
            };
        }
        const pos = system.positions[0];
        return {
            white: vec2(pos.white.x, pos.white.y),
            yellow: vec2(pos.yellow.x, pos.yellow.y),
            red: vec2(pos.red.x, pos.red.y),
        };
    }, [system]);

    const {
        state,
        setBallPosition,
        setCueBall,
        setSpin,
        setPowerLevel,
        setAimDirection,
        updateTrajectory,
        executeShot,
        resetBalls,
    } = useTrainingSimulation(initialPositions);

    const [tableOrientation, setTableOrientation] = useState<Orientation>(
        width >= 900 ? 'horizontal' : 'vertical'
    );
    const [isEditMode, setIsEditMode] = useState(false);
    const [showGuides, setShowGuides] = useState(true);
    const [maxCushionBounces, setMaxCushionBounces] = useState(5);

    useEffect(() => {
        setTableOrientation(width >= 900 ? 'horizontal' : 'vertical');
    }, [width]);

    useEffect(() => {
        updateTrajectory();
    }, [state.balls, state.cueBallId, state.aimDirection, state.powerLevel, state.spin, updateTrajectory]);

    const handleBallMove = useCallback(
        (ballId: BallId, position: Vec2) => {
            setBallPosition(ballId, position);
        },
        [setBallPosition]
    );

    const handleAimChange = useCallback(
        (direction: Vec2) => {
            setAimDirection(direction);
        },
        [setAimDirection]
    );

    const handleReset = useCallback(() => {
        resetBalls(initialPositions);
    }, [resetBalls, initialPositions]);

    if (!system) {
        return (
            <View style={[styles.notFound, { paddingTop: insets.top + theme.spacing.lg }]}>
                <Text style={styles.notFoundTitle}>Sistema no encontrado</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{t('training.system.back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top + 8,
                        paddingBottom: insets.bottom + 8,
                    },
                ]}>
                
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{system.name}</Text>
                    <View style={styles.headerButtonsRow}>
                        <TouchableOpacity
                            style={[
                                styles.iconButton,
                                {
                                    backgroundColor: isEditMode ? '#fbbf24' : `${palette.primary}22`,
                                },
                            ]}
                            onPress={() => setIsEditMode((prev) => !prev)}
                            disabled={state.isSimulating}>
                            <Text style={{ fontSize: 18, color: isEditMode ? '#78350f' : palette.primary }}>
                                {isEditMode ? '✏️' : '🎯'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: `${palette.primary}22` }]}
                            onPress={handleReset}
                            disabled={state.isSimulating}>
                            <Text style={{ fontSize: 18 }}>↻</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: `${palette.primary}22` }]}
                            onPress={() => router.back()}>
                            <Text style={{ fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.tableWrap}>
                    <InteractiveBilliardsTable
                        orientation={tableOrientation}
                        style={styles.tableStage}
                        balls={state.balls}
                        cueBallId={state.cueBallId}
                        trajectory={state.trajectory}
                        onBallMove={handleBallMove}
                        onAimChange={handleAimChange}
                        isSimulating={state.isSimulating}
                        isEditMode={isEditMode}
                        showGuides={showGuides}
                        maxCushionBounces={maxCushionBounces}
                    />
                </View>

                {state.validation && (
                    <View
                        style={[
                            styles.validationCard,
                            {
                                backgroundColor: state.validation.isValid ? `${palette.primary}15` : '#fef2f2',
                                borderColor: state.validation.isValid ? palette.primary : '#ef4444',
                            },
                        ]}>
                        <Text
                            style={[
                                styles.validationText,
                                {
                                    color: state.validation.isValid ? palette.primary : '#991b1b',
                                },
                            ]}>
                            {state.validation.reason}
                        </Text>
                    </View>
                )}

                <View style={styles.controlsRow}>
                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Bola</Text>
                        <View style={styles.ballSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.ballButton,
                                    {
                                        backgroundColor: state.cueBallId === 'white' ? '#f8fafc' : `${palette.primary}15`,
                                        borderColor: state.cueBallId === 'white' ? '#cbd5e1' : `${palette.primary}30`,
                                    },
                                ]}
                                onPress={() => setCueBall('white')}
                                disabled={state.isSimulating}>
                                <Text style={{ fontSize: 16 }}>⚪</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.ballButton,
                                    {
                                        backgroundColor: state.cueBallId === 'yellow' ? '#facc15' : `${palette.primary}15`,
                                        borderColor: state.cueBallId === 'yellow' ? '#ca8a04' : `${palette.primary}30`,
                                    },
                                ]}
                                onPress={() => setCueBall('yellow')}
                                disabled={state.isSimulating}>
                                <Text style={{ fontSize: 16 }}>🟡</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Potencia</Text>
                        <View style={styles.powerSelector}>
                            {[1, 2, 3, 4, 5].map((level) => (
                                <TouchableOpacity
                                    key={level}
                                    style={[
                                        styles.powerButton,
                                        {
                                            backgroundColor: state.powerLevel === level ? palette.primary : `${palette.primary}15`,
                                        },
                                    ]}
                                    onPress={() => setPowerLevel(level)}
                                    disabled={state.isSimulating}>
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: '700',
                                            color: state.powerLevel === level ? '#fff' : palette.primary,
                                        }}>
                                        {level}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Efecto</Text>
                        <View style={styles.spinSelector}>
                            {[
                                { label: '↖', x: -0.6, y: -0.6 },
                                { label: '↑', x: 0, y: -0.7 },
                                { label: '↗', x: 0.6, y: -0.6 },
                                { label: '←', x: -0.7, y: 0 },
                                { label: '●', x: 0, y: 0 },
                                { label: '→', x: 0.7, y: 0 },
                                { label: '↙', x: -0.6, y: 0.6 },
                                { label: '↓', x: 0, y: 0.7 },
                                { label: '↘', x: 0.6, y: 0.6 },
                            ].map((preset, idx) => {
                                const isSelected =
                                    Math.abs(state.spin.x - preset.x) < 0.1 && Math.abs(state.spin.y - preset.y) < 0.1;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            styles.spinButton,
                                            {
                                                backgroundColor: isSelected ? palette.primary : `${palette.primary}15`,
                                            },
                                        ]}
                                        onPress={() =>
                                            setSpin({
                                                x: preset.x,
                                                y: preset.y,
                                                magnitude: Math.sqrt(preset.x * preset.x + preset.y * preset.y),
                                            } as SpinEffect)
                                        }
                                        disabled={state.isSimulating}>
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: isSelected ? '#fff' : palette.primary,
                                            }}>
                                            {preset.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Bandas</Text>
                        <View style={styles.bounceSelector}>
                            <TouchableOpacity
                                style={[styles.bounceButton, { backgroundColor: `${palette.primary}22` }]}
                                onPress={() => setMaxCushionBounces((prev) => Math.max(1, prev - 1))}>
                                <Text style={{ fontSize: 16, color: palette.primary }}>-</Text>
                            </TouchableOpacity>
                            <Text style={[styles.bounceValue, { color: palette.text }]}>{maxCushionBounces}</Text>
                            <TouchableOpacity
                                style={[styles.bounceButton, { backgroundColor: `${palette.primary}22` }]}
                                onPress={() => setMaxCushionBounces((prev) => Math.min(15, prev + 1))}>
                                <Text style={{ fontSize: 16, color: palette.primary }}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.executeButton,
                            state.isSimulating && styles.executeButtonDisabled,
                            { backgroundColor: palette.primary },
                        ]}
                        onPress={executeShot}
                        disabled={state.isSimulating}>
                        <Text style={styles.executeButtonText}>{state.isSimulating ? '⏳' : '▶'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.guideToggleRow}>
                    <TouchableOpacity
                        style={[
                            styles.guideToggle,
                            {
                                backgroundColor: showGuides ? palette.primary : `${palette.primary}22`,
                            },
                        ]}
                        onPress={() => setShowGuides((prev) => !prev)}>
                        <Text style={{ fontSize: 11, color: showGuides ? '#fff' : palette.primary, fontWeight: '700' }}>
                            {showGuides ? 'Guías ON' : 'Guías OFF'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
    StyleSheet.create({
        container: {
            backgroundColor: palette.background,
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.md,
            minHeight: '100%',
        },
        notFound: {
            flex: 1,
            backgroundColor: palette.background,
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: theme.spacing.md,
        },
        notFoundTitle: {
            color: palette.text,
            fontSize: 20,
            fontWeight: '800',
        },
        backButton: {
            borderRadius: theme.radius.md,
            backgroundColor: palette.primary,
            paddingVertical: 10,
            paddingHorizontal: 16,
        },
        backButtonText: {
            color: '#fff',
            fontWeight: '800',
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
        },
        headerTextWrap: {
            flexShrink: 1,
        },
        title: {
            color: palette.text,
            fontSize: 24,
            fontWeight: '900',
        },
        subtitle: {
            marginTop: 2,
            color: palette.muted,
            fontSize: 13,
            lineHeight: 18,
        },
        headerButton: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: palette.card,
        },
        headerButtonText: {
            color: palette.text,
            fontSize: 12,
            fontWeight: '700',
        },
        tableCard: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
            gap: 12,
        },
        tableHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        headerButtonsRow: {
            flexDirection: 'row',
            gap: 8,
        },
        cardTitle: {
            color: palette.text,
            fontSize: 16,
            fontWeight: '800',
        },
        actionButton: {
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: `${palette.primary}22`,
        },
        actionButtonText: {
            color: palette.primary,
            fontSize: 12,
            fontWeight: '800',
        },
        editButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1.5,
        },
        editButtonIcon: {
            fontSize: 14,
        },
        editButtonText: {
            fontSize: 11,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        orientationButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: `${palette.primary}12`,
            borderWidth: 1,
            borderColor: `${palette.primary}22`,
        },
        orientationButtonLabel: {
            color: palette.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        orientationButtonValue: {
            color: palette.primary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
        },
        tableWrap: {
            borderRadius: 18,
            overflow: 'hidden',
        },
        tableStage: {
            width: '100%',
        },
        guideControlsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 8,
        },
        guideToggleButton: {
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
        },
        guideToggleText: {
            fontSize: 12,
            fontWeight: '800',
        },
        bounceControlRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        bounceLabel: {
            fontSize: 12,
            fontWeight: '700',
        },
        bounceButton: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        bounceButtonText: {
            fontSize: 18,
            fontWeight: '800',
        },
        bounceValue: {
            fontSize: 16,
            fontWeight: '900',
            minWidth: 20,
            textAlign: 'center',
        },
        validationCard: {
            borderRadius: 12,
            borderWidth: 1.5,
            padding: 12,
        },
        validationText: {
            fontSize: 13,
            fontWeight: '700',
            textAlign: 'center',
        },
        controlsCard: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
        },
        shotButton: {
            borderRadius: 12,
            backgroundColor: palette.primary,
            paddingVertical: 14,
            alignItems: 'center',
        },
        shotButtonDisabled: {
            opacity: 0.5,
        },
        shotButtonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '800',
        },
    });
