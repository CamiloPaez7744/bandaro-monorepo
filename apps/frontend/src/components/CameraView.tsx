import type { RefObject } from 'react';
import type { CameraAngle } from '@/types';

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cameraAngle: CameraAngle;
  cameraActive: boolean;
  recording: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: number;
  poseDetected: boolean;
  fps: number;
  onToggleCamera: () => void;
  onToggleRecording: () => void;
  onCycleAngle: () => void;
  onTakeSnapshot: () => void;
};

const ANGLE_LABELS: Record<CameraAngle, string> = {
  front: 'Frontal',
  back: 'Posterior',
  lateral: 'Lateral',
};

export function CameraView({
  videoRef,
  canvasRef,
  cameraAngle,
  cameraActive,
  recording,
  status,
  progress,
  poseDetected,
  fps,
  onToggleCamera,
  onToggleRecording,
  onCycleAngle,
  onTakeSnapshot,
}: Props) {
  const isReady = status === 'ready';
  const isLoading = status === 'loading';
  const hasError = status === 'error';

  return (
    <section className="camera-shell">
      <div className="camera-frame">
        <video ref={videoRef} className={`camera-video ${cameraActive ? 'is-live' : ''}`} playsInline muted autoPlay />
        <canvas ref={canvasRef} className="camera-canvas" />

        {!cameraActive && (
          <div className="camera-overlay camera-overlay--idle">
            <p>Activa la cámara para comenzar el análisis en tiempo real.</p>
          </div>
        )}

        {cameraActive && isLoading && (
          <div className="camera-overlay camera-overlay--loading">
            <p>Cargando modelo de pose...</p>
            <div className="loading-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
        )}

        {cameraActive && isReady && !poseDetected && (
          <div className="camera-overlay camera-overlay--hint">
            <p>Asegura que todo el cuerpo quede visible para obtener una lectura estable.</p>
          </div>
        )}

        {hasError && (
          <div className="camera-overlay camera-overlay--error">
            <p>No fue posible acceder a la cámara o cargar el detector.</p>
          </div>
        )}

        <div className="camera-hud">
          <div className="hud-chip hud-chip--accent">{ANGLE_LABELS[cameraAngle]}</div>
          {recording && <div className="hud-chip hud-chip--recording">REC</div>}
          {cameraActive && isReady && <div className="hud-chip">{fps} FPS</div>}
        </div>
      </div>

      <div className="camera-actions">
        <button type="button" className="action-button action-button--ghost" onClick={onCycleAngle}>
          Cambiar ángulo
        </button>
        <button type="button" className="action-button action-button--primary" onClick={onToggleCamera}>
          {cameraActive ? 'Pausar cámara' : 'Iniciar cámara'}
        </button>
        <button type="button" className="action-button action-button--ghost" onClick={onToggleRecording} disabled={!cameraActive}>
          {recording ? 'Detener grabación' : 'Grabar sesión'}
        </button>
        <button type="button" className="action-button action-button--ghost" onClick={onTakeSnapshot} disabled={!cameraActive}>
          Capturar fotograma
        </button>
      </div>
    </section>
  );
}