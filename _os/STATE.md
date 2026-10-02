# Agentic OS - Project State

## Current Task
Enforce, validate, and permanently encode the 10 Mandatory System Rules across Bandaro Monorepo per user specification:
1. Full Bilingual (EN/ES) validation across all features and UI.
2. Consistent Light and Dark mode theme support.
3. Simulator shot reset: Spin (efecto), tome de bola, and power reset to 0 immediately upon execution.
4. Default trajectory guide configuration: Straight lines (`straight` / `solid`).
5. Post-shot execution trail: Displayed in straight lines with respective official ball colors, removed 1s after balls stop.
6. Edit mode: Cue stick (taco) and guides are completely hidden.
7. Simulator table colors: Independent default colors, never adopting catalog category colors on table or borders.
8. Default aiming model: Short aim guide (straight line to ghost ball, contact circle outline, and short straight exit stubs for both cue ball deflection and target ball).
9. Modals: Fully responsive, adapting size and scrolling to display viewport, matching app theme colors.
10. Git Commits: Strictly forbidden without passing tests and explicit user approval.

## Initial Discrepancies & Resolved Deficiencies
1. **Rule 6 Violation (Edit Mode)**: In `InteractiveBilliardsTable.tsx`, cue stick was only hidden if currently dragging the cue ball (`if (isEditMode && draggingBallId === cueBallId)`), and `filteredAimGuide` did not check `isEditMode`. Resolved: now both cue stick, ghost ball, and trajectory guides are unconditionally hidden when `isEditMode === true`.
2. **Rule 8 & 4 Discrepancy (Aim Guide Short Model)**: In `packages/core/src/physics/trajectoryGuide.ts`, `straight` aim mode previously stopped at the impact point without showing the short cue ball deflection stub or target ball exit stub. Resolved: updated `filterAimTrajectory` in `straight` mode to generate the classic short aim guide (straight approach line, ghost ball circle outline at impact, ~18 cm straight cue ball deflection stub, and ~18 cm straight target ball exit stub).
3. **Rule 3 Discrepancy (Shot Reset)**: While power and spin were reset on shot, tome de bola (cut offset) was not reset to 0 (direct center aim at target ball). Resolved: updated `useTrainingSimulation.ts` to reset aim direction to center-to-center straight aim (0 cut offset) upon shot execution.
4. **Rule 5 Discrepancy (Straight Trails)**: Execution trail during and after shot was raw simulation step points with potential curvature. Resolved: wrapped trail in `simplifyTrajectoryPoints` so trails render in clean straight line segments between cushion and ball impacts.
5. **Rule 1 & 2 Violations (i18n & Dark/Light Mode in Modals)**:
   - `TrajectoryGuideCustomizer.tsx` had hardcoded English strings and fixed dark backgrounds. Resolved: fully translated to EN/ES with `useI18n()` and adapted to light/dark themes (`palette.card`, `palette.border`, `palette.text`, etc.).
   - `CaromBallControlModal.tsx` had fixed `#0a0f1d` background on modal and `#070b14` on panels. Resolved: dynamically adapted to `palette.card` and `palette.background` with responsive dimensions.
6. **Rule 10 & Rule Permanence**: Created `.agents/rules/mandatory-project-rules.md`, `GEMINI.md`, `AGENTS.md`, and updated `_os/ARCHITECTURE.md` to guarantee that all agents adhere to these 10 rules.

## Active Status
- Phase: In Progress / Verification Completed for Power Meter Redesign
- Recent Changes:
  - Refined `CaromPowerMeter.tsx`:
    - Adjusted track to wider beveled frame (`trackWidth: 22..26px`, `outer: 28..32px`) with technical squared corners (`borderRadius: 4.5px`).
    - Positioned the Venom WS cue stick centered horizontally in the middle of the channel (`left: (trackWidth - cueWidth) / 2`).
    - Applied 3D depth shadow to the cue stick so it floats crisply over the channel.
    - Integrated rich multi-stop chromatic power gradient (yellow -> amber -> orange -> red) with subtle 45° diagonal hazard stripes revealed above the cue as it pulls down.
    - Added full-width horizontal divider lines at 25%, 50%, 75% power levels.
    - Set `overflow: 'hidden'` strictly on the inner channel and frame so the cue stick is neatly contained inside when retracted.
    - Preserved top arrow only ([IconArrowUp](file:///c:/Projects/React/Billard-app/bandaro-monorepo/apps/mobile/src/presentation/components/icons/index.ts)).
    - Preserved single-line bottom speed readout (`V1..V5` / `VEL 1..5`).
    - Verified 0 TypeScript errors and 61/61 passing unit tests.
- Verification Results:
  - `@bandaro/mobile`: `tsc --noEmit` passing with 0 errors.
  - `@bandaro/core`: 61/61 tests passing.
  - No Git commit executed (per Rule 10).

## Next Step
Validate new centered-cue and wider beveled layout with user.
