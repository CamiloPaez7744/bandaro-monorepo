# Agentic OS - Changelog

## [Unreleased]
### Added
- **Spin/English Translation Layer** (`packages/core/src/physics/spinMapping.ts`):
  - Clock-face to Cartesian coordinate transformation (`clockToSpin`, `spinToClock`).
  - Strict translation dictionary for scraped catalog terms (`SOURCE_SPIN_DICTIONARY`).
  - Explicit per-play overrides (`PLAY_SPIN_OVERRIDES`), specifically overriding Play #27 to `bottom-left` (7 o'clock, 2.5 tips).
- **1:1 Speed/Power Calibration** (`packages/core/src/physics/powerCalibration.ts`):
  - Direct 1:1 speed-to-power mapping (`source speed = simulator power`).
  - Speed conversion to initial velocity in cm/s and percentage.
- **Trajectory Validation Engine** (`packages/core/src/physics/trajectoryValidation.ts`):
  - Point-to-segment Euclidean displacement routine, cushion sequence checks, and composite fit scoring.
- **Photoshop-Style Trajectory Guide Engine** (`packages/core/src/physics/trajectoryGuide.ts`):
  - Trajectory guide configuration schema with stroke weight and style (`solid`, `dashed`, `dotted`).
  - Strict ball-identity guide colors (`White: #ffffff`, `Yellow: #facc15`, `Red: #ef4444`).
  - Trajectory point filtering for Aiming Guide (`full` vs `exit_only`).
- **Mobile Guide Customizer UI** (`apps/mobile/src/presentation/components/Training/TrajectoryGuideCustomizer.tsx`):
  - Photoshop-style modal UI with thickness stepper, stroke style selection, aiming guide mode toggle, and execution trail toggle.
  - Launcher button with live badge added to `SimulatorSettingsModal.tsx`.
- **Comprehensive Physics & Guide Documentation** (`docs/physics_and_guides.md`).

### Fixed
- **Diverging Trajectory Guides**: Completely removed legacy `compute8BallAimGuide` raycaster from `InteractiveBilliardsTable.tsx`. Reconciled Aiming Guide and Execution Trail to calculate against the exact same `@bandaro/core` physics engine instance, eliminating path divergence.
- **Guide Color Inconsistency**: Eliminated catalog category color tints on trajectory paths, strictly locking paths to cue ball (White), object ball 1 (Yellow), and object ball 2 (Red).

