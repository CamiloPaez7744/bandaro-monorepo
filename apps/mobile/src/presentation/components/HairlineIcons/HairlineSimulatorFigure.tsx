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
  Ellipse,
} from 'react-native-svg';
import { HairlineFigureProps } from './HairlineTrainingFigure';

/**
 * HairlineSimulatorFigure
 * 3D Isometric Carom Billiard Table Simulator:
 * Modeled precisely on the user's technical diagram:
 * - 3D isometric carom billiard table (pocketless).
 * - Rounded outer wooden frame with double-beveled stepped rail molding.
 * - Apron/skirt dropping down with molded bottom trim.
 * - TWO solid pedestal legs underneath, each featuring the distinct arched cutout at the base.
 * - Soft ambient floor shadow cast on the ground.
 * - Inner cloth bed with 45° beveled cushion corners.
 * - Rail diamonds: 7 on each long rail, 3 on each short rail.
 * - 3 Carom Balls: White (cue), Yellow (object), Red (carom), with 3D specular shine and cloth shadows.
 * - 3-Cushion Trajectory: Dashed vector path with directional arrows ricocheting off cushions into the red ball.
 * - NO cue stick ("solo la mesa sin el taco").
 * - Interactive dynamics: pointer movement creates subtle 3D parallax and activates cushion impact pulses.
 */

const VB_X = 24;
const VB_Y = 4;
const VB_W = 228;
const VB_H = 152;
const ASPECT = VB_W / VB_H; // 1.50

const r2 = (n: number) => Math.round(n * 100) / 100;
const poly = (pts: [number, number][]) =>
  'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z';

export const HairlineSimulatorFigure: React.FC<HairlineFigureProps> = ({
  size = 116,
  accent = '#a78bfa',
  pointerX = 0,
  pointerY = 0,
  isHovered = false,
  autoPlay = true,
}) => {
  const [animTime, setAnimTime] = useState(0);
  const [isLocalHovered, setIsLocalHovered] = useState(false);
  const [localPointer, setLocalPointer] = useState({ x: 0, y: 0 });
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let frameId: number | null = null;
    let active = true;
    let start = performance.now();
    let lastTime = 0;
    const FRAME_INTERVAL = 1000 / 20; // 20 FPS throttle

    const tick = (now: number) => {
      if (!active) return;
      if (typeof document !== 'undefined' && document.hidden) {
        frameId = null;
        return;
      }
      if (!lastTime) lastTime = now;
      const delta = now - lastTime;
      if (delta >= FRAME_INTERVAL) {
        lastTime = now - (delta % FRAME_INTERVAL);
        const dt = (now - start) / 1000;
        setAnimTime(dt);
      }
      frameId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (!frameId) {
        lastTime = 0;
        frameId = requestAnimationFrame(tick);
      }
    };

    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = null;
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
      if (frameId) cancelAnimationFrame(frameId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, []);

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

  // Subtle interactive 3D tilt offset strictly when hovering the icon SVG
  const tiltX = isLocalHovered ? localPointer.x * 3.5 : Math.sin(animTime * 1.2) * 1.5;
  const tiltY = isLocalHovered ? localPointer.y * 2.5 : Math.cos(animTime * 1.2) * 1.0;

  // Base isometric projection parameters
  // Long rail axis (u in [0, 1]): runs from front-center towards upper-right
  // Short rail axis (v in [0, 1]): runs from front-center towards upper-left
  // Height axis (z in px): downwards
  const x0 = 106 + tiltX * 0.4;
  const y0 = 102 + tiltY * 0.4;
  const Ux = 144 + tiltX * 0.2;
  const Uy = -55 + tiltY * 0.2;
  const Vx = -68 - tiltX * 0.2;
  const Vy = -42 + tiltY * 0.2;

  const P = (u: number, v: number, z: number = 0): [number, number] => [
    x0 + u * Ux + v * Vx,
    y0 + u * Uy + v * Vy + z,
  ];

  // ── 1. Floor Drop Shadow ───────────────────────────────────────────
  // Soft shadow projected towards lower-left
  const shadowPts: [number, number][] = [
    [x0 + 0.05 * Ux + 0.95 * Vx - 20, y0 + 0.05 * Uy + 0.95 * Vy + 52],
    [x0 + 0.95 * Ux + 0.95 * Vx - 16, y0 + 0.95 * Uy + 0.95 * Vy + 50],
    [x0 + 0.98 * Ux + 0.05 * Vx - 12, y0 + 0.98 * Uy + 0.05 * Vy + 52],
    [x0 + 0.02 * Ux + 0.02 * Vx - 24, y0 + 0.02 * Uy + 0.02 * Vy + 54],
  ];
  const shadowD = poly(shadowPts);

  // ── 2. Pedestal Legs with Arched Cutouts ────────────────────────────
  // Left Pedestal: u in [0.18, 0.40], v around 0.16 to 0.62, z from 16 to 43
  const l_u1 = 0.18;
  const l_u2 = 0.40;
  const l_vF = 0.16; // Front face
  const l_vB = 0.62; // Back depth
  const zLegTop = 16;
  const zLegFloor = 43;
  const zArchPeak = 33; // Arched cutout apex

  // Left Leg Front Face with Arch Path
  const ll_TL = P(l_u1, l_vF, zLegTop);
  const ll_TR = P(l_u2, l_vF, zLegTop);
  const ll_BR = P(l_u2, l_vF, zLegFloor);
  const ll_ArchR = P(l_u1 + 0.16, l_vF, zLegFloor);
  const ll_ArchApex = P((l_u1 + l_u2) / 2, l_vF, zArchPeak);
  const ll_ArchL = P(l_u1 + 0.06, l_vF, zLegFloor);
  const ll_BL = P(l_u1, l_vF, zLegFloor);

  const leftLegFrontD =
    `M${r2(ll_TL[0])} ${r2(ll_TL[1])}` +
    `L${r2(ll_TR[0])} ${r2(ll_TR[1])}` +
    `L${r2(ll_BR[0])} ${r2(ll_BR[1])}` +
    `L${r2(ll_ArchR[0])} ${r2(ll_ArchR[1])}` +
    `Q${r2(ll_ArchApex[0])} ${r2(ll_ArchApex[1])} ${r2(ll_ArchL[0])} ${r2(ll_ArchL[1])}` +
    `L${r2(ll_BL[0])} ${r2(ll_BL[1])}Z`;

  // Left Leg Side Face (showing depth along short axis)
  const ll_SideTR = ll_TL;
  const ll_SideBR = ll_BL;
  const ll_SideTL = P(l_u1, l_vB, zLegTop);
  const ll_SideBL = P(l_u1, l_vB, zLegFloor);
  const leftLegSideD = poly([ll_SideTL, ll_SideTR, ll_SideBR, ll_SideBL]);

  // Left Leg Arch Underside Bevel (3D depth inside the arch)
  const ll_ArchApexBack = P((l_u1 + l_u2) / 2, l_vF + 0.15, zArchPeak);
  const ll_ArchLBack = P(l_u1 + 0.06, l_vF + 0.15, zLegFloor);
  const leftLegArchSoffitD =
    `M${r2(ll_ArchL[0])} ${r2(ll_ArchL[1])}` +
    `Q${r2(ll_ArchApex[0])} ${r2(ll_ArchApex[1])} ${r2(ll_ArchR[0])} ${r2(ll_ArchR[1])}` +
    `L${r2(ll_ArchApexBack[0])} ${r2(ll_ArchApexBack[1])}` +
    `L${r2(ll_ArchLBack[0])} ${r2(ll_ArchLBack[1])}Z`;

  // Right Pedestal: u in [0.62, 0.84], v around 0.16 to 0.62
  const r_u1 = 0.62;
  const r_u2 = 0.84;
  const rl_TL = P(r_u1, l_vF, zLegTop);
  const rl_TR = P(r_u2, l_vF, zLegTop);
  const rl_BR = P(r_u2, l_vF, zLegFloor);
  const rl_ArchR = P(r_u1 + 0.16, l_vF, zLegFloor);
  const rl_ArchApex = P((r_u1 + r_u2) / 2, l_vF, zArchPeak);
  const rl_ArchL = P(r_u1 + 0.06, l_vF, zLegFloor);
  const rl_BL = P(r_u1, l_vF, zLegFloor);

  const rightLegFrontD =
    `M${r2(rl_TL[0])} ${r2(rl_TL[1])}` +
    `L${r2(rl_TR[0])} ${r2(rl_TR[1])}` +
    `L${r2(rl_BR[0])} ${r2(rl_BR[1])}` +
    `L${r2(rl_ArchR[0])} ${r2(rl_ArchR[1])}` +
    `Q${r2(rl_ArchApex[0])} ${r2(rl_ArchApex[1])} ${r2(rl_ArchL[0])} ${r2(rl_ArchL[1])}` +
    `L${r2(rl_BL[0])} ${r2(rl_BL[1])}Z`;

  const rl_SideTL = P(r_u1, l_vB, zLegTop);
  const rl_SideBL = P(r_u1, l_vB, zLegFloor);
  const rightLegSideD = poly([rl_SideTL, rl_TL, rl_BL, rl_SideBL]);

  // ── 3. Table Chassis Aprons (Vertical Skirts) ──────────────────────
  // Front-Left Short Skirt (facing viewer along short rail)
  const skL_T0 = P(0.02, 0.03, 0);
  const skL_T1 = P(0.02, 0.97, 0);
  const skL_B1 = P(0.02, 0.97, 16);
  const skL_B0 = P(0.02, 0.03, 16);
  const skirtLeftD = poly([skL_T0, skL_T1, skL_B1, skL_B0]);

  // Front-Left Lower Molding Line
  const skL_M0 = P(0.02, 0.03, 13);
  const skL_M1 = P(0.02, 0.97, 13);
  const skirtLeftMolding = `M${r2(skL_M0[0])} ${r2(skL_M0[1])}L${r2(skL_M1[0])} ${r2(skL_M1[1])}`;

  // Front-Right Long Skirt (facing viewer along long rail)
  const skR_T0 = P(0.02, 0.03, 0);
  const skR_T1 = P(0.98, 0.03, 0);
  const skR_B1 = P(0.98, 0.03, 16);
  const skR_B0 = P(0.02, 0.03, 16);
  const skirtRightD = poly([skR_T0, skR_T1, skR_B1, skR_B0]);

  // Front-Right Lower Molding Line
  const skR_M0 = P(0.02, 0.03, 13);
  const skR_M1 = P(0.98, 0.03, 13);
  const skirtRightMolding = `M${r2(skR_M0[0])} ${r2(skR_M0[1])}L${r2(skR_M1[0])} ${r2(skR_M1[1])}`;

  // ── 4. Wooden Rail Outer Rim (Beveled & Chamfered) ──────────────────
  // Chamfered outer polygon for rounded furniture feel
  const outerRimPts: [number, number][] = [
    P(0.03, 0.0, 0),
    P(0.97, 0.0, 0),
    P(1.0, 0.03, 0),
    P(1.0, 0.97, 0),
    P(0.97, 1.0, 0),
    P(0.03, 1.0, 0),
    P(0.0, 0.97, 0),
    P(0.0, 0.03, 0),
  ];
  const outerRimD = poly(outerRimPts);

  // Stepped Inner Bevel Groove
  const bevelRimPts: [number, number][] = [
    P(0.045, 0.03, 0),
    P(0.955, 0.03, 0),
    P(0.97, 0.05, 0),
    P(0.97, 0.95, 0),
    P(0.955, 0.97, 0),
    P(0.045, 0.97, 0),
    P(0.03, 0.95, 0),
    P(0.03, 0.05, 0),
  ];
  const bevelRimD = poly(bevelRimPts);

  // ── 5. Inner Playing Bed (Cloth Felt & Pocketless Cushions) ─────────
  // Carom cushion inner boundary: pocketless with 45° corner bevels
  const cu_uMin = 0.085;
  const cu_uMax = 0.915;
  const cu_vMin = 0.125;
  const cu_vMax = 0.875;
  const miter = 0.025; // 45° beveled corner

  const cushionPts: [number, number][] = [
    P(cu_uMin + miter, cu_vMin, 0),
    P(cu_uMax - miter, cu_vMin, 0),
    P(cu_uMax, cu_vMin + miter, 0),
    P(cu_uMax, cu_vMax - miter, 0),
    P(cu_uMax - miter, cu_vMax, 0),
    P(cu_uMin + miter, cu_vMax, 0),
    P(cu_uMin, cu_vMax - miter, 0),
    P(cu_uMin, cu_vMin + miter, 0),
  ];
  const cushionRimD = poly(cushionPts);

  // Inner Playfield Cloth Bed (recessed slightly at z = 2.5)
  const feltPts: [number, number][] = [
    P(cu_uMin + miter, cu_vMin, 2.5),
    P(cu_uMax - miter, cu_vMin, 2.5),
    P(cu_uMax, cu_vMin + miter, 2.5),
    P(cu_uMax, cu_vMax - miter, 2.5),
    P(cu_uMax - miter, cu_vMax, 2.5),
    P(cu_uMin + miter, cu_vMax, 2.5),
    P(cu_uMin, cu_vMax - miter, 2.5),
    P(cu_uMin, cu_vMin + miter, 2.5),
  ];
  const feltBedD = poly(feltPts);

  // Cushion Nose Sloped Bevels (showing 3D cushion faces)
  // Front-right cushion slope (long rail)
  const cFr_T0 = P(cu_uMin + miter, cu_vMin, 0);
  const cFr_T1 = P(cu_uMax - miter, cu_vMin, 0);
  const cFr_B1 = P(cu_uMax - miter, cu_vMin, 2.5);
  const cFr_B0 = P(cu_uMin + miter, cu_vMin, 2.5);
  const cushionFrontRightD = poly([cFr_T0, cFr_T1, cFr_B1, cFr_B0]);

  // Front-left cushion slope (short rail)
  const cFl_T0 = P(cu_uMin, cu_vMin + miter, 0);
  const cFl_T1 = P(cu_uMin, cu_vMax - miter, 0);
  const cFl_B1 = P(cu_uMin, cu_vMax - miter, 2.5);
  const cFl_B0 = P(cu_uMin, cu_vMin + miter, 2.5);
  const cushionFrontLeftD = poly([cFl_T0, cFl_T1, cFl_B1, cFl_B0]);

  // Back-right cushion slope
  const cBr_T0 = P(cu_uMax, cu_vMin + miter, 0);
  const cBr_T1 = P(cu_uMax, cu_vMax - miter, 0);
  const cBr_B1 = P(cu_uMax, cu_vMax - miter, 2.5);
  const cBr_B0 = P(cu_uMax, cu_vMin + miter, 2.5);
  const cushionBackRightD = poly([cBr_T0, cBr_T1, cBr_B1, cBr_B0]);

  // Back-left cushion slope
  const cBl_T0 = P(cu_uMin + miter, cu_vMax, 0);
  const cBl_T1 = P(cu_uMax - miter, cu_vMax, 0);
  const cBl_B1 = P(cu_uMax - miter, cu_vMax, 2.5);
  const cBl_B0 = P(cu_uMin + miter, cu_vMax, 2.5);
  const cushionBackLeftD = poly([cBl_T0, cBl_T1, cBl_B1, cBl_B0]);

  // ── 6. Rail Diamonds (Inlaid Sights) ────────────────────────────────
  // Helper to draw a tiny isometric diamond rhombus
  const diamondPath = (u: number, v: number): string => {
    const cp = P(u, v, 0);
    const du = 0.007;
    const dv = 0.012;
    const p1 = P(u + du, v, 0);
    const p2 = P(u, v + dv, 0);
    const p3 = P(u - du, v, 0);
    const p4 = P(u, v - dv, 0);
    return poly([p1, p2, p3, p4]);
  };

  // 7 diamonds on each long rail, 3 on each short rail
  const longUSteps = [1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8];
  const shortVSteps = [1 / 4, 2 / 4, 3 / 4];

  const diamondPaths = useMemo(() => {
    const dList: string[] = [];
    // Front-Right Long Rail (v = 0.055)
    longUSteps.forEach((u) => dList.push(diamondPath(u, 0.055)));
    // Front-Left Short Rail (u = 0.045)
    shortVSteps.forEach((v) => dList.push(diamondPath(0.045, v)));
    // Back-Left Long Rail (v = 0.945)
    longUSteps.forEach((u) => dList.push(diamondPath(u, 0.945)));
    // Back-Right Short Rail (u = 0.955)
    shortVSteps.forEach((v) => dList.push(diamondPath(0.955, v)));
    return dList;
  }, [x0, y0, Ux, Uy, Vx, Vy]);

  // ── 7. The 3 Carom Balls ───────────────────────────────────────────
  // Positioned directly matching the user's diagram:
  // Red ball: lower-left region
  // White ball: upper-right region
  // Yellow ball: near white ball
  const redU = 0.30;
  const redV = 0.44;
  const whiteU = 0.72;
  const whiteV = 0.62;
  const yellowU = 0.80;
  const yellowV = 0.56;

  const redCenter = P(redU, redV, 2.5);
  const whiteCenter = P(whiteU, whiteV, 2.5);
  const yellowCenter = P(yellowU, yellowV, 2.5);
  const rBall = 4.8;

  // ── 8. 3-Cushion Trajectory with Arrowheads ─────────────────────────
  // Path matching user reference:
  // 1: White -> Yellow contact
  // 2: -> Cushion 1 (top-left rail: v = 0.875)
  // 3: -> Cushion 2 (top-right short rail: u = 0.915)
  // 4: -> Cushion 3 (front-right long rail: v = 0.125)
  // 5: -> Red Ball carom hit!
  // 6: Rebound from Red ball -> front-left short cushion (u = 0.085)
  const c1Point = P(0.68, cu_vMax, 2.5);
  const c2Point = P(cu_uMax, 0.42, 2.5);
  const c3Point = P(0.36, cu_vMin, 2.5);
  const cShortPoint = P(cu_uMin, 0.40, 2.5);

  // Directional arrow generator
  const makeArrow = (from: [number, number], to: [number, number], offsetDist: number = 3.5): string => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy);
    if (len < 5) return '';
    const nx = dx / len;
    const ny = dy / len;
    const px = -ny;
    const py = nx;

    // Arrow tip positioned slightly before target point
    const tipX = to[0] - nx * offsetDist;
    const tipY = to[1] - ny * offsetDist;
    const arrowLen = 5.2;
    const arrowHalfWidth = 2.8;

    const b1X = tipX - nx * arrowLen + px * arrowHalfWidth;
    const b1Y = tipY - ny * arrowLen + py * arrowHalfWidth;
    const b2X = tipX - nx * arrowLen - px * arrowHalfWidth;
    const b2Y = tipY - ny * arrowLen - py * arrowHalfWidth;

    return `M${r2(tipX)} ${r2(tipY)}L${r2(b1X)} ${r2(b1Y)}L${r2(b2X)} ${r2(b2Y)}Z`;
  };

  const arrow1 = makeArrow(whiteCenter, yellowCenter, 5);
  const arrow2 = makeArrow(yellowCenter, c1Point, 3);
  const arrow3 = makeArrow(c1Point, c2Point, 3);
  const arrow4 = makeArrow(c2Point, c3Point, 3);
  const arrow5 = makeArrow(c3Point, redCenter, 5);
  const arrow6 = makeArrow(redCenter, cShortPoint, 3);

  // Segments for dashed lines
  const seg1 = `M${r2(whiteCenter[0])} ${r2(whiteCenter[1])}L${r2(yellowCenter[0])} ${r2(yellowCenter[1])}`;
  const seg2 = `M${r2(yellowCenter[0])} ${r2(yellowCenter[1])}L${r2(c1Point[0])} ${r2(c1Point[1])}`;
  const seg3 = `M${r2(c1Point[0])} ${r2(c1Point[1])}L${r2(c2Point[0])} ${r2(c2Point[1])}`;
  const seg4 = `M${r2(c2Point[0])} ${r2(c2Point[1])}L${r2(c3Point[0])} ${r2(c3Point[1])}`;
  const seg5 = `M${r2(c3Point[0])} ${r2(c3Point[1])}L${r2(redCenter[0])} ${r2(redCenter[1])}`;
  const seg6 = `M${r2(redCenter[0])} ${r2(redCenter[1])}L${r2(cShortPoint[0])} ${r2(cShortPoint[1])}`;

  // Pulse animation on cushion impacts
  const pulse = Math.sin(animTime * 4) * 0.5 + 0.5;

  const containerW = Math.round(size * 1.42);
  const containerH = Math.round(containerW / ASPECT);

  return (
    <View
      style={[styles.container, { width: containerW, height: containerH }]}
      // @ts-ignore
      onPointerMove={handlePointerMove}
      // @ts-ignore
      onPointerEnter={handlePointerMove}
      // @ts-ignore
      onPointerLeave={handlePointerLeave}
      onTouchMove={(e) => {
        const locX = e.nativeEvent.locationX;
        const locY = e.nativeEvent.locationY;
        if (typeof locX === 'number' && typeof locY === 'number' && containerW > 0) {
          const nx = (locX / containerW - 0.5) * 2;
          const ny = (locY / containerH - 0.5) * 2;
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
          {/* Floor Shadow Radial Gradient */}
          <RadialGradient id="simFloorShadow" cx="45%" cy="50%" r="55%">
            <Stop offset="0%" stopColor="#020617" stopOpacity="0.65" />
            <Stop offset="60%" stopColor="#020617" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </RadialGradient>

          {/* Playing Bed Cloth Felt Gradient */}
          <LinearGradient id="caromFelt" x1="20%" y1="0%" x2="80%" y2="100%">
            <Stop offset="0%" stopColor="#141c30" />
            <Stop offset="45%" stopColor="#0f1627" />
            <Stop offset="100%" stopColor="#080e1b" />
          </LinearGradient>

          {/* Front-Right Long Apron Skirt Gradient */}
          <LinearGradient id="skirtLongGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#18233a" />
            <Stop offset="50%" stopColor="#121b2d" />
            <Stop offset="100%" stopColor="#0b111e" />
          </LinearGradient>

          {/* Front-Left Short Apron Skirt Gradient */}
          <LinearGradient id="skirtShortGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#1f2c48" />
            <Stop offset="100%" stopColor="#141d31" />
          </LinearGradient>

          {/* Pedestal Leg Face Gradient */}
          <LinearGradient id="legFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#141d2e" />
            <Stop offset="100%" stopColor="#0a0f1a" />
          </LinearGradient>

          {/* Pedestal Leg Side Gradient */}
          <LinearGradient id="legSideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0d1421" />
            <Stop offset="100%" stopColor="#060910" />
          </LinearGradient>

          {/* Red Ball 3D Specular Highlight */}
          <RadialGradient id="redBallGrad" cx="35%" cy="30%" r="65%">
            <Stop offset="0%" stopColor="#fca5a5" />
            <Stop offset="30%" stopColor="#ef4444" />
            <Stop offset="75%" stopColor="#dc2626" />
            <Stop offset="100%" stopColor="#7f1d1d" />
          </RadialGradient>

          {/* Yellow Ball 3D Specular Highlight */}
          <RadialGradient id="yellowBallGrad" cx="35%" cy="30%" r="65%">
            <Stop offset="0%" stopColor="#fef08a" />
            <Stop offset="30%" stopColor="#facc15" />
            <Stop offset="75%" stopColor="#eab308" />
            <Stop offset="100%" stopColor="#854d0e" />
          </RadialGradient>

          {/* White Ball 3D Specular Highlight */}
          <RadialGradient id="whiteBallGrad" cx="35%" cy="30%" r="65%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="45%" stopColor="#f1f5f9" />
            <Stop offset="80%" stopColor="#cbd5e1" />
            <Stop offset="100%" stopColor="#94a3b8" />
          </RadialGradient>

          {/* Accent Glow for Carom Impact */}
          <RadialGradient id="caromPingGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── 1. Soft Floor Shadow ─────────────────────────────────── */}
        <Path d={shadowD} fill="url(#simFloorShadow)" />

        {/* ── 2. Pedestal Legs with Arched Cutouts ──────────────────── */}
        {/* Left Pedestal Side Face */}
        <Path
          d={leftLegSideD}
          fill="url(#legSideGrad)"
          stroke="#1e293b"
          strokeWidth="0.75"
        />
        {/* Left Pedestal Arch Soffit */}
        <Path
          d={leftLegArchSoffitD}
          fill="#05080f"
          stroke="#1e293b"
          strokeWidth="0.5"
        />
        {/* Left Pedestal Front Face */}
        <Path
          d={leftLegFrontD}
          fill="url(#legFaceGrad)"
          stroke="#334155"
          strokeWidth="0.85"
          strokeLinejoin="round"
        />

        {/* Right Pedestal Side Face */}
        <Path
          d={rightLegSideD}
          fill="url(#legSideGrad)"
          stroke="#1e293b"
          strokeWidth="0.75"
        />
        {/* Right Pedestal Front Face */}
        <Path
          d={rightLegFrontD}
          fill="url(#legFaceGrad)"
          stroke="#334155"
          strokeWidth="0.85"
          strokeLinejoin="round"
        />

        {/* ── 3. Table Chassis Aprons (Vertical Skirts) ─────────────── */}
        {/* Front-Left Short Apron */}
        <Path
          d={skirtLeftD}
          fill="url(#skirtShortGrad)"
          stroke="#475569"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <Path
          d={skirtLeftMolding}
          stroke="#64748b"
          strokeWidth="0.7"
          strokeOpacity="0.6"
        />

        {/* Front-Right Long Apron */}
        <Path
          d={skirtRightD}
          fill="url(#skirtLongGrad)"
          stroke="#475569"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <Path
          d={skirtRightMolding}
          stroke="#64748b"
          strokeWidth="0.7"
          strokeOpacity="0.6"
        />

        {/* ── 4. Wooden Rail Outer Rim (Beveled & Chamfered) ────────── */}
        <Path
          d={outerRimD}
          fill="#1c273e"
          stroke="#64748b"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Stepped Inner Bevel Groove */}
        <Path
          d={bevelRimD}
          fill="#162034"
          stroke="#475569"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />

        {/* ── 5. Cushions & Pocketless Felt Bed ──────────────────────── */}
        {/* Outer Cushion Perimeter */}
        <Path
          d={cushionRimD}
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />

        {/* Cushion Nose Slopes (3D Cushion Bevels) */}
        <Path d={cushionBackLeftD} fill="#182338" />
        <Path d={cushionBackRightD} fill="#151e32" />
        <Path d={cushionFrontLeftD} fill="#1e2c46" />
        <Path d={cushionFrontRightD} fill="#111a2c" />

        {/* Inner Cloth Bed (Carom Playing Surface) */}
        <Path
          d={feltBedD}
          fill="url(#caromFelt)"
          stroke={accent}
          strokeWidth="0.6"
          strokeOpacity="0.4"
          strokeLinejoin="round"
        />

        {/* ── 6. Rail Diamonds (14 on long rails, 6 on short rails) ─── */}
        {diamondPaths.map((dPath, dIdx) => (
          <Path
            key={`diamond-${dIdx}`}
            d={dPath}
            fill="#e2e8f0"
            fillOpacity={0.88}
            stroke="#94a3b8"
            strokeWidth="0.3"
          />
        ))}

        {/* ── 7. 3-Cushion Trajectory Ricochet Path ─────────────────── */}
        {/* Step 1: White -> Yellow */}
        <Path
          d={seg1}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.1"
          strokeDasharray="3,2.5"
          strokeOpacity={0.7}
        />
        {/* Step 2: Yellow -> Cushion 1 */}
        <Path
          d={seg2}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.1"
          strokeDasharray="3,2.5"
          strokeOpacity={0.7}
        />
        {/* Step 3: Cushion 1 -> Cushion 2 */}
        <Path
          d={seg3}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.1"
          strokeDasharray="3,2.5"
          strokeOpacity={0.7}
        />
        {/* Step 4: Cushion 2 -> Cushion 3 */}
        <Path
          d={seg4}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.1"
          strokeDasharray="3,2.5"
          strokeOpacity={0.7}
        />
        {/* Step 5: Cushion 3 -> Red Ball */}
        <Path
          d={seg5}
          fill="none"
          stroke={isLocalHovered ? accent : '#cbd5e1'}
          strokeWidth={isLocalHovered ? 1.3 : 1.1}
          strokeDasharray="3,2.5"
          strokeOpacity={isLocalHovered ? 0.95 : 0.7}
        />
        {/* Step 6: Red Ball -> Front-Left Short Cushion */}
        <Path
          d={seg6}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="0.9"
          strokeDasharray="2.5,2.5"
          strokeOpacity={0.5}
        />

        {/* Directional Arrowheads matching diagram */}
        <Path d={arrow1} fill="#e2e8f0" />
        <Path d={arrow2} fill="#e2e8f0" />
        <Path d={arrow3} fill="#e2e8f0" />
        <Path d={arrow4} fill="#e2e8f0" />
        <Path d={arrow5} fill={isLocalHovered ? accent : '#e2e8f0'} />
        <Path d={arrow6} fill="#94a3b8" />

        {/* Cushion Impact Ping Waves */}
        <Circle
          cx={c1Point[0]}
          cy={c1Point[1]}
          r={2.2 + pulse * 1.5}
          fill="none"
          stroke={accent}
          strokeWidth="0.7"
          strokeOpacity={0.75 - pulse * 0.4}
        />
        <Circle
          cx={c2Point[0]}
          cy={c2Point[1]}
          r={2.2 + pulse * 1.5}
          fill="none"
          stroke={accent}
          strokeWidth="0.7"
          strokeOpacity={0.75 - pulse * 0.4}
        />
        <Circle
          cx={c3Point[0]}
          cy={c3Point[1]}
          r={2.2 + pulse * 1.5}
          fill="none"
          stroke={accent}
          strokeWidth="0.7"
          strokeOpacity={0.75 - pulse * 0.4}
        />

        {/* ── 8. The 3 Billiard Balls ───────────────────────────────── */}
        {/* Ball Contact Shadows on Felt */}
        <Ellipse
          cx={redCenter[0] + 0.8}
          cy={redCenter[1] + 2.2}
          rx={rBall * 0.95}
          ry={rBall * 0.55}
          fill="rgba(0,0,0,0.45)"
        />
        <Ellipse
          cx={whiteCenter[0] + 0.8}
          cy={whiteCenter[1] + 2.2}
          rx={rBall * 0.95}
          ry={rBall * 0.55}
          fill="rgba(0,0,0,0.45)"
        />
        <Ellipse
          cx={yellowCenter[0] + 0.8}
          cy={yellowCenter[1] + 2.2}
          rx={rBall * 0.95}
          ry={rBall * 0.55}
          fill="rgba(0,0,0,0.45)"
        />

        {/* Red Ball (Carom Target) */}
        <Circle
          cx={redCenter[0]}
          cy={redCenter[1]}
          r={rBall}
          fill="url(#redBallGrad)"
          stroke="#b91c1c"
          strokeWidth="0.45"
        />

        {/* Yellow Ball (Object Ball) */}
        <Circle
          cx={yellowCenter[0]}
          cy={yellowCenter[1]}
          r={rBall}
          fill="url(#yellowBallGrad)"
          stroke="#ca8a04"
          strokeWidth="0.45"
        />

        {/* White Ball (Cue Ball) */}
        <Circle
          cx={whiteCenter[0]}
          cy={whiteCenter[1]}
          r={rBall}
          fill="url(#whiteBallGrad)"
          stroke="#cbd5e1"
          strokeWidth="0.45"
        />

        {/* Carom Point Starburst when Hovered / Active */}
        {isLocalHovered && (
          <G transform={`translate(${redCenter[0]}, ${redCenter[1]})`}>
            <Circle cx="0" cy="0" r="10" fill="url(#caromPingGlow)" />
            <Circle
              cx="0"
              cy="0"
              r={rBall + 2}
              fill="none"
              stroke={accent}
              strokeWidth="0.8"
              strokeDasharray="2,2"
            />
          </G>
        )}
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
