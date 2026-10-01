# Agentic OS - Project State

## Current Task
Physics calibration, data translation layer for billiard-bible.com/random-play scraped dataset, and customizable Dual Trajectory Guide system for 3-cushion billiards simulator.

## Initial Discrepancies & Discovered Problems
1. **Divergent Trajectory Guides**: `InteractiveBilliardsTable.tsx` had two separate guide renderers active at the same time:
   - `compute8BallAimGuide`: A simplified 2D geometric ray-caster that completely ignored sidespin, longitudinal spin, table friction, and carom cushion restitution.
   - `renderTrajectory`: A multi-ball path renderer using `@bandaro/core`'s `predictTrajectory`.
   These two rendered simultaneously with different angles and paths, causing visual dissonance and diverging trajectories.
2. **Missing Spin/English Mapping Dictionary**: Catalog plays from `billiard-bible.com/random-play` use clock-face, descriptive terms ("top spin", "12 o'clock", "bottom-left"), or raw database attributes that were inconsistently translated to the simulator's internal Cartesian `SpinEffect` (`x: -1..1`, `y: -1..1`). For instance, Play #27 requires explicit bottom-left (7 o'clock) mapping.
3. **Power/Speed Metric Inconsistency**: Catalog speed (`railSpeed` or float speed like `3.5`) was mapped through non-linear discrete tables rather than a calibrated 1:1 metric matching simulator power.
4. **Trajectory Guide Customization & Color Adherence**: Trajectory colors previously inherited category colors (e.g., cyan/amber) instead of strictly adhering to ball colors (White for cue ball, Yellow for object ball 1, Red for object ball 2). There was no UI customization engine for stroke weight and stroke style (solid, dashed, dotted), nor a toggle for full vs exit-only aiming trajectory.
5. **Missing OS Memory Structure**: `_os/` directory was absent in the repository root. Created now per `agentic-os-core` specification.

## Active Status
- Phase: Completed & Verified
- Implemented & Tested Modules:
  - `packages/core/src/physics/spinMapping.ts`: Clock-to-spin and spin-to-clock transformations, comprehensive source spin dictionary, and strict override for Play #27 (bottom-left / 7 o'clock).
  - `packages/core/src/physics/powerCalibration.ts`: 1:1 direct speed-to-power calibration (`power = speed`), initial speed conversions, and calibrated power wrapper.
  - `packages/core/src/physics/trajectoryValidation.ts`: Continuous path point-to-segment Euclidean displacement validation, cushion and collision sequence verification, and composite fit scoring.
  - `packages/core/src/physics/trajectoryGuide.ts`: Photoshop-style guide stroke schema, strict ball color definitions (White, Yellow, Red), and trajectory filtering ('full' vs 'exit_only').
  - `packages/core/src/physics/trajectory.ts`: Tagged cushion and ball collision events on trajectory points for accurate exit filtering.
  - `packages/core/src/index.ts`: Re-exported all physics, guide, and translation interfaces.
  - `apps/mobile/src/infrastructure/catalog/shotAdapter.ts`: Integrated spin translation (with Play #27 override) and 1:1 speed calibration into catalog loader.
  - `apps/mobile/src/presentation/components/Training/InteractiveBilliardsTable.tsx`: Eliminated legacy `compute8BallAimGuide`, resolved diverging trajectory bug, and unified Aiming and Execution guides on `@bandaro/core` physics engine with Photoshop stroke styling and strict ball colors.
  - `apps/mobile/src/presentation/components/Training/TrajectoryGuideCustomizer.tsx`: Photoshop-style modal UI for stroke weight, stroke style (solid, dashed, dotted), aiming guide mode, and execution trail toggles.
  - `apps/mobile/src/presentation/components/Training/SimulatorSettingsModal.tsx`: Added launcher button for Trajectory Guide Customizer.
  - `apps/mobile/src/presentation/screens/Training/TrainingSimulationScreen.tsx`: Wired guide configuration state and integrated customizer modal.
  - `docs/physics_and_guides.md`: Comprehensive documentation covering formulas, coordinate standards, spin dictionary, Play #27 override, speed calibration, and dual guide architecture.

## Verification
- Core Test Suite: 7/7 test suites (60 tests) passing with 100% success rate.
- Mobile TypeScript Check: 0 errors (`tsc --noEmit`).
- Trajectory Guide Reconciliation: Zero divergence between Aiming Guide and Execution Trail. Strict ball colors enforced.

