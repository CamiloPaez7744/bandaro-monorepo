import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { HairlineFigureProps } from './HairlineTrainingFigure';

/**
 * HairlineSimulatorFigure
 * Isometric 3-Cushion Billiard Table Simulator metaphor:
 * Full 3D isometric table with beveled cushions, rail diamonds, 3 carom balls
 * (white cue, yellow target, red carom) and an animated 3-cushion ricochet ray
 * that deflects interactively with pointer movement and pings cushion rails.
 */
export const HairlineSimulatorFigure: React.FC<HairlineFigureProps> = ({
  size = 64,
  accent = '#a78bfa',
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

  const currentX = isHovered ? pointerX : Math.sin(frame * 0.9) * 0.5;
  const currentY = isHovered ? pointerY : Math.cos(frame * 0.9) * 0.5;

  // Ball positions responding to pointer
  const whiteX = 34 + currentX * 3;
  const whiteY = 56 - currentY * 2;

  // Cushion 1 impact point (top-right long rail)
  const c1X = 66 + currentX * 5;
  const c1Y = 30 + currentY * 3;

  // Cushion 2 impact point (top-left short rail)
  const c2X = 38 - currentX * 4;
  const c2Y = 22 - currentY * 2;

  // Cushion 3 impact point (bottom-left long rail)
  const c3X = 26 + currentX * 3;
  const c3Y = 46 + currentY * 2;

  // Final carom point (Red ball contact)
  const redX = 64 - currentX * 2;
  const redY = 52 + currentY * 2;

  // Yellow ball position
  const yellowX = 46 + currentX * 2;
  const yellowY = 40 + currentY * 2;

  // Ripple pulsation on cushion impact
  const pulse = Math.abs(Math.sin(frame * 3)) * 2;

  return (
    <View style={[styles.container, { width: size * 1.15, height: size * 0.9 }]}>
      <Svg viewBox="0 0 100 85" width="100%" height="100%">
        <Defs>
          <RadialGradient id="simGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="tableFelt" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1e1035" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#0f0720" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* ── 1. Table Outer Wood Frame & Bevel (Isometric) ── */}
        {/* Frame Shadow */}
        <Polygon points="10,48 50,78 90,48 50,18" fill="rgba(0,0,0,0.5)" />
        {/* Table Leg Plinth */}
        <Polygon points="12,50 50,78 50,82 12,54" fill="#170d2b" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />
        <Polygon points="50,78 88,50 88,54 50,82" fill="#120822" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" />

        {/* Outer Rail Rim */}
        <Polygon
          points="12,48 50,76 88,48 50,20"
          fill="#2d1b4e"
          stroke={accent}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* ── 2. Inner Cushion Felt (Playing Surface) ── */}
        <Polygon
          points="18,48 50,71 82,48 50,25"
          fill="url(#tableFelt)"
          stroke={accent}
          strokeWidth="1"
          strokeOpacity="0.6"
          strokeLinejoin="round"
        />

        {/* Diamond inlays on the 4 rails */}
        <Circle cx="34" cy="62" r="1.2" fill="#ffffff" fillOpacity="0.8" />
        <Circle cx="66" cy="62" r="1.2" fill="#ffffff" fillOpacity="0.8" />
        <Circle cx="66" cy="34" r="1.2" fill="#ffffff" fillOpacity="0.8" />
        <Circle cx="34" cy="34" r="1.2" fill="#ffffff" fillOpacity="0.8" />
        <Circle cx="50" cy="22" r="1.4" fill={accent} />
        <Circle cx="50" cy="74" r="1.4" fill={accent} />

        {/* ── 3. Interactive 3-Cushion Hairline Trajectory ── */}
        {/* Step 1: Cue Ball -> Cushion 1 */}
        <Line
          x1={whiteX}
          y1={whiteY}
          x2={c1X}
          y2={c1Y}
          stroke={accent}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Cushion 1 Impact Pulse */}
        <Circle cx={c1X} cy={c1Y} r={2.5 + pulse} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.8" />

        {/* Step 2: Cushion 1 -> Cushion 2 */}
        <Line
          x1={c1X}
          y1={c1Y}
          x2={c2X}
          y2={c2Y}
          stroke={accent}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeDasharray="4,1"
        />
        {/* Cushion 2 Impact Pulse */}
        <Circle cx={c2X} cy={c2Y} r={2.5 + pulse} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.8" />

        {/* Step 3: Cushion 2 -> Cushion 3 */}
        <Line
          x1={c2X}
          y1={c2Y}
          x2={c3X}
          y2={c3Y}
          stroke={accent}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        {/* Cushion 3 Impact Pulse */}
        <Circle cx={c3X} cy={c3Y} r={2.5 + pulse} fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.8" />

        {/* Step 4: Cushion 3 -> Red Ball (Carom Hit!) */}
        <Line
          x1={c3X}
          y1={c3Y}
          x2={redX}
          y2={redY}
          stroke="#f43f5e"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Carom Impact Starburst */}
        <G transform={`translate(${redX}, ${redY})`}>
          <Line x1="-4" y1="-4" x2="4" y2="4" stroke="#fbbf24" strokeWidth="1" />
          <Line x1="-4" y1="4" x2="4" y2="-4" stroke="#fbbf24" strokeWidth="1" />
        </G>

        {/* ── 4. The 3 Billiard Balls ── */}
        {/* White Ball */}
        <Circle cx={whiteX} cy={whiteY} r="4.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
        <Circle cx={whiteX - 1} cy={whiteY - 1} r="1.3" fill="#ffffff" />

        {/* Yellow Ball */}
        <Circle cx={yellowX} cy={yellowY} r="4.5" fill="#facc15" stroke="#eab308" strokeWidth="1" />
        <Circle cx={yellowX - 1} cy={yellowY - 1} r="1.3" fill="#ffffff" fillOpacity="0.8" />

        {/* Red Ball */}
        <Circle cx={redX} cy={redY} r="5" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
        <Circle cx={redX - 1.2} cy={redY - 1.2} r="1.5" fill="#ffffff" fillOpacity="0.75" />

        {/* Ambient Center Glow */}
        <Circle cx="50" cy="48" r="16" fill="url(#simGlow)" />
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
