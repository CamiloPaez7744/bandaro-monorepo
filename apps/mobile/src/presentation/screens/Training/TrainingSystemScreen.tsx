import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { BilliardsTableThumbnail } from '@/src/presentation/components/Training/BilliardsTableThumbnail';
import { EffectBallSelector } from '@/src/presentation/components/Training/EffectBallSelector';
import {
    CONTACT_PRESETS,
    EFFECT_PRESETS,
    effectKeyToSpin,
    getTrainingSystemById,
    spinToEffectKey,
    type Point2D,
    type ContactKey,
    type EffectKey,
} from '@/src/presentation/screens/Training/trainingData';
import { type SpinEffect } from '@bandaro/core';

type Orientation = 'horizontal' | 'vertical';

type BallId = 'white' | 'yellow' | 'red';

type BallState = Record<BallId, Point2D>;

type GuideVisibility = Record<BallId, boolean>;

type SavedStageState = {
    positionId: string;
    tableOrientation: Orientation;
    ballPositions: BallState;
    aimTarget: Point2D;
    selectedEffect: EffectKey;
    selectedContact: ContactKey;
    showSolution: boolean;
    guideVisibility: GuideVisibility;
};

const TABLE_W = 284;
const TABLE_H = 142;
const GUIDE_STORAGE_PREFIX = '@bandaro/training-stage';
const BALL_ORDER: BallId[] = ['white', 'yellow', 'red'];
const CONTACT_STRENGTH: Record<ContactKey, number> = {
    '1/2': 1,
    '1/4': 0.82,
    '1/8': 0.64,
    '1/16': 0.48,
};

function cloneStageBalls(position: { white: Point2D; yellow: Point2D; red: Point2D }): BallState {
    return {
        white: { ...position.white },
        yellow: { ...position.yellow },
        red: { ...position.red },
    };
}

function getGuideStrength(contact: ContactKey) {
    return CONTACT_STRENGTH[contact];
}

function getEffectBias(effect: EffectKey) {
    const preset = EFFECT_PRESETS[effect];
    return {
        x: (preset.x - 50) / 50,
        y: (50 - preset.y) / 50,
    };
}

function halfWay(from: Point2D, to: Point2D): Point2D {
    return {
        x: from.x + (to.x - from.x) * 0.5,
        y: from.y + (to.y - from.y) * 0.5,
    };
}

function mapStagePointToTable(point: Point2D, orientation: Orientation, layout: { width: number; height: number }): Point2D {
    const normalizedX = Math.min(1, Math.max(0, layout.width > 0 ? point.x / layout.width : 0));
    const normalizedY = Math.min(1, Math.max(0, layout.height > 0 ? point.y / layout.height : 0));

    if (orientation === 'horizontal') {
        return {
            x: normalizedX * TABLE_W,
            y: normalizedY * TABLE_H,
        };
    }

    return {
        x: TABLE_W - normalizedY * TABLE_W,
        y: normalizedX * TABLE_H,
    };
}

function mapTablePointToStage(point: Point2D, orientation: Orientation, layout: { width: number; height: number }) {
    if (orientation === 'horizontal') {
        return {
            x: (point.x / TABLE_W) * layout.width,
            y: (point.y / TABLE_H) * layout.height,
        };
    }

    return {
        x: (point.y / TABLE_H) * layout.width,
        y: ((TABLE_W - point.x) / TABLE_W) * layout.height,
    };
}

function clampBallPoint(point: Point2D): Point2D {
    return {
        x: Math.max(12, Math.min(TABLE_W - 12, point.x)),
        y: Math.max(12, Math.min(TABLE_H - 12, point.y)),
    };
}

function buildGuidePaths(
    ballPositions: BallState,
    aimTarget: Point2D,
    selectedEffect: EffectKey,
    selectedContact: ContactKey,
    showSolution: boolean,
    positionEnd: Point2D
) {
    const effectBias = getEffectBias(selectedEffect);
    const contactStrength = getGuideStrength(selectedContact);
    const cueLead: Point2D = {
        x: ballPositions.white.x + (aimTarget.x - ballPositions.white.x) * 0.44 + effectBias.x * 18 * contactStrength,
        y: ballPositions.white.y + (aimTarget.y - ballPositions.white.y) * 0.44 + effectBias.y * 18 * contactStrength,
    };
    const cueSecond: Point2D = {
        x: cueLead.x + effectBias.x * 10,
        y: cueLead.y + effectBias.y * 10,
    };
    const yellowLead: Point2D = {
        x: ballPositions.yellow.x + (cueLead.x - ballPositions.yellow.x) * 0.36 + effectBias.x * 8 * contactStrength,
        y: ballPositions.yellow.y + (cueLead.y - ballPositions.yellow.y) * 0.36 + effectBias.y * 8 * contactStrength,
    };
    const yellowSecond: Point2D = {
        x: yellowLead.x + (positionEnd.x - yellowLead.x) * 0.5,
        y: yellowLead.y + (positionEnd.y - yellowLead.y) * 0.5,
    };
    const redLead: Point2D = {
        x: ballPositions.red.x + (cueLead.x - ballPositions.red.x) * 0.38 + effectBias.x * 6 * contactStrength,
        y: ballPositions.red.y + (cueLead.y - ballPositions.red.y) * 0.38 + effectBias.y * 6 * contactStrength,
    };
    const redSecond: Point2D = {
        x: redLead.x + (aimTarget.x - redLead.x) * 0.5,
        y: redLead.y + (aimTarget.y - redLead.y) * 0.5,
    };

    return {
        white: [ballPositions.white, cueLead, cueSecond, aimTarget],
        yellow: showSolution ? [ballPositions.yellow, yellowLead, yellowSecond, positionEnd] : [ballPositions.yellow, yellowLead],
        red: showSolution ? [ballPositions.red, redLead, redSecond, aimTarget] : [ballPositions.red, redLead],
    };
}

function TrainingSystemEditorContent() {
    return <TrainingSystemWorkspace />;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function TrainingSystemWorkspace() {
    const router = useRouter();
    const params = useLocalSearchParams<{ systemId: string }>();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { t } = useI18n();
    const palette = getPalette(useColorScheme());
    const styles = getStyles(palette);
    const defaultOrientation: Orientation = width >= 900 ? 'horizontal' : 'vertical';
    const isSimulationWide = width >= 1100;

    const system = useMemo(() => (params.systemId ? getTrainingSystemById(params.systemId) : null), [params.systemId]);
    const initialPosition = system?.positions[0] ?? {
        id: 'fallback',
        white: { x: 0, y: 0 },
        yellow: { x: 0, y: 0 },
        red: { x: 0, y: 0 },
        trajectory: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    };

    const [positionIndex, setPositionIndex] = useState(0);
    const [ballPositions, setBallPositions] = useState<BallState>(() => cloneStageBalls(initialPosition));
    const [aimTarget, setAimTarget] = useState<Point2D>(() => initialPosition.trajectory[1] ?? initialPosition.white);
    const [showSolution, setShowSolution] = useState(false);
    const [selectedEffect, setSelectedEffect] = useState<EffectKey>(system?.recommendedEffect ?? 'center');
    const [effectSpin, setEffectSpin] = useState<SpinEffect>(() => effectKeyToSpin(system?.recommendedEffect ?? 'center'));
    const [selectedContact, setSelectedContact] = useState<ContactKey>('1/2');
    const [guideVisibility, setGuideVisibility] = useState<GuideVisibility>({
        white: true,
        yellow: true,
        red: true,
    });
    const [tableOrientation, setTableOrientation] = useState<Orientation>(defaultOrientation);
    const [stageLayout, setStageLayout] = useState({ width: 0, height: 0 });
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const gestureModeRef = useRef<{ mode: 'drag' | 'aim' | null; ballId: BallId | null }>({ mode: null, ballId: null });

    useEffect(() => {
        setTableOrientation(defaultOrientation);
    }, [defaultOrientation]);

    useEffect(() => {
        if (!system) {
            return;
        }

        let isActive = true;
        const currentPosition = system.positions[positionIndex] ?? system.positions[0];
        const nextBallPositions = cloneStageBalls(currentPosition);
        const nextAimTarget = currentPosition.trajectory[1] ?? currentPosition.white;
        const storageKey = `${GUIDE_STORAGE_PREFIX}/${system.id}/${currentPosition.id}`;

        setBallPositions(nextBallPositions);
        setAimTarget(nextAimTarget);
        setSelectedEffect(system.recommendedEffect);
        setEffectSpin(effectKeyToSpin(system.recommendedEffect));
        setSelectedContact('1/2');
        setGuideVisibility({ white: true, yellow: true, red: true });
        setShowSolution(false);
        setStatusMessage(null);
        setTableOrientation(defaultOrientation);

        AsyncStorage.getItem(storageKey)
            .then((raw) => {
                if (!isActive || !raw) {
                    return;
                }

                try {
                    const saved = JSON.parse(raw) as SavedStageState;
                    if (saved.positionId !== currentPosition.id) {
                        return;
                    }

                    setBallPositions(saved.ballPositions);
                    setAimTarget(saved.aimTarget);
                    setSelectedEffect(saved.selectedEffect);
                    setEffectSpin(effectKeyToSpin(saved.selectedEffect));
                    setSelectedContact(saved.selectedContact);
                    setGuideVisibility(saved.guideVisibility);
                    setShowSolution(saved.showSolution);
                    setTableOrientation(saved.tableOrientation);
                    setStatusMessage('Mesa cargada');
                } catch {
                    setStatusMessage('No fue posible cargar la mesa guardada');
                }
            })
            .catch(() => {
                if (isActive) {
                    setStatusMessage('No fue posible cargar la mesa guardada');
                }
            });

        return () => {
            isActive = false;
        };
    }, [defaultOrientation, positionIndex, system]);

    const currentPosition = system?.positions[positionIndex] ?? system?.positions[0];

    if (!system || !currentPosition) {
        return (
            <View style={[styles.notFound, { paddingTop: insets.top + theme.spacing.lg }]}>
                <Text style={styles.notFoundTitle}>{t('training.system.notFound')}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{t('training.system.back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentPositionEnd = currentPosition?.trajectory.at(-1) ?? ballPositions.red;
    const effect = EFFECT_PRESETS[selectedEffect];
    const contact = CONTACT_PRESETS[selectedContact];
    const suggestedPower = Math.round((effect.power + system.recommendedPower) / 2);
    const guidePlan = buildGuidePaths(ballPositions, aimTarget, selectedEffect, selectedContact, showSolution, currentPositionEnd);
    const guidePaths = [
        guideVisibility.yellow
            ? {
                  id: `${currentPosition.id}-yellow`,
                  points: guidePlan.yellow,
                  color: '#facc15',
                  width: showSolution ? 1.8 : 1.65,
                  dash: showSolution ? [5, 7] : [4, 6],
                  opacity: 0.9,
              }
            : null,
        guideVisibility.red
            ? {
                  id: `${currentPosition.id}-red`,
                  points: guidePlan.red,
                  color: '#ef4444',
                  width: showSolution ? 1.8 : 1.65,
                  dash: showSolution ? [5, 7] : [4, 6],
                  opacity: 0.9,
              }
            : null,
    ].filter(Boolean) as Array<{
        id: string;
        points: Point2D[];
        color: string;
        width: number;
        dash: number[];
        opacity: number;
    }>;

    const stageBalls = [
        { id: 'white', x: ballPositions.white.x, y: ballPositions.white.y, color: '#f8fafc', border: '#cbd5e1' },
        { id: 'yellow', x: ballPositions.yellow.x, y: ballPositions.yellow.y, color: '#facc15', border: '#ca8a04' },
        { id: 'red', x: ballPositions.red.x, y: ballPositions.red.y, color: '#dc2626', border: '#991b1b' },
    ] as const;
    const aimGuide = guideVisibility.white
        ? {
              from: ballPositions.white,
              to: aimTarget,
              color: '#fbbf24',
          }
        : undefined;

    const storageKey = `${GUIDE_STORAGE_PREFIX}/${system.id}/${currentPosition.id}`;

    const saveStage = async () => {
        const payload: SavedStageState = {
            positionId: currentPosition.id,
            tableOrientation,
            ballPositions,
            aimTarget,
            selectedEffect,
            selectedContact,
            showSolution,
            guideVisibility,
        };

        await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
        setStatusMessage('Mesa guardada');
    };

    const loadStage = async () => {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!raw) {
            setStatusMessage('No hay una mesa guardada para esta posición');
            return;
        }

        try {
            const saved = JSON.parse(raw) as SavedStageState;
            setBallPositions(saved.ballPositions);
            setAimTarget(saved.aimTarget);
            setSelectedEffect(saved.selectedEffect);
            setSelectedContact(saved.selectedContact);
            setGuideVisibility(saved.guideVisibility);
            setShowSolution(saved.showSolution);
            setTableOrientation(saved.tableOrientation);
            setStatusMessage('Mesa cargada');
        } catch {
            setStatusMessage('No fue posible leer la mesa guardada');
        }
    };

    const resetStage = () => {
        setBallPositions(cloneStageBalls(currentPosition));
        setAimTarget(currentPosition.trajectory[1] ?? currentPosition.white);
        setSelectedEffect(system.recommendedEffect);
        setEffectSpin(effectKeyToSpin(system.recommendedEffect));
        setSelectedContact('1/2');
        setGuideVisibility({ white: true, yellow: true, red: true });
        setShowSolution(false);
        setTableOrientation(defaultOrientation);
        setStatusMessage('Mesa reiniciada');
    };

    const findBallAtStagePoint = (stagePoint: Point2D) => {
        if (!stageLayout.width || !stageLayout.height) {
            return null;
        }

        const threshold = Math.max(14, Math.min(stageLayout.width, stageLayout.height) * 0.07);
        return BALL_ORDER.find((ballId) => {
            const ballPoint = mapTablePointToStage(ballPositions[ballId], tableOrientation, stageLayout);
            return Math.hypot(ballPoint.x - stagePoint.x, ballPoint.y - stagePoint.y) <= threshold;
        }) ?? null;
    };

    const updateByStagePoint = (stagePoint: Point2D) => {
        if (!stageLayout.width || !stageLayout.height) {
            return;
        }

        const tablePoint = clampBallPoint(mapStagePointToTable(stagePoint, tableOrientation, stageLayout));
        const activeBall = gestureModeRef.current.ballId;

        if (gestureModeRef.current.mode === 'drag' && activeBall) {
            setBallPositions((prev) => ({
                ...prev,
                [activeBall]: tablePoint,
            }));
            return;
        }

        setAimTarget(tablePoint);
    };

    const handleStageResponderGrant = (event: GestureResponderEvent) => {
        const stagePoint = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
        };
        const ballId = findBallAtStagePoint(stagePoint);

        gestureModeRef.current = ballId ? { mode: 'drag', ballId } : { mode: 'aim', ballId: null };
        updateByStagePoint(stagePoint);
    };

    const handleStageResponderMove = (event: GestureResponderEvent) => {
        updateByStagePoint({
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
        });
    };

    const handleStageResponderRelease = () => {
        gestureModeRef.current = { mode: null, ballId: null };
    };

    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                {
                    paddingTop: insets.top + theme.spacing.md,
                    paddingBottom: insets.bottom + theme.spacing.lg + 24,
                },
            ]}>
            <View style={styles.headerRow}>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>{system.name}</Text>
                    <Text style={styles.subtitle}>{system.subtitle}</Text>
                </View>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Text style={styles.headerButtonText}>{t('training.system.back')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.focusCard}>
                <Text style={styles.focusTitle}>{t('training.system.focus')}</Text>
                <Text style={styles.focusText}>{system.focus}</Text>
            </View>

            <TouchableOpacity
                style={[styles.simulationButton, { backgroundColor: palette.primary }]}
                onPress={() => router.push({ pathname: '/training/simulate', params: { systemId: system.id } })}>
                <Text style={styles.simulationButtonText}>Abrir simulador interactivo</Text>
            </TouchableOpacity>

            <View style={[styles.simulationFrame, isSimulationWide && styles.simulationFrameWide]}>
                <View style={styles.simulationMainPane}>
                    <View style={styles.tableCard}>
                <View style={styles.tableHeaderRow}>
                    <Text style={styles.cardTitle}>{t('training.system.table')}</Text>
                    <TouchableOpacity style={styles.orientationButton} onPress={() => setTableOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))}>
                        <Text style={styles.orientationButtonLabel}>Mesa</Text>
                        <Text style={styles.orientationButtonValue}>{tableOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}</Text>
                    </TouchableOpacity>
                </View>

                <View
                    style={styles.tableWrap}
                    onLayout={(event) => {
                        setStageLayout({
                            width: event.nativeEvent.layout.width,
                            height: event.nativeEvent.layout.height,
                        });
                    }}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={handleStageResponderGrant}
                    onResponderMove={handleStageResponderMove}
                    onResponderRelease={handleStageResponderRelease}
                    onResponderTerminate={handleStageResponderRelease}>
                    <BilliardsTableThumbnail
                        orientation={tableOrientation}
                        style={styles.tableStage}
                        balls={stageBalls as unknown as Array<{ id: 'white' | 'yellow' | 'red'; x: number; y: number; color: string; border: string }>}
                        aim={aimGuide}
                        paths={guidePaths}
                        showZones
                    />
                    <View style={styles.tableGestureLayer} />
                </View>

                <View style={styles.legendRow}>
                    <View style={styles.legendChip}>
                        <Text style={styles.legendLabel}>Ruta</Text>
                        <Text style={styles.legendValue}>{currentPosition.trajectory.length - 1} tramos</Text>
                    </View>
                    <View style={styles.legendChip}>
                        <Text style={styles.legendLabel}>Solución</Text>
                        <Text style={styles.legendValue}>{showSolution ? 'Visible' : 'Oculta'}</Text>
                    </View>
                    <View style={styles.legendChip}>
                        <Text style={styles.legendLabel}>Guías</Text>
                        <Text style={styles.legendValue}>{guideVisibility.white || guideVisibility.yellow || guideVisibility.red ? 'Activas' : 'Apagadas'}</Text>
                    </View>
                    <View style={styles.legendChip}>
                        <Text style={styles.legendLabel}>Efecto</Text>
                        <Text style={styles.legendValue}>{effect.label}</Text>
                    </View>
                </View>

                <View style={styles.guideToggleRow}>
                    {BALL_ORDER.map((ballId) => {
                        const active = guideVisibility[ballId];
                        let label = 'Roja';
                        if (ballId === 'white') {
                            label = 'Blanca';
                        } else if (ballId === 'yellow') {
                            label = 'Amarilla';
                        }
                        return (
                            <Pressable
                                key={ballId}
                                style={[styles.guideChip, active && styles.guideChipActive]}
                                onPress={() =>
                                    setGuideVisibility((prev) => ({
                                        ...prev,
                                        [ballId]: !prev[ballId],
                                    }))
                                }>
                                <Text style={[styles.guideChipText, active && styles.guideChipTextActive]}>{label}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.positionControls}>
                    <TouchableOpacity
                        style={[styles.smallButton, positionIndex === 0 && styles.smallButtonDisabled]}
                        disabled={positionIndex === 0}
                        onPress={() => setPositionIndex((prev) => Math.max(0, prev - 1))}>
                        <Text style={styles.smallButtonText}>{t('training.system.prev')}</Text>
                    </TouchableOpacity>

                    <Text style={styles.positionCounter}>
                        {t('training.system.position', { current: positionIndex + 1, total: system.positions.length })}
                    </Text>

                    <TouchableOpacity
                        style={[styles.smallButton, positionIndex >= system.positions.length - 1 && styles.smallButtonDisabled]}
                        disabled={positionIndex >= system.positions.length - 1}
                        onPress={() => setPositionIndex((prev) => Math.min(system.positions.length - 1, prev + 1))}>
                        <Text style={styles.smallButtonText}>{t('training.system.next')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.quickActionRow}>
                    <TouchableOpacity style={styles.quickActionButton} onPress={saveStage}>
                        <Text style={styles.quickActionText}>Guardar posiciones</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionButton} onPress={loadStage}>
                        <Text style={styles.quickActionText}>Cargar mesa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionButton} onPress={resetStage}>
                        <Text style={styles.quickActionText}>Restablecer</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.solutionButton} onPress={() => setShowSolution((prev) => !prev)}>
                    <Text style={styles.solutionButtonText}>
                        {showSolution ? t('training.system.hideSolution') : t('training.system.showSolution')}
                    </Text>
                </TouchableOpacity>

                {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
                    </View>
                </View>

                <View style={[styles.simulationSidePane, isSimulationWide && styles.simulationFrameWidePane]}>
                    <View style={styles.dualSection}>
                        <View style={styles.cardHalf}>
                            <Text style={styles.cardTitle}>{t('training.system.effect')}</Text>
                            <EffectBallSelector
                                spin={effectSpin}
                                onSpinChange={(nextSpin) => {
                                    setEffectSpin(nextSpin);
                                    setSelectedEffect(spinToEffectKey(nextSpin));
                                }}
                                size={340}
                                initialGuidesVisible
                            />
                            <Text style={styles.selectorTitle}>{effect.label}</Text>
                            <Text style={styles.selectorSubtitle}>{effect.description}</Text>
                            <View style={styles.effectMetaRow}>
                                <View style={styles.effectMetaChip}>
                                    <Text style={styles.effectMetaLabel}>Potencia</Text>
                                    <Text style={styles.effectMetaValue}>{effect.power}%</Text>
                                </View>
                                <View style={styles.effectMetaChip}>
                                    <Text style={styles.effectMetaLabel}>Contacto</Text>
                                    <Text style={styles.effectMetaValue}>{selectedContact}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.cardHalf}>
                            <Text style={styles.cardTitle}>{t('training.system.contact')}</Text>
                            <View style={styles.contactWrap}>
                                {(Object.keys(CONTACT_PRESETS) as ContactKey[]).map((key) => {
                                    const selected = selectedContact === key;
                                    return (
                                        <Pressable
                                            key={key}
                                            style={[styles.contactButton, selected && styles.contactButtonSelected]}
                                            onPress={() => setSelectedContact(key)}>
                                            <Text style={[styles.contactButtonText, selected && styles.contactButtonTextSelected]}>{key}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            <Text style={styles.selectorTitle}>{contact.label}</Text>
                            <Text style={styles.selectorSubtitle}>{contact.description}</Text>
                        </View>
                    </View>

                    <View style={styles.recommendationCard}>
                        <Text style={styles.cardTitle}>{t('training.system.recommendation')}</Text>
                        <Text style={styles.recommendationText}>{t('training.system.recommendedPower', { power: suggestedPower })}</Text>
                        <Text style={styles.recommendationSub}>{t('training.system.rules')}</Text>
                        {system.rules.map((rule) => (
                            <Text key={`${system.id}-rule-${rule}`} style={styles.ruleText}>
                                • {rule}
                            </Text>
                        ))}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

export function TrainingSystemScreen() {
    return <TrainingSystemEditorContent />;
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
            fontSize: 26,
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
        focusCard: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
            gap: 4,
        },
        focusTitle: {
            color: palette.primary,
            fontSize: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        focusText: {
            color: palette.text,
            fontSize: 15,
            fontWeight: '600',
        },
        simulationButton: {
            borderRadius: theme.radius.md,
            paddingVertical: 14,
            alignItems: 'center',
        },
        simulationButtonText: {
            color: '#fff',
            fontSize: 15,
            fontWeight: '800',
        },
        simulationFrame: {
            flexDirection: 'column',
            gap: theme.spacing.md,
            alignItems: 'stretch',
        },
        simulationFrameWide: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        simulationMainPane: {
            flex: 1,
            minWidth: 0,
        },
        simulationSidePane: {
            width: '100%',
            gap: theme.spacing.md,
        },
        simulationFrameWidePane: {
            width: 380,
            flexShrink: 0,
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
        cardTitle: {
            color: palette.text,
            fontSize: 16,
            fontWeight: '800',
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
        position: 'relative',
        overflow: 'hidden',
    },
    tableStage: {
        width: '100%',
    },
        tableGestureLayer: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 20,
        },
        legendRow: {
            flexDirection: 'row',
            gap: 8,
            flexWrap: 'wrap',
        },
        legendChip: {
            flexGrow: 1,
            minWidth: '45%',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: `${palette.primary}10`,
            borderWidth: 1,
            borderColor: `${palette.primary}18`,
        },
        legendLabel: {
            color: palette.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
        },
        legendValue: {
            color: palette.text,
            fontSize: 13,
            fontWeight: '800',
            marginTop: 2,
        },
        positionControls: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
        },
        smallButton: {
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: `${palette.primary}22`,
        },
        smallButtonDisabled: {
            opacity: 0.4,
        },
        smallButtonText: {
            color: palette.primary,
            fontWeight: '800',
            fontSize: 12,
        },
        positionCounter: {
            color: palette.muted,
            fontSize: 12,
            fontWeight: '700',
        },
        solutionButton: {
            borderRadius: 12,
            backgroundColor: palette.primary,
            paddingVertical: 11,
            alignItems: 'center',
        },
        solutionButtonText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: '800',
        },
        guideToggleRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        guideChip: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.background,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        guideChipActive: {
            borderColor: `${palette.primary}55`,
            backgroundColor: `${palette.primary}18`,
        },
        guideChipText: {
            color: palette.muted,
            fontSize: 12,
            fontWeight: '800',
        },
        guideChipTextActive: {
            color: palette.primary,
        },
        quickActionRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        quickActionButton: {
            flexGrow: 1,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            alignItems: 'center',
            backgroundColor: `${palette.primary}10`,
            borderWidth: 1,
            borderColor: `${palette.primary}20`,
            minWidth: '31%',
        },
        quickActionText: {
            color: palette.primary,
            fontSize: 12,
            fontWeight: '800',
        },
        statusMessage: {
            color: palette.muted,
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
        },
        dualSection: {
            gap: theme.spacing.md,
        },
        cardHalf: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.sm,
            gap: 8,
        },
        effectBoardShell: {
            width: 154,
            height: 154,
            alignSelf: 'center',
            borderRadius: 77,
            backgroundColor: '#08110f',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        },
        effectBoardHalo: {
            position: 'absolute',
            left: 10,
            top: 10,
            right: 10,
            bottom: 10,
            borderRadius: 77,
            backgroundColor: 'rgba(8, 17, 15, 0.92)',
        },
        effectBoard: {
            width: 126,
            height: 126,
            alignSelf: 'center',
            borderRadius: 63,
            backgroundColor: '#f2f4f5',
            borderWidth: 1,
            borderColor: '#d9dee3',
            position: 'relative',
            overflow: 'hidden',
        },
        effectGrid: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        },
        effectGridLine: {
            position: 'absolute',
            backgroundColor: 'rgba(130, 144, 155, 0.26)',
        },
        effectGridLineVertical: {
            top: 0,
            bottom: 0,
            width: 1,
        },
        effectGridLineHorizontal: {
            left: 0,
            right: 0,
            height: 1,
        },
        effectCrosshairHorizontal: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 2,
            marginTop: -1,
            backgroundColor: 'rgba(56, 189, 248, 0.7)',
            shadowColor: '#38bdf8',
            shadowOpacity: 0.45,
            shadowRadius: 6,
        },
        effectCrosshairVertical: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 2,
            marginLeft: -1,
            backgroundColor: 'rgba(56, 189, 248, 0.7)',
            shadowColor: '#38bdf8',
            shadowOpacity: 0.45,
            shadowRadius: 6,
        },
        effectAxisLabelTop: {
            position: 'absolute',
            top: 8,
            left: '50%',
            marginLeft: -18,
            color: '#d7dee2',
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 0.4,
        },
        effectAxisLabelRight: {
            position: 'absolute',
            right: 5,
            top: '50%',
            marginTop: -5,
            color: '#d7dee2',
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 0.4,
        },
        effectSphereShadow: {
            position: 'absolute',
            left: 8,
            top: 8,
            right: 8,
            bottom: 8,
            borderRadius: 63,
            shadowColor: '#000',
            shadowOpacity: 0.14,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 8 },
            backgroundColor: 'rgba(255,255,255,0.02)',
        },
        effectBall: {
            position: 'absolute',
            left: 14,
            top: 14,
            right: 14,
            bottom: 14,
            borderRadius: 56,
            borderWidth: 1,
            borderColor: '#dbeafe',
            backgroundColor: 'rgba(255,255,255,0.86)',
        },
        effectCenterPuck: {
            position: 'absolute',
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#22c55e',
            borderWidth: 2,
            borderColor: '#047857',
            shadowColor: '#22c55e',
            shadowOpacity: 0.45,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
        },
        effectPoint: {
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: 7,
            borderWidth: 2,
            transform: [{ translateX: -7 }, { translateY: -7 }],
        },
        selectorTitle: {
            color: palette.text,
            fontSize: 13,
            fontWeight: '700',
            textAlign: 'center',
        },
        selectorSubtitle: {
            color: palette.muted,
            fontSize: 11,
            textAlign: 'center',
            lineHeight: 16,
        },
        effectMetaRow: {
            flexDirection: 'row',
            gap: 6,
        },
        effectMetaChip: {
            flex: 1,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 6,
            backgroundColor: `${palette.primary}10`,
            borderWidth: 1,
            borderColor: `${palette.primary}18`,
        },
        effectMetaLabel: {
            color: palette.muted,
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        effectMetaValue: {
            color: palette.text,
            fontSize: 12,
            fontWeight: '800',
            marginTop: 1,
        },
        contactWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
        },
        contactButton: {
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 9,
            paddingHorizontal: 10,
            paddingVertical: 7,
            backgroundColor: palette.background,
        },
        contactButtonSelected: {
            borderColor: palette.primary,
            backgroundColor: `${palette.primary}22`,
        },
        contactButtonText: {
            color: palette.muted,
            fontSize: 11,
            fontWeight: '700',
        },
        contactButtonTextSelected: {
            color: palette.primary,
        },
        recommendationCard: {
            borderRadius: theme.radius.lg,
            backgroundColor: palette.card,
            borderWidth: 1,
            borderColor: palette.border,
            padding: theme.spacing.md,
            gap: 8,
        },
        recommendationText: {
            color: palette.text,
            fontSize: 14,
            fontWeight: '700',
        },
        recommendationSub: {
            marginTop: 4,
            color: palette.primary,
            fontSize: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        ruleText: {
            color: palette.muted,
            fontSize: 13,
            lineHeight: 18,
        },
    });
