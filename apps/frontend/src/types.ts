import type { CameraAngle, PoseKeypoint, PoseMetrics, PostureAnalysis, TrainingMode } from '@bandaro/core';

export type { CameraAngle, PoseKeypoint, PoseMetrics, PostureAnalysis, TrainingMode };

export type BackendHealth = {
  ok: boolean;
  service: string;
  port: number;
  timestamp: string;
};

export type PoseSample = {
  keypoints: PoseKeypoint[];
  cameraAngle: CameraAngle;
  analysisMode: TrainingMode;
  metrics: PoseMetrics;
  score: number;
  timestamp: number;
};

export type SessionFrame = {
  timestamp: number;
  localScore: number;
  breakdown: Record<string, number>;
};

export type SessionRecord = {
  id: string;
  date: string;
  mode: TrainingMode;
  cameraAngle: CameraAngle;
  duration: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  frameCount: number;
  metricAverages: Record<string, number>;
  timeline: number[];
  backendSummary?: PostureAnalysis | null;
};

export type SessionStats = {
  total: number;
  avgScore: number;
  best: number;
  totalTime: number;
  byMode: Record<string, number>;
  weeklyAvg: number | null;
  metricOverall: Record<string, number>;
  weakest: string | null;
  trend: number[];
};