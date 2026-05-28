import { createServer } from 'node:http';
import { analyzePose } from './application/analyzePose.js';
import { readJsonBody, sendJson } from './infrastructure/http.js';
import { normalizeCameraAngle, normalizeTrainingMode } from './domain/posture.js';
import type { AnalyzePoseRequest } from './domain/posture.js';

const port = Number(process.env.PORT || 4010);

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'missing_url' });
    return;
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'bandaro-backend',
      port,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/version') {
    sendJson(response, 200, {
      name: '@bandaro/backend',
      version: '1.0.0',
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/posture/analyze') {
    try {
      const body = await readJsonBody(request);
      const payload = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
      const keypoints = Array.isArray(payload.keypoints) ? payload.keypoints : [];

      if (keypoints.length === 0) {
        sendJson(response, 400, {
          error: 'keypoints_required',
          message: 'Send pose keypoints to analyze posture.',
        });
        return;
      }

      const analysis = analyzePose({
        keypoints: keypoints as AnalyzePoseRequest['keypoints'],
        cameraAngle: normalizeCameraAngle(payload.cameraAngle),
        analysisMode: normalizeTrainingMode(payload.analysisMode),
      });

      sendJson(response, 200, analysis);
    } catch (error) {
      sendJson(response, 400, {
        error: 'invalid_payload',
        message: error instanceof Error ? error.message : 'Invalid request body.',
      });
    }
    return;
  }

  sendJson(response, 404, { error: 'not_found' });
});

server.listen(port, () => {
  console.log(`[bandaro-backend] posture API running on http://localhost:${port}`);
});