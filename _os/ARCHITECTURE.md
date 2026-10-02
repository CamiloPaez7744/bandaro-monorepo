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

## 5. Mandatory System Rules (Reglas Inviolables)
1. **Bilingüe (EN/ES)**: Todo nuevo desarrollo o texto debe adaptarse en inglés y español con `useI18n()`.
2. **Modo Claro y Oscuro**: Colores y componentes deben ajustarse a la paleta oficial para ambos modos.
3. **Reseteo tras Tiro**: Cada tiro en el simulador resetea de inmediato efecto, tome de bola y potencia a 0.
4. **Guías Rectas por Defecto**: La configuración inicial de las guías es siempre línea recta (`straight` / `solid`).
5. **Trayectorias Post-Tiro y Borrado en 1s**: Muestra el trazo recorrido de cada bola con su color propio en línea recta, eliminándose 1s después de que las bolas se detengan.
6. **Modo Edición Limpio**: Taco de billar y guías se ocultan por completo en modo edición (`isEditMode === true`).
7. **Color Propio del Simulador**: El simulador mantiene sus colores propios por defecto sin absorber colores de categorías del catálogo en sus bordes o paño.
8. **Apuntado Corto por Defecto**: Modelo de apuntado corto (estilo 8-Ball): línea recta a bola fantasma, círculo de impacto, y desvíos cortos rectos para ambas bolas (~18 cm).
9. **Modales Responsive**: Todos los modales deben adaptarse al tamaño de pantalla donde se visualizan, con scroll interno y compatibilidad de tema.
10. **Commits Prohibidos sin Aprobación**: NUNCA hacer commits en Git sin pruebas previas y sin petición explícita del usuario.
