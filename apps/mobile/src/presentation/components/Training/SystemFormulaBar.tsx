import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { IconSparkles, IconTarget } from '@/src/presentation/components/icons';

export type FormulaRole = 'all' | 'departure' | 'attack' | 'arrival';

export interface SystemFormulaBarProps {
    departure: number;
    attack: number;
    arrival: number;
    arrival4th?: number;
    activeFilter: FormulaRole;
    onSelectFilter: (filter: FormulaRole) => void;
    title?: string;
}

export function SystemFormulaBar({
    departure,
    attack,
    arrival,
    arrival4th,
    activeFilter,
    onSelectFilter,
    title = 'Fórmula Canónica Base 50',
}: SystemFormulaBarProps) {
    // El sistema Base 50 no permite números negativos: límite inferior = 0
    const safeDeparture = Math.max(0, departure);
    const safeAttack = Math.max(0, attack);
    const safeArrival = Math.max(0, arrival);

    return (
        <View style={styles.container}>
            {/* Header info */}
            <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                    <Text style={styles.badgeText}>SISTEMA BASE 50</Text>
                    <Text style={styles.title}>{title}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
                    onPress={() => onSelectFilter('all')}
                >
                    <IconSparkles size={13} color={activeFilter === 'all' ? '#ffffff' : '#94a3b8'} />
                    <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
                        Ver Todos
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Formula Equation Row */}
            <View style={styles.equationRow}>
                {/* 1. Salida Card (Yellow #facc15) */}
                <TouchableOpacity
                    style={[
                        styles.variableCard,
                        styles.departureCard,
                        activeFilter === 'departure' && styles.variableCardActiveDeparture,
                    ]}
                    onPress={() => onSelectFilter(activeFilter === 'departure' ? 'all' : 'departure')}
                    activeOpacity={0.8}
                >
                    <View style={styles.variableHeader}>
                        <View style={[styles.dot, { backgroundColor: '#facc15' }]} />
                        <Text style={[styles.variableLabel, { color: '#facc15' }]}>SALIDA</Text>
                    </View>
                    <Text style={styles.variableValue}>{safeDeparture}</Text>
                    <Text style={styles.variableHint}>Banda Salida</Text>
                </TouchableOpacity>

                {/* Operator Minus */}
                <View style={styles.operatorBox}>
                    <Text style={styles.operatorText}>−</Text>
                </View>

                {/* 2. Ataque Card (Red #ef4444) */}
                <TouchableOpacity
                    style={[
                        styles.variableCard,
                        styles.attackCard,
                        activeFilter === 'attack' && styles.variableCardActiveAttack,
                    ]}
                    onPress={() => onSelectFilter(activeFilter === 'attack' ? 'all' : 'attack')}
                    activeOpacity={0.8}
                >
                    <View style={styles.variableHeader}>
                        <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                        <Text style={[styles.variableLabel, { color: '#ef4444' }]}>ATAQUE</Text>
                    </View>
                    <Text style={styles.variableValue}>{safeAttack}</Text>
                    <Text style={styles.variableHint}>1ª Banda</Text>
                </TouchableOpacity>

                {/* Operator Equals */}
                <View style={styles.operatorBox}>
                    <Text style={styles.operatorText}>=</Text>
                </View>

                {/* 3. Llegada Card (Green #10b981) */}
                <TouchableOpacity
                    style={[
                        styles.variableCard,
                        styles.arrivalCard,
                        activeFilter === 'arrival' && styles.variableCardActiveArrival,
                    ]}
                    onPress={() => onSelectFilter(activeFilter === 'arrival' ? 'all' : 'arrival')}
                    activeOpacity={0.8}
                >
                    <View style={styles.variableHeader}>
                        <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                        <Text style={[styles.variableLabel, { color: '#10b981' }]}>LLEGADA</Text>
                    </View>
                    <Text style={styles.variableValue}>{safeArrival}</Text>
                    <Text style={styles.variableHint}>
                        3ª Banda {typeof arrival4th === 'number' ? `(4ª: ${Math.max(0, arrival4th)})` : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Quick helper caption */}
            <View style={styles.captionRow}>
                <IconTarget size={13} color="#64748b" />
                <Text style={styles.captionText}>
                    Toca cualquier casilla para aislar los diamantes en la mesa: Salida (🟨), Ataque (🟥), Llegada (🟩)
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0f172a',
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: '#1e293b',
        padding: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleWrap: {
        gap: 2,
    },
    badgeText: {
        color: '#facc15',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        color: '#f8fafc',
        fontSize: 15,
        fontWeight: '800',
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#1e293b',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#334155',
    },
    filterPillActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#60a5fa',
    },
    filterPillText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
    },
    filterPillTextActive: {
        color: '#ffffff',
    },
    equationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    variableCard: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: theme.radius.md,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        borderColor: '#334155',
        alignItems: 'center',
        gap: 2,
    },
    departureCard: {
        borderColor: 'rgba(250, 204, 21, 0.3)',
        backgroundColor: 'rgba(250, 204, 21, 0.05)',
    },
    variableCardActiveDeparture: {
        borderColor: '#facc15',
        backgroundColor: 'rgba(250, 204, 21, 0.18)',
    },
    attackCard: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    variableCardActiveAttack: {
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
    },
    arrivalCard: {
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    variableCardActiveArrival: {
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.18)',
    },
    variableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    variableLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    variableValue: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '900',
    },
    variableHint: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: '600',
    },
    operatorBox: {
        width: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    operatorText: {
        color: '#64748b',
        fontSize: 20,
        fontWeight: '900',
    },
    captionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 2,
    },
    captionText: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
    },
});
