import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import { HairlineFigureProps } from './HairlineTrainingFigure';

/**
 * HairlineDashboardFigure
 * Isometric Billiard Performance Metrics Podium & Histogram:
 * - Isometric plinth platform with dual-tier beveled base and laser grid lines.
 * - 4 Dynamic 3D Isometric Metric Pillars:
 *   • Pillar 1 (Left): Entradas (Innings)
 *   • Pillar 2 (Front): Carambolas (Caroms)
 *   • Pillar 3 (Right): Promedio General (Average - Apex with Glowing Starburst)
 *   • Pillar 4 (Back): Serie Mayor (High Run)
 * - Dynamic trend hairline polyline with summit nodes connecting all 4 metrics.
 * - Responsive 3D physics: pillars rise and settle answering pointer movement.
 * - Tight-cropped 1:1 viewBox maximizing all available card space.
 */

const VB_X = 26;
const VB_Y = 14;
const VB_W = 108;
const VB_H = 108;
const ASPECT = VB_W / VB_H; // 1.0

const r2 = (n: number) => Math.round(n * 100) / 100;

export const HairlineDashboardFigure: React.FC<HairlineFigureProps> = ({
  size = 144,
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
      step += 0.034;
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

  const [isLocalHovered, setIsLocalHovered] = useState(false);
  const [localPointer, setLocalPointer] = useState({ x: 0, y: 0 });

  const handlePointerMove = (e: any) => {
    if (Platform.OS !== 'web') return;
    const clientX = e.clientX ?? e.nativeEvent?.clientX;
    const clientY = e.clientY ?? e.nativeEvent?.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
    const target = e.currentTarget;
    if (!target?.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((clientY - rect.top) / rect.height - 0.5) * 2;
    setLocalPointer({
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    });
    setIsLocalHovered(true);
  };

  const handlePointerLeave = () => {
    setIsLocalHovered(false);
    setLocalPointer({ x: 0, y: 0 });
  };

  const currentX = isLocalHovered ? localPointer.x : Math.sin(frame * 0.85) * 0.45;
  const currentY = isLocalHovered ? localPointer.y : Math.cos(frame * 0.85) * 0.45;

  // 4 Pillar dynamic heights responding to pointer and breathing wave
  // Pillar 1 (Innings / Entradas)
  const h1 = 26 + (isLocalHovered ? (currentX + 1) * 4.5 : Math.sin(frame * 1.3) * 3.5);
  // Pillar 2 (Carambolas)
  const h2 = 42 + (isLocalHovered ? (1 - currentY) * 6 : Math.sin(frame * 1.3 + 1.2) * 4.5);
  // Pillar 3 (Promedio General - Apex)
  const h3 = 58 + (isLocalHovered ? (-currentX + 1) * 5 : Math.sin(frame * 1.3 + 2.4) * 4.5);
  // Pillar 4 (Serie Mayor / High Run)
  const h4 = 34 + (isLocalHovered ? (currentY + 1) * 5.5 : Math.sin(frame * 1.3 + 3.6) * 4);

  // Plinth platform geometry
  const cx = 80;
  const cy = 82;
  const plinthTop = `${cx},${cy - 24} ${cx + 44},${cy} ${cx},${cy + 24} ${cx - 44},${cy}`;
  const plinthLeftFace = `${cx - 44},${cy} ${cx},${cy + 24} ${cx},${cy + 32} ${cx - 44},${cy + 8}`;
  const plinthRightFace = `${cx},${cy + 24} ${cx + 44},${cy} ${cx + 44},${cy + 8} ${cx},${cy + 32}`;
  const plinthShadow = `${cx - 48},${cy + 6} ${cx},${cy + 36} ${cx + 48},${cy + 6} ${cx},${cy - 18}`;

  // Helper function to render a 3D isometric pillar:
  const renderPillar = (
    px: number,
    py: number,
    w: number,
    h: number,
    isApex: boolean,
    label: string
  ) => {
    const hw = w / 2;
    const topY = py - h;

    const topCap = `${px},${r2(topY - hw * 0.5)} ${px + hw},${r2(topY)} ${px},${r2(topY + hw * 0.5)} ${px - hw},${r2(topY)}`;
    const leftFace = `${px - hw},${r2(topY)} ${px},${r2(topY + hw * 0.5)} ${px},${r2(py + hw * 0.5)} ${px - hw},${r2(py)}`;
    const rightFace = `${px},${r2(topY + hw * 0.5)} ${px + hw},${r2(topY)} ${px + hw},${r2(py)} ${px},${r2(py + hw * 0.5)}`;

    return (
      <G key={`pillar-${label}`}>
        {/* Left Face */}
        <Polygon
          points={leftFace}
          fill="url(#pillarLeftGrad)"
          stroke={isApex ? accent : '#059669'}
          strokeWidth="0.85"
          strokeOpacity={isApex ? 0.95 : 0.5}
        />
        {/* Right Face */}
        <Polygon
          points={rightFace}
          fill="url(#pillarRightGrad)"
          stroke={isApex ? accent : '#047857'}
          strokeWidth="0.85"
          strokeOpacity={isApex ? 0.95 : 0.5}
        />
        {/* Top Cap */}
        <Polygon
          points={topCap}
          fill={isApex ? accent : '#0f766e'}
          stroke="#ffffff"
          strokeWidth={isApex ? 1.2 : 0.8}
          strokeOpacity={isApex ? 0.95 : 0.6}
          strokeLinejoin="round"
        />
        {/* Summit apex node */}
        <Circle
          cx={px}
          cy={r2(topY)}
          r={isApex ? 2.5 : 1.6}
          fill={isApex ? '#ffffff' : accent}
          stroke={isApex ? accent : '#ffffff'}
          strokeWidth="0.8"
        />
      </G>
    );
  };

  // Polyline Summit Coordinates
  const pt1: [number, number] = [58, r2(82 - h1)];
  const pt2: [number, number] = [80, r2(94 - h2)];
  const pt3: [number, number] = [102, r2(82 - h3)];
  const pt4: [number, number] = [80, r2(70 - h4)];

  const trendPolylineD = `M${pt1[0]},${pt1[1]} L${pt2[0]},${pt2[1]} L${pt3[0]},${pt3[1]} L${pt4[0]},${pt4[1]}`;

  // Pulse animation on Apex Promedio
  const pulse = Math.sin(frame * 3) * 0.5 + 0.5;

  const figureH = Math.round(size / ASPECT);

  return (
    <View
      style={[styles.container, { width: size, height: figureH }]}
      // @ts-ignore
      onPointerMove={handlePointerMove}
      // @ts-ignore
      onPointerEnter={handlePointerMove}
      // @ts-ignore
      onPointerLeave={handlePointerLeave}
      onTouchMove={(e) => {
        const locX = e.nativeEvent.locationX;
        const locY = e.nativeEvent.locationY;
        if (typeof locX === 'number' && typeof locY === 'number' && size > 0) {
          const nx = (locX / size - 0.5) * 2;
          const ny = (locY / figureH - 0.5) * 2;
          setLocalPointer({
            x: Math.max(-1, Math.min(1, nx)),
            y: Math.max(-1, Math.min(1, ny)),
          });
          setIsLocalHovered(true);
        }
      }}
      onTouchEnd={handlePointerLeave}
    >
      <Svg
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        width="100%"
        height="100%"
      >
        <Defs>
          {/* Ambient Emerald Center Glow */}
          <RadialGradient id="dashGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>

          {/* Plinth Top Deck Gradient */}
          <LinearGradient id="plinthTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#042f2e" />
            <Stop offset="100%" stopColor="#021c1b" />
          </LinearGradient>

          {/* Pillar Left Shading */}
          <LinearGradient id="pillarLeftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#065f46" />
            <Stop offset="100%" stopColor="#044e3b" />
          </LinearGradient>

          {/* Pillar Right Shading */}
          <LinearGradient id="pillarRightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#033c2e" />
            <Stop offset="100%" stopColor="#02281f" />
          </LinearGradient>
        </Defs>

        {/* ── 1. Soft Floor Shadow beneath Plinth ── */}
        <Polygon points={plinthShadow} fill="rgba(0,0,0,0.45)" />

        {/* ── 2. Plinth Isometric Podium ── */}
        {/* Left Side Face */}
        <Polygon
          points={plinthLeftFace}
          fill="#021c1b"
          stroke="#059669"
          strokeWidth="0.85"
        />
        {/* Right Side Face */}
        <Polygon
          points={plinthRightFace}
          fill="#011413"
          stroke="#047857"
          strokeWidth="0.85"
        />
        {/* Top Deck Surface */}
        <Polygon
          points={plinthTop}
          fill="url(#plinthTopGrad)"
          stroke={accent}
          strokeWidth="1.1"
          strokeOpacity={0.7}
          strokeLinejoin="round"
        />

        {/* Isometric Grid Floor Rules on Plinth Deck */}
        <Line
          x1={cx - 22}
          y1={cy - 12}
          x2={cx + 22}
          y2={cy + 12}
          stroke={accent}
          strokeWidth="0.6"
          strokeDasharray="2.5,2.5"
          strokeOpacity={0.35}
        />
        <Line
          x1={cx + 22}
          y1={cy - 12}
          x2={cx - 22}
          y2={cy + 12}
          stroke={accent}
          strokeWidth="0.6"
          strokeDasharray="2.5,2.5"
          strokeOpacity={0.35}
        />

        {/* ── 3. The 4 Dynamic Isometric Pillars (Rendered Back to Front) ── */}
        {/* Pillar 4 (Back): Serie Mayor / High Run */}
        {renderPillar(80, 70, 14, h4, false, 'highRun')}
        {/* Pillar 1 (Left): Entradas / Innings */}
        {renderPillar(58, 82, 14, h1, false, 'innings')}
        {/* Pillar 3 (Right): Promedio General / Average (Apex) */}
        {renderPillar(102, 82, 14, h3, true, 'average')}
        {/* Pillar 2 (Front): Carambolas */}
        {renderPillar(80, 94, 14, h2, false, 'caroms')}

        {/* ── 4. Floating Trend Hairline Polyline ── */}
        <Path
          d={trendPolylineD}
          fill="none"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3.5,2"
        />

        {/* Peak Target Crosshair Ring on Apex (Promedio) */}
        <Circle
          cx={pt3[0]}
          cy={pt3[1]}
          r={4.5 + pulse * 1.5}
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.85"
          strokeOpacity={0.9 - pulse * 0.4}
        />

        {/* Ambient Center Glow */}
        <Circle cx={cx} cy={cy - 10} r="22" fill="url(#dashGlow)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
});
