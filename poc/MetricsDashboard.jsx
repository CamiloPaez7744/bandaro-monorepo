/**
 * MetricsDashboard.jsx
 * Real-time metrics panel: score ring, metric cards, and feedback feed.
 * Receives metrics from parent (which gets them from usePoseDetection).
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { computeOverallScore } from '../hooks/usePoseDetection';
import styles from './MetricsDashboard.module.css';

// ─── Score ring constants ──────────────────────────────────────────────────────
const RADIUS      = 38;
const CIRCUMF     = 2 * Math.PI * RADIUS;

// ─── Mode priority keys ────────────────────────────────────────────────────────
const MODE_PRIORITY = {
  bridge:  ['bridge', 'wrist', 'elbow', 'shoulders', 'head', 'spine', 'balance'],
  align:   ['spine', 'shoulders', 'head', 'balance', 'elbow', 'wrist'],
  elbow:   ['elbow', 'pendulum', 'wrist', 'shoulders', 'spine', 'head', 'balance'],
  wrist:   ['wrist', 'bridge', 'elbow', 'shoulders', 'head', 'spine', 'balance'],
  lateral: ['lean', 'pendulum', 'spine', 'elbow', 'wrist', 'shoulders', 'balance'],
  free:    ['shoulders', 'elbow', 'spine', 'head', 'wrist', 'balance'],
};

const SCORE_LABELS = {
  excellent: { text: 'Técnica excelente',  color: '#00e5a0' },
  good:      { text: 'Buena técnica',      color: '#00b8ff' },
  fair:      { text: 'Necesita ajustes',   color: '#ffb830' },
  poor:      { text: 'Requiere corrección', color: '#ff4d4d' },
};

function scoreLabel(s) {
  return s >= 85 ? SCORE_LABELS.excellent :
         s >= 68 ? SCORE_LABELS.good :
         s >= 48 ? SCORE_LABELS.fair :
                   SCORE_LABELS.poor;
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.metrics      metrics object | null
 * @param {string}   props.analysisMode current mode key
 * @param {object[]} props.sessionLog   array of {ts, score} for sparkline
 */
export function MetricsDashboard({ metrics, analysisMode = 'free', sessionLog = [] }) {
  const score        = useMemo(() => computeOverallScore(metrics), [metrics]);
  const strokeOffset = metrics ? CIRCUMF * (1 - score / 100) : CIRCUMF;
  const label        = scoreLabel(score);

  // Sort metrics by mode priority
  const sortedKeys = useMemo(() => {
    if (!metrics) return [];
    const priority = MODE_PRIORITY[analysisMode] || MODE_PRIORITY.free;
    const all = Object.keys(metrics);
    const ordered = priority.filter(k => all.includes(k));
    const rest    = all.filter(k => !ordered.includes(k));
    return [...ordered, ...rest];
  }, [metrics, analysisMode]);

  // Sparkline for session progress (last 30 readings)
  const sparkData = sessionLog.slice(-30);

  return (
    <div className={styles.panel}>

      {/* ── Score ring ── */}
      <div className={styles.scoreSection}>
        <div className={styles.ringWrap}>
          <svg width={90} height={90} viewBox="0 0 90 90" aria-hidden="true">
            {/* Track */}
            <circle
              cx={45} cy={45} r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={6}
            />
            {/* Progress arc */}
            <circle
              cx={45} cy={45} r={RADIUS}
              fill="none"
              stroke={metrics ? label.color : 'rgba(255,255,255,0.12)'}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={CIRCUMF}
              strokeDashoffset={strokeOffset}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                transition: 'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1), stroke 0.5s',
              }}
            />
          </svg>

          <div className={styles.ringCenter}>
            <span
              className={styles.scoreNum}
              style={{ color: metrics ? label.color : 'rgba(255,255,255,0.2)' }}
            >
              {metrics ? score : '--'}
            </span>
          </div>
        </div>

        <div className={styles.scoreLabel}>PUNTUACIÓN TÉCNICA</div>
        <div
          className={styles.scoreDesc}
          style={{ color: metrics ? label.color : undefined }}
        >
          {metrics ? label.text : 'Esperando análisis...'}
        </div>

        {/* Sparkline */}
        {sparkData.length > 2 && (
          <Sparkline data={sparkData} color={label.color} />
        )}
      </div>

      {/* ── Metrics list ── */}
      <div className={styles.metricsList}>
        {!metrics ? (
          <EmptyState />
        ) : sortedKeys.map((key, i) => (
          <MetricCard
            key={key}
            metric={metrics[key]}
            delay={i * 0.04}
          />
        ))}
      </div>

      {/* ── Feedback feed ── */}
      {metrics && <FeedbackFeed metrics={metrics} sortedKeys={sortedKeys} />}
    </div>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ metric, delay = 0 }) {
  const { score, value, status, label, icon, tip } = metric;

  const fillColor =
    status === 'good' ? '#00e5a0' :
    status === 'warn' ? '#ffb830' :
                        '#ff4d4d';

  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardLabel}>
          <span className={styles.cardIcon}>{icon}</span>
          <span>{label}</span>
        </div>
        <ValueBadge value={value} status={status} />
      </div>

      <div className={styles.bar}>
        <div
          className={styles.barFill}
          style={{
            width: `${score}%`,
            background: fillColor,
            boxShadow: `0 0 6px ${fillColor}60`,
          }}
        />
      </div>

      <p className={styles.tip}>{tip}</p>
    </div>
  );
}

// ─── ValueBadge ───────────────────────────────────────────────────────────────

function ValueBadge({ value, status }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${status}`]}`}>
      {value}
    </span>
  );
}

// ─── FeedbackFeed ─────────────────────────────────────────────────────────────

function FeedbackFeed({ metrics, sortedKeys }) {
  const issues = sortedKeys
    .filter(k => metrics[k].status !== 'good')
    .sort((a, b) => metrics[a].score - metrics[b].score)
    .slice(0, 2);

  const good = sortedKeys
    .filter(k => metrics[k].status === 'good')
    .slice(0, 2);

  const items = [
    ...good.map(k => ({ type: 'good', icon: '✓', text: metrics[k].tip })),
    ...issues.map(k => ({
      type: metrics[k].status,
      icon: metrics[k].status === 'warn' ? '⚠' : '✗',
      text: metrics[k].tip,
    })),
  ];

  if (!items.length) return null;

  return (
    <div className={styles.feedbackArea}>
      {items.map((item, i) => (
        <div key={i} className={`${styles.feedItem} ${styles[`feed_${item.type}`]}`}>
          <span className={styles.feedIcon}>{item.icon}</span>
          <span className={styles.feedText}>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }) {
  const W = 160, H = 28;
  const max = 100, min = 0;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.score - min) / (max - min)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={styles.sparkline}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* Last point dot */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        const x = W;
        const y = H - ((last.score - min) / (max - min)) * H;
        return <circle cx={x} cy={y} r={3} fill={color} opacity={0.9} />;
      })()}
    </svg>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className={styles.empty}>
      <span>🔍</span>
      <p>Buscando postura…</p>
      <small>Asegúrate de que tu cuerpo sea visible</small>
    </div>
  );
}

export default MetricsDashboard;
