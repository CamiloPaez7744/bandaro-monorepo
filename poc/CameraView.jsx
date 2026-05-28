/**
 * CameraView.jsx
 * Camera feed with TensorFlow pose overlay.
 * Drop-in for any view — front, back, or lateral angle.
 */

import React, { useState, useCallback, useRef } from 'react';
import { usePoseDetection } from '../hooks/usePoseDetection';
import styles from './CameraView.module.css';

// ─── Camera angle labels ───────────────────────────────────────────────────────
const ANGLE_LABELS = {
  front:   'FRONTAL',
  back:    'POSTERIOR',
  lateral: 'LATERAL',
};

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string}   props.cameraAngle    'front' | 'back' | 'lateral'
 * @param {string}   props.analysisMode   'free' | 'bridge' | 'align' | 'elbow' | 'wrist'
 * @param {boolean}  props.active         Whether camera is on
 * @param {boolean}  props.recording      Whether session recording is on
 * @param {function} props.onMetrics      Callback with metrics object | null
 * @param {function} props.onAngleChange  Callback when user cycles angle
 */
export function CameraView({
  cameraAngle   = 'front',
  analysisMode  = 'free',
  active        = false,
  recording     = false,
  onMetrics,
  onAngleChange,
}) {
  const [fps, setFps]           = useState(0);
  const wrapperRef              = useRef(null);

  const { videoRef, canvasRef, modelState, poseDetected, loadProgress } =
    usePoseDetection({
      cameraAngle,
      analysisMode,
      enabled: active,
      onMetrics,
      onFps: setFps,
    });

  // ── Derived state ──────────────────────────────────────────────────────────
  const isLoading  = modelState === 'loading';
  const hasError   = modelState === 'error';
  const isReady    = modelState === 'ready';
  const flipClass  = cameraAngle === 'front' ? styles.flipped : '';

  return (
    <div className={styles.wrapper} ref={wrapperRef}>

      {/* ── Video ── */}
      <video
        ref={videoRef}
        className={`${styles.video} ${flipClass}`}
        playsInline
        muted
        autoPlay
      />

      {/* ── Pose overlay canvas ── */}
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${flipClass}`}
      />

      {/* ── Scan line animation (active) ── */}
      {active && isReady && (
        <div className={styles.scanLine} />
      )}

      {/* ── HUD corners ── */}
      {active && (
        <div className={styles.hudCorners}>
          <span className={styles.cornerTL} />
          <span className={styles.cornerTR} />
          <span className={styles.cornerBL} />
          <span className={styles.cornerBR} />
        </div>
      )}

      {/* ── Top-left labels ── */}
      <div className={styles.topLeft}>
        {recording && (
          <div className={styles.recBadge}>
            <span className={styles.recDot} />
            REC
          </div>
        )}
        <div className={styles.angleLabel}>
          {ANGLE_LABELS[cameraAngle]}
        </div>
      </div>

      {/* ── Top-right FPS ── */}
      {active && isReady && (
        <div className={styles.fpsBadge}>{fps} FPS</div>
      )}

      {/* ── No-pose overlay ── */}
      {active && isReady && !poseDetected && (
        <div className={styles.noPoseOverlay}>
          <div className={styles.noPoseBox}>
            <span className={styles.noPoseIcon}>📷</span>
            <h3>Posiciónate frente a la cámara</h3>
            <p>
              {cameraAngle === 'lateral'
                ? 'Coloca la cámara al costado para ver tu postura lateral completa.'
                : 'Asegúrate de que tu cuerpo completo sea visible. Aléjate 1–2 m de la cámara.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Loading overlay ── */}
      {(isLoading || (!active && !isReady)) && (
        <LoadingOverlay progress={loadProgress} message={
          isLoading       ? 'Cargando modelo MoveNet...' :
          !active         ? 'Listo para analizar'        :
                            'Iniciando...'
        } />
      )}

      {/* ── Error overlay ── */}
      {hasError && (
        <div className={styles.errorOverlay}>
          <span>⚠</span>
          <p>No se pudo acceder a la cámara o cargar el modelo.</p>
          <small>Verifica los permisos del navegador.</small>
        </div>
      )}

      {/* ── Bottom controls bar ── */}
      <div className={styles.bottomBar}>
        {/* Angle cycle button */}
        <button
          className={styles.controlBtn}
          onClick={onAngleChange}
          title="Cambiar ángulo de cámara"
          aria-label="Cambiar ángulo"
        >
          🔄
        </button>

        {/* Center spacer */}
        <div className={styles.angleIndicator}>
          {['front', 'back', 'lateral'].map(a => (
            <span
              key={a}
              className={`${styles.angleDot} ${a === cameraAngle ? styles.angleDotActive : ''}`}
            />
          ))}
        </div>

        {/* Snapshot button */}
        <button
          className={styles.controlBtn}
          onClick={() => takeSnapshot(canvasRef, videoRef, cameraAngle, analysisMode)}
          title="Capturar fotograma"
          aria-label="Capturar"
          disabled={!poseDetected}
        >
          📸
        </button>
      </div>
    </div>
  );
}

// ─── Loading overlay ───────────────────────────────────────────────────────────

function LoadingOverlay({ progress, message }) {
  return (
    <div className={styles.loadOverlay}>
      <div className={styles.loadIcon}>🎱</div>
      <div className={styles.loadSpinner} />
      <p className={styles.loadText}>{message}</p>
      <div className={styles.loadBarWrap}>
        <div className={styles.loadBar} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ─── Snapshot helper ───────────────────────────────────────────────────────────

function takeSnapshot(canvasRef, videoRef, angle, mode) {
  const canvas  = canvasRef.current;
  const video   = videoRef.current;
  if (!canvas || !video) return;

  const snap = document.createElement('canvas');
  snap.width  = canvas.width;
  snap.height = canvas.height;
  const ctx   = snap.getContext('2d');

  // Composite: video frame + overlay
  ctx.save();
  if (angle === 'front') {
    ctx.translate(snap.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, snap.width, snap.height);
  ctx.restore();
  ctx.drawImage(canvas, 0, 0);

  // Timestamp watermark
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const ts = new Date().toLocaleTimeString();
  ctx.fillText(`BillarCoach · ${ANGLE_LABELS[angle]} · ${ts}`, 12, snap.height - 12);

  snap.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `billar-${angle}-${mode}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export default CameraView;
