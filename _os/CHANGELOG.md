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
- **Edit Mode Guide & Cue Stick Visibility (Rule 6)**: Fixed `InteractiveBilliardsTable.tsx` to unconditionally hide the cue stick, ghost ball, and aiming guides when `isEditMode === true`.
- **Default Short Aiming Model (Rule 4 & Rule 8)**: Updated `filterAimTrajectory` to implement the classic short aiming model with straight approach line, ghost ball circle, and short straight exit stubs for both cue ball deflection and target ball.
- **Shot Reset to 0 (Rule 3)**: Fixed `useTrainingSimulation.ts` to reset power, spin, and tome de bola (aim direction aligned to center-to-center direct aim) to 0 immediately upon shot execution.
- **Straight Execution Trails (Rule 5)**: Enforced straight-line simplification on post-shot dynamic trails (`simplifyTrajectoryPoints`), keeping trails strictly in ball colors and disappearing 1 second after balls stop.
- **i18n & Theme Parity in Modals (Rule 1, 2 & 9)**: Added complete Spanish and English translations to `TrajectoryGuideCustomizer.tsx` and adapted `CaromBallControlModal.tsx` and customizers to light and dark theme palettes.
- **Mandatory Project Rules Enforcement (Rule 10)**: Created `.agents/rules/mandatory-project-rules.md`, `GEMINI.md`, `AGENTS.md`, and updated `_os/` state files with the 10 non-negotiable development rules, including strict prohibition of unapproved Git commits.

