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
