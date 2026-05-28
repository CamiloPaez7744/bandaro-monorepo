import { CameraView, useCameraPermissions } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { analyzePosture, type PostureAnalysis } from './BiomechanicsEngine';

import { MetricsDashboard } from './MetricsDashboard';
import { OverlayCanvas } from './OverlayCanvas';

type AnalysisMode = 'rear' | 'side';

type Keypoint = {
  name?: string;
  x: number;
  y: number;
  score?: number;
};

type DetectorState = {
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  mode: AnalysisMode;
  cameraFacing: 'back' | 'front';
  analysis: PostureAnalysis | null;
  keypoints: Keypoint[];
  sourceSize: { width: number; height: number };
  backendOnline: boolean | null;
  start: () => Promise<void>;
  stop: () => void;
  cameraRef: RefObject<any>;
  permissionGranted: boolean;
};

const API_URL = process.env.EXPO_PUBLIC_POSTURE_API_URL ?? 'http://localhost:4010';
const MOVENET_NAMES = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const;

function normalizeName(name?: string) {
  if (!name) return undefined;
  return name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function normalizeKeypoints(keypoints: Array<{ name?: string; x: number; y: number; score?: number }>) {
  return keypoints.map((point, index) => ({
    name: normalizeName(point.name) ?? MOVENET_NAMES[index],
    x: point.x,
    y: point.y,
    score: point.score ?? 0,
  }));
}

function toImageElement(photo: { uri: string; base64?: string | null }) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
  });
}

function usePoseDetection(cameraRef: RefObject<any>, mode: AnalysisMode): DetectorState {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const cameraFacing = mode === 'rear' ? 'back' : 'front';

  const clearLoop = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const syncBackend = async (payload: Keypoint[]) => {
    try {
      const response = await fetch(`${API_URL}/api/posture/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, keypoints: payload }),
      });

      if (!response.ok) {
        setBackendOnline(false);
        return;
      }

      const json = await response.json();
      setBackendOnline(true);
      if (json?.score) {
        setAnalysis(json as PostureAnalysis);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  const ensureDetector = async () => {
    if (detectorRef.current) {
      return detectorRef.current;
    }

    setIsLoading(true);
    setError(null);

    try {
      await tf.ready();
      try {
        await tf.setBackend('webgl');
      } catch {
        await tf.setBackend('cpu');
      }

      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      });

      detectorRef.current = detector;
      return detector;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load pose detector.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const step = async () => {
    if (!activeRef.current) {
      return;
    }

    const detector = detectorRef.current ?? (await ensureDetector());
    const camera = cameraRef.current;

    if (!activeRef.current || !detector || !camera) {
      timeoutRef.current = setTimeout(step, 700);
      return;
    }

    try {
      const photo = await camera.takePictureAsync({ quality: 0.35, base64: true, skipProcessing: true });
      if (!photo?.uri) {
        timeoutRef.current = setTimeout(step, 700);
        return;
      }

      const image = await toImageElement(photo);
      const poses = await detector.estimatePoses(image, { flipHorizontal: mode === 'side' });
      const primary = poses[0];

      if (primary) {
        const normalized = normalizeKeypoints(primary.keypoints);
        const localAnalysis = analyzePosture(normalized, mode);

        setKeypoints(normalized);
        setSourceSize({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
        setAnalysis(localAnalysis);
        void syncBackend(normalized);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Pose analysis failed.');
    } finally {
      timeoutRef.current = setTimeout(step, 700);
    }
  };

  const start = async () => {
    if (!permission?.granted) {
      const granted = await requestPermission();
      if (!granted.granted) {
        setError('Camera permission is required to analyze posture.');
        return;
      }
    }

    await ensureDetector();
    activeRef.current = true;
    setIsRunning(true);
    clearLoop();
    void step();
  };

  const stop = () => {
    activeRef.current = false;
    setIsRunning(false);
    clearLoop();
  };

  useEffect(() => {
    void fetch(`${API_URL}/health`)
      .then((response) => {
        setBackendOnline(response.ok);
      })
      .catch(() => setBackendOnline(false));

    return () => {
      stop();
      detectorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRunning,
    isLoading,
    error,
    mode,
    cameraFacing,
    analysis,
    keypoints,
    sourceSize,
    backendOnline,
    start,
    stop,
    cameraRef,
    permissionGranted: Boolean(permission?.granted),
  };
}

export function PoseAnalyzer() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = useMemo(() => getStyles(palette), [palette]);

  const cameraRef = useRef<any>(null);
  const [mode, setMode] = useState<AnalysisMode>('rear');
  const detector = usePoseDetection(cameraRef, mode);

  const changeMode = (nextMode: AnalysisMode) => {
    detector.stop();
    setMode(nextMode);
  };

  const metricLabels = {
    shoulderTilt: t('training.posture.metric.shoulderTilt'),
    hipTilt: t('training.posture.metric.hipTilt'),
    torsoLean: t('training.posture.metric.torsoLean'),
    elbowAngle: t('training.posture.metric.elbowAngle'),
    headOffset: t('training.posture.metric.headOffset'),
    stanceWidth: t('training.posture.metric.stanceWidth'),
  };

  const statusText = detector.backendOnline === null
    ? t('training.posture.badge.ready')
    : detector.backendOnline
      ? t('training.posture.camera.backend')
      : t('training.posture.camera.backendOffline');

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.lg + 24,
        },
      ]}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTag}>{t('training.posture.badge.analysis')}</Text>
        <Text style={styles.title}>{t('training.posture.title')}</Text>
        <Text style={styles.subtitle}>{t('training.posture.subtitle')}</Text>

        <View style={styles.modeGrid}>
          <Pressable style={[styles.modeCard, mode === 'rear' && styles.modeCardSelected]} onPress={() => changeMode('rear')}>
            <Text style={[styles.modeLabel, mode === 'rear' && styles.modeLabelSelected]}>{t('training.posture.mode.rear')}</Text>
            <Text style={styles.modeHint}>{t('training.posture.mode.rearHint')}</Text>
          </Pressable>

          <Pressable style={[styles.modeCard, mode === 'side' && styles.modeCardSelected]} onPress={() => changeMode('side')}>
            <Text style={[styles.modeLabel, mode === 'side' && styles.modeLabelSelected]}>{t('training.posture.mode.side')}</Text>
            <Text style={styles.modeHint}>{t('training.posture.mode.sideHint')}</Text>
          </Pressable>
        </View>

        <View style={styles.stateRow}>
          <View style={[styles.statePill, detector.isRunning ? styles.statePillRunning : styles.statePillIdle]}>
            <Text style={styles.stateText}>{detector.isRunning ? t('training.posture.badge.scanning') : t('training.posture.badge.ready')}</Text>
          </View>
          <Text style={styles.stateTextSecondary}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.cameraCard}>
        <View style={styles.cameraStage}>
          {detector.permissionGranted ? (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={detector.cameraFacing} />
          ) : (
            <View style={styles.permissionFallback}>
              <Text style={styles.permissionText}>{t('training.posture.camera.permission')}</Text>
            </View>
          )}

          <OverlayCanvas keypoints={detector.keypoints} sourceSize={detector.sourceSize} analysis={detector.analysis} />

          {detector.isLoading ? (
            <View style={styles.loadingLayer}>
              <ActivityIndicator color={palette.primary} />
              <Text style={styles.loadingText}>{t('training.posture.camera.loading')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.controlRow}>
          <Pressable
            style={[styles.controlButton, detector.isRunning ? styles.controlButtonDanger : styles.controlButtonPrimary]}
            onPress={detector.isRunning ? detector.stop : detector.start}>
            <Text style={styles.controlButtonText}>{detector.isRunning ? t('training.posture.camera.stop') : t('training.posture.camera.start')}</Text>
          </Pressable>
        </View>

        {detector.error ? <Text style={styles.errorText}>{detector.error}</Text> : null}
      </View>

      <View style={styles.dashboardCard}>
        <MetricsDashboard
          analysis={detector.analysis}
          title={t('training.posture.score')}
          sectionLabel={t('training.posture.section.metrics')}
          tipsLabel={t('training.posture.section.tips')}
          noTipsLabel={t('training.posture.noTips')}
          metricLabels={metricLabels}
          palette={palette}
        />
      </View>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.background,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.md,
      minHeight: '100%',
    },
    heroCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: `${palette.primary}55`,
      padding: theme.spacing.md,
      backgroundColor: palette.card,
      gap: 8,
    },
    heroTag: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: `${palette.primary}22`,
      color: palette.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      color: palette.text,
      fontSize: 28,
      fontWeight: '900',
    },
    subtitle: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    modeGrid: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    modeCard: {
      flex: 1,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 12,
      backgroundColor: palette.background,
      gap: 6,
    },
    modeCardSelected: {
      borderColor: palette.primary,
      backgroundColor: `${palette.primary}12`,
    },
    modeLabel: {
      color: palette.text,
      fontSize: 14,
      fontWeight: '900',
    },
    modeLabelSelected: {
      color: palette.primary,
    },
    modeHint: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    stateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 4,
    },
    statePill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    statePillRunning: {
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
    },
    statePillIdle: {
      borderColor: palette.border,
      backgroundColor: palette.background,
    },
    stateText: {
      color: palette.text,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    stateTextSecondary: {
      color: palette.muted,
      fontSize: 12,
      flexShrink: 1,
      textAlign: 'right',
    },
    cameraCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      overflow: 'hidden',
      gap: 12,
      padding: 12,
    },
    cameraStage: {
      aspectRatio: 4 / 5,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: '#020617',
      position: 'relative',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    permissionFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      backgroundColor: '#020617',
    },
    permissionText: {
      color: '#f8fafc',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      fontWeight: '700',
    },
    loadingLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: 'rgba(2, 6, 23, 0.45)',
    },
    loadingText: {
      color: '#f8fafc',
      fontSize: 13,
      fontWeight: '700',
    },
    controlRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    controlButton: {
      flex: 1,
      borderRadius: theme.radius.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    controlButtonPrimary: {
      backgroundColor: palette.primary,
    },
    controlButtonDanger: {
      backgroundColor: '#ef4444',
    },
    controlButtonText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 14,
    },
    errorText: {
      color: '#ef4444',
      fontSize: 12,
      lineHeight: 18,
    },
    dashboardCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 14,
    },
  });
