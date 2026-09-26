import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText, Image as SvgImage } from 'react-native-svg';

import { resolveBilliardPhysics } from './billiardPhysics';
import { getTableDecalSource } from './tableDecals';
import {
  type TablePreferences,
  type DiamondShape,
  type DiamondCount,
  type WoodFinish,
  useTablePreferences,
  resolveClothPalette,
  resolveWoodPalette,
} from './tablePreferences';

export interface TablePoint {
  x: number; // 0..284
  y: number; // 0..142
}

export interface TrainingPlayTableProps {
  style?: StyleProp<ViewStyle>;
  whiteBall: TablePoint;
  yellowBall: TablePoint;
  redBall: TablePoint;
  redBallColor?: 'red' | 'orange' | 'blue';
  trajectory?: TablePoint[]; // Optional solution path
  trajectoryColor?: string; // Optional trajectory stroke color (e.g. category color)
  isSimulating?: boolean;
  onSimulationEnd?: () => void;
  showGrid?: boolean;
  showDiamondNumbers?: boolean;
  clothColor?: string;
  diamondShape?: DiamondShape;
  diamondCount?: DiamondCount;
  showCornerDiamonds?: boolean;
  woodFinish?: WoodFinish;
  preferences?: Partial<TablePreferences>;
}

const TABLE_W = 284;
const TABLE_H = 142;
const BALL_R = 2.8; // Visual radius in scale (more proportional and tournament-accurate)
const RAIL_T = 11;   // Outer wood rail thickness
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
  redBallColor = 'red',
  trajectory = [],
  trajectoryColor = '#4edea3',
  isSimulating = false,
  onSimulationEnd,
  showGrid = true,
  showDiamondNumbers = false,
  clothColor = 'tournament_blue',
  diamondShape = 'rhombus',
  diamondCount = '9_5',
  showCornerDiamonds = true,
  woodFinish = 'ebony',
  preferences,
}: TrainingPlayTableProps) {
  const { preferences: reactivePrefs } = useTablePreferences(preferences);
  const effectivePrefs = reactivePrefs;
  const tableUid = useMemo(() => `tpt_${Math.random().toString(36).slice(2, 8)}`, []);
  const activeClothColor = effectivePrefs?.clothColor ?? clothColor;
  const activeDiamondShape = effectivePrefs?.diamondShape ?? diamondShape;
  const activeDiamondCount = effectivePrefs?.diamondCount ?? diamondCount;
  const activeShowCorners = effectivePrefs?.showCornerDiamonds ?? showCornerDiamonds;
  const activeShowGrid = effectivePrefs?.showGrid ?? showGrid;
  const activeShowNumbers = effectivePrefs?.showDiamondNumbers ?? showDiamondNumbers;
  const activeWoodFinish = effectivePrefs?.woodFinish ?? woodFinish;
  const activeShowTableDecal = effectivePrefs?.showTableDecal ?? true;
  const activeTableDecal = effectivePrefs?.tableDecal ?? 'blackhole';
  const activeDecalOpacity = effectivePrefs?.decalOpacity ?? 0.20;

  const clothPalette = useMemo(() => resolveClothPalette(activeClothColor), [activeClothColor]);
  const woodPalette = useMemo(() => resolveWoodPalette(activeWoodFinish), [activeWoodFinish]);

  // Enforce physical constraints: balls stay on felt (never inside/over cushions) and never overlap
  const [safeWhite, safeYellow, safeRed] = useMemo(() => {
    return resolveBilliardPhysics([whiteBall, yellowBall, redBall]);
  }, [whiteBall, yellowBall, redBall]);

  // Current animated position of the cue ball (only active during trajectory simulation)
  const [simBallPos, setSimBallPos] = useState<TablePoint | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const effectiveTrajectory = useMemo(() => {
    if (!trajectory || trajectory.length === 0) return [];
    if (trajectory.length === 1) return [];
    const first = trajectory[0];
    if (Math.hypot(first.x - safeWhite.x, first.y - safeWhite.y) > 2.0) {
      return [safeWhite, ...trajectory];
    }
    return trajectory;
  }, [trajectory, safeWhite]);

  // Smooth simulation animation along trajectory path
  useEffect(() => {
    if (!isSimulating || effectiveTrajectory.length < 2) {
      setSimBallPos(null);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let startTime: number | null = null;
    const duration = 2800; // 2.8 seconds full shot execution

    // Compute cumulative segment distances
    const dists: number[] = [0];
    for (let i = 1; i < effectiveTrajectory.length; i++) {
      const dx = effectiveTrajectory[i].x - effectiveTrajectory[i - 1].x;
      const dy = effectiveTrajectory[i].y - effectiveTrajectory[i - 1].y;
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

      const p0 = effectiveTrajectory[segIdx];
      const p1 = effectiveTrajectory[Math.min(segIdx + 1, effectiveTrajectory.length - 1)];

      setSimBallPos({
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
        animFrameRef.current = null;
      }
    };
  }, [isSimulating, effectiveTrajectory, onSimulationEnd]);

  const activeCueBall = isSimulating && simBallPos ? simBallPos : safeWhite;

  // Build SVG path string for trajectory
  const pathD = effectiveTrajectory.length > 1
    ? effectiveTrajectory.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x + PLAY_OFFSET_X} ${p.y + PLAY_OFFSET_Y}`).join(' ')
    : '';

  // Diamonds calculation: 9 on long rails (including corners) or 7, 5 on short rails or 3
  const hasCorners = activeDiamondCount === '9_5' && activeShowCorners;
  const longDiamonds = hasCorners
    ? Array.from({ length: 9 }, (_, i) => i / 8)
    : Array.from({ length: 7 }, (_, i) => (i + 1) / 8);
  const shortDiamonds = hasCorners
    ? Array.from({ length: 5 }, (_, i) => i / 4)
    : Array.from({ length: 3 }, (_, i) => (i + 1) / 4);

  return (
    <View style={[styles.container, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        style={styles.svg}
      >
        <Defs>
          {/* Hardwood Rail Gradient based on woodFinish */}
          <LinearGradient id={`${tableUid}_railGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={woodPalette.start} />
            <Stop offset="50%" stopColor={woodPalette.mid} />
            <Stop offset="100%" stopColor={woodPalette.end} />
          </LinearGradient>

          {/* Dynamic Cloth Radial Gradient (Preset or Custom Hex) */}
          <RadialGradient id={`${tableUid}_clothGrad`} cx="50%" cy="50%" rx="80%" ry="75%">
            <Stop offset="0%" stopColor={clothPalette.highlight} />
            <Stop offset="55%" stopColor={clothPalette.base} />
            <Stop offset="100%" stopColor={clothPalette.edge} />
          </RadialGradient>

          {/* Realistic 3D Ball Spherical Shading */}
          <RadialGradient id={`${tableUid}_whiteBallGrad`} cx="35%" cy="35%" rx="65%" ry="65%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="50%" stopColor="#f1f5f9" />
            <Stop offset="80%" stopColor="#cbd5e1" />
            <Stop offset="100%" stopColor="#94a3b8" />
          </RadialGradient>

          <RadialGradient id={`${tableUid}_yellowBallGrad`} cx="35%" cy="35%" rx="65%" ry="65%">
            <Stop offset="0%" stopColor="#fef08a" />
            <Stop offset="45%" stopColor="#eab308" />
            <Stop offset="80%" stopColor="#ca8a04" />
            <Stop offset="100%" stopColor="#854d0e" />
          </RadialGradient>

          <RadialGradient id={`${tableUid}_redBallGrad`} cx="35%" cy="35%" rx="65%" ry="65%">
            <Stop offset="0%" stopColor="#f87171" />
            <Stop offset="45%" stopColor="#dc2626" />
            <Stop offset="80%" stopColor="#b91c1c" />
            <Stop offset="100%" stopColor="#7f1d1d" />
          </RadialGradient>

          <RadialGradient id={`${tableUid}_orangeBallGrad`} cx="35%" cy="35%" rx="65%" ry="65%">
            <Stop offset="0%" stopColor="#fdba74" />
            <Stop offset="45%" stopColor="#ea580c" />
            <Stop offset="80%" stopColor="#c2410c" />
            <Stop offset="100%" stopColor="#7c2d12" />
          </RadialGradient>

          <RadialGradient id={`${tableUid}_blueBallGrad`} cx="35%" cy="35%" rx="65%" ry="65%">
            <Stop offset="0%" stopColor="#93c5fd" />
            <Stop offset="45%" stopColor="#2563eb" />
            <Stop offset="80%" stopColor="#1d4ed8" />
            <Stop offset="100%" stopColor="#1e3a8a" />
          </RadialGradient>

          <RadialGradient id={`${tableUid}_ballShadow`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
            <Stop offset="70%" stopColor="rgba(0,0,0,0.2)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </RadialGradient>
        </Defs>

        {/* 1. Outer Hardwood Frame with Beveled Corner Radius */}
        <Rect
          x={0}
          y={0}
          width={TOTAL_W}
          height={TOTAL_H}
          rx={8}
          fill={`url(#${tableUid}_railGrad)`}
        />

        {/* Outer Rail Bevel Inset */}
        <Rect
          x={2.5}
          y={2.5}
          width={TOTAL_W - 5}
          height={TOTAL_H - 5}
          rx={6}
          fill="none"
          stroke={woodPalette.bevel}
          strokeWidth={1}
        />

        {/* 2. Diamond Inlays on Rails (Rhombus or Circle) */}
        {/* Top & Bottom Long Rails */}
        {longDiamonds.map((ratio, i) => {
          const x = PLAY_OFFSET_X + ratio * TABLE_W;
          const yTop = RAIL_T * 0.45;
          const yBot = TOTAL_H - RAIL_T * 0.45;
          const dx = 1.3;
          const dy = 2.6;
          return (
            <G key={`long-diamond-${i}`}>
              {activeDiamondShape === 'rhombus' ? (
                <>
                  <Polygon
                    points={`${x},${yTop - dy} ${x + dx},${yTop} ${x},${yTop + dy} ${x - dx},${yTop}`}
                    fill="#ffffff"
                    stroke="#c27803"
                    strokeWidth={0.45}
                    opacity={0.95}
                  />
                  <Polygon
                    points={`${x},${yBot - dy} ${x + dx},${yBot} ${x},${yBot + dy} ${x - dx},${yBot}`}
                    fill="#ffffff"
                    stroke="#c27803"
                    strokeWidth={0.45}
                    opacity={0.95}
                  />
                </>
              ) : (
                <>
                  <Circle cx={x} cy={yTop} r={1.6} fill="#ffffff" stroke="#c27803" strokeWidth={0.35} opacity={0.95} />
                  <Circle cx={x} cy={yBot} r={1.6} fill="#ffffff" stroke="#c27803" strokeWidth={0.35} opacity={0.95} />
                </>
              )}
            </G>
          );
        })}
        {/* Left & Right Short Rails */}
        {shortDiamonds.map((ratio, i) => {
          const y = PLAY_OFFSET_Y + ratio * TABLE_H;
          const xLeft = RAIL_T * 0.45;
          const xRight = TOTAL_W - RAIL_T * 0.45;
          const dx = 2.6;
          const dy = 1.3;
          return (
            <G key={`short-diamond-${i}`}>
              {activeDiamondShape === 'rhombus' ? (
                <>
                  <Polygon
                    points={`${xLeft - dx},${y} ${xLeft},${y - dy} ${xLeft + dx},${y} ${xLeft},${y + dy}`}
                    fill="#ffffff"
                    stroke="#c27803"
                    strokeWidth={0.45}
                    opacity={0.95}
                  />
                  <Polygon
                    points={`${xRight - dx},${y} ${xRight},${y - dy} ${xRight + dx},${y} ${xRight},${y + dy}`}
                    fill="#ffffff"
                    stroke="#c27803"
                    strokeWidth={0.45}
                    opacity={0.95}
                  />
                </>
              ) : (
                <>
                  <Circle cx={xLeft} cy={y} r={1.6} fill="#ffffff" stroke="#c27803" strokeWidth={0.35} opacity={0.95} />
                  <Circle cx={xRight} cy={y} r={1.6} fill="#ffffff" stroke="#c27803" strokeWidth={0.35} opacity={0.95} />
                </>
              )}
            </G>
          );
        })}

        {/* Optional Diamond System Numbers */}
        {activeShowNumbers && (
          <G opacity={0.75}>
            {longDiamonds.map((ratio, i) => {
              const x = PLAY_OFFSET_X + ratio * TABLE_W;
              const val = hasCorners ? i * 10 : (i + 1) * 10;
              return (
                <G key={`diamond-num-long-${i}`}>
                  <SvgText x={x} y={RAIL_T * 0.85} fontSize={4.5} fill="#e2e8f0" textAnchor="middle" fontWeight="bold">
                    {val}
                  </SvgText>
                  <SvgText x={x} y={TOTAL_H - 1.5} fontSize={4.5} fill="#e2e8f0" textAnchor="middle" fontWeight="bold">
                    {val}
                  </SvgText>
                </G>
              );
            })}
            {shortDiamonds.map((ratio, i) => {
              const y = PLAY_OFFSET_Y + ratio * TABLE_H;
              const val = hasCorners ? i * 10 : (i + 1) * 10;
              return (
                <G key={`diamond-num-short-${i}`}>
                  <SvgText x={RAIL_T * 0.75} y={y + 1.5} fontSize={4.5} fill="#e2e8f0" textAnchor="middle" fontWeight="bold">
                    {val}
                  </SvgText>
                  <SvgText x={TOTAL_W - 2.5} y={y + 1.5} fontSize={4.5} fill="#e2e8f0" textAnchor="middle" fontWeight="bold">
                    {val}
                  </SvgText>
                </G>
              );
            })}
          </G>
        )}

        {/* 3. Rubber Cushion Chamfers (Kléber Profile) */}
        <Path
          d={`
            M ${RAIL_T} ${RAIL_T}
            L ${TOTAL_W - RAIL_T} ${RAIL_T}
            L ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y}
            L ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y}
            Z
          `}
          fill={clothPalette.cushionTop}
        />
        <Path
          d={`
            M ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y + TABLE_H}
            L ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y + TABLE_H}
            L ${TOTAL_W - RAIL_T} ${TOTAL_H - RAIL_T}
            L ${RAIL_T} ${TOTAL_H - RAIL_T}
            Z
          `}
          fill={clothPalette.cushionBottom}
        />
        <Path
          d={`
            M ${RAIL_T} ${RAIL_T}
            L ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y}
            L ${PLAY_OFFSET_X} ${PLAY_OFFSET_Y + TABLE_H}
            L ${RAIL_T} ${TOTAL_H - RAIL_T}
            Z
          `}
          fill={clothPalette.cushionLeft}
        />
        <Path
          d={`
            M ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y}
            L ${TOTAL_W - RAIL_T} ${RAIL_T}
            L ${TOTAL_W - RAIL_T} ${TOTAL_H - RAIL_T}
            L ${PLAY_OFFSET_X + TABLE_W} ${PLAY_OFFSET_Y + TABLE_H}
            Z
          `}
          fill={clothPalette.cushionRight}
        />

        {/* 4. Playfield Cloth Surface (Strict 2:1 Ratio, No Pockets) */}
        <Rect
          x={PLAY_OFFSET_X}
          y={PLAY_OFFSET_Y}
          width={TABLE_W}
          height={TABLE_H}
          fill={`url(#${tableUid}_clothGrad)`}
        />

        {/* Cushion Nose Edge Line (Inner boundary of playing felt) */}
        <Rect
          x={PLAY_OFFSET_X}
          y={PLAY_OFFSET_Y}
          width={TABLE_W}
          height={TABLE_H}
          fill="none"
          stroke={clothPalette.cushionNose}
          strokeWidth={0.5}
          opacity={0.35}
        />

        {/* Soft 3D Cushion Overhang Drop Shadow (Hugs only 1.2px of inner cushion perimeter) */}
        <Rect
          x={PLAY_OFFSET_X + 0.5}
          y={PLAY_OFFSET_Y + 0.5}
          width={TABLE_W - 1}
          height={TABLE_H - 1}
          fill="none"
          stroke="rgba(0, 0, 0, 0.22)"
          strokeWidth={1.2}
          opacity={0.6}
        />

        {/* Table Decal / Watermark on Cloth */}
        {activeShowTableDecal && activeTableDecal !== 'none' && (() => {
          const centerX = PLAY_OFFSET_X + TABLE_W / 2;
          const centerY = PLAY_OFFSET_Y + TABLE_H / 2;
          const minDim = Math.min(TABLE_W, TABLE_H);
          const decalSource = getTableDecalSource(activeTableDecal);

          if (decalSource) {
            const decalSize = minDim * 0.78;
            return (
              <SvgImage
                key={`training-decal-${activeTableDecal}`}
                href={decalSource}
                x={centerX - decalSize / 2}
                y={centerY - decalSize / 2}
                width={decalSize}
                height={decalSize}
                opacity={activeDecalOpacity}
                preserveAspectRatio="xMidYMid meet"
              />
            );
          }
          return null;
        })()}

        {/* 8x4 Carom Diamond Aiming Grid (Module of 35.5cm squares) */}
        {activeShowGrid && (
          <G opacity={0.14}>
            {(hasCorners ? longDiamonds.slice(1, -1) : longDiamonds).map((ratio, i) => (
              <Line
                key={`grid-x-${i}`}
                x1={PLAY_OFFSET_X + ratio * TABLE_W}
                y1={PLAY_OFFSET_Y}
                x2={PLAY_OFFSET_X + ratio * TABLE_W}
                y2={PLAY_OFFSET_Y + TABLE_H}
                stroke="#ffffff"
                strokeWidth={0.6}
                strokeDasharray="2.5, 3.5"
              />
            ))}
            {(hasCorners ? shortDiamonds.slice(1, -1) : shortDiamonds).map((ratio, i) => (
              <Line
                key={`grid-y-${i}`}
                x1={PLAY_OFFSET_X}
                y1={PLAY_OFFSET_Y + ratio * TABLE_H}
                x2={PLAY_OFFSET_X + TABLE_W}
                y2={PLAY_OFFSET_Y + ratio * TABLE_H}
                stroke="#ffffff"
                strokeWidth={0.6}
                strokeDasharray="2.5, 3.5"
              />
            ))}
          </G>
        )}

        {/* 5. Solution Trajectory Path (Glow underlay + sharp line in category color) */}
        {pathD ? (
          <G>
            <Path
              d={pathD}
              fill="none"
              stroke={trajectoryColor}
              strokeOpacity={0.32}
              strokeWidth={4.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={pathD}
              fill="none"
              stroke={trajectoryColor}
              strokeWidth={1.9}
              strokeDasharray="3.5, 2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {effectiveTrajectory.length > 1 && (
              <Circle
                cx={effectiveTrajectory[effectiveTrajectory.length - 1].x + PLAY_OFFSET_X}
                cy={effectiveTrajectory[effectiveTrajectory.length - 1].y + PLAY_OFFSET_Y}
                r={2.2}
                fill={trajectoryColor}
                stroke="#ffffff"
                strokeWidth={0.6}
              />
            )}
          </G>
        ) : null}

        {/* 6. Object Ball 2 (Red Ball) */}
        <G>
          <Circle
            cx={safeRed.x + PLAY_OFFSET_X + 1.2}
            cy={safeRed.y + PLAY_OFFSET_Y + 1.6}
            r={BALL_R * 1.05}
            fill={`url(#${tableUid}_ballShadow)`}
          />
          <Circle
            cx={safeRed.x + PLAY_OFFSET_X}
            cy={safeRed.y + PLAY_OFFSET_Y}
            r={BALL_R}
            fill={
              redBallColor === 'blue'
                ? `url(#${tableUid}_blueBallGrad)`
                : redBallColor === 'orange'
                ? `url(#${tableUid}_orangeBallGrad)`
                : `url(#${tableUid}_redBallGrad)`
            }
          />
          {/* Specular glint highlight */}
          <Circle
            cx={safeRed.x + PLAY_OFFSET_X - BALL_R * 0.35}
            cy={safeRed.y + PLAY_OFFSET_Y - BALL_R * 0.35}
            r={BALL_R * 0.25}
            fill="#ffffff"
            opacity={0.65}
          />
        </G>

        {/* 7. Object Ball 1 (Yellow Ball with Aramith Pro-Cup Spots) */}
        <G>
          <Circle
            cx={safeYellow.x + PLAY_OFFSET_X + 1.2}
            cy={safeYellow.y + PLAY_OFFSET_Y + 1.6}
            r={BALL_R * 1.05}
            fill={`url(#${tableUid}_ballShadow)`}
          />
          <Circle
            cx={safeYellow.x + PLAY_OFFSET_X}
            cy={safeYellow.y + PLAY_OFFSET_Y}
            r={BALL_R}
            fill={`url(#${tableUid}_yellowBallGrad)`}
          />
          {/* Specular highlight */}
          <Circle
            cx={safeYellow.x + PLAY_OFFSET_X - BALL_R * 0.35}
            cy={safeYellow.y + PLAY_OFFSET_Y - BALL_R * 0.35}
            r={BALL_R * 0.25}
            fill="#ffffff"
            opacity={0.7}
          />
          {/* Aramith Pro-Cup red rotation dots */}
          <Circle
            cx={safeYellow.x + PLAY_OFFSET_X}
            cy={safeYellow.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.22}
            fill="#b91c1c"
          />
          <Circle
            cx={safeYellow.x + PLAY_OFFSET_X + BALL_R * 0.55}
            cy={safeYellow.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.12}
            fill="#b91c1c"
          />
          <Circle
            cx={safeYellow.x + PLAY_OFFSET_X - BALL_R * 0.55}
            cy={safeYellow.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.12}
            fill="#b91c1c"
          />
        </G>

        {/* 8. Cue Ball (White Ball with Aramith Pro-Cup Spots - Animated or Static) */}
        <G>
          <Circle
            cx={activeCueBall.x + PLAY_OFFSET_X + 1.2}
            cy={activeCueBall.y + PLAY_OFFSET_Y + 1.6}
            r={BALL_R * 1.05}
            fill={`url(#${tableUid}_ballShadow)`}
          />
          <Circle
            cx={activeCueBall.x + PLAY_OFFSET_X}
            cy={activeCueBall.y + PLAY_OFFSET_Y}
            r={BALL_R}
            fill={`url(#${tableUid}_whiteBallGrad)`}
          />
          {/* Specular highlight */}
          <Circle
            cx={activeCueBall.x + PLAY_OFFSET_X - BALL_R * 0.35}
            cy={activeCueBall.y + PLAY_OFFSET_Y - BALL_R * 0.35}
            r={BALL_R * 0.25}
            fill="#ffffff"
            opacity={0.8}
          />
          {/* Aramith Pro-Cup red rotation dots */}
          <Circle
            cx={activeCueBall.x + PLAY_OFFSET_X}
            cy={activeCueBall.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.22}
            fill="#dc2626"
          />
          <Circle
            cx={activeCueBall.x + PLAY_OFFSET_X + BALL_R * 0.55}
            cy={activeCueBall.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.12}
            fill="#dc2626"
          />
          <Circle
            cx={activeCueBall.x + PLAY_OFFSET_X - BALL_R * 0.55}
            cy={activeCueBall.y + PLAY_OFFSET_Y}
            r={BALL_R * 0.12}
            fill="#dc2626"
          />
        </G>
      </Svg>
    </View>
  );
}

export const TrainingPlayTable = memo(TrainingPlayTableBase);
export default TrainingPlayTable;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 316 / 174,
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
