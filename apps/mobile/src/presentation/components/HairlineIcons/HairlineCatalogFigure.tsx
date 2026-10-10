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
 * Hairline Riffle Metaphor with Billiard Tables:
 * A tray of isometric cards in perspective. On each card is an etched
 * miniature 3-cushion billiard table. The card under the pointer stands up
 * out of the tray and lights up its billiard table, while adjacent tables
 * lean back with staggered physics.
 */
export const HairlineCatalogFigure: React.FC<HairlineFigureProps> = ({
  size = 64,
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

  // Pointer position mapped to 0..4 (5 cards in icon version)
  const currentFloat = isHovered
    ? ((pointerX + 1) / 2) * 4
    : (Math.sin(frame * 0.8) * 0.5 + 0.5) * 4;

  const N = 5; // 5 billiard cards in compact icon
  const CARD_W = 32;
  const CARD_H = 46;

  // Shot colors for the 5 cards
  const CARD_COLORS = ['#38bdf8', '#22c55e', '#a78bfa', '#fb923c', '#ec4899'];

  return (
    <View style={[styles.container, { width: size, height: size * 0.9 }]}>
      <Svg viewBox="0 0 100 85" width="100%" height="100%">
        <Defs>
          <RadialGradient id="riffleGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="tableFeltCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0b2416" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#041209" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* ── 1. Riffle Tray Base (Isometric Rack) ── */}
        <Polygon
          points="8,68 92,68 82,78 18,78"
          fill="#0f172a"
          stroke={accent}
          strokeWidth="0.8"
          strokeOpacity="0.5"
        />
        {/* Tray Front Lip */}
        <Line x1="18" y1="78" x2="82" y2="78" stroke="#334155" strokeWidth="1" />

        {/* ── 2. The 5 Riffle Cards with Billiard Tables ── */}
        {Array.from({ length: N }).map((_, i) => {
          const dist = Math.abs(i - currentFloat);
          const liftRatio = Math.max(0, 1 - dist / 1.5);
          const easedLift = Math.sin((liftRatio * Math.PI) / 2);

          const liftY = easedLift * 16;
          const lean = (1 - easedLift) * -6;

          const baseX = 12 + i * 16;
          const baseY = 70;

          const cardColor = CARD_COLORS[i % CARD_COLORS.length];
          const isFocused = dist < 0.6;

          return (
            <G
              key={`card-${i}`}
              transform={`translate(${baseX}, ${baseY - liftY}) skewX(${lean})`}
            >
              {/* Card Shadow */}
              <Polygon
                points={`0,0 ${CARD_W},0 ${CARD_W + 3},${liftY * 0.3} 3,${liftY * 0.3}`}
                fill="rgba(0,0,0,0.3)"
              />

              {/* Card Shell */}
              <Polygon
                points={`0,0 ${CARD_W},0 ${CARD_W},-${CARD_H} 0,-${CARD_H}`}
                fill={isFocused ? '#0c1a2d' : '#08121f'}
                stroke={isFocused ? cardColor : '#334155'}
                strokeWidth={isFocused ? '1.4' : '0.8'}
                strokeLinejoin="round"
              />

              {/* Top Header Pip */}
              <Circle
                cx={CARD_W / 2}
                cy={-(CARD_H - 5)}
                r={isFocused ? 1.8 : 1.2}
                fill={cardColor}
              />

              {/* ── Isometric Billiard Table on the Card ── */}
              <G transform={`translate(4, -${CARD_H - 10})`}>
                {/* Table Cushion Bevel */}
                <Polygon
                  points="12,2 23,8 12,14 1,8"
                  fill="#170c24"
                  stroke={isFocused ? cardColor : '#475569'}
                  strokeWidth="0.7"
                />

                {/* Felt (Billiard Surface) */}
                <Polygon
                  points="12,4 20,8 12,12 4,8"
                  fill={isFocused ? `${cardColor}25` : 'url(#tableFeltCard)'}
                  stroke={isFocused ? cardColor : '#1e293b'}
                  strokeWidth="0.5"
                />

                {/* 3 Carom Balls */}
                {/* White Cue Ball */}
                <Circle cx={7} cy={9} r={1.2} fill="#ffffff" />
                {/* Yellow Ball */}
                <Circle cx={12} cy={7} r={1.2} fill="#facc15" />
                {/* Red Ball */}
                <Circle cx={17} cy={9} r={1.3} fill="#ef4444" />

                {/* 3-Cushion Trajectory Vector */}
                <Path
                  d={`M 7,9 L 18,5 L 20,10 L 17,9`}
                  fill="none"
                  stroke={cardColor}
                  strokeWidth={isFocused ? '1' : '0.6'}
                  strokeDasharray={isFocused ? 'none' : '1.5,1'}
                  strokeOpacity={isFocused ? 1 : 0.6}
                />
              </G>

              {/* Bottom Card Stripe */}
              <Line
                x1={2}
                y1={-3}
                x2={CARD_W - 2}
                y2={-3}
                stroke={cardColor}
                strokeWidth={isFocused ? 1.2 : 0.6}
                strokeOpacity={isFocused ? 0.9 : 0.4}
              />
            </G>
          );
        })}

        {/* Ambient Riffle Center Glow */}
        <Circle cx="50" cy="50" r="18" fill="url(#riffleGlow)" />
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
