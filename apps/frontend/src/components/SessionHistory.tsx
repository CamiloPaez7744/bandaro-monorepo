import type { SessionRecord, SessionStats } from '@/types';
import { computeStats } from '@/hooks/useSessionRecorder';

type Props = {
  sessions: SessionRecord[];
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onClearAll: () => void;
};

export function SessionHistory({ sessions, onDelete, onExport, onClearAll }: Props) {
  const stats = computeStats(sessions);

  if (sessions.length === 0) {
    return (
      <section className="panel history-panel">
        <EmptyHistory />
      </section>
    );
  }

  return (
    <section className="panel history-panel">
      {stats && <StatsRow stats={stats} />}

      <div className="history-list">
        {sessions.map((session) => (
          <article key={session.id} className="history-card">
            <div className="history-card__top">
              <div>
                <strong>{session.mode}</strong>
                <span>{session.cameraAngle}</span>
              </div>
              <div className="history-score">{session.avgScore}</div>
            </div>

            <div className="history-card__meta">
              <span>{formatDate(session.date)}</span>
              <span>{formatDuration(session.duration)}</span>
              <span>{session.frameCount} cuadros</span>
            </div>

            <div className="mini-sparkline">
              {session.timeline.map((value, index) => (
                <span key={`${session.id}-${index}`} style={{ height: `${Math.max(8, value)}%` }} />
              ))}
            </div>

            <div className="history-actions">
              <button type="button" onClick={() => onExport(session.id)}>Exportar</button>
              <button type="button" onClick={() => onDelete(session.id)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="danger-button" onClick={onClearAll}>
        Borrar historial
      </button>
    </section>
  );
}

function StatsRow({ stats }: { stats: SessionStats }) {
  return (
    <div className="history-stats">
      <Stat label="Sesiones" value={stats.total} />
      <Stat label="Promedio" value={stats.avgScore} />
      <Stat label="Mejor" value={stats.best} />
      <Stat label="Tiempo" value={formatDuration(stats.totalTime)} />
      {stats.weeklyAvg != null && <Stat label="7 días" value={stats.weeklyAvg} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="history-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="empty-state">
      <strong>Sin sesiones guardadas</strong>
      <p>Graba una sesión para que aparezca el historial local y puedas exportarlo en JSON.</p>
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  return `${date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
}