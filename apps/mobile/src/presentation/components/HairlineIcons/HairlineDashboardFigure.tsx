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
 * HairlineDashboardFigure
 * Isometric Billiard Performance Metrics Podium & Histogram metaphor:
 * Isometric foundation grid with 4 dynamic 3D pillars representing Caroms,
 * Innings, General Average (Promedio) and High Run (Serie Mayor).
 * Pillars dynamically rise and fall answering pointer position with a floating
 * trend polyline connecting their summits.
 */
export const HairlineDashboardFigure: React.FC<HairlineFigureProps> = ({
  size = 60,
  accent = '#34d399',
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
      step += 0.038;
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

  const currentX = isHovered ? pointerX : Math.sin(frame * 0.8) * 0.45;
  const currentY = isHovered ? pointerY : Math.cos(frame * 0.8) * 0.45;

  // 4 Pillar heights responsive to pointer and idle wave
  // Pillar 1 (Innings)
  const h1 = 12 + (isHovered ? (currentX + 1) * 3 : Math.sin(frame * 1.4) * 2.5);
  // Pillar 2 (Caroms)
  const h2 = 22 + (isHovered ? (1 - currentY) * 5 : Math.sin(frame * 1.4 + 1) * 3.5);
  // Pillar 3 (Average)
  const h3 = 30 + (isHovered ? (-currentX + 1) * 4 : Math.sin(frame * 1.4 + 2) * 4);
  // Pillar 4 (High Run)
  const h4 = 18 + (isHovered ? (currentY + 1) * 4 : Math.sin(frame * 1.4 + 3) * 3);

  // Helper function to render an isometric 3D pillar:
  // Center of base: (cx, cy), pillar width W, height H
  const renderPillar = (cx: number, cy: number, w: number, h: number, isApex = false) => {
    const hw = w / 2;
    const topY = cy - h;

    // Base isometric top cap points:
    // P_top: cx, topY - hw * 0.5
    // P_right: cx + hw, topY
    // P_bottom: cx, topY + hw * 0.5
    // P_left: cx - hw, topY
    const topCap = `${cx},${topY - hw * 0.5} ${cx + hw},${topY} ${cx},${topY + hw * 0.5} ${cx - hw},${topY}`;
    // Left face:
    const leftFace = `${cx - hw},${topY} ${cx},${topY + hw * 0.5} ${cx},${cy + hw * 0.5} ${cx - hw},${cy}`;
    // Right face:
    const rightFace = `${cx},${topY + hw * 0.5} ${cx + hw},${topY} ${cx + hw},${cy} ${cx},${cy + hw * 0.5}`;

    return (
      <G key={`${cx}-${cy}`}>
        {/* Left Face */}
        <Polygon
          points={leftFace}
          fill="#064e3b"
          stroke={accent}
          strokeWidth="0.8"
          strokeOpacity={isApex ? '0.85' : '0.45'}
        />
        {/* Right Face */}
        <Polygon
          points={rightFace}
          fill="#022c22"
          stroke={accent}
          strokeWidth="0.8"
          strokeOpacity={isApex ? '0.85' : '0.45'}
        />
        {/* Top Cap */}
        <Polygon
          points={topCap}
          fill={isApex ? accent : '#047857'}
          stroke="#ffffff"
          strokeWidth={isApex ? '1.2' : '0.8'}
          strokeOpacity={isApex ? '0.95' : '0.6'}
        />
        {/* Summit apex node */}
        <Circle cx={cx} cy={topY} r={isApex ? 2.4 : 1.6} fill="#ffffff" stroke={accent} strokeWidth="0.8" />
      </G>
    );
  };

  return (
    <View style={[styles.container, { width: size, height: size * 0.9 }]}>
      <Svg viewBox="0 0 100 85" width="100%" height="100%">
        <Defs>
          <RadialGradient id="dashGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── 1. Base Isometric Podium Platform ── */}
        <Polygon points="16,56 50,76 84,56 50,36" fill="rgba(0,0,0,0.4)" />
        <Polygon
          points="18,54 50,72 82,54 50,36"
          fill="#031b14"
          stroke={accent}
          strokeWidth="1.1"
          strokeOpacity="0.6"
          strokeLinejoin="round"
        />

        {/* Isometric Grid Floor Rules (lo) */}
        <Line x1="34" y1="45" x2="66" y2="63" stroke={accent} strokeWidth="0.6" strokeDasharray="2,2" strokeOpacity="0.3" />
        <Line x1="66" y1="45" x2="34" y2="63" stroke={accent} strokeWidth="0.6" strokeDasharray="2,2" strokeOpacity="0.3" />

        {/* ── 2. The 4 Dynamic Isometric Pillars ── */}
        {/* Back pillar: Column 4 */}
        {renderPillar(50, 48, 11, h4)}
        {/* Left pillar: Column 1 */}
        {renderPillar(32, 54, 11, h1)}
        {/* Right pillar: Column 3 (Apex candidate) */}
        {renderPillar(68, 54, 11, h3, true)}
        {/* Front pillar: Column 2 */}
        {renderPillar(50, 62, 11, h2)}

        {/* ── 3. Floating Trend Hairline Polyline ── */}
        <Path
          d={`M 32,${54 - h1} L 50,${62 - h2} L 68,${54 - h3} L 50,${48 - h4}`}
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3,1.5"
        />

        {/* Peak Target Crosshair on Apex */}
        <Circle cx="68" cy={54 - h3} r="4" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.75" />

        {/* Ambient Emerald Glow */}
        <Circle cx="50" cy="50" r="16" fill="url(#dashGlow)" />
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
