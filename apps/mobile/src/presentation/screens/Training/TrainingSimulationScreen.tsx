import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    IconPencil,
    IconTarget,
    IconRefresh,
    IconTargetArrow,
    IconRuler2,
    IconNumbers,
    IconPlayerPlay,
    IconLoader2,
    IconPalette,
    IconTrash,
    IconArrowLeft,
    IconEye,
    IconSettings,
} from '@/src/presentation/components/icons';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { InteractiveBilliardsTable } from '@/src/presentation/components/Training/InteractiveBilliardsTable';
import { NumberAnchor, Formula } from '@/src/presentation/components/Training/SystemNumberingControl';
import { SystemNumberingModal } from '@/src/presentation/components/Training/SystemNumberingModal';
import { TableCustomizerModal } from '@/src/presentation/components/Training/TableCustomizerModal';
import { CaromBallStudioModal } from '@/src/presentation/components/Training/CaromBallStudioModal';
import { CaromRefereeBanner } from '@/src/presentation/components/Training/CaromRefereeBanner';
import { CaromPowerMeter } from '@/src/presentation/components/Training/CaromPowerMeter';
import { CaromAimFineTuner } from '@/src/presentation/components/Training/CaromAimFineTuner';
import { CaromSpinBallWidget } from '@/src/presentation/components/Training/CaromSpinBallWidget';
import { CaromProEffectModal } from '@/src/presentation/components/Training/CaromProEffectModal';
import { CaromTomeDeBolaEclipse } from '@/src/presentation/components/Training/CaromTomeDeBolaEclipse';
import {
    DEFAULT_TABLE_PREFERENCES,
    BALL_SKIN_PRESETS,
    loadTablePreferences,
    saveTablePreferences,
    useTablePreferences,
    type TablePreferences,
} from '@/src/presentation/components/Training/tablePreferences';
import { useTrainingSimulation } from '@/src/presentation/hooks/useTrainingSimulation';
import { getTrainingSystemById } from '@/src/presentation/screens/Training/trainingData';
import {
    BallId,
    Vec2,
    vec2,
    vec2Normalize,
    vec2Sub,
    SpinEffect,
    SnapshotBall,
    snapshotToBalls,
    BreakFormat,
    getBreakPosition,
    getDefaultBreakAim,
} from '@bandaro/core';
import { ApiSnapshotRepository } from '@/src/infrastructure/repositories/ApiSnapshotRepository';
import { fetchShotDetail } from '@/src/infrastructure/catalog/catalogApi';
import { adaptCatalogShot, type CatalogShot, getLocalizedCategoryName } from '@/src/infrastructure/catalog/shotAdapter';
import { CATEGORY_COLORS } from '@/src/presentation/components/Catalog/ShotCatalogCard';

type Orientation = 'horizontal' | 'vertical';

const EFFECT_SPIN_PRESETS: Record<string, SpinEffect> = {
    center: { x: 0, y: 0, magnitude: 0 },
    top: { x: 0, y: 0.7, magnitude: 0.7 },
    'top-right': { x: 0.6, y: 0.6, magnitude: 0.85 },
    right: { x: 0.7, y: 0, magnitude: 0.7 },
    'bottom-right': { x: 0.6, y: -0.6, magnitude: 0.85 },
    bottom: { x: 0, y: -0.7, magnitude: 0.7 },
    'bottom-left': { x: -0.6, y: -0.6, magnitude: 0.85 },
    left: { x: -0.7, y: 0, magnitude: 0.7 },
    'top-left': { x: -0.6, y: 0.6, magnitude: 0.85 },
};

function getInitialPowerLevel(recommendedPower: number) {
    return Math.min(5, Math.max(1, Math.round(recommendedPower / 20)));
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function TrainingSimulationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        systemId?: string;
        snapshotId?: string;
        shotId?: string;
        customName?: string;
        category?: string;
        categoryName?: string;
        categoryColor?: string;
        aimX?: string;
        aimY?: string;
        spinX?: string;
        spinY?: string;
        powerLevel?: string;
        whiteX?: string;
        whiteY?: string;
        yellowX?: string;
        yellowY?: string;
        redX?: string;
        redY?: string;
    }>();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const { t, language } = useI18n();
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const isDark = colorScheme === 'dark';
    const styles = getStyles(palette, isMobile, isDark);

    const [fetchedShot, setFetchedShot] = useState<CatalogShot | null>(null);

    const rawCategoryColor = params.categoryColor
        ? decodeURIComponent(params.categoryColor)
        : null;
    const normalizedParamColor = rawCategoryColor
        ? (rawCategoryColor.startsWith('#') ? rawCategoryColor : `#${rawCategoryColor}`)
        : null;

    const activeCategoryColor =
        normalizedParamColor ||
        (params.category ? CATEGORY_COLORS[params.category] : null) ||
        (fetchedShot ? CATEGORY_COLORS[fetchedShot.category] : null);

    const categoryName =
        params.categoryName ||
        (params.category ? getLocalizedCategoryName(params.category, language === 'en' ? 'en' : 'es') : null) ||
        (fetchedShot ? getLocalizedCategoryName(fetchedShot.category, language === 'en' ? 'en' : 'es') : null);

    const system = useMemo(
        () => (params.systemId ? getTrainingSystemById(params.systemId) : null),
        [params.systemId]
    );

    const [snapshotBalls, setSnapshotBalls] = useState<SnapshotBall[] | null>(null);

    const { preferences: tablePreferences, updatePreferences: handlePreferencesChange } = useTablePreferences();
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [showEffectModal, setShowEffectModal] = useState(false);
    const [showNumberingModal, setShowNumberingModal] = useState(false);
    const [showBallStudioModal, setShowBallStudioModal] = useState(false);

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
        if (params.whiteX && params.whiteY) {
            const wX = Number(params.whiteX);
            const wY = Number(params.whiteY);
            const yX = Number(params.yellowX);
            const yY = Number(params.yellowY);
            const rX = Number(params.redX);
            const rY = Number(params.redY);
            return {
                white: vec2(!isNaN(wX) ? wX : 71, !isNaN(wY) ? wY : 52.75),
                yellow: vec2(!isNaN(yX) ? yX : 71, !isNaN(yY) ? yY : 71),
                red: vec2(!isNaN(rX) ? rX : 213, !isNaN(rY) ? rY : 71),
            };
        }

        if (snapshotBalls && snapshotBalls.length > 0) {
            const balls = snapshotToBalls(snapshotBalls);
            const defaultBreak = getBreakPosition(tablePreferences.breakFormat, {
                pbaFormation: tablePreferences.pbaFormation,
                umbSide: tablePreferences.umbSide,
            });
            const result: { white: Vec2; yellow: Vec2; red: Vec2 } = { ...defaultBreak };
            for (const ball of balls) {
                result[ball.id] = ball.pos;
            }
            return result;
        }

        if (!system || system.positions.length === 0) {
            return getBreakPosition(tablePreferences.breakFormat, {
                pbaFormation: tablePreferences.pbaFormation,
                umbSide: tablePreferences.umbSide,
            });
        }
        const pos = system.positions[0];
        return {
            white: vec2(pos.white.x, pos.white.y),
            yellow: vec2(pos.yellow.x, pos.yellow.y),
            red: vec2(pos.red.x, pos.red.y),
        };
    }, [
        system,
        snapshotBalls,
        params.whiteX,
        params.whiteY,
        params.yellowX,
        params.yellowY,
        params.redX,
        params.redY,
        tablePreferences.breakFormat,
        tablePreferences.pbaFormation,
        tablePreferences.umbSide,
    ]);

    const {
        state,
        setBallPosition,
        setCueBall,
        setSpin,
        setPowerLevel,
        setPowerPercentage,
        setAimDirection,
        updateTrajectory,
        executeShot,
        resetBalls,
        clearTrails,
        dismissValidation,
    } = useTrainingSimulation(initialPositions);

    // Sincronizar bola tiradora con las preferencias guardadas del usuario si existen
    useEffect(() => {
        if (tablePreferences.cueBallId && tablePreferences.cueBallId !== state.cueBallId) {
            setCueBall(tablePreferences.cueBallId);
        }
    }, [tablePreferences.cueBallId, state.cueBallId, setCueBall]);

    const handleCueBallChange = useCallback((id: BallId) => {
        setCueBall(id);
        handlePreferencesChange({
            ...tablePreferences,
            cueBallId: id,
        });
    }, [setCueBall, handlePreferencesChange, tablePreferences]);

    const snapshotLoadedRef = useRef(false);
    // Reset balls when snapshot loads asynchronously
    useEffect(() => {
        if (snapshotBalls && snapshotBalls.length > 0 && !snapshotLoadedRef.current) {
            snapshotLoadedRef.current = true;
            resetBalls(initialPositions);
        }
    }, [snapshotBalls, resetBalls, initialPositions]);

    const customCoordsAimSetRef = useRef(false);
    useEffect(() => {
        if (params.whiteX && params.whiteY && !customCoordsAimSetRef.current && !params.shotId) {
            customCoordsAimSetRef.current = true;
            const wx = Number(params.whiteX) || 71;
            // Si la bola blanca está situada en el extremo derecho (x > 142), apuntar horizontalmente hacia la izquierda
            if (wx > 142) {
                setAimDirection(vec2(-1, 0));
            } else {
                setAimDirection(vec2(1, 0));
            }
        }
    }, [params.whiteX, params.whiteY, params.shotId, setAimDirection]);

    const [tableOrientation, setTableOrientation] = useState<Orientation>(
        width >= 900 ? 'horizontal' : 'vertical'
    );
    const [isEditMode, setIsEditMode] = useState(!params.systemId && !params.shotId);
    const [showGuides, setShowGuides] = useState(true);
    const [showRuler, setShowRuler] = useState(false);
    const [numberingAnchors, setNumberingAnchors] = useState<NumberAnchor[]>([]);
    const [numberingFormula, setNumberingFormula] = useState<Formula | null>(null);
    const [showNumbering, setShowNumbering] = useState(false);

    useEffect(() => {
        const next: Orientation = width >= 900 ? 'horizontal' : 'vertical';
        setTableOrientation((prev) => (prev !== next ? next : prev));
    }, [width]);

    const systemLoadedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!system || system.positions.length === 0 || params.snapshotId || params.shotId) {
            return;
        }

        if (systemLoadedRef.current === system.id) {
            return;
        }
        systemLoadedRef.current = system.id;

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
    }, [initialPositions, resetBalls, setAimDirection, setCueBall, setPowerLevel, setSpin, system, params.shotId]);

    // Sincronización e inicialización inmediata de la jugada del catálogo en el simulador
    const lastLoadedShotKeyRef = useRef<string | null>(null);
    useEffect(() => {
        if (params.whiteX && params.whiteY) {
            const shotKey = `${params.shotId || 'c'}_${params.whiteX}_${params.whiteY}_${params.yellowX}_${params.yellowY}_${params.redX}_${params.redY}_${params.aimX || ''}_${params.aimY || ''}`;
            if (lastLoadedShotKeyRef.current === shotKey) return;
            lastLoadedShotKeyRef.current = shotKey;

            const wX = Number(params.whiteX);
            const wY = Number(params.whiteY);
            const yX = Number(params.yellowX);
            const yY = Number(params.yellowY);
            const rX = Number(params.redX);
            const rY = Number(params.redY);

            const pos = {
                white: vec2(!isNaN(wX) ? wX : 71, !isNaN(wY) ? wY : 52.75),
                yellow: vec2(!isNaN(yX) ? yX : 71, !isNaN(yY) ? yY : 71),
                red: vec2(!isNaN(rX) ? rX : 213, !isNaN(rY) ? rY : 71),
            };

            resetBalls(pos);
            setCueBall('white');

            if (params.aimX && params.aimY) {
                const ax = Number(params.aimX);
                const ay = Number(params.aimY);
                if (!isNaN(ax) && !isNaN(ay) && (ax !== 0 || ay !== 0)) {
                    setAimDirection(vec2Normalize(vec2(ax, ay)));
                }
            } else {
                const aimVec = vec2Normalize(vec2Sub(pos.yellow, pos.white));
                setAimDirection(aimVec);
            }

            if (params.spinX !== undefined && params.spinY !== undefined) {
                const sx = Number(params.spinX) || 0;
                const sy = Number(params.spinY) || 0;
                const mag = Math.min(1, Math.hypot(sx, sy));
                setSpin({ x: sx, y: sy, magnitude: mag });
            }

            if (params.powerLevel) {
                const pl = Math.min(5, Math.max(1, Number(params.powerLevel) || 3));
                setPowerLevel(pl);
            }

            setIsEditMode(false);
            setShowGuides(true);
        } else if (params.shotId && lastLoadedShotKeyRef.current !== params.shotId) {
            lastLoadedShotKeyRef.current = params.shotId;
            fetchShotDetail(Number(params.shotId))
                .then((raw) => {
                    const shot = adaptCatalogShot(raw);
                    setFetchedShot(shot);
                    const pos = {
                        white: vec2(shot.white.x, shot.white.y),
                        yellow: vec2(shot.yellow.x, shot.yellow.y),
                        red: vec2(shot.red.x, shot.red.y),
                    };
                    resetBalls(pos);
                    setCueBall('white');

                    if (shot.cueBallTrajectory && shot.cueBallTrajectory.length >= 2) {
                        const p0 = shot.cueBallTrajectory[0];
                        const p1 = shot.cueBallTrajectory[1];
                        setAimDirection(vec2Normalize(vec2Sub(vec2(p1.x, p1.y), vec2(p0.x, p0.y))));
                    } else {
                        setAimDirection(vec2Normalize(vec2Sub(vec2(shot.yellow.x, shot.yellow.y), vec2(shot.white.x, shot.white.y))));
                    }

                    let spinX = 0;
                    let spinY = 0;
                    if (shot.effectY < 0) {
                        const tips = Math.min(3.5, Math.abs(shot.effectY * 5.0));
                        const rawHour = shot.effectX * 5.0;
                        const hour = rawHour <= 0.05 ? 12 : rawHour;
                        const theta = (3 - hour) * (Math.PI / 6);
                        const mag = Math.min(1.0, tips / 3.5);
                        spinX = Math.cos(theta) * mag;
                        spinY = Math.sin(theta) * mag;
                    } else if (shot.effectX !== 0 || shot.effectY !== 0) {
                        spinX = Math.max(-1, Math.min(1, shot.effectX));
                        spinY = Math.max(-1, Math.min(1, shot.effectY));
                    }
                    setSpin({ x: spinX, y: spinY, magnitude: Math.min(1, Math.hypot(spinX, spinY)) });
                    setPowerLevel(Math.min(5, Math.max(1, shot.powerLevel || shot.railSpeed || 3)));
                    setIsEditMode(false);
                    setShowGuides(true);
                })
                .catch((err) => {
                    console.warn('[Simulator] Could not load catalog shot details:', err);
                });
        }
    }, [
        params.shotId,
        params.whiteX,
        params.whiteY,
        params.yellowX,
        params.yellowY,
        params.redX,
        params.redY,
        params.aimX,
        params.aimY,
        params.spinX,
        params.spinY,
        params.powerLevel,
        resetBalls,
        setAimDirection,
        setCueBall,
        setPowerLevel,
        setSpin,
    ]);

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
        if (!system && (!snapshotBalls || snapshotBalls.length === 0) && !params.whiteX && !params.shotId) {
            const breakPos = getBreakPosition(tablePreferences.breakFormat, {
                pbaFormation: tablePreferences.pbaFormation,
                umbSide: tablePreferences.umbSide,
            });
            resetBalls(breakPos);
            setAimDirection(getDefaultBreakAim(breakPos));
            return;
        }
        resetBalls(initialPositions);
    }, [
        resetBalls,
        initialPositions,
        system,
        snapshotBalls,
        params.whiteX,
        params.shotId,
        tablePreferences.breakFormat,
        tablePreferences.pbaFormation,
        tablePreferences.umbSide,
        setAimDirection,
    ]);

    // Sincronizar posición de salida cuando cambia el formato (UMB vs PBA) en entrenamiento libre
    useEffect(() => {
        if (!system && (!snapshotBalls || snapshotBalls.length === 0) && !params.whiteX) {
            const breakPos = getBreakPosition(tablePreferences.breakFormat, {
                pbaFormation: tablePreferences.pbaFormation,
                umbSide: tablePreferences.umbSide,
            });
            resetBalls(breakPos);
            setAimDirection(getDefaultBreakAim(breakPos));
        }
    }, [
        tablePreferences.breakFormat,
        tablePreferences.pbaFormation,
        tablePreferences.umbSide,
        resetBalls,
        setAimDirection,
        system,
        snapshotBalls,
        params.whiteX,
    ]);

    const handleSetToCurrentBreak = useCallback(() => {
        if (state.isSimulating) return;
        const breakPos = getBreakPosition(tablePreferences.breakFormat, {
            pbaFormation: tablePreferences.pbaFormation,
            umbSide: tablePreferences.umbSide,
        });
        resetBalls(breakPos);
        setAimDirection(getDefaultBreakAim(breakPos));
    }, [
        state.isSimulating,
        tablePreferences.breakFormat,
        tablePreferences.pbaFormation,
        tablePreferences.umbSide,
        resetBalls,
        setAimDirection,
    ]);

    if (params.systemId && !system) {
        return (
            <View style={[styles.notFound, { paddingTop: insets.top + theme.spacing.lg }]}>
                <Text style={styles.notFoundTitle}>{language === 'en' ? 'System not found' : 'Sistema no encontrado'}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{t('training.system.back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const titleText = system?.name ?? params.customName ?? (params.snapshotId ? 'Snapshot' : (language === 'en' ? 'Carom Simulator' : 'Simulador Carambola'));

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top + (isMobile ? 4 : 6),
                        paddingBottom: insets.bottom + (isMobile ? 4 : 6),
                    },
                ]}>
                
                {/* BARRA SUPERIOR HUD DE JUEGO AAA */}
                <View style={styles.topHudBar}>
                    {/* Sección Izquierda: Salir y Título con Badge */}
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.circleIconBtn}
                            onPress={() => router.back()}
                            accessibilityRole="button"
                            accessibilityLabel={t('common.back')}>
                            <IconArrowLeft size={isMobile ? 16 : 18} color={isDark ? '#f8fafc' : palette.text} strokeWidth={2.2} />
                        </TouchableOpacity>

                        <View style={styles.titleColumn}>
                            <View style={styles.systemTagRow}>
                                {categoryName && activeCategoryColor ? (
                                    <View style={[styles.categoryBadge, { backgroundColor: activeCategoryColor + '22', borderColor: activeCategoryColor + '66' }]}>
                                        <View style={[styles.categoryDot, { backgroundColor: activeCategoryColor }]} />
                                        <Text style={[styles.categoryBadgeText, { color: activeCategoryColor }]}>
                                            {categoryName}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.systemTag}>{t('training.sim.tag')}</Text>
                                )}
                                <View style={styles.systemDot} />
                                <Text style={styles.modeTag}>{isEditMode ? t('training.sim.edit') : t('training.sim.shot')}</Text>
                            </View>
                            <Text style={styles.title} numberOfLines={1}>
                                {titleText}
                            </Text>
                        </View>
                    </View>

                    {/* Sección Derecha: Botonería de herramientas con estética gaming */}
                    <View style={styles.headerToolsRow}>
                        {/* Botón Entrenar Destacado */}
                        <TouchableOpacity
                            style={styles.trainHighlightBtn}
                            onPress={() => {
                                const whiteB = state.balls.find((b) => b.id === 'white');
                                const yellowB = state.balls.find((b) => b.id === 'yellow');
                                const redB = state.balls.find((b) => b.id === 'red');
                                router.push({
                                    pathname: '/training/session',
                                    params: {
                                        customName: system?.name ? `${t('common.practice')}: ${system.name}` : (language === 'en' ? 'Simulator Position' : 'Posición de Simulador'),
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
                            <IconTarget size={14} color="#fff" strokeWidth={2.5} />
                            {!isMobile && <Text style={styles.trainBtnText}>{t('common.practice')}</Text>}
                        </TouchableOpacity>

                        {/* Alternar Modo Edición / Puntería */}
                        <TouchableOpacity
                            style={[
                                styles.toolIconOnlyBtn,
                                isEditMode && styles.toolPillBtnActiveAmber,
                            ]}
                            onPress={() => setIsEditMode((prev) => !prev)}
                            disabled={state.isSimulating}
                            accessibilityLabel={t('training.sim.editMode')}>
                            {isEditMode ? (
                                <IconPencil size={isMobile ? 14 : 15} color="#fbbf24" strokeWidth={2.2} />
                            ) : (
                                <IconTarget size={isMobile ? 14 : 15} color="#94a3b8" strokeWidth={2} />
                            )}
                        </TouchableOpacity>

                        {/* Personalizar Mesa */}
                        <TouchableOpacity
                            style={styles.toolIconOnlyBtn}
                            onPress={() => setShowCustomizer(true)}
                            disabled={state.isSimulating}
                            accessibilityLabel={t('training.sim.customizeTable')}>
                            <IconPalette size={isMobile ? 14 : 16} color="#94a3b8" strokeWidth={2} />
                        </TouchableOpacity>

                        {/* Alternar Regla de Bandas */}
                        <TouchableOpacity
                            style={[
                                styles.toolIconOnlyBtn,
                                showRuler && styles.toolPillBtnActiveCyan,
                            ]}
                            onPress={() => setShowRuler((prev) => !prev)}
                            disabled={state.isSimulating}
                            accessibilityLabel={t('training.sim.cushionRuler')}>
                            <IconRuler2 size={isMobile ? 14 : 16} color={showRuler ? '#00d2ff' : '#94a3b8'} strokeWidth={2} />
                        </TouchableOpacity>

                        {/* Sistemas y Numeración */}
                        <TouchableOpacity
                            style={[
                                styles.toolIconOnlyBtn,
                                showNumbering && styles.toolPillBtnActiveCyan,
                            ]}
                            onPress={() => setShowNumberingModal(true)}
                            disabled={state.isSimulating}
                            accessibilityLabel={t('training.sim.systems')}>
                            <IconNumbers size={isMobile ? 14 : 16} color={showNumbering ? '#00d2ff' : '#94a3b8'} strokeWidth={2} />
                        </TouchableOpacity>

                        {/* Reiniciar Posición */}
                        <TouchableOpacity
                            style={styles.toolIconOnlyBtn}
                            onPress={handleReset}
                            disabled={state.isSimulating}
                            accessibilityLabel={t('training.sim.resetTable')}>
                            <IconRefresh size={isMobile ? 14 : 16} color="#94a3b8" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ESCENARIO PRINCIPAL: LA MESA SE MANTIENE 100% FIJA Y ESTABLE */}
                <View style={styles.arenaContainer}>
                    {/* Banner de Árbitro: FLOATING OVERLAY (Nunca desplaza la mesa al aparecer o cerrarse) */}
                    <View style={styles.floatingRefereeBannerWrap} pointerEvents="box-none">
                        <CaromRefereeBanner
                            validation={state.validation}
                            isSimulating={state.isSimulating}
                            cushionCountLive={state.liveCushionCount}
                            ballHitsLive={state.liveBallHits}
                            onDismiss={dismissValidation}
                        />
                    </View>

                    {/* Escenario de Mesa y Taco de Potencia Dockeado */}
                    <View style={[styles.tableAndPowerRow, isMobile && { gap: 6 }]}>
                        <View style={styles.fixedTableWrap}>
                            <InteractiveBilliardsTable
                                orientation={tableOrientation}
                                style={styles.tableStage}
                                balls={state.balls}
                                cueBallId={state.cueBallId}
                                trajectory={state.trajectory}
                                dynamicTrails={state.dynamicTrails ?? undefined}
                                collisionPulses={state.collisionPulses}
                                aimDirection={state.aimDirection}
                                powerLevel={state.powerPercentage}
                                categoryColor={activeCategoryColor ?? undefined}
                                tablePreferences={tablePreferences}
                                showCueStick={true}
                                showGhostBall={true}
                                onBallMove={handleBallMove}
                                onAimChange={handleAimChange}
                                onPowerChange={setPowerPercentage}
                                onShoot={(power) => executeShot(power)}
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

                        {/* Medidor vertical de taco estilo 8 Ball Pool */}
                        <View style={[styles.powerMeterDock, isMobile && { width: 38 }]}>
                            <CaromPowerMeter
                                powerLevel={state.powerPercentage}
                                onPowerChange={setPowerPercentage}
                                onShoot={(power) => executeShot(power)}
                                disabled={state.isSimulating}
                            />
                        </View>
                    </View>
                </View>

                {/* BARRA INFERIOR HUD DE CONTROL TÁCTICO */}
                {isMobile ? (
                    /* Mobile 2-Tier Tactical HUD (Fits all mobile screens without any overflow) */
                    <View style={styles.bottomHudMobileContainer}>
                        {/* Tier 1: Instrumentos Tácticos (Efecto y Tome Eclipse) */}
                        <View style={styles.bottomHudMobileTier1}>
                            <View style={{ flex: 1 }}>
                                <CaromSpinBallWidget
                                    spin={state.spin}
                                    cueBallId={state.cueBallId}
                                    onPress={() => setShowEffectModal(true)}
                                    disabled={state.isSimulating}
                                    compact={true}
                                    categoryColor={activeCategoryColor ?? undefined}
                                    isDark={isDark}
                                />
                            </View>

                            <View style={{ flex: 1.15 }}>
                                <CaromTomeDeBolaEclipse
                                    balls={state.balls}
                                    cueBallId={state.cueBallId}
                                    aimDirection={state.aimDirection}
                                    spin={state.spin}
                                    trajectory={state.trajectory}
                                    onAimChange={handleAimChange}
                                    disabled={state.isSimulating}
                                    compact={true}
                                    categoryColor={activeCategoryColor ?? undefined}
                                    isDark={isDark}
                                />
                            </View>
                        </View>

                        {/* Tier 2: Controles de Juego, Micro-Puntería y Disparador */}
                        <View style={styles.bottomHudMobileTier2}>
                            {/* Módulo de Bolas: Selector Rápido + Acceso a Estudio Oficial (Skins & Break) */}
                            <View style={styles.ballModuleContainerMobile}>
                                <View style={styles.cueBallSelectorPillMobile}>
                                    <TouchableOpacity
                                        style={[
                                            styles.ballOptionBtnMobile,
                                            state.cueBallId === 'white' && styles.ballOptionBtnActive,
                                        ]}
                                        onPress={() => handleCueBallChange('white')}
                                        disabled={state.isSimulating}>
                                        <View style={styles.whiteBallIcon}>
                                            {tablePreferences.showBallDots !== false && (
                                                <View
                                                    style={[
                                                        styles.ballMiniDot,
                                                        { backgroundColor: tablePreferences.ballSkin === 'cosmo_helix_pba' ? '#00e5ff' : '#dc2626' },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                        <Text style={[styles.ballOptionText, state.cueBallId === 'white' && styles.ballOptionTextActive]}>
                                            {t('common.white')}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.ballOptionBtnMobile,
                                            state.cueBallId === 'yellow' && styles.ballOptionBtnActive,
                                        ]}
                                        onPress={() => handleCueBallChange('yellow')}
                                        disabled={state.isSimulating}>
                                        <View style={styles.yellowBallIcon}>
                                            {tablePreferences.showBallDots !== false && (
                                                <View
                                                    style={[
                                                        styles.ballMiniDot,
                                                        { backgroundColor: tablePreferences.ballSkin === 'cosmo_helix_pba' ? '#1e3a8a' : '#dc2626' },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                        <Text style={[styles.ballOptionText, state.cueBallId === 'yellow' && styles.ballOptionTextActive]}>
                                            {t('common.yellow')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.ballStudioTriggerMobile,
                                        tablePreferences.breakFormat === 'umb' ? styles.ballStudioUmbMobile : styles.ballStudioPbaMobile,
                                    ]}
                                    onPress={() => setShowBallStudioModal(true)}
                                    disabled={state.isSimulating}
                                    accessibilityLabel={language === 'en' ? 'Ball Studio and Official Break' : 'Módulo de Bolas y Salida Oficial'}>
                                    <Text style={styles.ballStudioBadgeFlag}>
                                        {tablePreferences.breakFormat === 'umb' ? '🌍' : '🇰🇷'}
                                    </Text>
                                    <Text style={styles.ballStudioBadgeText}>
                                        {tablePreferences.breakFormat === 'umb' ? 'UMB' : `PBA ${tablePreferences.pbaFormation ?? '159'}`}
                                    </Text>
                                    <IconSettings size={12} color="#38bdf8" strokeWidth={2.2} />
                                </TouchableOpacity>
                            </View>

                            {/* Micro-ajuste fino de puntería */}
                            <CaromAimFineTuner
                                aimDirection={state.aimDirection}
                                onAimChange={handleAimChange}
                                disabled={state.isSimulating}
                                compact={true}
                            />

                            {/* Trazas & Alternador de Guías */}
                            <View style={styles.utilityActionsRow}>
                                {state.dynamicTrails && (
                                    <TouchableOpacity
                                        style={styles.clearTrailsBtn}
                                        onPress={clearTrails}
                                        accessibilityLabel={t('training.sim.clearTrails')}>
                                        <IconTrash size={12} color="#ef4444" strokeWidth={2} />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={[styles.guidePill, showGuides && styles.guidePillActive]}
                                    onPress={() => setShowGuides((prev) => !prev)}>
                                    <IconEye size={12} color={showGuides ? '#00d2ff' : '#64748b'} strokeWidth={2.2} />
                                </TouchableOpacity>
                            </View>

                            {/* Botón Disparo Primario */}
                            <TouchableOpacity
                                style={[
                                    styles.fireButtonMobile,
                                    state.isSimulating && styles.fireButtonDisabled,
                                ]}
                                onPress={() => executeShot()}
                                disabled={state.isSimulating}
                                accessibilityLabel={t('training.sim.shoot')}>
                                {state.isSimulating ? (
                                    <IconLoader2 size={16} color="#ffffff" strokeWidth={2.5} />
                                ) : (
                                    <IconPlayerPlay size={16} color="#ffffff" strokeWidth={2.5} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* Desktop panoramic single-row HUD */
                    <View style={styles.bottomHudBar}>
                        {/* Módulo de Bolas: Selector Rápido + Acceso a Estudio Oficial (Skins & Break) */}
                        <View style={styles.ballModuleContainerDesktop}>
                            <View style={styles.cueBallSelectorPill}>
                                <TouchableOpacity
                                    style={[
                                        styles.ballOptionBtn,
                                        state.cueBallId === 'white' && styles.ballOptionBtnActive,
                                    ]}
                                    onPress={() => handleCueBallChange('white')}
                                    disabled={state.isSimulating}>
                                    <View style={styles.whiteBallIcon}>
                                        {tablePreferences.showBallDots !== false && (
                                            <View
                                                style={[
                                                    styles.ballMiniDot,
                                                    { backgroundColor: tablePreferences.ballSkin === 'cosmo_helix_pba' ? '#00e5ff' : '#dc2626' },
                                                ]}
                                            />
                                        )}
                                    </View>
                                    <Text style={[styles.ballOptionText, state.cueBallId === 'white' && styles.ballOptionTextActive]}>
                                        {t('common.white')}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.ballOptionBtn,
                                        state.cueBallId === 'yellow' && styles.ballOptionBtnActive,
                                    ]}
                                    onPress={() => handleCueBallChange('yellow')}
                                    disabled={state.isSimulating}>
                                    <View style={styles.yellowBallIcon}>
                                        {tablePreferences.showBallDots !== false && (
                                            <View
                                                style={[
                                                    styles.ballMiniDot,
                                                    { backgroundColor: tablePreferences.ballSkin === 'cosmo_helix_pba' ? '#1e3a8a' : '#dc2626' },
                                                ]}
                                            />
                                        )}
                                    </View>
                                    <Text style={[styles.ballOptionText, state.cueBallId === 'yellow' && styles.ballOptionTextActive]}>
                                        {t('common.yellow')}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.ballStudioTriggerDesktop,
                                    tablePreferences.breakFormat === 'umb' ? styles.ballStudioUmbDesktop : styles.ballStudioPbaDesktop,
                                ]}
                                onPress={() => setShowBallStudioModal(true)}
                                disabled={state.isSimulating}
                                accessibilityLabel={language === 'en' ? 'Ball Studio, Skins and Break' : 'Módulo de Bolas, Skins y Salida'}>
                                <View style={styles.ballStudioTriggerInner}>
                                    <Text style={styles.ballStudioTriggerBadge}>
                                        {tablePreferences.breakFormat === 'umb' ? '🌍 UMB' : `🇰🇷 PBA ${tablePreferences.pbaFormation ?? '159'}`}
                                    </Text>
                                    <Text style={styles.ballStudioSkinBadge} numberOfLines={1}>
                                        {BALL_SKIN_PRESETS.find((s) => s.id === tablePreferences.ballSkin)?.name ?? 'Aramith'}
                                    </Text>
                                </View>
                                <IconSettings size={14} color="#38bdf8" strokeWidth={2.2} />
                            </TouchableOpacity>
                        </View>

                        <CaromSpinBallWidget
                            spin={state.spin}
                            cueBallId={state.cueBallId}
                            onPress={() => setShowEffectModal(true)}
                            disabled={state.isSimulating}
                            categoryColor={activeCategoryColor ?? undefined}
                            isDark={isDark}
                        />

                        <CaromTomeDeBolaEclipse
                            balls={state.balls}
                            cueBallId={state.cueBallId}
                            aimDirection={state.aimDirection}
                            spin={state.spin}
                            trajectory={state.trajectory}
                            onAimChange={handleAimChange}
                            disabled={state.isSimulating}
                            categoryColor={activeCategoryColor ?? undefined}
                            isDark={isDark}
                        />

                        <CaromAimFineTuner
                            aimDirection={state.aimDirection}
                            onAimChange={handleAimChange}
                            disabled={state.isSimulating}
                        />

                        <View style={styles.utilityActionsRow}>
                            {state.dynamicTrails && (
                                <TouchableOpacity
                                    style={styles.clearTrailsBtn}
                                    onPress={clearTrails}
                                    accessibilityLabel={t('training.sim.clearTrails')}>
                                    <IconTrash size={14} color="#ef4444" strokeWidth={2} />
                                    <Text style={styles.clearTrailsText}>{t('training.sim.clearTrails')}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.guidePill, showGuides && styles.guidePillActive]}
                                onPress={() => setShowGuides((prev) => !prev)}>
                                <IconEye size={13} color={showGuides ? '#00d2ff' : '#64748b'} strokeWidth={2.2} />
                                <Text style={[styles.guidePillText, showGuides && styles.guidePillTextActive]}>
                                    {showGuides ? `${t('training.sim.guides')} ${t('training.sim.active')}` : `${t('training.sim.guides')} ${t('training.sim.off')}`}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.fireButton,
                                state.isSimulating && styles.fireButtonDisabled,
                            ]}
                            onPress={() => executeShot()}
                            disabled={state.isSimulating}
                            accessibilityLabel={t('training.sim.shoot')}>
                            {state.isSimulating ? (
                                <IconLoader2 size={18} color="#ffffff" strokeWidth={2.5} />
                            ) : (
                                <IconPlayerPlay size={18} color="#ffffff" strokeWidth={2.5} />
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* MODALES FLOTANTES (OVERLAYS - CERO REFLOW SOBRE LA MESA) */}
                <CaromProEffectModal
                    visible={showEffectModal}
                    spin={state.spin}
                    cueBallId={state.cueBallId}
                    tablePreferences={tablePreferences}
                    onSpinChange={setSpin}
                    onClose={() => setShowEffectModal(false)}
                />

                <SystemNumberingModal
                    visible={showNumberingModal}
                    showNumbering={showNumbering}
                    anchors={numberingAnchors}
                    formula={numberingFormula}
                    isEditMode={isEditMode}
                    onToggleShowNumbering={() => setShowNumbering((prev) => !prev)}
                    onAnchorsChange={setNumberingAnchors}
                    onFormulaChange={setNumberingFormula}
                    onClose={() => setShowNumberingModal(false)}
                />

                <TableCustomizerModal
                    visible={showCustomizer}
                    preferences={tablePreferences}
                    onClose={() => setShowCustomizer(false)}
                    onChangePreferences={handlePreferencesChange}
                />

                <CaromBallStudioModal
                    visible={showBallStudioModal}
                    cueBallId={state.cueBallId}
                    tablePreferences={tablePreferences}
                    onCueBallChange={handleCueBallChange}
                    onPreferencesChange={handlePreferencesChange}
                    onResetToBreakPosition={handleSetToCurrentBreak}
                    onClose={() => setShowBallStudioModal(false)}
                />
            </View>
        </GestureHandlerRootView>
    );
}

const getStyles = (palette: ReturnType<typeof getPalette>, isMobile: boolean, isDark = true) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDark ? '#070b0e' : palette.background,
            paddingHorizontal: isMobile ? 6 : 12,
            gap: isMobile ? 4 : 6,
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

        /* BARRA SUPERIOR HUD */
        topHudBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: isMobile ? 6 : 12,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : palette.card,
            borderRadius: isMobile ? 14 : 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
            paddingHorizontal: isMobile ? 8 : 12,
            paddingVertical: isMobile ? 4 : 6,
            userSelect: 'none',
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: isMobile ? 6 : 10,
            flex: 1,
        },
        circleIconBtn: {
            width: isMobile ? 28 : 34,
            height: isMobile ? 28 : 34,
            borderRadius: isMobile ? 14 : 17,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        titleColumn: {
            gap: 1,
            flex: 1,
        },
        systemTagRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        systemTag: {
            fontSize: isMobile ? 7.5 : 8.5,
            fontWeight: '800',
            color: '#00d2ff',
            letterSpacing: 0.8,
        },
        categoryBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 6,
            paddingVertical: 1.5,
            borderRadius: 8,
            borderWidth: 1,
        },
        categoryDot: {
            width: 5,
            height: 5,
            borderRadius: 2.5,
        },
        categoryBadgeText: {
            fontSize: isMobile ? 8 : 9,
            fontWeight: '800',
            letterSpacing: 0.3,
        },
        systemDot: {
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: '#64748b',
        },
        modeTag: {
            fontSize: isMobile ? 7.5 : 8.5,
            fontWeight: '800',
            color: '#fbbf24',
            letterSpacing: 0.6,
        },
        title: {
            color: isDark ? '#f8fafc' : palette.text,
            fontSize: isMobile ? 12 : 14,
            fontWeight: '900',
            letterSpacing: 0.2,
        },
        headerToolsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: isMobile ? 4 : 6,
        },
        trainHighlightBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#0d5e2f',
            borderRadius: 14,
            paddingHorizontal: isMobile ? 8 : 12,
            paddingVertical: isMobile ? 5 : 6,
            borderWidth: 1,
            borderColor: 'rgba(20, 184, 166, 0.5)',
            boxShadow: '0 0 10px rgba(13, 94, 47, 0.5)',
        },
        trainBtnText: {
            color: '#ffffff',
            fontSize: 11,
            fontWeight: '800',
        },
        toolPillBtnActiveAmber: {
            backgroundColor: 'rgba(251, 191, 36, 0.18)',
            borderColor: '#fbbf24',
        },
        toolPillBtnActiveCyan: {
            backgroundColor: 'rgba(0, 210, 255, 0.18)',
            borderColor: '#00d2ff',
        },
        toolIconOnlyBtn: {
            width: isMobile ? 28 : 32,
            height: isMobile ? 28 : 32,
            borderRadius: isMobile ? 14 : 16,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            alignItems: 'center',
            justifyContent: 'center',
        },

        /* ESCENARIO DE LA MESA FIJA */
        arenaContainer: {
            flex: 1,
            position: 'relative',
            justifyContent: 'center',
            overflow: 'visible',
        },
        floatingRefereeBannerWrap: {
            position: 'absolute',
            top: isMobile ? 2 : 6,
            left: 8,
            right: isMobile ? 44 : 60,
            zIndex: 40,
            alignItems: 'center',
        },
        tableAndPowerRow: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            overflow: 'visible',
        },
        fixedTableWrap: {
            flex: 1,
            height: '100%',
            borderRadius: 16,
            overflow: 'visible',
        },
        tableStage: {
            width: '100%',
            height: '100%',
        },
        powerMeterDock: {
            width: 44,
            alignItems: 'center',
            justifyContent: 'center',
        },

        /* MOBILE 2-TIER BOTTOM HUD */
        bottomHudMobileContainer: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : palette.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
            padding: 6,
            gap: 5,
            userSelect: 'none',
        },
        bottomHudMobileTier1: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
        },
        bottomHudMobileTier2: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.border,
        },
        cueBallSelectorPillMobile: {
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : palette.surfaceLow,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : palette.border,
            padding: 2,
            gap: 2,
        },
        ballOptionBtnMobile: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 10,
        },
        fireButtonMobile: {
            width: 48,
            height: 32,
            borderRadius: 12,
            backgroundColor: '#0d5e2f',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(13, 94, 47, 0.6)',
        },

        /* DESKTOP PANORAMIC BOTTOM HUD */
        bottomHudBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : palette.card,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
            paddingHorizontal: 8,
            paddingVertical: 4,
            userSelect: 'none',
        },
        cueBallSelectorPill: {
            flexDirection: 'row',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : palette.surfaceLow,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : palette.border,
            padding: 2,
            gap: 2,
        },
        ballOptionBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderRadius: 14,
        },
        ballOptionBtnActive: {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        },
        whiteBallIcon: {
            width: 11,
            height: 11,
            borderRadius: 6,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#94a3b8',
            position: 'relative',
        },
        yellowBallIcon: {
            width: 11,
            height: 11,
            borderRadius: 6,
            backgroundColor: '#facc15',
            borderWidth: 1,
            borderColor: '#ca8a04',
            position: 'relative',
        },
        ballMiniDot: {
            position: 'absolute',
            top: 1,
            right: 1,
            width: 3,
            height: 3,
            borderRadius: 1.5,
        },
        ballOptionText: {
            fontSize: 9,
            fontWeight: '700',
            color: isDark ? '#64748b' : palette.muted,
        },
        ballOptionTextActive: {
            color: isDark ? '#f8fafc' : palette.text,
            fontWeight: '800',
        },
        utilityActionsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
        },
        clearTrailsBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.35)',
            borderRadius: 14,
            paddingHorizontal: 7,
            paddingVertical: 4,
        },
        clearTrailsText: {
            fontSize: 9,
            color: '#ef4444',
            fontWeight: '800',
        },
        guidePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : palette.border,
            borderRadius: 14,
            paddingHorizontal: 7,
            paddingVertical: 4,
        },
        guidePillActive: {
            backgroundColor: 'rgba(0, 210, 255, 0.15)',
            borderColor: 'rgba(0, 210, 255, 0.4)',
        },
        guidePillText: {
            fontSize: 9,
            fontWeight: '700',
            color: isDark ? '#64748b' : palette.muted,
        },
        guidePillTextActive: {
            color: '#00d2ff',
            fontWeight: '800',
        },
        fireButton: {
            width: 44,
            height: 38,
            borderRadius: 16,
            backgroundColor: '#0d5e2f',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(13, 94, 47, 0.6)',
        },
        fireButtonDisabled: {
            opacity: 0.4,
        },
        ballModuleContainerMobile: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        ballStudioTriggerMobile: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3.5,
            paddingHorizontal: 6,
            paddingVertical: 3.5,
            borderRadius: 12,
            borderWidth: 1,
        },
        ballStudioUmbMobile: {
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            borderColor: 'rgba(56, 189, 248, 0.35)',
        },
        ballStudioPbaMobile: {
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            borderColor: 'rgba(245, 158, 11, 0.35)',
        },
        ballStudioBadgeFlag: {
            fontSize: 10,
        },
        ballStudioBadgeText: {
            fontSize: 9.5,
            fontWeight: '800',
            color: isDark ? '#f8fafc' : palette.text,
            letterSpacing: 0.2,
        },
        ballModuleContainerDesktop: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        ballStudioTriggerDesktop: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 9,
            paddingVertical: 3.5,
            borderRadius: 16,
            borderWidth: 1,
        },
        ballStudioUmbDesktop: {
            backgroundColor: 'rgba(2, 132, 199, 0.14)',
            borderColor: 'rgba(56, 189, 248, 0.35)',
        },
        ballStudioPbaDesktop: {
            backgroundColor: 'rgba(217, 119, 6, 0.14)',
            borderColor: 'rgba(245, 158, 11, 0.35)',
        },
        ballStudioTriggerInner: {
            alignItems: 'flex-start',
        },
        ballStudioTriggerBadge: {
            fontSize: 10,
            fontWeight: '800',
            color: isDark ? '#f8fafc' : palette.text,
            letterSpacing: 0.3,
        },
        ballStudioSkinBadge: {
            fontSize: 8.5,
            fontWeight: '600',
            color: isDark ? '#94a3b8' : palette.muted,
            maxWidth: 120,
        },
    });
