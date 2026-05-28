/**
 * BillarCoachApp.jsx
 * Root component — wires camera, metrics, session recorder, and history.
 * Drop this into your monorepo as a route or page.
 *
 * Required packages:
 *   npm install @tensorflow/tfjs @tensorflow/tfjs-backend-webgl @tensorflow-models/pose-detection
 */

import React, { useState, useCallback, useRef } from 'react';
import { CameraView }        from './components/CameraView';
import { MetricsDashboard }  from './components/MetricsDashboard';
import { SessionHistory }    from './components/SessionHistory';
import { useSessionRecorder } from './hooks/useSessionRecorder';
import styles from './BillarCoachApp.module.css';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAMERA_ANGLES  = ['front', 'back', 'lateral'];
const ANALYSIS_MODES = [
  { key: 'free',    label: 'Libre'         },
  { key: 'bridge',  label: 'Puente'        },
  { key: 'align',   label: 'Alineación'    },
  { key: 'elbow',   label: 'Codo'          },
  { key: 'wrist',   label: 'Muñeca'        },
];

// ─── App ───────────────────────────────────────────────────────────────────────

export default function BillarCoachApp() {
  // UI state
  const [tab,          setTab]          = useState('analyze');   // 'analyze' | 'history' | 'guide'
  const [cameraActive, setCameraActive] = useState(false);
  const [angleIdx,     setAngleIdx]     = useState(0);
  const [modeKey,      setModeKey]      = useState('free');
  const [metrics,      setMetrics]      = useState(null);

  // Session log for sparkline (last 120 readings ~1 min at 2Hz)
  const sessionLogRef = useRef([]);

  const cameraAngle  = CAMERA_ANGLES[angleIdx];

  const {
    recording,
    sessions,
    currentDuration,
    startRecording,
    stopRecording,
    pushFrame,
    deleteSession,
    exportSession,
    clearAll,
  } = useSessionRecorder();

  // ── Metrics handler ────────────────────────────────────────────────────────
  const handleMetrics = useCallback((m) => {
    setMetrics(m);
    if (m) {
      // Push to session log (throttled to ~2 Hz via the RAF loop itself)
      const score = Object.values(m).reduce((s, v) => s + (v.score || 0), 0) /
                    Math.max(Object.keys(m).length, 1);
      sessionLogRef.current = [
        ...sessionLogRef.current.slice(-119),
        { ts: Date.now(), score: Math.round(score) },
      ];
      if (recording) pushFrame(m);
    }
  }, [recording, pushFrame]);

  // ── Camera toggle ──────────────────────────────────────────────────────────
  const handleCameraToggle = useCallback(() => {
    if (recording) toggleRecording(); // auto-stop recording
    setCameraActive(a => !a);
    setMetrics(null);
    sessionLogRef.current = [];
  }, [recording]);

  // ── Recording toggle ───────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (!recording) startRecording(modeKey, cameraAngle);
    else            stopRecording();
  }, [recording, startRecording, stopRecording, modeKey, cameraAngle]);

  // ── Angle cycle ────────────────────────────────────────────────────────────
  const cycleAngle = useCallback(() => {
    setAngleIdx(i => (i + 1) % CAMERA_ANGLES.length);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🎱</div>
          <div>
            <div className={styles.logoText}>BillarCoach AI</div>
            <div className={styles.logoSub}>POSE ANALYSIS ENGINE</div>
          </div>
        </div>

        <div className={styles.headerRight}>
          {recording && (
            <div className={styles.recIndicator}>
              <span className={styles.recDot} />
              {formatDuration(currentDuration)}
            </div>
          )}
          <div className={styles.statusPill}>
            <span className={`${styles.statusDot} ${cameraActive ? styles.dotActive : ''}`} />
            <span>{cameraActive ? 'Cámara activa' : 'En espera'}</span>
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className={styles.tabs}>
        {[
          { key: 'analyze', label: '🎯 Análisis' },
          { key: 'history', label: '📊 Historial' },
          { key: 'guide',   label: '📖 Guía'      },
        ].map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ══════════ ANALYZE TAB ══════════ */}
      {tab === 'analyze' && (
        <>
          {/* Mode strip */}
          <div className={styles.modeStrip}>
            {ANALYSIS_MODES.map(m => (
              <button
                key={m.key}
                className={`${styles.modeBtn} ${modeKey === m.key ? styles.modeBtnActive : ''}`}
                onClick={() => setModeKey(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Main layout */}
          <div className={styles.main}>

            {/* Camera + controls */}
            <div className={styles.camSide}>
              <div className={styles.camWrapper}>
                <CameraView
                  cameraAngle={cameraAngle}
                  analysisMode={modeKey}
                  active={cameraActive}
                  recording={recording}
                  onMetrics={handleMetrics}
                  onAngleChange={cycleAngle}
                />
              </div>

              {/* Bottom toolbar */}
              <div className={styles.toolbar}>
                <button
                  className={`${styles.toolBtn} ${styles.toolBtnSm}`}
                  onClick={cycleAngle}
                  title="Cambiar ángulo de cámara"
                >
                  🔄 <span>{cameraAngle}</span>
                </button>

                <button
                  className={`${styles.toolBtn} ${styles.toolBtnPrimary} ${cameraActive ? styles.toolBtnStop : ''}`}
                  onClick={handleCameraToggle}
                >
                  {cameraActive ? '⏸ Pausar' : '▶ Iniciar'}
                </button>

                <button
                  className={`${styles.toolBtn} ${styles.toolBtnSm} ${recording ? styles.toolBtnRec : ''}`}
                  onClick={toggleRecording}
                  disabled={!cameraActive}
                  title={recording ? 'Detener grabación' : 'Grabar sesión'}
                >
                  {recording ? '⏹ Detener' : '⏺ Grabar'}
                </button>
              </div>
            </div>

            {/* Metrics sidebar */}
            <aside className={styles.sidebar}>
              <MetricsDashboard
                metrics={metrics}
                analysisMode={modeKey}
                sessionLog={sessionLogRef.current}
              />
            </aside>

          </div>
        </>
      )}

      {/* ══════════ HISTORY TAB ══════════ */}
      {tab === 'history' && (
        <div className={styles.scrollArea}>
          <SessionHistory
            sessions={sessions}
            onDelete={deleteSession}
            onExport={exportSession}
            onClearAll={clearAll}
          />
        </div>
      )}

      {/* ══════════ GUIDE TAB ══════════ */}
      {tab === 'guide' && (
        <div className={styles.scrollArea}>
          <TechniqueGuide />
        </div>
      )}

    </div>
  );
}

// ─── Technique guide (static content) ─────────────────────────────────────────

function TechniqueGuide() {
  const sections = [
    {
      icon: '🤲', title: 'Puente de Mano',
      good: 'Dedos bien apoyados, arco estable entre índice y pulgar, anular y meñique como base firme.',
      bad:  'Puente abierto sin soporte lateral, mano tensa, movimiento durante el golpe.',
      tip:  'Practica el puente sobre la mesa sin el taco hasta que sea cómodo y estable.',
    },
    {
      icon: '⬆', title: 'Alineación Corporal',
      good: 'Hombros paralelos a la línea de tiro, espalda baja y recta, cabeza sobre el taco.',
      bad:  'Hombros levantados o rotados, espalda arqueada, cabeza elevada lejos del taco.',
      tip:  'Antes de agacharte, visualiza la línea del tiro y posiciona los pies primero.',
    },
    {
      icon: '💪', title: 'Balanceo del Codo',
      good: 'Movimiento pendular vertical puro, antebrazo perpendicular al piso en impacto.',
      bad:  'Desviación lateral del codo, aceleración brusca, muñeca rotada en el golpe.',
      tip:  'El codo es el punto fijo. Practica golpes lentos visualizando el péndulo.',
    },
    {
      icon: '🖐', title: 'Estabilidad de Muñeca',
      good: 'Muñeca neutral sin flexión excesiva, movimiento suave y controlado al final del golpe.',
      bad:  '"Chistear" con la muñeca, rotar al impactar, tensión excesiva en el antebrazo.',
      tip:  'La muñeca debe "flotar" — ni tensa ni flácida. Entrena golpes de práctica lentos.',
    },
    {
      icon: '⚖', title: 'Balance Corporal',
      good: 'Peso distribuido entre ambos pies, rodilla delantera ligeramente flexionada, estabilidad.',
      bad:  'Todo el peso en un pie, rodillas rígidas, balanceo durante el golpe.',
      tip:  'Separa los pies al ancho de los hombros. El pie trasero ancla, el delantero guía.',
    },
    {
      icon: '📐', title: 'Ángulo de Vista Lateral',
      good: 'Inclinación de 30–45° sobre la mesa, barbilla cerca del taco, ojos alineados con el tiro.',
      bad:  'Cabeza muy elevada (pérdida de visión del tiro) o excesivamente baja (incomodidad).',
      tip:  'Usa la cámara en modo lateral para verificar tu ángulo real de inclinación.',
    },
  ];

  return (
    <div className={styles.guide}>
      <div className={styles.guideHeader}>
        <h2>Guía Técnica de Billar</h2>
        <p>Referencia de posturas correctas analizadas por BillarCoach AI</p>
      </div>
      {sections.map((s, i) => (
        <div key={i} className={styles.guideCard}>
          <div className={styles.guideCardTitle}>
            <span>{s.icon}</span> {s.title}
          </div>
          <div className={styles.guideRow}>
            <div className={styles.guideGood}>
              <span className={styles.guideTag}>✓ Correcto</span>
              {s.good}
            </div>
            <div className={styles.guideBad}>
              <span className={styles.guideTag}>✗ Evitar</span>
              {s.bad}
            </div>
          </div>
          <div className={styles.guideTip}>
            💡 {s.tip}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
