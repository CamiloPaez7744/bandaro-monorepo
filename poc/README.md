# BillarCoach AI — Integración en Monorepo React

## Instalación de dependencias

```bash
npm install @tensorflow/tfjs \
            @tensorflow/tfjs-backend-webgl \
            @tensorflow-models/pose-detection
```

> ⚠️ TensorFlow.js usa WebGL. Requiere navegador moderno (Chrome, Firefox, Edge, Safari 16+).

---

## Estructura de archivos

```
src/
├── BillarCoachApp.jsx          ← Componente raíz (enruta todo)
├── BillarCoachApp.module.css
│
├── components/
│   ├── CameraView.jsx          ← Feed de cámara + canvas overlay
│   ├── CameraView.module.css
│   ├── MetricsDashboard.jsx    ← Score ring + tarjetas de métricas
│   ├── MetricsDashboard.module.css
│   ├── SessionHistory.jsx      ← Historial de sesiones
│   └── SessionHistory.module.css
│
└── hooks/
    ├── usePoseDetection.js     ← Hook principal: TF.js + MoveNet + biomecánica
    └── useSessionRecorder.js   ← Grabación y persistencia de sesiones
```

---

## Integración rápida

### En React Router (v6)

```jsx
// app/routes.jsx
import BillarCoachApp from './src/BillarCoachApp';

const routes = [
  { path: '/billar', element: <BillarCoachApp /> },
  // ...
];
```

### En Next.js (App Router)

```jsx
// app/billar/page.jsx
'use client';
import dynamic from 'next/dynamic';

// TF.js requiere carga dinámica (sin SSR)
const BillarCoachApp = dynamic(
  () => import('../../src/BillarCoachApp'),
  { ssr: false, loading: () => <p>Cargando BillarCoach...</p> }
);

export default function BillarPage() {
  return <BillarCoachApp />;
}
```

### En Vite / CRA (directo)

```jsx
// main.jsx
import BillarCoachApp from './src/BillarCoachApp';

function App() {
  return <BillarCoachApp />;
}
```

---

## Fuentes recomendadas (Google Fonts)

Agrega al `<head>` del HTML o en tu `globals.css`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

---

## Arquitectura del motor de análisis

### `usePoseDetection.js`

Hook central que:
1. Carga **MoveNet SINGLEPOSE_LIGHTNING** (modelo ligero, ~3MB, 20-30 FPS en móvil)
2. Abre la cámara con el `facingMode` correcto según el ángulo seleccionado
3. Corre el loop de detección con `requestAnimationFrame`
4. Dibuja el esqueleto + overlays de modo en el `<canvas>`
5. Calcula y devuelve métricas biomecánicas cada frame

```
front  → facingMode: 'user'        (selfie cam)
back   → facingMode: 'environment' (cámara trasera)
lateral → facingMode: 'environment' (cámara trasera, montada al costado)
```

### `computeMetrics(keypoints, mode, angle)`

Función pura que recibe 17 keypoints de MoveNet y devuelve:

| Métrica       | Descripción                              | Rango ideal     |
|---------------|------------------------------------------|-----------------|
| `shoulders`   | Inclinación hombros                      | < 5°            |
| `elbow`       | Ángulo codo brazo-taco                   | 75°–115°        |
| `spine`       | Desviación eje espinal                   | < 12°           |
| `head`        | Desviación lateral cabeza/taco           | < 12%           |
| `wrist`       | Estabilidad muñeca (neutro)              | < 8° desv.      |
| `balance`     | Simetría de caderas                      | < 4°            |
| `bridge`      | Firmeza puente de mano (modo bridge)     | score > 80      |
| `lean`        | Inclinación sobre mesa (modo lateral)    | 20°–50°         |
| `pendulum`    | Pureza péndulo codo (modo lateral)       | < 10° lateral   |

---

## Permisos de cámara

La app solicita permisos automáticamente al presionar "Iniciar".  
En iOS Safari se requiere HTTPS (incluso en localhost usa `127.0.0.1`).

```bash
# Vite: habilita HTTPS en dev
vite --host --https
```

---

## Variables CSS (theming)

Puedes sobreescribir en tu `globals.css`:

```css
:root {
  --bg:      #0a0c10;
  --surface: #111318;
  --accent:  #00e5a0;   /* verde principal */
  --accent2: #00b8ff;   /* azul secundario */
  --warn:    #ffb830;
  --danger:  #ff4d4d;
  --text:    #e8eaf0;
  --muted:   #6b7280;
}
```
