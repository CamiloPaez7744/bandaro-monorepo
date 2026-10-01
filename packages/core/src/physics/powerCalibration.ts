import { calculateShotVelocity, VELOCITY_CALIBRATION_POINTS } from './types';

export interface PowerCalibrationResult {
    speed: number;           // 1:1 source metric (e.g. 3.5)
    power: number;           // Simulator power variable (1:1 with speed: 3.5)
    powerPercentage: number; // 0 to 100% scale (e.g. 70%)
    velocity: number;        // Direct initial velocity vector magnitude (cm/frame)
    tableLengths: number;    // Estimated physical table lengths rolled
}

export type CalibratedPower = PowerCalibrationResult;

/**
 * Calibrate source speed metric to simulator power 1:1.
 * 
 * In standard carom pedagogy (Billiard Bible, Caudron, Blomdahl):
 * Speed represents the number of table lengths (largos de mesa) the cue ball would travel:
 * - Speed 1.0 = 1 table length (reaches opposite short rail)
 * - Speed 2.0 = 2 table lengths (rebounds 1 short cushion and returns to starting rail)
 * - Speed 3.0 = 3 table lengths (crosses table 3 times)
 * - Speed 3.5 = 3.5 table lengths (crosses 3 cushions, stops halfway)
 * - Speed 4.0 = 4 table lengths
 * - Speed 5.0 = 5 table lengths (maximum stroke velocity)
 * 
 * Requirement 2: Map source 'speed' metric directly to our simulator's 'power' variable 1:1.
 * E.g., source speed: 3.5 === simulator power: 3.5.
 */
export function calibrateSourceSpeed(sourceSpeed: number | string | null | undefined): PowerCalibrationResult {
    let speed = 3.5; // Canonical default for standard 3-cushion carom shots

    if (sourceSpeed !== null && sourceSpeed !== undefined) {
        const parsed = typeof sourceSpeed === 'string' ? parseFloat(sourceSpeed) : sourceSpeed;
        if (!isNaN(parsed) && parsed >= 0) {
            speed = Math.max(0.1, Math.min(5.5, parsed));
        }
    }

    // 1:1 mapping: power = speed
    const power = Math.round(speed * 100) / 100;

    // Percentage mapping (5.0 table lengths = 100% power, 1.0 = 20%, 3.5 = 70%)
    const powerPercentage = Math.round(Math.min(100, Math.max(0, (speed / 5.0) * 100)) * 10) / 10;

    // Direct physics velocity
    const velocity = calculateShotVelocity(powerPercentage);

    return {
        speed,
        power,
        powerPercentage,
        velocity,
        tableLengths: speed,
    };
}

/**
 * Converts a simulator power value (either 0..5.5 direct scale or 0..100 percentage)
 * to calibrated initial velocity.
 */
export function powerToVelocity(power: number): number {
    if (power <= 0) return 0;
    // If power is given on 1..5.5 speed scale:
    if (power <= 5.5) {
        const pct = (power / 5.0) * 100;
        return calculateShotVelocity(pct);
    }
    // Otherwise power is already a 0..100 percentage
    return calculateShotVelocity(power);
}

/**
 * Converts a 0..100 percentage back to 1:1 speed metric (e.g. 70% -> 3.5)
 */
export function percentageToSpeed(percentage: number): number {
    const clamped = Math.max(0, Math.min(100, percentage));
    return Math.round((clamped / 100) * 5.0 * 10) / 10;
}
