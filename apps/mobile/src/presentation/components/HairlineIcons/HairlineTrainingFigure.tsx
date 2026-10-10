import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Polygon,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export interface HairlineFigureProps {
  size?: number;
  accent?: string;
  pointerX?: number; // -1 to 1
  pointerY?: number; // -1 to 1
  isHovered?: boolean;
  autoPlay?: boolean;
}

/**
 * HairlineTrainingFigure
 * Isometric 3-cushion training metaphor:
 * Isometric billiard cloth with diamond guides, cue ball with contact crosshair,
 * target object ball, dynamic aiming ray, and an isometric cue stick that aims,
 * pulls back and strikes smoothly based on pointer position.
 */
export const HairlineTrainingFigure: React.FC<HairlineFigureProps> = ({
  size = 60,
  accent = '#22c55e',
  pointerX = 0,
  pointerY = 0,
  isHovered = false,
  autoPlay = true,
}) => {
  const [frame, setFrame] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    let step = 0;
    const loop = () => {
      if (!active) return;
      step += 0.04;
      setFrame(step);
      animRef.current = requestAnimationFrame(loop);
    };
    if (autoPlay || !isHovered) {
      animRef.current = requestAnimationFrame(loop);
    }
    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [autoPlay, isHovered]);

  // Combine pointer movement with gentle idle oscillation
  const idleOscillation = Math.sin(frame);
  const strokeOscillation = Math.cos(frame * 1.5) * 4;

  const currentX = isHovered ? pointerX : Math.sin(frame * 0.8) * 0.4;
  const currentY = isHovered ? pointerY : Math.cos(frame * 0.8) * 0.4;

  // Cue aiming angle and stroke retraction
  const aimAngleDeg = currentX * 18; // degrees
  const strokeOffset = (isHovered ? (currentY + 1) * 6 : 4 + strokeOscillation);

  // Cue ball contact point offset (representing english / spin)
  const tipX = 46 + currentX * 3.5;
  const tipY = 50 + currentY * 3.5;

  // Aiming ray target calculation
  const rayEndX = 68 + currentX * 10;
  const rayEndY = 26 - currentY * 6;

  return (
    <View style={[styles.container, { width: size, height: size * 0.9 }]}>
      <Svg viewBox="0 0 100 90" width="100%" height="100%">
        <Defs>
          <RadialGradient id="ballGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="cueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
            <Stop offset="70%" stopColor="#d1d5db" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* ── 1. Isometric Base Plate (Billiard Cloth) ── */}
        <Polygon
          points="50,14 88,36 50,78 12,56"
          fill="rgba(34,197,94,0.06)"
          stroke={accent}
          strokeWidth="1.2"
          strokeOpacity="0.45"
          strokeLinejoin="round"
        />

        {/* Subtle isometric coordinate guide lines (lo) */}
        <Line
          x1="31"
          y1="25"
          x2="69"
          y2="67"
          stroke={accent}
          strokeWidth="0.8"
          strokeDasharray="2,3"
          strokeOpacity="0.25"
        />
        <Line
          x1="69"
          y1="25"
          x2="31"
          y2="67"
          stroke={accent}
          strokeWidth="0.8"
          strokeDasharray="2,3"
          strokeOpacity="0.25"
        />

        {/* Rail Diamonds (Hairline pips) */}
        <Circle cx="31" cy="25" r="1.4" fill={accent} fillOpacity="0.7" />
        <Circle cx="69" cy="25" r="1.4" fill={accent} fillOpacity="0.7" />
        <Circle cx="50" cy="14" r="1.6" fill="#ffffff" fillOpacity="0.9" />
        <Circle cx="88" cy="36" r="1.4" fill={accent} fillOpacity="0.7" />
        <Circle cx="12" cy="56" r="1.4" fill={accent} fillOpacity="0.7" />

        {/* ── 2. Object Ball (Red Ball at target position) ── */}
        <Circle
          cx="68"
          cy="28"
          r="6.5"
          fill="#ef4444"
          fillOpacity="0.22"
          stroke="#ef4444"
          strokeWidth="1.2"
        />
        <Circle cx="66" cy="26" r="1.8" fill="#ffffff" fillOpacity="0.65" />

        {/* ── 3. Aiming Trajectory Ray ── */}
        <Line
          x1="46"
          y1="50"
          x2={rayEndX}
          y2={rayEndY}
          stroke={accent}
          strokeWidth="1.2"
          strokeDasharray="3,2.5"
          strokeOpacity={isHovered ? 0.95 : 0.65}
        />

        {/* Rebound Vector off cushion */}
        <Line
          x1={rayEndX}
          y1={rayEndY}
          x2={rayEndX - 18}
          y2={rayEndY - 10}
          stroke={accent}
          strokeWidth="0.9"
          strokeDasharray="2,2"
          strokeOpacity="0.4"
        />

        {/* Target indicator ring */}
        <Circle
          cx={rayEndX}
          cy={rayEndY}
          r="3"
          fill="none"
          stroke={accent}
          strokeWidth="1"
          strokeOpacity={0.8}
        />

        {/* ── 4. Cue Ball (White / Yellow Player Ball) ── */}
        {/* Glow halo */}
        <Circle cx="46" cy="50" r="12" fill="url(#ballGlow)" />
        {/* Ball Shadow */}
        <Polygon
          points="40,54 52,54 48,57 36,57"
          fill="rgba(0,0,0,0.35)"
        />
        {/* Ball sphere */}
        <Circle
          cx="46"
          cy="50"
          r="7.5"
          fill="#0f172a"
          stroke="#f8fafc"
          strokeWidth="1.4"
        />
        {/* Spin / Contact point indicator */}
        <Circle
          cx={tipX}
          cy={tipY}
          r="1.8"
          fill={accent}
          stroke="#ffffff"
          strokeWidth="0.8"
        />

        {/* ── 5. Isometric Billiard Cue ── */}
        <G
          transform={`rotate(${aimAngleDeg}, 46, 50)`}
        >
          {/* Cue Tip & Ferrule */}
          <Line
            x1={46 - strokeOffset - 2}
            y1={50 + strokeOffset + 2}
            x2={46 - strokeOffset - 6}
            y2={50 + strokeOffset + 6}
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Cue Shaft */}
          <Line
            x1={46 - strokeOffset - 6}
            y1={50 + strokeOffset + 6}
            x2={46 - strokeOffset - 36}
            y2={50 + strokeOffset + 36}
            stroke="url(#cueGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Cue Butt Collar */}
          <Line
            x1={46 - strokeOffset - 36}
            y1={50 + strokeOffset + 36}
            x2={46 - strokeOffset - 48}
            y2={50 + strokeOffset + 48}
            stroke={accent}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
