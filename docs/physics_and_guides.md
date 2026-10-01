# Physics Calibration, Spin Translation & Dual Trajectory Guide System
**Bandaro 3-Cushion Billiards Monorepo (`@bandaro/core` & `@bandaro/mobile`)**

---

## 1. Executive Summary & Architecture Overview

This document serves as the authoritative reference for the 3-cushion billiards physics calibration, scraped data translation layer (`https://billiard-bible.com/random-play`), and the Photoshop-style Dual Trajectory Guide System.

### Core Modules Location
- **Spin Translation & Overrides**: `packages/core/src/physics/spinMapping.ts`
- **Power Calibration (1:1 Speed-to-Power)**: `packages/core/src/physics/powerCalibration.ts`
- **Trajectory Validation Engine**: `packages/core/src/physics/trajectoryValidation.ts`
- **Trajectory Guide Customization Engine**: `packages/core/src/physics/trajectoryGuide.ts`
- **Mobile Catalog Shot Adapter**: `apps/mobile/src/infrastructure/catalog/shotAdapter.ts`
- **Interactive Billiards Table (SVG Canvas)**: `apps/mobile/src/presentation/components/Training/InteractiveBilliardsTable.tsx`
- **Photoshop-Style Customizer UI**: `apps/mobile/src/presentation/components/Training/TrajectoryGuideCustomizer.tsx`

---

## 2. Spin/English Mapping Layer

### 2.1 Coordinate System Standards
In the Bandaro physics engine:
- Coordinate axes:
  - $+X$: Right lateral spin (clockwise spin / efecto a favor a la derecha)
  - $-X$: Left lateral spin (counter-clockwise spin / efecto a favor a la izquierda)
  - $+Y$: Top spin / follow (corrido / efecto arriba)
  - $-Y$: Bottom spin / draw (retroceso / cajón / efecto abajo)
- Magnitude range: $[0.0, 1.0]$ where $1.0$ represents maximum contact offset on the ball ($3.0$ standard tips of English).

### 2.2 Clock-Face to Cartesian Conversion
A clock face measures hours from 1 to 12. Standard conversion:
$$\theta = (12 - \text{hour}) \times \frac{\pi}{6} \quad (\text{radians})$$
$$\text{spin}.x = \sin(\theta) \times \min\left(1.0, \frac{\text{tips}}{3.0}\right)$$
$$\text{spin}.y = \cos(\theta) \times \min\left(1.0, \frac{\text{tips}}{3.0}\right)$$
$$\text{spin}.\text{magnitude} = \sqrt{\text{spin}.x^2 + \text{spin}.y^2}$$

Bidirectional conversion from Cartesian back to clock face:
$$\theta = \text{atan2}(\text{spin}.x, \text{spin}.y)$$
$$\text{hour} = \left(12 - \frac{\theta \times 6}{\pi}\right) \pmod{12}$$

### 2.3 Scraped Source Spin Dictionary
Data scraped from external sources like `billiard-bible.com` provides diverse nomenclature. The `SOURCE_SPIN_DICTIONARY` maps every source keyword to structured clock hour and tips:

| Source Keyword / Alias | Internal Clock Hour | Tips | Direction | Cartesian ($x, y$) |
|---|---|---|---|---|
| `center`, `dead ball`, `sin efecto` | 12:00 | 0.0 | Center | $(0.0, 0.0)$ |
| `top`, `top spin`, `follow`, `corrido` | 12:00 | 2.5 | Top / High | $(0.0, +0.83)$ |
| `bottom`, `draw`, `retro`, `retroceso` | 6:00 | 2.5 | Bottom / Low | $(0.0, -0.83)$ |
| `right`, `right spin`, `der`, `derecha` | 3:00 | 2.5 | Right | $(+0.83, 0.0)$ |
| `left`, `left spin`, `izq`, `izquierda` | 9:00 | 2.5 | Left | $(-0.83, 0.0)$ |
| `top-right`, `follow-right`, `1:30` | 1:30 | 2.5 | High Right | $(+0.59, +0.59)$ |
| `bottom-right`, `draw-right`, `4:30` | 4:30 | 2.5 | Low Right | $(+0.59, -0.59)$ |
| `bottom-left`, `draw-left`, `7:30` | 7:30 | 2.5 | Low Left | $(-0.59, -0.59)$ |
| `top-left`, `follow-left`, `10:30` | 10:30 | 2.5 | High Left | $(-0.59, +0.59)$ |

### 2.4 Play #27 Override
In the scraped Billiard Bible database, **Play #27** erroneously indicates `"top spin"` despite its geometry requiring a deep draw/bottom-left cajón to clear the second ball and gather around the corner.

The mapping layer provides a strict override dictionary (`PLAY_SPIN_OVERRIDES`):
```typescript
export const PLAY_SPIN_OVERRIDES: Record<number, ClockSpin> = {
    27: {
        hour: 7.0, // 7 o'clock: bottom-left
        tips: 2.5,
        description: 'Play #27 Override: 7 o\'clock (Bottom-Left / Retro Izquierda)',
    },
};
```
Whenever `translateSourceSpin(input, 27)` is invoked, it bypasses the flawed source text and strictly enforces $7:00$ ($x < 0, y < 0$).

---

## 3. Power Calibration (1:1 Speed-to-Power)

### 3.1 Billiard Bible Speed Metric
In classical carom billiards (Caudron, Blomdahl, Billiard Bible), speed is expressed in **Table Lengths (largos de mesa)**:
- **Speed 1.0**: 1 table length (cue ball reaches opposite short rail and stops).
- **Speed 2.0**: 2 table lengths (crosses table, rebounds 1 short rail, returns).
- **Speed 3.0**: 3 table lengths (crosses table 3 times).
- **Speed 3.5**: 3.5 table lengths (canonical 3-cushion standard shot).
- **Speed 4.0**: 4 table lengths (fast stroke / cross table).
- **Speed 5.0**: 5 table lengths (maximum tournament power / double vuelta).

### 3.2 1:1 Mapping Formula
The source speed is mapped 1:1 to the simulator's internal power variable:
$$\text{power} = \text{sourceSpeed}$$
$$\text{powerPercentage} = \min\left(100.0, \max\left(0.0, \frac{\text{power}}{5.0} \times 100.0\right)\right)$$
$$\text{velocity} = 3.5 + \left(\frac{\text{powerPercentage}}{100.0}\right) \times (11.0 - 3.5) \quad (\text{cm/frame})$$

Example:
- Source `speed: 3.5` $\to$ Simulator `power: 3.5` $\to$ `powerPercentage: 70%` $\to$ Initial velocity: $8.75\text{ cm/frame}$.

---

## 4. Trajectory Validation System

The validation module (`trajectoryValidation.ts`) verifies catalog shots against the simulator's physics engine.

### 4.1 Point-to-Segment Euclidean Distance Routine
For each point $P$ in the reference trajectory, the routine calculates the minimum perpendicular distance to the line segments connecting simulated path points:
$$\vec{v} = B - A, \quad \vec{w} = P - A$$
$$c_1 = \vec{w} \cdot \vec{v}, \quad c_2 = \vec{v} \cdot \vec{v}$$
$$t = \text{clamp}\left(\frac{c_1}{c_2}, 0, 1\right), \quad \text{Projection } Q = A + t\vec{v}$$
$$\text{error} = \|P - Q\|$$

### 4.2 Scoring & Thresholds
- **Tolerance**: $6.15\text{ cm}$ (exact diameter of an official carom ball).
- **Fit Score Formula**:
  $$\text{displacementScore} = \max\left(0, 100 - \frac{\text{averageErrorCm}}{\text{toleranceCm}} \times 50\right)$$
  $$\text{fitScore} = \text{displacementScore} \times 0.60 + (\text{cushionsMatched} ? 25 : 0) + (\text{collisionMatched} ? 15 : 0)$$

---

## 5. Trajectory Guide System & Visual Customization

### 5.1 Color Strictness
To prevent visual confusion, all guide trajectories strictly respect official ball assignments and ignore catalog decorative colors:
- **White Cue Ball**: `#ffffff` (glow: `rgba(255, 255, 255, 0.25)`)
- **Yellow Object Ball**: `#facc15` (glow: `rgba(250, 204, 21, 0.25)`)
- **Red Object Ball**: `#ef4444` (glow: `rgba(239, 68, 68, 0.25)`)

### 5.2 Photoshop-Style UI Customization Engine
The configuration interface governs both the Aiming Guide and Execution Guide:
```typescript
export interface TrajectoryGuideConfig {
    strokeWeight: number;          // 0.4px to 3.0px (default: 0.9px)
    strokeStyle: 'solid' | 'dashed' | 'dotted';
    aimMode: 'full' | 'exit_only'; // Full multi-cushion vs cue ball exit after 1st impact
    showAimGuide: boolean;         // Prediction visibility
    showExecutionTrail: boolean;   // Execution path visibility
}
```

Stroke style dash array mapping:
- **Solid**: `strokeDasharray={undefined}`
- **Dashed**: `strokeDasharray="5 3"`
- **Dotted**: `strokeDasharray="1.5 2.5"` with `strokeLinecap="round"`

### 5.3 Dual Guide Implementation
1. **Aiming Guide (Prediction)**:
   - Renders prior to the shot (`!isSimulating`).
   - Sourced directly from `predictTrajectory(...)`.
   - **Full Mode**: Displays the complete multi-rail carom path for all balls.
   - **Exit Only Mode**: Truncates the cue ball path after its first impact (cushion or ball collision), showing the approach and immediate exit vector, along with the object ball's exit trajectory.
   - **Ghost Ball**: Rendered precisely at the collision coordinate calculated by `predictTrajectory`.
2. **Execution Guide (Trail)**:
   - Renders during and after the shot execution.
   - Sourced from `dynamicTrails` accumulated via `simulateStep(...)`.
   - Uses the identical `strokeWeight`, `strokeStyle`, and strict ball colors.

### 5.4 Bug Elimination (Diverging Path Reconciliation)
- **Root Cause**: The table previously rendered `compute8BallAimGuide`, a 2D tangent ray-caster with straight reflection math that ignored spin, cushion elasticity, and progressive cloth friction, simultaneously with `renderTrajectory`.
- **Solution**: Removed `compute8BallAimGuide` completely. Unified both Aiming Guide and Execution Guide to consume the exact same physics engine instance (`predictTrajectory` / `simulateStep`). As a result, predicted lines and real shot execution trails match with **zero mathematical discrepancy**.
