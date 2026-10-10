import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, Pressable, View, useWindowDimensions, Platform } from 'react-native';

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
    IconMenu2,
} from '@/src/presentation/components/icons';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { InteractiveBilliardsTable } from '@/src/presentation/components/Training/InteractiveBilliardsTable';
import { NumberAnchor, Formula } from '@/src/presentation/components/Training/SystemNumberingControl';
import { SystemNumberingModal } from '@/src/presentation/components/Training/SystemNumberingModal';
import { TableCustomizerModal } from '@/src/presentation/components/Training/TableCustomizerModal';
import { CaromBallStudioModal } from '@/src/presentation/components/Training/CaromBallStudioModal';
import { SimulatorSettingsModal } from '@/src/presentation/components/Training/SimulatorSettingsModal';
import { CaromRefereeBanner } from '@/src/presentation/components/Training/CaromRefereeBanner';
import { CaromPowerMeter } from '@/src/presentation/components/Training/CaromPowerMeter';
import { CaromAimFineTuner } from '@/src/presentation/components/Training/CaromAimFineTuner';
import { CaromCombinedBallWidget } from '@/src/presentation/components/Training/CaromCombinedBallWidget';
import { CaromBallControlModal } from '@/src/presentation/components/Training/CaromBallControlModal';
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
    TrajectoryGuideConfig,
    DEFAULT_GUIDE_CONFIG,
    clockToSpin,
} from '@bandaro/core';
import { ApiSnapshotRepository } from '@/src/infrastructure/repositories/ApiSnapshotRepository';
import { fetchShotDetail } from '@/src/infrastructure/catalog/catalogApi';
import { adaptCatalogShot, type CatalogShot, getLocalizedCategoryName, getShotAimVector } from '@/src/infrastructure/catalog/shotAdapter';
import { CATEGORY_COLORS } from '@/src/presentation/components/Catalog/ShotCatalogCard';
import { TrajectoryGuideCustomizer } from '@/src/presentation/components/Training/TrajectoryGuideCustomizer';

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
        spinHour?: string;
        spinTips?: string;
        powerLevel?: string;
        power?: string;
        railSpeed?: string;
        whiteX?: string;
        whiteY?: string;
        yellowX?: string;
        yellowY?: string;
        redX?: string;
        redY?: string;
    }>();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const isMobile = (width < 768 && !isLandscape) || height < 500;

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
    const [showBallControlModal, setShowBallControlModal] = useState(false);
    const [showNumberingModal, setShowNumberingModal] = useState(false);
    const [showBallStudioModal, setShowBallStudioModal] = useState(false);
    const [showToolsMenu, setShowToolsMenu] = useState(false);
    const [guideConfig, setGuideConfig] = useState<TrajectoryGuideConfig>(DEFAULT_GUIDE_CONFIG);
    const [showGuideCustomizer, setShowGuideCustomizer] = useState(false);

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
        width > height || width >= 900 ? 'horizontal' : 'vertical'
    );
    const [isEditMode, setIsEditMode] = useState(!params.systemId && !params.shotId);
    const [showGuides, setShowGuides] = useState(true);
    const [showRuler, setShowRuler] = useState(false);
    const [numberingAnchors, setNumberingAnchors] = useState<NumberAnchor[]>([]);
    const [numberingFormula, setNumberingFormula] = useState<Formula | null>(null);
    const [showNumbering, setShowNumbering] = useState(false);

    useEffect(() => {
        const next: Orientation = width > height || width >= 900 ? 'horizontal' : 'vertical';
        setTableOrientation((prev) => (prev !== next ? next : prev));
    }, [width, height]);

    const isWeb = Platform.OS === 'web';

    // Dimensiones óptimas de la mesa para mantener la proporción exacta (aspectRatio)
    // y evitar que en Web/Desktop se expanda al 100% del ancho del monitor.
    const tableDimensions = useMemo(() => {
        const isHorizontal = isLandscape || tableOrientation === 'horizontal';
        // Proporción exacta del layout de la mesa (getLayout):
        // Horizontal: 307.54 / 165.54 ≈ 1.8578
        // Vertical: 165.54 / 307.54 ≈ 0.5383
        const aspect = isHorizontal ? 307.54 / 165.54 : 165.54 / 307.54;

        if (isHorizontal) {
            const dockLeftW = 44 + 8;
            const dockRightW = 56 + 8;
            const paddingH = (insets.left || 0) + (insets.right || 0) + 16;
            const paddingV = (insets.top || 0) + (insets.bottom || 0) + 12;

            const availW = Math.max(200, width - dockLeftW - dockRightW - paddingH);
            const availH = Math.max(150, height - paddingV);

            // Ajuste por contención (Contain)
            let calcH = availH;
            let calcW = calcH * aspect;

            if (calcW > availW) {
                calcW = availW;
                calcH = calcW / aspect;
            }

            // En Web / Desktop: Centrar con holgura estética sin devorar el ancho completo de la pantalla
            if (isWeb) {
                const webMaxW = Math.min(1360, width * 0.80);
                if (calcW > webMaxW) {
                    calcW = webMaxW;
                    calcH = calcW / aspect;
                }
                const webMaxH = (height - insets.top - insets.bottom) * 0.88;
                if (calcH > webMaxH) {
                    calcH = webMaxH;
                    calcW = calcH * aspect;
                }
            }

            return {
                width: Math.round(calcW),
                height: Math.round(calcH),
                aspectRatio: aspect,
            };
        } else {
            // Modo Vertical (Smartphones)
            const dockRightW = isMobile ? 48 : 56;
            const paddingH = (insets.left || 0) + (insets.right || 0) + 12;
            const paddingV = (insets.top || 0) + (insets.bottom || 0) + 16;

            const availW = Math.max(180, width - dockRightW - paddingH);
            const availH = Math.max(200, height - paddingV);

            let calcW = availW;
            let calcH = calcW / aspect;

            if (calcH > availH) {
                calcH = availH;
                calcW = calcH * aspect;
            }

            if (isWeb) {
                const webMaxH = height * 0.88;
                if (calcH > webMaxH) {
                    calcH = webMaxH;
                    calcW = calcH * aspect;
                }
            }

            return {
                width: Math.round(calcW),
                height: Math.round(calcH),
                aspectRatio: aspect,
            };
        }
    }, [isLandscape, tableOrientation, width, height, insets, isMobile, isWeb]);

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

            let initialAim = vec2(1, 0);
            if (params.aimX && params.aimY) {
                const ax = Number(params.aimX);
                const ay = Number(params.aimY);
                if (!isNaN(ax) && !isNaN(ay) && (ax !== 0 || ay !== 0)) {
                    initialAim = vec2Normalize(vec2(ax, ay));
                }
            } else {
                initialAim = vec2Normalize(vec2Sub(pos.yellow, pos.white));
            }
            setAimDirection(initialAim);
            lastPlayedShotRef.current = { positions: pos, aimDirection: initialAim };

            if (params.spinHour && params.spinTips) {
                const hr = parseFloat(params.spinHour);
                const tp = parseFloat(params.spinTips);
                if (!isNaN(hr)) {
                    setSpin(clockToSpin(hr, isNaN(tp) ? 2.5 : tp));
                }
            } else if (params.spinX !== undefined && params.spinY !== undefined) {
                const sx = Number(params.spinX) || 0;
                const sy = Number(params.spinY) || 0;
                const mag = Math.min(1, Math.hypot(sx, sy));
                setSpin({ x: sx, y: sy, magnitude: mag });
            }

            const rawPower = params.powerLevel || params.power || (params.railSpeed ? Number(params.railSpeed) * 20 : undefined);
            if (rawPower !== undefined) {
                const pNum = Number(rawPower);
                if (!isNaN(pNum) && pNum > 0) {
                    const pct = pNum <= 5 ? pNum * 20 : pNum;
                    const lvl = Math.min(5, Math.max(1, Math.round(pct / 20)));
                    setPowerLevel(lvl);
                    setPowerPercentage(pct);
                }
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

                    const aimVec = getShotAimVector(shot);
                    const normAim = vec2Normalize(vec2(aimVec.x, aimVec.y));
                    setAimDirection(normAim);
                    lastPlayedShotRef.current = { positions: pos, aimDirection: normAim };

                    if (shot.spinEffect) {
                        setSpin(shot.spinEffect);
                    } else if (shot.effectX !== 0 || shot.effectY !== 0) {
                        const spinX = Math.max(-1, Math.min(1, shot.effectX));
                        const spinY = Math.max(-1, Math.min(1, shot.effectY));
                        setSpin({ x: spinX, y: spinY, magnitude: Math.min(1, Math.hypot(spinX, spinY)) });
                    } else {
                        setSpin({ x: 0, y: 0, magnitude: 0 });
                    }
                    const speed = shot.railSpeed ?? 3.5;
                    const pct = speed * 20;
                    setPowerLevel(Math.min(5, Math.max(1, Math.round(speed))));
                    setPowerPercentage(pct);
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

    const lastPlayedShotRef = useRef<{
        positions: { white: Vec2; yellow: Vec2; red: Vec2 };
        aimDirection: Vec2;
    } | null>(null);

    const handleAimChange = useCallback(
        (direction: Vec2) => {
            setAimDirection(direction);
        },
        [setAimDirection]
    );

    const handleExecuteShot = useCallback(
        (customPower?: number) => {
            // Guardar configuración exacta de las bolas y mira antes del tiro para que "Reiniciar" siempre reinicie este tiro (Regla 5)
            const wB = state.balls.find((b) => b.id === 'white');
            const yB = state.balls.find((b) => b.id === 'yellow');
            const rB = state.balls.find((b) => b.id === 'red');
            if (wB && yB && rB) {
                lastPlayedShotRef.current = {
                    positions: {
                        white: { x: wB.pos.x, y: wB.pos.y },
                        yellow: { x: yB.pos.x, y: yB.pos.y },
                        red: { x: rB.pos.x, y: rB.pos.y },
                    },
                    aimDirection: { x: state.aimDirection.x, y: state.aimDirection.y },
                };
            }

            // Regla 1: Resetear las guías a la configuración recta por defecto
            setGuideConfig(DEFAULT_GUIDE_CONFIG);

            executeShot(customPower);
        },
        [state.balls, state.aimDirection, executeShot]
    );

    const handleReset = useCallback(() => {
        // Regla 5: Siempre que se dé reiniciar, se reiniciará el tiro recién jugado y no el por defecto 'Salida'
        if (lastPlayedShotRef.current) {
            resetBalls(lastPlayedShotRef.current.positions);
            setAimDirection(lastPlayedShotRef.current.aimDirection);
            return;
        }

        if (initialPositions) {
            resetBalls(initialPositions);
            return;
        }

        const breakPos = getBreakPosition(tablePreferences.breakFormat, {
            pbaFormation: tablePreferences.pbaFormation,
            umbSide: tablePreferences.umbSide,
        });
        resetBalls(breakPos);
        setAimDirection(getDefaultBreakAim(breakPos));
    }, [
        resetBalls,
        initialPositions,
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

    const handleStartPractice = useCallback(() => {
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
    }, [state.balls, router, system?.name, t, language]);

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
            <Stack.Screen options={{ headerShown: false }} />
            <View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top + (isLandscape ? 2 : (isMobile ? 2 : 6)),
                        paddingBottom: insets.bottom + (isLandscape ? 2 : (isMobile ? 2 : 6)),
                        paddingLeft: insets.left + (isLandscape ? 4 : 0),
                        paddingRight: insets.right + (isLandscape ? 4 : 0),
                    },
                ]}>
                
                {isLandscape ? (
                    /* LAYOUT PANORÁMICO (LANDSCAPE): DOCK IZQ + ESCENARIO CENTRAL + DOCK DER */
                    <View style={styles.panoramicRootLayout}>
                        {/* DOCK IZQUIERDO: Menú y herramientas agrupadas */}
                        <View style={styles.leftToolsDock}>
                            <TouchableOpacity
                                style={styles.circleIconBtn}
                                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/training'))}
                                accessibilityRole="button"
                                accessibilityLabel={t('common.back')}>
                                <IconArrowLeft size={16} color={isDark ? '#f8fafc' : palette.text} strokeWidth={2.2} />
                            </TouchableOpacity>

                            {/* Botón Menú de Configuraciones Agrupadas */}
                            <TouchableOpacity
                                style={styles.menuHighlightBtn}
                                onPress={() => setShowToolsMenu(true)}
                                accessibilityLabel={language === 'en' ? 'Simulator Menu' : 'Menú de Configuración'}>
                                <IconMenu2 size={18} color="#00d2ff" strokeWidth={2.2} />
                            </TouchableOpacity>

                            <View style={styles.dockSeparator} />

                            {/* Práctica Directa */}
                            <TouchableOpacity
                                style={styles.circleIconBtnGreen}
                                onPress={handleStartPractice}
                                disabled={state.isSimulating}
                                accessibilityLabel={t('common.practice')}>
                                <IconTarget size={15} color="#ffffff" strokeWidth={2.5} />
                            </TouchableOpacity>

                            {/* Alternar Edición / Apuntado */}
                            <TouchableOpacity
                                style={[styles.circleIconBtn, isEditMode && styles.circleIconBtnActiveAmber]}
                                onPress={() => setIsEditMode((prev) => !prev)}
                                disabled={state.isSimulating}
                                accessibilityLabel={t('training.sim.editMode')}>
                                <IconPencil size={14} color={isEditMode ? '#fbbf24' : '#94a3b8'} strokeWidth={2.2} />
                            </TouchableOpacity>

                            {/* Alternar Guías Visuales */}
                            <TouchableOpacity
                                style={[styles.circleIconBtn, showGuides && styles.circleIconBtnActiveCyan]}
                                onPress={() => setShowGuides((prev) => !prev)}
                                disabled={state.isSimulating}
                                accessibilityLabel={t('training.sim.guides')}>
                                <IconEye size={14} color={showGuides ? '#00d2ff' : '#94a3b8'} strokeWidth={2.2} />
                            </TouchableOpacity>

                            {/* Reiniciar Posición */}
                            <TouchableOpacity
                                style={styles.circleIconBtn}
                                onPress={handleReset}
                                disabled={state.isSimulating}
                                accessibilityLabel={t('training.sim.resetTable')}>
                                <IconRefresh size={14} color="#94a3b8" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>

                        {/* ESCENARIO CENTRAL: MESA CON MÁXIMO PROTAGONISMO */}
                        <View style={styles.panoramicCenterStage}>
                            {/* Banner de Árbitro: FLOATING OVERLAY */}
                            <View style={[styles.floatingRefereeBannerWrap, { pointerEvents: 'box-none' }]}>
                                <CaromRefereeBanner
                                    validation={state.validation}
                                    isSimulating={state.isSimulating}
                                    cushionCountLive={state.liveCushionCount}
                                    ballHitsLive={state.liveBallHits}
                                    onDismiss={dismissValidation}
                                />
                            </View>

                            <View style={styles.fixedTableWrap}>
                                <InteractiveBilliardsTable
                                    orientation="horizontal"
                                    style={[styles.tableStage, { width: tableDimensions.width, height: tableDimensions.height }]}
                                    balls={state.balls}
                                    cueBallId={state.cueBallId}
                                    trajectory={state.trajectory}
                                    dynamicTrails={state.dynamicTrails ?? undefined}
                                    collisionPulses={state.collisionPulses}
                                    aimDirection={state.aimDirection}
                                    powerLevel={state.powerPercentage}
                                    guideConfig={guideConfig}
                                    tablePreferences={tablePreferences}
                                    showCueStick={true}
                                    showGhostBall={true}
                                    onBallMove={handleBallMove}
                                    onAimChange={handleAimChange}
                                    onPowerChange={setPowerPercentage}
                                    onShoot={(power) => handleExecuteShot(power)}
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
                        </View>

                        {/* DOCK DERECHO: CONTROLES DE TIRO (BOLA -> POTENCIA -> PLAY) */}
                        <View style={styles.rightShotControlsDock}>
                            {/* 1. La Bola (Control combinado de Efecto y Tome al pulsar) */}
                            <CaromCombinedBallWidget
                                cueBallId={state.cueBallId}
                                spin={state.spin}
                                onPress={() => setShowBallControlModal(true)}
                                tablePreferences={tablePreferences}
                                disabled={state.isSimulating}
                                compact={true}
                                isDark={isDark}
                            />

                            {/* 2. Selector de Potencia */}
                            <View style={styles.powerMeterCenterWrap}>
                                <CaromPowerMeter
                                    powerLevel={state.powerPercentage}
                                    onPowerChange={setPowerPercentage}
                                    onShoot={(power) => handleExecuteShot(power)}
                                    disabled={state.isSimulating}
                                    compact={true}
                                    isDark={isDark}
                                />
                            </View>

                            {/* 3. Botón de Play / Disparo */}
                            <TouchableOpacity
                                style={[
                                    styles.fireButtonPanoramic,
                                    state.isSimulating && styles.fireButtonDisabled,
                                ]}
                                onPress={() => handleExecuteShot()}
                                disabled={state.isSimulating}
                                accessibilityLabel={t('training.sim.shoot')}>
                                {state.isSimulating ? (
                                    <IconLoader2 size={18} color="#ffffff" strokeWidth={2.5} />
                                ) : (
                                    <IconPlayerPlay size={18} color="#ffffff" strokeWidth={2.5} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* PORTRAIT LAYOUT */
                    <>
                        {/* BARRA SUPERIOR HUD DE JUEGO */}
                        <View style={styles.topHudBar}>
                            {/* Sección Izquierda: Salir, Menú de Configuraciones y Título */}
                            <View style={styles.headerLeft}>
                                <TouchableOpacity
                                    style={styles.circleIconBtn}
                                    onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/training'))}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('common.back')}>
                                    <IconArrowLeft size={isMobile ? 16 : 18} color={isDark ? '#f8fafc' : palette.text} strokeWidth={2.2} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.menuHighlightBtn}
                                    onPress={() => setShowToolsMenu(true)}
                                    accessibilityLabel={language === 'en' ? 'Simulator Menu' : 'Menú de Configuración'}>
                                    <IconMenu2 size={16} color="#00d2ff" strokeWidth={2.2} />
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

                            {/* Sección Derecha: Práctica, Modo y Reset */}
                            <View style={styles.headerToolsRow}>
                                <TouchableOpacity
                                    style={styles.trainHighlightBtn}
                                    onPress={handleStartPractice}
                                    disabled={state.isSimulating}>
                                    <IconTarget size={14} color="#fff" strokeWidth={2.5} />
                                    {!isMobile && <Text style={styles.trainBtnText}>{t('common.practice')}</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.toolIconOnlyBtn,
                                        isEditMode && styles.toolPillBtnActiveAmber,
                                    ]}
                                    onPress={() => setIsEditMode((prev) => !prev)}
                                    disabled={state.isSimulating}
                                    accessibilityLabel={t('training.sim.editMode')}>
                                    <IconPencil size={isMobile ? 14 : 15} color={isEditMode ? '#fbbf24' : '#94a3b8'} strokeWidth={2.2} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.toolIconOnlyBtn}
                                    onPress={handleReset}
                                    disabled={state.isSimulating}
                                    accessibilityLabel={t('training.sim.resetTable')}>
                                    <IconRefresh size={isMobile ? 14 : 16} color="#94a3b8" strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ESCENARIO PRINCIPAL */}
                        <View style={styles.arenaContainer}>
                            <View style={[styles.floatingRefereeBannerWrap, { pointerEvents: 'box-none' }]}>
                                <CaromRefereeBanner
                                    validation={state.validation}
                                    isSimulating={state.isSimulating}
                                    cushionCountLive={state.liveCushionCount}
                                    ballHitsLive={state.liveBallHits}
                                    onDismiss={dismissValidation}
                                />
                            </View>

                            <View style={[styles.tableAndPowerRow, isMobile && { gap: 6 }]}>
                                <View style={styles.fixedTableWrap}>
                                    <InteractiveBilliardsTable
                                        orientation={tableOrientation}
                                        style={[styles.tableStage, { width: tableDimensions.width, height: tableDimensions.height }]}
                                        balls={state.balls}
                                        cueBallId={state.cueBallId}
                                        trajectory={state.trajectory}
                                        dynamicTrails={state.dynamicTrails ?? undefined}
                                         collisionPulses={state.collisionPulses}
                                        aimDirection={state.aimDirection}
                                        powerLevel={state.powerPercentage}
                                        guideConfig={guideConfig}
                                        tablePreferences={tablePreferences}
                                        showCueStick={true}
                                        showGhostBall={true}
                                        onBallMove={handleBallMove}
                                        onAimChange={handleAimChange}
                                        onPowerChange={setPowerPercentage}
                                        onShoot={(power) => handleExecuteShot(power)}
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

                                {/* DOCK DERECHO EN VERTICAL (BOLA -> POTENCIA -> PLAY) */}
                                <View style={styles.rightShotControlsDock}>
                                    {/* 1. La Bola */}
                                    <CaromCombinedBallWidget
                                        cueBallId={state.cueBallId}
                                        spin={state.spin}
                                        onPress={() => setShowBallControlModal(true)}
                                        tablePreferences={tablePreferences}
                                        disabled={state.isSimulating}
                                        compact={true}
                                        isDark={isDark}
                                    />

                                    {/* 2. Selector de Potencia */}
                                    <View style={styles.powerMeterCenterWrap}>
                                        <CaromPowerMeter
                                            powerLevel={state.powerPercentage}
                                            onPowerChange={setPowerPercentage}
                                            onShoot={(power) => handleExecuteShot(power)}
                                            disabled={state.isSimulating}
                                            compact={true}
                                            isDark={isDark}
                                        />
                                    </View>

                                    {/* 3. Botón de Play */}
                                    <TouchableOpacity
                                        style={[
                                            styles.fireButtonPanoramic,
                                            state.isSimulating && styles.fireButtonDisabled,
                                        ]}
                                        onPress={() => handleExecuteShot()}
                                        disabled={state.isSimulating}
                                        accessibilityLabel={t('training.sim.shoot')}>
                                        {state.isSimulating ? (
                                            <IconLoader2 size={18} color="#ffffff" strokeWidth={2.5} />
                                        ) : (
                                            <IconPlayerPlay size={18} color="#ffffff" strokeWidth={2.5} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {/* MODALES FLOTANTES (OVERLAYS) */}
                <SimulatorSettingsModal
                    visible={showToolsMenu}
                    onClose={() => setShowToolsMenu(false)}
                    title={titleText}
                    categoryName={categoryName}
                    activeCategoryColor={activeCategoryColor}
                    isEditMode={isEditMode}
                    onToggleEditMode={() => setIsEditMode((prev) => !prev)}
                    showGuides={showGuides}
                    onToggleGuides={() => setShowGuides((prev) => !prev)}
                    showRuler={showRuler}
                    onToggleRuler={() => setShowRuler((prev) => !prev)}
                    showNumbering={showNumbering}
                    onOpenNumbering={() => setShowNumberingModal(true)}
                    onOpenCustomizer={() => setShowCustomizer(true)}
                    onOpenBallStudio={() => setShowBallStudioModal(true)}
                    onOpenGuideCustomizer={() => setShowGuideCustomizer(true)}
                    guideConfig={guideConfig}
                    onResetTable={handleReset}
                    onStartPractice={handleStartPractice}
                    aimDirection={state.aimDirection}
                    onAimChange={handleAimChange}
                    hasDynamicTrails={!!state.dynamicTrails}
                    onClearTrails={clearTrails}
                    isSimulating={state.isSimulating}
                />

                <TrajectoryGuideCustomizer
                    visible={showGuideCustomizer}
                    onClose={() => setShowGuideCustomizer(false)}
                    config={guideConfig}
                    onChangeConfig={setGuideConfig}
                />

                <CaromBallControlModal
                    visible={showBallControlModal}
                    cueBallId={state.cueBallId}
                    onCueBallChange={handleCueBallChange}
                    spin={state.spin}
                    onSpinChange={setSpin}
                    balls={state.balls}
                    aimDirection={state.aimDirection}
                    onAimChange={handleAimChange}
                    trajectory={state.trajectory}
                    tablePreferences={tablePreferences}
                    onClose={() => setShowBallControlModal(false)}
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
            alignItems: 'center',
            justifyContent: 'center',
        },
        tableStage: {
            alignSelf: 'center',
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

        /* PANORAMIC (LANDSCAPE) 3-ZONE LAYOUT */
        panoramicRootLayout: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: 6,
        },
        leftToolsDock: {
            width: 44,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : palette.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
            paddingVertical: 8,
            paddingHorizontal: 4,
            userSelect: 'none',
        },
        dockSeparator: {
            width: 24,
            height: 1,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : palette.border,
            marginVertical: 2,
        },
        menuHighlightBtn: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: 'rgba(0, 210, 255, 0.12)',
            borderWidth: 1.5,
            borderColor: '#00d2ff',
            alignItems: 'center',
            justifyContent: 'center',
        },
        circleIconBtnGreen: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#059669',
            borderWidth: 1,
            borderColor: '#10b981',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)',
        },
        circleIconBtnActiveAmber: {
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderColor: '#fbbf24',
        },
        circleIconBtnActiveCyan: {
            backgroundColor: 'rgba(0, 210, 255, 0.15)',
            borderColor: '#00d2ff',
        },
        panoramicCenterStage: {
            flex: 1,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'visible',
        },
        rightShotControlsDock: {
            width: 56,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : palette.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : palette.border,
            paddingVertical: 8,
            paddingHorizontal: 4,
            userSelect: 'none',
        },
        powerMeterCenterWrap: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 4,
        },
        fireButtonPanoramic: {
            width: 44,
            height: 40,
            borderRadius: 16,
            backgroundColor: '#0d5e2f',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(13, 94, 47, 0.6)',
        },
    });
