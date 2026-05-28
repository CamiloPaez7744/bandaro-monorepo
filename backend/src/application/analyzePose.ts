import { analyzePosture, normalizeKeypoints } from '../../../packages/core/src/index.ts';
import type { AnalyzePoseRequest, AnalyzePoseResponse } from '../domain/posture.js';
import { normalizeCameraAngle, normalizeTrainingMode, resolveBackendMode } from '../domain/posture.js';

export function analyzePose(request: AnalyzePoseRequest): AnalyzePoseResponse {
  const cameraAngle = normalizeCameraAngle(request.cameraAngle);
  const analysisMode = normalizeTrainingMode(request.analysisMode);
  const keypoints = normalizeKeypoints(request.keypoints);
  const backendMode = resolveBackendMode(cameraAngle);

  const analysis = analyzePosture(keypoints, backendMode);

  return {
    ...analysis,
    cameraAngle,
    analysisMode,
    keypointsCount: keypoints.length,
    analyzedAt: new Date().toISOString(),
  };
}