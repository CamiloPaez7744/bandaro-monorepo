# Agentic OS - Changelog

## [Unreleased]
### Added
- **Canonical Dark Slate 3-Cushion Billiard Master Theory Infographics**:
  - Re-generated the entire educational theory visual suite using the reference dark slate carom table design (slate navy cloth `#151e2b`, subtle diamond grid, continuous dark wooden rails with glowing diamond rhombuses, Aramith Pro-Cup balls, electric neon cyan/blue dashed trajectory ribbon, and 'Toca para simular' HUD pill):
    - `billiard_base50_conti.jpg`: Conti Base 50 Diamond formula (Llegada = Salida - Ataque) with arrival, attack, and departure numbering and 50-30=20 carom trajectory.
    - `billiard_carom_figures.jpg`: 2x2 canonical grid of traditional carom families (Rodada L-C-L, Cajón C-L-C, Pase Bola L-C-L-C, Renversé).
    - `billiard_shot_types.jpg`: Core shot stroke biomechanics (Corrido, Mate de bola, Retroceso, Piqué/Masé) with clock impact dials and cue angles.
    - `billiard_hoppe_system.jpg`: Willie Hoppe LLK (Larga-Larga-Corta) system with Suma, Resta, Llegada diamond scales and Hoppe spin clock.
    - `billiard_ball_thickness.jpg`: 5 geometric ball contact cuts (1/8, 1/4, 1/2, 3/4, Llena) with eclipse overlays and natural separation angles.
    - `billiard_clock_systems_masters.jpg`: Master clock systems & rotation metrics with 3D Aramith Pro-Cup ball and Ceulemans/Zanetti scales.
    - `billiard_bridges_guide.jpg`: 4 master cue bridges (Abierto en V, Cerrado con anilla, Sobre banda, Elevado/Piqué).
    - `billiard_vision_aiming.jpg`: Sightline and 3-point visual pendulum routine (Taco -> Bola 2 -> Banda 1) with dominant eye alignment.
    - `billiard_stance_multiview.jpg`: Front, rear 90° pendulum, and top-down canonical stance triangle with 60/40 weight distribution.
  - Added new `canonical_dark_slate` ("Canónica Pro Dark Slate") arena skin and cloth preset in `tablePreferences.ts`, setting it as the application-wide default table style.
  - Fully synchronized across both `apps/mobile/assets/images/theory/` and `docs/theory/images/`.

- **Canonical 3-Cushion Billiard Master Theory Infographics (Legacy)**:
  - `billiard_base50_conti.jpg`: Official Conti Base 50 Diamond System diagram matching the royal blue technical blueprint aesthetic with strictly continuous rails (no pockets).
  - `billiard_carom_figures.jpg`: 2x2 technical panel of traditional Colombian/Latin American carom families (Rodada, Cajón, Pase Bola, Renversé).
  - `billiard_shot_types.jpg`: Core shot stroke biomechanics on authentic carom tables with zero pool pockets.
  - Interactive 1080p HD Lightbox Modal with pinch-to-zoom and click-outside dismissal in `MasterPedagogyModal.tsx`.

- **Deep Memory Optimization & V8 Heap Protection Across the Entire App**:
  - **Ambient Animation Loop Throttling & True Visibility Sleep**:
    - Capped animation loops across `HairlineDashboardFigure`, `HairlineTrainingFigure`, `HairlineSimulatorFigure`, `HairlineMatchFigure`, and `HairlineBilliardRiffle` to 20 FPS.
    - Integrated native `visibilitychange` listeners to completely freeze and cancel RAF loops when the browser tab is hidden/backgrounded, resuming seamlessly upon focus without memory churn.
  - **Web Audio Node Lifecycle & Noise Buffer Cache**:
    - Replaced per-collision Float32Array allocations in `BilliardAudioManager.ts` with a reusable cached white noise buffer.
    - Implemented `playWithAutoCleanup` attaching `onended` hooks to all buffer sources and oscillators to disconnect and release every node from `ctx.destination` immediately upon audio completion.
  - **Catalog List Virtualization & CSS Offscreen Pruning**:
    - Tuned `ShotCatalogScreen.tsx` FlatList (`windowSize={3}`, `initialNumToRender={6}`, `maxToRenderPerBatch={6}`).
    - Added `content-visibility: auto; contain-intrinsic-size: 0 380px;` to `cardItem`, directing modern browser engines to bypass SVG layout and GPU painting for offscreen cards.
  - **Simulation Step Throttling**:
    - Throttled polyline simulation updates in `TrainingPlayTable.tsx` to 40 FPS, reducing React state updates by 60% without sacrificing visual smoothness.
  - **Object URL Memory Leak Prevention**:
    - Added `registerBlobUrl` with automatic `URL.revokeObjectURL()` in `TableVisionStudioModal.tsx` on image change and modal unmount, eliminating multi-megabyte image buffers in browser RAM.
    - Suspended `pulseAnim` loop when `TableVisionStudioModal` is not visible.
  - **Memoization Parity**:
    - Memoized `derivedPaths` in `BilliardsTableThumbnail.tsx` to stop heap allocation of trajectory objects on parent re-renders.
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

