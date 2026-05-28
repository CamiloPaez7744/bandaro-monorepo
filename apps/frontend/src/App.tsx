import { useEffect, useMemo, useState } from 'react';
import { computeOverallScore } from '@bandaro/core';
import { CameraView } from '@/components/CameraView';
import { MetricsDashboard } from '@/components/MetricsDashboard';
import { SessionHistory } from '@/components/SessionHistory';
import { TechniqueGuide } from '@/components/TechniqueGuide';
import { useBackendAnalysis } from '@/hooks/useBackendAnalysis';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { computeStats, useSessionRecorder } from '@/hooks/useSessionRecorder';
import type { CameraAngle, PoseMetrics, TrainingMode } from '@/types';

const CAMERA_ANGLES: CameraAngle[] = ['front', 'back', 'lateral'];
const TRAINING_MODES: TrainingMode[] = ['free', 'bridge', 'align', 'elbow', 'wrist'];

export default function App() {
  const [tab, setTab] = useState<'analyze' | 'history' | 'guide'>('analyze');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraAngleIndex, setCameraAngleIndex] = useState(0);
  const [analysisMode, setAnalysisMode] = useState<TrainingMode>('free');

  const cameraAngle = CAMERA_ANGLES[cameraAngleIndex];

  const pose = usePoseDetection({
    cameraAngle,
    analysisMode,
    enabled: cameraActive,
  });

  const backend = useBackendAnalysis(pose.sample, cameraActive);

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

  useEffect(() => {
    if (!recording || !pose.sample) return;

    pushFrame({
      metrics: pose.sample.metrics,
      localScore: pose.sample.score,
    });
  }, [pose.sample?.timestamp, pushFrame, recording]);

  const sessionStats = useMemo(() => computeStats(sessions), [sessions]);

  const toggleCamera = () => {
    if (recording) {
      stopRecording(backend.analysis ?? null);
    }
    setCameraActive((active) => !active);
  };

  const toggleRecording = () => {
    if (!cameraActive) return;

    if (recording) {
      stopRecording(backend.analysis ?? null);
      return;
    }

    startRecording({ mode: analysisMode, cameraAngle });
  };

  const cycleAngle = () => {
    setCameraAngleIndex((current) => (current + 1) % CAMERA_ANGLES.length);
  };

  const takeSnapshot = () => {
    const video = pose.videoRef.current;
    const canvas = pose.canvasRef.current;
    if (!video || !canvas) return;

    const snapshot = document.createElement('canvas');
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;

    const context = snapshot.getContext('2d');
    if (!context) return;

    if (cameraAngle === 'front') {
      context.translate(snapshot.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, snapshot.width, snapshot.height);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(canvas, 0, 0);
    context.fillStyle = 'rgba(255,255,255,0.85)';
    context.font = '14px monospace';
    context.fillText(`Bandaro Coach · ${cameraAngle} · ${new Date().toLocaleTimeString()}`, 16, snapshot.height - 18);

    snapshot.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bandaro-${cameraAngle}-${analysisMode}-${Date.now()}.png`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Bandaro Coach</span>
          <h1>Billar técnico con análisis local y validación remota</h1>
        </div>

        <div className="header-chips">
          <span className={`status-pill ${cameraActive ? 'status-pill--good' : 'status-pill--warn'}`}>{cameraActive ? 'Cámara activa' : 'En espera'}</span>
          <span className={`status-pill ${backend.status === 'ready' ? 'status-pill--good' : backend.status === 'loading' ? 'status-pill--warn' : backend.status === 'error' ? 'status-pill--bad' : 'status-pill--muted'}`}>
            Backend {backend.status}
          </span>
          {recording && <span className="status-pill status-pill--bad">Grabando {formatDuration(currentDuration)}</span>}
        </div>
      </header>

      <nav className="tab-bar">
        <button type="button" className={tab === 'analyze' ? 'tab-button tab-button--active' : 'tab-button'} onClick={() => setTab('analyze')}>Análisis</button>
        <button type="button" className={tab === 'history' ? 'tab-button tab-button--active' : 'tab-button'} onClick={() => setTab('history')}>Historial</button>
        <button type="button" className={tab === 'guide' ? 'tab-button tab-button--active' : 'tab-button'} onClick={() => setTab('guide')}>Guía</button>
      </nav>

      <main className="app-content">
        {tab === 'analyze' && (
          <div className="analysis-layout">
            <div className="analysis-left">
              <div className="mode-bar">
                {TRAINING_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={analysisMode === mode ? 'mode-chip mode-chip--active' : 'mode-chip'}
                    onClick={() => setAnalysisMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <CameraView
                videoRef={pose.videoRef}
                canvasRef={pose.canvasRef}
                cameraAngle={cameraAngle}
                cameraActive={cameraActive}
                recording={recording}
                status={pose.status}
                progress={pose.progress}
                poseDetected={pose.poseDetected}
                fps={pose.fps}
                onToggleCamera={toggleCamera}
                onToggleRecording={toggleRecording}
                onCycleAngle={cycleAngle}
                onTakeSnapshot={takeSnapshot}
              />
            </div>

            <div className="analysis-right">
              <MetricsDashboard
                metrics={pose.metrics}
                backendAnalysis={backend.analysis}
                backendStatus={backend.status}
                analysisMode={analysisMode}
              />

              <div className="panel live-summary">
                <span className="eyebrow">Estado actual</span>
                <div className="summary-grid">
                  <SummaryItem label="Score local" value={pose.metrics ? computeOverallScore(pose.metrics) : '--'} />
                  <SummaryItem label="Score servidor" value={backend.analysis?.score ?? '--'} />
                  <SummaryItem label="Sesiones" value={sessions.length} />
                  <SummaryItem label="Promedio general" value={sessionStats?.avgScore ?? '--'} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <SessionHistory
            sessions={sessions}
            onDelete={deleteSession}
            onExport={exportSession}
            onClearAll={clearAll}
          />
        )}

        {tab === 'guide' && <TechniqueGuide />}
      </main>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}