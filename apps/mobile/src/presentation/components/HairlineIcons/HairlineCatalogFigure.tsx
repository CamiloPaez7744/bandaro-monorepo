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
 * HairlineCatalogFigure
 * Isometric Tactical Playbook & Diamond System Manual metaphor:
 * Layered isometric book plates whose top page flexes and fans open with pointer movement,
 * revealing etched 3-cushion diamond systems, calculation formulas and glowing trajectory curves.
 */
export const HairlineCatalogFigure: React.FC<HairlineFigureProps> = ({
  size = 60,
  accent = '#38bdf8',
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
      step += 0.035;
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

  const currentX = isHovered ? pointerX : Math.sin(frame * 0.7) * 0.35;
  const currentY = isHovered ? pointerY : Math.cos(frame * 0.7) * 0.35;

  // Page lift offset based on pointer Y
  const pageLift = isHovered ? Math.max(0, (1 - currentY) * 6) : 3 + Math.sin(frame * 1.2) * 2;
  // Curve curvature inflection based on pointer X
  const curveApexX = 48 + currentX * 12;
  const curveApexY = 32 + currentY * 6 - pageLift * 0.5;

  return (
    <View style={[styles.container, { width: size, height: size * 0.9 }]}>
      <Svg viewBox="0 0 100 90" width="100%" height="100%">
        <Defs>
          <LinearGradient id="catalogPageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1e293b" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
          </LinearGradient>
          <RadialGradient id="catalogGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── 1. Book Shadow ── */}
        <Polygon
          points="18,68 50,84 84,68 52,52"
          fill="rgba(0,0,0,0.4)"
        />

        {/* ── 2. Leather Hardcover Base Plate (Isometric) ── */}
        {/* Bottom cover thickness */}
        <Polygon
          points="18,63 50,79 50,83 18,67"
          fill="#0c1626"
          stroke={accent}
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />
        <Polygon
          points="50,79 84,63 84,67 50,83"
          fill="#080e18"
          stroke={accent}
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />

        {/* ── 3. Lower Stack Pages (Fanned layers) ── */}
        <Polygon
          points="20,60 50,75 82,60 50,45"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="0.9"
        />
        <Polygon
          points="21,57 50,71 81,57 50,42"
          fill="#334155"
          stroke="#64748b"
          strokeWidth="0.9"
        />

        {/* ── 4. Main Active Tactical Page (Lifts with pointer) ── */}
        <G transform={`translate(0, -${pageLift})`}>
          {/* Top page surface */}
          <Polygon
            points="22,54 50,68 80,54 50,40"
            fill="url(#catalogPageGrad)"
            stroke={accent}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Central spine fold crease */}
          <Line
            x1="50"
            y1="40"
            x2="50"
            y2="68"
            stroke={accent}
            strokeWidth="1"
            strokeDasharray="2,2"
            strokeOpacity="0.5"
          />

          {/* Table Outline on Page (Isometric diagram) */}
          <Polygon
            points="30,49 46,57 46,47 30,39"
            fill="none"
            stroke={accent}
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
          <Polygon
            points="54,47 70,39 70,49 54,57"
            fill="none"
            stroke={accent}
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />

          {/* Diamond System Numerical Ticks (Hairline dashes) */}
          <Line x1="34" y1="47" x2="36" y2="46" stroke="#94a3b8" strokeWidth="0.9" />
          <Line x1="38" y1="51" x2="40" y2="50" stroke="#94a3b8" strokeWidth="0.9" />
          <Line x1="42" y1="55" x2="44" y2="54" stroke="#94a3b8" strokeWidth="0.9" />
          <Line x1="58" y1="54" x2="60" y2="55" stroke="#94a3b8" strokeWidth="0.9" />
          <Line x1="62" y1="50" x2="64" y2="51" stroke="#94a3b8" strokeWidth="0.9" />

          {/* ── 5. Tactical Trajectory Curve (Responds to Pointer X/Y) ── */}
          <Path
            d={`M 32,54 Q ${curveApexX},${curveApexY} 68,44`}
            fill="none"
            stroke={accent}
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Milestone nodes on the trajectory */}
          <Circle cx="32" cy="54" r="2" fill="#ffffff" stroke={accent} strokeWidth="1" />
          <Circle
            cx={curveApexX}
            cy={curveApexY}
            r="2.4"
            fill={accent}
            stroke="#ffffff"
            strokeWidth="1"
          />
          <Circle cx="68" cy="44" r="2" fill="#e0f2fe" stroke={accent} strokeWidth="1" />

          {/* Trajectory Rebound Branch */}
          <Line
            x1="68"
            y1="44"
            x2="56"
            y2="60"
            stroke={accent}
            strokeWidth="1.1"
            strokeDasharray="2.5,2"
            strokeOpacity="0.75"
          />
          <Circle cx="56" cy="60" r="1.6" fill="#f8fafc" />
        </G>

        {/* ── 6. Silk Bookmark Ribbon (Drapes from top) ── */}
        <Path
          d={`M 48,34 Q ${46 + currentX * 3},${48 + currentY * 2} 47,62 L 50,59 L 53,62 Q ${51 + currentX * 3},${48 + currentY * 2} 52,34 Z`}
          fill={accent}
          fillOpacity="0.85"
        />

        {/* Ambient Glow */}
        <Circle cx="50" cy="50" r="18" fill="url(#catalogGlow)" />
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
