import type { AnalysisMode, CameraAngle, PoseKeypoint, PostureAnalysis } from '../../../packages/core/src/index.ts';

export type AnalyzePoseRequest = {
  keypoints: PoseKeypoint[];
  cameraAngle?: CameraAngle;
  analysisMode?: 'free' | 'bridge' | 'align' | 'elbow' | 'wrist';
};

export type AnalyzePoseResponse = PostureAnalysis & {
  cameraAngle: CameraAngle;
  analysisMode: AnalyzePoseRequest['analysisMode'];
  keypointsCount: number;
  analyzedAt: string;
};

export function resolveBackendMode(cameraAngle: CameraAngle): AnalysisMode {
  return cameraAngle === 'lateral' ? 'side' : 'rear';
}

export function isCameraAngle(value: unknown): value is CameraAngle {
  return value === 'front' || value === 'back' || value === 'lateral';
}

export function isTrainingMode(value: unknown): value is AnalyzePoseRequest['analysisMode'] {
  return value === 'free' || value === 'bridge' || value === 'align' || value === 'elbow' || value === 'wrist';
}

export function normalizeCameraAngle(value: unknown): CameraAngle {
  return isCameraAngle(value) ? value : 'front';
}

export function normalizeTrainingMode(value: unknown): AnalyzePoseRequest['analysisMode'] {
  return isTrainingMode(value) ? value : 'free';
}