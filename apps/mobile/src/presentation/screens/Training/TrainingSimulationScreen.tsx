import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconPencil, IconTarget, IconRefresh, IconX, IconCircle, IconBolt, IconTargetArrow, IconRuler2, IconNumbers, IconPlayerPlay, IconLoader2 } from '@tabler/icons-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { EffectBallSelector } from '@/src/presentation/components/Training/EffectBallSelector';
import { InteractiveBilliardsTable } from '@/src/presentation/components/Training/InteractiveBilliardsTable';
import { SystemNumberingControl, NumberAnchor, Formula } from '@/src/presentation/components/Training/SystemNumberingControl';
import { useTrainingSimulation } from '@/src/presentation/hooks/useTrainingSimulation';
import { getTrainingSystemById } from '@/src/presentation/screens/Training/trainingData';
import { container } from '@/src/presentation/container';
import { BallId, Vec2, vec2, vec2Sub, SpinEffect, DEFAULT_TABLE, SnapshotBall, snapshotToBalls } from '@bandaro/core';
import { ApiSnapshotRepository } from '@/src/infrastructure/repositories/ApiSnapshotRepository';

type Orientation = 'horizontal' | 'vertical';
type ActivePanel = 'none' | 'ball' | 'power' | 'effect' | 'numbering';

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
    icon: React.ReactNode;
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
            {icon}
            <Text style={[sidebarStyles.label, { color: isActive ? '#fff' : palette.primary }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const sidebarStyles = StyleSheet.create({
    button: {
        width: 60,
        height: 60,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    label: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
});

// eslint-disable-next-line sonarjs/cognitive-complexity
export function TrainingSimulationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ systemId: string; snapshotId: string }>();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);

    const system = useMemo(
        () => (params.systemId ? getTrainingSystemById(params.systemId) : null),
        [params.systemId]
    );

    const [snapshotBalls, setSnapshotBalls] = useState<SnapshotBall[] | null>(null);

    useEffect(() => {
        if (params.snapshotId) {
            const repo = new ApiSnapshotRepository();
            repo.getById(params.snapshotId).then((snapshot) => {
                if (snapshot) {
                    setSnapshotBalls(snapshot.balls);
                }
            }).catch(() => {});
        }
    }, [params.snapshotId]);

    const initialPositions = useMemo(() => {
        if (snapshotBalls && snapshotBalls.length > 0) {
            const balls = snapshotToBalls(snapshotBalls);
            const result: { white: Vec2; yellow: Vec2; red: Vec2 } = {
                white: vec2(50, 71),
                yellow: vec2(200, 50),
                red: vec2(234, 92),
            };
            for (const ball of balls) {
                result[ball.id] = ball.pos;
            }
            return result;
        }

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
    }, [system, snapshotBalls]);

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

    // Reset balls when snapshot loads asynchronously
    useEffect(() => {
        if (snapshotBalls && snapshotBalls.length > 0) {
            resetBalls(initialPositions);
        }
    }, [snapshotBalls, resetBalls, initialPositions]);

    const [tableOrientation, setTableOrientation] = useState<Orientation>(
        width >= 900 ? 'horizontal' : 'vertical'
    );
    const [isEditMode, setIsEditMode] = useState(false);
    const [showGuides, setShowGuides] = useState(true);
    const [showRuler, setShowRuler] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanel>('none');
    const [numberingAnchors, setNumberingAnchors] = useState<NumberAnchor[]>([]);
    const [numberingFormula, setNumberingFormula] = useState<Formula | null>(null);
    const [showNumbering, setShowNumbering] = useState(false);
    const panelAnimation = useMemo(() => new Animated.Value(0), []);
    const isWideLayout = width >= 1100;

    useEffect(() => {
        setTableOrientation(width >= 900 ? 'horizontal' : 'vertical');
    }, [width]);

    useEffect(() => {
        if (!system || system.positions.length === 0 || params.snapshotId) {
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

    if (!system && !params.snapshotId) {
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
                    <Text style={styles.title}>{system?.name ?? 'Snapshot'}</Text>
                    <View style={styles.headerButtonsRow}>
                        <TouchableOpacity
                            style={[
                                styles.trainButton,
                                {
                                    backgroundColor: palette.primary,
                                },
                            ]}
                            onPress={() => {
                                const whiteB = state.balls.find((b) => b.id === 'white');
                                const yellowB = state.balls.find((b) => b.id === 'yellow');
                                const redB = state.balls.find((b) => b.id === 'red');
                                router.push({
                                    pathname: '/training/session',
                                    params: {
                                        customName: system?.name ? `Práctica: ${system.name}` : 'Posición de Simulador',
                                        whiteX: String(Math.round(whiteB ? whiteB.pos.x : 50)),
                                        whiteY: String(Math.round(whiteB ? whiteB.pos.y : 71)),
                                        yellowX: String(Math.round(yellowB ? yellowB.pos.x : 142)),
                                        yellowY: String(Math.round(yellowB ? yellowB.pos.y : 71)),
                                        redX: String(Math.round(redB ? redB.pos.x : 220)),
                                        redY: String(Math.round(redB ? redB.pos.y : 71)),
                                    },
                                });
                            }}
                            disabled={state.isSimulating}>
                            <IconTarget size={16} color="#fff" strokeWidth={2.2} />
                            <Text style={styles.trainButtonText}>Entrenar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.iconButton,
                                {
                                    backgroundColor: isEditMode ? '#fbbf24' : `${palette.primary}22`,
                                },
                            ]}
                            onPress={() => setIsEditMode((prev) => !prev)}
                            disabled={state.isSimulating}>
                            {isEditMode ? (
                                <IconPencil size={18} color="#78350f" strokeWidth={2} />
                            ) : (
                                <IconTarget size={18} color={palette.primary} strokeWidth={2} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: `${palette.primary}22` }]}
                            onPress={handleReset}
                            disabled={state.isSimulating}>
                            <IconRefresh size={18} color={palette.primary} strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: `${palette.primary}22` }]}
                            onPress={() => router.back()}>
                            <IconX size={18} color={palette.primary} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.mainLayout}>
                    <View style={styles.sidebar}>
                        <SidebarButton
                            icon={<IconCircle size={20} color={activePanel === 'ball' ? '#fff' : palette.primary} strokeWidth={2} />}
                            label="Bola"
                            isActive={activePanel === 'ball'}
                            onPress={() => togglePanel('ball')}
                            palette={palette}
                        />
                        <SidebarButton
                            icon={<IconBolt size={20} color={activePanel === 'power' ? '#fff' : palette.primary} strokeWidth={2} />}
                            label="Potencia"
                            isActive={activePanel === 'power'}
                            onPress={() => togglePanel('power')}
                            palette={palette}
                        />
                        <SidebarButton
                            icon={<IconTargetArrow size={20} color={activePanel === 'effect' ? '#fff' : palette.primary} strokeWidth={2} />}
                            label="Efecto"
                            isActive={activePanel === 'effect'}
                            onPress={() => togglePanel('effect')}
                            palette={palette}
                        />
                        <SidebarButton
                            icon={<IconRuler2 size={20} color={showRuler ? '#fff' : palette.primary} strokeWidth={2} />}
                            label="Regla"
                            isActive={showRuler}
                            onPress={() => setShowRuler((prev) => !prev)}
                            palette={palette}
                        />
                        <SidebarButton
                            icon={<IconNumbers size={20} color={activePanel === 'numbering' ? '#fff' : palette.primary} strokeWidth={2} />}
                            label="Sistema"
                            isActive={activePanel === 'numbering'}
                            onPress={() => togglePanel('numbering')}
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
                                showRuler={showRuler}
                                numberingAnchors={numberingAnchors}
                                numberingFormula={numberingFormula}
                                showNumbering={showNumbering}
                                onNumberingAnchorsChange={setNumberingAnchors}
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
                                {state.isSimulating ? (
                                    <IconLoader2 size={16} color="#fff" strokeWidth={2.5} />
                                ) : (
                                    <IconPlayerPlay size={16} color="#fff" strokeWidth={2.5} />
                                )}
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
                                    {activePanel === 'numbering' && 'Sistema de Numeración'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.closeButton, { backgroundColor: `${palette.primary}22` }]}
                                    onPress={() => setActivePanel('none')}>
                                    <IconX size={18} color={palette.primary} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                style={styles.panelScroll}
                                contentContainerStyle={styles.panelContent}
                                showsVerticalScrollIndicator={false}>
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

                                {activePanel === 'numbering' && (
                                    <View style={styles.controlGroup}>
                                        <View style={styles.numberingToggle}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.toggleButton,
                                                    showNumbering && { backgroundColor: palette.primary },
                                                ]}
                                                onPress={() => setShowNumbering((prev) => !prev)}>
                                                <Text
                                                    style={[
                                                        styles.toggleButtonText,
                                                        { color: showNumbering ? '#fff' : palette.primary },
                                                    ]}>
                                                    {showNumbering ? 'Ocultar Números' : 'Mostrar Números'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        {showNumbering && (
                                            <View style={styles.numberingActions}>
                                                <TouchableOpacity
                                                    style={[styles.quickAddButton, { backgroundColor: palette.primary }]}
                                                    onPress={() => {
                                                        const newAnchor: NumberAnchor = {
                                                            id: Date.now().toString(),
                                                            x: 150,
                                                            y: 80,
                                                            value: String(numberingAnchors.length + 1),
                                                            color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'][numberingAnchors.length % 4],
                                                            variableType: (['arrival', 'attack', 'departure', 'custom'] as const)[numberingAnchors.length % 4],
                                                        };
                                                        setNumberingAnchors([...numberingAnchors, newAnchor]);
                                                    }}>
                                                    <Text style={styles.quickAddButtonText}>+ Agregar Número</Text>
                                                </TouchableOpacity>
                                                {numberingAnchors.length > 0 && (
                                                    <TouchableOpacity
                                                        style={[styles.clearButton, { backgroundColor: '#ef4444' }]}
                                                        onPress={() => setNumberingAnchors([])}>
                                                        <Text style={styles.clearButtonText}>Limpiar Todo</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}

                                        {showNumbering && isEditMode && (
                                            <View style={[styles.editHint, { backgroundColor: `${palette.primary}15`, borderColor: `${palette.primary}30` }]}>
                                                <Text style={[styles.editHintText, { color: palette.primary }]}>
                                                    Arrastra los números para posicionarlos
                                                </Text>
                                            </View>
                                        )}

                                        <SystemNumberingControl
                                            anchors={numberingAnchors}
                                            formula={numberingFormula}
                                            onAnchorsChange={setNumberingAnchors}
                                            onFormulaChange={setNumberingFormula}
                                        />
                                    </View>
                                )}
                            </ScrollView>
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
            gap: 8,
            marginBottom: 8,
        },
        title: {
            color: palette.text,
            fontSize: 16,
            fontWeight: '900',
        },
        headerButtonsRow: {
            flexDirection: 'row',
            gap: 6,
        },
        iconButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
        },
        trainButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 36,
            paddingHorizontal: 12,
            borderRadius: 18,
            gap: 4,
        },
        trainButtonText: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '700',
        },
        mainLayout: {
            flex: 1,
            flexDirection: 'row',
            gap: 8,
        },
        sidebar: {
            width: 70,
            gap: 8,
            paddingTop: 4,
        },
        tablePane: {
            flex: 1,
            gap: 8,
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
            borderRadius: 8,
            borderWidth: 1.5,
            padding: 8,
        },
        validationText: {
            fontSize: 11,
            fontWeight: '700',
            textAlign: 'center',
        },
        actionBar: {
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
        },
        guideToggle: {
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        executeButton: {
            flex: 1,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: 'center',
        },
        executeButtonDisabled: {
            opacity: 0.5,
        },
        executeButtonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '800',
        },
        panelOverlay: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 340,
            backgroundColor: palette.card,
            borderLeftWidth: 1,
            borderColor: palette.border,
            boxShadow: '-4px 0px 12px rgba(0, 0, 0, 0.15)',
            elevation: 8,
            zIndex: 100,
        },
        panelHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: theme.spacing.sm,
            borderBottomWidth: 1,
            borderColor: palette.border,
        },
        panelTitle: {
            fontSize: 16,
            fontWeight: '800',
        },
        closeButton: {
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        panelScroll: {
            flex: 1,
        },
        panelContent: {
            padding: theme.spacing.md,
        },
        controlGroup: {
            gap: 12,
        },
        controlLabel: {
            color: palette.muted,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
        },
        ballSelector: {
            flexDirection: 'row',
            gap: 12,
            justifyContent: 'center',
        },
        ballButton: {
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        powerSelector: {
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
        },
        powerButton: {
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        numberingToggle: {
            marginBottom: 16,
        },
        toggleButton: {
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: `${palette.primary}15`,
            borderWidth: 1,
            borderColor: `${palette.primary}30`,
            alignItems: 'center',
        },
        toggleButtonText: {
            fontSize: 13,
            fontWeight: '700',
        },
        numberingActions: {
            flexDirection: 'row',
            gap: 6,
            marginBottom: 8,
        },
        quickAddButton: {
            flex: 1,
            paddingVertical: 8,
            borderRadius: 6,
            alignItems: 'center',
        },
        quickAddButtonText: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '700',
        },
        clearButton: {
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 6,
            alignItems: 'center',
        },
        clearButtonText: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '700',
        },
        editHint: {
            padding: 8,
            borderRadius: 6,
            borderWidth: 1,
            marginBottom: 8,
        },
        editHintText: {
            fontSize: 11,
            fontWeight: '600',
            textAlign: 'center',
        },
    });
