import { memo, useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { IconX, IconAlertTriangle, IconPhoto, IconCamera, IconFolder, IconUpload } from '@tabler/icons-react-native';

import { container } from '@/src/presentation/container';

const { height: SCREEN_H } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const C = {
    bg: '#0a0f0d',
    surface: '#162521',
    surfaceHigh: '#1c2e29',
    surfaceHighest: '#243a34',
    primary: '#10b981',
    primaryDim: 'rgba(16,185,129,0.12)',
    primaryBorder: 'rgba(16,185,129,0.25)',
    primaryFaint: 'rgba(16,185,129,0.06)',
    text: '#f1f3f1',
    textMuted: '#bfc9c3',
    outline: '#384e44',
    overlay: 'rgba(10,15,13,0.82)',
};

interface CameraCaptureModalProps {
    visible: boolean;
    onClose: () => void;
}

function CameraCaptureModalBase({ visible, onClose }: Readonly<CameraCaptureModalProps>) {
    const router = useRouter();
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);

    const processImage = useCallback(async (uri: string) => {
        setProcessing(true);
        setErrorMessage(null);
        try {
            const manipulated = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
            );

            const snapshot = await container.submitTableSnapshot.execute({
                imageUri: manipulated.uri,
            });

            if (snapshot.balls.length === 0) {
                setProcessing(false);
                setErrorMessage('No se detectaron bolas en la imagen. Intenta con otra foto con mejor iluminación.');
                return;
            }

            onClose();
            setProcessing(false);
            router.push(`/training/simulate?snapshotId=${snapshot.id}`);
        } catch (err) {
            console.error('[CameraCapture] Error:', err);
            setProcessing(false);
            const message = err instanceof Error ? err.message : 'Error al procesar la imagen';
            setErrorMessage(message);
        }
    }, [onClose, router]);

    const takePhoto = useCallback(async () => {
        if (isWeb) {
            // On web, use <input capture> to open the device camera
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
                Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
            if (!result.canceled && result.assets[0]) {
                processImage(result.assets[0].uri);
            }
        }
    }, [processImage]);

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
                Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
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

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[s.overlay, isWeb && s.overlayWeb]}>
                <Pressable style={s.overlayBackdrop} onPress={onClose} />

                <View style={[s.sheet, isWeb && s.sheetWeb]}>
                    {!isWeb && (
                        <View style={s.pullHandle}>
                            <View style={s.pullBar} />
                        </View>
                    )}

                    <View style={s.header}>
                        <Text style={s.headerTitle}>Cargar Posición</Text>
                        <Pressable style={s.closeBtn} onPress={onClose}>
                            <IconX size={16} color={C.textMuted} strokeWidth={2.5} />
                        </Pressable>
                    </View>

                    {processing ? (
                        <View style={s.processingWrap}>
                            <ActivityIndicator size="large" color={C.primary} />
                            <Text style={s.processingTitle}>Detectando mesa y bolas...</Text>
                            <Text style={s.processingSub}>Esto puede tomar unos segundos</Text>
                        </View>
                    ) : errorMessage ? (
                        <View style={s.body}>
                            <View style={s.errorBanner}>
                                <IconAlertTriangle size={18} color="#ffb4ab" strokeWidth={2} />
                                <Text style={s.errorText}>{errorMessage}</Text>
                            </View>

                            <Pressable
                                style={({ pressed }) => [
                                    s.actionBtn,
                                    (pressed || hoveredBtn === 'retry-gallery') && s.actionBtnActive,
                                ]}
                                onPress={() => { setErrorMessage(null); pickFromGallery(); }}
                                onHoverIn={() => setHoveredBtn('retry-gallery')}
                                onHoverOut={() => setHoveredBtn(null)}>
                                <View style={[s.actionIconCircle, s.actionIconCirclePrimary]}>
                                    <IconPhoto size={18} color={C.primary} strokeWidth={2} />
                                </View>
                                <View style={s.actionLabelWrap}>
                                    <Text style={s.actionTitle}>Elegir otra imagen</Text>
                                    <Text style={s.actionSub}>Desde galería o archivos</Text>
                                </View>
                                <Text style={s.actionChevron}>›</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    s.actionBtn,
                                    (pressed || hoveredBtn === 'retry-camera') && s.actionBtnActive,
                                ]}
                                onPress={() => { setErrorMessage(null); takePhoto(); }}
                                onHoverIn={() => setHoveredBtn('retry-camera')}
                                onHoverOut={() => setHoveredBtn(null)}>
                                <View style={s.actionIconCircle}>
                                    <IconCamera size={18} color={C.textMuted} strokeWidth={2} />
                                </View>
                                <View style={s.actionLabelWrap}>
                                    <Text style={s.actionTitle}>Tomar nueva foto</Text>
                                    <Text style={s.actionSub}>Usar la cámara ahora</Text>
                                </View>
                                <Text style={s.actionChevron}>›</Text>
                            </Pressable>

                            <View style={s.dividerRow}>
                                <View style={s.dividerLine} />
                                <Text style={s.dividerText}>O intenta de nuevo</Text>
                                <View style={s.dividerLine} />
                            </View>

                            <Pressable style={s.cancelBtn} onPress={onClose}>
                                <Text style={s.cancelBtnText}>Cancelar</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={s.body}>
                            {/* Upload image */}
                            <Pressable
                                style={({ pressed }) => [
                                    s.actionBtn,
                                    (pressed || hoveredBtn === 'gallery') && s.actionBtnActive,
                                ]}
                                onPress={pickFromGallery}
                                onHoverIn={() => setHoveredBtn('gallery')}
                                onHoverOut={() => setHoveredBtn(null)}>
                                <View style={[s.actionIconCircle, s.actionIconCirclePrimary]}>
                                    <IconFolder size={18} color={C.primary} strokeWidth={2} />
                                </View>
                                <View style={s.actionLabelWrap}>
                                    <Text style={s.actionTitle}>Subir Imagen</Text>
                                    <Text style={s.actionSub}>Desde galería o archivos</Text>
                                </View>
                                <Text style={s.actionChevron}>›</Text>
                            </Pressable>

                            {/* Take photo */}
                            <Pressable
                                style={({ pressed }) => [
                                    s.actionBtn,
                                    (pressed || hoveredBtn === 'camera') && s.actionBtnActive,
                                ]}
                                onPress={takePhoto}
                                onHoverIn={() => setHoveredBtn('camera')}
                                onHoverOut={() => setHoveredBtn(null)}>
                                <View style={s.actionIconCircle}>
                                    <IconCamera size={18} color={C.textMuted} strokeWidth={2} />
                                </View>
                                <View style={s.actionLabelWrap}>
                                    <Text style={s.actionTitle}>Tomar Fotografía</Text>
                                    <Text style={s.actionSub}>Usar la cámara ahora</Text>
                                </View>
                                <Text style={s.actionChevron}>›</Text>
                            </Pressable>

                            <View style={s.dividerRow}>
                                <View style={s.dividerLine} />
                                <Text style={s.dividerText}>O arrastra aquí</Text>
                                <View style={s.dividerLine} />
                            </View>

                            {/* Drop zone */}
                            <Pressable
                                style={({ pressed }) => [s.dropZone, pressed && s.dropZonePressed]}
                                onPress={pickFromGallery}>
                                <IconUpload size={28} color={C.primary} strokeWidth={1.5} />
                                <Text style={s.dropZoneText}>Soltar imagen de la mesa</Text>
                                <Text style={s.dropZoneSub}>Toca para seleccionar un archivo</Text>
                            </Pressable>

                            <Pressable style={s.cancelBtn} onPress={onClose}>
                                <Text style={s.cancelBtnText}>Cancelar</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

export const CameraCaptureModal = memo(CameraCaptureModalBase);

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: C.overlay,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    overlayWeb: {
        justifyContent: 'center',
    },
    overlayBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        width: '100%',
        maxWidth: 420,
        maxHeight: SCREEN_H * 0.85,
        backgroundColor: C.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.primaryBorder,
        ...(isWeb
            ? {
                  boxShadow: '0px 0px 20px rgba(16, 185, 129, 0.15)',
                  elevation: 20,
              }
            : {}),
    },
    sheetWeb: {
        borderRadius: 24,
    },

    pullHandle: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    pullBar: {
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: C.outline,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: isWeb ? 24 : 12,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: C.text,
        letterSpacing: -0.3,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.surfaceHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 14,
        color: C.textMuted,
        fontWeight: '600',
    },

    body: {
        paddingHorizontal: 24,
        paddingBottom: isWeb ? 24 : 32,
        gap: 12,
    },

    /* Action buttons — green left border appears only on hover/press */
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        height: 64,
        borderRadius: 14,
        backgroundColor: C.surfaceHigh,
        borderWidth: 1,
        borderColor: 'transparent',
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
    },
    actionBtnActive: {
        backgroundColor: C.surfaceHighest,
        borderLeftColor: C.primary,
        borderColor: C.primaryBorder,
    },
    actionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: C.surfaceHighest,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIconCirclePrimary: {
        backgroundColor: C.primaryDim,
    },
    actionIconEmoji: {
        // deprecated — replaced by @tabler/icons-react-native components
    },
    actionLabelWrap: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: C.text,
    },
    actionSub: {
        fontSize: 13,
        color: C.textMuted,
        marginTop: 1,
    },
    actionChevron: {
        fontSize: 22,
        color: C.textMuted,
        fontWeight: '300',
    },

    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.outline,
        opacity: 0.5,
    },
    dividerText: {
        fontSize: 10,
        fontWeight: '700',
        color: C.textMuted,
        opacity: 0.5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    dropZone: {
        height: 120,
        borderRadius: 12,
        backgroundColor: C.primaryFaint,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: C.primary,
        opacity: 0.6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    dropZonePressed: {
        opacity: 1,
        backgroundColor: C.primaryDim,
    },
    dropZoneIcon: {
        // deprecated — replaced by IconUpload
    },
    dropZoneText: {
        fontSize: 14,
        fontWeight: '500',
        color: C.primary,
        opacity: 0.8,
    },
    dropZoneSub: {
        fontSize: 12,
        color: C.textMuted,
        opacity: 0.5,
    },

    cancelBtn: {
        height: 48,
        borderRadius: 24,
        backgroundColor: C.surfaceHighest,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: C.textMuted,
    },

    processingWrap: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
        gap: 14,
    },
    processingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: C.text,
    },
    processingSub: {
        fontSize: 13,
        color: C.textMuted,
    },

    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(147,0,10,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,180,171,0.2)',
        marginBottom: 4,
    },
    errorIcon: {
        // deprecated — replaced by IconAlertTriangle
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: '#ffb4ab',
        lineHeight: 18,
    },
});
