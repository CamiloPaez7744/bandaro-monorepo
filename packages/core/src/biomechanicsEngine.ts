export type Point = {
  x: number;
  y: number;
  score?: number;
};

export type PoseKeypoint = {
  x: number;
  y: number;
  name?: string;
  score?: number;
};

export type AnalysisMode = 'rear' | 'side';

export type CameraAngle = 'front' | 'back' | 'lateral';

export type TrainingMode = 'free' | 'bridge' | 'align' | 'elbow' | 'wrist';

export type PoseMetric = {
  score: number;
  value: string;
  status: 'good' | 'warn' | 'bad';
  label: string;
  icon: string;
  tip: string;
};

export type PoseMetrics = Partial<Record<'shoulders' | 'elbow' | 'spine' | 'head' | 'wrist' | 'balance' | 'bridge' | 'lean' | 'pendulum', PoseMetric>>;

export type PostureAnalysis = {
  score: number;
  status: 'excellent' | 'good' | 'needs-adjustment';
  mode: AnalysisMode;
  metrics: {
    shoulderTilt: number;
    hipTilt: number;
    torsoLean: number;
    elbowAngle: number;
    headOffset: number;
    stanceWidth: number;
  };
  tips: string[];
};

export function calculateDistance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function calculateMidpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function calculateAngle(a: Point, b: Point, c: Point) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  const degrees = Math.abs((radians * 180) / Math.PI);
  return degrees > 180 ? 360 - degrees : degrees;
}

export function measureShoulderTilt(leftShoulder: Point, rightShoulder: Point) {
  const horizontal = calculateDistance(leftShoulder, rightShoulder) || 1;
  return Math.abs(((rightShoulder.y - leftShoulder.y) / horizontal) * 180) / Math.PI;
}

export function measureHipTilt(leftHip: Point, rightHip: Point) {
  const horizontal = calculateDistance(leftHip, rightHip) || 1;
  return Math.abs(((rightHip.y - leftHip.y) / horizontal) * 180) / Math.PI;
}

export function measureTorsoLean(shoulderMid: Point, hipMid: Point) {
  const deltaX = shoulderMid.x - hipMid.x;
  const deltaY = hipMid.y - shoulderMid.y || 1;
  return Math.abs((Math.atan2(deltaX, deltaY) * 180) / Math.PI);
}

export function measureElbowAngle(shoulder: Point, elbow: Point, wrist: Point) {
  return calculateAngle(shoulder, elbow, wrist);
}

function keypointFromName(keypoints: PoseKeypoint[], names: string[]) {
  return names.map((name) => keypoints.find((point) => point.name === name)).find(Boolean) ?? null;
}

function detectDominantSide(keypoints: PoseKeypoint[]) {
  const leftScore = ['leftShoulder', 'leftElbow', 'leftWrist', 'leftHip'].reduce((sum, name) => {
    const point = keypoints.find((item) => item.name === name);
    return sum + (point?.score ?? 0);
  }, 0);

  const rightScore = ['rightShoulder', 'rightElbow', 'rightWrist', 'rightHip'].reduce((sum, name) => {
    const point = keypoints.find((item) => item.name === name);
    return sum + (point?.score ?? 0);
  }, 0);

  return rightScore >= leftScore ? 'right' : 'left';
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzePosture(keypoints: PoseKeypoint[], mode: AnalysisMode): PostureAnalysis {
  const leftShoulder = keypointFromName(keypoints, ['leftShoulder']);
  const rightShoulder = keypointFromName(keypoints, ['rightShoulder']);
  const leftHip = keypointFromName(keypoints, ['leftHip']);
  const rightHip = keypointFromName(keypoints, ['rightHip']);
  const nose = keypointFromName(keypoints, ['nose']);

  const dominantSide = mode === 'side' ? detectDominantSide(keypoints) : 'right';
  const shoulderMid = leftShoulder && rightShoulder ? calculateMidpoint(leftShoulder, rightShoulder) : null;
  const hipMid = leftHip && rightHip ? calculateMidpoint(leftHip, rightHip) : null;

  const shoulderTilt = leftShoulder && rightShoulder ? measureShoulderTilt(leftShoulder, rightShoulder) : 0;
  const hipTilt = leftHip && rightHip ? measureHipTilt(leftHip, rightHip) : 0;
  const torsoLean = shoulderMid && hipMid ? measureTorsoLean(shoulderMid, hipMid) : 0;

  const workingShoulder = dominantSide === 'right' ? keypointFromName(keypoints, ['rightShoulder']) : keypointFromName(keypoints, ['leftShoulder']);
  const workingElbow = dominantSide === 'right' ? keypointFromName(keypoints, ['rightElbow']) : keypointFromName(keypoints, ['leftElbow']);
  const workingWrist = dominantSide === 'right' ? keypointFromName(keypoints, ['rightWrist']) : keypointFromName(keypoints, ['leftWrist']);
  const elbowAngle = workingShoulder && workingElbow && workingWrist ? measureElbowAngle(workingShoulder, workingElbow, workingWrist) : 0;

  const headOffset = nose && shoulderMid ? calculateDistance(nose, shoulderMid) : 0;
  const stanceWidth = leftHip && rightHip ? calculateDistance(leftHip, rightHip) : 0;

  const shoulderPenalty = Math.max(0, shoulderTilt - 6) * 1.3;
  const hipPenalty = Math.max(0, hipTilt - 5) * 1.6;
  const torsoPenalty = Math.max(0, torsoLean - (mode === 'side' ? 10 : 8)) * 1.2;
  const elbowPenalty = mode === 'side' ? Math.max(0, Math.abs(elbowAngle - 120) - 12) * 1.1 : Math.max(0, Math.abs(elbowAngle - 105) - 10) * 1;
  const headPenalty = Math.max(0, headOffset - (shoulderMid ? calculateDistance(shoulderMid, leftShoulder ?? shoulderMid) * 0.9 : 20)) * 0.9;
  const stancePenalty = Math.max(0, 32 - stanceWidth) * 0.4;

  const score = clampScore(100 - shoulderPenalty - hipPenalty - torsoPenalty - elbowPenalty - headPenalty - stancePenalty);

  const tips: string[] = [];
  if (shoulderTilt > 8) tips.push('Level the shoulders before the stroke.');
  if (hipTilt > 7) tips.push('Keep the hips squared to the line of aim.');
  if (torsoLean > (mode === 'side' ? 12 : 10)) tips.push('Stabilize torso lean and stay lower over the cue.');
  if (mode === 'side' && Math.abs(elbowAngle - 120) > 15) tips.push('Smooth the elbow swing in profile.');
  if (mode === 'rear' && Math.abs(elbowAngle - 105) > 18) tips.push('Keep the shooting arm stacked under the shoulder.');
  if (headOffset > 28) tips.push('Reduce head drift and keep the chin centered over the line.');
  if (stanceWidth < 24) tips.push('Widen the stance slightly for more stability.');

  const status: PostureAnalysis['status'] = score >= 85 ? 'excellent' : score >= 70 ? 'good' : 'needs-adjustment';

  return {
    score,
    status,
    mode,
    metrics: {
      shoulderTilt: Number(shoulderTilt.toFixed(1)),
      hipTilt: Number(hipTilt.toFixed(1)),
      torsoLean: Number(torsoLean.toFixed(1)),
      elbowAngle: Number(elbowAngle.toFixed(1)),
      headOffset: Number(headOffset.toFixed(1)),
      stanceWidth: Number(stanceWidth.toFixed(1)),
    },
    tips: tips.length > 0 ? tips : ['Posture is steady. Keep repeating the same setup.'],
  };
}

function getKeypoint(keypoints: PoseKeypoint[], index: number, threshold = 0.25) {
  const point = keypoints[index];
  return point && (point.score ?? 0) >= threshold ? point : null;
}

function metric(score: number, value: string, status: PoseMetric['status'], label: string, icon: string, tip: string): PoseMetric {
  return { score: clampScore(score), value, status, label, icon, tip };
}

export function computeMetrics(keypoints: PoseKeypoint[], mode: TrainingMode, cameraAngle: CameraAngle = 'front'): PoseMetrics {
  const ls = getKeypoint(keypoints, 5);
  const rs = getKeypoint(keypoints, 6);
  const le = getKeypoint(keypoints, 7);
  const re = getKeypoint(keypoints, 8);
  const lw = getKeypoint(keypoints, 9);
  const rw = getKeypoint(keypoints, 10);
  const lh = getKeypoint(keypoints, 11);
  const rh = getKeypoint(keypoints, 12);
  const nose = getKeypoint(keypoints, 0);

  const metrics: PoseMetrics = {};

  if (ls && rs) {
    const tilt = Math.abs(Math.atan2(Math.abs(ls.y - rs.y), Math.abs(rs.x - ls.x)) * 180 / Math.PI);
    metrics.shoulders = metric(
      tilt < 5 ? 95 : tilt < 10 ? 80 : tilt < 18 ? 55 : 28,
      `${Math.round(tilt)}°`,
      tilt < 5 ? 'good' : tilt < 10 ? 'warn' : 'bad',
      'Alineación hombros',
      '⬆',
      tilt < 5 ? 'Hombros perfectamente nivelados.' : tilt < 10 ? 'Corrige una leve inclinación de hombros.' : 'Endereza la línea de hombros.'
    );
  }

  const dominantArm = re ? [rs, re, rw] : (le ? [ls, le, lw] : null);
  if (dominantArm?.[0] && dominantArm?.[1] && dominantArm?.[2]) {
    const angle = calculateAngle(dominantArm[0], dominantArm[1], dominantArm[2]);
    metrics.elbow = metric(
      angle > 75 && angle < 115 ? 92 : angle > 60 && angle < 130 ? 65 : 32,
      `${Math.round(angle)}°`,
      angle > 75 && angle < 115 ? 'good' : angle > 60 && angle < 130 ? 'warn' : 'bad',
      'Ángulo codo (brazo taco)',
      '💪',
      angle > 75 && angle < 115 ? 'Ángulo ideal del brazo de tiro.' : angle > 130 ? 'Flexiona más el brazo de tiro.' : 'Extiende un poco más el brazo de tiro.'
    );
  }

  if (ls && rs && lh && rh) {
    const topX = (ls.x + rs.x) / 2;
    const topY = (ls.y + rs.y) / 2;
    const botX = (lh.x + rh.x) / 2;
    const botY = (lh.y + rh.y) / 2;
    const spineAngle = Math.abs(Math.atan2(botX - topX, botY - topY) * 180 / Math.PI);
    metrics.spine = metric(
      spineAngle < 12 ? 92 : spineAngle < 25 ? 68 : spineAngle < 40 ? 42 : 18,
      `${Math.round(spineAngle)}°`,
      spineAngle < 12 ? 'good' : spineAngle < 25 ? 'warn' : 'bad',
      'Posición espalda',
      '🏊',
      spineAngle < 12 ? 'Espalda bien posicionada.' : spineAngle < 25 ? 'Baja un poco más el torso.' : 'Inclínate más sobre la mesa.'
    );
  }

  if (nose && ls && rs) {
    const centerX = (ls.x + rs.x) / 2;
    const deviation = Math.abs(nose.x - centerX);
    const width = Math.abs(rs.x - ls.x) || 1;
    const percent = (deviation / width) * 100;
    metrics.head = metric(
      percent < 12 ? 93 : percent < 28 ? 70 : percent < 45 ? 40 : 15,
      `${Math.round(percent)}%`,
      percent < 12 ? 'good' : percent < 28 ? 'warn' : 'bad',
      'Cabeza sobre el taco',
      '🎯',
      percent < 12 ? 'Cabeza centrada sobre la línea de tiro.' : percent < 28 ? 'Centra un poco más la cabeza.' : 'La cabeza está demasiado desviada.'
    );
  }

  const wristPoint = rw || lw;
  const elbowPoint = rw ? re : le;
  if (wristPoint && elbowPoint) {
    const vx = wristPoint.x - elbowPoint.x;
    const vy = wristPoint.y - elbowPoint.y;
    const wristAngle = Math.abs(Math.atan2(vx, vy) * 180 / Math.PI);
    const deviation = Math.abs(wristAngle - 90);
    metrics.wrist = metric(
      deviation < 8 ? 92 : deviation < 18 ? 68 : deviation < 30 ? 42 : 18,
      `${Math.round(deviation)}° desv.`,
      deviation < 8 ? 'good' : deviation < 18 ? 'warn' : 'bad',
      'Estabilidad muñeca',
      '🤲',
      deviation < 8 ? 'Muñeca neutral y estable.' : deviation < 18 ? 'Reduce la desviación de muñeca.' : 'Mantén la muñeca más neutral.'
    );
  }

  if (lh && rh) {
    const tilt = Math.abs(Math.atan2(Math.abs(lh.y - rh.y), Math.abs(rh.x - lh.x)) * 180 / Math.PI);
    metrics.balance = metric(
      tilt < 4 ? 95 : tilt < 9 ? 75 : tilt < 16 ? 48 : 22,
      `${Math.round(tilt)}°`,
      tilt < 4 ? 'good' : tilt < 9 ? 'warn' : 'bad',
      'Balance corporal',
      '⚖',
      tilt < 4 ? 'Balance excelente.' : tilt < 9 ? 'Distribuye mejor el peso.' : 'Revisa la base de apoyo.'
    );
  }

  if (mode === 'bridge') {
    const bridgeWrist = lw || rw;
    const bridgeElbow = lw ? le : re;
    if (bridgeWrist && bridgeElbow) {
      const vx = bridgeWrist.x - bridgeElbow.x;
      const vy = bridgeWrist.y - bridgeElbow.y;
      const flatness = Math.abs(Math.atan2(vy, vx) * 180 / Math.PI);
      const deviation = Math.abs(flatness - 180);
      metrics.bridge = metric(
        deviation < 15 ? 90 : deviation < 30 ? 65 : 35,
        deviation < 15 ? 'Firme' : deviation < 30 ? 'Leve mov.' : 'Inestable',
        deviation < 15 ? 'good' : deviation < 30 ? 'warn' : 'bad',
        'Puente de mano',
        '🖐',
        deviation < 15 ? 'Puente firme y controlado.' : deviation < 30 ? 'Estabiliza los dedos de apoyo.' : 'Apoya mejor la mano de puente.'
      );
    }
  }

  if (cameraAngle === 'lateral') {
    if (ls && lh) {
      const lean = Math.abs(Math.atan2(ls.x - lh.x, lh.y - ls.y) * 180 / Math.PI);
      metrics.lean = metric(
        lean > 20 && lean < 50 ? 90 : lean > 10 && lean < 60 ? 68 : 40,
        `${Math.round(lean)}°`,
        lean > 20 && lean < 50 ? 'good' : lean > 10 && lean < 60 ? 'warn' : 'bad',
        'Inclinación sobre mesa',
        '📐',
        lean > 20 && lean < 50 ? 'Inclinación correcta.' : lean < 20 ? 'Inclínate más sobre la mesa.' : 'Hay demasiada inclinación.'
      );
    }

    const lateralArm = re ? [rs, re, rw] : (le ? [ls, le, lw] : null);
    if (lateralArm?.[0] && lateralArm?.[1] && lateralArm?.[2]) {
      const swingAngle = Math.abs(Math.atan2(lateralArm[1].x - lateralArm[0].x, lateralArm[1].y - lateralArm[0].y) * 180 / Math.PI);
      metrics.pendulum = metric(
        swingAngle < 10 ? 95 : swingAngle < 20 ? 72 : 38,
        `${Math.round(swingAngle)}° lateral`,
        swingAngle < 10 ? 'good' : swingAngle < 20 ? 'warn' : 'bad',
        'Péndulo del codo',
        '🔄',
        swingAngle < 10 ? 'Movimiento de codo vertical puro.' : swingAngle < 20 ? 'Leve desviación lateral del codo.' : 'Mantén el péndulo vertical.'
      );
    }
  }

  if (mode === 'wrist' && !metrics.wrist && wristPoint && elbowPoint) {
    const vx = wristPoint.x - elbowPoint.x;
    const vy = wristPoint.y - elbowPoint.y;
    const wristAngle = Math.abs(Math.atan2(vx, vy) * 180 / Math.PI);
    const deviation = Math.abs(wristAngle - 90);
    metrics.wrist = metric(
      deviation < 8 ? 92 : deviation < 18 ? 68 : deviation < 30 ? 42 : 18,
      `${Math.round(deviation)}° desv.`,
      deviation < 8 ? 'good' : deviation < 18 ? 'warn' : 'bad',
      'Estabilidad muñeca',
      '🤲',
      deviation < 8 ? 'Muñeca neutral y estable.' : deviation < 18 ? 'Reduce la desviación de muñeca.' : 'Mantén la muñeca más neutral.'
    );
  }

  if (mode === 'elbow' && !metrics.elbow && dominantArm?.[0] && dominantArm?.[1] && dominantArm?.[2]) {
    const angle = calculateAngle(dominantArm[0], dominantArm[1], dominantArm[2]);
    metrics.elbow = metric(
      angle > 75 && angle < 115 ? 92 : angle > 60 && angle < 130 ? 65 : 32,
      `${Math.round(angle)}°`,
      angle > 75 && angle < 115 ? 'good' : angle > 60 && angle < 130 ? 'warn' : 'bad',
      'Ángulo codo (brazo taco)',
      '💪',
      angle > 75 && angle < 115 ? 'Ángulo ideal del brazo de tiro.' : angle > 130 ? 'Flexiona más el brazo de tiro.' : 'Extiende un poco más el brazo de tiro.'
    );
  }

  if (mode === 'align') {
    if (!metrics.shoulders && ls && rs) {
      const tilt = Math.abs(Math.atan2(Math.abs(ls.y - rs.y), Math.abs(rs.x - ls.x)) * 180 / Math.PI);
      metrics.shoulders = metric(
        tilt < 5 ? 95 : tilt < 10 ? 80 : tilt < 18 ? 55 : 28,
        `${Math.round(tilt)}°`,
        tilt < 5 ? 'good' : tilt < 10 ? 'warn' : 'bad',
        'Alineación hombros',
        '⬆',
        tilt < 5 ? 'Hombros perfectamente nivelados.' : tilt < 10 ? 'Corrige una leve inclinación de hombros.' : 'Endereza la línea de hombros.'
      );
    }
    if (!metrics.spine && ls && rs && lh && rh) {
      const topX = (ls.x + rs.x) / 2;
      const topY = (ls.y + rs.y) / 2;
      const botX = (lh.x + rh.x) / 2;
      const botY = (lh.y + rh.y) / 2;
      const spineAngle = Math.abs(Math.atan2(botX - topX, botY - topY) * 180 / Math.PI);
      metrics.spine = metric(
        spineAngle < 12 ? 92 : spineAngle < 25 ? 68 : spineAngle < 40 ? 42 : 18,
        `${Math.round(spineAngle)}°`,
        spineAngle < 12 ? 'good' : spineAngle < 25 ? 'warn' : 'bad',
        'Posición espalda',
        '🏊',
        spineAngle < 12 ? 'Espalda bien posicionada.' : spineAngle < 25 ? 'Baja un poco más el torso.' : 'Inclínate más sobre la mesa.'
      );
    }
  }

  if (mode === 'free') {
    if (!metrics.shoulders && ls && rs) {
      const tilt = Math.abs(Math.atan2(Math.abs(ls.y - rs.y), Math.abs(rs.x - ls.x)) * 180 / Math.PI);
      metrics.shoulders = metric(
        tilt < 5 ? 95 : tilt < 10 ? 80 : tilt < 18 ? 55 : 28,
        `${Math.round(tilt)}°`,
        tilt < 5 ? 'good' : tilt < 10 ? 'warn' : 'bad',
        'Alineación hombros',
        '⬆',
        tilt < 5 ? 'Hombros perfectamente nivelados.' : tilt < 10 ? 'Corrige una leve inclinación de hombros.' : 'Endereza la línea de hombros.'
      );
    }
    if (!metrics.balance && lh && rh) {
      const tilt = Math.abs(Math.atan2(Math.abs(lh.y - rh.y), Math.abs(rh.x - lh.x)) * 180 / Math.PI);
      metrics.balance = metric(
        tilt < 4 ? 95 : tilt < 9 ? 75 : tilt < 16 ? 48 : 22,
        `${Math.round(tilt)}°`,
        tilt < 4 ? 'good' : tilt < 9 ? 'warn' : 'bad',
        'Balance corporal',
        '⚖',
        tilt < 4 ? 'Balance excelente.' : tilt < 9 ? 'Distribuye mejor el peso.' : 'Revisa la base de apoyo.'
      );
    }
  }

  return metrics;
}

export function computeOverallScore(metrics?: PoseMetrics | null) {
  if (!metrics) return 0;
  const values = Object.values(metrics);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, metricValue) => sum + (metricValue?.score ?? 0), 0) / values.length);
}

export function normalizeKeypoints(keypoints: PoseKeypoint[] = []) {
  return keypoints
    .filter(Boolean)
    .map((point) => ({
      name: point.name,
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
      score: typeof point.score === 'number' ? point.score : Number(point.score) || 0,
    }));
}
