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
    - Inverted power colors so Level 1 (top, low speed) starts in Cyan, transitioning smoothly to Emerald Green (Level 2), Amber/Gold (Level 3), Orange (Level 4), and fiery Red (Level 5) at maximum speed/potencia at the bottom.
    - Added full internal speed graduation numbers from 1 to 5 (1, 2, 3, 4, 5) with matching colored tick marks and micro-ticks.
    - Preserved deep cue travel so that at 100% power, only the tip/ferrule remains visible at the bottom, showcasing the full column of colored diagonal bars.
  - Fixed Aim Guide Stability & Geometry in `useTrainingSimulation.ts` and `trajectoryGuide.ts`:
    - Decoupled `trajectory` pre-shot prediction from `powerPercentage` by utilizing a canonical reference power (`CANONICAL_AIM_POWER = 55`), completely eliminating aim guide trembling, erratic recalculation, stretching, or shrinking when charging power.
  - Fixed Cue Stick Transparency Bug after Shot Execution:
    - Root cause: In React Native Web / SVG, conditional unmounting of `<CaromCueGadget>` during `isSimulating === true` caused its `<Defs>` to detach from the DOM. When remounting after shot completion, references like `fill="url(#buttBodyGrad)"` or `fill="url(#shaftBodyGrad)"` failed to resolve, falling back to transparent fills (`fill: none`). Furthermore, static gradient IDs in both `CaromCueGadget.tsx` and `CaromPowerMeter.tsx` clashed between table and meter instances.
    - Resolution:
      1. Kept `<CaromCueGadget>` permanently mounted in `InteractiveBilliardsTable.tsx` and controlled visibility via SVG group opacity (`opacity={isCueVisible ? 1 : 0}`), guaranteeing `<Defs>` are never destroyed on shot transitions.
      2. Generated unique stable instance IDs (`cueUid` and `meterUid`) for all SVG linear/radial gradients.
      3. Added solid fallback fill layers beneath every gradient-filled shape (`#0f172a`, `#1e293b`, `#0284c7`, `#cbd5e1`, `#cfa875`) so cues are physically immune to any SVG paint detachment or frame delays.
## Recent Milestones & Pedagogy Expansion
- **Didactic 3-Cushion Billiard Mastery System & Database Persistence**:
  1. **Research Treatise & Master Notebook**:
     - Created `docs/theory/cuaderno_maestro_billar_tres_bandas.md` synthesizing world champions: Marco Zanetti, José María Quetglas, Raymond Ceulemans, Frédéric Caudron, Torbjörn Blomdahl, and AM Billiard Academy.
  2. **High-Fidelity Educational Infographics**:
     - `billiard_bridges_guide.jpg`: Closed loop bridge (anilla), open V-bridge, rail bridges.
     - `billiard_posture_stance.jpg`: Biomechanical stance, 45° triangle feet anchor, flat spine, 10 cm chin, 90° pendulum forearm, 60/40 balance.
     - `billiard_ball_thickness.jpg`: Geometric ball contact cuts (1/8, 1/4, 1/2, 3/4, full ball).
     - Deployed in both `docs/theory/images/` and `apps/mobile/assets/images/theory/`.
  3. **PostgreSQL Database Storage**:
     - Extended `billiard_systems` schema with `author`, `youtube_url`, `diagram_url`, `diamond_numbers`, `segmented_trajectories`, `cheat_sheets`.
     - Created `pedagogy_modules` table with complete instructional content, video references, and drills.
     - Seeded 4 master pedagogy modules and enriched `base-50` with interactive Cheat Sheet data (Origins 50, 40, 30, 60).
  4. **Frontend Canonical Cheat Sheet & Diamond Numbering**:
     - Enriched `BilliardsTableThumbnail.tsx` with dynamic `diamondLabels` on table rails.
     - Created `MasterPedagogyModal.tsx` for structured visual theory exploration.
     - Added Mode Switcher in `TrainingSystemScreen.tsx` with canonical cheat sheet origins, shot selection, multi-cushion segmented colored trajectories (1st-3rd cushion: Cyan `#06b6d4`, 3rd-4th cushion: Amber `#f59e0b`, 4th-5th cushion: Emerald `#10b981`), and interactive calculation cards.
- **Learning Roadmap (Ruta de Aprendizaje Funcional & Didáctica)**:
  1. **Curriculum Completo de 20 Estaciones y 4 Niveles**:
     - Cada una de las 20 estaciones de los 4 niveles cuenta con posiciones de billar reales, bolas, trayectorias vectoriales, consejos de maestros (Zanetti, Quetglas, Ceulemans, AM Billiard) y recompensas de XP.
     - Persistido y sincronizado en PostgreSQL (`training_levels`, `training_nodes`, `training_node_positions`).
  2. **Modal Interactivo de Estación (`RouteNodeDetailModal.tsx`)**:
     - Previsualización táctica de la mesa con `BilliardsTableThumbnail`, selector de tiro interactivo, badge de estado, puntos clave del entrenador y accesos directos al entrenamiento guiado, teoría biomecánica y cheat sheet.
  3. **Sesión Guiada Conectada End-to-End (`TrainingActiveSessionScreen.tsx`)**:
     - Carga automática de posiciones y título de la estación (`/training/session?nodeId=...`).
     - Al completar la práctica, sincroniza con `POST /training/node-progress`, calcula estrellas (1-3 ⭐), otorga XP y desbloquea en la base de datos la siguiente estación en la secuencia.
  4. **Refresco Reactivo en el Catálogo (`TrainingCatalogScreen.tsx`)**:
     - `useFocusEffect` recarga automáticamente el progreso desde el backend al regresar al catálogo, mostrando inmediatamente las estaciones desbloqueadas y estrellas obtenidas.
- **Tactical Solver & Colombian Carom Systems (Entrenador y Solucionador Táctico)**:
  1. **Solucionador Táctico de Carambolas (`billiardsPlaySolver.ts`)**:
     - Analizador geométrico que detecta la configuración espacial de las 3 bolas y propone la carambola canónica más óptima y alternativas de posicionamiento/defensa.
     - Identificación rigurosa de familias del billar colombiano: **Rodadas**, **Cajones**, **Pase Bola**, **Sistema LLK Willie Hoppe**, **Renversé**, **Serrucho**, **Zigzag**, **Retroceso/Jale**, **Tiki (Banda y Bola)** y **Bricoles**.
     - Recomendación precisa de parámetros técnicos: Tipo de golpe, tome de bola (1/8 a lleno), fuerza (1 a 5), y efecto según el reloj de Willie Hoppe.
  2. **Reloj de Efectos Willie Hoppe (`WillieHoppeClock.tsx`)**:
     - Componente visual interactivo fiel a la escala Hoppe: efecto 0 (12:00), cuadrante derecho (+1 a +4 ecuador y +5 a +7 jale), cuadrante izquierdo (-1 a -3 y -4 a -5).
  3. **Sistema LLK Willie Hoppe & Diamantes en Mesa (`TrainingPlayTable.tsx`)**:
     - Soporte para visualización de diamantes de Willie Hoppe (Ep. 130 El Flaco Billarista): Banda larga superior con rótulo "Suma" (diamantes 2, 4, 6, 8 en rojo), banda corta izquierda "Resta" (-1, -2, -3), cabecera derecha (-4, -5, -6), banda inferior (-1, -2, -3).
     - Fórmula matemática interactiva: `Llegada = Suma - Resta`.
  4. **Panel Solucionador en Sesión (`TacticalSolverPanel.tsx` & `TrainingActiveSessionScreen.tsx`)**:
     - Panel reactivo en `http://localhost:8081/training/session` que muestra la jugada óptima, consejos del maestro, dial de Hoppe y botón para simular la trayectoria en la mesa en tiempo real.
  5. **Compendio Teórico y Pedagógico (MasterPedagogyModal & PostgreSQL)**:
     - Infografías de alta fidelidad `billiard_shot_types.jpg` y `billiard_hoppe_system.jpg`.
     - 3 nuevas lecciones maestras en frontend y backend: Tipos de Golpes (Corrido, Semicorrido, Mate, Retroceso, Masé, Piqué, Penetración), Nomenclatura Colombiana y Sistema LLK Willie Hoppe.
- **Verification Results**:
  - `@bandaro/mobile`: `tsc --noEmit` passing with 0 errors.
  - `@bandaro/backend`: `tsc --noEmit` passing with 0 errors.
  - `@bandaro/backend`: 18/18 tests passing (100%).
  - `@bandaro/core`: 61/61 tests passing (100%).
  - Live API: `GET /training/pedagogy` (7 módulos) y `GET /training/systems/llk-hoppe` retornan 200 OK.
  - No Git commit executed (per Rule 10).

