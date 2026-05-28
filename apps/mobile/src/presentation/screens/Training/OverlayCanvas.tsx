import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

type Keypoint = {
  name?: string;
  x: number;
  y: number;
  score?: number;
};

type Analysis = {
  score: number;
  status: 'excellent' | 'good' | 'needs-adjustment';
  metrics: {
    shoulderTilt: number;
    hipTilt: number;
    torsoLean: number;
    elbowAngle: number;
    headOffset: number;
    stanceWidth: number;
  };
};

type Props = {
  keypoints: Keypoint[];
  sourceSize: { width: number; height: number };
  analysis: Analysis | null;
};

const CONNECTIONS = [
  ['nose', 'leftEye'],
  ['nose', 'rightEye'],
  ['leftEye', 'leftEar'],
  ['rightEye', 'rightEar'],
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
] as const;

const ANGLE_BADGES = [
  { key: 'shoulderTilt', label: 'Shoulders' },
  { key: 'elbowAngle', label: 'Elbow' },
  { key: 'torsoLean', label: 'Torso' },
] as const;

export function OverlayCanvas({ keypoints, sourceSize, analysis }: Props) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const mapped = useMemo(() => {
    const scaleX = layout.width && sourceSize.width ? layout.width / sourceSize.width : 1;
    const scaleY = layout.height && sourceSize.height ? layout.height / sourceSize.height : 1;

    return keypoints
      .filter((point) => typeof point.x === 'number' && typeof point.y === 'number')
      .map((point) => ({
        ...point,
        x: point.x * scaleX,
        y: point.y * scaleY,
      }));
  }, [keypoints, layout.height, layout.width, sourceSize.height, sourceSize.width]);

  const pointMap = useMemo(() => {
    return new Map(mapped.map((point) => [point.name, point]));
  }, [mapped]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={styles.root} pointerEvents="none" onLayout={onLayout}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${layout.width || 1} ${layout.height || 1}`}>
        <Rect x="0" y="0" width={layout.width || 1} height={layout.height || 1} fill="transparent" />

        {CONNECTIONS.map(([fromName, toName]) => {
          const from = pointMap.get(fromName);
          const to = pointMap.get(toName);
          if (!from || !to) {
            return null;
          }

          return (
            <Line
              key={`${fromName}-${toName}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(56, 189, 248, 0.92)"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          );
        })}

        {mapped.map((point) => (
          <Circle key={point.name ?? `${point.x}-${point.y}`} cx={point.x} cy={point.y} r={4.4} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.2} />
        ))}
      </Svg>

      {analysis ? (
        <View style={styles.badgesWrap}>
          <View style={[styles.scoreBadge, analysis.status === 'excellent' ? styles.excellent : analysis.status === 'good' ? styles.good : styles.adjust]}>
            <Text style={styles.scoreValue}>{analysis.score}</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>

          <View style={styles.metricRow}>
            {ANGLE_BADGES.map((badge) => (
              <View key={badge.key} style={styles.metricBadge}>
                <Text style={styles.metricBadgeLabel}>{badge.label}</Text>
                <Text style={styles.metricBadgeValue}>{analysis.metrics[badge.key].toFixed(1)}°</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  badgesWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    gap: 8,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  excellent: {
    borderColor: 'rgba(34, 197, 94, 0.6)',
  },
  good: {
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  adjust: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  scoreValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
  },
  scoreLabel: {
    color: 'rgba(248, 250, 252, 0.72)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBadge: {
    minWidth: 92,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  metricBadgeLabel: {
    color: 'rgba(248, 250, 252, 0.72)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricBadgeValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
});
