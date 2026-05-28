import { computeOverallScore } from '@bandaro/core';
import type { PoseMetrics, PostureAnalysis } from '@/types';

type Props = {
  metrics: PoseMetrics | null;
  backendAnalysis: PostureAnalysis | null;
  backendStatus: 'idle' | 'loading' | 'ready' | 'error';
  analysisMode: string;
};

const SCORE_DESCRIPTIONS = [
  { min: 85, label: 'Técnica sólida', tone: 'good' },
  { min: 70, label: 'Buen control', tone: 'good' },
  { min: 50, label: 'Ajustes visibles', tone: 'warn' },
  { min: 0, label: 'Requiere corrección', tone: 'bad' },
] as const;

export function MetricsDashboard({ metrics, backendAnalysis, backendStatus, analysisMode }: Props) {
  const localScore = computeOverallScore(metrics);
  const description = SCORE_DESCRIPTIONS.find((entry) => localScore >= entry.min) ?? SCORE_DESCRIPTIONS[SCORE_DESCRIPTIONS.length - 1];
  const metricEntries = Object.entries(metrics ?? {});

  return (
    <section className="panel metrics-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Análisis vivo</span>
          <h2>Estado técnico</h2>
        </div>
        <div className={`status-pill status-pill--${description.tone}`}>{analysisMode}</div>
      </div>

      <div className="score-hero">
        <div className="score-ring" style={{ ['--score' as string]: `${localScore}%` }}>
          <div className="score-ring__inner">
            <span className="score-ring__value">{metrics ? localScore : '--'}</span>
            <span className="score-ring__label">Puntuación local</span>
          </div>
        </div>

        <div className="score-copy">
          <p className="score-copy__title">{metrics ? description.label : 'Esperando pose detectada'}</p>
          <p className="score-copy__body">
            El frontend calcula métricas locales en tiempo real y también consulta el backend para validar la postura.
          </p>

          <div className="backend-pill">
            <span>Backend</span>
            <strong>{backendStatus === 'ready' ? 'Activo' : backendStatus === 'loading' ? 'Verificando' : backendStatus === 'error' ? 'Sin respuesta' : 'Inactivo'}</strong>
          </div>
        </div>
      </div>

      {backendAnalysis && (
        <div className="remote-summary">
          <div>
            <span className="eyebrow">Validación remota</span>
            <h3>{backendAnalysis.status}</h3>
          </div>
          <strong>{backendAnalysis.score}</strong>
        </div>
      )}

      <div className="metric-grid">
        {metricEntries.length === 0 && <EmptyMetricsState />}
        {metricEntries.map(([name, metric]) => (
          <MetricCard key={name} name={name} metric={metric} />
        ))}
      </div>

      {backendAnalysis && (
        <div className="tips-panel">
          <div className="tips-panel__header">
            <span className="eyebrow">Consejos del backend</span>
            <span>{backendAnalysis.mode}</span>
          </div>
          <ul>
            {backendAnalysis.tips.slice(0, 3).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MetricCard({ name, metric }: { name: string; metric: NonNullable<PoseMetrics[keyof PoseMetrics]> }) {
  return (
    <article className="metric-card">
      <div className="metric-card__top">
        <div>
          <span className="metric-card__icon">{metric.icon}</span>
          <h4>{metric.label}</h4>
        </div>
        <strong>{metric.value}</strong>
      </div>
      <div className="metric-bar">
        <span className={`metric-bar__fill metric-bar__fill--${metric.status}`} style={{ width: `${metric.score}%` }} />
      </div>
      <p>{metric.tip}</p>
      <small>{name}</small>
    </article>
  );
}

function EmptyMetricsState() {
  return (
    <div className="empty-state">
      <strong>Sin métricas todavía</strong>
      <p>Activa la cámara y colócate dentro del encuadre para comenzar el análisis.</p>
    </div>
  );
}