import React, { memo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import {
    IconX,
    IconPalette,
    IconSettings,
    IconRuler2,
    IconNumbers,
    IconEye,
    IconTrash,
    IconRefresh,
    IconPencil,
    IconTarget,
    IconSparkles,
} from '@/src/presentation/components/icons';
import { useI18n } from '@/components/useLanguage';
import { useColorScheme } from '@/components/useColorScheme';
import { getPalette } from '@/constants/theme';
import { CaromAimFineTuner } from './CaromAimFineTuner';
import { Vec2, TrajectoryGuideConfig } from '@bandaro/core';

interface SimulatorSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    categoryName?: string | null;
    activeCategoryColor?: string | null;
    isEditMode: boolean;
    onToggleEditMode: () => void;
    showGuides: boolean;
    onToggleGuides: () => void;
    showRuler: boolean;
    onToggleRuler: () => void;
    showNumbering: boolean;
    onOpenNumbering: () => void;
    onOpenCustomizer: () => void;
    onOpenBallStudio: () => void;
    onOpenGuideCustomizer?: () => void;
    guideConfig?: TrajectoryGuideConfig;
    onResetTable: () => void;
    onStartPractice: () => void;
    aimDirection: Vec2;
    onAimChange: (dir: Vec2) => void;
    hasDynamicTrails?: boolean;
    onClearTrails: () => void;
    isSimulating: boolean;
}

export const SimulatorSettingsModal = memo(function SimulatorSettingsModal({
    visible,
    onClose,
    title,
    categoryName,
    activeCategoryColor,
    isEditMode,
    onToggleEditMode,
    showGuides,
    onToggleGuides,
    showRuler,
    onToggleRuler,
    showNumbering,
    onOpenNumbering,
    onOpenCustomizer,
    onOpenBallStudio,
    onOpenGuideCustomizer,
    guideConfig,
    onResetTable,
    onStartPractice,
    aimDirection,
    onAimChange,
    hasDynamicTrails = false,
    onClearTrails,
    isSimulating = false,
}: SimulatorSettingsModalProps) {
    const { t, language } = useI18n();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const palette = getPalette(colorScheme);

    const isEn = language === 'en';

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, isDark ? styles.modalCardDark : styles.modalCardLight]}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerTitles}>
                            {categoryName && (
                                <View style={[styles.categoryBadge, { borderColor: activeCategoryColor ? `${activeCategoryColor}66` : '#38bdf8' }]}>
                                    <View style={[styles.categoryDot, { backgroundColor: activeCategoryColor || '#38bdf8' }]} />
                                    <Text style={[styles.categoryText, { color: activeCategoryColor || '#38bdf8' }]}>
                                        {categoryName}
                                    </Text>
                                </View>
                            )}
                            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : palette.text }]} numberOfLines={1}>
                                {isEn ? 'Simulator Settings' : 'Configuraciones del Simulador'}
                            </Text>
                            <Text style={styles.modalSubtitle} numberOfLines={1}>
                                {title}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            accessibilityLabel={t('common.close')}>
                            <IconX size={18} color={isDark ? '#94a3b8' : '#64748b'} strokeWidth={2.2} />
                        </TouchableOpacity>
                    </View>

                    {/* Contenido en Scroll */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}>

                        {/* SECCIÓN 1: ACCIONES PRINCIPALES */}
                        <Text style={styles.sectionHeader}>
                            {isEn ? 'GAMEPLAY & PRACTICE' : 'JUEGO Y ENTRENAMIENTO'}
                        </Text>

                        {/* Entrenar Jugada */}
                        <TouchableOpacity
                            style={styles.actionRowHighlight}
                            onPress={() => {
                                onClose();
                                onStartPractice();
                            }}
                            disabled={isSimulating}>
                            <View style={styles.actionLeft}>
                                <View style={styles.iconCircleGreen}>
                                    <IconTarget size={18} color="#ffffff" strokeWidth={2.5} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={styles.actionTitleHighlight}>
                                        {t('common.practice')}
                                    </Text>
                                    <Text style={styles.actionSubtextHighlight}>
                                        {isEn ? 'Start practice drills with this layout' : 'Comenzar sesión de entrenamiento'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Modo Edición / Puntería */}
                        <TouchableOpacity
                            style={[styles.settingRow, isEditMode && styles.settingRowActiveAmber]}
                            onPress={onToggleEditMode}
                            disabled={isSimulating}>
                            <View style={styles.actionLeft}>
                                <View style={[styles.iconCircle, isEditMode && styles.iconCircleAmber]}>
                                    <IconPencil size={16} color={isEditMode ? '#fbbf24' : '#94a3b8'} strokeWidth={2} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEditMode ? (isEn ? 'Edit Mode (Active)' : 'Modo Edición (Activo)') : (isEn ? 'Edit Mode' : 'Modo Edición')}
                                    </Text>
                                    <Text style={styles.actionSubtext}>
                                        {isEditMode
                                            ? (isEn ? 'Drag balls freely across table' : 'Arrastra bolas libremente por la mesa')
                                            : (isEn ? 'Aim and simulate caroms' : 'Apunta y simula la carambola')}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge, isEditMode && styles.statusBadgeAmber]}>
                                <Text style={[styles.statusBadgeText, isEditMode && styles.statusBadgeTextAmber]}>
                                    {isEditMode ? (isEn ? 'MOVING' : 'MOVIENDO') : (isEn ? 'AIMING' : 'APUNTANDO')}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* SECCIÓN 2: ESTUDIO Y PERSONALIZACIÓN */}
                        <Text style={styles.sectionHeader}>
                            {isEn ? 'TABLE & SYSTEM TOOLS' : 'HERRAMIENTAS DE MESA Y SISTEMAS'}
                        </Text>

                        {/* Personalizar Mesa */}
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => {
                                onClose();
                                onOpenCustomizer();
                            }}
                            disabled={isSimulating}>
                            <View style={styles.actionLeft}>
                                <View style={styles.iconCircle}>
                                    <IconPalette size={16} color="#38bdf8" strokeWidth={2} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Customize Table' : 'Personalizar Mesa'}
                                    </Text>
                                    <Text style={styles.actionSubtext}>
                                        {isEn ? 'Cloth color, wood rail finish & metal corners' : 'Color de paño, madera de bandas y esquinas'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Estudio de Bolas & Salida */}
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => {
                                onClose();
                                onOpenBallStudio();
                            }}
                            disabled={isSimulating}>
                            <View style={styles.actionLeft}>
                                <View style={styles.iconCircle}>
                                    <IconSettings size={16} color="#00d2ff" strokeWidth={2} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Ball Studio & Break Setup' : 'Estudio de Bolas y Salida Oficial'}
                                    </Text>
                                    <Text style={styles.actionSubtext}>
                                        {isEn ? 'Aramith, PBA Helix, Dynaspheres & UMB/PBA break' : 'Skins de bolas y posiciones de salida UMB / PBA'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Sistemas y Numeración de Diamantes */}
                        <TouchableOpacity
                            style={[styles.settingRow, showNumbering && styles.settingRowActiveCyan]}
                            onPress={() => {
                                onClose();
                                onOpenNumbering();
                            }}
                            disabled={isSimulating}>
                            <View style={styles.actionLeft}>
                                <View style={[styles.iconCircle, showNumbering && styles.iconCircleCyan]}>
                                    <IconNumbers size={16} color={showNumbering ? '#00d2ff' : '#94a3b8'} strokeWidth={2} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Diamond Systems & Numbers' : 'Sistemas de Diamantes y Números'}
                                    </Text>
                                    <Text style={styles.actionSubtext}>
                                        {isEn ? 'Conti, Tudela, formulas and cushions' : 'Conti, Tudela, fórmulas de llegada y bandas'}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge, showNumbering && styles.statusBadgeCyan]}>
                                <Text style={[styles.statusBadgeText, showNumbering && styles.statusBadgeTextCyan]}>
                                    {showNumbering ? (isEn ? 'VISIBLE' : 'ACTIVO') : (isEn ? 'OFF' : 'INACTIVO')}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Regla Milimétrica de Bandas */}
                        <TouchableOpacity
                            style={[styles.settingRow, showRuler && styles.settingRowActiveCyan]}
                            onPress={onToggleRuler}
                            disabled={isSimulating}>
                            <View style={styles.actionLeft}>
                                <View style={[styles.iconCircle, showRuler && styles.iconCircleCyan]}>
                                    <IconRuler2 size={16} color={showRuler ? '#00d2ff' : '#94a3b8'} strokeWidth={2} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Cushion Ruler' : 'Regla de Bandas'}
                                    </Text>
                                    <Text style={styles.actionSubtext}>
                                        {isEn ? 'Millimetric cushion grid & markers' : 'Rejilla y marcadores milimétricos'}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge, showRuler && styles.statusBadgeCyan]}>
                                <Text style={[styles.statusBadgeText, showRuler && styles.statusBadgeTextCyan]}>
                                    {showRuler ? (isEn ? 'ON' : 'ACTIVADA') : (isEn ? 'OFF' : 'DESACTIVADA')}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* SECCIÓN 3: PUNTERÍA Y GUÍAS */}
                        <Text style={styles.sectionHeader}>
                            {isEn ? 'AIM & DISPLAY' : 'PUNTERÍA Y VISUALIZACIÓN'}
                        </Text>

                        {/* Micro-ajuste de puntería */}
                        <View style={styles.aimFineTunerWrap}>
                            <Text style={styles.aimLabel}>
                                {isEn ? 'Micro-Aim Angle Tuning' : 'Ajuste Fino de Puntería'}
                            </Text>
                            <CaromAimFineTuner
                                aimDirection={aimDirection}
                                onAimChange={onAimChange}
                                disabled={isSimulating}
                                compact={false}
                            />
                        </View>

                        {/* Alternar Guías Visuales */}
                        <TouchableOpacity
                            style={[styles.settingRow, showGuides && styles.settingRowActiveCyan]}
                            onPress={onToggleGuides}>
                            <View style={styles.actionLeft}>
                                <View style={[styles.iconCircle, showGuides && styles.iconCircleCyan]}>
                                    <IconEye size={16} color={showGuides ? '#00d2ff' : '#94a3b8'} strokeWidth={2} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Trajectory & Ghost Ball Guides' : 'Rayos Guía y Bola Fantasma'}
                                    </Text>
                                    <Text style={styles.actionSubtext}>
                                        {isEn ? 'Show aim line and deflection vectors' : 'Muestra líneas y vectores de deflexión'}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge, showGuides && styles.statusBadgeCyan]}>
                                <Text style={[styles.statusBadgeText, showGuides && styles.statusBadgeTextCyan]}>
                                    {showGuides ? (isEn ? 'ON' : 'VISIBLES') : (isEn ? 'OFF' : 'OCULTAS')}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Personalizador de Guías de Trayectoria (Photoshop Style) */}
                        {onOpenGuideCustomizer && (
                            <TouchableOpacity
                                style={[styles.settingRow, styles.settingRowActiveCyan]}
                                onPress={() => {
                                    onOpenGuideCustomizer();
                                    onClose();
                                }}>
                                <View style={styles.actionLeft}>
                                    <View style={[styles.iconCircle, styles.iconCircleCyan]}>
                                        <IconSparkles size={16} color="#00d2ff" strokeWidth={2.2} />
                                    </View>
                                    <View style={styles.actionTexts}>
                                        <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                            {isEn ? 'Dual Trajectory Guide System' : 'Personalizador de Guías y Trazos'}
                                        </Text>
                                        <Text style={styles.actionSubtext}>
                                            {guideConfig
                                                ? `${guideConfig.strokeStyle.toUpperCase()} • ${guideConfig.strokeWeight}px • ${guideConfig.aimMode === 'straight' ? (isEn ? 'Straight' : 'Recta') : guideConfig.aimMode === 'full' ? (isEn ? 'Full' : 'Completa') : (isEn ? 'Exit' : 'Salida')}`
                                                : (isEn ? 'Photoshop stroke style, thickness & mode' : 'Grosor, trazo punteado/sólido y modo salida')}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, styles.statusBadgeCyan]}>
                                    <Text style={[styles.statusBadgeText, styles.statusBadgeTextCyan]}>
                                        {isEn ? 'CONFIG' : 'AJUSTAR'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Limpiar Trazas */}
                        {hasDynamicTrails && (
                            <TouchableOpacity
                                style={styles.settingRow}
                                onPress={() => {
                                    onClearTrails();
                                    onClose();
                                }}>
                                <View style={styles.actionLeft}>
                                    <View style={styles.iconCircleRed}>
                                        <IconTrash size={16} color="#ef4444" strokeWidth={2} />
                                    </View>
                                    <View style={styles.actionTexts}>
                                        <Text style={[styles.actionTitle, { color: '#ef4444' }]}>
                                            {isEn ? 'Clear Dynamic Trails' : 'Limpiar Trazas de Tiro'}
                                        </Text>
                                        <Text style={styles.actionSubtext}>
                                            {isEn ? 'Erase previous shot motion trails' : 'Borrar líneas dinámicas del disparo'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Reiniciar Posición */}
                        <TouchableOpacity
                            style={styles.settingRow}
                            onPress={() => {
                                onResetTable();
                                onClose();
                            }}
                            disabled={isSimulating}>
                            <View style={styles.actionLeft}>
                                <View style={styles.iconCircle}>
                                    <IconRefresh size={16} color="#94a3b8" strokeWidth={2} />
                                </View>
                                <View style={styles.actionTexts}>
                                    <Text style={[styles.actionTitle, { color: isDark ? '#f8fafc' : palette.text }]}>
                                        {isEn ? 'Reset Balls to Initial Positions' : 'Reiniciar Posición Inicial'}
                                    </Text>
                                    <Text style={styles.actionSubtext}>
                                        {isEn ? 'Restore original drill ball coordinates' : 'Restablece las bolas al punto de origen'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '92%',
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
    },
    modalCardDark: {
        backgroundColor: '#0b1320',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
    },
    modalCardLight: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        paddingBottom: 12,
        marginBottom: 8,
    },
    headerTitles: {
        flex: 1,
        gap: 3,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    categoryDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    categoryText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingVertical: 6,
        gap: 8,
    },
    sectionHeader: {
        fontSize: 9.5,
        fontWeight: '900',
        color: '#64748b',
        letterSpacing: 1,
        marginTop: 8,
        marginBottom: 2,
    },
    actionRowHighlight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(13, 94, 47, 0.35)',
        borderWidth: 1.5,
        borderColor: '#10b981',
        borderRadius: 14,
        padding: 10,
    },
    actionTitleHighlight: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
    },
    actionSubtextHighlight: {
        color: '#86efac',
        fontSize: 10,
        fontWeight: '600',
    },
    iconCircleGreen: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0d5e2f',
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 10,
    },
    settingRowActiveAmber: {
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
        borderColor: '#fbbf24',
    },
    settingRowActiveCyan: {
        backgroundColor: 'rgba(0, 210, 255, 0.12)',
        borderColor: '#00d2ff',
    },
    actionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    iconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleAmber: {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
    },
    iconCircleCyan: {
        backgroundColor: 'rgba(0, 210, 255, 0.2)',
    },
    iconCircleRed: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTexts: {
        flex: 1,
        gap: 1,
    },
    actionTitle: {
        fontSize: 12.5,
        fontWeight: '800',
    },
    actionSubtext: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '500',
    },
    statusBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    statusBadgeAmber: {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
    },
    statusBadgeCyan: {
        backgroundColor: 'rgba(0, 210, 255, 0.2)',
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94a3b8',
    },
    statusBadgeTextAmber: {
        color: '#fbbf24',
    },
    statusBadgeTextCyan: {
        color: '#00d2ff',
    },
    aimFineTunerWrap: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 10,
        gap: 6,
    },
    aimLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#38bdf8',
        letterSpacing: 0.3,
    },
});
