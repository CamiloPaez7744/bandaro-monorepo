import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, {
  Path,
  Circle,
  Polygon,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { HairlineFigureProps } from './HairlineTrainingFigure';

/**
 * HairlineMatchFigure
 * Replicates the authentic Hairline "Exploded" engine:
 * Modeled for "Registro de Partida" (Billiard Match Scorecard & Log by Levels):
 * - Isometric 4-Level Exploded Architecture (Cam(45, 0.5, 1.40)):
 *   • Nivel 0 (Base Sheet): Master match scorecard, player vs player divider, target 40-pt badge.
 *   • Nivel 1 (Innings Ledger): Detailed turn-by-turn inning rows, carom tally ticks, average summary.
 *   • Nivel 2 (High Run & Carom Breakdown): Streak record card, mini carom table with 3-cushion trajectory & balls.
 *   • Nivel 3 (Match Point / Winner Badge): Floating crown badge, active match status & final tally.
 * - Dashed isometric guide lines connecting the 4 corners of each level.
 * - Exploded Dynamics:
 *   • Horizontal pointer movement opens the vertical gap between the 4 layers.
 *   • Vertical pointer movement selects which level is highlighted & lifted on a spring.
 *   • Selected layer glows with radiant flame amber (#fb923c / #f97316).
 *   • Autonomous breathing cycle when idle.
 */

// Isometric Camera & Bounding Box
const rad = (d: number) => (d * Math.PI) / 180;
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const poly = (pts: [number, number][]) =>
  'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';
const seg = (a: [number, number], b: [number, number]) =>
  `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;

const VB_X = 40;
const VB_Y = 55;
const VB_W = 220;
const VB_H = 195;
const ASPECT = VB_W / VB_H; // ~1.128

// Camera parameters: Azimuth 45°, k=0.5, scale 1.40, centered
const C_AZ = rad(45);
const C_K = 0.5;
const C_S = 1.4;
const C_OX = 130;
const C_OY = 132;
const C_COS = Math.cos(C_AZ);
const C_SIN = Math.sin(C_AZ);
const C_ZF = Math.sqrt(1 - C_K * C_K);

const P = (x: number, y: number, z: number): [number, number] => {
  const X = x * C_COS - y * C_SIN;
  const Y = x * C_SIN + y * C_COS;
  return [C_OX + C_S * X, C_OY + C_S * (Y * C_K - z * C_ZF)];
};

// Generate rounded rectangle contour points in local (x, y) coordinates
function roundedRectPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number
): [number, number][] {
  const pts: [number, number][] = [];
  const steps = 3;
  // Top-Right corner
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI / 2) * (1 - i / steps);
    pts.push([x1 - r + r * Math.cos(a), y0 + r - r * Math.sin(a)]);
  }
  // Bottom-Right corner
  for (let i = 0; i <= steps; i++) {
    const a = -(Math.PI / 2) * (i / steps);
    pts.push([x1 - r + r * Math.cos(a), y1 - r - r * Math.sin(a)]);
  }
  // Bottom-Left corner
  for (let i = 0; i <= steps; i++) {
    const a = -(Math.PI / 2) * (1 + i / steps);
    pts.push([x0 + r + r * Math.cos(a), y1 - r - r * Math.sin(a)]);
  }
  // Top-Left corner
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI - (Math.PI / 2) * (i / steps);
    pts.push([x0 + r + r * Math.cos(a), y0 + r - r * Math.sin(a)]);
  }
  return pts;
}

export const HairlineMatchFigure: React.FC<HairlineFigureProps> = ({
  size = 116,
  accent = '#fb923c',
  pointerX = 0,
  pointerY = 0,
  isHovered = false,
  autoPlay = true,
}) => {
  // Spring animation state for Gap and Active Layer
  const [gapFactor, setGapFactor] = useState(0.35); // 0 (closed) to 1 (fully open)
  const [activeLayer, setActiveLayer] = useState<number>(-1);
  const [isLocalHovered, setIsLocalHovered] = useState(false);
  const [localPointer, setLocalPointer] = useState({ x: 0, y: 0 });
  const liftsRef = useRef<number[]>([0, 0, 0, 0]);
  const gapRef = useRef(0.35);

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

  useEffect(() => {
    let animId: number | null = null;
    let active = true;
    let time = 0;
    let lastTime = 0;
    const FRAME_INTERVAL = 1000 / 20;

    const tick = (now: number) => {
      if (!active) return;
      if (typeof document !== 'undefined' && document.hidden) {
        animId = null;
        return;
      }
      if (!lastTime) lastTime = now;
      const elapsed = now - lastTime;
      if (elapsed >= FRAME_INTERVAL) {
        lastTime = now - (elapsed % FRAME_INTERVAL);
        time += 0.025 * (elapsed / (1000 / 60));

        let targetGap = 0.35;
        let targetActive = -1;

        if (isLocalHovered) {
          // PointerX controls gap opening (from tight 0.18 to wide 1.0)
          targetGap = 0.2 + 0.8 * clamp((localPointer.x + 1) / 2, 0, 1);

          // PointerY selects layer from top to bottom
          if (localPointer.y < -0.38) targetActive = 3; // Top Badge
          else if (localPointer.y < 0.05) targetActive = 2; // High Run
          else if (localPointer.y < 0.52) targetActive = 1; // Innings Ledger
          else targetActive = 0; // Base Sheet
        } else if (autoPlay) {
          // Idle gentle breathing cycle
          targetGap = 0.35 + 0.22 * Math.sin(time * 0.9);
          const cycle = Math.floor((time * 0.5) % 4);
          targetActive = cycle;
        }

        // Smooth spring toward target gap
        gapRef.current += (targetGap - gapRef.current) * 0.14;
        setGapFactor(gapRef.current);
        setActiveLayer(targetActive);

        // Spring lift for individual layers
        for (let i = 0; i < 4; i++) {
          const wantLift = i === targetActive ? 6.5 : 0;
          liftsRef.current[i] += (wantLift - liftsRef.current[i]) * 0.18;
        }
      }

      animId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!animId) {
        lastTime = 0;
        animId = requestAnimationFrame(tick);
      }
    };

    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else if (active) {
        startLoop();
      }
    };

    startLoop();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      active = false;
      if (animId) cancelAnimationFrame(animId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [isHovered, pointerX, pointerY, autoPlay, isLocalHovered, localPointer]);

  // Current calculated gap separation
  const currentGap = 14 + gapFactor * 22; // from 14px to 36px
  const TK = 2.4; // Slab thickness

  // ── Layer Specifications ───────────────────────────────────────────
  // Layer 0: Base Match Scoreboard
  // Layer 1: Innings Ledger (Entradas)
  // Layer 2: High Run & Carom Breakdown (Serie Mayor)
  // Layer 3: Winner Crown / Match Status Badge
  const layers = useMemo(() => {
    return [
      {
        id: 0,
        name: 'Hoja de Partida',
        bounds: [4, 6, 130, 90] as [number, number, number, number],
        radius: 6,
        bgGrad: 'url(#layerGrad0)',
      },
      {
        id: 1,
        name: 'Entradas',
        bounds: [8, 18, 62, 88] as [number, number, number, number],
        radius: 4,
        bgGrad: 'url(#layerGrad1)',
      },
      {
        id: 2,
        name: 'Serie Mayor',
        bounds: [48, 20, 124, 66] as [number, number, number, number],
        radius: 5,
        bgGrad: 'url(#layerGrad2)',
      },
      {
        id: 3,
        name: 'Insignia de Victoria',
        bounds: [74, 44, 128, 86] as [number, number, number, number],
        radius: 4.5,
        bgGrad: 'url(#layerGrad3)',
      },
    ];
  }, []);

  // Compute 3D Slabs & Geometry for each layer
  const renderedLayers = useMemo(() => {
    return layers.map((L, i) => {
      const isSelected = activeLayer === i;
      const extraLift = liftsRef.current[i] || 0;
      const zBase = i * currentGap + extraLift;
      const zTop = zBase + TK;

      // Slab contour in 2D
      const cPts = roundedRectPoints(
        L.bounds[0],
        L.bounds[1],
        L.bounds[2],
        L.bounds[3],
        L.radius
      );

      // Projected Top & Bottom Faces
      const topPts = cPts.map(([x, y]) => P(x, y, zTop));
      const btmPts = cPts.map(([x, y]) => P(x, y, zBase));
      const topFaceD = poly(topPts);

      // Isometric Side Extrusion (Bottom and Front facing edges)
      // Connect front vertices from bottom to top
      const mid = Math.floor(cPts.length / 2);
      const sidePts: [number, number][] = [];
      for (let k = 0; k <= mid; k++) sidePts.push(btmPts[k]);
      for (let k = mid; k >= 0; k--) sidePts.push(topPts[k]);
      const sideFaceD = poly(sidePts);

      // Selection Glow Outline
      const selStroke = isSelected ? accent : '#64748b';
      const selStrokeWidth = isSelected ? 1.4 : 0.85;

      return {
        ...L,
        isSelected,
        zBase,
        zTop,
        topFaceD,
        sideFaceD,
        selStroke,
        selStrokeWidth,
      };
    });
  }, [layers, currentGap, activeLayer, accent]);

  // Vertical Dashed Guide Lines connecting the 4 corners between layers
  const guideLinesD = useMemo(() => {
    let d = '';
    const corners = [
      [layers[0].bounds[0], layers[0].bounds[1]], // Top-Left
      [layers[0].bounds[2], layers[0].bounds[1]], // Top-Right
      [layers[0].bounds[2], layers[0].bounds[3]], // Bottom-Right
      [layers[0].bounds[0], layers[0].bounds[3]], // Bottom-Left
    ];

    for (let c = 0; c < 4; c++) {
      const [cx, cy] = corners[c];
      const z0 = 0;
      const z3 = 3 * currentGap + TK;
      const p0 = P(cx, cy, z0);
      const p1 = P(cx, cy, z3);
      d += `M${r2(p0[0])} ${r2(p0[1])}L${r2(p1[0])} ${r2(p1[1])}`;
    }
    return d;
  }, [layers, currentGap]);

  // Figure container height based on aspect ratio
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
          {/* Layer Gradient Fills */}
          <LinearGradient id="layerGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1a0803" />
            <Stop offset="100%" stopColor="#0d0401" />
          </LinearGradient>
          <LinearGradient id="layerGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#220b04" />
            <Stop offset="100%" stopColor="#120502" />
          </LinearGradient>
          <LinearGradient id="layerGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2c0e05" />
            <Stop offset="100%" stopColor="#170602" />
          </LinearGradient>
          <LinearGradient id="layerGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3a1306" />
            <Stop offset="100%" stopColor="#1d0803" />
          </LinearGradient>

          {/* Active Radiant Flame Halo */}
          <RadialGradient id="matchFlameGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── 1. Soft Floor Shadow beneath the Stack ── */}
        <Polygon
          points={`${r2(P(4, 6, 0)[0])},${r2(P(4, 6, 0)[1])} ${r2(
            P(130, 6, 0)[0]
          )},${r2(P(130, 6, 0)[1])} ${r2(P(130, 90, 0)[0])},${r2(
            P(130, 90, 0)[1]
          )} ${r2(P(4, 90, 0)[0])},${r2(P(4, 90, 0)[1])}`}
          fill="rgba(0,0,0,0.4)"
        />

        {/* ── 2. Vertical Isometric Guide Lines ── */}
        <Path
          d={guideLinesD}
          fill="none"
          stroke={activeLayer >= 0 ? accent : '#7c2d12'}
          strokeWidth="0.8"
          strokeDasharray="2.5,2.5"
          strokeOpacity={activeLayer >= 0 ? 0.65 : 0.4}
        />

        {/* ── 3. The 4 Exploded Levels ── */}
        {renderedLayers.map((L) => {
          const zt = L.zTop;

          return (
            <G key={`layer-${L.id}`}>
              {/* Active Layer Radiant Ambient Glow */}
              {L.isSelected && (
                <Circle
                  cx={P((L.bounds[0] + L.bounds[2]) / 2, (L.bounds[1] + L.bounds[3]) / 2, zt)[0]}
                  cy={P((L.bounds[0] + L.bounds[2]) / 2, (L.bounds[1] + L.bounds[3]) / 2, zt)[1]}
                  r="34"
                  fill="url(#matchFlameGlow)"
                />
              )}

              {/* 3D Slab Side Extrusion */}
              <Path
                d={L.sideFaceD}
                fill="#0a0301"
                stroke={L.selStroke}
                strokeWidth={L.selStrokeWidth * 0.75}
              />

              {/* 3D Slab Top Face */}
              <Path
                d={L.topFaceD}
                fill={L.bgGrad}
                stroke={L.selStroke}
                strokeWidth={L.selStrokeWidth}
                strokeLinejoin="round"
              />

              {/* ── Technical Billiard Match Markings on Top Face ── */}

              {/* NIVEL 0: Master Match Sheet Markings */}
              {L.id === 0 && (
                <G>
                  {/* Billiard Balls Status Indicator Dots */}
                  <Circle
                    cx={P(10, 12, zt)[0]}
                    cy={P(10, 12, zt)[1]}
                    r="1.6"
                    fill="#f8fafc"
                  />
                  <Circle
                    cx={P(17, 12, zt)[0]}
                    cy={P(17, 12, zt)[1]}
                    r="1.6"
                    fill="#facc15"
                  />
                  <Circle
                    cx={P(24, 12, zt)[0]}
                    cy={P(24, 12, zt)[1]}
                    r="1.6"
                    fill="#ef4444"
                  />

                  {/* Header Title Line */}
                  <Path
                    d={seg(P(32, 12, zt), P(74, 12, zt))}
                    stroke="#94a3b8"
                    strokeWidth="1.1"
                  />
                  {/* Header Divider */}
                  <Path
                    d={seg(P(6, 18, zt), P(128, 18, zt))}
                    stroke="#475569"
                    strokeWidth="0.8"
                  />

                  {/* Center Match Divider */}
                  <Path
                    d={seg(P(67, 20, zt), P(67, 84, zt))}
                    stroke="#475569"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />

                  {/* Player 1 Ledger Rows */}
                  <Path
                    d={seg(P(10, 26, zt), P(50, 26, zt))}
                    stroke={L.isSelected ? accent : '#cbd5e1'}
                    strokeWidth="1.2"
                  />
                  <Path
                    d={seg(P(10, 36, zt), P(40, 36, zt))}
                    stroke="#94a3b8"
                    strokeWidth="0.9"
                  />

                  {/* Player 2 Ledger Rows */}
                  <Path
                    d={seg(P(76, 26, zt), P(116, 26, zt))}
                    stroke={L.isSelected ? accent : '#cbd5e1'}
                    strokeWidth="1.2"
                  />
                  <Path
                    d={seg(P(76, 36, zt), P(106, 36, zt))}
                    stroke="#94a3b8"
                    strokeWidth="0.9"
                  />

                  {/* Target 40 PTS Box */}
                  <Path
                    d={poly([
                      P(52, 66, zt),
                      P(82, 66, zt),
                      P(82, 78, zt),
                      P(52, 78, zt),
                    ])}
                    fill="none"
                    stroke={accent}
                    strokeWidth="0.8"
                  />
                  <Path
                    d={seg(P(56, 72, zt), P(78, 72, zt))}
                    stroke={accent}
                    strokeWidth="1.2"
                  />
                </G>
              )}

              {/* NIVEL 1: Innings Ledger (Entradas) */}
              {L.id === 1 && (
                <G>
                  {/* Header Line */}
                  <Path
                    d={seg(P(14, 25, zt), P(46, 25, zt))}
                    stroke={L.isSelected ? accent : '#fdba74'}
                    strokeWidth="1.2"
                  />

                  {/* 5 Inning Entry Rows with Tally Pips */}
                  {[34, 44, 54, 64, 74].map((rowY, rIdx) => (
                    <G key={`inn-${rIdx}`}>
                      <Path
                        d={seg(
                          P(14, rowY, zt),
                          P(14 + (rIdx % 2 === 0 ? 22 : 18), rowY, zt)
                        )}
                        stroke="#cbd5e1"
                        strokeWidth="0.8"
                      />
                      <Circle
                        cx={P(46, rowY, zt)[0]}
                        cy={P(46, rowY, zt)[1]}
                        r="1.4"
                        fill={accent}
                      />
                    </G>
                  ))}

                  {/* Inning Average / Promedio Badge */}
                  <Path
                    d={poly([
                      P(12, 79, zt),
                      P(58, 79, zt),
                      P(58, 85, zt),
                      P(12, 85, zt),
                    ])}
                    fill="rgba(251, 146, 60, 0.15)"
                    stroke={accent}
                    strokeWidth="0.75"
                  />
                </G>
              )}

              {/* NIVEL 2: Serie Mayor & Carom Breakdown */}
              {L.id === 2 && (
                <G>
                  {/* Header Line */}
                  <Path
                    d={seg(P(54, 27, zt), P(96, 27, zt))}
                    stroke={L.isSelected ? accent : '#fdba74'}
                    strokeWidth="1.2"
                  />

                  {/* Mini Carom Table Frame */}
                  <Path
                    d={poly([
                      P(54, 33, zt),
                      P(118, 33, zt),
                      P(118, 61, zt),
                      P(54, 61, zt),
                    ])}
                    fill="#080e1a"
                    stroke="#475569"
                    strokeWidth="0.75"
                  />

                  {/* 3-Cushion Trajectory Zig-Zag Line */}
                  <Path
                    d={`M${r2(P(68, 44, zt)[0])} ${r2(P(68, 44, zt)[1])}` +
                      `L${r2(P(88, 40, zt)[0])} ${r2(P(88, 40, zt)[1])}` +
                      `L${r2(P(98, 34, zt)[0])} ${r2(P(98, 34, zt)[1])}` +
                      `L${r2(P(114, 42, zt)[0])} ${r2(P(114, 42, zt)[1])}` +
                      `L${r2(P(104, 52, zt)[0])} ${r2(P(104, 52, zt)[1])}`}
                    fill="none"
                    stroke={L.isSelected ? accent : '#38bdf8'}
                    strokeWidth="1.1"
                    strokeDasharray="2,1.5"
                  />

                  {/* 3 Mini Carom Balls */}
                  <Circle
                    cx={P(68, 44, zt)[0]}
                    cy={P(68, 44, zt)[1]}
                    r="2.2"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth="0.4"
                  />
                  <Circle
                    cx={P(88, 40, zt)[0]}
                    cy={P(88, 40, zt)[1]}
                    r="2.2"
                    fill="#facc15"
                    stroke="#ca8a04"
                    strokeWidth="0.4"
                  />
                  <Circle
                    cx={P(104, 52, zt)[0]}
                    cy={P(104, 52, zt)[1]}
                    r="2.4"
                    fill="#ef4444"
                    stroke="#dc2626"
                    strokeWidth="0.4"
                  />

                  {/* Carom Point Starburst */}
                  <Circle
                    cx={P(104, 52, zt)[0]}
                    cy={P(104, 52, zt)[1]}
                    r="4.2"
                    fill="none"
                    stroke={accent}
                    strokeWidth="0.6"
                    strokeDasharray="1.2,1.2"
                  />
                </G>
              )}

              {/* NIVEL 3: Winner Crown / Match Status Badge */}
              {L.id === 3 && (
                <G>
                  {/* Floating Badge Pill */}
                  <Path
                    d={poly([
                      P(78, 48, zt),
                      P(124, 48, zt),
                      P(124, 60, zt),
                      P(78, 60, zt),
                    ])}
                    fill={L.isSelected ? accent : '#ea580c'}
                    stroke="#fed7aa"
                    strokeWidth="0.8"
                  />

                  {/* Status Indicator Pip */}
                  <Circle
                    cx={P(84, 54, zt)[0]}
                    cy={P(84, 54, zt)[1]}
                    r="1.8"
                    fill="#ffffff"
                  />
                  {/* Badge Text Bar */}
                  <Path
                    d={seg(P(90, 54, zt), P(116, 54, zt))}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />

                  {/* Final Match Tally Lines */}
                  <Path
                    d={seg(P(80, 68, zt), P(122, 68, zt))}
                    stroke={L.isSelected ? accent : '#fdba74'}
                    strokeWidth="1.3"
                  />
                  <Path
                    d={seg(P(80, 76, zt), P(112, 76, zt))}
                    stroke="#94a3b8"
                    strokeWidth="0.9"
                  />
                </G>
              )}
            </G>
          );
        })}
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
