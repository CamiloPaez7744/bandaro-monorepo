import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
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
import { useColorScheme } from '@/components/useColorScheme';
import { getPalette } from '@/constants/theme';
import { IconSparkles, IconChevronLeft, IconChevronRight } from '@/src/presentation/components/icons';

export interface RiffleShotData {
  id: string;
  name: string;
  category: string;
  formula: string;
  description: string;
  accent: string;
  difficulty: 'Básico' | 'Medio' | 'Avanzado' | 'Maestro';
  // Trajectory points in relative table coordinates (0..100)
  cue: [number, number];
  b2: [number, number];
  b3: [number, number];
  trajectory: [number, number][];
}

export const RIFFLE_SHOTS: RiffleShotData[] = [
  {
    id: 'cajon',
    name: 'Cajón Clásico',
    category: 'draw',
    formula: 'Salida 50 - Llegada 20 = Ataque 30',
    description: 'Recorrido por las 3 bandas alrededor de la esquina con tome 1/2.',
    accent: '#3b82f6',
    difficulty: 'Básico',
    cue: [25, 75],
    b2: [35, 45],
    b3: [70, 75],
    trajectory: [[25, 75], [35, 45], [55, 15], [88, 45], [70, 75]],
  },
  {
    id: 'rodada',
    name: 'Rodada Larga',
    category: 'follow',
    formula: 'Punto de ataque en diamante 40 con efecto suave a favor',
    description: 'Pase natural por banda larga, corta y larga de retorno.',
    accent: '#10b981',
    difficulty: 'Básico',
    cue: [20, 80],
    b2: [30, 50],
    b3: [30, 20],
    trajectory: [[20, 80], [30, 50], [45, 12], [88, 50], [70, 88], [30, 20]],
  },
  {
    id: 'renverse',
    name: 'Renverse',
    category: 'reverse',
    formula: 'Contra-efecto máximo a las 9:00 / 3:00 con golpe seco',
    description: 'Efecto inverso para abrir el ángulo cerrado en banda corta.',
    accent: '#f97316',
    difficulty: 'Medio',
    cue: [30, 70],
    b2: [50, 60],
    b3: [80, 30],
    trajectory: [[30, 70], [50, 60], [88, 65], [12, 35], [50, 12], [80, 30]],
  },
  {
    id: 'pase_bola',
    name: 'Pase Bola',
    category: 'side_spin',
    formula: 'Tome fino 1/8 con velocidad constante y penetración',
    description: 'La bola 1 supera a la bola 2 con corte milimétrico sin choque.',
    accent: '#8b5cf6',
    difficulty: 'Medio',
    cue: [20, 70],
    b2: [40, 50],
    b3: [65, 30],
    trajectory: [[20, 70], [40, 50], [88, 25], [60, 12], [12, 35], [65, 30]],
  },
  {
    id: 'bricole',
    name: 'Banda Previa (Bricole)',
    category: 'bank_shot',
    formula: 'Salida de diamante 50 a diamante 20 previo',
    description: 'Impacto directo en la banda antes de tocar la primera bola objetiva.',
    accent: '#e11d48',
    difficulty: 'Avanzado',
    cue: [20, 85],
    b2: [45, 35],
    b3: [75, 45],
    trajectory: [[20, 85], [12, 45], [45, 35], [55, 12], [88, 30], [75, 45]],
  },
  {
    id: 'zigzag',
    name: 'Zig-Zag / Cerrucho',
    category: 'cross_table',
    formula: 'Rebote alterno entre bandas largas con efecto a favor',
    description: 'Trayectoria oscilante de lado a lado cruzando la mesa 4 o 5 veces.',
    accent: '#06b6d4',
    difficulty: 'Avanzado',
    cue: [15, 80],
    b2: [30, 65],
    b3: [85, 25],
    trajectory: [[15, 80], [30, 65], [88, 70], [12, 50], [88, 35], [85, 25]],
  },
  {
    id: 'doble_banda',
    name: 'Doble Banda',
    category: 'double_cushion',
    formula: 'Ataque profundo con golpe bajo para doble toque en misma banda',
    description: 'La bola toca la banda larga dos veces consecutivas antes del carambola.',
    accent: '#ec4899',
    difficulty: 'Avanzado',
    cue: [25, 75],
    b2: [35, 40],
    b3: [60, 25],
    trajectory: [[25, 75], [35, 40], [88, 30], [88, 15], [50, 12], [60, 25]],
  },
  {
    id: 'mase',
    name: 'Retroceso Curvo (Masé)',
    category: 'cut',
    formula: 'Elevación de culata a 60° con efecto profundo a las 6:00',
    description: 'Tiro de fantasía con curvatura parabólica por aceleración transversal.',
    accent: '#f59e0b',
    difficulty: 'Maestro',
    cue: [30, 75],
    b2: [45, 45],
    b3: [25, 35],
    trajectory: [[30, 75], [45, 45], [60, 30], [35, 15], [12, 25], [25, 35]],
  },
];

export interface HairlineBilliardRiffleProps {
  onSelectShot?: (shot: RiffleShotData) => void;
  selectedShotId?: string;
  intensity?: number;
  autoPlay?: boolean;
}

/**
 * HairlineBilliardRiffle
 * Inspired by Hairline's Riffle figure:
 * A tray of eight cards in isometric perspective. Each card hosts a miniature
 * isometric 3-cushion billiard table with real cushion rails, diamonds, balls,
 * and a distinct master shot trajectory.
 * The card under the pointer stands up, lifts, and illuminates its table;
 * adjacent cards lean and ripple after it.
 */
export const HairlineBilliardRiffle: React.FC<HairlineBilliardRiffleProps> = ({
  onSelectShot,
  selectedShotId,
  intensity = 0.6,
  autoPlay = true,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const palette = getPalette(useColorScheme());
  const isDark = useColorScheme() === 'dark';

  const [activeIndex, setActiveIndex] = useState(0);
  const [pointerFloat, setPointerFloat] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [frame, setFrame] = useState(0);

  const containerRef = useRef<View>(null);
  const layoutWidth = useRef(windowWidth);

  // Auto-play idle wave when user is not interacting (throttled to 20 FPS to minimize memory)
  useEffect(() => {
    let animId: number | null = null;
    let active = true;
    let step = 0;
    let lastTime = 0;
    const FRAME_INTERVAL = 1000 / 20;

    const loop = (now: number) => {
      if (!active) return;
      if (typeof document !== 'undefined' && document.hidden) {
        animId = null;
        return;
      }
      if (!lastTime) lastTime = now;
      const elapsed = now - lastTime;
      if (elapsed >= FRAME_INTERVAL) {
        lastTime = now - (elapsed % FRAME_INTERVAL);
        step += 0.025;
        setFrame(step);
      }
      animId = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (!animId && autoPlay && !isHovered) {
        lastTime = 0;
        animId = requestAnimationFrame(loop);
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
  }, [autoPlay, isHovered]);

  // Current float index for the ripple center (0..7)
  const idleIndex = (Math.sin(frame * 0.7) * 0.5 + 0.5) * 7;
  const currentFloat = pointerFloat !== null ? pointerFloat : idleIndex;
  const currentSelectedCard = RIFFLE_SHOTS[Math.round(Math.max(0, Math.min(7, currentFloat)))];

  // Calculate pointer index from X coordinate
  const handlePointerMove = (e: any) => {
    const locX = e.nativeEvent.offsetX ?? e.nativeEvent.locationX ?? 0;
    const w = layoutWidth.current || 360;
    // Map X (padding 20px on each side) to 0..7
    const relX = Math.max(0, Math.min(1, (locX - 16) / (w - 32)));
    const targetIdx = relX * 7;
    setPointerFloat(targetIdx);
    setActiveIndex(Math.round(targetIdx));
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setPointerFloat(null);
  };

  // Keyboard navigation support on web
  const handleKeyDown = useCallback(
    (e: any) => {
      if (e.key === 'ArrowRight') {
        const next = Math.min(7, activeIndex + 1);
        setActiveIndex(next);
        setPointerFloat(next);
      } else if (e.key === 'ArrowLeft') {
        const prev = Math.max(0, activeIndex - 1);
        setActiveIndex(prev);
        setPointerFloat(prev);
      } else if (e.key === 'Enter') {
        if (onSelectShot) onSelectShot(RIFFLE_SHOTS[activeIndex]);
      }
    },
    [activeIndex, onSelectShot]
  );

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  // Riffle dimensions & metrics
  const N = RIFFLE_SHOTS.length; // 8 cards
  const CARD_W = 68;
  const CARD_H = 88;
  const TOTAL_SVG_W = 540;
  const TOTAL_SVG_H = 175;

  // Stagger radius influenced by intensity (Hairline specification)
  const staggerRadius = 1.3 + intensity * 1.5;

  return (
    <View
      ref={containerRef}
      style={[
        styles.wrapper,
        {
          backgroundColor: isDark ? 'rgba(8,16,24,0.75)' : 'rgba(255,255,255,0.85)',
          borderColor: palette.border,
        },
      ]}
      onLayout={(e) => {
        layoutWidth.current = e.nativeEvent.layout.width;
      }}
      // @ts-ignore
      onPointerMove={handlePointerMove}
      // @ts-ignore
      onPointerEnter={() => setIsHovered(true)}
      // @ts-ignore
      onPointerLeave={handlePointerLeave}
      onTouchMove={(e) => {
        const locX = e.nativeEvent.locationX;
        const w = layoutWidth.current || 360;
        const relX = Math.max(0, Math.min(1, (locX - 16) / (w - 32)));
        const targetIdx = relX * 7;
        setPointerFloat(targetIdx);
        setActiveIndex(Math.round(targetIdx));
      }}
    >
      {/* ── Top Bar with Hairline Badge & Controls ── */}
      <View style={styles.topRow}>
        <View style={styles.badgeWrap}>
          <IconSparkles size={14} color="#38bdf8" strokeWidth={2} />
          <Text style={styles.badgeText}>HAIRLINE RIFFLE · MESAS EN PERSPECTIVA</Text>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            style={[styles.arrowBtn, { borderColor: palette.border }]}
            onPress={() => {
              const prev = Math.max(0, activeIndex - 1);
              setActiveIndex(prev);
              setPointerFloat(prev);
            }}
          >
            <IconChevronLeft size={16} color={palette.text} />
          </Pressable>
          <Text style={[styles.indexIndicator, { color: palette.muted }]}>
            {activeIndex + 1} / {N}
          </Text>
          <Pressable
            style={[styles.arrowBtn, { borderColor: palette.border }]}
            onPress={() => {
              const next = Math.min(7, activeIndex + 1);
              setActiveIndex(next);
              setPointerFloat(next);
            }}
          >
            <IconChevronRight size={16} color={palette.text} />
          </Pressable>
        </View>
      </View>

      {/* ── The Isometric Riffle SVG Tray ── */}
      <View style={styles.svgContainer}>
        <Svg
          viewBox={`0 0 ${TOTAL_SVG_W} ${TOTAL_SVG_H}`}
          width="100%"
          height={TOTAL_SVG_H}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="trayFloorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#0f172a" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
            </LinearGradient>
            <LinearGradient id="cardFeltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#0a2e1d" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#041a10" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* ── Tray Base Plate (Isometric Wooden Rack) ── */}
          <Polygon
            points="24,142 516,142 500,164 40,164"
            fill="url(#trayFloorGrad)"
            stroke={palette.border}
            strokeWidth="1"
          />
          {/* Front rail rim of the tray */}
          <Polygon
            points="40,164 500,164 500,168 40,168"
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="0.8"
          />
          {/* Tray groove tick guides (Hairline lo) */}
          {Array.from({ length: 8 }).map((_, idx) => {
            const gx = 48 + idx * 58;
            return (
              <Line
                key={`tick-${idx}`}
                x1={gx}
                y1={152}
                x2={gx + 16}
                y2={152}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* ── The 8 Standing Cards (Each carrying a billiard table) ── */}
          {RIFFLE_SHOTS.map((shot, i) => {
            // Distance from active pointer ripple center
            const dist = Math.abs(i - currentFloat);
            // Normalized lift factor (0 = at rest, 1 = maximum pulled)
            const liftRatio = Math.max(0, 1 - dist / staggerRadius);
            const easedLift = Math.sin((liftRatio * Math.PI) / 2); // smooth ease

            // Vertical lift: card lifts up out of tray
            const liftY = easedLift * 28;
            // Lean angle: at rest cards lean slightly back (-8°), standing cards become 0°
            const leanAngle = (1 - easedLift) * -7;

            // Base X position along the rack
            const baseX = 42 + i * 57;
            const baseY = 146;

            const isFocus = dist < 0.6;
            const strokeColor = isFocus ? shot.accent : '#475569';
            const strokeW = isFocus ? 1.6 : 0.9;

            return (
              <G
                key={shot.id}
                transform={`translate(${baseX}, ${baseY - liftY}) skewX(${leanAngle})`}
                onPress={() => onSelectShot && onSelectShot(shot)}
              >
                {/* 1. Card Shadow */}
                <Polygon
                  points={`0,0 ${CARD_W},0 ${CARD_W + 6},${liftY * 0.4} 6,${liftY * 0.4}`}
                  fill="rgba(0,0,0,0.35)"
                />

                {/* 2. Card Outer Shell (Plate) */}
                <Polygon
                  points={`0,0 ${CARD_W},0 ${CARD_W},-${CARD_H} 0,-${CARD_H}`}
                  fill={isDark ? '#0b1320' : '#ffffff'}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                  strokeLinejoin="round"
                />

                {/* Card Top Title Tab */}
                <Polygon
                  points={`0,-${CARD_H} ${CARD_W},-${CARD_H} ${CARD_W},-${CARD_H - 14} 0,-${CARD_H - 14}`}
                  fill={isFocus ? shot.accent : isDark ? '#1e293b' : '#f1f5f9'}
                  fillOpacity={isFocus ? 0.25 : 0.6}
                  stroke={strokeColor}
                  strokeWidth="0.6"
                />
                {/* Card Tab Indicator Pip */}
                <Circle
                  cx={10}
                  cy={-(CARD_H - 7)}
                  r={2.2}
                  fill={shot.accent}
                />
                {/* Card Index Dash */}
                <Line
                  x1={18}
                  y1={-(CARD_H - 7)}
                  x2={36}
                  y2={-(CARD_H - 7)}
                  stroke={isFocus ? shot.accent : '#94a3b8'}
                  strokeWidth="1.2"
                />

                {/* 3. The Isometric Billiard Table on this Card! */}
                <G transform={`translate(6, -${CARD_H - 18})`}>
                  {/* Table Outer Rail Bevel (Isometric Cushion Wood) */}
                  <Polygon
                    points="28,2 54,16 28,30 2,16"
                    fill="#1e1026"
                    stroke={isFocus ? shot.accent : '#64748b'}
                    strokeWidth="0.8"
                    strokeOpacity={isFocus ? 0.9 : 0.5}
                  />

                  {/* Inner Playing Felt (Green Cloth) */}
                  <Polygon
                    points="28,6 49,16 28,26 7,16"
                    fill={isFocus ? `${shot.accent}20` : 'url(#cardFeltGrad)'}
                    stroke={isFocus ? shot.accent : '#334155'}
                    strokeWidth="0.7"
                  />

                  {/* Diamond inlays on the rails (Hairline dots) */}
                  <Circle cx="18" cy="11" r="0.9" fill="#ffffff" fillOpacity="0.7" />
                  <Circle cx="38" cy="11" r="0.9" fill="#ffffff" fillOpacity="0.7" />
                  <Circle cx="38" cy="21" r="0.9" fill="#ffffff" fillOpacity="0.7" />
                  <Circle cx="18" cy="21" r="0.9" fill="#ffffff" fillOpacity="0.7" />

                  {/* 3 Billiard Balls in Isometric Perspective */}
                  {/* White Cue Ball */}
                  <Circle
                    cx={12 + (shot.cue[0] / 100) * 32}
                    cy={8 + (shot.cue[1] / 100) * 16}
                    r={2.2}
                    fill="#f8fafc"
                    stroke="#94a3b8"
                    strokeWidth="0.6"
                  />
                  {/* Yellow Object Ball 2 */}
                  <Circle
                    cx={12 + (shot.b2[0] / 100) * 32}
                    cy={8 + (shot.b2[1] / 100) * 16}
                    r={2.2}
                    fill="#facc15"
                    stroke="#ca8a04"
                    strokeWidth="0.6"
                  />
                  {/* Red Carom Ball 3 */}
                  <Circle
                    cx={12 + (shot.b3[0] / 100) * 32}
                    cy={8 + (shot.b3[1] / 100) * 16}
                    r={2.4}
                    fill="#ef4444"
                    stroke="#b91c1c"
                    strokeWidth="0.6"
                  />

                  {/* 4. The Unique 3-Cushion Shot Trajectory */}
                  {shot.trajectory.length > 1 && (
                    <Path
                      d={shot.trajectory.reduce((acc, pt, pIdx) => {
                        const px = 12 + (pt[0] / 100) * 32;
                        const py = 8 + (pt[1] / 100) * 16;
                        return pIdx === 0 ? `M ${px},${py}` : `${acc} L ${px},${py}`;
                      }, '')}
                      fill="none"
                      stroke={shot.accent}
                      strokeWidth={isFocus ? '1.3' : '0.8'}
                      strokeDasharray={isFocus ? 'none' : '2,1.5'}
                      strokeOpacity={isFocus ? 1 : 0.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Carom hit spark on active card */}
                  {isFocus && (
                    <Circle
                      cx={12 + (shot.b3[0] / 100) * 32}
                      cy={8 + (shot.b3[1] / 100) * 16}
                      r={4.5}
                      fill="none"
                      stroke={shot.accent}
                      strokeWidth="0.6"
                      strokeDasharray="2,2"
                    />
                  )}
                </G>

                {/* Card Bottom Plate Accent Stripe */}
                <Line
                  x1={4}
                  y1={-6}
                  x2={CARD_W - 4}
                  y2={-6}
                  stroke={shot.accent}
                  strokeWidth={isFocus ? 1.6 : 0.8}
                  strokeOpacity={isFocus ? 0.9 : 0.4}
                />
              </G>
            );
          })}
        </Svg>
      </View>

      {/* ── Hairline Caption & Shot Readout ── */}
      <Pressable
        style={styles.captionPanel}
        onPress={() => onSelectShot && onSelectShot(currentSelectedCard)}
      >
        <View style={styles.captionHeader}>
          <View style={styles.captionTitleRow}>
            <View
              style={[
                styles.categoryDot,
                { backgroundColor: currentSelectedCard.accent },
              ]}
            />
            <Text style={[styles.captionTitle, { color: palette.text }]}>
              {currentSelectedCard.name}
            </Text>
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: `${currentSelectedCard.accent}20` },
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  { color: currentSelectedCard.accent },
                ]}
              >
                {currentSelectedCard.difficulty}
              </Text>
            </View>
          </View>

          <Text style={[styles.formulaText, { color: currentSelectedCard.accent }]}>
            {currentSelectedCard.formula}
          </Text>
        </View>

        <Text style={[styles.captionDesc, { color: palette.muted }]}>
          {currentSelectedCard.description}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#38bdf8',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexIndicator: {
    fontSize: 11,
    fontWeight: '700',
  },
  svgContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  captionPanel: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    gap: 4,
  },
  captionHeader: {
    flexDirection: 'column',
    gap: 2,
  },
  captionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  captionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  formulaText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  captionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
