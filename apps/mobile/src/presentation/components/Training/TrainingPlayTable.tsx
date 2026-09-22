import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

export interface TablePoint {
  x: number; // 0..284
  y: number; // 0..142
}

export interface TrainingPlayTableProps {
  style?: StyleProp<ViewStyle>;
  whiteBall: TablePoint;
  yellowBall: TablePoint;
  redBall: TablePoint;
  trajectory?: TablePoint[]; // Optional solution path
  isSimulating?: boolean;
  onSimulationEnd?: () => void;
}

const TABLE_W = 284;
const TABLE_H = 142;
const BALL_R = 3.2; // Visual radius in scale
const RAIL_T = 9;   // Outer wood rail thickness
const CUSHION_T = 5; // Rubber cushion thickness

const TOTAL_W = TABLE_W + (RAIL_T + CUSHION_T) * 2;
const TOTAL_H = TABLE_H + (RAIL_T + CUSHION_T) * 2;
const PLAY_OFFSET_X = RAIL_T + CUSHION_T;
const PLAY_OFFSET_Y = RAIL_T + CUSHION_T;

function TrainingPlayTableBase({
  style,
  whiteBall,
  yellowBall,
  redBall,
  trajectory = [],
  isSimulating = false,
  onSimulationEnd,
}: TrainingPlayTableProps) {
  // Current animated position of the cue ball
  const [animBall, setAnimBall] = useState<TablePoint>(whiteBall);
  const animFrameRef = useRef<number | null>(null);

  // Sync initial ball position when not simulating
  useEffect(() => {
    if (!isSimulating) {
      setAnimBall(whiteBall);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
  }, [whiteBall, isSimulating]);

  // Smooth simulation animation along trajectory path
  useEffect(() => {
    if (!isSimulating || trajectory.length < 2) return;

    let startTime: number | null = null;
    const duration = 2800; // 2.8 seconds full shot execution

    // Compute cumulative segment distances
    const dists: number[] = [0];
    for (let i = 1; i < trajectory.length; i++) {
      const dx = trajectory[i].x - trajectory[i - 1].x;
      const dy = trajectory[i].y - trajectory[i - 1].y;
      dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalDist = dists[dists.length - 1];

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Interpolate along polyline
      const currentTargetDist = progress * totalDist;
      let segIdx = 0;
      while (segIdx < dists.length - 1 && dists[segIdx + 1] < currentTargetDist) {
        segIdx++;
      }

      const segStartDist = dists[segIdx];
      const segEndDist = dists[segIdx + 1] || totalDist;
      const segSpan = segEndDist - segStartDist;
      const segFactor = segSpan > 0 ? (currentTargetDist - segStartDist) / segSpan : 1;

      const p0 = trajectory[segIdx];
      const p1 = trajectory[Math.min(segIdx + 1, trajectory.length - 1)];

      setAnimBall({
        x: p0.x + (p1.x - p0.x) * segFactor,
        y: p0.y + (p1.y - p0.y) * segFactor,
      });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        onSimulationEnd?.();
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSimulating, trajectory, onSimulationEnd]);

  // Build SVG path string for trajectory
  const pathD = trajectory.length > 0
    ? trajectory.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x + PLAY_OFFSET_X} ${p.y + PLAY_OFFSET_Y}`).join(' ')
    : '';

  // Diamonds calculation
  const longDiamonds = Array.from({ length: 7 }, (_, i) => (i + 1) / 8);
  const shortDiamonds = Array.from({ length: 3 }, (_, i) => (i + 1) / 4);

  return (
    <View style={[styles.container, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        style={styles.svg}
      >
        <Defs>
          {/* Hardwood Rail Gradient */}
          <LinearGradient id="woodRail" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#2c1a12" />
            <Stop offset="50%" stopColor="#3d251a" />
            <Stop offset="100%" stopColor="#1e110b" />
          </LinearGradient>

          {/* Simonis 300 Cloth Gradient */}
          <RadialGradient id="clothRadial" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#16654e" />
            <Stop offset="70%" stopColor="#11503e" />
            <Stop offset="100%" stopColor="#0c3d2e" />
          </RadialGradient>

          {/* Ball Shading Gradients */}
          <RadialGradient id="whiteBallGrad" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="75%" stopColor="#e2e8f0" />
            <Stop offset="100%" stopColor="#64748b" />
          </RadialGradient>

          <RadialGradient id="yellowBallGrad" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#fef08a" />
            <Stop offset="65%" stopColor="#facc15" />
            <Stop offset="100%" stopColor="#a16207" />
          </RadialGradient>

          <RadialGradient id="redBallGrad" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#fca5a5" />
            <Stop offset="60%" stopColor="#dc2626" />
            <Stop offset="100%" stopColor="#7f1d1d" />
          </RadialGradient>

          <RadialGradient id="ballShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.65)" />
            <Stop offset="60%" stopColor="rgba(0,0,0,0.3)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>
        </Defs>

        {/* 1. Outer Hardwood Rails */}
        <Rect
          x={0}
          y={0}
          width={TOTAL_W}
          height={TOTAL_H}
          rx={8}
          fill="url(#woodRail)"
        />

        {/* Outer Rail Bevel Inset */}
        <Rect
          x={3}
          y={3}
          width={TOTAL_W - 6}
          height={TOTAL_H - 6}
          rx={6}
          fill="none"
          stroke="#4e3123"
          strokeWidth={1}
        />

        {/* 2. Diamond Inlays on Rails */}
        {/* Top & Bottom Long Rails (7 diamonds) */}
        {longDiamonds.map((ratio, i) => {
          const x = PLAY_OFFSET_X + ratio * TABLE_W;
          return (
            <G key={`long-diamond-${i}`}>
              <Circle cx={x} cy={RAIL_T * 0.5} r={1.6} fill="#f1f5f9" />
              <Circle cx={x} cy={TOTAL_H - RAIL_T * 0.5} r={1.6} fill="#f1f5f9" />
            </G>
          );
        })}

        {/* Left & Right Short Rails (3 diamonds) */}
        {shortDiamonds.map((ratio, i) => {
          const y = PLAY_OFFSET_Y + ratio * TABLE_H;
          return (
            <G key={`short-diamond-${i}`}>
              <Circle cx={RAIL_T * 0.5} cy={y} r={1.6} fill="#f1f5f9" />
              <Circle cx={TOTAL_W - RAIL_T * 0.5} cy={y} r={1.6} fill="#f1f5f9" />
            </G>
          );
        })}

        {/* 3. Rubber Cushion Chamfers (Kléber Profile) */}
        <Path
          d={`
            M ${RAIL_T} ${RAIL_T}
            L ${TOTAL_W - RAIL_T} ${RAIL_T}
            L ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y}
            L ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y}
            Z
          `}
          fill="#0a3c2e"
        />
        <Path
          d={`
            M ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y + TABLE_H}
            L ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y + TABLE_H}
            L ${TOTAL_W - RAIL_T} ${TOTAL_H - RAIL_T}
            L ${RAIL_T} ${TOTAL_H - RAIL_T}
            Z
          `}
          fill="#083025"
        />
        <Path
          d={`
            M ${RAIL_T} ${RAIL_T}
            L ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y}
            L ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y + TABLE_H}
            L ${RAIL_T} ${TOTAL_H - RAIL_T}
            Z
          `}
          fill="#09382b"
        />
        <Path
          d={`
            M ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y}
            L ${TOTAL_W - RAIL_T} ${RAIL_T}
            L ${TOTAL_W - RAIL_T} ${TOTAL_H - RAIL_T}
            L ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y + TABLE_H}
            Z
          `}
          fill="#072a20"
        />

        {/* 4. Playfield Cloth Surface (Strict 2:1 Ratio, No Pockets) */}
        <Rect
          x={PLAY_OFFSET_X}
          y={PLAY_OFFSET_Y}
          width={TABLE_W}
          height={TABLE_H}
          fill="url(#clothRadial)"
        />

        {/* Subtle Carom Diamond Coordinate Guide Lines (8x4 grid, opacity 0.08) */}
        {longDiamonds.map((ratio, i) => (
          <Line
            key={`grid-x-${i}`}
            x1={PLAY_OFFSET_X + ratio * TABLE_W}
            y1={PLAY_OFFSET_Y}
            x2={PLAY_OFFSET_X + ratio * TABLE_W}
            y2={PLAY_OFFSET_Y + TABLE_H}
            stroke="#ffffff"
            strokeWidth={0.5}
            strokeDasharray="2, 4"
            opacity={0.08}
          />
        ))}
        {shortDiamonds.map((ratio, i) => (
          <Line
            key={`grid-y-${i}`}
            x1={PLAY_OFFSET_X}
            y1={PLAY_OFFSET_Y + ratio * TABLE_H}
            x2={PLAY_OFFSET_X + TABLE_W}
            y2={PLAY_OFFSET_Y + ratio * TABLE_H}
            stroke="#ffffff"
            strokeWidth={0.5}
            strokeDasharray="2, 4"
            opacity={0.08}
          />
        ))}

        {/* 5. Solution Trajectory Path (Dashed glowing line) */}
        {pathD ? (
          <G>
            {/* Trajectory glow line */}
            <Path
              d={pathD}
              fill="none"
              stroke="rgba(78, 222, 163, 0.3)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Core dashed line */}
            <Path
              d={pathD}
              fill="none"
              stroke="#4edea3"
              strokeWidth={1.8}
              strokeDasharray="3, 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        ) : null}

        {/* 6. Object Ball 2 (Red Ball) */}
        <G>
          <Circle
            cx={redBall.x + PLAY_OFFSET_X + 1}
            cy={redBall.y + PLAY_OFFSET_Y + 1.5}
            r={BALL_R * 1.1}
            fill="url(#ballShadow)"
          />
          <Circle
            cx={redBall.x + PLAY_OFFSET_X}
            cy={redBall.y + PLAY_OFFSET_Y}
            r={BALL_R}
            fill="url(#redBallGrad)"
          />
        </G>

        {/* 7. Object Ball 1 (Yellow Ball) */}
        <G>
          <Circle
            cx={yellowBall.x + PLAY_OFFSET_X + 1}
            cy={yellowBall.y + PLAY_OFFSET_Y + 1.5}
            r={BALL_R * 1.1}
            fill="url(#ballShadow)"
          />
          <Circle
            cx={yellowBall.x + PLAY_OFFSET_X}
            cy={yellowBall.y + PLAY_OFFSET_Y}
            r={BALL_R}
            fill="url(#yellowBallGrad)"
          />
          {/* Red identification dot for yellow carom ball */}
          <Circle
            cx={yellowBall.x + PLAY_OFFSET_X}
            cy={yellowBall.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.22}
            fill="#dc2626"
          />
        </G>

        {/* 8. Cue Ball (White Ball - Animated or Static) */}
        <G>
          <Circle
            cx={animBall.x + PLAY_OFFSET_X + 1}
            cy={animBall.y + PLAY_OFFSET_Y + 1.5}
            r={BALL_R * 1.1}
            fill="url(#ballShadow)"
          />
          <Circle
            cx={animBall.x + PLAY_OFFSET_X}
            cy={animBall.y + PLAY_OFFSET_Y}
            r={BALL_R}
            fill="url(#whiteBallGrad)"
          />
          {/* Red identification dot for white carom ball */}
          <Circle
            cx={animBall.x + PLAY_OFFSET_X}
            cy={animBall.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.22}
            fill="#dc2626"
          />
        </G>
      </Svg>
    </View>
  );
}

export const TrainingPlayTable = memo(TrainingPlayTableBase);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 2 / 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  svg: {
    width: '100%',
    height: '100%',
  },
});
