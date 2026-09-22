import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import {
  IconAlertTriangle,
  IconArrowsExchange,
  IconCamera,
  IconCheck,
  IconClipboard,
  IconDeviceGamepad2,
  IconFolder,
  IconPlayerPlay,
  IconRefresh,
  IconRotateClockwise,
  IconSparkles,
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
};

export interface TableVisionStudioModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPosition?: (pos: {
    white: TablePoint;
    yellow: TablePoint;
    red: TablePoint;
    name?: string;
  }) => void;
}

const DEFAULT_CORNERS = [
  { x: 0.1, y: 0.15 },
  { x: 0.9, y: 0.15 },
  { x: 0.95, y: 0.85 },
  { x: 0.05, y: 0.85 },
];

function TableVisionStudioModalBase({
  visible,
  onClose,
  onSelectPosition,
}: TableVisionStudioModalProps) {
  const router = useRouter();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isWide = winWidth >= 800;

  // Flow step: 'select' | 'processing' | 'calibrate'
  const [step, setStep] = useState<'select' | 'processing' | 'calibrate'>('select');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected image info
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 1200, height: 675 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Vision response
  const [visionData, setVisionData] = useState<VisionDetailedResponse | null>(null);
  const [corners, setCorners] = useState<Array<{ x: number; y: number }>>(DEFAULT_CORNERS);
  const [activeCornerIdx, setActiveCornerIdx] = useState<number | null>(null);
  const [isLoupeVisible, setIsLoupeVisible] = useState(false);
  const [loupePoint, setLoupePoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ball positions in cm (0..284, 0..142)
  const [whiteBall, setWhiteBall] = useState<TablePoint>({ x: 71, y: 105 });
  const [yellowBall, setYellowBall] = useState<TablePoint>({ x: 213, y: 35 });
  const [redBall, setRedBall] = useState<TablePoint>({ x: 248, y: 105 });

  // Tactical toggles
  const [swapCue, setSwapCue] = useState(false);
  const [clothColor, setClothColor] = useState<'tournament_blue' | 'simonis_green'>('tournament_blue');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('select');
      setErrorMessage(null);
      setImageUri(null);
      setVisionData(null);
      setCorners(DEFAULT_CORNERS);
    }
  }, [visible]);

  // Run backend vision processor
  const processImage = useCallback(
    async (uri: string, customCorners?: Array<{ x: number; y: number }>) => {
      setStep('processing');
      setErrorMessage(null);
      setImageUri(uri);

      // Measure original image aspect ratio
      Image.getSize(
        uri,
        (w, h) => {
          setImageSize({ width: w, height: h });
        },
        () => {
          setImageSize({ width: 1200, height: 675 });
        }
      );

      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
        );

        const repo = new ApiSnapshotRepository();
        const res = await repo.submitWithDetails(manipulated.uri, customCorners);
        setVisionData(res);

        // Normalize detected corners
        if (res.detectedCorners && res.detectedCorners.length === 4) {
          const norm = res.detectedCorners.map((c) => ({
            x: c.x / 1200,
            y: c.y / (1200 * (imageSize.height / imageSize.width || 0.5625)),
          }));
          setCorners(norm);
        }

        // Map balls to 284 x 142 carom table coordinates
        if (res.balls && res.balls.length >= 3) {
          const wB = res.balls.find((b) => b.label === 'white') ?? res.balls[0];
          const yB = res.balls.find((b) => b.label === 'yellow') ?? res.balls[1];
          const rB = res.balls.find((b) => b.label === 'red') ?? res.balls[2];

          setWhiteBall({
            x: Math.round(wB.x * 284 * 10) / 10,
            y: Math.round(wB.y * 142 * 10) / 10,
          });
          setYellowBall({
            x: Math.round(yB.x * 284 * 10) / 10,
            y: Math.round(yB.y * 142 * 10) / 10,
          });
          setRedBall({
            x: Math.round(rB.x * 284 * 10) / 10,
            y: Math.round(rB.y * 142 * 10) / 10,
          });
        }

        setStep('calibrate');
      } catch (err) {
        console.error('[VisionStudio] error:', err);
        setStep('select');
        setErrorMessage(err instanceof Error ? err.message : 'Error al procesar la imagen.');
      }
    },
    [imageSize]
  );

  // Support Web Clipboard Paste (Ctrl + V)
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

  // Rotate table 90 degrees
  const handleRotate90 = useCallback(() => {
    setWhiteBall((p) => ({
      x: Math.round(((142 - p.y) / 142) * 284 * 10) / 10,
      y: Math.round((p.x / 284) * 142 * 10) / 10,
    }));
    setYellowBall((p) => ({
      x: Math.round(((142 - p.y) / 142) * 284 * 10) / 10,
      y: Math.round((p.x / 284) * 142 * 10) / 10,
    }));
    setRedBall((p) => ({
      x: Math.round(((142 - p.y) / 142) * 284 * 10) / 10,
      y: Math.round((p.x / 284) * 142 * 10) / 10,
    }));
  }, []);

  // Mirror horizontal
  const handleMirror = useCallback(() => {
    setWhiteBall((p) => ({ x: Math.round((284 - p.x) * 10) / 10, y: p.y }));
    setYellowBall((p) => ({ x: Math.round((284 - p.x) * 10) / 10, y: p.y }));
    setRedBall((p) => ({ x: Math.round((284 - p.x) * 10) / 10, y: p.y }));
  }, []);

  // Swap cue ball (White <-> Yellow)
  const handleSwapCue = useCallback(() => {
    setSwapCue((v) => !v);
    setWhiteBall((w) => {
      const temp = { ...w };
      setYellowBall(temp);
      return yellowBall;
    });
  }, [yellowBall]);

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

  // Calculated displayed corner pixel coordinates
  const pixelCorners = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return [];
    return corners.map((c) => ({
      x: c.x * containerSize.width,
      y: c.y * containerSize.height,
    }));
  }, [corners, containerSize]);

  // Polygon points string for SVG
  const polygonPointsStr = useMemo(() => {
    if (pixelCorners.length < 4) return '';
    return pixelCorners.map((p) => `${p.x},${p.y}`).join(' ');
  }, [pixelCorners]);

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
                Calculando homografía proyectiva 2:1 y puntos de contacto
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
            <ScrollView contentContainerStyle={s.studioBody}>
              <View style={[s.studioRow, isWide && s.studioRowWide]}>
                {/* Left/Top: Original Image with Perspective Overlay & Handles */}
                <View style={[s.imagePanel, isWide && s.imagePanelWide]}>
                  <View style={s.panelHeader}>
                    <Text style={s.panelTitle}>Foto Original con Esquinas de Banda</Text>
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

                  <View
                    style={s.imageCanvasWrap}
                    onLayout={(e) => {
                      const { width, height } = e.nativeEvent.layout;
                      setContainerSize({ width, height });
                    }}>
                    {imageUri && (
                      <Image
                        source={{ uri: imageUri }}
                        style={s.previewImage}
                        resizeMode="contain"
                      />
                    )}

                    {/* SVG Perspective Quad Overlay */}
                    {containerSize.width > 0 && containerSize.height > 0 && (
                      <Svg style={StyleSheet.absoluteFill}>
                        {polygonPointsStr ? (
                          <Polygon
                            points={polygonPointsStr}
                            fill="rgba(16, 185, 129, 0.12)"
                            stroke={C.primary}
                            strokeWidth={2.5}
                            strokeDasharray="4, 4"
                          />
                        ) : null}

                        {/* Corner Points */}
                        {pixelCorners.map((p, idx) => (
                          <Circle
                            key={`corner-${idx}`}
                            cx={p.x}
                            cy={p.y}
                            r={8}
                            fill={C.accentCyan}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Svg>
                    )}
                  </View>

                  {/* Corner Adjust Instructions */}
                  <View style={s.hintBar}>
                    <Text style={s.hintText}>
                      ✓ 4 esquinas de cojín detectadas. Si algún jugador o árbitro oculta una esquina,
                      puedes volver a procesar con calibración fina.
                    </Text>
                    <TouchableOpacity style={s.recalibrateBtn} onPress={handleRecalibrate}>
                      <IconRefresh size={14} color={C.primary} strokeWidth={2} />
                      <Text style={s.recalibrateText}>Re-detectar</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Right/Bottom: 2D Rectified Table Preview */}
                <View style={[s.tablePanel, isWide && s.tablePanelWide]}>
                  <View style={s.panelHeader}>
                    <Text style={s.panelTitle}>Mesa Rectificada Canónica 2:1</Text>
                    <View style={s.clothToggle}>
                      <Pressable
                        style={[s.clothBtn, clothColor === 'tournament_blue' && s.clothBtnActive]}
                        onPress={() => setClothColor('tournament_blue')}>
                        <View style={[s.clothDot, { backgroundColor: '#10638c' }]} />
                        <Text style={s.clothBtnText}>Azul</Text>
                      </Pressable>
                      <Pressable
                        style={[s.clothBtn, clothColor === 'simonis_green' && s.clothBtnActive]}
                        onPress={() => setClothColor('simonis_green')}>
                        <View style={[s.clothDot, { backgroundColor: '#16654e' }]} />
                        <Text style={s.clothBtnText}>Verde</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Interactive Table with 8x4 Grid & Diamond Numbers */}
                  <View style={s.tableContainer}>
                    <TrainingPlayTable
                      whiteBall={whiteBall}
                      yellowBall={yellowBall}
                      redBall={redBall}
                      showGrid={true}
                      showDiamondNumbers={true}
                      clothColor={clothColor}
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

              {/* Bottom Action Footer */}
              <View style={s.footerActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setStep('select')}>
                  <Text style={s.cancelBtnText}>Elegir Otra Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.secondaryActionBtn} onPress={handleOpenSimulator}>
                  <IconDeviceGamepad2 size={18} color={C.text} strokeWidth={2} />
                  <Text style={s.secondaryActionText}>Simulador</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.primaryActionBtn} onPress={handleConfirmTraining}>
                  <IconCheck size={18} color="#0a100d" strokeWidth={2.5} />
                  <Text style={s.primaryActionText}>Cargar en Mesa de Entrenamiento</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
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
    maxHeight: '92%',
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
    maxWidth: 960,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  },
  studioRow: {
    flexDirection: 'column',
    gap: 16,
  },
  studioRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imagePanel: {
    flex: 1,
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    padding: 12,
  },
  imagePanelWide: {
    flex: 1.1,
  },
  tablePanel: {
    flex: 1,
    backgroundColor: C.surfaceHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    padding: 12,
  },
  tablePanelWide: {
    flex: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeAngle: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  badgeAngleText: {
    fontSize: 11,
    color: C.accentCyan,
    fontWeight: '600',
  },
  imageCanvasWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#050a07',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  hintText: {
    fontSize: 11,
    color: C.textMuted,
    flex: 1,
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: C.primaryDim,
  },
  recalibrateText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  clothToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  clothBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  clothBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  clothDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clothBtnText: {
    fontSize: 11,
    color: C.text,
  },
  tableContainer: {
    width: '100%',
    marginVertical: 4,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolBtnText: {
    fontSize: 12,
    color: C.text,
    fontWeight: '600',
  },
  cueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  coordsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  coordsItem: {
    fontSize: 11,
    color: C.textMuted,
  },
  coordVal: {
    color: C.text,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.surfaceBorder,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '600',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surfaceHigh,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  secondaryActionText: {
    fontSize: 13,
    color: C.text,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryActionText: {
    fontSize: 13,
    color: '#0a100d',
    fontWeight: '700',
  },
});
