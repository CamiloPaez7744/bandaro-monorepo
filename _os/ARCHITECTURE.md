# Agentic OS - Architecture & Domain Boundaries

## Technology Stack
- **Monorepo**: Turbo, pnpm workspaces (`apps/mobile`, `packages/core`, `backend`)
- **Frontend App**: React Native 0.86, Expo 57, React Native SVG, TypeScript 6.0
- **Physics Engine**: Pure TypeScript mathematical simulation (`packages/core/src/physics/`)
- **Backend API**: Node.js/Express, PostgreSQL, Drizzle ORM

## Domain Models & Coordinate Standards
### 1. Table Dimensions
- International Match Carom Table: `TABLE_W = 284 cm`, `TABLE_H = 142 cm` (Exact 2:1 ratio).
- Standard Ball Radius: `BALL_RADIUS = 3.075 cm` (Diameter `61.5 mm`).
- Cushion Rail Thickness: `railThickness = 8.27 cm`, `cushionThickness = 4.73 cm`.

### 2. Coordinate System
- Origin `(0, 0)` is at the top-left of the playable cushion area.
- `+X` points right (0 to 284 cm).
- `+Y` points down (0 to 142 cm).

### 3. Spin / English System (Internal)
- `x`: Horizontal sidespin (-1.0 left / anti-clockwise to +1.0 right / clockwise).
- `y`: Vertical longitudinal spin (-1.0 bottom / draw to +1.0 top / follow).
- `magnitude`: 0.0 (center / dead ball) to 1.0 (maximum safe tip contact).
- Clock-Face Mapping:
  - Hour $H \in [1..12]$: $\theta = (H / 12) \times 2\pi$.
  - $x = \sin(\theta) \times (\text{tips} / 3)$
  - $y = \cos(\theta) \times (\text{tips} / 3)$
  - 12h = Top (+y), 6h = Bottom (-y), 3h = Right (+x), 9h = Left (-x).

### 4. Trajectory Rendering Standards
- **Color Invariant**: Trajectories strictly reflect ball identity:
  - White Ball $\to$ `#ffffff`
  - Yellow Ball $\to$ `#facc15`
  - Red Ball $\to$ `#ef4444`
- **Dual Guide Architecture**:
  - Aiming Guide (Prediction): Pre-shot path calculated from `predictTrajectory`.
  - Execution Guide (Trail): Dynamic trail during and after stroke from `simulateStep`.
  - Mathematical Unity: Both guides consume identical physics constants and step integration.
