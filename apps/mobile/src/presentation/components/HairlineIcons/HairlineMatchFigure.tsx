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
 * HairlineMatchFigure
 * Isometric Electronic Referee Scorekeeper console metaphor:
 * High-tech beveled scoreboard enclosure with dual rotary score tumblers
 * (Player A vs Player B), digital inning ticker, alternating turn indicator LEDs,
 * and mechanical tally rockers answering pointer movement.
 */
export const HairlineMatchFigure: React.FC<HairlineFigureProps> = ({
  size = 60,
  accent = '#fb923c',
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

  const currentX = isHovered ? pointerX : Math.sin(frame * 0.8) * 0.4;
  const currentY = isHovered ? pointerY : Math.cos(frame * 0.8) * 0.4;

  // Tumbler roll offset (Player A & Player B)
  const rollA = (isHovered ? currentY * 5 : Math.sin(frame * 1.5) * 3);
  const rollB = (isHovered ? -currentY * 5 : Math.cos(frame * 1.5) * 3);

  // Active turn shift (toggle between A and B based on pointerX)
  const isTurnA = currentX <= 0;

  return (
    <View style={[styles.container, { width: size, height: size * 0.9 }]}>
      <Svg viewBox="0 0 100 85" width="100%" height="100%">
        <Defs>
          <LinearGradient id="chassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2a1208" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#170603" stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="matchGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── 1. Console Shadow ── */}
        <Polygon points="16,56 50,76 84,56 50,36" fill="rgba(0,0,0,0.45)" />

        {/* ── 2. Isometric Console Beveled Chassis ── */}
        {/* Front-left face */}
        <Polygon
          points="18,52 50,70 50,76 18,58"
          fill="#1c0b05"
          stroke={accent}
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
        {/* Front-right face */}
        <Polygon
          points="50,70 82,52 82,58 50,76"
          fill="#140703"
          stroke={accent}
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
        {/* Top Deck Surface */}
        <Polygon
          points="18,52 50,70 82,52 50,34"
          fill="url(#chassisGrad)"
          stroke={accent}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Console Dividing Ridge */}
        <Line
          x1="50"
          y1="34"
          x2="50"
          y2="70"
          stroke={accent}
          strokeWidth="0.9"
          strokeDasharray="2,2"
          strokeOpacity="0.4"
        />

        {/* ── 3. Player A Score Tumbler (Left Dial) ── */}
        <G transform={`translate(0, ${rollA * 0.4})`}>
          {/* Drum cutout bezel */}
          <Polygon
            points="24,48 38,56 46,51 32,43"
            fill="#090302"
            stroke={isTurnA ? accent : '#78350f'}
            strokeWidth="1.1"
          />
          {/* Hairline number slats */}
          <Line x1="27" y1="47" x2="35" y2="52" stroke={accent} strokeWidth="1.2" strokeOpacity={isTurnA ? 0.9 : 0.4} />
          <Line x1="31" y1="45" x2="39" y2="50" stroke={accent} strokeWidth="1.4" strokeOpacity={isTurnA ? 1 : 0.5} />
          <Line x1="35" y1="43" x2="43" y2="48" stroke={accent} strokeWidth="1.2" strokeOpacity={isTurnA ? 0.9 : 0.4} />
          {/* Digit pip */}
          <Circle cx="35" cy="48" r="1.5" fill="#f8fafc" />
        </G>

        {/* ── 4. Player B Score Tumbler (Right Dial) ── */}
        <G transform={`translate(0, ${rollB * 0.4})`}>
          {/* Drum cutout bezel */}
          <Polygon
            points="54,51 62,56 76,48 68,43"
            fill="#090302"
            stroke={!isTurnA ? accent : '#78350f'}
            strokeWidth="1.1"
          />
          {/* Hairline number slats */}
          <Line x1="57" y1="50" x2="65" y2="45" stroke={accent} strokeWidth="1.2" strokeOpacity={!isTurnA ? 0.9 : 0.4} />
          <Line x1="61" y1="52" x2="69" y2="47" stroke={accent} strokeWidth="1.4" strokeOpacity={!isTurnA ? 1 : 0.5} />
          <Line x1="65" y1="54" x2="73" y2="49" stroke={accent} strokeWidth="1.2" strokeOpacity={!isTurnA ? 0.9 : 0.4} />
          {/* Digit pip */}
          <Circle cx="65" cy="48" r="1.5" fill="#f8fafc" />
        </G>

        {/* ── 5. Center Inning / Entry Counter Gauge ── */}
        <Polygon
          points="46,45 54,45 54,51 46,51"
          fill="#431407"
          stroke={accent}
          strokeWidth="0.8"
        />
        {/* Inning number tick */}
        <Line x1="50" y1="46" x2="50" y2="50" stroke="#fef08a" strokeWidth="1.2" />

        {/* ── 6. Turn Indicator LEDs & Rockers ── */}
        {/* Left LED (Player A) */}
        <Circle
          cx="32"
          cy="38"
          r="2.2"
          fill={isTurnA ? accent : '#78350f'}
          stroke="#ffffff"
          strokeWidth={isTurnA ? '0.8' : '0.4'}
        />
        {isTurnA && <Circle cx="32" cy="38" r="4.5" fill="none" stroke={accent} strokeWidth="0.6" strokeOpacity="0.7" />}

        {/* Right LED (Player B) */}
        <Circle
          cx="68"
          cy="38"
          r="2.2"
          fill={!isTurnA ? accent : '#78350f'}
          stroke="#ffffff"
          strokeWidth={!isTurnA ? '0.8' : '0.4'}
        />
        {!isTurnA && <Circle cx="68" cy="38" r="4.5" fill="none" stroke={accent} strokeWidth="0.6" strokeOpacity="0.7" />}

        {/* Ambient Warm Glow */}
        <Circle cx="50" cy="50" r="16" fill="url(#matchGlow)" />
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
