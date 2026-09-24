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
                                <Text style={styles.headerSubtitle}>SISTEMAS Y DIAMANTES</Text>
                                <Text style={[styles.headerTitle, isMobile && { fontSize: 14 }]}>
                                    Numeración de Bandas
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
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
                                {showNumbering ? '● Visibles' : '○ Ocultos'}
                            </Text>
                        </TouchableOpacity>

                        {showNumbering && (
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={handleQuickAdd}>
                                <IconPlus size={13} color="#ffffff" strokeWidth={2.5} />
                                <Text style={styles.addBtnText}>+ Número</Text>
                            </TouchableOpacity>
                        )}

                        {showNumbering && anchors.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearBtn}
                                onPress={() => onAnchorsChange([])}>
                                <IconTrash size={13} color="#ef4444" strokeWidth={2} />
                                <Text style={styles.clearBtnText}>Limpiar</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {showNumbering && isEditMode && (
                        <View style={styles.editHintBox}>
                            <Text style={styles.editHintText}>
                                💡 Arrastra los números sobre la mesa para reposicionarlos.
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

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '90%',
        backgroundColor: '#0f172a',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.3)',
        padding: 18,
        gap: 10,
        shadowColor: '#38bdf8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
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
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
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
        color: '#f8fafc',
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
    },
    toggleBtnActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
        borderColor: '#38bdf8',
    },
    toggleBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94a3b8',
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
        backgroundColor: 'rgba(56, 189, 248, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
    },
    editHintText: {
        fontSize: 10,
        color: '#93c5fd',
        textAlign: 'center',
    },
    modalScroll: {
        maxHeight: 380,
    },
    scrollContent: {
        paddingVertical: 4,
    },
});
