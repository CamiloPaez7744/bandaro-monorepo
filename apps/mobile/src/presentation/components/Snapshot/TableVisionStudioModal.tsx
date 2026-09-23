import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  IconAdjustments,
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
import {
  type TablePreferences,
  DEFAULT_TABLE_PREFERENCES,
  loadTablePreferences,
  saveTablePreferences,
  resolveClothPalette,
} from '@/src/presentation/components/Training/tablePreferences';
import {
  resolveBilliardPhysics,
  type PhysicsPoint,
} from './billiardPhysics';

const isWeb = Platform.OS === 'web';

const C = {
  bg: '#0a100d',
  surface: '#13201b',
  surfaceHigh: '#1a2c26',
  surfaceBorder: '#29443b',
  primary: '#10b981',
  primaryHover: '#059669',
  primaryDim: 'rgba(16, 185, 129, 0.15)',
  text: '#f1f5f3',
  textMuted: '#94a39d',
  danger: '#ef4444',
  accentCyan: '#06b6d4',
  accentYellow: '#eab308',
  woodRail: 'rgba(92, 46, 18, 0.12)',
  woodRailBorder: 'rgba(217, 160, 60, 0.40)',
  cushionRubber: 'rgba(12, 28, 22, 0.16)',
};

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

function TableVisionStudioModalBase({
  visible,
  onClose,
  onSelectPosition,
}: TableVisionStudioModalProps) {
  const router = useRouter();
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

  // Visual toggles
  const [showProjectedGrid, setShowProjectedGrid] = useState(true);
  const [showWoodRails, setShowWoodRails] = useState(true);
  const [showDiamonds, setShowDiamonds] = useState(true);

  // Ball positions in normalized image coordinates (0..1)
  const [whiteImagePos, setWhiteImagePos] = useState<Point2D>({ x: 0.35, y: 0.55 });
  const [yellowImagePos, setYellowImagePos] = useState<Point2D>({ x: 0.65, y: 0.35 });
  const [redImagePos, setRedImagePos] = useState<Point2D>({ x: 0.72, y: 0.68 });

  // Tactical toggles
  const [swapCue, setSwapCue] = useState(false);
  const [tablePrefs, setTablePrefs] = useState<TablePreferences>(DEFAULT_TABLE_PREFERENCES);
  const [customizerVisible, setCustomizerVisible] = useState(false);
  const [canvasSettingsVisible, setCanvasSettingsVisible] = useState(false);
  const [tableOrientation, setTableOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [canvasZoom, setCanvasZoom] = useState<'fit' | 'expanded'>('fit');
  const [tableCoverage, setTableCoverage] = useState<'full' | 'half'>('full');
  const [halfTableZone, setHalfTableZone] = useState<'half_1' | 'half_2'>('half_1');
  const [showFineControls, setShowFineControls] = useState(false);

  useEffect(() => {
    loadTablePreferences().then((loaded) => {
      setTablePrefs(loaded);
    });
  }, []);

  const handleChangeTablePrefs = useCallback((newPrefs: TablePreferences) => {
    setTablePrefs(newPrefs);
    saveTablePreferences(newPrefs);
  }, []);

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
        rawW = { x: wCan.y * 284, y: wCan.x * 142 };
        rawY = { x: yCan.y * 284, y: yCan.x * 142 };
        rawR = { x: rCan.y * 284, y: rCan.x * 142 };
      }
    } else {
      const offset = halfTableZone === 'half_2' ? 142 : 0;
      if (tableOrientation === 'horizontal') {
        rawW = { x: offset + wCan.x * 142, y: wCan.y * 142 };
        rawY = { x: offset + yCan.x * 142, y: yCan.y * 142 };
        rawR = { x: offset + rCan.x * 142, y: rCan.y * 142 };
      } else {
        rawW = { x: offset + wCan.y * 142, y: wCan.x * 142 };
        rawY = { x: offset + yCan.y * 142, y: yCan.x * 142 };
        rawR = { x: offset + rCan.y * 142, y: rCan.x * 142 };
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

        const newH = computeQuadHomography(currentCorners);

        // Set initial ball positions on image & 2D table
        if (res.balls && res.balls.length >= 3) {
          const wB = res.balls.find((b) => b.label === 'white') ?? res.balls[0];
          const yB = res.balls.find((b) => b.label === 'yellow') ?? res.balls[1];
          const rB = res.balls.find((b) => b.label === 'red') ?? res.balls[2];

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
        setStep('calibrate');
        setErrorMessage(
          'Detección automática con baja confianza. Puedes ajustar manualmente las 4 esquinas de la mesa y la posición de las bolas usando los tiradores y la lupa.'
        );
      }
    },
    [imageSize]
  );

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
            processImage(blobUrl);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [visible, processImage]);

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
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería de fotos.');
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
        Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.');
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
    setWhiteImagePos((p) => ({ x: 1 - p.x, y: p.y }));
    setYellowImagePos((p) => ({ x: 1 - p.x, y: p.y }));
    setRedImagePos((p) => ({ x: 1 - p.x, y: p.y }));
  }, []);

  const handleSwapCue = useCallback(() => {
    setSwapCue((v) => !v);
  }, []);

  // Re-run detection with current calibrated corners
  const handleRecalibrate = useCallback(() => {
    if (imageUri) {
      processImage(imageUri, corners);
    }
  }, [imageUri, corners, processImage]);

  // Confirm and practice
  const handleConfirmTraining = useCallback(() => {
    onClose();
    if (onSelectPosition) {
      onSelectPosition({
        white: whiteBall,
        yellow: yellowBall,
        red: redBall,
        name: 'Posición de Foto/YouTube',
      });
    } else if (visionData?.snapshotId) {
      router.push(`/training/simulate?snapshotId=${visionData.snapshotId}`);
    }
  }, [onClose, onSelectPosition, whiteBall, yellowBall, redBall, visionData, router]);

  // Open in simulator
  const handleOpenSimulator = useCallback(() => {
    onClose();
    if (visionData?.snapshotId) {
      router.push(`/training/simulate?snapshotId=${visionData.snapshotId}`);
    }
  }, [onClose, visionData, router]);

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
      const showCorners = tablePrefs.showCornerDiamonds !== false;
      const is9x5 = tablePrefs.diamondCount === '9_5';

      if (isHoriz) {
        // Horizontal table: Long rails are Top & Bottom
        const longIndices = is9x5
          ? (showCorners ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7])
          : (showCorners ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7]);

        for (const idx of longIndices) {
          const u = idx / 8.0;
          diamonds.push({ ...mapPt(u, -dMidV), label: String(idx * 10), isLong: true });
          diamonds.push({ ...mapPt(u, 1 + dMidV), label: String(idx * 10), isLong: true });
        }
        for (let i = 1; i <= 7; i++) {
          gridVertical.push({ p1: mapPt(i / 8.0, 0), p2: mapPt(i / 8.0, 1) });
        }

        // Short rails are Left & Right
        const shortIndices = is9x5
          ? (showCorners ? [0, 1, 2, 3, 4] : [1, 2, 3])
          : (showCorners ? [0, 1, 2, 3, 4] : [1, 2, 3]);

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
        const longIndices = is9x5
          ? (showCorners ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7])
          : (showCorners ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7]);

        for (const idx of longIndices) {
          const v = idx / 8.0;
          diamonds.push({ ...mapPt(-dMidU, v), label: String(idx * 10), isLong: true });
          diamonds.push({ ...mapPt(1 + dMidU, v), label: String(idx * 10), isLong: true });
        }
        for (let i = 1; i <= 7; i++) {
          gridHorizontal.push({ p1: mapPt(0, i / 8.0), p2: mapPt(1, i / 8.0) });
        }

        // Short rails are Top & Bottom
        const shortIndices = is9x5
          ? (showCorners ? [0, 1, 2, 3, 4] : [1, 2, 3])
          : (showCorners ? [0, 1, 2, 3, 4] : [1, 2, 3]);

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
        label: 'Roja',
        x: imageRect.x + redImagePos.x * imageRect.width,
        y: imageRect.y + redImagePos.y * imageRect.height,
        color: '#ef4444',
        accent: '#ffffff',
      },
    ];
  }, [whiteImagePos, yellowImagePos, redImagePos, imageRect]);

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

  // CamScanner Gesture PanResponder (Drag corners or Drag balls on photo)
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

        if (isWeb && canvasRef.current) {
          const rect = (canvasRef.current as any).getBoundingClientRect?.();
          if (rect) {
            const touch = ne.touches?.[0] || ne.changedTouches?.[0];
            const clientX = touch ? touch.clientX : (ne.clientX ?? (evt as any).clientX);
            const clientY = touch ? touch.clientY : (ne.clientY ?? (evt as any).clientY);
            if (clientX !== undefined && clientY !== undefined) {
              locX = clientX - rect.left;
              locY = clientY - rect.top;
            }
          }
        } else if (canvasLayoutRef.current) {
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
      },
      onPanResponderMove: (evt, gestureState) => {
        const rect = imageRectRef.current;
        if (rect.width === 0 || rect.height === 0) return;
        if (!startNormPosRef.current) return;

        const target = dragTargetRef.current;
        if (!target) return;

        pendingMoveRef.current = {
          target,
          start: startNormPosRef.current,
          dx: gestureState.dx,
          dy: gestureState.dy,
          cIdx: activeCornerIdxRef.current,
          rect,
        };

        if (moveRafRef.current === null) {
          moveRafRef.current = requestAnimationFrame(applyPendingMove);
        }
      },
      onPanResponderRelease: () => {
        if (moveRafRef.current !== null) {
          cancelAnimationFrame(moveRafRef.current);
          moveRafRef.current = null;
          applyPendingMove();
        }
        setIsDragging(false);
        setDragTarget(null);
        dragTargetRef.current = null;
        startNormPosRef.current = null;
      },
      onPanResponderTerminate: () => {
        if (moveRafRef.current !== null) {
          cancelAnimationFrame(moveRafRef.current);
          moveRafRef.current = null;
          applyPendingMove();
        }
        setIsDragging(false);
        setDragTarget(null);
        dragTargetRef.current = null;
        startNormPosRef.current = null;
      },
    })
  );

  // Precision Nudge for Active Target (Corner or Ball) with D-Pad
  const nudgeActiveTarget = useCallback(
    (dx: number, dy: number) => {
      const step = 0.004; // 0.4% fine step
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
    [selectedTargetType, activeCornerIdx, triggerLoupeBriefly]
  );

  const cornerShortLabels = ['C1 (TL)', 'C2 (TR)', 'C3 (BR)', 'C4 (BL)'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />

        <View style={[s.modalContainer, isWide && s.modalContainerWide]}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleWrap}>
              <IconSparkles size={20} color={C.primary} strokeWidth={2} />
              <Text style={s.headerTitle}>Estudio de Visión de Mesa</Text>
            </View>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <IconX size={18} color={C.textMuted} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Body Content by Step */}
          {step === 'processing' ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.loadingTitle}>Detectando bandas, diamantes y bolas...</Text>
              <Text style={s.loadingSub}>
                Calculando cuadrícula proyectiva 8×4 y profundidad de juego
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
                Sube o pega una foto de la mesa (partidas de YouTube, capturas de pantalla, tomas
                desde esquinas o fotos con tu celular).
              </Text>

              {/* Action Buttons */}
              <View style={s.actionsGrid}>
                <TouchableOpacity style={s.uploadCard} onPress={pickFromGallery}>
                  <View style={[s.cardIconCircle, { backgroundColor: C.primaryDim }]}>
                    <IconFolder size={24} color={C.primary} strokeWidth={2} />
                  </View>
                  <Text style={s.cardTitle}>Subir Imagen o Captura</Text>
                  <Text style={s.cardSub}>Desde tus archivos o galería</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.uploadCard} onPress={takePhoto}>
                  <View style={[s.cardIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                    <IconCamera size={24} color={C.accentCyan} strokeWidth={2} />
                  </View>
                  <Text style={s.cardTitle}>Tomar Fotografía</Text>
                  <Text style={s.cardSub}>Usar la cámara de tu teléfono</Text>
                </TouchableOpacity>
              </View>

              {/* Web Clipboard Helper */}
              {isWeb && (
                <View style={s.clipboardNotice}>
                  <IconClipboard size={18} color={C.textMuted} strokeWidth={2} />
                  <Text style={s.clipboardText}>
                    💡 Puedes presionar <Text style={s.boldText}>Ctrl + V</Text> directamente para pegar
                    cualquier captura de YouTube que tengas copiada.
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
                      <Text style={s.panelTitle}>Calibrador Proyectivo de Mesa</Text>
                      {visionData?.cameraAngle && (
                        <View style={s.badgeAngle}>
                          <Text style={s.badgeAngleText}>
                            {visionData.cameraAngle === 'corner_perspective'
                              ? 'Ángulo de Esquina'
                              : visionData.cameraAngle === 'broadcast_side'
                              ? 'Tomas de TV'
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
                            color={tableOrientation === 'vertical' ? '#0a100d' : C.accentCyan}
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
                            color={tableCoverage === 'half' ? '#0a100d' : C.textMuted}
                            strokeWidth={2}
                          />
                          {isWide && (
                            <Text
                              style={[
                                s.actionBtnText,
                                tableCoverage === 'half' && s.actionBtnTextActive,
                              ]}
                            >
                              {tableCoverage === 'full' ? 'Mesa Completa' : 'Media Mesa'}
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
                              {halfTableZone === 'half_1' ? 'Zona 1/2' : 'Zona 2/2'}
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
                            color={canvasZoom === 'expanded' ? '#0a100d' : C.textMuted}
                            strokeWidth={2}
                          />
                          {isWide && (
                            <Text
                              style={[
                                s.actionBtnText,
                                canvasZoom === 'expanded' && s.actionBtnTextActive,
                              ]}
                            >
                              {canvasZoom === 'expanded' ? 'Zoom 72%' : 'Ajustar'}
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
                            color={showFineControls ? '#0a100d' : C.accentCyan}
                            strokeWidth={2}
                          />
                          <Text
                            style={[
                              s.canvasControlBtnText,
                              showFineControls && s.canvasControlBtnTextActive,
                            ]}
                          >
                            {isWide ? 'Ajuste Fino' : 'Control'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={s.canvasSettingsBtn}
                          onPress={() => setCanvasSettingsVisible(true)}
                          activeOpacity={0.7}
                        >
                          <IconAdjustments size={15} color={C.primary} strokeWidth={2} />
                          <Text style={s.canvasSettingsBtnText}>Filtros</Text>
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
                        ]}
                        {...panResponder.current.panHandlers}
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
                            },
                          ]}
                          pointerEvents="none"
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
                                r={isTarget ? 15 : 13.5}
                                fill={isTarget ? 'rgba(6, 182, 212, 0.4)' : 'rgba(0,0,0,0.3)'}
                                stroke={isTarget ? '#ffffff' : b.color}
                                strokeWidth={isTarget ? 2 : 1.5}
                              />
                              {/* Ball Body */}
                              <Circle
                                cx={b.x}
                                cy={b.y}
                                r={10.5}
                                fill={b.color}
                                stroke="#0a100d"
                                strokeWidth={1.5}
                              />
                              {/* Inner Dot for Aramith Cue Ball */}
                              <Circle
                                cx={b.x}
                                cy={b.y}
                                r={2.5}
                                fill={b.accent}
                              />
                            </G>
                          );
                        })}

                        {/* LAYER 7: CamScanner 4 Prominent Corner Handles */}
                        {screenCorners.map((p, idx) => {
                          const isActive = selectedTargetType === 'corner' && idx === activeCornerIdx;
                          return (
                            <G key={`cam-corner-${idx}`}>
                              {/* Large Touch Target Ring */}
                              <Circle
                                cx={p.x}
                                cy={p.y}
                                r={isActive ? 22 : 16}
                                fill={isActive ? 'rgba(6, 182, 212, 0.35)' : 'rgba(0,0,0,0.35)'}
                                stroke={isActive ? '#ffffff' : C.accentCyan}
                                strokeWidth={isActive ? 2.5 : 1.8}
                              />
                              {/* Solid Center Pin */}
                              <Circle
                                cx={p.x}
                                cy={p.y}
                                r={7}
                                fill={isActive ? C.accentCyan : '#ffffff'}
                                stroke="#0a100d"
                                strokeWidth={1.5}
                              />
                            </G>
                          );
                        })}
                        </Svg>
                      </View>
                    )}

                    {/* CamScanner Floating Magnifying Loupe (2.8x Precision Zoom) */}
                    {(isDragging || isLoupeActive) && imageUri && (
                      <View
                        style={[
                          s.loupeFloatCard,
                          loupeCenter.x > 0.55 && loupeCenter.y < 0.45 && s.loupeFloatCardLeft,
                        ]}
                      >
                        <View style={s.loupeCircle}>
                          <Image
                            source={{ uri: imageUri }}
                            style={{
                              position: 'absolute',
                              width: imageRect.width * 2.8,
                              height: imageRect.height * 2.8,
                              left: 50 - loupeCenter.x * (imageRect.width * 2.8),
                              top: 50 - loupeCenter.y * (imageRect.height * 2.8),
                            }}
                            resizeMode="stretch"
                          />
                          {/* Crosshair Target */}
                          <View style={s.loupeCrosshairH} />
                          <View style={s.loupeCrosshairV} />
                          <View style={s.loupeCenterRing} />
                        </View>
                        <Text style={s.loupeTag}>
                          {dragTarget === 'corner' || (!dragTarget && selectedTargetType === 'corner')
                            ? `Esquina ${cornerShortLabels[activeCornerIdx]}`
                            : `Bola ${(dragTarget || selectedTargetType)?.toUpperCase()}`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Corner & Ball Precision D-Pad & Fine-Tuning Bar (Collapsible) */}
                  {showFineControls ? (
                    <View style={s.fineControlsCard}>
                      {/* Header */}
                      <View style={s.fineControlsHeader}>
                        <View style={s.fineControlsHeaderLeft}>
                          <IconDeviceGamepad2 size={16} color={C.accentCyan} strokeWidth={2} />
                          <Text style={s.fineControlsTitle} numberOfLines={1}>
                            Ajuste Fino Milimétrico
                          </Text>
                          <View style={s.fineStepBadge}>
                            <Text style={s.fineStepBadgeText}>±0.4%</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={s.fineControlsCloseBtn}
                          onPress={() => setShowFineControls(false)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.fineControlsCloseText}>Ocultar</Text>
                          <IconChevronUp size={14} color={C.textMuted} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>

                      {/* Selectors */}
                      <View style={s.fineControlsBody}>
                        <View style={s.targetSelectorWrap}>
                          {/* Corner Tabs */}
                          <View style={s.selectorSection}>
                            <View style={s.selectorSectionHeader}>
                              <Text style={s.selectorSectionLabel}>Esquinas</Text>
                              {selectedTargetType === 'corner' && (
                                <Text style={s.selectorActiveTag}>
                                  Activa: C{activeCornerIdx + 1}
                                </Text>
                              )}
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
                                    {lbl}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          {/* Ball Tabs */}
                          <View style={s.selectorSection}>
                            <View style={s.selectorSectionHeader}>
                              <Text style={s.selectorSectionLabel}>Bolas</Text>
                              {selectedTargetType !== 'corner' && (
                                <Text style={s.selectorActiveTag}>
                                  Activa: {selectedTargetType === 'white' ? 'Blanca' : selectedTargetType === 'yellow' ? 'Amarilla' : 'Roja'}
                                </Text>
                              )}
                            </View>
                            <View style={s.ballGridRow}>
                              {[
                                { id: 'white' as const, label: 'Blanca', color: '#ffffff', pos: whiteImagePos },
                                { id: 'yellow' as const, label: 'Amarilla', color: '#fbbf24', pos: yellowImagePos },
                                { id: 'red' as const, label: 'Roja', color: '#ef4444', pos: redImagePos },
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
                              <Text style={s.recalibrateCardText}>Re-detectar</Text>
                            </TouchableOpacity>
                            <Text style={s.dpadHelperText}>
                              {selectedTargetType === 'corner'
                                ? `Mueve C${activeCornerIdx + 1}`
                                : `Mueve bola ${selectedTargetType === 'white' ? 'blanca' : selectedTargetType === 'yellow' ? 'amarilla' : 'roja'}`}
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
                          Control de esquinas y D-Pad
                        </Text>
                      </View>
                      <IconChevronDown size={15} color={C.accentCyan} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Right/Bottom: 2D Rectified Table Preview */}
                <View style={[s.tablePanel, isWide && s.tablePanelWide]}>
                  <View style={s.panelHeader}>
                    <Text style={s.panelTitle}>Mesa Rectificada Canónica 2:1</Text>
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
                      <Text style={s.settingsGearBtnText}>Personalizar Mesa</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Interactive Table with 8x4 Grid & Diamond Numbers */}
                  <View style={s.tableContainer}>
                    <TrainingPlayTable
                      whiteBall={whiteBall}
                      yellowBall={yellowBall}
                      redBall={redBall}
                      preferences={tablePrefs}
                    />
                  </View>

                  {/* Tactical Transform Toolbar */}
                  <View style={s.toolsRow}>
                    <TouchableOpacity style={s.toolBtn} onPress={handleRotate90}>
                      <IconRotateClockwise size={16} color={C.text} strokeWidth={2} />
                      <Text style={s.toolBtnText}>Rotar 90°</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.toolBtn} onPress={handleMirror}>
                      <IconArrowsExchange size={16} color={C.text} strokeWidth={2} />
                      <Text style={s.toolBtnText}>Invertir Lados</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.toolBtn} onPress={handleSwapCue}>
                      <View
                        style={[
                          s.cueDot,
                          { backgroundColor: swapCue ? C.accentYellow : '#ffffff' },
                        ]}
                      />
                      <Text style={s.toolBtnText}>Cambiar Tacador</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Position Coordinates Summary */}
                  <View style={s.coordsSummary}>
                    <Text style={s.coordsItem}>
                      ⚪ Blanca: <Text style={s.coordVal}>{whiteBall.x}cm, {whiteBall.y}cm</Text>
                    </Text>
                    <Text style={s.coordsItem}>
                      🟡 Amarilla: <Text style={s.coordVal}>{yellowBall.x}cm, {yellowBall.y}cm</Text>
                    </Text>
                    <Text style={s.coordsItem}>
                      🔴 Roja: <Text style={s.coordVal}>{redBall.x}cm, {redBall.y}cm</Text>
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
                  <Text style={s.cancelBtnText}>Elegir Otra Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.secondaryActionBtn}
                  onPress={handleOpenSimulator}
                  activeOpacity={0.7}
                >
                  <IconDeviceGamepad2 size={16} color={C.text} strokeWidth={2} />
                  <Text style={s.secondaryActionText}>Simulador</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.primaryActionBtn}
                  onPress={handleConfirmTraining}
                  activeOpacity={0.8}
                >
                  <IconCheck size={18} color="#0a100d" strokeWidth={2.5} />
                  <Text style={s.primaryActionText}>Cargar en Mesa de Entrenamiento</Text>
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

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 8, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
    shadowOpacity: 0.6,
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
    backgroundColor: C.surfaceHigh,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#fca5a5',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    color: '#0a100d',
    fontWeight: '700',
  },
  zoneSwitcherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
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
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
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
    color: '#0a100d',
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
  loupeFloatCard: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'center',
    pointerEvents: 'none',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99,
  },
  loupeFloatCardLeft: {
    right: undefined,
    left: 10,
  },
  loupeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: C.accentCyan,
    overflow: 'hidden',
    backgroundColor: '#050a08',
    position: 'relative',
  },
  loupeCrosshairH: {
    position: 'absolute',
    top: 49.5,
    left: 0,
    width: 100,
    height: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  loupeCrosshairV: {
    position: 'absolute',
    top: 0,
    left: 49.5,
    width: 1,
    height: 100,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  loupeCenterRing: {
    position: 'absolute',
    top: 46,
    left: 46,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  loupeTag: {
    marginTop: 4,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0a100d',
    backgroundColor: C.accentCyan,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dpadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    gap: 8,
  },
  fineControlsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
  fineStepBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    flexShrink: 0,
  },
  fineStepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accentCyan,
  },
  fineControlsCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  },
  selectorSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorActiveTag: {
    fontSize: 10,
    fontWeight: '600',
    color: C.accentCyan,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  cornerGridPillText: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    gap: 5,
  },
  ballGridPillText: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '600',
  },
  selectorPillActiveCorner: {
    backgroundColor: C.accentCyan,
    borderColor: C.accentCyan,
  },
  selectorPillActiveBall: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    borderColor: C.accentCyan,
  },
  selectorPillTextActive: {
    color: '#0a100d',
    fontWeight: '700',
  },
  selectorPillTextActiveBall: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dpadAndActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
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
    backgroundColor: C.surface,
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
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
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
    color: '#a5f3fc',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    color: '#0a100d',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  ballTabActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
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
    color: '#ffffff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  clothBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
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
    backgroundColor: C.surfaceBorder,
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
    borderColor: '#0a100d',
  },
  coordsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: C.surfaceHigh,
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
    color: '#0a100d',
    fontWeight: '700',
    textAlign: 'center',
  },
});
