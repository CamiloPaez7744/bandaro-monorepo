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
import { HairlineFigureProps } from './HairlineTrainingFigure';

/**
 * HairlineCatalogFigure
 * The authentic Hairline Riffle billiard catalog icon:
 * - Tight-cropped viewBox (72 36 260 234) removing all wasted padding,
 *   maximizing the icon's size inside the card without any distortion.
 * - Exact Hairline isometric camera and geometry.
 * - Exact 2D linear system solver for cursor hit detection: decomposing the screen
 *   coordinates into the card index (i) and height along the card face (v).
 * - Smooth spring wave interpolation on requestAnimationFrame for the signature
 *   accordion wave ripple.
 * - Each card displays a complete billiard table croquis (frame, cushions, miters,
 *   diamonds, 3 balls, and trajectory).
 */

const N8 = 8;
const W10 = 84;
const H6 = 54;
const G3 = 13;
const TW2 = 22;
const TH4 = 7;
const TABS = [6, 31, 56];
const TK2 = 1.4;
const REST13 = -12;
const BACK = -24;
const FWD = 20;
const LIFT5 = 16;
const X06 = -5;
const X12 = W10 + 5;
const Y02 = -9;
const Y1 = (N8 - 1) * G3 + 9;

// Tight-cropped viewBox bounding the entire figure (cards, tray, shadow, lift)
const VB_X = 72;
const VB_Y = 36;
const VB_W = 260;
const VB_H = 234;
const ASPECT = VB_W / VB_H; // ~1.1111

const rad = (d: number) => (d * Math.PI) / 180;
const r2 = (n: number) => Math.round(n * 100) / 100;
const poly = (pts: [number, number][]) =>
  'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';
const seg = (a: [number, number], b: [number, number]) =>
  `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
const openPath = (pts: [number, number][]) =>
  pts.length < 2
    ? ''
    : 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L');

// Exact Isometric Camera & Fitting
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

const C = Cam(45, 0.5, 1.62);
fit(
  C,
  [
    [X06, Y02, 0],
    [X12, Y1, -8],
    [X12, Y02, 0],
    [X06, Y1, 0],
    [X06, Y02, H6 + TH4],
    [X12, Y02, H6 + TH4 + LIFT5],
  ],
  200,
  166
);
const P = proj(C);

// Fillet helper for smooth card corner curves
function fillet(pts: [number, number][], rs: number[], n = 4) {
  const m = pts.length;
  const out: [number, number][] = [];
  for (let i = 0; i < m; i++) {
    const a = pts[(i + m - 1) % m];
    const p = pts[i];
    const b = pts[(i + 1) % m];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const t = Math.min(rs[i], la / 2, lb / 2);
    const p1: [number, number] = [
      p[0] + ((a[0] - p[0]) / la) * t,
      p[1] + ((a[1] - p[1]) / la) * t,
    ];
    const p2: [number, number] = [
      p[0] + ((b[0] - p[0]) / lb) * t,
      p[1] + ((b[1] - p[1]) / lb) * t,
    ];
    for (let j = 0; j <= n; j++) {
      const s = j / n;
      const w = 1 - s;
      out.push([
        w * w * p1[0] + 2 * w * s * p[0] + s * s * p2[0],
        w * w * p1[1] + 2 * w * s * p[1] + s * s * p2[1],
      ]);
    }
  }
  return out;
}

function card(i: number) {
  const t0 = TABS[(N8 - 1 - i) % 3];
  const shape = fillet(
    [
      [0, 0],
      [W10, 0],
      [W10, H6],
      [t0 + TW2, H6],
      [t0 + TW2, H6 + TH4],
      [t0, H6 + TH4],
      [t0, H6],
      [0, H6],
    ],
    [1, 1, 3.2, 1.8, 2.4, 2.4, 1.8, 3.2]
  );
  return { t0, shape };
}

const CARDS_META = Array.from({ length: N8 }).map((_, i) => card(i));

// Precomputed 2D linear system solver reference vectors for hit testing
const pTop0 = P(42, 0 * G3 + H6 * Math.sin(rad(REST13)), H6 * Math.cos(rad(REST13)));
const pBot0 = P(42, 0 * G3, 0);
const pTop1 = P(42, 1 * G3 + H6 * Math.sin(rad(REST13)), H6 * Math.cos(rad(REST13)));

const Sx = pTop1[0] - pTop0[0]; // -14.8917
const Sy = pTop1[1] - pTop0[1]; // 7.4458
const Fx = (pBot0[0] - pTop0[0]) / H6; // -0.2387
const Fy = (pBot0[1] - pTop0[1]) / H6; // 1.4911
const detSolver = Sx * Fy - Sy * Fx; // -20.424

function solveCardFromScreen(X: number, Y: number): number {
  const dx = X - pTop0[0];
  const dy = Y - pTop0[1];
  const cardI = (dx * Fy - dy * Fx) / detSolver;
  const cardV = (Sx * dy - Sy * dx) / detSolver;

  if (cardI < -0.6 || cardI > 7.6 || cardV < -15 || cardV > 70) {
    return -1;
  }
  return Math.max(0, Math.min(7, Math.round(cardI)));
}

export const HairlineCatalogFigure: React.FC<HairlineFigureProps> = ({
  size = 142,
  accent = '#38bdf8',
  pointerX = 0,
  isHovered = false,
}) => {
  const [activeCard, setActiveCard] = useState<number>(7);
  const containerRef = useRef<View>(null);

  // Animated card angles and lifts
  const [angles, setAngles] = useState<number[]>(() =>
    Array.from({ length: N8 }).map((_, i) => (i === 7 ? 0 : REST13))
  );
  const [lifts, setLifts] = useState<number[]>(() =>
    Array.from({ length: N8 }).map((_, i) => (i === 7 ? LIFT5 : 0))
  );

  const anglesRef = useRef(angles);
  const liftsRef = useRef(lifts);
  anglesRef.current = angles;
  liftsRef.current = lifts;


  // Smooth physical spring wave animation loop
  useEffect(() => {
    let animId: number;
    let running = true;

    const tick = () => {
      if (!running) return;
      let moving = false;
      const nextAngles = [...anglesRef.current];
      const nextLifts = [...liftsRef.current];

      for (let i = 0; i < N8; i++) {
        let targetTh = REST13;
        let targetLift = 0;

        if (activeCard >= 0) {
          if (i < activeCard) {
            targetTh = BACK; // -24° lean back
            targetLift = 0;
          } else if (i === activeCard) {
            targetTh = 0; // 0° stand upright
            targetLift = LIFT5; // 16px lift
          } else {
            targetTh = FWD; // +20° lean forward
            targetLift = 0;
          }
        }

        const dTh = targetTh - nextAngles[i];
        const dLift = targetLift - nextLifts[i];

        if (Math.abs(dTh) > 0.08 || Math.abs(dLift) > 0.08) {
          nextAngles[i] += dTh * 0.32;
          nextLifts[i] += dLift * 0.32;
          moving = true;
        } else {
          nextAngles[i] = targetTh;
          nextLifts[i] = targetLift;
        }
      }

      if (moving) {
        setAngles(nextAngles);
        setLifts(nextLifts);
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [activeCard]);

  // Height maintaining strict aspect ratio without letterboxing
  const figureH = Math.round(size / ASPECT);

  // Pointer event handlers on the icon container
  const handlePointerMove = (e: any) => {
    if (Platform.OS !== 'web') return;
    const clientX = e.clientX ?? e.nativeEvent?.clientX;
    const clientY = e.clientY ?? e.nativeEvent?.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

    const target = e.currentTarget;
    if (!target?.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Normalizing mouse to tight-cropped SVG coordinate space
    const rx = (clientX - rect.left) / rect.width;
    const ry = (clientY - rect.top) / rect.height;
    const px = VB_X + rx * VB_W;
    const py = VB_Y + ry * VB_H;

    const hitIdx = solveCardFromScreen(px, py);
    if (hitIdx >= 0) {
      setActiveCard(hitIdx);
    }
  };

  const handlePointerLeave = () => {
    setActiveCard(7);
  };

  // Generate 3D projected geometry for all 8 cards
  const cardsData = useMemo(() => {
    return Array.from({ length: N8 }).map((_, i) => {
      const isSelected = i === activeCard;
      const th = angles[i];
      const lift = lifts[i];
      const { t0, shape } = CARDS_META[i];

      const yb = i * G3;
      const sAng = Math.sin(rad(th));
      const cAng = Math.cos(rad(th));

      const w = (u: number, v: number): [number, number] => {
        const p = P(u, yb + v * sAng, v * cAng + lift);
        return [Number(p[0].toFixed(2)), Number(p[1].toFixed(2))];
      };

      const wb = (u: number, v: number): [number, number] => {
        const p = P(u, yb + v * sAng - TK2 * cAng, v * cAng + TK2 * sAng + lift);
        return [Number(p[0].toFixed(2)), Number(p[1].toFixed(2))];
      };

      // Card Face & Back Polygons
      const facePts = shape.map((p) => w(p[0], p[1]));
      const backPts = shape.map((p) => wb(p[0], p[1]));

      const faceD = poly(facePts);
      const backD = poly(backPts);

      // Tab Punch Dots
      const punchDots: [number, number][] = [];
      for (let k = 0; k < 8; k++) {
        punchDots.push(
          w(
            t0 + TW2 / 2 + (k % 4 - 1.5) * 3.6,
            H6 + TH4 / 2 + (0.5 - Math.floor(k / 4)) * 2.8
          )
        );
      }

      // Outer table frame polygon (2:1 ratio)
      const f1 = w(8, 8),
        f2 = w(76, 8),
        f3 = w(76, 42),
        f4 = w(8, 42);
      const tableOuterD = poly([f1, f2, f3, f4]);

      // Inner Cushion Boundary with 45° beveled pocketless corners
      const c1 = w(14, 12),
        c2 = w(70, 12),
        c3 = w(72.5, 14.5),
        c4 = w(72.5, 35.5),
        c5 = w(70, 38),
        c6 = w(14, 38),
        c7 = w(11.5, 35.5),
        c8 = w(11.5, 14.5);
      const tableCushionD = poly([c1, c2, c3, c4, c5, c6, c7, c8]);

      // Cushion corner bevel lines
      const miters = [
        seg(c1, w(10, 8)),
        seg(c2, w(74, 8)),
        seg(c5, w(74, 42)),
        seg(c6, w(10, 42)),
      ];

      // Rail Diamonds
      const diamonds: [number, number][] = [];
      [21, 28, 35, 42, 49, 56, 63].forEach((u) => {
        diamonds.push(w(u, 10));
        diamonds.push(w(u, 40));
      });
      [18.5, 25, 31.5].forEach((v) => {
        diamonds.push(w(9.5, v));
        diamonds.push(w(74.5, v));
      });

      // 3 Billiard Balls in perspective
      const whiteBall = w(53, 27);
      const yellowBall = w(57, 29);
      const redBall = w(30, 18);

      // 3-Cushion Trajectory Vector
      const trajPts = [
        whiteBall,
        yellowBall,
        w(72.5, 37),
        w(50, 38),
        w(36, 12),
        w(11.5, 28),
        redBall,
      ];
      const trajD = openPath(trajPts);

      return {
        i,
        isSelected,
        faceD,
        backD,
        punchDots,
        tableOuterD,
        tableCushionD,
        miters,
        diamonds,
        whiteBall,
        yellowBall,
        redBall,
        trajD,
      };
    });
  }, [angles, lifts, activeCard]);

  // Render individual card SVG components
  const renderCard = (cardItem: (typeof cardsData)[0]) => {
    const strokeMain = cardItem.isSelected ? accent : '#64748b';
    const fillCard = cardItem.isSelected ? '#0b1626' : '#08101a';

    return (
      <G
        key={`card-${cardItem.i}`}
        // @ts-ignore
        onPointerEnter={() => setActiveCard(cardItem.i)}
      >
        {/* Card Back / Thickness */}
        <Path
          d={cardItem.backD}
          fill="#050a12"
          stroke="#1e293b"
          strokeWidth="0.8"
        />

        {/* Card Face Plate with Rounded Corners & Top Tab */}
        <Path
          d={cardItem.faceD}
          fill={fillCard}
          stroke={strokeMain}
          strokeWidth={cardItem.isSelected ? 1.5 : 0.8}
          strokeLinejoin="round"
        />

        {/* Tab Punch Dots */}
        {cardItem.punchDots.map((dot, didx) => (
          <Circle
            key={`dot-${didx}`}
            cx={dot[0]}
            cy={dot[1]}
            r={cardItem.isSelected ? 1.05 : 0.85}
            fill={cardItem.isSelected ? '#ffffff' : '#475569'}
            fillOpacity={cardItem.isSelected ? 0.95 : 0.45}
          />
        ))}

        {/* ── BILLIARD TABLE CROQUIS ON THE CARD ── */}
        {/* Outer Frame */}
        <Path
          d={cardItem.tableOuterD}
          fill="none"
          stroke={cardItem.isSelected ? accent : '#475569'}
          strokeWidth={cardItem.isSelected ? 1.25 : 0.65}
          strokeOpacity={cardItem.isSelected ? 0.95 : 0.55}
        />

        {/* Cushion Inner Rail Line with 45° Corners */}
        <Path
          d={cardItem.tableCushionD}
          fill={cardItem.isSelected ? 'rgba(56,189,248,0.1)' : 'none'}
          stroke={cardItem.isSelected ? accent : '#334155'}
          strokeWidth={cardItem.isSelected ? 1.15 : 0.6}
          strokeOpacity={cardItem.isSelected ? 1 : 0.5}
          strokeLinejoin="round"
        />

        {/* Pocket Corner Bevel Miter Lines */}
        {cardItem.miters.map((miterD, midx) => (
          <Path
            key={`miter-${midx}`}
            d={miterD}
            stroke={cardItem.isSelected ? accent : '#334155'}
            strokeWidth="0.6"
            strokeOpacity={0.5}
          />
        ))}

        {/* Rail Diamonds */}
        {cardItem.diamonds.map((dia, didx) => (
          <Circle
            key={`dia-${didx}`}
            cx={dia[0]}
            cy={dia[1]}
            r={cardItem.isSelected ? 0.9 : 0.6}
            fill={cardItem.isSelected ? '#ffffff' : '#64748b'}
            fillOpacity={cardItem.isSelected ? 0.9 : 0.5}
          />
        ))}

        {/* 3 Billiard Balls in Perspective */}
        <Circle
          cx={cardItem.whiteBall[0]}
          cy={cardItem.whiteBall[1]}
          r={1.8}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="0.5"
        />
        <Circle
          cx={cardItem.yellowBall[0]}
          cy={cardItem.yellowBall[1]}
          r={1.8}
          fill="#facc15"
          stroke="#ca8a04"
          strokeWidth="0.5"
        />
        <Circle
          cx={cardItem.redBall[0]}
          cy={cardItem.redBall[1]}
          r={1.9}
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth="0.5"
        />

        {/* 3-Cushion Trajectory Ricochet Line */}
        <Path
          d={cardItem.trajD}
          fill="none"
          stroke={cardItem.isSelected ? accent : '#94a3b8'}
          strokeWidth={cardItem.isSelected ? 1.25 : 0.7}
          strokeDasharray="2.5,2"
          strokeOpacity={cardItem.isSelected ? 0.95 : 0.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Impact Pulse on Red Ball */}
        {cardItem.isSelected && (
          <Circle
            cx={cardItem.redBall[0]}
            cy={cardItem.redBall[1]}
            r={3.8}
            fill="none"
            stroke={accent}
            strokeWidth="0.65"
            strokeDasharray="1.5,1.5"
          />
        )}
      </G>
    );
  };

  // Render order: unselected cards first, active lifted card ON TOP so it's never covered
  const unselectedCards = cardsData.filter((c) => !c.isSelected);
  const heroCard = cardsData.find((c) => c.isSelected);

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
        const locY = e.nativeEvent.locationY;
        if (typeof locX === 'number' && typeof locY === 'number' && size > 0) {
          const rx = locX / size;
          const ry = locY / figureH;
          const px = VB_X + rx * VB_W;
          const py = VB_Y + ry * VB_H;
          const hitIdx = solveCardFromScreen(px, py);
          if (hitIdx >= 0) setActiveCard(hitIdx);
        }
      }}
      onTouchEnd={() => setActiveCard(7)}
    >
      <Svg
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        width="100%"
        height="100%"
      >
        <Defs>
          <RadialGradient id="riffleAccGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── 1. Soft Floor Shadow beneath the Tray ── */}
        <Polygon
          points="84,212 192,266 314,204 206,160"
          fill="rgba(0,0,0,0.45)"
        />

        {/* ── 2. Back Body of the Tray (Behind the Cards) ── */}
        <Polygon
          points="208.59 116.98, 316.27 170.82, 312.24 170.82, 208.59 118.5"
          fill="#0a121e"
          stroke="#334155"
          strokeWidth="0.8"
        />

        {/* ── 3. Unselected Cards in the Deck ── */}
        {unselectedCards.map(renderCard)}

        {/* ── 4. Active Hero Card (Rendered ON TOP for 100% visibility) ── */}
        {heroCard && renderCard(heroCard)}

        {/* ── 5. Front Body of the Isometric Tray ── */}
        <Path
          d="M91.64 179.41L91.84 180.17L92.43 180.87L93.35 181.48L187.28 228.44L188.49 228.91L189.9 229.2L191.41 229.3L192.92 229.2L194.32 228.91L195.53 228.44L306.65 172.89L307.57 172.28L308.16 171.58L308.36 170.82L312.24 170.82L312.24 198.88L311.91 200.14L310.94 201.31L309.4 202.32L198.28 257.88L196.27 258.65L193.92 259.13L191.41 259.3L188.89 259.13L186.55 258.65L184.54 257.88L90.6 210.91L89.06 209.9L88.09 208.73L87.76 207.47L87.76 179.41Z"
          fill="#0c1626"
          stroke={accent}
          strokeWidth="0.9"
          strokeOpacity="0.5"
        />

        {/* Tray Inner Upper Lip */}
        <Path
          d="M91.64 179.41L91.84 180.17L92.43 180.87L93.35 181.48L187.28 228.44L188.49 228.91L189.9 229.2L191.41 229.3L192.92 229.2L194.32 228.91L195.53 228.44L306.65 172.89L307.57 172.28L308.16 171.58L308.36 170.82"
          fill="none"
          stroke={accent}
          strokeWidth="1.1"
          strokeOpacity="0.75"
        />

        {/* Tray Outer Lip Silhouette */}
        <Path
          d="M87.76 179.41L87.76 207.47L88.09 208.73L89.06 209.9L90.6 210.91L184.54 257.88L186.55 258.65L188.89 259.13L191.41 259.3L193.92 259.13L196.27 258.65L198.28 257.88L309.4 202.32L310.94 201.31L311.91 200.14L312.24 198.88L312.24 170.82"
          fill="none"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* ── 6. Front Pill Cutout Handle ── */}
        <Path
          d="M150.17 227.37L150 225.98L149.51 224.56L148.75 223.25L147.8 222.18L146.73 221.44L128.41 212.27L127.34 211.95L126.39 212.07L125.63 212.62L125.14 213.55L124.97 214.77L124.97 214.77L125.14 216.15L125.63 217.57L126.39 218.88L127.34 219.96L128.41 220.69L146.73 229.86L147.8 230.18L148.75 230.06L149.51 229.51L150 228.58L150.17 227.37Z"
          fill="#050a12"
          stroke={accent}
          strokeWidth="0.9"
          strokeOpacity="0.8"
        />
        <Path
          d="M148.34 226.45L148.25 225.76L148.01 225.05L147.63 224.39L147.15 223.85L146.62 223.49L128.52 214.44L127.99 214.27L127.51 214.33L127.13 214.61L126.89 215.07L126.8 215.68L126.8 215.68L126.89 216.37L127.13 217.08L127.51 217.74L127.99 218.28L128.52 218.65L146.62 227.69L147.15 227.86L147.63 227.8L148.01 227.52L148.25 227.06L148.34 226.45Z"
          fill="none"
          stroke="#475569"
          strokeWidth="0.6"
        />

        {/* Ambient Glow */}
        <Circle cx="192" cy="180" r="28" fill="url(#riffleAccGlow)" />
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
