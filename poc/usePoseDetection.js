/**
 * usePoseDetection.js
 * Core TensorFlow.js hook — MoveNet SINGLEPOSE_LIGHTNING
 * Supports front, back, and lateral camera angles.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

// ─── Constants ───────────────────────────────────────────────────────────────

export const KEYPOINT_INDEX = {
  NOSE: 0,
  LEFT_EYE: 1, RIGHT_EYE: 2,
  LEFT_EAR: 3, RIGHT_EAR: 4,
  LEFT_SHOULDER: 5, RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7, RIGHT_ELBOW: 8,
  LEFT_WRIST: 9, RIGHT_WRIST: 10,
  LEFT_HIP: 11, RIGHT_HIP: 12,
  LEFT_KNEE: 13, RIGHT_KNEE: 14,
  LEFT_ANKLE: 15, RIGHT_ANKLE: 16,
};

export const SKELETON_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4],       // head
  [5, 6],                                 // shoulders
  [5, 7], [7, 9],                         // left arm
  [6, 8], [8, 10],                        // right arm
  [5, 11], [6, 12],                       // torso sides
  [11, 12],                               // hips
  [11, 13], [13, 15],                     // left leg
  [12, 14], [14, 16],                     // right leg
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {object} options
 * @param {string}  options.cameraAngle   'front' | 'back' | 'lateral'
 * @param {string}  options.analysisMode  'free'|'bridge'|'align'|'elbow'|'wrist'
 * @param {boolean} options.enabled
 * @param {(metrics: object) => void} options.onMetrics
 * @param {(fps: number) => void}     options.onFps
 */
export function usePoseDetection({
  cameraAngle = 'front',
  analysisMode = 'free',
  enabled = false,
  onMetrics,
  onFps,
} = {}) {
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const detectorRef   = useRef(null);
  const streamRef     = useRef(null);
  const rafRef        = useRef(null);
  const fpsCountRef   = useRef({ frames: 0, last: performance.now() });

  const [modelState, setModelState]     = useState('idle');    // idle|loading|ready|error
  const [poseDetected, setPoseDetected] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // ── Load model ─────────────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    if (detectorRef.current) return;
    setModelState('loading');
    setLoadProgress(10);

    try {
      await tf.setBackend('webgl');
      await tf.ready();
      setLoadProgress(45);

      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.20,
        }
      );

      setLoadProgress(100);
      setModelState('ready');
    } catch (err) {
      console.error('[BillarCoach] Model load failed:', err);
      setModelState('error');
    }
  }, []);

  // ── Start camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!enabled || !detectorRef.current) return;

    const facingMode =
      cameraAngle === 'front'   ? 'user'        :
      cameraAngle === 'back'    ? 'environment' :
      'environment'; // lateral also uses back camera (mounted on side)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width:  { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      startLoop();
    } catch (err) {
      console.error('[BillarCoach] Camera error:', err);
      setModelState('error');
    }
  }, [enabled, cameraAngle]);

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setPoseDetected(false);
    onMetrics?.(null);
  }, [onMetrics]);

  // ── Detection loop ─────────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !detectorRef.current) return;

    const flipH = cameraAngle === 'front';

    const loop = async () => {
      rafRef.current = requestAnimationFrame(loop);

      // FPS calculation
      const now = performance.now();
      fpsCountRef.current.frames++;
      if (now - fpsCountRef.current.last >= 1000) {
        onFps?.(fpsCountRef.current.frames);
        fpsCountRef.current = { frames: 0, last: now };
      }

      if (video.readyState < 2) return;

      // Sync canvas size
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width  = video.videoWidth  || video.offsetWidth;
        canvas.height = video.videoHeight || video.offsetHeight;
      }

      try {
        const poses = await detectorRef.current.estimatePoses(video, {
          flipHorizontal: flipH,
        });

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (poses?.length > 0 && poses[0].score > 0.2) {
          setPoseDetected(true);
          drawSkeleton(ctx, poses[0].keypoints, canvas.width, canvas.height, analysisMode, cameraAngle);
          const metrics = computeMetrics(poses[0].keypoints, analysisMode, cameraAngle);
          onMetrics?.(metrics);
        } else {
          setPoseDetected(false);
          onMetrics?.(null);
        }
      } catch (_) {
        // skip noisy frames silently
      }
    };

    loop();
  }, [cameraAngle, analysisMode, onMetrics, onFps]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => { loadModel(); }, [loadModel]);

  useEffect(() => {
    if (modelState === 'ready') {
      if (enabled) startCamera();
      else          stopCamera();
    }
    return stopCamera;
  }, [enabled, modelState, startCamera, stopCamera]);

  // Restart when angle changes
  useEffect(() => {
    if (enabled && modelState === 'ready') {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  }, [cameraAngle]);

  return { videoRef, canvasRef, modelState, poseDetected, loadProgress };
}

// ─── Skeleton Renderer ────────────────────────────────────────────────────────

const COLORS = {
  skeleton:  'rgba(0,229,160,0.55)',
  keypointDefault: 'rgba(0,229,160,0.75)',
  keypointFocus:   '#00e5a0',
  focusRing: 'rgba(0,229,160,0.25)',
  warn:      '#ffb830',
  bad:       '#ff4d4d',
  angleBg:   'rgba(0,0,0,0.70)',
  angleText: '#ffb830',
  guide:     'rgba(0,184,255,0.55)',
};

const UPPER_BODY = [5, 6, 7, 8, 9, 10, 11, 12];

function drawSkeleton(ctx, keypoints, W, H, mode, angle) {
  const sx = W / 640, sy = H / 480;

  const kp = (i) => {
    const p = keypoints[i];
    if (!p || p.score < 0.28) return null;
    return { x: p.x * sx, y: p.y * sy, score: p.score };
  };

  // ── Connections ──
  ctx.lineWidth = 2;
  SKELETON_CONNECTIONS.forEach(([a, b]) => {
    const pa = kp(a), pb = kp(b);
    if (!pa || !pb) return;
    ctx.beginPath();
    ctx.strokeStyle = COLORS.skeleton;
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  });

  // ── Keypoints ──
  keypoints.forEach((p, i) => {
    if (p.score < 0.28) return;
    const x = p.x * sx, y = p.y * sy;
    const focus = UPPER_BODY.includes(i);

    ctx.beginPath();
    ctx.arc(x, y, focus ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = focus ? COLORS.keypointFocus : COLORS.keypointDefault;
    ctx.fill();

    if (focus) {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.focusRing;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // ── Mode overlays ──
  if (mode === 'align' || mode === 'free') drawSpineAxis(ctx, keypoints, sx, sy);
  if (mode === 'elbow' || mode === 'free') drawElbowAngles(ctx, keypoints, sx, sy);
  if (mode === 'bridge' || mode === 'wrist') drawWristOverlay(ctx, keypoints, sx, sy);
  if (mode === 'align') drawShoulderLevel(ctx, keypoints, sx, sy);
  if (angle === 'lateral') drawLateralGuides(ctx, keypoints, sx, sy);
}

function drawSpineAxis(ctx, kps, sx, sy) {
  const ls = kps[5], rs = kps[6], lh = kps[11], rh = kps[12];
  if (!ls || !rs || !lh || !rh) return;
  if (ls.score < 0.3 || rs.score < 0.3 || lh.score < 0.3 || rh.score < 0.3) return;

  const topX = ((ls.x + rs.x) / 2) * sx;
  const topY = ((ls.y + rs.y) / 2) * sy;
  const botX = ((lh.x + rh.x) / 2) * sx;
  const botY = ((lh.y + rh.y) / 2) * sy;

  ctx.beginPath();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = COLORS.guide;
  ctx.lineWidth = 1.5;
  ctx.moveTo(topX, topY);
  ctx.lineTo(botX, botY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawElbowAngles(ctx, kps, sx, sy) {
  [[5, 7, 9], [6, 8, 10]].forEach(([si, ei, wi]) => {
    const s = kps[si], e = kps[ei], w = kps[wi];
    if (!s || !e || !w || s.score < 0.3 || e.score < 0.3 || w.score < 0.3) return;
    const angle = calcAnglePts(s, e, w);
    const ex = e.x * sx, ey = e.y * sy;
    const good = angle > 75 && angle < 115;

    ctx.beginPath();
    ctx.arc(ex, ey, 22, 0, Math.PI * 2);
    ctx.strokeStyle = good ? COLORS.keypointFocus : COLORS.warn;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawAngleBadge(ctx, ex + 12, ey - 16, angle + '°');
  });
}

function drawWristOverlay(ctx, kps, sx, sy) {
  [9, 10].forEach(wi => {
    const w = kps[wi];
    const e = kps[wi === 9 ? 7 : 8];
    if (!w || w.score < 0.3) return;

    const wx = w.x * sx, wy = w.y * sy;

    ctx.beginPath();
    ctx.arc(wx, wy, 18, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.warn;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (e && e.score > 0.3) {
      const wristAng = Math.round(calcAnglePts(
        { x: wx / sx, y: wy / sy - 20 },
        { x: wx / sx, y: wy / sy },
        { x: e.x, y: e.y }
      ));
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,184,48,0.5)';
      ctx.lineWidth = 1;
      ctx.moveTo(wx, wy);
      ctx.lineTo(e.x * sx, e.y * sy);
      ctx.stroke();
      ctx.setLineDash([]);
      drawAngleBadge(ctx, wx - 36, wy - 22, wristAng + '°');
    }
  });
}

function drawShoulderLevel(ctx, kps, sx, sy) {
  const ls = kps[5], rs = kps[6];
  if (!ls || !rs || ls.score < 0.3 || rs.score < 0.3) return;

  const lx = ls.x * sx, ly = ls.y * sy;
  const rx = rs.x * sx, ry = rs.y * sy;
  const tilt = Math.abs(Math.atan2(Math.abs(ly - ry), Math.abs(lx - rx)) * 180 / Math.PI);

  ctx.beginPath();
  ctx.strokeStyle = tilt < 6 ? COLORS.keypointFocus : COLORS.warn;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.moveTo(lx, ly);
  ctx.lineTo(rx, ry);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLateralGuides(ctx, kps, sx, sy) {
  // Vertical plumb line from ear through shoulder
  const ear = kps[4] || kps[3];
  const shoulder = kps[6] || kps[5];
  const hip = kps[12] || kps[11];
  if (!ear || !shoulder || !hip) return;
  if (ear.score < 0.25 || shoulder.score < 0.25 || hip.score < 0.25) return;

  const ex = ear.x * sx, ey = ear.y * sy;
  const shx = shoulder.x * sx, shy = shoulder.y * sy;
  const hx = hip.x * sx, hy = hip.y * sy;

  // Ideal vertical line
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0,229,160,0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 5]);
  ctx.moveTo(shx, 0);
  ctx.lineTo(shx, ctx.canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Actual spine lean
  ctx.beginPath();
  ctx.strokeStyle = COLORS.guide;
  ctx.lineWidth = 2;
  ctx.moveTo(ex, ey);
  ctx.lineTo(shx, shy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
}

function drawAngleBadge(ctx, x, y, text) {
  ctx.font = 'bold 11px "Space Mono", monospace';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = COLORS.angleBg;
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 13, tw + 10, 17, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.angleText;
  ctx.fillText(text, x + 3, y);
}

// ─── Biomechanics Engine ──────────────────────────────────────────────────────

function calcAnglePts(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const mag = Math.sqrt(ba.x ** 2 + ba.y ** 2) * Math.sqrt(bc.x ** 2 + bc.y ** 2);
  if (mag === 0) return 90;
  return Math.round(Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180 / Math.PI);
}

/**
 * Returns normalized metrics object for the given mode and camera angle.
 * Each metric: { score: 0-100, value: string, status: 'good'|'warn'|'bad', label, tip, icon }
 */
export function computeMetrics(keypoints, mode, cameraAngle = 'front') {
  const get = (i) => {
    const p = keypoints[i];
    return p && p.score > 0.25 ? p : null;
  };

  const ls  = get(5),  rs  = get(6);
  const le  = get(7),  re  = get(8);
  const lw  = get(9),  rw  = get(10);
  const lh  = get(11), rh  = get(12);
  const lk  = get(13), rk  = get(14);
  const la  = get(15), ra  = get(16);
  const nose = get(0);

  const metrics = {};

  // ── 1. Shoulder alignment ──────────────────────────────────────────────────
  if (ls && rs) {
    const tilt = Math.abs(Math.atan2(Math.abs(ls.y - rs.y), Math.abs(rs.x - ls.x)) * 180 / Math.PI);
    metrics.shoulders = {
      score:  tilt < 5 ? 95 : tilt < 10 ? 80 : tilt < 18 ? 55 : 28,
      value:  Math.round(tilt) + '°',
      status: tilt < 5 ? 'good' : tilt < 10 ? 'warn' : 'bad',
      label:  'Alineación hombros',
      icon:   '⬆',
      tip:    tilt < 5  ? 'Hombros perfectamente nivelados ✓' :
              tilt < 10 ? `Inclinación leve (${Math.round(tilt)}°) — endereza` :
                          `Hombros muy inclinados (${Math.round(tilt)}°) — corrige la postura`,
    };
  }

  // ── 2. Elbow angle — dominant arm (cue arm) ────────────────────────────────
  // Prefer right arm; fallback left
  const eSide = re ? [rs, re, rw] : (le ? [ls, le, lw] : null);
  if (eSide && eSide[0] && eSide[1] && eSide[2]) {
    const [sh, el, wr] = eSide;
    const ang = calcAnglePts(sh, el, wr);
    metrics.elbow = {
      score:  ang > 75 && ang < 115 ? 92 : ang > 60 && ang < 130 ? 65 : 32,
      value:  ang + '°',
      status: ang > 75 && ang < 115 ? 'good' : ang > 60 && ang < 130 ? 'warn' : 'bad',
      label:  'Ángulo codo (brazo taco)',
      icon:   '💪',
      tip:    ang > 75 && ang < 115 ? `Ángulo ideal ${ang}° ✓` :
              ang > 130             ? `Brazo muy extendido (${ang}°) — flexiona más` :
                                      `Brazo muy cerrado (${ang}°) — extiende un poco`,
    };
  }

  // ── 3. Spine / back position ───────────────────────────────────────────────
  if (ls && rs && lh && rh) {
    const topX = (ls.x + rs.x) / 2, topY = (ls.y + rs.y) / 2;
    const botX = (lh.x + rh.x) / 2, botY = (lh.y + rh.y) / 2;
    const spineAng = Math.abs(Math.atan2(botX - topX, botY - topY) * 180 / Math.PI);
    metrics.spine = {
      score:  spineAng < 12 ? 92 : spineAng < 25 ? 68 : spineAng < 40 ? 42 : 18,
      value:  Math.round(spineAng) + '°',
      status: spineAng < 12 ? 'good' : spineAng < 25 ? 'warn' : 'bad',
      label:  'Posición espalda',
      icon:   '🏊',
      tip:    spineAng < 12 ? 'Espalda bien posicionada ✓' :
              spineAng < 25 ? `Leve desviación (${Math.round(spineAng)}°) — baja un poco más` :
                              `Espalda muy levantada (${Math.round(spineAng)}°) — inclínate hacia la mesa`,
    };
  }

  // ── 4. Head/neck over cue ──────────────────────────────────────────────────
  if (nose && ls && rs) {
    const centerX = (ls.x + rs.x) / 2;
    const dev = Math.abs(nose.x - centerX);
    const width = Math.abs(rs.x - ls.x) || 1;
    const pct = (dev / width) * 100;
    metrics.head = {
      score:  pct < 12 ? 93 : pct < 28 ? 70 : pct < 45 ? 40 : 15,
      value:  Math.round(pct) + '%',
      status: pct < 12 ? 'good' : pct < 28 ? 'warn' : 'bad',
      label:  'Cabeza sobre el taco',
      icon:   '🎯',
      tip:    pct < 12 ? 'Cabeza centrada sobre el taco ✓' :
              pct < 28 ? 'Cabeza ligeramente lateral — centra la vista' :
                         'Cabeza alejada del taco — acércala para mejor alineación',
    };
  }

  // ── 5. Wrist stability ─────────────────────────────────────────────────────
  const wristPt  = rw || lw;
  const elbowPt  = rw ? re : le;
  const shouldPt = rw ? rs : ls;
  if (wristPt && elbowPt) {
    const vx = wristPt.x - elbowPt.x;
    const vy = wristPt.y - elbowPt.y;
    const wristAng = Math.abs(Math.atan2(vx, vy) * 180 / Math.PI);
    const dev = Math.abs(wristAng - 90);
    metrics.wrist = {
      score:  dev < 8 ? 92 : dev < 18 ? 68 : dev < 30 ? 42 : 18,
      value:  Math.round(dev) + '° desv.',
      status: dev < 8 ? 'good' : dev < 18 ? 'warn' : 'bad',
      label:  'Estabilidad muñeca',
      icon:   '🤲',
      tip:    dev < 8  ? 'Muñeca neutral y estable ✓' :
              dev < 18 ? `Leve desviación de muñeca (${Math.round(dev)}°)` :
                         `Muñeca inestable (${Math.round(dev)}°) — mantén la neutral`,
    };
  }

  // ── 6. Body balance / hip symmetry ────────────────────────────────────────
  if (lh && rh) {
    const tilt = Math.abs(Math.atan2(Math.abs(lh.y - rh.y), Math.abs(rh.x - lh.x)) * 180 / Math.PI);
    metrics.balance = {
      score:  tilt < 4 ? 95 : tilt < 9 ? 75 : tilt < 16 ? 48 : 22,
      value:  Math.round(tilt) + '°',
      status: tilt < 4 ? 'good' : tilt < 9 ? 'warn' : 'bad',
      label:  'Balance corporal',
      icon:   '⚖',
      tip:    tilt < 4 ? 'Balance excelente ✓' :
              tilt < 9 ? 'Balance aceptable — distribuye mejor el peso' :
                         'Peso mal distribuido — flexiona rodillas levemente',
    };
  }

  // ── 7. Bridge (mode-specific) ──────────────────────────────────────────────
  if (mode === 'bridge') {
    const bridgeWrist = lw || rw;
    const bridgeElbow = lw ? le : re;
    if (bridgeWrist && bridgeElbow) {
      const vx = bridgeWrist.x - bridgeElbow.x;
      const vy = bridgeWrist.y - bridgeElbow.y;
      const flatness = Math.abs(Math.atan2(vy, vx) * 180 / Math.PI);
      const dev = Math.abs(flatness - 180);
      metrics.bridge = {
        score:  dev < 15 ? 90 : dev < 30 ? 65 : 35,
        value:  dev < 15 ? 'Firme' : dev < 30 ? 'Leve mov.' : 'Inestable',
        status: dev < 15 ? 'good' : dev < 30 ? 'warn' : 'bad',
        label:  'Puente de mano',
        icon:   '🖐',
        tip:    dev < 15 ? 'Puente firme y controlado ✓' :
                dev < 30 ? 'Estabiliza los dedos de soporte' :
                           'Puente inestable — apoya bien el anular y meñique',
      };
    }
  }

  // ── 8. Lateral-angle extras ────────────────────────────────────────────────
  if (cameraAngle === 'lateral') {
    // Forward lean (how much the player bends over the table)
    if (ls && lh) {
      const lean = Math.abs(Math.atan2(ls.x - lh.x, lh.y - ls.y) * 180 / Math.PI);
      metrics.lean = {
        score:  lean > 20 && lean < 50 ? 90 : lean > 10 && lean < 60 ? 68 : 40,
        value:  Math.round(lean) + '°',
        status: lean > 20 && lean < 50 ? 'good' : lean > 10 && lean < 60 ? 'warn' : 'bad',
        label:  'Inclinación sobre mesa',
        icon:   '📐',
        tip:    lean > 20 && lean < 50 ? `Inclinación correcta (${Math.round(lean)}°) ✓` :
                lean < 20              ? 'Inclínate más sobre la mesa' :
                                         'Demasiada inclinación — riesgo de perder balance',
      };
    }

    // Elbow pendulum (vertical swing purity in lateral view)
    const eSide2 = re ? [rs, re, rw] : (le ? [ls, le, lw] : null);
    if (eSide2 && eSide2[0] && eSide2[1] && eSide2[2]) {
      const [sh, el, wr] = eSide2;
      const swingAngle = Math.abs(Math.atan2(el.x - sh.x, el.y - sh.y) * 180 / Math.PI);
      metrics.pendulum = {
        score:  swingAngle < 10 ? 95 : swingAngle < 20 ? 72 : 38,
        value:  Math.round(swingAngle) + '° lateral',
        status: swingAngle < 10 ? 'good' : swingAngle < 20 ? 'warn' : 'bad',
        label:  'Péndulo del codo',
        icon:   '🔄',
        tip:    swingAngle < 10 ? 'Movimiento de codo vertical puro ✓' :
                swingAngle < 20 ? 'Leve desviación lateral del codo' :
                                   'Codo se desvía lateralmente — mantén el péndulo vertical',
      };
    }
  }

  return metrics;
}

/**
 * Compute overall technical score from metrics object.
 * @param {object} metrics
 * @returns {number} 0-100
 */
export function computeOverallScore(metrics) {
  if (!metrics) return 0;
  const values = Object.values(metrics);
  if (!values.length) return 0;
  return Math.round(values.reduce((s, m) => s + (m.score || 0), 0) / values.length);
}
