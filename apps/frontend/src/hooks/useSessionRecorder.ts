import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraAngle, PoseMetrics, SessionFrame, SessionRecord, SessionStats, TrainingMode } from '@/types';
import { clearSessions as clearStoredSessions, loadSessions, saveSessions } from '@/lib/sessionStore';

const MAX_FRAMES = 240;

type RecorderFrame = SessionFrame & {
  backendScore?: number | null;
};

type StartOptions = {
  mode: TrainingMode;
  cameraAngle: CameraAngle;
};

export function useSessionRecorder() {
  const [recording, setRecording] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [currentDuration, setCurrentDuration] = useState(0);

  const framesRef = useRef<RecorderFrame[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const optionsRef = useRef<StartOptions>({ mode: 'free', cameraAngle: 'front' });

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const updateSessions = useCallback((updater: (previous: SessionRecord[]) => SessionRecord[]) => {
    setSessions((previous) => {
      const nextSessions = updater(previous);
      saveSessions(nextSessions);
      return nextSessions;
    });
  }, []);

  const startRecording = useCallback((options: StartOptions) => {
    framesRef.current = [];
    startTimeRef.current = Date.now();
    optionsRef.current = options;
    setCurrentDuration(0);
    setRecording(true);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setCurrentDuration((duration) => duration + 1);
    }, 1000);
  }, []);

  const pushFrame = useCallback((frame: {
    metrics: PoseMetrics;
    localScore: number;
    backendScore?: number | null;
  }) => {
    if (!recording) return;

    framesRef.current.push({
      timestamp: Date.now(),
      localScore: frame.localScore,
      backendScore: frame.backendScore ?? null,
      breakdown: Object.fromEntries(
        Object.entries(frame.metrics).map(([key, value]) => [key, value.score])
      ),
    });

    if (framesRef.current.length > MAX_FRAMES) {
      framesRef.current = framesRef.current.slice(-MAX_FRAMES);
    }
  }, [recording]);

  const stopRecording = useCallback((backendSummary: SessionRecord['backendSummary'] = null) => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setRecording(false);

    const frames = framesRef.current;
    framesRef.current = [];

    if (frames.length < 3 || startTimeRef.current == null) {
      setCurrentDuration(0);
      return;
    }

    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const localScores = frames.map((frame) => frame.localScore);
    const avgScore = Math.round(localScores.reduce((sum, value) => sum + value, 0) / localScores.length);
    const maxScore = Math.max(...localScores);
    const minScore = Math.min(...localScores);

    const metricAverages: Record<string, number> = {};
    const metricKeys = [...new Set(frames.flatMap((frame) => Object.keys(frame.breakdown)))];
    for (const key of metricKeys) {
      const values = frames.map((frame) => frame.breakdown[key]).filter((value): value is number => typeof value === 'number');
      if (values.length > 0) {
        metricAverages[key] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      }
    }

    const session: SessionRecord = {
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
      mode: optionsRef.current.mode,
      cameraAngle: optionsRef.current.cameraAngle,
      duration,
      avgScore,
      maxScore,
      minScore,
      frameCount: frames.length,
      metricAverages,
      timeline: downsample(localScores, 60),
      backendSummary,
    };

    updateSessions((previous) => [session, ...previous]);
    setCurrentDuration(0);
    startTimeRef.current = null;
  }, [updateSessions]);

  const deleteSession = useCallback((id: string) => {
    updateSessions((previous) => previous.filter((session) => session.id !== id));
  }, [updateSessions]);

  const exportSession = useCallback((id: string) => {
    const session = sessions.find((item) => item.id === id);
    if (!session || typeof window === 'undefined') return;

    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bandaro-${session.mode}-${session.date.slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [sessions]);

  const clearAll = useCallback(() => {
    clearStoredSessions();
    setSessions([]);
  }, []);

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

export function computeStats(sessions: SessionRecord[]): SessionStats | null {
  if (sessions.length === 0) return null;

  const scores = sessions.map((session) => session.avgScore);
  const total = sessions.length;
  const avgScore = Math.round(scores.reduce((sum, value) => sum + value, 0) / total);
  const best = Math.max(...scores);
  const totalTime = sessions.reduce((sum, session) => sum + session.duration, 0);

  const byMode: Record<string, number> = {};
  sessions.forEach((session) => {
    byMode[session.mode] = (byMode[session.mode] || 0) + 1;
  });

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklySessions = sessions.filter((session) => new Date(session.date).getTime() > cutoff);
  const weeklyAvg = weeklySessions.length > 0
    ? Math.round(weeklySessions.reduce((sum, session) => sum + session.avgScore, 0) / weeklySessions.length)
    : null;

  const metricOverall: Record<string, number> = {};
  const metricKeys = [...new Set(sessions.flatMap((session) => Object.keys(session.metricAverages)))];
  metricKeys.forEach((key) => {
    const values = sessions.map((session) => session.metricAverages[key]).filter((value): value is number => typeof value === 'number');
    if (values.length > 0) {
      metricOverall[key] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    }
  });

  const weakest = Object.entries(metricOverall).sort((left, right) => left[1] - right[1])[0]?.[0] ?? null;

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

function downsample(values: number[], maxPoints: number) {
  if (values.length <= maxPoints) return values;

  const step = values.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, index) => values[Math.floor(index * step)]);
}