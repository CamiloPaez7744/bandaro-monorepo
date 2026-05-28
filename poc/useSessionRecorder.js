/**
 * useSessionRecorder.js
 * Records pose analysis sessions to localStorage.
 * Provides session history, stats, and export.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { computeOverallScore } from './usePoseDetection';

const STORAGE_KEY = 'billarcoach_sessions';
const MAX_SESSIONS = 50;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   recording: boolean,
 *   sessions: Session[],
 *   currentDuration: number,
 *   startRecording: () => void,
 *   stopRecording: () => void,
 *   pushFrame: (metrics: object) => void,
 *   deleteSession: (id: string) => void,
 *   exportSession: (id: string) => void,
 *   clearAll: () => void,
 * }}
 */
export function useSessionRecorder() {
  const [recording, setRecording]           = useState(false);
  const [sessions, setSessions]             = useState([]);
  const [currentDuration, setCurrentDuration] = useState(0);

  const framesRef    = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef     = useRef(null);
  const modeRef      = useRef('free');
  const angleRef     = useRef('front');

  // ── Load saved sessions ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch (_) {}
  }, []);

  // ── Persist sessions ───────────────────────────────────────────────────────
  const persist = useCallback((updated) => {
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, MAX_SESSIONS)));
    } catch (_) {}
  }, []);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback((mode = 'free', angle = 'front') => {
    framesRef.current    = [];
    startTimeRef.current = Date.now();
    modeRef.current      = mode;
    angleRef.current     = angle;
    setCurrentDuration(0);
    setRecording(true);

    timerRef.current = setInterval(() => {
      setCurrentDuration(d => d + 1);
    }, 1000);
  }, []);

  // ── Push frame ─────────────────────────────────────────────────────────────
  const pushFrame = useCallback((metrics) => {
    if (!recording || !metrics) return;
    framesRef.current.push({
      ts:    Date.now(),
      score: computeOverallScore(metrics),
      // Store only score + per-metric scores (not tips) to keep storage lean
      breakdown: Object.fromEntries(
        Object.entries(metrics).map(([k, v]) => [k, v.score])
      ),
    });
  }, [recording]);

  // ── Stop recording & save ──────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    setRecording(false);

    const frames = framesRef.current;
    if (frames.length < 3) return;   // too short, discard

    const duration   = Math.round((Date.now() - startTimeRef.current) / 1000);
    const scores     = frames.map(f => f.score);
    const avgScore   = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore   = Math.max(...scores);
    const minScore   = Math.min(...scores);

    // Per-metric averages
    const metricKeys  = Object.keys(frames[0]?.breakdown || {});
    const metricAvgs  = {};
    metricKeys.forEach(k => {
      const vals = frames.map(f => f.breakdown[k] ?? 0).filter(v => v > 0);
      if (vals.length) metricAvgs[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });

    const session = {
      id:         `s_${Date.now()}`,
      date:       new Date().toISOString(),
      mode:       modeRef.current,
      angle:      angleRef.current,
      duration,
      avgScore,
      maxScore,
      minScore,
      frameCount: frames.length,
      metricAvgs,
      // Downsample timeline to 60 points max for storage
      timeline:   downsample(frames, 60).map(f => f.score),
    };

    persist(prev => [session, ...prev]);
    framesRef.current = [];
    setCurrentDuration(0);
  }, [persist]);

  // ── Delete session ─────────────────────────────────────────────────────────
  const deleteSession = useCallback((id) => {
    persist(prev => prev.filter(s => s.id !== id));
  }, [persist]);

  // ── Export session as JSON ─────────────────────────────────────────────────
  const exportSession = useCallback((id) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `billarcoach-${session.mode}-${session.date.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  // ── Clear all sessions ─────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  return {
    recording,
    sessions,
    currentDuration,
    startRecording,
    stopRecording,
    pushFrame,
    deleteSession,
    exportSession,
    clearAll,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downsample(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.floor(i * step)]);
}

/**
 * Aggregate stats across all sessions.
 * @param {object[]} sessions
 * @returns {object}
 */
export function computeStats(sessions) {
  if (!sessions.length) return null;

  const scores    = sessions.map(s => s.avgScore);
  const total     = sessions.length;
  const avgScore  = Math.round(scores.reduce((a, b) => a + b, 0) / total);
  const best      = Math.max(...scores);
  const totalTime = sessions.reduce((s, sess) => s + (sess.duration || 0), 0);

  // Mode distribution
  const byMode = {};
  sessions.forEach(s => {
    byMode[s.mode] = (byMode[s.mode] || 0) + 1;
  });

  // Weekly trend (last 7 days avg)
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter(s => new Date(s.date).getTime() > cutoff);
  const weeklyAvg = recent.length
    ? Math.round(recent.reduce((a, s) => a + s.avgScore, 0) / recent.length)
    : null;

  // Weakest metric overall
  const allMetricKeys = [...new Set(sessions.flatMap(s => Object.keys(s.metricAvgs || {})))];
  const metricOverall = {};
  allMetricKeys.forEach(k => {
    const vals = sessions.map(s => s.metricAvgs?.[k]).filter(v => v != null);
    if (vals.length) metricOverall[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  });

  const weakest = Object.entries(metricOverall).sort((a, b) => a[1] - b[1])[0]?.[0];

  return {
    total,
    avgScore,
    best,
    totalTime,
    byMode,
    weeklyAvg,
    metricOverall,
    weakest,
    trend: scores.slice(0, 10).reverse(),
  };
}
