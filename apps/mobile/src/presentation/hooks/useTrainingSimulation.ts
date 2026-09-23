import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    Ball,
    BallId,
    Vec2,
    SpinEffect,
    ShotConfig,
    POWER_LEVELS,
    DEFAULT_TABLE,
    BALL_RADIUS,
    PHYSICS,
    createBall,
    simulateShot,
    simulateStep,
    predictTrajectory,
    TrajectoryPrediction,
    validateThreeCushionShot,
    ShotValidation,
    vec2,
    vec2Normalize,
    vec2Sub,
    isBallMoving,
} from '@bandaro/core';

export interface TrainingState {
    balls: Ball[];
    cueBallId: BallId;
    spin: SpinEffect;
    powerLevel: number;
    powerPercentage: number;
    aimDirection: Vec2;
    isSimulating: boolean;
    trajectory: TrajectoryPrediction | null;
    validation: ShotValidation | null;
    dynamicTrails: Record<BallId, { pos: Vec2; timestamp?: number }[]> | null;
    liveCushionCount: number;
    liveBallHits: { first: boolean; second: boolean };
}

export interface UseTrainingSimulationReturn {
    state: TrainingState;
    setBallPosition: (ballId: BallId, pos: Vec2) => void;
    setCueBall: (ballId: BallId) => void;
    setSpin: (spin: SpinEffect) => void;
    setPowerLevel: (level: number) => void;
    setPowerPercentage: (percentage: number) => void;
    setAimDirection: (direction: Vec2) => void;
    updateTrajectory: () => void;
    executeShot: (customPowerPercentage?: number) => void;
    resetBalls: (positions: { white: Vec2; yellow: Vec2; red: Vec2 }) => void;
    stopSimulation: () => void;
    clearTrails: () => void;
}

export function useTrainingSimulation(
    initialPositions: { white: Vec2; yellow: Vec2; red: Vec2 }
): UseTrainingSimulationReturn {
    const [balls, setBalls] = useState<Ball[]>(() => [
        createBall('white', initialPositions.white.x, initialPositions.white.y),
        createBall('yellow', initialPositions.yellow.x, initialPositions.yellow.y),
        createBall('red', initialPositions.red.x, initialPositions.red.y),
    ]);

    const [cueBallId, setCueBallId] = useState<BallId>('white');
    const [spin, setSpinState] = useState<SpinEffect>({ x: 0, y: 0, magnitude: 0 });
    const [powerLevel, setPowerLevelState] = useState<number>(3);
    const [powerPercentage, setPowerPercentageState] = useState<number>(60);
    const [aimDirection, setAimDirectionState] = useState<Vec2>(vec2(1, 0));
    const [isSimulating, setIsSimulating] = useState<boolean>(false);
    const [trajectory, setTrajectory] = useState<TrajectoryPrediction | null>(null);
    const [validation, setValidation] = useState<ShotValidation | null>(null);
    const [dynamicTrails, setDynamicTrails] = useState<Record<BallId, { pos: Vec2; timestamp?: number }[]> | null>(null);
    const [liveCushionCount, setLiveCushionCount] = useState<number>(0);
    const [liveBallHits, setLiveBallHits] = useState<{ first: boolean; second: boolean }>({ first: false, second: false });

    const simulationRef = useRef<number | null>(null);
    const rafRef = useRef<(callback: FrameRequestCallback) => number>(
        typeof requestAnimationFrame !== 'undefined' 
            ? (cb) => requestAnimationFrame(cb) 
            : (cb) => setTimeout(() => cb(0), 16) as any
    );

    const ballsRef = useRef(balls);
    ballsRef.current = balls;
    const cueBallIdRef = useRef(cueBallId);
    cueBallIdRef.current = cueBallId;
    const aimDirectionRef = useRef(aimDirection);
    aimDirectionRef.current = aimDirection;
    const spinRef = useRef(spin);
    spinRef.current = spin;
    const powerPercentageRef = useRef(powerPercentage);
    powerPercentageRef.current = powerPercentage;

    useEffect(() => {
        return () => {
            if (simulationRef.current !== null) {
                cancelAnimationFrame(simulationRef.current);
            }
        };
    }, []);

    const setBallPosition = useCallback((ballId: BallId, pos: Vec2) => {
        setBalls((prev) =>
            prev.map((ball) =>
                ball.id === ballId ? { ...ball, pos } : ball
            )
        );
        setDynamicTrails(null);
        setValidation(null);
    }, []);

    const setCueBall = useCallback((ballId: BallId) => {
        setCueBallId(ballId);
        setDynamicTrails(null);
        setValidation(null);
    }, []);

    const setSpin = useCallback((newSpin: SpinEffect) => {
        setSpinState(newSpin);
    }, []);

    const setPowerLevel = useCallback((level: number) => {
        setPowerLevelState(level);
        setPowerPercentageState(Math.min(100, Math.max(0, level * 20)));
    }, []);

    const setPowerPercentage = useCallback((percentage: number) => {
        const clamped = Math.min(100, Math.max(0, percentage));
        setPowerPercentageState(clamped);
        const mappedLevel = clamped === 0 ? 0 : Math.min(5, Math.max(1, Math.ceil(clamped / 20)));
        setPowerLevelState(mappedLevel);
    }, []);

    const setAimDirection = useCallback((direction: Vec2) => {
        setAimDirectionState(vec2Normalize(direction));
        setDynamicTrails(null);
    }, []);

    const clearTrails = useCallback(() => {
        setDynamicTrails(null);
        setValidation(null);
        setLiveCushionCount(0);
        setLiveBallHits({ first: false, second: false });
    }, []);

    const updateTrajectory = useCallback(() => {
        const power = 15 + (powerPercentage / 100) * 75;
        const prediction = predictTrajectory(
            balls,
            cueBallId,
            aimDirection,
            power,
            spin,
            500,
            DEFAULT_TABLE
        );
        setTrajectory(prediction);
    }, [balls, cueBallId, aimDirection, powerPercentage, spin]);

    const executeShot = useCallback((customPowerPercentage?: number) => {
        if (isSimulating) return;

        setIsSimulating(true);
        setValidation(null);
        setLiveCushionCount(0);
        setLiveBallHits({ first: false, second: false });

        const currentBallsList = ballsRef.current;
        const currentCueBallId = cueBallIdRef.current;
        const currentAimDir = aimDirectionRef.current;
        const currentSpin = spinRef.current;
        const currentPowerPct = powerPercentageRef.current;

        const effectivePct = customPowerPercentage !== undefined && customPowerPercentage > 0
            ? customPowerPercentage
            : (currentPowerPct > 0 ? currentPowerPct : 50);

        // Reiniciar el valor del taco y potencia a cero de inmediato para la siguiente jugada
        setPowerPercentage(0);

        const power = 15 + (effectivePct / 100) * 75;

        const cueBall = currentBallsList.find((b) => b.id === currentCueBallId);
        if (!cueBall) {
            setIsSimulating(false);
            return;
        }

        const shotBalls = currentBallsList.map((ball) => {
            if (ball.id === currentCueBallId) {
                const normalizedDir = vec2Normalize(currentAimDir);
                return {
                    ...ball,
                    vel: { x: normalizedDir.x * power, y: normalizedDir.y * power },
                    spin: vec2(currentSpin.x * currentSpin.magnitude, currentSpin.y * currentSpin.magnitude),
                };
            }
            return ball;
        });

        let currentBalls = shotBalls;
        const allEvents: any[] = [];
        const stepsPerFrame = 4;

        // Inicializar recolector de estelas continuas
        const trailsCollector: Record<BallId, { pos: Vec2; timestamp?: number }[]> = {
            white: [{ pos: { ...shotBalls.find((b) => b.id === 'white')!.pos } }],
            yellow: [{ pos: { ...shotBalls.find((b) => b.id === 'yellow')!.pos } }],
            red: [{ pos: { ...shotBalls.find((b) => b.id === 'red')!.pos } }],
        };
        setDynamicTrails({
            white: [...trailsCollector.white],
            yellow: [...trailsCollector.yellow],
            red: [...trailsCollector.red],
        });

        const animate = () => {
            const anyMoving = currentBalls.some((b) => isBallMoving(b));
            
            if (!anyMoving) {
                setBalls(currentBalls);
                const shotValidation = validateThreeCushionShot(allEvents, cueBallId);
                setValidation(shotValidation);
                setIsSimulating(false);
                setTrajectory(null);
                // Eliminar los trazos de la jugada anterior una vez que las bolas se detienen
                setDynamicTrails(null);
                return;
            }

            for (let i = 0; i < stepsPerFrame; i++) {
                const { balls: newBalls, events } = simulateStep(currentBalls, DEFAULT_TABLE);
                currentBalls = newBalls;
                allEvents.push(...events);
            }

            // Registrar paso de la estela para cada bola
            for (const b of currentBalls) {
                trailsCollector[b.id].push({ pos: { ...b.pos } });
            }
            setDynamicTrails({
                white: [...trailsCollector.white],
                yellow: [...trailsCollector.yellow],
                red: [...trailsCollector.red],
            });

            // Actualizar conteo de bandas en tiempo real
            const cueCushions = allEvents.filter((e) => e.type === 'cushion').length;
            setLiveCushionCount(cueCushions);

            // Actualizar estado de bolas tocadas en vivo
            const cueHits = allEvents
                .filter((e) => e.type === 'ball_collision')
                .map((e) =>
                    e.data.ball1 === cueBallId
                        ? e.data.ball2
                        : e.data.ball2 === cueBallId
                        ? e.data.ball1
                        : null
                )
                .filter(Boolean);
            const hitFirst = cueHits.length >= 1;
            const hitSecond = cueHits.length >= 2;
            setLiveBallHits({ first: hitFirst, second: hitSecond });

            setBalls([...currentBalls]);

            simulationRef.current = rafRef.current(animate);
        };

        simulationRef.current = rafRef.current(animate);
    }, [balls, cueBallId, aimDirection, powerPercentage, spin, isSimulating, setPowerPercentage]);

    const resetBalls = useCallback((positions: { white: Vec2; yellow: Vec2; red: Vec2 }) => {
        setBalls([
            createBall('white', positions.white.x, positions.white.y),
            createBall('yellow', positions.yellow.x, positions.yellow.y),
            createBall('red', positions.red.x, positions.red.y),
        ]);
        setTrajectory(null);
        setValidation(null);
        setDynamicTrails(null);
        setLiveCushionCount(0);
        setLiveBallHits({ first: false, second: false });
        setIsSimulating(false);
    }, []);

    const stopSimulation = useCallback(() => {
        if (simulationRef.current) {
            cancelAnimationFrame(simulationRef.current);
            simulationRef.current = null;
        }
        setIsSimulating(false);
        setDynamicTrails(null);
    }, []);

    const state: TrainingState = useMemo(
        () => ({
            balls,
            cueBallId,
            spin,
            powerLevel,
            powerPercentage,
            aimDirection,
            isSimulating,
            trajectory,
            validation,
            dynamicTrails,
            liveCushionCount,
            liveBallHits,
        }),
        [
            balls,
            cueBallId,
            spin,
            powerLevel,
            powerPercentage,
            aimDirection,
            isSimulating,
            trajectory,
            validation,
            dynamicTrails,
            liveCushionCount,
            liveBallHits,
        ]
    );

    return {
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
        stopSimulation,
        clearTrails,
    };
}
