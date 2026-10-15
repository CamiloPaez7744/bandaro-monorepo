import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Polygon, Text as SvgText, Rect, G } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
import {
  IconAdjustments,
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowsExchange,
  IconCamera,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClipboard,
  IconDeviceGamepad2,
  IconFolder,
  IconLayoutColumns,
  IconMaximize,
  IconNumbers,
  IconRefresh,
  IconRotateClockwise,
  IconRuler2,
  IconSettings,
  IconSparkles,
  IconTarget,
  IconX,
} from '@tabler/icons-react-native';

import {
  ApiSnapshotRepository,
  type VisionDetailedResponse,
} from '@/src/infrastructure/repositories/ApiSnapshotRepository';
import {
  TrainingPlayTable,
  type TablePoint,
} from '@/src/presentation/components/Training/TrainingPlayTable';
import {
  TableCustomizerModal,
} from '@/src/presentation/components/Training/TableCustomizerModal';
import {
  CanvasViewSettingsModal,
} from './CanvasViewSettingsModal';
import { NeonCornerReticle } from './NeonCornerReticle';
import {
  type TablePreferences,
  DEFAULT_TABLE_PREFERENCES,
  loadTablePreferences,
  saveTablePreferences,
  useTablePreferences,
  resolveClothPalette,
} from '@/src/presentation/components/Training/tablePreferences';
import {
  resolveBilliardPhysics,
  type PhysicsPoint,
} from './billiardPhysics';

const isWeb = Platform.OS === 'web';

const getC = (palette: ReturnType<typeof getPalette>, isDark: boolean) => ({
  bg: isDark ? '#0a100d' : palette.background,
  surface: isDark ? '#13201b' : palette.card,
  surfaceHigh: isDark ? '#1a2c26' : palette.surfaceLow,
  surfaceBorder: isDark ? '#29443b' : palette.border,
  primary: '#10b981',
  primaryHover: '#059669',
  primaryDim: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
  text: isDark ? '#f1f5f3' : palette.text,
  textMuted: isDark ? '#94a39d' : palette.muted,
  danger: '#ef4444',
  accentCyan: isDark ? '#06b6d4' : '#0284c7',
  accentYellow: isDark ? '#eab308' : '#d97706',
  woodRail: isDark ? 'rgba(92, 46, 18, 0.12)' : 'rgba(92, 46, 18, 0.08)',
  woodRailBorder: isDark ? 'rgba(217, 160, 60, 0.40)' : 'rgba(217, 160, 60, 0.50)',
  cushionRubber: isDark ? 'rgba(12, 28, 22, 0.16)' : 'rgba(12, 28, 22, 0.08)',
});

export interface TableVisionStudioModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPosition?: (position: {
    white: TablePoint;
    yellow: TablePoint;
    red: TablePoint;
    name?: string;
  }) => void;
}

interface Point2D {
  x: number;
  y: number;
}

// 4 Initial Normalized Corners [TL, TR, BR, BL]
const DEFAULT_CORNERS: Point2D[] = [
  { x: 0.12, y: 0.22 },
  { x: 0.88, y: 0.22 },
  { x: 0.96, y: 0.82 },
  { x: 0.04, y: 0.82 },
];

// Closed-form 2D Projective Homography from Unit Square [0,1]x[0,1] to Quad [p0, p1, p2, p3]
function computeQuadHomography(p: Point2D[]): number[] | null {
  if (p.length < 4) return null;
  const [p0, p1, p2, p3] = p;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sy = p0.y - p1.y + p2.y - p3.y;

  if (Math.abs(sx) < 1e-7 && Math.abs(sy) < 1e-7) {
    return [
      p1.x - p0.x, p3.x - p0.x, p0.x,
      p1.y - p0.y, p3.y - p0.y, p0.y,
      0, 0, 1,
    ];
  }

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-7) {
    return [
      p1.x - p0.x, p3.x - p0.x, p0.x,
      p1.y - p0.y, p3.y - p0.y, p0.y,
      0, 0, 1,
    ];
  }

  const g = (sx * dy2 - sy * dx2) / det;
  const h = (dx1 * sy - dy1 * sx) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const f = p0.y;

  return [a, b, c, d, e, f, g, h, 1];
}

// Invert 3x3 matrix
function invertMatrix3x3(m: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-7) return null;

  const invDet = 1 / det;
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H * invDet,
    C * invDet, F * invDet, I * invDet,
  ];
}

// Apply homography to (x, y)
function applyHomography(H: number[], x: number, y: number): Point2D {
  const [a, b, c, d, e, f, g, h, i] = H;
  const w = g * x + h * y + i;
  if (Math.abs(w) < 1e-7) return { x, y };
  return {
    x: (a * x + b * y + c) / w,
    y: (d * x + e * y + f) / w,
  };
}

export interface GeometryValidationResult {
  isValid: boolean;
  isConvex: boolean;
  aspectRatio: number;
  message: string;
  severity: 'success' | 'warning' | 'error';
}

export function validateCornersGeometry(corners: Point2D[], isEn = false): GeometryValidationResult {
  if (!corners || corners.length !== 4) {
    return {
      isValid: false,
      isConvex: false,
      aspectRatio: 0,
      message: isEn ? 'Missing corners for calibration' : 'Faltan esquinas para la calibración',
      severity: 'error',
    };
  }

  // Cross products of consecutive edges to verify strict convexity (no crossed lines or folded corners)
  const crossProducts: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p0 = corners[i];
    const p1 = corners[(i + 1) % 4];
    const p2 = corners[(i + 2) % 4];
    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;
    const cp = dx1 * dy2 - dy1 * dx2;
    crossProducts.push(cp);
  }

  // In a valid non-intersecting quadrilateral, all cross products have identical non-zero sign
  const positive = crossProducts.filter((c) => c > 1e-5).length;
  const negative = crossProducts.filter((c) => c < -1e-5).length;
  const isConvex = positive === 4 || negative === 4;

  if (!isConvex) {
    return {
      isValid: false,
      isConvex: false,
      aspectRatio: 0,
      message: isEn ? 'Crossed or inverted corners (non-convex quadrilateral)' : 'Esquinas cruzadas o invertidas (cuadrilátero no convexo)',
      severity: 'error',
    };
  }

  // Calculate side lengths
  const d01 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const d12 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
  const d23 = Math.hypot(corners[3].x - corners[2].x, corners[3].y - corners[2].y);
  const d30 = Math.hypot(corners[0].x - corners[3].x, corners[0].y - corners[3].y);

  // Table has 2 long rails and 2 short rails
  const avgSideA = (d01 + d23) / 2;
  const avgSideB = (d12 + d30) / 2;

  if (avgSideA <= 1e-4 || avgSideB <= 1e-4) {
    return {
      isValid: false,
      isConvex: false,
      aspectRatio: 0,
      message: isEn ? 'Table area is too small.' : 'El área de la mesa es demasiado pequeña.',
      severity: 'error',
    };
  }

  const ratio = avgSideA >= avgSideB ? avgSideA / avgSideB : avgSideB / avgSideA;

  // Carom table regulation is 2:1 (284cm x 142cm)
  if (ratio < 1.15) {
    return {
      isValid: true,
      isConvex: true,
      aspectRatio: ratio,
      message: isEn ? `Square ratio (~${ratio.toFixed(2)}:1). Check short/long rails.` : `Proporción cuadrada (~${ratio.toFixed(2)}:1). Revisa esquinas cortas/largas.`,
      severity: 'warning',
    };
  }

  if (ratio > 3.6) {
    return {
      isValid: true,
      isConvex: true,
      aspectRatio: ratio,
      message: isEn ? `Very elongated table (~${ratio.toFixed(2)}:1). Adjust perspective.` : `Mesa muy alargada (~${ratio.toFixed(2)}:1). Ajusta perspectiva.`,
      severity: 'warning',
    };
  }

  return {
    isValid: true,
    isConvex: true,
    aspectRatio: ratio,
    message: isEn ? `Valid geometry (~${ratio.toFixed(2)}:1) • Consistent perspective` : `Geometría válida (~${ratio.toFixed(2)}:1) • Perspectiva consistente`,
    severity: 'success',
  };
}

function TableVisionStudioModalBase({
  visible,
  onClose,
  onSelectPosition,
}: TableVisionStudioModalProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = getPalette(colorScheme);
  const isDark = colorScheme === 'dark';
  const C = useMemo(() => getC(palette, isDark), [palette, isDark]);
  const s = useMemo(() => getStyles(C, isDark), [C, isDark]);
  const { language } = useI18n();
  const isEn = language === 'en';
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isLandscape = winWidth > winHeight;
  const isWide = winWidth >= 800 || (isLandscape && winWidth >= 550);
  const canvasHeight = isLandscape
    ? Math.max(260, Math.min(winHeight - 110, 360))
    : isWide
    ? 440
    : 330;

  // Flow step: 'select' | 'processing' | 'calibrate'
  const [step, setStep] = useState<'select' | 'processing' | 'calibrate'>('select');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected image info
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 1200, height: 675 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Vision response
  const [visionData, setVisionData] = useState<VisionDetailedResponse | null>(null);
  const [corners, setCorners] = useState<Point2D[]>(DEFAULT_CORNERS);
  const [activeCornerIdx, setActiveCornerIdx] = useState<number>(0);
  const [nudgeStep, setNudgeStep] = useState<number>(0.004);
  const initialCornersRef = useRef<Point2D[]>(DEFAULT_CORNERS);

  // Dragging and Loupe Magnifier State (CamScanner UX)
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'corner' | 'white' | 'yellow' | 'red' | null>(null);
  const [selectedTargetType, setSelectedTargetType] = useState<'corner' | 'white' | 'yellow' | 'red'>('corner');
  const [loupeCenter, setLoupeCenter] = useState<Point2D>({ x: 0.5, y: 0.5 });
  const [isLoupeActive, setIsLoupeActive] = useState(false);
  const loupeTimerRef = useRef<any>(null);

  const triggerLoupeBriefly = useCallback(() => {
    setIsLoupeActive(true);
    if (loupeTimerRef.current) clearTimeout(loupeTimerRef.current);
    loupeTimerRef.current = setTimeout(() => {
      setIsLoupeActive(false);
    }, 2200);
  }, []);

  // Continuous radar pulse animation for the active corner handle (only active when modal is visible)
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulseAnim]);

  // Visual toggles
  const [showProjectedGrid, setShowProjectedGrid] = useState(true);
  const [showWoodRails, setShowWoodRails] = useState(true);
  const [showDiamonds, setShowDiamonds] = useState(true);

  // Ball positions in normalized image coordinates (0..1)
  const [whiteImagePos, setWhiteImagePos] = useState<Point2D>({ x: 0.35, y: 0.55 });
  const [yellowImagePos, setYellowImagePos] = useState<Point2D>({ x: 0.65, y: 0.35 });
  const [redImagePos, setRedImagePos] = useState<Point2D>({ x: 0.72, y: 0.68 });
  const [thirdBallColor, setThirdBallColor] = useState<'red' | 'orange' | 'blue'>('red');

  const thirdBallMeta = useMemo(() => {
    switch (thirdBallColor) {
      case 'blue':
        return { label: isEn ? 'Blue' : 'Azul', color: '#2563eb', accent: '#ffffff', emoji: '🔵' };
      case 'orange':
        return { label: isEn ? 'Orange' : 'Naranja', color: '#f97316', accent: '#ffffff', emoji: '🟠' };
      case 'red':
      default:
        return { label: isEn ? 'Red' : 'Roja', color: '#ef4444', accent: '#ffffff', emoji: '🔴' };
    }
  }, [thirdBallColor, isEn]);

  // Tactical toggles
  const [swapCue, setSwapCue] = useState(false);
  const { preferences: tablePrefs, updatePreferences: handleChangeTablePrefs } = useTablePreferences();
  const [customizerVisible, setCustomizerVisible] = useState(false);
  const [canvasSettingsVisible, setCanvasSettingsVisible] = useState(false);
  const [tableOrientation, setTableOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [canvasZoom, setCanvasZoom] = useState<'fit' | 'expanded'>('fit');
  const [tableCoverage, setTableCoverage] = useState<'full' | 'half'>('full');
  const [halfTableZone, setHalfTableZone] = useState<'half_1' | 'half_2'>('half_1');
  const [showFineControls, setShowFineControls] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<View | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('select');
      setErrorMessage(null);
      setImageUri(null);
      setVisionData(null);
      setCorners(DEFAULT_CORNERS);
      setActiveCornerIdx(0);
      setIsDragging(false);
      setDragTarget(null);
      setShowFineControls(false);
      setTableOrientation('horizontal');
      setCanvasZoom('fit');
      setTableCoverage('full');
      setHalfTableZone('half_1');
      setThirdBallColor('red');
    }
  }, [visible]);

  // Compute exact letterboxed image rect inside imageCanvasWrap
  const imageRect = useMemo(() => {
    if (
      containerSize.width === 0 ||
      containerSize.height === 0 ||
      imageSize.width === 0 ||
      imageSize.height === 0
    ) {
      return { x: 0, y: 0, width: containerSize.width, height: containerSize.height };
    }
    const containerAspect = containerSize.width / containerSize.height;
    const imgAspect = imageSize.width / imageSize.height;
    const zoomFactor = canvasZoom === 'expanded' ? 0.72 : 1.0;

    let w = containerSize.width * zoomFactor;
    let h = containerSize.height * zoomFactor;

    if (containerAspect > imgAspect) {
      w = containerSize.height * imgAspect * zoomFactor;
      h = containerSize.height * zoomFactor;
    } else {
      w = containerSize.width * zoomFactor;
      h = (containerSize.width / imgAspect) * zoomFactor;
    }

    const x = (containerSize.width - w) / 2;
    const y = (containerSize.height - h) / 2;

    return { x, y, width: w, height: h };
  }, [containerSize, imageSize, canvasZoom]);

  // Client-side real-time Homography Matrix H (from [0,1]x[0,1] to normalized image quad)
  const homographyH = useMemo(() => {
    return computeQuadHomography(corners);
  }, [corners]);

  // Inverse Homography H^-1 (from normalized image to canonical [0..1] table)
  const homographyHInv = useMemo(() => {
    return homographyH ? invertMatrix3x3(homographyH) : null;
  }, [homographyH]);

  // 2D canonical balls derived in real-time from normalized image positions & homography (Pure useMemo, eliminates infinite effect loops)
  const { whiteBall, yellowBall, redBall } = useMemo(() => {
    if (!homographyHInv) {
      return {
        whiteBall: { x: 71, y: 105 },
        yellowBall: { x: 213, y: 35 },
        redBall: { x: 248, y: 105 },
      };
    }

    const wPos = swapCue ? yellowImagePos : whiteImagePos;
    const yPos = swapCue ? whiteImagePos : yellowImagePos;
    const rPos = redImagePos;

    const wCan = applyHomography(homographyHInv, wPos.x, wPos.y);
    const yCan = applyHomography(homographyHInv, yPos.x, yPos.y);
    const rCan = applyHomography(homographyHInv, rPos.x, rPos.y);

    let rawW: PhysicsPoint;
    let rawY: PhysicsPoint;
    let rawR: PhysicsPoint;

    if (tableCoverage === 'full') {
      if (tableOrientation === 'horizontal') {
        rawW = { x: wCan.x * 284, y: wCan.y * 142 };
        rawY = { x: yCan.x * 284, y: yCan.y * 142 };
        rawR = { x: rCan.x * 284, y: rCan.y * 142 };
      } else {
        rawW = { x: wCan.y * 284, y: (1 - wCan.x) * 142 };
        rawY = { x: yCan.y * 284, y: (1 - yCan.x) * 142 };
        rawR = { x: rCan.y * 284, y: (1 - rCan.x) * 142 };
      }
    } else {
      const offset = halfTableZone === 'half_2' ? 142 : 0;
      if (tableOrientation === 'horizontal') {
        rawW = { x: offset + wCan.x * 142, y: wCan.y * 142 };
        rawY = { x: offset + yCan.x * 142, y: yCan.y * 142 };
        rawR = { x: offset + rCan.x * 142, y: rCan.y * 142 };
      } else {
        rawW = { x: offset + wCan.y * 142, y: (1 - wCan.x) * 142 };
        rawY = { x: offset + yCan.y * 142, y: (1 - yCan.x) * 142 };
        rawR = { x: offset + rCan.y * 142, y: (1 - rCan.x) * 142 };
      }
    }

    const [safeW, safeY, safeR] = resolveBilliardPhysics([rawW, rawY, rawR]);
    return { whiteBall: safeW, yellowBall: safeY, redBall: safeR };
  }, [
    homographyHInv,
    whiteImagePos,
    yellowImagePos,
    redImagePos,
    swapCue,
    tableOrientation,
    tableCoverage,
    halfTableZone,
  ]);

  // Run backend vision processor
  const processImage = useCallback(
    async (uri: string, customCorners?: Point2D[]) => {
      setStep('processing');
      setErrorMessage(null);

      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
        );

        const trueW = manipulated.width || 1200;
        const trueH = manipulated.height || 675;
        setImageUri(manipulated.uri);
        setImageSize({ width: trueW, height: trueH });

        const repo = new ApiSnapshotRepository();
        const res = await repo.submitWithDetails(manipulated.uri, customCorners);
        setVisionData(res);

        if (res.tableOrientation) {
          setTableOrientation(res.tableOrientation);
        } else if (trueH > trueW * 1.05) {
          setTableOrientation('vertical');
        } else {
          setTableOrientation('horizontal');
        }

        // Normalize detected corners with the TRUE manipulated dimensions
        let currentCorners = DEFAULT_CORNERS;
        if (res.detectedCorners && res.detectedCorners.length === 4) {
          currentCorners = res.detectedCorners.map((c) => ({
            x: Math.max(0, Math.min(1, c.x / trueW)),
            y: Math.max(0, Math.min(1, c.y / trueH)),
          }));
          setCorners(currentCorners);
        }
        initialCornersRef.current = currentCorners;

        const newH = computeQuadHomography(currentCorners);

        // Set initial ball positions on image & 2D table
        if (res.balls && res.balls.length >= 3) {
          const wB = res.balls.find((b) => b.label === 'white') ?? res.balls[0];
          const yB = res.balls.find((b) => b.label === 'yellow') ?? res.balls[1];
          const rB =
            res.balls.find((b) => b.label === 'red' || b.label === 'orange' || b.label === 'blue') ??
            res.balls[2];

          if (rB) {
            const detectedColor = (rB.ballColor || rB.label || '').toLowerCase();
            if (detectedColor === 'blue') {
              setThirdBallColor('blue');
            } else if (detectedColor === 'orange') {
              setThirdBallColor('orange');
            } else {
              setThirdBallColor('red');
            }
          }

          // Use image positions directly if detected
          let wImg = { x: wB.imageX ?? 0.35, y: wB.imageY ?? 0.55 };
          let yImg = { x: yB.imageX ?? 0.65, y: yB.imageY ?? 0.35 };
          let rImg = { x: rB.imageX ?? 0.72, y: rB.imageY ?? 0.68 };

          if ((!wB.imageX || !wB.imageY) && newH) {
            wImg = applyHomography(newH, wB.x, wB.y);
          }
          if ((!yB.imageX || !yB.imageY) && newH) {
            yImg = applyHomography(newH, yB.x, yB.y);
          }
          if ((!rB.imageX || !rB.imageY) && newH) {
            rImg = applyHomography(newH, rB.x, rB.y);
          }

          setWhiteImagePos(wImg);
          setYellowImagePos(yImg);
          setRedImagePos(rImg);
        }

        setStep('calibrate');
      } catch (err) {
        console.error('[VisionStudio] error:', err);
        // Do NOT kick user back to select step! Open calibrate mode with DEFAULT_CORNERS and user's photo
        setCorners(DEFAULT_CORNERS);
        initialCornersRef.current = DEFAULT_CORNERS;
        setStep('calibrate');
        const isNetworkErr = String(err).includes('Failed to fetch') || String(err).includes('NetworkError');
        setErrorMessage(
          isNetworkErr
            ? 'No se pudo conectar con el motor de visión del backend (http://localhost:8181). Puedes ajustar manualmente las 4 cuñas de la mesa y las bolas con la lupa.'
            : 'Detección automática con baja confianza. Puedes ajustar manualmente las 4 cuñas de la mesa y la posición de las bolas usando los tiradores y la lupa.'
        );
      }
    },
    [imageSize]
  );

  const lastBlobUrlRef = useRef<string | null>(null);
  const registerBlobUrl = useCallback((newUrl: string) => {
    if (isWeb && lastBlobUrlRef.current && typeof window !== 'undefined' && window.URL) {
      try {
        window.URL.revokeObjectURL(lastBlobUrlRef.current);
      } catch {}
    }
    lastBlobUrlRef.current = newUrl;
  }, []);

  useEffect(() => {
    return () => {
      if (isWeb && lastBlobUrlRef.current && typeof window !== 'undefined' && window.URL) {
        try {
          window.URL.revokeObjectURL(lastBlobUrlRef.current);
        } catch {}
        lastBlobUrlRef.current = null;
      }
    };
  }, []);

  // Web Clipboard Paste (Ctrl + V)
  useEffect(() => {
    if (!visible || !isWeb) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            registerBlobUrl(blobUrl);
            processImage(blobUrl);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [visible, processImage, registerBlobUrl]);

  // Gallery file picker
  const pickFromGallery = useCallback(async () => {
    if (isWeb) {
      if (!fileInputRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.addEventListener('change', ((e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) return;
          const blobUrl = URL.createObjectURL(file);
          registerBlobUrl(blobUrl);
          processImage(blobUrl);
          target.value = '';
        }) as EventListener);
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      fileInputRef.current.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(isEn ? 'Permission required' : 'Permiso requerido', isEn ? 'Photo gallery access is needed.' : 'Se necesita acceso a la galería de fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    }
  }, [processImage]);

  // Camera capture
  const takePhoto = useCallback(async () => {
    if (isWeb) {
      if (!cameraInputRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.style.display = 'none';
        input.addEventListener('change', ((e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) return;
          const blobUrl = URL.createObjectURL(file);
          processImage(blobUrl);
          target.value = '';
        }) as EventListener);
        document.body.appendChild(input);
        cameraInputRef.current = input;
      }
      cameraInputRef.current.click();
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(isEn ? 'Permission required' : 'Permiso requerido', isEn ? 'Camera access is needed.' : 'Se necesita acceso a la cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    }
  }, [processImage]);

  // Tactical operations
  const handleRotate90 = useCallback(() => {
    setTableOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  }, []);

  const handleMirror = useCallback(() => {
    if (!homographyH || !homographyHInv) return;

    // Invert sides (left <-> right) on the canonical table, keeping C1..C4 fixed
    const mirrorPos = (p: Point2D): Point2D => {
      const can = applyHomography(homographyHInv, p.x, p.y);
      let mirroredU = can.x;
      let mirroredV = can.y;

      if (tableOrientation === 'horizontal') {
        // Horizontal: X is along u (u=0 to u=1). Mirroring sides means u' = 1 - u
        mirroredU = Math.max(0.005, Math.min(0.995, 1 - can.x));
        mirroredV = Math.max(0.005, Math.min(0.995, can.y));
      } else {
        // Vertical: X is along v (v=0 to v=1). Mirroring sides means v' = 1 - v
        mirroredU = Math.max(0.005, Math.min(0.995, can.x));
        mirroredV = Math.max(0.005, Math.min(0.995, 1 - can.y));
      }

      return applyHomography(homographyH, mirroredU, mirroredV);
    };

    setWhiteImagePos((p) => mirrorPos(p));
    setYellowImagePos((p) => mirrorPos(p));
    setRedImagePos((p) => mirrorPos(p));
  }, [homographyH, homographyHInv, tableOrientation]);

  const handleRotate180 = useCallback(() => {
    if (!homographyH || !homographyHInv) return;

    // Rotate 180° on canonical table (opposite end), keeping C1..C4 fixed
    const rotPos = (p: Point2D): Point2D => {
      const can = applyHomography(homographyHInv, p.x, p.y);
      let newU = can.x;
      let newV = can.y;

      if (tableOrientation === 'horizontal') {
        newU = Math.max(0.005, Math.min(0.995, 1 - can.x));
        newV = Math.max(0.005, Math.min(0.995, 1 - can.y));
      } else {
        newV = Math.max(0.005, Math.min(0.995, 1 - can.y));
        newU = Math.max(0.005, Math.min(0.995, 1 - can.x));
      }

      return applyHomography(homographyH, newU, newV);
    };

    setWhiteImagePos((p) => rotPos(p));
    setYellowImagePos((p) => rotPos(p));
    setRedImagePos((p) => rotPos(p));
  }, [homographyH, homographyHInv, tableOrientation]);

  const handleSwapCue = useCallback(() => {
    setSwapCue((v) => !v);
  }, []);

  // Re-run detection with current calibrated corners
  const handleRecalibrate = useCallback(() => {
    if (imageUri) {
      processImage(imageUri, corners);
    }
  }, [imageUri, corners, processImage]);

  // Confirm and practice in Training Session (repetition workstation)
  const handleConfirmTraining = useCallback(() => {
    onClose();
    if (onSelectPosition) {
      onSelectPosition({
        white: whiteBall,
        yellow: yellowBall,
        red: redBall,
        name: 'Mesa Calibrada (Foto)',
      });
    } else {
      const q = new URLSearchParams({
        whiteX: String(whiteBall.x),
        whiteY: String(whiteBall.y),
        yellowX: String(yellowBall.x),
        yellowY: String(yellowBall.y),
        redX: String(redBall.x),
        redY: String(redBall.y),
        customName: 'Mesa Calibrada (Foto)',
      });
      if (visionData?.snapshotId) {
        q.set('snapshotId', visionData.snapshotId);
      }
      router.push(`/training/session?${q.toString()}`);
    }
  }, [onClose, onSelectPosition, whiteBall, yellowBall, redBall, visionData, router]);

  // Open in simulator
  const handleOpenSimulator = useCallback(() => {
    onClose();
    const q = new URLSearchParams({
      whiteX: String(whiteBall.x),
      whiteY: String(whiteBall.y),
      yellowX: String(yellowBall.x),
      yellowY: String(yellowBall.y),
      redX: String(redBall.x),
      redY: String(redBall.y),
      customName: 'Mesa Calibrada (Foto)',
    });
    if (visionData?.snapshotId) {
      q.set('snapshotId', visionData.snapshotId);
    }
    router.push(`/training/simulate?${q.toString()}`);
  }, [onClose, visionData, whiteBall, yellowBall, redBall, router]);

  // --- MULTILAYER PROJECTED VIRTUAL TABLE GEOMETRY ---
  const virtualTableGeometry = useMemo(() => {
    if (!homographyH || imageRect.width === 0 || imageRect.height === 0) {
      return null;
    }

    const mapPt = (u: number, v: number): Point2D => {
      const norm = applyHomography(homographyH, u, v);
      return {
        x: imageRect.x + norm.x * imageRect.width,
        y: imageRect.y + norm.y * imageRect.height,
      };
    };

    const isHoriz = tableOrientation === 'horizontal';
    const isHalf = tableCoverage === 'half';

    // 1. Felt Playing Area (Canonical u in [0,1], v in [0,1])
    const pFelt0 = mapPt(0, 0);
    const pFelt1 = mapPt(1, 0);
    const pFelt2 = mapPt(1, 1);
    const pFelt3 = mapPt(0, 1);
    const feltPolygonStr = `${pFelt0.x},${pFelt0.y} ${pFelt1.x},${pFelt1.y} ${pFelt2.x},${pFelt2.y} ${pFelt3.x},${pFelt3.y}`;

    // 2. Rubber Cushion Perimeter
    const dCu = isHalf ? 0.032 : isHoriz ? 0.016 : 0.032;
    const dCv = isHalf ? 0.032 : isHoriz ? 0.032 : 0.016;
    const pCush0 = mapPt(-dCu, -dCv);
    const pCush1 = mapPt(1 + dCu, -dCv);
    const pCush2 = mapPt(1 + dCu, 1 + dCv);
    const pCush3 = mapPt(-dCu, 1 + dCv);
    const cushionPolygonStr = `${pCush0.x},${pCush0.y} ${pCush1.x},${pCush1.y} ${pCush2.x},${pCush2.y} ${pCush3.x},${pCush3.y}`;

    // 3. Wooden Top Rail Outer Edge
    const dWu = isHalf ? 0.116 : isHoriz ? 0.058 : 0.116;
    const dWv = isHalf ? 0.116 : isHoriz ? 0.116 : 0.058;
    const pWood0 = mapPt(-dWu, -dWv);
    const pWood1 = mapPt(1 + dWu, -dWv);
    const pWood2 = mapPt(1 + dWu, 1 + dWv);
    const pWood3 = mapPt(-dWu, 1 + dWv);
    const woodPolygonStr = `${pWood0.x},${pWood0.y} ${pWood1.x},${pWood1.y} ${pWood2.x},${pWood2.y} ${pWood3.x},${pWood3.y}`;

    // 4. Inlaid Diamonds on Rails and Grid
    const dMidU = (dCu + dWu) / 2;
    const dMidV = (dCv + dWv) / 2;
    const diamonds: Array<{ x: number; y: number; label: string; isLong: boolean }> = [];
    const gridVertical = [];
    const gridHorizontal = [];

    let ghostPolygonStr: string | null = null;
    let centerLine: { p1: Point2D; p2: Point2D } | null = null;

    if (!isHalf) {
      const showCorners = (tablePrefs.diamondCount === '9_5' || !tablePrefs.diamondCount) && tablePrefs.showCornerDiamonds !== false;
      const longIndices = showCorners
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8]
        : [1, 2, 3, 4, 5, 6, 7];
      const shortIndices = showCorners
        ? [0, 1, 2, 3, 4]
        : [1, 2, 3];

      if (isHoriz) {
        // Horizontal table: Long rails are Top & Bottom
        for (const idx of longIndices) {
          const u = idx / 8.0;
          diamonds.push({ ...mapPt(u, -dMidV), label: String(idx * 10), isLong: true });
          diamonds.push({ ...mapPt(u, 1 + dMidV), label: String(idx * 10), isLong: true });
        }
        for (let i = 1; i <= 7; i++) {
          gridVertical.push({ p1: mapPt(i / 8.0, 0), p2: mapPt(i / 8.0, 1) });
        }

        // Short rails are Left & Right
        for (const idx of shortIndices) {
          const v = idx / 4.0;
          diamonds.push({ ...mapPt(-dMidU, v), label: String(idx * 10), isLong: false });
          diamonds.push({ ...mapPt(1 + dMidU, v), label: String(idx * 10), isLong: false });
        }
        for (let j = 1; j <= 3; j++) {
          gridHorizontal.push({ p1: mapPt(0, j / 4.0), p2: mapPt(1, j / 4.0) });
        }
      } else {
        // Vertical table: Long rails are Left & Right
        for (const idx of longIndices) {
          const v = idx / 8.0;
          diamonds.push({ ...mapPt(-dMidU, v), label: String(idx * 10), isLong: true });
          diamonds.push({ ...mapPt(1 + dMidU, v), label: String(idx * 10), isLong: true });
        }
        for (let i = 1; i <= 7; i++) {
          gridHorizontal.push({ p1: mapPt(0, i / 8.0), p2: mapPt(1, i / 8.0) });
        }

        // Short rails are Top & Bottom
        for (const idx of shortIndices) {
          const u = idx / 4.0;
          diamonds.push({ ...mapPt(u, -dMidV), label: String(idx * 10), isLong: false });
          diamonds.push({ ...mapPt(u, 1 + dMidV), label: String(idx * 10), isLong: false });
        }
        for (let j = 1; j <= 3; j++) {
          gridVertical.push({ p1: mapPt(j / 4.0, 0), p2: mapPt(j / 4.0, 1) });
        }
      }
    } else {
      // HALF TABLE MODE (4x4 diamonds, square 142 x 142 cm)
      for (let i = 1; i <= 3; i++) {
        const f = i / 4.0;
        gridVertical.push({ p1: mapPt(f, 0), p2: mapPt(f, 1) });
        gridHorizontal.push({ p1: mapPt(0, f), p2: mapPt(1, f) });
      }

      if (isHoriz) {
        const dOffset = halfTableZone === 'half_2' ? 40 : 0;
        for (let i = 1; i <= 3; i++) {
          const u = i / 4.0;
          const num = dOffset + i * 10;
          diamonds.push({ ...mapPt(u, -dMidV), label: String(num), isLong: true });
          diamonds.push({ ...mapPt(u, 1 + dMidV), label: String(num), isLong: true });
        }
        const outerU = halfTableZone === 'half_1' ? -dMidU : 1 + dMidU;
        for (let j = 1; j <= 3; j++) {
          const v = j / 4.0;
          diamonds.push({ ...mapPt(outerU, v), label: String(j * 10), isLong: false });
        }

        if (halfTableZone === 'half_1') {
          centerLine = { p1: mapPt(1, 0), p2: mapPt(1, 1) };
          const g0 = mapPt(1, 0);
          const g1 = mapPt(2, 0);
          const g2 = mapPt(2, 1);
          const g3 = mapPt(1, 1);
          ghostPolygonStr = `${g0.x},${g0.y} ${g1.x},${g1.y} ${g2.x},${g2.y} ${g3.x},${g3.y}`;
        } else {
          centerLine = { p1: mapPt(0, 0), p2: mapPt(0, 1) };
          const g0 = mapPt(-1, 0);
          const g1 = mapPt(0, 0);
          const g2 = mapPt(0, 1);
          const g3 = mapPt(-1, 1);
          ghostPolygonStr = `${g0.x},${g0.y} ${g1.x},${g1.y} ${g2.x},${g2.y} ${g3.x},${g3.y}`;
        }
      } else {
        const dOffset = halfTableZone === 'half_2' ? 40 : 0;
        for (let i = 1; i <= 3; i++) {
          const v = i / 4.0;
          const num = dOffset + i * 10;
          diamonds.push({ ...mapPt(-dMidU, v), label: String(num), isLong: true });
          diamonds.push({ ...mapPt(1 + dMidU, v), label: String(num), isLong: true });
        }
        const outerV = halfTableZone === 'half_1' ? -dMidV : 1 + dMidV;
        for (let j = 1; j <= 3; j++) {
          const u = j / 4.0;
          diamonds.push({ ...mapPt(u, outerV), label: String(j * 10), isLong: false });
        }

        if (halfTableZone === 'half_1') {
          centerLine = { p1: mapPt(0, 1), p2: mapPt(1, 1) };
          const g0 = mapPt(0, 1);
          const g1 = mapPt(1, 1);
          const g2 = mapPt(1, 2);
          const g3 = mapPt(0, 2);
          ghostPolygonStr = `${g0.x},${g0.y} ${g1.x},${g1.y} ${g2.x},${g2.y} ${g3.x},${g3.y}`;
        } else {
          centerLine = { p1: mapPt(0, 0), p2: mapPt(1, 0) };
          const g0 = mapPt(0, -1);
          const g1 = mapPt(1, -1);
          const g2 = mapPt(1, 0);
          const g3 = mapPt(0, 0);
          ghostPolygonStr = `${g0.x},${g0.y} ${g1.x},${g1.y} ${g2.x},${g2.y} ${g3.x},${g3.y}`;
        }
      }
    }

    // 5. Extrapolation Guide Rays
    const extRayLines = [
      { p1: mapPt(-0.4, 0), p2: mapPt(1.4, 0) },
      { p1: mapPt(-0.4, 1), p2: mapPt(1.4, 1) },
      { p1: mapPt(0, -0.4), p2: mapPt(0, 1.4) },
      { p1: mapPt(1, -0.4), p2: mapPt(1, 1.4) },
    ];

    return {
      feltPolygonStr,
      cushionPolygonStr,
      woodPolygonStr,
      diamonds,
      gridVertical,
      gridHorizontal,
      ghostPolygonStr,
      centerLine,
      extRayLines,
      isHalf,
      feltCorners: [pFelt0, pFelt1, pFelt2, pFelt3],
    };
  }, [homographyH, imageRect, tableOrientation, tableCoverage, halfTableZone, tablePrefs]);

  // Screen coordinates of the 4 inner corners
  const screenCorners = useMemo(() => {
    if (imageRect.width === 0 || imageRect.height === 0) return [];
    return corners.map((c) => ({
      x: imageRect.x + c.x * imageRect.width,
      y: imageRect.y + c.y * imageRect.height,
    }));
  }, [corners, imageRect]);

  // Screen coordinates of the 3 ball pins on the photo
  const screenBalls = useMemo(() => {
    if (imageRect.width === 0 || imageRect.height === 0) return [];
    return [
      {
        id: 'white' as const,
        label: 'Blanca',
        x: imageRect.x + whiteImagePos.x * imageRect.width,
        y: imageRect.y + whiteImagePos.y * imageRect.height,
        color: '#ffffff',
        accent: '#ef4444',
      },
      {
        id: 'yellow' as const,
        label: 'Amarilla',
        x: imageRect.x + yellowImagePos.x * imageRect.width,
        y: imageRect.y + yellowImagePos.y * imageRect.height,
        color: '#fbbf24',
        accent: '#ef4444',
      },
      {
        id: 'red' as const,
        label: thirdBallMeta.label,
        x: imageRect.x + redImagePos.x * imageRect.width,
        y: imageRect.y + redImagePos.y * imageRect.height,
        color: thirdBallMeta.color,
        accent: thirdBallMeta.accent,
      },
    ];
  }, [whiteImagePos, yellowImagePos, redImagePos, imageRect, thirdBallMeta]);

  // Mutable references for PanResponder so it is never recreated during dragging
  const cornersRef = useRef(corners);
  cornersRef.current = corners;

  const activeCornerIdxRef = useRef(activeCornerIdx);
  activeCornerIdxRef.current = activeCornerIdx;

  const imageRectRef = useRef(imageRect);
  imageRectRef.current = imageRect;

  const whiteImagePosRef = useRef(whiteImagePos);
  whiteImagePosRef.current = whiteImagePos;

  const yellowImagePosRef = useRef(yellowImagePos);
  yellowImagePosRef.current = yellowImagePos;

  const redImagePosRef = useRef(redImagePos);
  redImagePosRef.current = redImagePos;

  const screenCornersRef = useRef(screenCorners);
  screenCornersRef.current = screenCorners;

  const screenBallsRef = useRef(screenBalls);
  screenBallsRef.current = screenBalls;

  const dragTargetRef = useRef<'corner' | 'white' | 'yellow' | 'red' | null>(null);
  const selectedTargetTypeRef = useRef(selectedTargetType);
  selectedTargetTypeRef.current = selectedTargetType;

  const startNormPosRef = useRef<Point2D | null>(null);
  const canvasLayoutRef = useRef<{ pageX: number; pageY: number } | null>(null);

  // Throttled PanResponder Move via requestAnimationFrame to guarantee 60fps and eliminate event storms
  const pendingMoveRef = useRef<{
    target: 'corner' | 'white' | 'yellow' | 'red';
    start: Point2D;
    dx: number;
    dy: number;
    cIdx: number;
    rect: { width: number; height: number };
  } | null>(null);
  const moveRafRef = useRef<number | null>(null);

  const applyPendingMove = useCallback(() => {
    moveRafRef.current = null;
    const pending = pendingMoveRef.current;
    if (!pending) return;
    const { target, start, dx, dy, cIdx, rect } = pending;
    if (rect.width === 0 || rect.height === 0) return;

    const dNormX = dx / rect.width;
    const dNormY = dy / rect.height;

    if (target === 'corner') {
      const newX = Math.max(-0.6, Math.min(1.6, start.x + dNormX));
      const newY = Math.max(-0.6, Math.min(1.6, start.y + dNormY));
      setCorners((prev) => {
        const next = [...prev];
        next[cIdx] = { x: newX, y: newY };
        return next;
      });
      setLoupeCenter({
        x: Math.max(0, Math.min(1, newX)),
        y: Math.max(0, Math.min(1, newY)),
      });
    } else if (target === 'white') {
      const newX = Math.max(0, Math.min(1, start.x + dNormX));
      const newY = Math.max(0, Math.min(1, start.y + dNormY));
      setWhiteImagePos({ x: newX, y: newY });
      setLoupeCenter({ x: newX, y: newY });
    } else if (target === 'yellow') {
      const newX = Math.max(0, Math.min(1, start.x + dNormX));
      const newY = Math.max(0, Math.min(1, start.y + dNormY));
      setYellowImagePos({ x: newX, y: newY });
      setLoupeCenter({ x: newX, y: newY });
    } else if (target === 'red') {
      const newX = Math.max(0, Math.min(1, start.x + dNormX));
      const newY = Math.max(0, Math.min(1, start.y + dNormY));
      setRedImagePos({ x: newX, y: newY });
      setLoupeCenter({ x: newX, y: newY });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, []);

  // CamScanner Gesture Handlers (Drag corners or Drag balls on photo)
  const handleDragStart = useCallback((locX: number, locY: number) => {
    const rect = imageRectRef.current;
    if (rect.width === 0 || rect.height === 0) return;

    // 1. Check balls first with tighter 20px threshold and MINIMUM distance
    let closestBall: any = null;
    let minBallDist = Infinity;
    screenBallsRef.current.forEach((b) => {
      const dist = Math.hypot(locX - b.x, locY - b.y);
      if (dist < minBallDist) {
        minBallDist = dist;
        closestBall = b;
      }
    });

    if (closestBall && minBallDist <= 20) {
      const ballId = closestBall.id;
      dragTargetRef.current = ballId;
      setSelectedTargetType(ballId);
      const bPos =
        ballId === 'white'
          ? whiteImagePosRef.current
          : ballId === 'yellow'
          ? yellowImagePosRef.current
          : redImagePosRef.current;
      startNormPosRef.current = { ...bPos };
      setLoupeCenter({ x: bPos.x, y: bPos.y });
      setIsDragging(true);
      setDragTarget(ballId);
      return;
    }

    // 2. Check corners with 55px threshold and MINIMUM distance
    let closestIdx = 0;
    let minCornerDist = Infinity;
    screenCornersRef.current.forEach((p, idx) => {
      const dist = Math.hypot(locX - p.x, locY - p.y);
      if (dist < minCornerDist) {
        minCornerDist = dist;
        closestIdx = idx;
      }
    });

    if (minCornerDist <= 55) {
      activeCornerIdxRef.current = closestIdx;
      setActiveCornerIdx(closestIdx);
      dragTargetRef.current = 'corner';
      setSelectedTargetType('corner');
      const cPos = cornersRef.current[closestIdx];
      startNormPosRef.current = { ...cPos };
      setLoupeCenter({
        x: Math.max(-0.5, Math.min(1.5, cPos.x)),
        y: Math.max(-0.5, Math.min(1.5, cPos.y)),
      });
      setIsDragging(true);
      setDragTarget('corner');
      return;
    }

    // 3. Fallback: If user tapped canvas, drag the currently selected target
    const currentTargetType = selectedTargetTypeRef.current;
    if (currentTargetType === 'white') {
      dragTargetRef.current = 'white';
      startNormPosRef.current = { ...whiteImagePosRef.current };
      setLoupeCenter({ x: whiteImagePosRef.current.x, y: whiteImagePosRef.current.y });
      setIsDragging(true);
      setDragTarget('white');
    } else if (currentTargetType === 'yellow') {
      dragTargetRef.current = 'yellow';
      startNormPosRef.current = { ...yellowImagePosRef.current };
      setLoupeCenter({ x: yellowImagePosRef.current.x, y: yellowImagePosRef.current.y });
      setIsDragging(true);
      setDragTarget('yellow');
    } else if (currentTargetType === 'red') {
      dragTargetRef.current = 'red';
      startNormPosRef.current = { ...redImagePosRef.current };
      setLoupeCenter({ x: redImagePosRef.current.x, y: redImagePosRef.current.y });
      setIsDragging(true);
      setDragTarget('red');
    } else {
      dragTargetRef.current = 'corner';
      const cPos = cornersRef.current[activeCornerIdxRef.current];
      startNormPosRef.current = { ...cPos };
      setLoupeCenter({
        x: Math.max(-0.5, Math.min(1.5, cPos.x)),
        y: Math.max(-0.5, Math.min(1.5, cPos.y)),
      });
      setIsDragging(true);
      setDragTarget('corner');
    }
  }, []);

  const handleDragMove = useCallback((dx: number, dy: number) => {
    const rect = imageRectRef.current;
    if (rect.width === 0 || rect.height === 0) return;
    if (!startNormPosRef.current) return;

    const target = dragTargetRef.current;
    if (!target) return;

    pendingMoveRef.current = {
      target,
      start: startNormPosRef.current,
      dx,
      dy,
      cIdx: activeCornerIdxRef.current,
      rect,
    };

    if (moveRafRef.current === null) {
      moveRafRef.current = requestAnimationFrame(applyPendingMove);
    }
  }, [applyPendingMove]);

  const handleDragEnd = useCallback(() => {
    if (moveRafRef.current !== null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
      applyPendingMove();
    }
    setIsDragging(false);
    setDragTarget(null);
    dragTargetRef.current = null;
    startNormPosRef.current = null;
  }, [applyPendingMove]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt, gestureState) => {
        const ne = (evt.nativeEvent || evt) as any;
        let locX = ne.locationX;
        let locY = ne.locationY;

        if (canvasLayoutRef.current) {
          const touch = ne.touches?.[0] || ne.changedTouches?.[0];
          const pageX = touch ? touch.pageX : (ne.pageX ?? gestureState.x0);
          const pageY = touch ? touch.pageY : (ne.pageY ?? gestureState.y0);
          if (pageX !== undefined && canvasLayoutRef.current.pageX !== undefined) {
            locX = pageX - canvasLayoutRef.current.pageX;
            locY = pageY - canvasLayoutRef.current.pageY;
          }
        }

        if (locX === undefined || locX === null) locX = ne.offsetX ?? 0;
        if (locY === undefined || locY === null) locY = ne.offsetY ?? 0;

        handleDragStart(locX, locY);
      },
      onPanResponderMove: (_evt, gestureState) => {
        handleDragMove(gestureState.dx, gestureState.dy);
      },
      onPanResponderRelease: () => {
        handleDragEnd();
      },
      onPanResponderTerminate: () => {
        handleDragEnd();
      },
    })
  );

  const pointerDownRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });

  const webGestureHandlers = useMemo(() => {
    if (Platform.OS !== 'web') return panResponder.current.panHandlers;
    return {
      onPointerDown: (e: any) => {
        pointerDownRef.current = true;
        pointerStartRef.current = { x: e.clientX, y: e.clientY };
        try {
          e.currentTarget?.setPointerCapture?.(e.pointerId);
        } catch {}

        const rect = e.currentTarget?.getBoundingClientRect?.();
        let locX = rect ? e.clientX - rect.left : (e.nativeEvent?.offsetX ?? e.clientX);
        let locY = rect ? e.clientY - rect.top : (e.nativeEvent?.offsetY ?? e.clientY);
        handleDragStart(locX, locY);
      },
      onPointerMove: (e: any) => {
        if (!pointerDownRef.current && e.buttons !== 1) return;
        const dx = e.clientX - pointerStartRef.current.x;
        const dy = e.clientY - pointerStartRef.current.y;
        handleDragMove(dx, dy);
      },
      onPointerUp: (e: any) => {
        if (!pointerDownRef.current) return;
        pointerDownRef.current = false;
        try {
          e.currentTarget?.releasePointerCapture?.(e.pointerId);
        } catch {}
        handleDragEnd();
      },
      onPointerCancel: (e: any) => {
        if (!pointerDownRef.current) return;
        pointerDownRef.current = false;
        try {
          e.currentTarget?.releasePointerCapture?.(e.pointerId);
        } catch {}
        handleDragEnd();
      },
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // Precision Nudge for Active Target (Corner or Ball) with D-Pad
  const nudgeActiveTarget = useCallback(
    (dx: number, dy: number) => {
      const step = nudgeStep;
      if (selectedTargetType === 'corner') {
        setCorners((prev) => {
          const next = [...prev];
          const cur = next[activeCornerIdx];
          const newX = Math.max(-0.6, Math.min(1.6, cur.x + dx * step));
          const newY = Math.max(-0.6, Math.min(1.6, cur.y + dy * step));
          next[activeCornerIdx] = { x: newX, y: newY };
          setLoupeCenter({ x: Math.max(0, Math.min(1, newX)), y: Math.max(0, Math.min(1, newY)) });
          return next;
        });
      } else if (selectedTargetType === 'white') {
        setWhiteImagePos((cur) => {
          const newX = Math.max(0, Math.min(1, cur.x + dx * step));
          const newY = Math.max(0, Math.min(1, cur.y + dy * step));
          setLoupeCenter({ x: newX, y: newY });
          return { x: newX, y: newY };
        });
      } else if (selectedTargetType === 'yellow') {
        setYellowImagePos((cur) => {
          const newX = Math.max(0, Math.min(1, cur.x + dx * step));
          const newY = Math.max(0, Math.min(1, cur.y + dy * step));
          setLoupeCenter({ x: newX, y: newY });
          return { x: newX, y: newY };
        });
      } else if (selectedTargetType === 'red') {
        setRedImagePos((cur) => {
          const newX = Math.max(0, Math.min(1, cur.x + dx * step));
          const newY = Math.max(0, Math.min(1, cur.y + dy * step));
          setLoupeCenter({ x: newX, y: newY });
          return { x: newX, y: newY };
        });
      }
      triggerLoupeBriefly();
    },
    [selectedTargetType, activeCornerIdx, nudgeStep, triggerLoupeBriefly]
  );

  const geomValidation = useMemo(() => validateCornersGeometry(corners, isEn), [corners, isEn]);

  const cornerShortLabels = useMemo(() => {
    if (isEn) {
      if (tableOrientation === 'vertical') {
        return ['Bot-Left', 'Top-Left', 'Top-Right', 'Bot-Right'];
      }
      return ['Top-Left', 'Top-Right', 'Bot-Right', 'Bot-Left'];
    }
    if (tableOrientation === 'vertical') {
      return ['Inf-Izq', 'Sup-Izq', 'Sup-Der', 'Inf-Der'];
    }
    return ['Sup-Izq', 'Sup-Der', 'Inf-Der', 'Inf-Izq'];
  }, [tableOrientation, isEn]);

  const cornerFullNames = useMemo(() => {
    if (isEn) {
      if (tableOrientation === 'vertical') {
        return [
          'Corner 1: Bottom Left (Head)',
          'Corner 2: Top Left (Foot)',
          'Corner 3: Top Right (Foot)',
          'Corner 4: Bottom Right (Head)',
        ];
      }
      return [
        'Corner 1: Top Left (Head)',
        'Corner 2: Top Right (Foot)',
        'Corner 3: Bottom Right (Foot)',
        'Corner 4: Bottom Left (Head)',
      ];
    }
    if (tableOrientation === 'vertical') {
      return [
        'Esquina 1: Inferior Izquierda (Entrada)',
        'Esquina 2: Superior Izquierda (Fondo)',
        'Esquina 3: Superior Derecha (Fondo)',
        'Esquina 4: Inferior Derecha (Entrada)',
      ];
    }
    return [
      'Esquina 1: Superior Izquierda (Entrada)',
      'Esquina 2: Superior Derecha (Fondo)',
      'Esquina 3: Inferior Derecha (Fondo)',
      'Esquina 4: Inferior Izquierda (Entrada)',
    ];
  }, [tableOrientation, isEn]);

  const handleResetCorners = useCallback(() => {
    const orig = initialCornersRef.current;
    if (orig && orig.length === 4) {
      setCorners([...orig]);
      setLoupeCenter({
        x: Math.max(0, Math.min(1, orig[activeCornerIdx]?.x ?? 0.5)),
        y: Math.max(0, Math.min(1, orig[activeCornerIdx]?.y ?? 0.5)),
      });
      triggerLoupeBriefly();
    }
  }, [activeCornerIdx, triggerLoupeBriefly]);

  const handleCycleTarget = useCallback(
    (direction: -1 | 1) => {
      if (selectedTargetType === 'corner') {
        const nextIdx = (activeCornerIdx + direction + 4) % 4;
        setActiveCornerIdx(nextIdx);
        setLoupeCenter({
          x: Math.max(0, Math.min(1, corners[nextIdx].x)),
          y: Math.max(0, Math.min(1, corners[nextIdx].y)),
        });
      } else {
        const ballKeys: Array<'white' | 'yellow' | 'red'> = ['white', 'yellow', 'red'];
        const curIdx = ballKeys.indexOf(selectedTargetType);
        const nextIdx = (curIdx + direction + 3) % 3;
        const nextTarget = ballKeys[nextIdx];
        setSelectedTargetType(nextTarget);
        const targetPos =
          nextTarget === 'white' ? whiteImagePos : nextTarget === 'yellow' ? yellowImagePos : redImagePos;
        setLoupeCenter({ x: targetPos.x, y: targetPos.y });
      }
      triggerLoupeBriefly();
    },
    [selectedTargetType, activeCornerIdx, corners, whiteImagePos, yellowImagePos, redImagePos, triggerLoupeBriefly]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />

        <View style={[s.modalContainer, isWide && s.modalContainerWide]}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleWrap}>
              <IconSparkles size={20} color={C.primary} strokeWidth={2} />
              <Text style={s.headerTitle}>
                {isEn ? 'Table Vision Studio' : 'Estudio de Visión de Mesa'}
              </Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <IconX size={18} color={C.textMuted} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Body Content by Step */}
          {step === 'processing' ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.loadingTitle}>
                {isEn
                  ? 'Detecting cushions, diamonds, and balls...'
                  : 'Detectando bandas, diamantes y bolas...'}
              </Text>
              <Text style={s.loadingSub}>
                {isEn
                  ? 'Calculating 8×4 projective grid and playing depth'
                  : 'Calculando cuadrícula proyectiva 8×4 y profundidad de juego'}
              </Text>
            </View>
          ) : step === 'select' ? (
            <ScrollView contentContainerStyle={s.selectBody}>
              {errorMessage && (
                <View style={s.errorBanner}>
                  <IconAlertTriangle size={18} color={C.danger} strokeWidth={2} />
                  <Text style={s.errorText}>{errorMessage}</Text>
                </View>
              )}

              <Text style={s.sectionPrompt}>
                {isEn
                  ? 'Upload or paste a photo of the table (YouTube matches, screenshots, corner angles, or photos from your phone).'
                  : 'Sube o pega una foto de la mesa (partidas de YouTube, capturas de pantalla, tomas desde esquinas o fotos con tu celular).'}
              </Text>

              {/* Action Buttons */}
              <View style={s.actionsGrid}>
                <TouchableOpacity style={s.uploadCard} onPress={pickFromGallery}>
                  <View style={[s.cardIconCircle, { backgroundColor: C.primaryDim }]}>
                    <IconFolder size={24} color={C.primary} strokeWidth={2} />
                  </View>
                  <Text style={s.cardTitle}>
                    {isEn ? 'Upload Image or Capture' : 'Subir Imagen o Captura'}
                  </Text>
                  <Text style={s.cardSub}>
                    {isEn ? 'From your files or gallery' : 'Desde tus archivos o galería'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.uploadCard} onPress={takePhoto}>
                  <View style={[s.cardIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                    <IconCamera size={24} color={C.accentCyan} strokeWidth={2} />
                  </View>
                  <Text style={s.cardTitle}>
                    {isEn ? 'Take Photo' : 'Tomar Fotografía'}
                  </Text>
                  <Text style={s.cardSub}>
                    {isEn ? 'Use your phone camera' : 'Usar la cámara de tu teléfono'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Web Clipboard Helper */}
              {isWeb && (
                <View style={s.clipboardNotice}>
                  <IconClipboard size={18} color={C.textMuted} strokeWidth={2} />
                  <Text style={s.clipboardText}>
                    {isEn ? (
                      <>
                        💡 You can press <Text style={s.boldText}>Ctrl + V</Text> directly to paste any copied YouTube screenshot.
                      </>
                    ) : (
                      <>
                        💡 Puedes presionar <Text style={s.boldText}>Ctrl + V</Text> directamente para pegar cualquier captura de YouTube que tengas copiada.
                      </>
                    )}
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            /* Calibrate & Verification Studio */
            <ScrollView
              contentContainerStyle={s.studioBody}
              scrollEnabled={!isDragging}
            >
              <View style={[s.studioRow, isWide && s.studioRowWide]}>
                {/* Left/Top: Original Image with CamScanner Multilayer Table Overlay */}
                <View style={[s.imagePanel, isWide && s.imagePanelWide]}>
                  <View style={s.panelHeader}>
                    <View style={s.panelHeaderLeft}>
                      <Text style={s.panelTitle}>
                        {isEn ? 'Table Projective Calibrator' : 'Calibrador Proyectivo de Mesa'}
                      </Text>
                      {visionData?.cameraAngle && (
                        <View style={s.badgeAngle}>
                          <Text style={s.badgeAngleText}>
                            {visionData.cameraAngle === 'corner_perspective'
                              ? isEn
                                ? 'Corner Perspective'
                                : 'Ángulo de Esquina'
                              : visionData.cameraAngle === 'broadcast_side'
                              ? isEn
                                ? 'TV Broadcast'
                                : 'Tomas de TV'
                              : isEn
                              ? 'Overhead Camera'
                              : 'Cámara Cenital'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Compact Streamlined Toolbar for Canvas */}
                    <View style={s.canvasTopBar}>
                      {/* Left: Quick Touch-Friendly Action Icons */}
                      <View style={s.canvasActionsLeft}>
                        {/* Orientation Flip */}
                        <TouchableOpacity
                          style={[
                            s.actionIconBtn,
                            tableOrientation === 'vertical' && s.actionIconBtnActive,
                          ]}
                          onPress={() =>
                            setTableOrientation((prev) =>
                              prev === 'horizontal' ? 'vertical' : 'horizontal'
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <IconRotateClockwise
                            size={15}
                            color={tableOrientation === 'vertical' ? (isDark ? '#0a100d' : '#ffffff') : C.accentCyan}
                            strokeWidth={2}
                          />
                          {isWide && (
                            <Text
                              style={[
                                s.actionBtnText,
                                tableOrientation === 'vertical' && s.actionBtnTextActive,
                              ]}
                            >
                              {tableOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {/* Full vs Half Coverage */}
                        <TouchableOpacity
                          style={[
                            s.actionIconBtn,
                            tableCoverage === 'half' && s.actionIconBtnHalf,
                          ]}
                          onPress={() =>
                            setTableCoverage((c) => (c === 'full' ? 'half' : 'full'))
                          }
                          activeOpacity={0.7}
                        >
                          <IconLayoutColumns
                            size={15}
                            color={tableCoverage === 'half' ? (isDark ? '#0a100d' : '#ffffff') : C.textMuted}
                            strokeWidth={2}
                          />
                          {isWide && (
                            <Text
                              style={[
                                s.actionBtnText,
                                tableCoverage === 'half' && s.actionBtnTextActive,
                              ]}
                            >
                              {tableCoverage === 'full'
                                ? isEn
                                  ? 'Full Table'
                                  : 'Mesa Completa'
                                : isEn
                                ? 'Half Table'
                                : 'Media Mesa'}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {/* Half zone switcher */}
                        {tableCoverage === 'half' && (
                          <TouchableOpacity
                            style={s.zoneSwitcherBtn}
                            onPress={() =>
                              setHalfTableZone((z) => (z === 'half_1' ? 'half_2' : 'half_1'))
                            }
                            activeOpacity={0.7}
                          >
                            <IconArrowsExchange size={13} color={C.accentCyan} strokeWidth={2} />
                            <Text style={s.zoneSwitcherText}>
                              {halfTableZone === 'half_1'
                                ? isEn
                                  ? 'Zone 1/2'
                                  : 'Zona 1/2'
                                : isEn
                                ? 'Zone 2/2'
                                : 'Zona 2/2'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Canvas Zoom */}
                        <TouchableOpacity
                          style={[
                            s.actionIconBtn,
                            canvasZoom === 'expanded' && s.actionIconBtnExpanded,
                          ]}
                          onPress={() =>
                            setCanvasZoom((z) => (z === 'fit' ? 'expanded' : 'fit'))
                          }
                          activeOpacity={0.7}
                        >
                          <IconMaximize
                            size={15}
                            color={canvasZoom === 'expanded' ? (isDark ? '#0a100d' : '#ffffff') : C.textMuted}
                            strokeWidth={2}
                          />
                          {isWide && (
                            <Text
                              style={[
                                s.actionBtnText,
                                canvasZoom === 'expanded' && s.actionBtnTextActive,
                              ]}
                            >
                              {canvasZoom === 'expanded'
                                ? 'Zoom 72%'
                                : isEn
                                ? 'Fit'
                                : 'Ajustar'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Right: Fine Controls Toggle and Canvas Filters */}
                      <View style={s.canvasActionsRight}>
                        <TouchableOpacity
                          style={[
                            s.canvasControlBtn,
                            showFineControls && s.canvasControlBtnActive,
                          ]}
                          onPress={() => setShowFineControls((v) => !v)}
                          activeOpacity={0.7}
                        >
                          <IconDeviceGamepad2
                            size={15}
                            color={showFineControls ? (isDark ? '#0a100d' : '#ffffff') : C.accentCyan}
                            strokeWidth={2}
                          />
                          <Text
                            style={[
                              s.canvasControlBtnText,
                              showFineControls && s.canvasControlBtnTextActive,
                            ]}
                          >
                            {isWide
                              ? isEn
                                ? 'Fine Adjustment'
                                : 'Ajuste Fino'
                              : isEn
                              ? 'Controls'
                              : 'Control'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.canvasSettingsBtn}
                          onPress={() => setCanvasSettingsVisible(true)}
                          activeOpacity={0.7}
                        >
                          <IconAdjustments size={15} color={C.primary} strokeWidth={2} />
                          <Text style={s.canvasSettingsBtnText}>
                            {isEn ? 'Filters' : 'Filtros'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      s.imageCanvasWrap,
                      { height: canvasHeight },
                      isWide && s.imageCanvasWrapWide,
                      isWeb && ({ touchAction: 'none' } as any),
                    ]}
                    onLayout={(e) => {
                      const { width, height } = e.nativeEvent.layout;
                      setContainerSize({ width, height });
                      if (canvasRef.current && (canvasRef.current as any).measureInWindow) {
                        (canvasRef.current as any).measureInWindow((x: number, y: number) => {
                          canvasLayoutRef.current = { pageX: x, pageY: y };
                        });
                      }
                    }}>
                    {imageUri && (
                      <Image
                        source={{ uri: imageUri }}
                        style={{
                          position: 'absolute',
                          left: imageRect.x,
                          top: imageRect.y,
                          width: imageRect.width,
                          height: imageRect.height,
                        }}
                        resizeMode="stretch"
                      />
                    )}

                    {/* SVG Multilayer Projected Table & CamScanner Handles */}
                    {containerSize.width > 0 && containerSize.height > 0 && (
                      <View
                        ref={canvasRef}
                        style={[
                          StyleSheet.absoluteFill,
                          { width: containerSize.width, height: containerSize.height },
                          Platform.OS === 'web'
                            ? ({ touchAction: 'none', userSelect: 'none', cursor: isDragging ? 'grabbing' : 'crosshair' } as any)
                            : undefined,
                        ]}
                        {...webGestureHandlers}
                      >
                        <Svg
                          width={containerSize.width}
                          height={containerSize.height}
                          viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              width: containerSize.width,
                              height: containerSize.height,
                              overflow: 'visible',
                              pointerEvents: 'none',
                            },
                          ]}
                        >
                        {/* LAYER 0.1: Photo Frame Boundary (when canvas is expanded) */}
                        {canvasZoom === 'expanded' && (
                          <G>
                            <Rect
                              x={imageRect.x}
                              y={imageRect.y}
                              width={imageRect.width}
                              height={imageRect.height}
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.35)"
                              strokeWidth={1.5}
                              strokeDasharray="4, 4"
                            />
                            <SvgText
                              x={imageRect.x + 8}
                              y={imageRect.y + 14}
                              fill="rgba(255, 255, 255, 0.6)"
                              fontSize="9"
                              fontWeight="bold"
                            >
                              LÍMITE DEL ENCUADRE
                            </SvgText>
                          </G>
                        )}

                        {virtualTableGeometry && (
                          <>
                            {/* LAYER 0.2: Extrapolation Guide Rays */}
                            {virtualTableGeometry.extRayLines?.map((ray, idx) => (
                              <Line
                                key={`ext-ray-${idx}`}
                                x1={ray.p1.x}
                                y1={ray.p1.y}
                                x2={ray.p2.x}
                                y2={ray.p2.y}
                                stroke="rgba(255, 255, 255, 0.2)"
                                strokeWidth={1}
                                strokeDasharray="3, 3"
                              />
                            ))}

                            {/* LAYER 0.3: Ghost Half Table (when in Media Mesa mode) */}
                            {virtualTableGeometry.ghostPolygonStr && (
                              <Polygon
                                points={virtualTableGeometry.ghostPolygonStr}
                                fill="rgba(16, 185, 129, 0.05)"
                                stroke="rgba(16, 185, 129, 0.35)"
                                strokeWidth={1.5}
                                strokeDasharray="5, 4"
                              />
                            )}

                            {/* LAYER 1: Outer Wooden Rail (Pasamanos de Madera) */}
                            {showWoodRails && virtualTableGeometry.woodPolygonStr && (
                              <Polygon
                                points={virtualTableGeometry.woodPolygonStr}
                                fill={C.woodRail}
                                stroke={C.woodRailBorder}
                                strokeWidth={2}
                              />
                            )}

                            {/* LAYER 2: Cushion Rubber Band (Bandas de Goma Oscuras) */}
                            {virtualTableGeometry.cushionPolygonStr && (
                              <Polygon
                                points={virtualTableGeometry.cushionPolygonStr}
                                fill={C.cushionRubber}
                                stroke="rgba(0, 255, 170, 0.3)"
                                strokeWidth={1.5}
                              />
                            )}

                            {/* LAYER 3: Inner Playing Felt Surface (Zona de Juego) */}
                            {virtualTableGeometry.feltPolygonStr && (
                              <Polygon
                                points={virtualTableGeometry.feltPolygonStr}
                                fill={resolveClothPalette(tablePrefs.clothColor).base}
                                fillOpacity={0.08}
                                stroke={C.primary}
                                strokeWidth={2}
                              />
                            )}

                            {/* LAYER 3.5: Center Dividing Line (Half Table) */}
                            {virtualTableGeometry.centerLine && (
                              <Line
                                x1={virtualTableGeometry.centerLine.p1.x}
                                y1={virtualTableGeometry.centerLine.p1.y}
                                x2={virtualTableGeometry.centerLine.p2.x}
                                y2={virtualTableGeometry.centerLine.p2.y}
                                stroke="#f59e0b"
                                strokeWidth={2}
                                strokeDasharray="6, 3"
                              />
                            )}

                            {/* LAYER 4: 8x4 Diamond Aiming Grid Lines */}
                            {showProjectedGrid && (
                              <>
                                {virtualTableGeometry.gridVertical.map((line, idx) => (
                                  <Line
                                    key={`grid-v-${idx}`}
                                    x1={line.p1.x}
                                    y1={line.p1.y}
                                    x2={line.p2.x}
                                    y2={line.p2.y}
                                    stroke="rgba(16, 185, 129, 0.38)"
                                    strokeWidth={1}
                                    strokeDasharray="4, 4"
                                  />
                                ))}

                                {virtualTableGeometry.gridHorizontal.map((line, idx) => (
                                  <Line
                                    key={`grid-h-${idx}`}
                                    x1={line.p1.x}
                                    y1={line.p1.y}
                                    x2={line.p2.x}
                                    y2={line.p2.y}
                                    stroke="rgba(6, 182, 212, 0.38)"
                                    strokeWidth={1}
                                    strokeDasharray="4, 4"
                                  />
                                ))}
                              </>
                            )}

                            {/* LAYER 5: Inlaid Diamonds on the Wooden Rail */}
                            {showDiamonds &&
                              virtualTableGeometry.diamonds.map((d, idx) => {
                                const isCircle = tablePrefs.diamondShape === 'circle';
                                if (isCircle) {
                                  return (
                                    <Circle
                                      key={`diamond-${idx}`}
                                      cx={d.x}
                                      cy={d.y}
                                      r={2.8}
                                      fill="#ffffff"
                                      stroke="#d97706"
                                      strokeWidth={0.8}
                                    />
                                  );
                                }
                                const isHoriz = tableOrientation === 'horizontal';
                                const isLongRail = d.isLong;
                                const dx = isHoriz ? (isLongRail ? 2.2 : 4.4) : (isLongRail ? 4.4 : 2.2);
                                const dy = isHoriz ? (isLongRail ? 4.4 : 2.2) : (isLongRail ? 2.2 : 4.4);
                                return (
                                  <Polygon
                                    key={`diamond-${idx}`}
                                    points={`${d.x},${d.y - dy} ${d.x + dx},${d.y} ${d.x},${d.y + dy} ${d.x - dx},${d.y}`}
                                    fill="#ffffff"
                                    stroke="#d97706"
                                    strokeWidth={0.9}
                                  />
                                );
                              })}
                          </>
                        )}

                        {/* LAYER 6: CamScanner Draggable Ball Pins on Photo */}
                        {screenBalls.map((b) => {
                          const isTarget = selectedTargetType === b.id;
                          return (
                            <G key={`ball-pin-${b.id}`}>
                              {/* Outer Selection / Glow Ring */}
                              <Circle
                                cx={b.x}
                                cy={b.y}
                                r={isTarget ? 11.5 : 9.5}
                                fill={isTarget ? 'rgba(6, 182, 212, 0.35)' : 'rgba(0,0,0,0.25)'}
                                stroke={isTarget ? '#ffffff' : b.color}
                                strokeWidth={isTarget ? 1.8 : 1.2}
                              />
                              {/* Ball Body */}
                              <Circle
                                cx={b.x}
                                cy={b.y}
                                r={7.5}
                                fill={b.color}
                                stroke="#0a100d"
                                strokeWidth={1.2}
                              />
                              {/* Inner Dot for Aramith Cue Ball */}
                              <Circle
                                cx={b.x}
                                cy={b.y}
                                r={1.8}
                                fill={b.accent}
                              />
                            </G>
                          );
                        })}

                        {/* LAYER 7: CamScanner Clean Corner Handles */}
                        {screenCorners.map((p, idx) => {
                          const isActive = selectedTargetType === 'corner' && idx === activeCornerIdx;
                          return (
                            <G key={`cam-corner-${idx}`}>
                              {/* Touch Halo */}
                              <Circle
                                cx={p.x}
                                cy={p.y}
                                r={isActive ? 9 : 6.5}
                                fill={isActive ? 'rgba(2, 132, 199, 0.25)' : 'rgba(0, 0, 0, 0.35)'}
                                stroke={isActive ? '#0284c7' : 'rgba(255, 255, 255, 0.65)'}
                                strokeWidth={isActive ? 1.6 : 1.0}
                              />
                              {/* Solid Center Pin */}
                              <Circle
                                cx={p.x}
                                cy={p.y}
                                r={isActive ? 3.5 : 2.5}
                                fill={isActive ? '#0284c7' : '#ffffff'}
                                stroke="#0a100d"
                                strokeWidth={1.0}
                              />
                            </G>
                          );
                        })}
                        </Svg>
                      </View>
                    )}

                    {/* Centered Top Tactical Precision Scope (2.8x Optical Zoom) */}
                    {(isDragging || isLoupeActive) && imageUri && (() => {
                      const activeScopeColor =
                        selectedTargetType === 'corner'
                          ? '#0284c7'
                          : selectedTargetType === 'yellow'
                          ? '#d97706'
                          : selectedTargetType === 'red'
                          ? thirdBallMeta.color
                          : '#0284c7';
                      const centerDotColor =
                        (dragTarget || selectedTargetType) === 'red'
                          ? '#38bdf8'
                          : '#ef4444';
                      return (
                        <View style={s.loupeTopCenterCard}>
                          {/* 1. Standalone Precision Optical Reticle (Circular) */}
                          <View style={s.loupeCircle}>
                            <Image
                              source={{ uri: imageUri }}
                              style={{
                                position: 'absolute',
                                width: imageRect.width * 2.8,
                                height: imageRect.height * 2.8,
                                left: 52 - loupeCenter.x * (imageRect.width * 2.8),
                                top: 52 - loupeCenter.y * (imageRect.height * 2.8),
                              }}
                              resizeMode="stretch"
                            />
                            {/* Simplified Tactical Precision Scope Reticle (Includes outer concentric bezel rim) */}
                            <NeonCornerReticle
                              size={104}
                              color={activeScopeColor}
                              postColor="#0a100d"
                              centerDotColor={centerDotColor}
                              showVignette={true}
                            />
                          </View>

                          {/* 2. Independent Detached Tooltip / Label Badge */}
                          <View style={[s.loupeTooltipBadge, { borderColor: `${activeScopeColor}66` }]}>
                            <View style={[s.loupeStatusDot, { backgroundColor: activeScopeColor }]} />
                            <Text style={s.loupeTooltipText}>
                              {dragTarget === 'corner' || (!dragTarget && selectedTargetType === 'corner')
                                ? `${isEn ? 'Corner' : 'Esquina'} ${cornerShortLabels[activeCornerIdx]}`
                                : (dragTarget || selectedTargetType) === 'red'
                                ? `${isEn ? 'Ball' : 'Bola'} ${thirdBallMeta.label.toUpperCase()}`
                                : `${isEn ? 'Ball' : 'Bola'} ${(dragTarget || selectedTargetType) === 'white' ? (isEn ? 'WHITE' : 'BLANCA') : (dragTarget || selectedTargetType) === 'yellow' ? (isEn ? 'YELLOW' : 'AMARILLA') : (dragTarget || selectedTargetType)?.toUpperCase()}`}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Corner & Ball Precision D-Pad & Fine-Tuning Bar (Collapsible) */}
                  {showFineControls ? (
                    <View style={s.fineControlsCard}>
                      {/* Header with Title, Step Speed Pills, and Close */}
                      <View style={s.fineControlsHeader}>
                        <View style={s.fineControlsHeaderLeft}>
                          <IconDeviceGamepad2 size={16} color={C.accentCyan} strokeWidth={2} />
                          <Text style={s.fineControlsTitle} numberOfLines={1}>
                            {isEn ? 'Point Adjustment' : 'Ajuste de Puntos'}
                          </Text>
                          {/* Step Speed / Precision Pills */}
                          <View style={s.stepPillsGroup}>
                            {[
                              { val: 0.001, label: isEn ? '0.1% Fine' : '0.1% Fino' },
                              { val: 0.004, label: isEn ? '0.4% Normal' : '0.4% Normal' },
                              { val: 0.012, label: isEn ? '1.2% Fast' : '1.2% Rápido' },
                            ].map((opt) => (
                              <TouchableOpacity
                                key={`step-${opt.val}`}
                                style={[s.stepPill, nudgeStep === opt.val && s.stepPillActive]}
                                onPress={() => setNudgeStep(opt.val)}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    s.stepPillText,
                                    nudgeStep === opt.val && s.stepPillTextActive,
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <TouchableOpacity
                          style={s.fineControlsCloseBtn}
                          onPress={() => setShowFineControls(false)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.fineControlsCloseText}>
                            {isEn ? 'Hide' : 'Ocultar'}
                          </Text>
                          <IconChevronUp size={14} color={C.textMuted} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>

                      {/* Selectors */}
                      <View style={s.fineControlsBody}>
                        <View style={s.targetSelectorWrap}>
                          {/* Corner Tabs with Quick Cycler (◀ Ant. | Sig. ▶) */}
                          <View style={s.selectorSection}>
                            <View style={s.selectorSectionHeader}>
                              <View style={s.selectorHeaderLeft}>
                                <Text style={s.selectorSectionLabel}>
                                  {isEn ? 'Corners' : 'Esquinas'}
                                </Text>
                                <Text style={s.selectorActiveTag} numberOfLines={1}>
                                  {selectedTargetType === 'corner'
                                    ? cornerFullNames[activeCornerIdx]
                                    : isEn
                                    ? 'Select a corner'
                                    : 'Selecciona una esquina'}
                                </Text>
                              </View>
                              <View style={s.navArrowGroup}>
                                <TouchableOpacity
                                  style={s.navArrowBtn}
                                  onPress={() => handleCycleTarget(-1)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={s.navArrowText}>{isEn ? '◀ Prev' : '◀ Ant.'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={s.navArrowBtn}
                                  onPress={() => handleCycleTarget(1)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={s.navArrowText}>{isEn ? 'Next ▶' : 'Sig. ▶'}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View style={s.cornerGridRow}>
                              {cornerShortLabels.map((lbl, idx) => (
                                <TouchableOpacity
                                  key={`ctab-${idx}`}
                                  style={[
                                    s.cornerGridPill,
                                    selectedTargetType === 'corner' && idx === activeCornerIdx && s.selectorPillActiveCorner,
                                  ]}
                                  onPress={() => {
                                    setSelectedTargetType('corner');
                                    setActiveCornerIdx(idx);
                                    setLoupeCenter({
                                      x: Math.max(0, Math.min(1, corners[idx].x)),
                                      y: Math.max(0, Math.min(1, corners[idx].y)),
                                    });
                                    triggerLoupeBriefly();
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      s.cornerGridPillText,
                                      selectedTargetType === 'corner' && idx === activeCornerIdx && s.selectorPillTextActive,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {`${idx + 1}. ${lbl}`}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          {/* Real-Time Geometric Validation Card */}
                          <View
                            style={[
                              s.geomValidationCard,
                              geomValidation.severity === 'success' && s.geomValidationCardSuccess,
                              geomValidation.severity === 'warning' && s.geomValidationCardWarning,
                              geomValidation.severity === 'error' && s.geomValidationCardError,
                            ]}
                          >
                            <View style={s.geomValidationLeft}>
                              {geomValidation.severity === 'success' ? (
                                <IconCheck size={14} color="#10b981" strokeWidth={2.5} />
                              ) : geomValidation.severity === 'warning' ? (
                                <IconAlertTriangle size={14} color="#f59e0b" strokeWidth={2} />
                              ) : (
                                <IconAlertCircle size={14} color="#ef4444" strokeWidth={2} />
                              )}
                              <Text
                                style={[
                                  s.geomValidationText,
                                  geomValidation.severity === 'success' && s.geomValidationTextSuccess,
                                  geomValidation.severity === 'warning' && s.geomValidationTextWarning,
                                  geomValidation.severity === 'error' && s.geomValidationTextError,
                                ]}
                                numberOfLines={1}
                              >
                                {geomValidation.message}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={s.resetCornersBtn}
                              onPress={handleResetCorners}
                              activeOpacity={0.7}
                            >
                              <IconRotateClockwise size={12} color={C.textMuted} strokeWidth={2} />
                              <Text style={s.resetCornersText}>
                                {isEn ? 'Reset' : 'Restablecer'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Ball Tabs */}
                          <View style={s.selectorSection}>
                            <View style={s.selectorSectionHeader}>
                              <Text style={s.selectorSectionLabel}>
                                {isEn ? 'Balls' : 'Bolas'}
                              </Text>
                              {selectedTargetType !== 'corner' && (
                                <Text style={s.selectorActiveTag}>
                                  {isEn ? 'Active:' : 'Activa:'}{' '}
                                  {selectedTargetType === 'white'
                                    ? isEn
                                      ? 'White'
                                      : 'Blanca'
                                    : selectedTargetType === 'yellow'
                                    ? isEn
                                      ? 'Yellow'
                                      : 'Amarilla'
                                    : thirdBallMeta.label}
                                </Text>
                              )}
                            </View>
                            <View style={s.ballGridRow}>
                              {[
                                {
                                  id: 'white' as const,
                                  label: isEn ? 'White' : 'Blanca',
                                  color: '#ffffff',
                                  pos: whiteImagePos,
                                },
                                {
                                  id: 'yellow' as const,
                                  label: isEn ? 'Yellow' : 'Amarilla',
                                  color: '#fbbf24',
                                  pos: yellowImagePos,
                                },
                                {
                                  id: 'red' as const,
                                  label: thirdBallMeta.label,
                                  color: thirdBallMeta.color,
                                  pos: redImagePos,
                                },
                              ].map((b) => (
                                <TouchableOpacity
                                  key={`btab-${b.id}`}
                                  style={[
                                    s.ballGridPill,
                                    selectedTargetType === b.id && s.selectorPillActiveBall,
                                  ]}
                                  onPress={() => {
                                    setSelectedTargetType(b.id);
                                    setLoupeCenter({ x: b.pos.x, y: b.pos.y });
                                    triggerLoupeBriefly();
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View style={[s.ballTabDot, { backgroundColor: b.color }]} />
                                  <Text
                                    style={[
                                      s.ballGridPillText,
                                      selectedTargetType === b.id && s.selectorPillTextActiveBall,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {b.label}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Selector rápido para color de la tercera bola (Roja, Naranja, Azul) */}
                            <View style={s.thirdBallColorRow}>
                              <Text style={s.thirdBallColorPrompt}>
                                {isEn ? 'Ball 3 Color:' : 'Color Bola 3:'}
                              </Text>
                              {(['red', 'orange', 'blue'] as const).map((cOption) => {
                                const isCurrent = thirdBallColor === cOption;
                                const optMeta =
                                  cOption === 'blue'
                                    ? { label: isEn ? 'Blue (PBA)' : 'Azul (PBA)', color: '#2563eb' }
                                    : cOption === 'orange'
                                    ? { label: isEn ? 'Orange' : 'Naranja', color: '#f97316' }
                                    : { label: isEn ? 'Red (UMB)' : 'Roja (UMB)', color: '#ef4444' };
                                return (
                                  <TouchableOpacity
                                    key={`color-opt-${cOption}`}
                                    style={[
                                      s.thirdBallColorPill,
                                      isCurrent && s.thirdBallColorPillActive,
                                    ]}
                                    onPress={() => setThirdBallColor(cOption)}
                                    activeOpacity={0.7}
                                  >
                                    <View style={[s.colorBadgeDot, { backgroundColor: optMeta.color }]} />
                                    <Text
                                      style={[
                                        s.thirdBallColorText,
                                        isCurrent && s.thirdBallColorTextActive,
                                      ]}
                                    >
                                      {optMeta.label}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        </View>

                        {/* D-Pad & Actions */}
                        <View style={s.dpadAndActionRow}>
                          <View style={s.dpadCross}>
                            <TouchableOpacity
                              style={[s.dpadTouchBtn, s.dpadUp]}
                              onPress={() => nudgeActiveTarget(0, -1)}
                              activeOpacity={0.6}
                            >
                              <Text style={s.dpadBtnArrow}>▲</Text>
                            </TouchableOpacity>
                            <View style={s.dpadMidRow}>
                              <TouchableOpacity
                                style={[s.dpadTouchBtn, s.dpadLeft]}
                                onPress={() => nudgeActiveTarget(-1, 0)}
                                activeOpacity={0.6}
                              >
                                <Text style={s.dpadBtnArrow}>◀</Text>
                              </TouchableOpacity>
                              <View style={s.dpadCenter}>
                                <View style={s.dpadCenterDot} />
                              </View>
                              <TouchableOpacity
                                style={[s.dpadTouchBtn, s.dpadRight]}
                                onPress={() => nudgeActiveTarget(1, 0)}
                                activeOpacity={0.6}
                              >
                                <Text style={s.dpadBtnArrow}>▶</Text>
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                              style={[s.dpadTouchBtn, s.dpadDown]}
                              onPress={() => nudgeActiveTarget(0, 1)}
                              activeOpacity={0.6}
                            >
                              <Text style={s.dpadBtnArrow}>▼</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={s.dpadRightCol}>
                            <TouchableOpacity
                              style={s.recalibrateCardBtn}
                              onPress={handleRecalibrate}
                              activeOpacity={0.7}
                            >
                              <IconRefresh size={14} color={C.primary} strokeWidth={2} />
                              <Text style={s.recalibrateCardText}>
                                {isEn ? 'Re-detect' : 'Re-detectar'}
                              </Text>
                            </TouchableOpacity>
                            <Text style={s.dpadHelperText}>
                              {selectedTargetType === 'corner'
                                ? isEn
                                  ? `Moving ${cornerShortLabels[activeCornerIdx]} (±${(nudgeStep * 100).toFixed(1)}%)`
                                  : `Moviendo ${cornerShortLabels[activeCornerIdx]} (±${(nudgeStep * 100).toFixed(1)}%)`
                                : isEn
                                ? `Moving ${selectedTargetType === 'white' ? 'white' : selectedTargetType === 'yellow' ? 'yellow' : thirdBallMeta.label.toLowerCase()} ball (±${(nudgeStep * 100).toFixed(1)}%)`
                                : `Moviendo bola ${selectedTargetType === 'white' ? 'blanca' : selectedTargetType === 'yellow' ? 'amarilla' : thirdBallMeta.label.toLowerCase()} (±${(nudgeStep * 100).toFixed(1)}%)`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.openControlsHintBtn}
                      onPress={() => setShowFineControls(true)}
                      activeOpacity={0.7}
                    >
                      <View style={s.openControlsHintLeft}>
                        <IconDeviceGamepad2 size={15} color={C.accentCyan} strokeWidth={2} />
                        <Text style={s.openControlsHintText} numberOfLines={1}>
                          {isEn ? 'Corner & D-Pad Controls' : 'Control de esquinas y D-Pad'}
                        </Text>
                      </View>
                      <IconChevronDown size={15} color={C.accentCyan} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Right/Bottom: 2D Rectified Table Preview */}
                <View style={[s.tablePanel, isWide && s.tablePanelWide]}>
                  <View style={s.panelHeader}>
                    <Text style={s.panelTitle}>
                      {isEn ? 'Canonical 2:1 Rectified Table' : 'Mesa Rectificada Canónica 2:1'}
                    </Text>
                    <TouchableOpacity
                      style={s.settingsGearBtn}
                      onPress={() => setCustomizerVisible(true)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          s.clothDot,
                          { backgroundColor: resolveClothPalette(tablePrefs.clothColor).base },
                        ]}
                      />
                      <IconSettings size={15} color={C.text} strokeWidth={2} />
                      <Text style={s.settingsGearBtnText}>
                        {isEn ? 'Customize Table' : 'Personalizar Mesa'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Interactive Table with 8x4 Grid & Diamond Numbers */}
                  <View style={s.tableContainer}>
                    <TrainingPlayTable
                      whiteBall={whiteBall}
                      yellowBall={yellowBall}
                      redBall={redBall}
                      redBallColor={thirdBallColor}
                      preferences={tablePrefs}
                    />
                  </View>

                  {/* Tactical Transform Toolbar */}
                  <View style={s.toolsRow}>
                    <TouchableOpacity style={s.toolBtn} onPress={handleRotate90}>
                      <IconRotateClockwise size={16} color={C.text} strokeWidth={2} />
                      <Text style={s.toolBtnText}>{isEn ? 'Rotate 90°' : 'Rotar 90°'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.toolBtn} onPress={handleRotate180}>
                      <IconRotateClockwise size={16} color={C.accentCyan} strokeWidth={2} />
                      <Text style={s.toolBtnText}>{isEn ? 'Rotate 180°' : 'Rotar 180°'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.toolBtn} onPress={handleMirror}>
                      <IconArrowsExchange size={16} color={C.text} strokeWidth={2} />
                      <Text style={s.toolBtnText}>{isEn ? 'Flip Sides' : 'Invertir Lados'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.toolBtn} onPress={handleSwapCue}>
                      <View
                        style={[
                          s.cueDot,
                          { backgroundColor: swapCue ? C.accentYellow : '#ffffff' },
                        ]}
                      />
                      <Text style={s.toolBtnText}>
                        {isEn ? 'Switch Cue Ball' : 'Cambiar Tacador'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.toolBtn}
                      onPress={() =>
                        setThirdBallColor((prev) =>
                          prev === 'red' ? 'orange' : prev === 'orange' ? 'blue' : 'red'
                        )
                      }
                    >
                      <View
                        style={[
                          s.cueDot,
                          { backgroundColor: thirdBallMeta.color },
                        ]}
                      />
                      <Text style={s.toolBtnText}>
                        {isEn ? 'Ball 3:' : 'Bola 3:'} {thirdBallMeta.label}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Position Coordinates Summary */}
                  <View style={s.coordsSummary}>
                    <Text style={s.coordsItem}>
                      ⚪ {isEn ? 'White:' : 'Blanca:'} <Text style={s.coordVal}>{whiteBall.x}cm, {whiteBall.y}cm</Text>
                    </Text>
                    <Text style={s.coordsItem}>
                      🟡 {isEn ? 'Yellow:' : 'Amarilla:'} <Text style={s.coordVal}>{yellowBall.x}cm, {yellowBall.y}cm</Text>
                    </Text>
                    <Text style={s.coordsItem}>
                      {thirdBallMeta.emoji} {thirdBallMeta.label}: <Text style={s.coordVal}>{redBall.x}cm, {redBall.y}cm</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Action Footer - Always 100% visible, fully responsive layout */}
              <View style={s.footerActions}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setStep('select')}
                  activeOpacity={0.7}
                >
                  <Text style={s.cancelBtnText}>
                    {isEn ? 'Choose Another Photo' : 'Elegir Otra Foto'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.secondaryActionBtn}
                  onPress={handleOpenSimulator}
                  activeOpacity={0.7}
                >
                  <IconDeviceGamepad2 size={16} color={C.text} strokeWidth={2} />
                  <Text style={s.secondaryActionText}>
                    {isEn ? 'Simulator' : 'Simulador'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.primaryActionBtn}
                  onPress={handleConfirmTraining}
                  activeOpacity={0.8}
                >
                  <IconCheck size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={s.primaryActionText}>
                    {isEn ? 'Load into Training Table' : 'Cargar en Mesa de Entrenamiento'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      <CanvasViewSettingsModal
        visible={canvasSettingsVisible}
        onClose={() => setCanvasSettingsVisible(false)}
        showWoodRails={showWoodRails}
        onToggleWoodRails={setShowWoodRails}
        showProjectedGrid={showProjectedGrid}
        onToggleProjectedGrid={setShowProjectedGrid}
        showDiamonds={showDiamonds}
        onToggleDiamonds={setShowDiamonds}
        showCornerDiamonds={tablePrefs.showCornerDiamonds !== false}
        onToggleCornerDiamonds={(val) =>
          handleChangeTablePrefs({ ...tablePrefs, showCornerDiamonds: val })
        }
        tableOrientation={tableOrientation}
        onChangeOrientation={setTableOrientation}
        tableCoverage={tableCoverage}
        onChangeTableCoverage={setTableCoverage}
        halfTableZone={halfTableZone}
        onChangeHalfTableZone={setHalfTableZone}
        canvasZoom={canvasZoom}
        onChangeCanvasZoom={setCanvasZoom}
        onOpenTableCustomizer={() => setCustomizerVisible(true)}
      />

      <TableCustomizerModal
        visible={customizerVisible}
        preferences={tablePrefs}
        onClose={() => setCustomizerVisible(false)}
        onChangePreferences={handleChangeTablePrefs}
      />
    </Modal>
  );
}

export const TableVisionStudioModal = memo(TableVisionStudioModalBase);
export default TableVisionStudioModal;

const getStyles = (C: ReturnType<typeof getC>, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(5, 10, 8, 0.88)' : 'rgba(15, 23, 42, 0.60)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    modalContainer: {
      width: '100%',
      maxHeight: '94%',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.6 : 0.15,
      shadowRadius: 24,
      elevation: 20,
    },
    modalContainerWide: {
      maxWidth: 1020,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.surfaceBorder,
      backgroundColor: isDark ? C.surfaceHigh : C.surface,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: C.text,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    loadingContainer: {
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingTitle: {
      marginTop: 20,
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
    },
    loadingSub: {
      marginTop: 6,
      fontSize: 13,
      color: C.textMuted,
    },
    selectBody: {
      padding: 24,
      alignItems: 'center',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      width: '100%',
    },
    errorText: {
      color: isDark ? '#fca5a5' : '#b91c1c',
      fontSize: 13,
      flex: 1,
    },
    sectionPrompt: {
      fontSize: 14,
      color: C.textMuted,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
      maxWidth: 520,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'center',
      width: '100%',
    },
    uploadCard: {
      flex: 1,
      minWidth: 220,
      maxWidth: 280,
      backgroundColor: C.surfaceHigh,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      padding: 24,
      alignItems: 'center',
    },
    cardIconCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: C.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    cardSub: {
      fontSize: 12,
      color: C.textMuted,
      textAlign: 'center',
    },
    clipboardNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 24,
      padding: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    clipboardText: {
      fontSize: 12,
      color: C.textMuted,
    },
    boldText: {
      color: C.text,
      fontWeight: '700',
    },
    studioBody: {
      padding: 16,
      paddingBottom: 32,
      width: '100%',
      maxWidth: '100%',
    },
    studioRow: {
      flexDirection: 'column',
      gap: 16,
      width: '100%',
      maxWidth: '100%',
    },
    studioRowWide: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      maxWidth: '100%',
    },
    imagePanel: {
      width: '100%',
      maxWidth: '100%',
      backgroundColor: C.surfaceHigh,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      padding: 12,
      paddingBottom: 14,
    },
    imagePanelWide: {
      flex: 1.15,
    },
    tablePanel: {
      width: '100%',
      maxWidth: '100%',
      backgroundColor: C.surfaceHigh,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      padding: 12,
      paddingBottom: 14,
    },
    tablePanelWide: {
      flex: 1,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      flexWrap: 'wrap',
      gap: 8,
    },
    panelHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: C.text,
    },
    badgeAngle: {
      backgroundColor: C.primaryDim,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    badgeAngleText: {
      fontSize: 11,
      color: C.primary,
      fontWeight: '600',
    },
    canvasTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      gap: 8,
    },
    canvasActionsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    actionIconBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    actionIconBtnActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    actionIconBtnHalf: {
      backgroundColor: '#f59e0b',
      borderColor: '#f59e0b',
    },
    actionIconBtnExpanded: {
      backgroundColor: '#06b6d4',
      borderColor: '#06b6d4',
    },
    actionBtnText: {
      fontSize: 11,
      color: C.textMuted,
      fontWeight: '600',
    },
    actionBtnTextActive: {
      color: isDark ? '#0a100d' : '#ffffff',
      fontWeight: '700',
    },
    zoneSwitcherBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(2, 132, 199, 0.12)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(2, 132, 199, 0.3)',
    },
    zoneSwitcherText: {
      fontSize: 11,
      color: C.accentCyan,
      fontWeight: '700',
    },
    canvasActionsRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    canvasControlBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(2, 132, 199, 0.10)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(6, 182, 212, 0.35)' : 'rgba(2, 132, 199, 0.25)',
    },
    canvasControlBtnActive: {
      backgroundColor: C.accentCyan,
      borderColor: C.accentCyan,
    },
    canvasControlBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: C.accentCyan,
    },
    canvasControlBtnTextActive: {
      color: '#ffffff',
    },
    canvasSettingsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: C.primaryDim,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.35)',
    },
    canvasSettingsBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: C.primary,
    },
    imageCanvasWrap: {
      width: '100%',
      height: 330,
      backgroundColor: '#050a08',
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageCanvasWrapWide: {
      height: 460,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    loupeTopCenterCard: {
      position: 'absolute',
      top: 8,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 99,
    },
    loupeCircle: {
      width: 104,
      height: 104,
      borderRadius: 52,
      overflow: 'hidden',
      backgroundColor: '#050a08',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.75,
      shadowRadius: 10,
      elevation: 10,
    },
    loupeTooltipBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      backgroundColor: isDark ? 'rgba(10, 16, 13, 0.90)' : 'rgba(15, 23, 42, 0.88)',
      paddingHorizontal: 10,
      paddingVertical: 3.5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(2, 132, 199, 0.35)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
      elevation: 6,
    },
    loupeStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
    },
    loupeTooltipText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#f1f5f3',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    dpadBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)',
      borderRadius: 8,
      padding: 8,
      marginTop: 10,
      gap: 8,
    },
    fineControlsCard: {
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(2, 132, 199, 0.25)',
      padding: 10,
      marginTop: 10,
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      gap: 10,
    },
    fineControlsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      width: '100%',
      gap: 8,
    },
    fineControlsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    fineControlsTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: C.text,
      flexShrink: 1,
    },
    stepPillsGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.06)',
      padding: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    stepPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    stepPillActive: {
      backgroundColor: C.accentCyan,
    },
    stepPillText: {
      fontSize: 9.5,
      fontWeight: '600',
      color: C.textMuted,
    },
    stepPillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    fineControlsCloseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      flexShrink: 0,
    },
    fineControlsCloseText: {
      fontSize: 11,
      fontWeight: '600',
      color: C.textMuted,
    },
    fineControlsBody: {
      flexDirection: 'column',
      gap: 10,
      width: '100%',
    },
    targetSelectorWrap: {
      flexDirection: 'column',
      gap: 8,
      width: '100%',
    },
    selectorSection: {
      flexDirection: 'column',
      gap: 4,
      width: '100%',
    },
    selectorSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      gap: 8,
    },
    selectorHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    navArrowGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    },
    navArrowBtn: {
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    navArrowText: {
      fontSize: 9.5,
      fontWeight: '600',
      color: C.text,
    },
    selectorSectionLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      color: C.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      flexShrink: 0,
    },
    selectorActiveTag: {
      fontSize: 10,
      fontWeight: '600',
      color: C.accentCyan,
      flex: 1,
      minWidth: 0,
    },
    cornerGridRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 5,
    },
    cornerGridPill: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 2,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    cornerGridPillText: {
      fontSize: 11,
      color: C.textMuted,
      fontWeight: '600',
    },
    geomValidationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      gap: 6,
      width: '100%',
    },
    geomValidationCardSuccess: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
    },
    geomValidationCardWarning: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
    },
    geomValidationCardError: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.25)',
    },
    geomValidationLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    geomValidationText: {
      fontSize: 10.5,
      color: C.textMuted,
      fontWeight: '500',
      flex: 1,
    },
    geomValidationTextSuccess: {
      color: isDark ? '#34d399' : '#059669',
      fontWeight: '600',
    },
    geomValidationTextWarning: {
      color: isDark ? '#fbbf24' : '#d97706',
      fontWeight: '600',
    },
    geomValidationTextError: {
      color: isDark ? '#f87171' : '#dc2626',
      fontWeight: '600',
    },
    resetCornersBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      flexShrink: 0,
    },
    resetCornersText: {
      fontSize: 10,
      fontWeight: '600',
      color: C.textMuted,
    },
    ballGridRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: 5,
    },
    ballGridPill: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 2,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: C.surfaceBorder,
      gap: 5,
    },
    ballGridPillText: {
      fontSize: 11,
      color: C.textMuted,
      fontWeight: '600',
    },
    thirdBallColorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      flexWrap: 'wrap',
    },
    thirdBallColorPrompt: {
      fontSize: 10,
      fontWeight: '700',
      color: C.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    thirdBallColorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 3,
      paddingHorizontal: 7,
      borderRadius: 5,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    thirdBallColorPillActive: {
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(2, 132, 199, 0.12)',
      borderColor: C.accentCyan,
    },
    colorBadgeDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    thirdBallColorText: {
      fontSize: 10,
      fontWeight: '600',
      color: C.textMuted,
    },
    thirdBallColorTextActive: {
      color: C.text,
      fontWeight: '700',
    },
    selectorPillActiveCorner: {
      backgroundColor: C.accentCyan,
      borderColor: C.accentCyan,
    },
    selectorPillActiveBall: {
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(2, 132, 199, 0.18)',
      borderColor: C.accentCyan,
    },
    selectorPillTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    selectorPillTextActiveBall: {
      color: isDark ? '#ffffff' : '#0369a1',
      fontWeight: '700',
    },
    dpadAndActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      width: '100%',
      gap: 12,
    },
    dpadCross: {
      alignItems: 'center',
      flexShrink: 0,
    },
    dpadMidRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dpadTouchBtn: {
      width: 36,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? C.surface : '#ffffff',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    dpadUp: {
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 3,
      marginBottom: 2,
    },
    dpadDown: {
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
      marginTop: 2,
    },
    dpadLeft: {
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
      marginRight: 2,
    },
    dpadRight: {
      borderTopLeftRadius: 3,
      borderBottomLeftRadius: 3,
      marginLeft: 2,
    },
    dpadCenter: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dpadCenterDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.accentCyan,
      opacity: 0.6,
    },
    dpadBtnArrow: {
      fontSize: 12,
      color: C.text,
      fontWeight: 'bold',
    },
    dpadRightCol: {
      flex: 1,
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 4,
      flexShrink: 1,
      minWidth: 0,
    },
    recalibrateCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.primaryDim,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.35)',
      flexShrink: 0,
    },
    recalibrateCardText: {
      fontSize: 12,
      color: C.primary,
      fontWeight: '700',
    },
    dpadHelperText: {
      fontSize: 10,
      color: C.textMuted,
      textAlign: 'right',
    },
    openControlsHintBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(2, 132, 199, 0.08)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(2, 132, 199, 0.20)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 10,
      width: '100%',
      maxWidth: '100%',
      gap: 8,
    },
    openControlsHintLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      overflow: 'hidden',
    },
    openControlsHintText: {
      fontSize: 12,
      color: isDark ? '#a5f3fc' : '#0369a1',
      fontWeight: '600',
      flexShrink: 1,
    },
    targetSelectorCol: {
      flexDirection: 'column',
      gap: 5,
    },
    cornerTabsRow: {
      flexDirection: 'row',
      gap: 4,
    },
    cornerTab: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    cornerTabActive: {
      backgroundColor: C.accentCyan,
      borderColor: C.accentCyan,
    },
    cornerTabText: {
      fontSize: 10.5,
      color: C.textMuted,
      fontWeight: '600',
    },
    cornerTabTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    ballTabsRow: {
      flexDirection: 'row',
      gap: 4,
    },
    ballTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    ballTabActive: {
      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(2, 132, 199, 0.18)',
      borderColor: C.accentCyan,
    },
    ballTabDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    ballTabText: {
      fontSize: 9.5,
      color: C.textMuted,
      fontWeight: '600',
    },
    ballTabTextActive: {
      color: isDark ? '#ffffff' : '#0369a1',
      fontWeight: '700',
    },
    dpadGroup: {
      alignItems: 'center',
    },
    dpadHoriz: {
      flexDirection: 'row',
      gap: 14,
    },
    dpadBtn: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: C.surfaceHigh,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    dpadBtnText: {
      fontSize: 11,
      color: C.text,
    },
    recalibrateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.primaryDim,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    recalibrateText: {
      fontSize: 12,
      color: C.primary,
      fontWeight: '700',
    },
    settingsGearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    settingsGearBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.text,
    },
    clothToggle: {
      flexDirection: 'row',
      gap: 6,
    },
    clothBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    clothBtnActive: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
      borderColor: C.primary,
    },
    clothDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    clothBtnText: {
      fontSize: 12,
      color: C.textMuted,
      fontWeight: '600',
    },
    tableContainer: {
      width: '100%',
      marginVertical: 4,
    },
    toolsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 10,
      flexWrap: 'wrap',
    },
    toolBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? C.surfaceBorder : 'rgba(0, 0, 0, 0.06)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 6,
    },
    toolBtnText: {
      fontSize: 12,
      color: C.text,
      fontWeight: '600',
    },
    cueDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#0a100d' : '#94a3b8',
    },
    coordsSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      padding: 10,
      backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)',
      borderRadius: 8,
      borderWidth: isDark ? 0 : 1,
      borderColor: C.surfaceBorder,
    },
    coordsItem: {
      fontSize: 12,
      color: C.textMuted,
    },
    coordVal: {
      color: C.text,
      fontWeight: '700',
    },
    footerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: C.surfaceBorder,
      width: '100%',
    },
    cancelBtn: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 135,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    cancelBtnText: {
      fontSize: 13,
      color: C.textMuted,
      fontWeight: '600',
      textAlign: 'center',
    },
    secondaryActionBtn: {
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 120,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? C.surfaceHigh : 'rgba(0,0,0,0.04)',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: C.surfaceBorder,
    },
    secondaryActionText: {
      fontSize: 13,
      color: C.text,
      fontWeight: '600',
      textAlign: 'center',
    },
    primaryActionBtn: {
      flexGrow: 2,
      flexShrink: 0,
      minWidth: 260,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.primary,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 8,
    },
    primaryActionText: {
      fontSize: 13.5,
      color: '#ffffff',
      fontWeight: '700',
      textAlign: 'center',
    },
  });
