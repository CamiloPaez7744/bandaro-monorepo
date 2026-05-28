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
    aimDirection: Vec2;
    isSimulating: boolean;
    trajectory: TrajectoryPrediction | null;
    validation: ShotValidation | null;
}

export interface UseTrainingSimulationReturn {
    state: TrainingState;
    setBallPosition: (ballId: BallId, pos: Vec2) => void;
    setCueBall: (ballId: BallId) => void;
    setSpin: (spin: SpinEffect) => void;
    setPowerLevel: (level: number) => void;
    setAimDirection: (direction: Vec2) => void;
    updateTrajectory: () => void;
    executeShot: () => void;
    resetBalls: (positions: { white: Vec2; yellow: Vec2; red: Vec2 }) => void;
    stopSimulation: () => void;
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
    const [aimDirection, setAimDirectionState] = useState<Vec2>(vec2(1, 0));
    const [isSimulating, setIsSimulating] = useState<boolean>(false);
    const [trajectory, setTrajectory] = useState<TrajectoryPrediction | null>(null);
    const [validation, setValidation] = useState<ShotValidation | null>(null);

    const simulationRef = useRef<number | null>(null);
    const rafRef = useRef<(callback: FrameRequestCallback) => number>(
        typeof requestAnimationFrame !== 'undefined' 
            ? (cb) => requestAnimationFrame(cb) 
            : (cb) => setTimeout(() => cb(0), 16) as any
    );

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
    }, []);

    const setCueBall = useCallback((ballId: BallId) => {
        setCueBallId(ballId);
    }, []);

    const setSpin = useCallback((newSpin: SpinEffect) => {
        setSpinState(newSpin);
    }, []);

    const setPowerLevel = useCallback((level: number) => {
        setPowerLevelState(level);
    }, []);

    const setAimDirection = useCallback((direction: Vec2) => {
        setAimDirectionState(vec2Normalize(direction));
    }, []);

    const updateTrajectory = useCallback(() => {
        const power = POWER_LEVELS[powerLevel - 1]?.velocity ?? 40;
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
    }, [balls, cueBallId, aimDirection, powerLevel, spin]);

    const executeShot = useCallback(() => {
        if (isSimulating) return;

        setIsSimulating(true);
        setValidation(null);
        // Mantener la trayectoria visible durante la simulación
        // setTrajectory(null); // Comentado para mantener guías congeladas

        const power = POWER_LEVELS[powerLevel - 1]?.velocity ?? 40;
        const cueBall = balls.find((b) => b.id === cueBallId);
        if (!cueBall) {
            setIsSimulating(false);
            return;
        }

        const shotBalls = balls.map((ball) => {
            if (ball.id === cueBallId) {
                const normalizedDir = vec2Normalize(aimDirection);
                return {
                    ...ball,
                    vel: { x: normalizedDir.x * power, y: normalizedDir.y * power },
                    spin: vec2(spin.x * spin.magnitude, spin.y * spin.magnitude),
                };
            }
            return ball;
        });

        let currentBalls = shotBalls;
        const allEvents: any[] = [];
        const stepsPerFrame = 4;

        const animate = () => {
            const anyMoving = currentBalls.some((b) => isBallMoving(b));
            
            if (!anyMoving) {
                setBalls(currentBalls);
                const shotValidation = validateThreeCushionShot(allEvents, cueBallId);
                setValidation(shotValidation);
                setIsSimulating(false);
                // Limpiar trayectoria después de que termine la simulación
                setTrajectory(null);
                return;
            }

            for (let i = 0; i < stepsPerFrame; i++) {
                const { balls: newBalls, events } = simulateStep(currentBalls, DEFAULT_TABLE);
                currentBalls = newBalls;
                allEvents.push(...events);
            }

            setBalls([...currentBalls]);

            simulationRef.current = rafRef.current(animate);
        };

        simulationRef.current = rafRef.current(animate);
    }, [balls, cueBallId, aimDirection, powerLevel, spin, isSimulating]);

    const resetBalls = useCallback((positions: { white: Vec2; yellow: Vec2; red: Vec2 }) => {
        setBalls([
            createBall('white', positions.white.x, positions.white.y),
            createBall('yellow', positions.yellow.x, positions.yellow.y),
            createBall('red', positions.red.x, positions.red.y),
        ]);
        setTrajectory(null);
        setValidation(null);
        setIsSimulating(false);
    }, []);

    const stopSimulation = useCallback(() => {
        if (simulationRef.current) {
            cancelAnimationFrame(simulationRef.current);
            simulationRef.current = null;
        }
        setIsSimulating(false);
    }, []);

    const state: TrainingState = useMemo(
        () => ({
            balls,
            cueBallId,
            spin,
            powerLevel,
            aimDirection,
            isSimulating,
            trajectory,
            validation,
        }),
        [balls, cueBallId, spin, powerLevel, aimDirection, isSimulating, trajectory, validation]
    );

    return {
        state,
        setBallPosition,
        setCueBall,
        setSpin,
        setPowerLevel,
        setAimDirection,
        updateTrajectory,
        executeShot,
        resetBalls,
        stopSimulation,
    };
}
