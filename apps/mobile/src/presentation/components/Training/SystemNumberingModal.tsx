import React, { memo } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { IconX, IconPlus, IconTrash, IconNumbers } from '@/src/presentation/components/icons';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
import {
    SystemNumberingControl,
    NumberAnchor,
    Formula,
} from './SystemNumberingControl';

interface SystemNumberingModalProps {
    visible: boolean;
    showNumbering: boolean;
    anchors: NumberAnchor[];
    formula: Formula | null;
    isEditMode: boolean;
    onToggleShowNumbering: () => void;
    onAnchorsChange: (anchors: NumberAnchor[]) => void;
    onFormulaChange: (formula: Formula | null) => void;
    onClose: () => void;
}

export const SystemNumberingModal = memo(function SystemNumberingModal({
    visible,
    showNumbering,
    anchors,
    formula,
    isEditMode,
    onToggleShowNumbering,
    onAnchorsChange,
    onFormulaChange,
    onClose,
}: SystemNumberingModalProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const { t, language } = useI18n();
    const colorScheme = useColorScheme();
    const palette = getPalette(colorScheme);
    const isDark = colorScheme === 'dark';
    const styles = getStyles(palette, isDark);

    const handleQuickAdd = () => {
        const newAnchor: NumberAnchor = {
            id: Date.now().toString(),
            x: 150,
            y: 80,
            value: String(anchors.length + 1),
            color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'][anchors.length % 4],
            variableType: (['arrival', 'attack', 'departure', 'custom'] as const)[anchors.length % 4],
        };
        onAnchorsChange([...anchors, newAnchor]);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.iconTag}>
                                <IconNumbers size={18} color="#38bdf8" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.headerSubtitle}>{language === 'en' ? 'SYSTEMS & DIAMONDS' : 'SISTEMAS Y DIAMANTES'}</Text>
                                <Text style={[styles.headerTitle, isMobile && { fontSize: 14 }]}>
                                    {language === 'en' ? 'Cushion Numbering' : 'Numeración de Bandas'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel={t('common.close')}>
                            <IconX size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Quick Toolbar */}
                    <View style={styles.toolbar}>
                        <TouchableOpacity
                            style={[
                                styles.toggleBtn,
                                showNumbering && styles.toggleBtnActive,
                            ]}
                            onPress={onToggleShowNumbering}>
                            <Text
                                style={[
                                    styles.toggleBtnText,
                                    showNumbering && styles.toggleBtnTextActive,
                                ]}>
                                {showNumbering
                                    ? (language === 'en' ? '● Visible' : '● Visibles')
                                    : (language === 'en' ? '○ Hidden' : '○ Ocultos')}
                            </Text>
                        </TouchableOpacity>

                        {showNumbering && (
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={handleQuickAdd}>
                                <IconPlus size={13} color="#ffffff" strokeWidth={2.5} />
                                <Text style={styles.addBtnText}>{language === 'en' ? '+ Number' : '+ Número'}</Text>
                            </TouchableOpacity>
                        )}

                        {showNumbering && anchors.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearBtn}
                                onPress={() => onAnchorsChange([])}>
                                <IconTrash size={13} color="#ef4444" strokeWidth={2} />
                                <Text style={styles.clearBtnText}>{t('common.clear')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {showNumbering && isEditMode && (
                        <View style={styles.editHintBox}>
                            <Text style={styles.editHintText}>
                                {language === 'en'
                                    ? '💡 Drag numbers on the table to reposition them.'
                                    : '💡 Arrastra los números sobre la mesa para reposicionarlos.'}
                            </Text>
                        </View>
                    )}

                    {/* Scrollable Form Body */}
                    <ScrollView
                        style={[styles.modalScroll, isMobile && { maxHeight: 320 }]}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}>
                        <SystemNumberingControl
                            anchors={anchors}
                            formula={formula}
                            onAnchorsChange={onAnchorsChange}
                            onFormulaChange={onFormulaChange}
                        />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

const getStyles = (palette: ReturnType<typeof getPalette>, isDark: boolean) => StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.88)' : 'rgba(15, 23, 42, 0.60)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '90%',
        backgroundColor: palette.card,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : palette.border,
        padding: 18,
        gap: 10,
        shadowColor: isDark ? '#38bdf8' : '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 24,
        elevation: 12,
    },
    modalCardMobile: {
        width: '96%',
        padding: 12,
        borderRadius: 18,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    iconTag: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSubtitle: {
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#38bdf8',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: palette.text,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.surfaceLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    toggleBtn: {
        flex: 1,
        minWidth: 100,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : palette.surfaceLow,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : palette.border,
        alignItems: 'center',
    },
    toggleBtnActive: {
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(56, 189, 248, 0.12)',
        borderColor: '#38bdf8',
    },
    toggleBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: palette.muted,
    },
    toggleBtnTextActive: {
        color: '#38bdf8',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: '#0d5e2f',
    },
    addBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    clearBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#ef4444',
    },
    editHintBox: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.12)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.3)',
    },
    editHintText: {
        fontSize: 10,
        color: isDark ? '#93c5fd' : '#0284c7',
        textAlign: 'center',
    },
    modalScroll: {
        maxHeight: 380,
    },
    scrollContent: {
        paddingVertical: 4,
    },
});
