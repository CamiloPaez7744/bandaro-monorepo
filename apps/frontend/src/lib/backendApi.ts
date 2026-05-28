import type { BackendHealth, CameraAngle, PostureAnalysis, PoseKeypoint, TrainingMode } from '@/types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4010').replace(/\/$/, '');

export async function fetchBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal });
  if (!response.ok) {
    throw new Error(`Backend health check failed (${response.status})`);
  }
  return response.json() as Promise<BackendHealth>;
}

export async function analyzePoseOnBackend(payload: {
  keypoints: PoseKeypoint[];
  cameraAngle: CameraAngle;
  analysisMode: TrainingMode;
  signal?: AbortSignal;
}): Promise<PostureAnalysis> {
  const response = await fetch(`${API_BASE_URL}/api/posture/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: payload.signal,
    body: JSON.stringify({
      keypoints: payload.keypoints,
      cameraAngle: payload.cameraAngle,
      analysisMode: payload.analysisMode,
    }),
  });

  if (!response.ok) {
    const fallbackMessage = `Backend analysis failed (${response.status})`;
    try {
      const body = await response.json() as { message?: string };
      throw new Error(body.message || fallbackMessage);
    } catch {
      throw new Error(fallbackMessage);
    }
  }

  return response.json() as Promise<PostureAnalysis>;
}