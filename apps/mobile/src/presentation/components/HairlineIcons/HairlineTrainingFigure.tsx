import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, {
  Path,
  Circle,
  Polygon,
  G,
  Defs,
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
 * Replicates the authentic Hairline "Slow" engine:
 * - Exact camera angle from Slow: Cam(45, 0.5, 1.8).
 * - A conveyor belt with moving slats and an inspection scanner gate.
 * - Multiple 3D carom billiard tables (matching the user's diagram) riding on the belt.
 * - Underneath each table: 2 pedestals/legs with an arched cutout.
 * - On each table: beveled wooden frame, cushion rail with 45° pocketless corners,
 *   rail diamonds, 3 carom balls (White, Yellow, Red), and 3-cushion carom trajectory with arrows.
 * - Hairline Slow dynamics: tables cruise along the track. Hovering over a table makes it
 *   spring up gracefully into the air with emerald green glow (#22c55e), while smoothly
 *   decelerating the conveyor belt into slow-motion for detailed shot inspection.
 */

const L6 = 200;
const BW3 = 28;
const BT2 = 5;
const NC = 4;
const SPEED = 1 / 10;
const GATE = L6 * 0.6;
const GH = 42;

// Tight-cropped viewBox focused on the active track, tables, gate, and cue stick
const VB_X = 64;
const VB_Y = 88;
const VB_W = 256;
const VB_H = 176;
const ASPECT = VB_W / VB_H; // ~1.4545

const rad = (d: number) => (d * Math.PI) / 180;
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const poly = (pts: [number, number][]) =>
  'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';
const seg = (a: [number, number], b: [number, number]) =>
  `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
const openPath = (pts: [number, number][]) =>
  pts.length < 2
    ? ''
    : 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L');

// Smooth scaling as tables enter and exit the belt
const tableScale = (u: number) => {
  const a = clamp(Math.min(u, 1 - u) / 0.1, 0, 1);
  return a * a * (3 - 2 * a);
};

// Gate beam glow intensity as tables pass through
const gateGlow = (x: number) => {
  const d = Math.abs(x - GATE);
  return d < 22 ? Math.cos((Math.PI / 2) * (d / 22)) ** 2 : 0;
};

// Exact Slow Isometric Camera
const Cam = (azDeg: number, k: number, S: number) => ({
  az: rad(azDeg),
  k,
  S,
  ox: 0,
  oy: 0,
});
function proj(C: ReturnType<typeof Cam>) {
  const c = Math.cos(C.az),
    s = Math.sin(C.az),
    zf = Math.sqrt(1 - C.k * C.k);
  return (x: number, y: number, z: number): [number, number] => {
    const X = x * c - y * s,
      Y = x * s + y * c;
    return [C.ox + C.S * X, C.oy + C.S * (Y * C.k - z * zf)];
  };
}
function unproj(C: ReturnType<typeof Cam>, sx: number, sy: number, z: number) {
  const c = Math.cos(C.az),
    s = Math.sin(C.az),
    zf = Math.sqrt(1 - C.k * C.k);
  const X = (sx - C.ox) / C.S,
    Y = ((sy - C.oy) / C.S + z * zf) / C.k;
  return [X * c + Y * s, -X * s + Y * c];
}
function fit(
  C: ReturnType<typeof Cam>,
  pts: [number, number, number][],
  cx: number,
  cy: number
) {
  C.ox = 0;
  C.oy = 0;
  const P = proj(C);
  let a = 1e9,
    b = -1e9,
    c = 1e9,
    d = -1e9;
  for (const p of pts) {
    const q = P(p[0], p[1], p[2]);
    a = Math.min(a, q[0]);
    b = Math.max(b, q[0]);
    c = Math.min(c, q[1]);
    d = Math.max(d, q[1]);
  }
  C.ox = cx - (a + b) / 2;
  C.oy = cy - (c + d) / 2;
}

const C = Cam(45, 0.5, 1.8);
fit(
  C,
  [
    [0, 0, 0],
    [L6, BW3, 0],
    [L6, 0, 0],
    [0, BW3, 0],
    [0, 0, GH],
    [GATE, -8, GH],
    [GATE, BW3 + 8, GH],
  ],
  200,
  160
);
const P = proj(C);

export const HairlineTrainingFigure: React.FC<HairlineFigureProps> = ({
  size = 144,
  accent = '#22c55e',
  pointerX = 0,
  pointerY = 0,
  isHovered = false,
  autoPlay = true,
}) => {
  const containerRef = useRef<View>(null);

  // Conveyor animation clock & dynamics
  const [clock, setClock] = useState(2.4);
  const [hotTable, setHotTable] = useState<number>(-1);
  const rateRef = useRef({ x: 1.0, target: 1.0 });
  const liftsRef = useRef<number[]>([0, 0, 0, 0]);
  const pointerOverRef = useRef<[number, number] | null>(null);


  // Main 60fps animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let currentClock = 2.4;

    const tick = (now: number) => {
      const dt = Math.min(0.045, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      // Spring rate interpolation for smooth slow-motion deceleration/acceleration
      rateRef.current.x += (rateRef.current.target - rateRef.current.x) * 0.14;
      currentClock += dt * rateRef.current.x;
      setClock(currentClock);

      // Determine hot table nearest to mouse cursor
      const over = pointerOverRef.current;
      let want = -1;
      if (over) {
        let bestDist = 36;
        for (let j = 0; j < NC; j++) {
          const q = j / NC + currentClock * SPEED;
          const u = q - Math.floor(q);
          const x = u * L6;
          const s = tableScale(u);
          if (s > 0.45 && Math.abs(x - over[0]) < bestDist) {
            bestDist = Math.abs(x - over[0]);
            want = j;
          }
        }
      }
      setHotTable(want);

      // Spring lift interpolation for each table
      for (let j = 0; j < NC; j++) {
        const targetLift = j === want ? 11 : 0;
        liftsRef.current[j] += (targetLift - liftsRef.current[j]) * 0.22;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const figureH = Math.round(size / ASPECT);

  // Pointer event handlers over the figure
  const handlePointerMove = (e: any) => {
    if (Platform.OS !== 'web') return;
    const clientX = e.clientX ?? e.nativeEvent?.clientX;
    const clientY = e.clientY ?? e.nativeEvent?.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

    const target = e.currentTarget;
    if (!target?.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Normalizing mouse to SVG coordinates
    const px = VB_X + ((clientX - rect.left) / rect.width) * VB_W;
    const py = VB_Y + ((clientY - rect.top) / rect.height) * VB_H;

    // Unprojecting to conveyor belt coordinates
    const un = unproj(C, px, py, BT2);
    pointerOverRef.current = [un[0], un[1]];
    rateRef.current.target = 0.18; // Slow down!
  };

  const handlePointerLeave = () => {
    pointerOverRef.current = null;
    rateRef.current.target = 1.0;
    setHotTable(-1);
  };

  // ── Precomputed Fixed Static Geometry ──
  // Conveyor Belt Base
  const bP0 = P(0, 0, 0);
  const bP1 = P(L6, 0, 0);
  const bP2 = P(L6, BW3, 0);
  const bP3 = P(0, BW3, 0);
  const beltTop0 = P(0, 0, BT2);
  const beltTop1 = P(L6, 0, BT2);
  const beltTop2 = P(L6, BW3, BT2);
  const beltTop3 = P(0, BW3, BT2);

  const beltFloorD = poly([bP0, bP1, bP2, bP3]);
  const beltTopD = poly([beltTop0, beltTop1, beltTop2, beltTop3]);
  const beltSideD = poly([bP1, bP2, beltTop2, beltTop1]);
  const beltFrontD = poly([bP0, bP3, beltTop3, beltTop0]);

  // Inspection Gate Arch at GATE
  const gateL0 = P(GATE - 3, -7, 0);
  const gateL1 = P(GATE + 3, -7, 0);
  const gateLTop1 = P(GATE + 3, -7, GH);
  const gateLTop0 = P(GATE - 3, -7, GH);
  const gateLeftPostD = poly([gateL0, gateL1, gateLTop1, gateLTop0]);

  const gateR0 = P(GATE - 3, BW3 + 7, 0);
  const gateR1 = P(GATE + 3, BW3 + 7, 0);
  const gateRTop1 = P(GATE + 3, BW3 + 7, GH);
  const gateRTop0 = P(GATE - 3, BW3 + 7, GH);
  const gateRightPostD = poly([gateR0, gateR1, gateRTop1, gateRTop0]);

  const gateTopBarD = poly([gateLTop0, gateRTop0, gateRTop1, gateLTop1]);

  // Billiard Cue Stick resting alongside the conveyor
  const cueTip = P(25, -13, 1);
  const cueButt = P(175, -13, 1);
  const cueWrap = P(140, -13, 1);
  const cueShaftLine = seg(cueTip, cueWrap);
  const cueButtLine = seg(cueWrap, cueButt);

  // Moving Slats on the belt
  const slatOffset = ((clock * SPEED * L6) % 20 + 20) % 20;
  const slatLines: string[] = [];
  for (let sx = slatOffset; sx < L6; sx += 20) {
    if (sx > 6 && sx < L6 - 6) {
      slatLines.push(seg(P(sx, 3, BT2), P(sx, BW3 - 3, BT2)));
    }
  }

  // ── Compute Multiple Billiard Tables ──
  const tables = useMemo(() => {
    const list = [];
    for (let j = 0; j < NC; j++) {
      const q = j / NC + clock * SPEED;
      const u = q - Math.floor(q);
      const x = u * L6;
      const s = tableScale(u);
      const isHot = j === hotTable;
      const lift = liftsRef.current[j];
      const z = BT2 + lift;

      if (s < 0.15) continue;

      const tw = 38 * s;
      const th = 19 * s;
      const midY = BW3 / 2;

      // Table Top Outer Frame
      const f1 = P(x - tw / 2, midY - th / 2, z + 5.5 * s);
      const f2 = P(x + tw / 2, midY - th / 2, z + 5.5 * s);
      const f3 = P(x + tw / 2, midY + th / 2, z + 5.5 * s);
      const f4 = P(x - tw / 2, midY + th / 2, z + 5.5 * s);
      const tableOuterD = poly([f1, f2, f3, f4]);

      // Table Thickness Skirt
      const fb1 = P(x - tw / 2, midY - th / 2, z + 2 * s);
      const fb2 = P(x + tw / 2, midY - th / 2, z + 2 * s);
      const fb3 = P(x + tw / 2, midY + th / 2, z + 2 * s);
      const fb4 = P(x - tw / 2, midY + th / 2, z + 2 * s);
      const skirtRightD = poly([f2, f3, fb3, fb2]);
      const skirtFrontD = poly([f3, f4, fb4, fb3]);

      // Pedestal Legs Underneath (with bottom arch cutout)
      const legL1 = P(x - 14 * s, midY - 6 * s, z);
      const legL2 = P(x - 4 * s, midY - 6 * s, z);
      const legL3 = P(x - 4 * s, midY + 6 * s, z);
      const legL4 = P(x - 14 * s, midY + 6 * s, z);
      const legTopL1 = P(x - 14 * s, midY - 6 * s, z + 2 * s);
      const legTopL2 = P(x - 4 * s, midY - 6 * s, z + 2 * s);
      const legTopL3 = P(x - 4 * s, midY + 6 * s, z + 2 * s);
      const legTopL4 = P(x - 14 * s, midY + 6 * s, z + 2 * s);
      const legLeftD = poly([legL3, legL4, legTopL4, legTopL3]);

      const legR1 = P(x + 4 * s, midY - 6 * s, z);
      const legR2 = P(x + 14 * s, midY - 6 * s, z);
      const legR3 = P(x + 14 * s, midY + 6 * s, z);
      const legR4 = P(x + 4 * s, midY + 6 * s, z);
      const legTopR1 = P(x + 4 * s, midY - 6 * s, z + 2 * s);
      const legTopR2 = P(x + 14 * s, midY - 6 * s, z + 2 * s);
      const legTopR3 = P(x + 14 * s, midY + 6 * s, z + 2 * s);
      const legTopR4 = P(x + 4 * s, midY + 6 * s, z + 2 * s);
      const legRightD = poly([legR3, legR4, legTopR4, legTopR3]);

      // Inner Cushion Boundary with 45° beveled pocketless corners
      const c1 = P(x - tw / 2 + 3.2 * s, midY - th / 2 + 2.8 * s, z + 5.5 * s);
      const c2 = P(x + tw / 2 - 3.2 * s, midY - th / 2 + 2.8 * s, z + 5.5 * s);
      const c3 = P(x + tw / 2 - 1.6 * s, midY - th / 2 + 4.2 * s, z + 5.5 * s);
      const c4 = P(x + tw / 2 - 1.6 * s, midY + th / 2 - 4.2 * s, z + 5.5 * s);
      const c5 = P(x + tw / 2 - 3.2 * s, midY + th / 2 - 2.8 * s, z + 5.5 * s);
      const c6 = P(x - tw / 2 + 3.2 * s, midY + th / 2 - 2.8 * s, z + 5.5 * s);
      const c7 = P(x - tw / 2 + 1.6 * s, midY + th / 2 - 4.2 * s, z + 5.5 * s);
      const c8 = P(x - tw / 2 + 1.6 * s, midY - th / 2 + 4.2 * s, z + 5.5 * s);
      const cushionD = poly([c1, c2, c3, c4, c5, c6, c7, c8]);

      // Cushion Miters to Frame Corners
      const miters = [
        seg(c1, P(x - tw / 2 + 1.5 * s, midY - th / 2 + 1.5 * s, z + 5.5 * s)),
        seg(c2, P(x + tw / 2 - 1.5 * s, midY - th / 2 + 1.5 * s, z + 5.5 * s)),
        seg(c5, P(x + tw / 2 - 1.5 * s, midY + th / 2 - 1.5 * s, z + 5.5 * s)),
        seg(c6, P(x - tw / 2 + 1.5 * s, midY + th / 2 - 1.5 * s, z + 5.5 * s)),
      ];

      // Rail Diamonds
      const diamonds: [number, number][] = [];
      [-9, -3, 3, 9].forEach((dx) => {
        diamonds.push(P(x + dx * s, midY - th / 2 + 1.4 * s, z + 5.5 * s));
        diamonds.push(P(x + dx * s, midY + th / 2 - 1.4 * s, z + 5.5 * s));
      });
      [-3, 0, 3].forEach((dy) => {
        diamonds.push(P(x - tw / 2 + 1.4 * s, midY + dy * s, z + 5.5 * s));
        diamonds.push(P(x + tw / 2 - 1.4 * s, midY + dy * s, z + 5.5 * s));
      });

      // 3 Billiard Balls in Perspective (Matching User's Diagram)
      const redBall = P(x - 7 * s, midY + 1.5 * s, z + 6.2 * s);
      const whiteBall = P(x + 7 * s, midY - 2 * s, z + 6.2 * s);
      const yellowBall = P(x + 9.5 * s, midY - 0.5 * s, z + 6.2 * s);

      // 3-Cushion Trajectory Vector with Rebound Paths
      const r1 = P(x + 6 * s, midY - th / 2 + 2.8 * s, z + 5.8 * s);
      const r2 = P(x + tw / 2 - 1.6 * s, midY - 1 * s, z + 5.8 * s);
      const r3 = P(x + 1 * s, midY + th / 2 - 2.8 * s, z + 5.8 * s);
      const trajPts = [whiteBall, yellowBall, r1, r2, r3, redBall];
      const trajD = openPath(trajPts);

      list.push({
        j,
        x,
        s,
        isHot,
        tableOuterD,
        skirtRightD,
        skirtFrontD,
        legLeftD,
        legRightD,
        cushionD,
        miters,
        diamonds,
        whiteBall,
        yellowBall,
        redBall,
        trajD,
      });
    }

    // Sort tables by depth along the track so front tables occlude back ones
    return list.sort((a, b) => a.x - b.x);
  }, [clock, hotTable]);

  // Overall Gate Laser Glow percentage
  let maxGateGlow = 0;
  tables.forEach((t) => {
    maxGateGlow = Math.max(maxGateGlow, gateGlow(t.x) * t.s);
  });

  return (
    <View
      ref={containerRef}
      style={[styles.container, { width: size, height: figureH }]}
      // @ts-ignore
      onPointerMove={handlePointerMove}
      // @ts-ignore
      onPointerLeave={handlePointerLeave}
      onTouchMove={(e) => {
        const locX = e.nativeEvent.locationX;
        if (typeof locX === 'number' && size > 0) {
          const px = VB_X + (locX / size) * VB_W;
          const un = unproj(C, px, 160, BT2);
          pointerOverRef.current = [un[0], un[1]];
          rateRef.current.target = 0.18;
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
          <RadialGradient id="slowTrainingGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── 1. Soft Floor Shadow beneath the Track ── */}
        <Polygon
          points="70,126 94,116 324,250 298,272"
          fill="rgba(0,0,0,0.4)"
        />

        {/* ── 2. Conveyor Belt Track (Prism) ── */}
        <Path
          d={beltFloorD}
          fill="#050a12"
          stroke="#1e293b"
          strokeWidth="0.8"
        />
        <Path
          d={beltSideD}
          fill="#0a1420"
          stroke="#334155"
          strokeWidth="0.8"
        />
        <Path
          d={beltFrontD}
          fill="#0a1420"
          stroke="#334155"
          strokeWidth="0.8"
        />
        <Path
          d={beltTopD}
          fill="#08101a"
          stroke="#475569"
          strokeWidth="0.9"
        />

        {/* Moving Slats on the Conveyor */}
        {slatLines.map((slatD, sIdx) => (
          <Path
            key={`slat-${sIdx}`}
            d={slatD}
            stroke="#1e293b"
            strokeWidth="0.75"
          />
        ))}

        {/* ── 3. Cue Stick Resting Beside the Track ── */}
        <Path
          d={cueShaftLine}
          stroke="#cbd5e1"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <Path
          d={cueButtLine}
          stroke="#94a3b8"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* ── 4. The 3D Billiard Tables Riding on the Belt ── */}
        {tables.map((table) => {
          const strokeColor = table.isHot ? accent : '#64748b';
          const fillColor = table.isHot ? '#0b1e16' : '#08101a';
          const rBall = 1.8 * table.s;

          return (
            <G key={`table-${table.j}`}>
              {/* Pedestal Legs */}
              <Path
                d={table.legLeftD}
                fill="#050a12"
                stroke="#334155"
                strokeWidth="0.7"
              />
              <Path
                d={table.legRightD}
                fill="#050a12"
                stroke="#334155"
                strokeWidth="0.7"
              />

              {/* Table Thickness Skirt */}
              <Path
                d={table.skirtRightD}
                fill="#0a1622"
                stroke="#334155"
                strokeWidth="0.8"
              />
              <Path
                d={table.skirtFrontD}
                fill="#0c1a26"
                stroke="#334155"
                strokeWidth="0.8"
              />

              {/* Table Top Outer Frame */}
              <Path
                d={table.tableOuterD}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={table.isHot ? 1.5 : 0.85}
                strokeLinejoin="round"
              />

              {/* Inner Cushion Boundary */}
              <Path
                d={table.cushionD}
                fill={table.isHot ? 'rgba(34,197,94,0.14)' : 'rgba(15,23,42,0.6)'}
                stroke={strokeColor}
                strokeWidth={table.isHot ? 1.3 : 0.75}
                strokeLinejoin="round"
              />

              {/* Cushion Corner Miters */}
              {table.miters.map((miterD, mIdx) => (
                <Path
                  key={`miter-${mIdx}`}
                  d={miterD}
                  stroke="#334155"
                  strokeWidth="0.6"
                />
              ))}

              {/* Rail Diamonds */}
              {table.diamonds.map((dia, dIdx) => (
                <Circle
                  key={`dia-${dIdx}`}
                  cx={dia[0]}
                  cy={dia[1]}
                  r={0.65 * table.s}
                  fill={table.isHot ? '#ffffff' : '#64748b'}
                  fillOpacity={0.8}
                />
              ))}

              {/* 3 Billiard Balls */}
              {/* White Cue Ball */}
              <Circle
                cx={table.whiteBall[0]}
                cy={table.whiteBall[1]}
                r={rBall}
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="0.45"
              />
              {/* Yellow Object Ball */}
              <Circle
                cx={table.yellowBall[0]}
                cy={table.yellowBall[1]}
                r={rBall}
                fill="#facc15"
                stroke="#ca8a04"
                strokeWidth="0.45"
              />
              {/* Red Carom Ball */}
              <Circle
                cx={table.redBall[0]}
                cy={table.redBall[1]}
                r={rBall * 1.05}
                fill="#ef4444"
                stroke="#dc2626"
                strokeWidth="0.45"
              />

              {/* 3-Cushion Trajectory Ricochet Line */}
              <Path
                d={table.trajD}
                fill="none"
                stroke={table.isHot ? accent : '#94a3b8'}
                strokeWidth={table.isHot ? 1.3 : 0.75}
                strokeDasharray="2.5,2"
                strokeOpacity={table.isHot ? 0.95 : 0.45}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Carom Point Star on Red Ball when Hovered */}
              {table.isHot && (
                <Circle
                  cx={table.redBall[0]}
                  cy={table.redBall[1]}
                  r={4.2 * table.s}
                  fill="none"
                  stroke={accent}
                  strokeWidth="0.7"
                  strokeDasharray="1.5,1.5"
                />
              )}
            </G>
          );
        })}

        {/* ── 5. Inspection / Scanner Gate Arch ── */}
        <Path
          d={gateLeftPostD}
          fill="#0c1626"
          stroke={maxGateGlow > 0.2 ? accent : '#475569'}
          strokeWidth="0.9"
        />
        <Path
          d={gateRightPostD}
          fill="#0c1626"
          stroke={maxGateGlow > 0.2 ? accent : '#475569'}
          strokeWidth="0.9"
        />
        <Path
          d={gateTopBarD}
          fill="#0f1d2e"
          stroke={maxGateGlow > 0.2 ? accent : '#64748b'}
          strokeWidth="1.1"
        />

        {/* Laser Scanner Beam when Table passes through */}
        {maxGateGlow > 0.15 && (
          <Circle
            cx={P(GATE, BW3 / 2, GH)[0]}
            cy={P(GATE, BW3 / 2, GH)[1] + 10}
            r="26"
            fill="url(#slowTrainingGlow)"
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
});
