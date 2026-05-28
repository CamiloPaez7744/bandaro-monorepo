/**
 * SessionHistory.jsx
 * Displays past sessions, per-session breakdown, and aggregate stats.
 */

import React, { useMemo, useState } from 'react';
import { computeStats } from '../hooks/useSessionRecorder';
import styles from './SessionHistory.module.css';

const MODE_NAMES = {
  free:    'Libre',
  bridge:  'Puente',
  align:   'Alineación',
  elbow:   'Codo',
  wrist:   'Muñeca',
  lateral: 'Lateral',
};

const METRIC_NAMES = {
  shoulders: 'Hombros',
  elbow:     'Codo',
  spine:     'Espalda',
  head:      'Cabeza',
  wrist:     'Muñeca',
  balance:   'Balance',
  bridge:    'Puente',
  lean:      'Inclinación',
  pendulum:  'Péndulo',
};

function scoreColor(s) {
  return s >= 80 ? '#00e5a0' : s >= 60 ? '#ffb830' : '#ff4d4d';
}

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object[]} props.sessions
 * @param {function} props.onDelete    (id: string) => void
 * @param {function} props.onExport    (id: string) => void
 * @param {function} props.onClearAll  () => void
 */
export function SessionHistory({ sessions, onDelete, onExport, onClearAll }) {
  const [expanded, setExpanded] = useState(null);
  const stats = useMemo(() => computeStats(sessions), [sessions]);

  if (!sessions.length) {
    return (
      <div className={styles.empty}>
        <span>📊</span>
        <h3>Sin sesiones aún</h3>
        <p>Activa la cámara, comienza a entrenar y presiona ⏺ para grabar.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>

      {/* ── Aggregate stats ── */}
      {stats && <StatsBar stats={stats} />}

      {/* ── Weakest metric callout ── */}
      {stats?.weakest && (
        <div className={styles.weakCallout}>
          <span>⚠</span>
          <span>
            Métrica más débil: <strong>{METRIC_NAMES[stats.weakest] || stats.weakest}</strong>
            {' '}({stats.metricOverall[stats.weakest]}/100) — enfoca el entrenamiento aquí.
          </span>
        </div>
      )}

      {/* ── Session cards ── */}
      <div className={styles.list}>
        {sessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            isExpanded={expanded === session.id}
            onToggle={() => setExpanded(expanded === session.id ? null : session.id)}
            onDelete={() => onDelete?.(session.id)}
            onExport={() => onExport?.(session.id)}
          />
        ))}
      </div>

      {/* ── Clear all ── */}
      {sessions.length > 0 && (
        <button className={styles.clearBtn} onClick={onClearAll}>
          🗑 Borrar historial
        </button>
      )}
    </div>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats }) {
  return (
    <div className={styles.statsBar}>
      <Stat label="Sesiones"  value={stats.total} />
      <Stat label="Promedio"  value={stats.avgScore} color={scoreColor(stats.avgScore)} />
      <Stat label="Mejor"     value={stats.best}    color={scoreColor(stats.best)} />
      <Stat label="Tiempo total" value={formatDuration(stats.totalTime)} />
      {stats.weeklyAvg != null && (
        <Stat label="Esta semana" value={stats.weeklyAvg} color={scoreColor(stats.weeklyAvg)} />
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statVal} style={{ color }}>
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

function SessionCard({ session, isExpanded, onToggle, onDelete, onExport }) {
  const color = scoreColor(session.avgScore);

  return (
    <div className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}>
      {/* ── Header row ── */}
      <div className={styles.cardHeader} onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}>

        <div className={styles.cardMeta}>
          <span className={styles.cardMode}>{MODE_NAMES[session.mode] || session.mode}</span>
          <span className={styles.cardAngle}>{session.angle}</span>
          <span className={styles.cardDuration}>{formatDuration(session.duration)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={styles.cardScore} style={{ color }}>{session.avgScore}</div>
          <MiniSparkline data={session.timeline || []} color={color} />
          <span className={styles.chevron} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
            ▾
          </span>
        </div>
      </div>

      <div className={styles.cardDate}>{formatDate(session.date)}</div>

      {/* ── Expanded breakdown ── */}
      {isExpanded && (
        <div className={styles.breakdown}>
          {Object.entries(session.metricAvgs || {}).map(([k, v]) => (
            <div key={k} className={styles.breakdownRow}>
              <span className={styles.breakdownName}>{METRIC_NAMES[k] || k}</span>
              <div className={styles.breakdownBar}>
                <div
                  className={styles.breakdownFill}
                  style={{ width: `${v}%`, background: scoreColor(v) }}
                />
              </div>
              <span className={styles.breakdownVal} style={{ color: scoreColor(v) }}>
                {v}
              </span>
            </div>
          ))}

          <div className={styles.cardActions}>
            <button className={styles.actionBtn} onClick={onExport}>
              💾 Exportar JSON
            </button>
            <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={onDelete}>
              🗑 Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({ data, color }) {
  if (!data?.length) return null;
  const W = 50, H = 20;
  const max = 100, min = 0;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}

export default SessionHistory;
