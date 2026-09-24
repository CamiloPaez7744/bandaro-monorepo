import { memo } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export interface NeonCornerReticleProps {
  /** Size in pixels (width & height, default: 104) */
  size?: number;
  /** Primary reticle color (default: '#0284c7' darker tactical cyan/blue) */
  color?: string;
  /** Heavy post color (default: '#0a100d') */
  postColor?: string;
  /** Center aiming dot color (default: '#ef4444' high-visibility laser red) */
  centerDotColor?: string;
  /** Whether to show the outer optical scope vignette */
  showVignette?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

function NeonCornerReticleComponent({
  size = 104,
  color = '#0284c7',
  postColor = '#0a100d',
  centerDotColor = '#ef4444',
  showVignette = true,
  style,
}: NeonCornerReticleProps) {
  return (
    <View
      pointerEvents="none"
      style={[styles.container, { width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Subtle optical lens vignette around perimeter */}
          <RadialGradient id="scopeVignette" cx="50%" cy="50%" r="50%">
            <Stop offset="72%" stopColor="#000000" stopOpacity={0} />
            <Stop offset="88%" stopColor="#000000" stopOpacity={0.25} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.65} />
          </RadialGradient>
        </Defs>

        {/* 1. Lens Vignette (Dark Scope Shadow) */}
        {showVignette && (
          <Circle cx="50" cy="50" r="50" fill="url(#scopeVignette)" />
        )}

        {/* 2. Outer Optical Bezel Rim (100% concentric with reticle sight and center dot) */}
        <Circle
          cx="50"
          cy="50"
          r="48.8"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
        />

        {/* 3. Heavy Outer Post Crosshairs (Thick dark posts extending from edge) */}
        <G stroke={postColor} strokeWidth="2.0" strokeLinecap="square">
          <Line x1="0" y1="50" x2="16" y2="50" />
          <Line x1="84" y1="50" x2="100" y2="50" />
          <Line x1="50" y1="0" x2="50" y2="16" />
          <Line x1="50" y1="84" x2="50" y2="100" />
        </G>

        {/* 3. Range Ring Pushed Back to Periphery (Wide Open Field of View) */}
        <Circle
          cx="50"
          cy="50"
          r="31"
          fill="none"
          stroke={color}
          strokeWidth="1.1"
          strokeOpacity={0.8}
        />

        {/* 4. Precision Hairlines (Stopping outside central zone for unobstructed vision) */}
        <G stroke={color} strokeWidth="1.0" strokeOpacity={0.9}>
          <Line x1="16" y1="50" x2="39" y2="50" />
          <Line x1="61" y1="50" x2="84" y2="50" />
          <Line x1="50" y1="16" x2="50" y2="39" />
          <Line x1="50" y1="61" x2="50" y2="84" />
        </G>

        {/* 5. Graduated Scale Ticks along Crosshairs (Mil-Dot / Stadiametric Ticks) */}
        <G stroke={color} strokeOpacity={0.85}>
          {/* Horizontal Axis Ticks (Left & Right) */}
          {[
            { pos: 21, major: false },
            { pos: 25, major: true },
            { pos: 29, major: false },
            { pos: 33, major: true },
            { pos: 37, major: false },
            { pos: 63, major: false },
            { pos: 67, major: true },
            { pos: 71, major: false },
            { pos: 75, major: true },
            { pos: 79, major: false },
          ].map(({ pos, major }, idx) => (
            <Line
              key={`h-tick-${idx}`}
              x1={pos}
              y1={major ? 47.8 : 48.8}
              x2={pos}
              y2={major ? 52.2 : 51.2}
              strokeWidth={major ? 0.9 : 0.65}
            />
          ))}

          {/* Vertical Axis Ticks (Top & Bottom) */}
          {[
            { pos: 21, major: false },
            { pos: 25, major: true },
            { pos: 29, major: false },
            { pos: 33, major: true },
            { pos: 37, major: false },
            { pos: 63, major: false },
            { pos: 67, major: true },
            { pos: 71, major: false },
            { pos: 75, major: true },
            { pos: 79, major: false },
          ].map(({ pos, major }, idx) => (
            <Line
              key={`v-tick-${idx}`}
              x1={major ? 47.8 : 48.8}
              y1={pos}
              x2={major ? 52.2 : 51.2}
              y2={pos}
              strokeWidth={major ? 0.9 : 0.65}
            />
          ))}
        </G>

        {/* 6. Clean Center Aiming Micro-Sight (High-visibility Red Dot with contrast rim and white micro-pin) */}
        <Circle cx="50" cy="50" r="1.8" fill="#050a08" opacity={0.7} />
        <Circle cx="50" cy="50" r="1.3" fill={centerDotColor} />
        <Circle cx="50" cy="50" r="0.45" fill="#ffffff" />
      </Svg>
    </View>
  );
}

export const NeonCornerReticle = memo(NeonCornerReticleComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
