import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { computeMetrics, computeOverallScore, normalizeKeypoints } from '@bandaro/core';
import type { CameraAngle, PoseMetrics, PoseSample, TrainingMode } from '@/types';

type DetectorState = 'idle' | 'loading' | 'ready' | 'error';

type UsePoseDetectionOptions = {
  cameraAngle: CameraAngle;
  analysisMode: TrainingMode;
  enabled: boolean;
};

export function usePoseDetection({ cameraAngle, analysisMode, enabled }: UsePoseDetectionOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sampleThrottleRef = useRef(0);
  const fpsRef = useRef({ frames: 0, startedAt: performance.now() });

  const [status, setStatus] = useState<DetectorState>('idle');
  const [poseDetected, setPoseDetected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(0);
  const [metrics, setMetrics] = useState<PoseMetrics | null>(null);
  const [sample, setSample] = useState<PoseSample | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
    }

    setPoseDetected(false);
    setMetrics(null);
    setSample(null);
  }, []);

  const loadModel = useCallback(async () => {
    if (detectorRef.current) return;

    setStatus('loading');
    setProgress(10);

    try {
      await tf.setBackend('webgl');
      await tf.ready();
      setProgress(40);

      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        }
      );

      setProgress(100);
      setStatus('ready');
    } catch (error) {
      console.error('[bandaro] Failed to load pose detector', error);
      setStatus('error');
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!enabled || !detectorRef.current) return;

    stopCamera();

    const facingMode = cameraAngle === 'front' ? 'user' : 'environment';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
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

      const runLoop = async () => {
        animationFrameRef.current = window.requestAnimationFrame(runLoop);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const detector = detectorRef.current;
        if (!video || !canvas || !detector) return;
        if (video.readyState < 2) return;

        const width = video.videoWidth || video.clientWidth || 1280;
        const height = video.videoHeight || video.clientHeight || 720;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        fpsRef.current.frames += 1;
        const now = performance.now();
        if (now - fpsRef.current.startedAt >= 1000) {
          setFps(fpsRef.current.frames);
          fpsRef.current = { frames: 0, startedAt: now };
        }

        try {
          const poses = await detector.estimatePoses(video, {
            flipHorizontal: cameraAngle === 'front',
          });

          const context = canvas.getContext('2d');
          if (!context) return;
          context.clearRect(0, 0, canvas.width, canvas.height);

          const pose = poses[0];
          if (pose && (pose.score ?? 0) > 0.2) {
            const normalizedKeypoints = normalizeKeypoints(pose.keypoints);
            const nextMetrics = computeMetrics(normalizedKeypoints, analysisMode, cameraAngle);

            setPoseDetected(true);
            setMetrics(nextMetrics);
            drawSkeleton(context, pose.keypoints, canvas.width, canvas.height, cameraAngle);

            if (now - sampleThrottleRef.current > 350) {
              sampleThrottleRef.current = now;
              setSample({
                keypoints: normalizedKeypoints,
                cameraAngle,
                analysisMode,
                metrics: nextMetrics,
                score: computeOverallScore(nextMetrics),
                timestamp: Date.now(),
              });
            }
          } else {
            setPoseDetected(false);
            setMetrics(null);
            setSample(null);
          }
        } catch (error) {
          console.debug('[bandaro] Pose estimation frame skipped', error);
        }
      };

      runLoop();
    } catch (error) {
      console.error('[bandaro] Camera access failed', error);
      setStatus('error');
      stopCamera();
    }
  }, [analysisMode, cameraAngle, enabled, stopCamera]);

  useEffect(() => {
    void loadModel();
  }, [loadModel]);

  useEffect(() => {
    if (status !== 'ready') return;

    if (enabled) {
      void startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [enabled, status, startCamera, stopCamera]);

  useEffect(() => {
    if (!enabled || status !== 'ready') {
      stopCamera();
      return;
    }

    void startCamera();

    return () => stopCamera();
  }, [analysisMode, cameraAngle, enabled, status, startCamera, stopCamera]);

  return {
    videoRef,
    canvasRef,
    status,
    poseDetected,
    progress,
    fps,
    metrics,
    sample,
    stopCamera,
  };
}

function drawSkeleton(
  context: CanvasRenderingContext2D,
  keypoints: poseDetection.Keypoint[],
  width: number,
  height: number,
  cameraAngle: CameraAngle
) {
  const scaleX = width / 640;
  const scaleY = height / 480;

  const map = (index: number) => {
    const point = keypoints[index];
    if (!point || (point.score ?? 0) < 0.25) return null;
    return { x: point.x * scaleX, y: point.y * scaleY, score: point.score ?? 0 };
  };

  const skeletonConnections: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  ];

  context.strokeStyle = 'rgba(97, 214, 154, 0.45)';
  context.lineWidth = 2;

  skeletonConnections.forEach(([start, end]) => {
    const a = map(start);
    const b = map(end);
    if (!a || !b) return;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  });

  keypoints.forEach((point, index) => {
    if ((point.score ?? 0) < 0.25) return;
    const x = point.x * scaleX;
    const y = point.y * scaleY;
    const isFocus = [5, 6, 7, 8, 9, 10, 11, 12].includes(index);

    context.beginPath();
    context.arc(x, y, isFocus ? 5 : 3.5, 0, Math.PI * 2);
    context.fillStyle = isFocus ? '#a8ffd8' : 'rgba(97, 214, 154, 0.8)';
    context.fill();
  });

  if (cameraAngle === 'lateral') {
    context.save();
    context.setLineDash([6, 6]);
    context.strokeStyle = 'rgba(134, 182, 255, 0.5)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(width * 0.5, 0);
    context.lineTo(width * 0.5, height);
    context.stroke();
    context.restore();
  }
}