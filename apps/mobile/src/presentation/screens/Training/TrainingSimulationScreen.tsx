import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { EffectBallSelector } from '@/src/presentation/components/Training/EffectBallSelector';
import { InteractiveBilliardsTable } from '@/src/presentation/components/Training/InteractiveBilliardsTable';
import { useTrainingSimulation } from '@/src/presentation/hooks/useTrainingSimulation';
import { getTrainingSystemById } from '@/src/presentation/screens/Training/trainingData';
import { BallId, Vec2, vec2, vec2Sub, SpinEffect } from '@bandaro/core';

type Orientation = 'horizontal' | 'vertical';
type ActivePanel = 'none' | 'ball' | 'power' | 'effect' | 'cushions';

const EFFECT_SPIN_PRESETS: Record<string, SpinEffect> = {
    center: { x: 0, y: 0, magnitude: 0 },
    top: { x: 0, y: -0.7, magnitude: 0.7 },
    'top-right': { x: 0.6, y: -0.6, magnitude: 0.85 },
    right: { x: 0.7, y: 0, magnitude: 0.7 },
    'bottom-right': { x: 0.6, y: 0.6, magnitude: 0.85 },
    bottom: { x: 0, y: 0.7, magnitude: 0.7 },
    'bottom-left': { x: -0.6, y: 0.6, magnitude: 0.85 },
    left: { x: -0.7, y: 0, magnitude: 0.7 },
    'top-left': { x: -0.6, y: -0.6, magnitude: 0.85 },
};

function getInitialPowerLevel(recommendedPower: number) {
    return Math.min(5, Math.max(1, Math.round(recommendedPower / 20)));
}

interface SidebarButtonProps {
    icon: string;
    label: string;
    isActive: boolean;
    onPress: () => void;
    palette: ReturnType<typeof getPalette>;
}

function SidebarButton({ icon, label, isActive, onPress, palette }: SidebarButtonProps) {
    return (
        <TouchableOpacity
            style={[
                sidebarStyles.button,
                {
                    backgroundColor: isActive ? palette.primary : `${palette.primary}15`,
                    borderColor: isActive ? palette.primary : `${palette.primary}30`,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}>
            <Text style={[sidebarStyles.icon, { color: isActive ? '#fff' : palette.primary }]}>{icon}</Text>
            <Text style={[sidebarStyles.label, { color: isActive ? '#fff' : palette.primary }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const sidebarStyles = StyleSheet.create({
    button: {
        width: 70,
        height: 70,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    icon: {
        fontSize: 24,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

// eslint-disable-next-line sonarjs/cognitive-complexity
export function TrainingSimulationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ systemId: string }>();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
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
    const [showRuler, setShowRuler] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanel>('none');
    const panelAnimation = useMemo(() => new Animated.Value(0), []);
    const isWideLayout = width >= 1100;

    useEffect(() => {
        setTableOrientation(width >= 900 ? 'horizontal' : 'vertical');
    }, [width]);

    useEffect(() => {
        if (!system || system.positions.length === 0) {
            return;
        }

        const firstPosition = system.positions[0];
        const presetSpin = EFFECT_SPIN_PRESETS[system.recommendedEffect] ?? EFFECT_SPIN_PRESETS.center;
        const presetAim = firstPosition.trajectory[1]
            ? vec2Sub(
                  vec2(firstPosition.trajectory[1].x, firstPosition.trajectory[1].y),
                  vec2(firstPosition.white.x, firstPosition.white.y)
              )
            : vec2(1, 0);

        resetBalls(initialPositions);
        setCueBall('white');
        setSpin(presetSpin);
        setPowerLevel(getInitialPowerLevel(system.recommendedPower));
        setAimDirection(presetAim);
        setIsEditMode(true);
        setShowGuides(true);
        setMaxCushionBounces(5);
    }, [initialPositions, resetBalls, setAimDirection, setCueBall, setPowerLevel, setSpin, system]);

    useEffect(() => {
        updateTrajectory();
    }, [state.balls, state.cueBallId, state.aimDirection, state.powerLevel, state.spin, updateTrajectory]);

    useEffect(() => {
        Animated.timing(panelAnimation, {
            toValue: activePanel === 'none' ? 0 : 1,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [activePanel, panelAnimation]);

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

    const togglePanel = useCallback(
        (panel: ActivePanel) => {
            setActivePanel((prev) => (prev === panel ? 'none' : panel));
        },
        []
    );

    const panelOpacity = panelAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const panelScale = panelAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1],
    });

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

                <View style={styles.mainLayout}>
                    <View style={styles.sidebar}>
                        <SidebarButton
                            icon="⚪"
                            label="Bola"
                            isActive={activePanel === 'ball'}
                            onPress={() => togglePanel('ball')}
                            palette={palette}
                        />
                        <SidebarButton
                            icon="⚡"
                            label="Potencia"
                            isActive={activePanel === 'power'}
                            onPress={() => togglePanel('power')}
                            palette={palette}
                        />
                        <SidebarButton
                            icon="🎯"
                            label="Efecto"
                            isActive={activePanel === 'effect'}
                            onPress={() => togglePanel('effect')}
                            palette={palette}
                        />
                        <SidebarButton
                            icon="↔"
                            label="Bandas"
                            isActive={activePanel === 'cushions'}
                            onPress={() => togglePanel('cushions')}
                            palette={palette}
                        />
                        <SidebarButton
                            icon="📏"
                            label="Regla"
                            isActive={showRuler}
                            onPress={() => setShowRuler((prev) => !prev)}
                            palette={palette}
                        />
                    </View>

                    <View style={styles.tablePane}>
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
                                showRuler={showRuler}
                            />
                        </View>

                        {state.validation ? (
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
                        ) : null}

                        <View style={styles.actionBar}>
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
                    </View>

                    {activePanel !== 'none' && (
                        <Animated.View
                            style={[
                                styles.panelOverlay,
                                {
                                    opacity: panelOpacity,
                                    transform: [{ scale: panelScale }],
                                },
                            ]}>
                            <View style={styles.panelHeader}>
                                <Text style={[styles.panelTitle, { color: palette.text }]}>
                                    {activePanel === 'ball' && 'Seleccionar Bola'}
                                    {activePanel === 'power' && 'Potencia del Tiro'}
                                    {activePanel === 'effect' && 'Efecto de la Bola'}
                                    {activePanel === 'cushions' && 'Número de Bandas'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.closeButton, { backgroundColor: `${palette.primary}22` }]}
                                    onPress={() => setActivePanel('none')}>
                                    <Text style={{ fontSize: 18, color: palette.primary }}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.panelContent}>
                                {activePanel === 'ball' && (
                                    <View style={styles.controlGroup}>
                                        <Text style={styles.controlLabel}>Bola de Ataque</Text>
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
                                                <Text style={{ fontSize: 24 }}>⚪</Text>
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
                                                <Text style={{ fontSize: 24 }}>🟡</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {activePanel === 'power' && (
                                    <View style={styles.controlGroup}>
                                        <Text style={styles.controlLabel}>Nivel de Potencia</Text>
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
                                                            fontSize: 16,
                                                            fontWeight: '700',
                                                            color: state.powerLevel === level ? '#fff' : palette.primary,
                                                        }}>
                                                        {level}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {activePanel === 'effect' && (
                                    <View style={styles.controlGroup}>
                                        <EffectBallSelector
                                            spin={state.spin}
                                            onSpinChange={setSpin}
                                            disabled={state.isSimulating}
                                            size={280}
                                            initialGuidesVisible
                                        />
                                    </View>
                                )}

                                {activePanel === 'cushions' && (
                                    <View style={styles.controlGroup}>
                                        <Text style={styles.controlLabel}>Máximo de Rebotes</Text>
                                        <View style={styles.bounceSelector}>
                                            <TouchableOpacity
                                                style={[styles.bounceButton, { backgroundColor: `${palette.primary}22` }]}
                                                onPress={() => setMaxCushionBounces((prev) => Math.max(1, prev - 1))}>
                                                <Text style={{ fontSize: 24, color: palette.primary }}>-</Text>
                                            </TouchableOpacity>
                                            <Text style={[styles.bounceValue, { color: palette.text }]}>{maxCushionBounces}</Text>
                                            <TouchableOpacity
                                                style={[styles.bounceButton, { backgroundColor: `${palette.primary}22` }]}
                                                onPress={() => setMaxCushionBounces((prev) => Math.min(15, prev + 1))}>
                                                <Text style={{ fontSize: 24, color: palette.primary }}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </Animated.View>
                    )}
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: palette.background,
            paddingHorizontal: theme.spacing.md,
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
            marginBottom: theme.spacing.md,
        },
        title: {
            color: palette.text,
            fontSize: 20,
            fontWeight: '900',
        },
        headerButtonsRow: {
            flexDirection: 'row',
            gap: 8,
        },
        iconButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        mainLayout: {
            flex: 1,
            flexDirection: 'row',
            gap: theme.spacing.md,
        },
        sidebar: {
            width: 80,
            gap: 12,
            paddingTop: 8,
        },
        tablePane: {
            flex: 1,
            gap: theme.spacing.md,
        },
        tableWrap: {
            borderRadius: 18,
            overflow: 'hidden',
            flex: 1,
        },
        tableStage: {
            width: '100%',
            height: '100%',
        },
        validationCard: {
            borderRadius: 12,
            borderWidth: 1.5,
            padding: 10,
        },
        validationText: {
            fontSize: 12,
            fontWeight: '700',
            textAlign: 'center',
        },
        actionBar: {
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
        },
        guideToggle: {
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 10,
        },
        executeButton: {
            flex: 1,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
        },
        executeButtonDisabled: {
            opacity: 0.5,
        },
        executeButtonText: {
            color: '#fff',
            fontSize: 18,
            fontWeight: '800',
        },
        panelOverlay: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            backgroundColor: palette.card,
            borderLeftWidth: 1,
            borderColor: palette.border,
            shadowColor: '#000',
            shadowOffset: { width: -4, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 100,
        },
        panelHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing.md,
            borderBottomWidth: 1,
            borderColor: palette.border,
        },
        panelTitle: {
            fontSize: 18,
            fontWeight: '800',
        },
        closeButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
        },
        panelContent: {
            padding: theme.spacing.lg,
        },
        controlGroup: {
            gap: 16,
        },
        controlLabel: {
            color: palette.muted,
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        ballSelector: {
            flexDirection: 'row',
            gap: 16,
            justifyContent: 'center',
        },
        ballButton: {
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        powerSelector: {
            flexDirection: 'row',
            gap: 12,
            justifyContent: 'center',
        },
        powerButton: {
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
        bounceSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            justifyContent: 'center',
        },
        bounceButton: {
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
        bounceValue: {
            fontSize: 32,
            fontWeight: '900',
            minWidth: 60,
            textAlign: 'center',
        },
    });
