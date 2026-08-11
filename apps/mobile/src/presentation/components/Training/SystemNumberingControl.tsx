import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { NumberAnchor, Formula } from './SystemNumberingOverlay';

export type { NumberAnchor, Formula };

interface SystemNumberingControlProps {
    anchors: NumberAnchor[];
    formula: Formula | null;
    onAnchorsChange: (anchors: NumberAnchor[]) => void;
    onFormulaChange: (formula: Formula | null) => void;
}

const VARIABLE_COLORS = {
    arrival: '#3b82f6',
    attack: '#ef4444',
    departure: '#10b981',
    custom: '#f59e0b',
};

const VARIABLE_LABELS = {
    arrival: 'Banda de llegada',
    attack: 'Banda de ataque',
    departure: 'Banda de salida',
    custom: 'Personalizado',
};

export function SystemNumberingControl({
    anchors,
    formula,
    onAnchorsChange,
    onFormulaChange,
}: SystemNumberingControlProps) {
    const [newAnchorValue, setNewAnchorValue] = useState('');
    const [newAnchorSide, setNewAnchorSide] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
    const [newAnchorIndex, setNewAnchorIndex] = useState('0');
    const [newAnchorType, setNewAnchorType] = useState<'arrival' | 'attack' | 'departure' | 'custom'>('custom');
    const [formulaExpression, setFormulaExpression] = useState(formula?.expression || '');
    const [arrivalValue, setArrivalValue] = useState(formula?.variables.arrival || '');
    const [attackValue, setAttackValue] = useState(formula?.variables.attack || '');
    const [departureValue, setDepartureValue] = useState(formula?.variables.departure || '');

    const addAnchor = () => {
        if (!newAnchorValue.trim()) return;

        const newAnchor: NumberAnchor = {
            id: Date.now().toString(),
            value: newAnchorValue,
            side: newAnchorSide,
            diamondIndex: parseInt(newAnchorIndex) || 0,
            variableType: newAnchorType,
            color: VARIABLE_COLORS[newAnchorType],
        };

        onAnchorsChange([...anchors, newAnchor]);
        setNewAnchorValue('');
    };

    const removeAnchor = (id: string) => {
        onAnchorsChange(anchors.filter((a) => a.id !== id));
    };

    const updateFormula = () => {
        const newFormula: Formula = {
            id: 'main',
            expression: formulaExpression,
            variables: {
                arrival: arrivalValue,
                attack: attackValue,
                departure: departureValue,
            },
        };
        onFormulaChange(newFormula);
    };

    return (
        <ScrollView style={styles.container}>
            {/* Number Anchors Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Números en Diamantes</Text>

                {/* Add new anchor */}
                <View style={styles.inputGroup}>
                    <TextInput
                        style={styles.input}
                        placeholder="Número"
                        value={newAnchorValue}
                        onChangeText={setNewAnchorValue}
                        placeholderTextColor="#666"
                    />

                    <View style={styles.row}>
                        <TouchableOpacity
                            style={[styles.selectButton, newAnchorSide === 'top' && styles.selectButtonActive]}
                            onPress={() => setNewAnchorSide('top')}
                        >
                            <Text style={[styles.selectText, newAnchorSide === 'top' && styles.selectTextActive]}>
                                Arriba
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.selectButton, newAnchorSide === 'bottom' && styles.selectButtonActive]}
                            onPress={() => setNewAnchorSide('bottom')}
                        >
                            <Text style={[styles.selectText, newAnchorSide === 'bottom' && styles.selectTextActive]}>
                                Abajo
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.selectButton, newAnchorSide === 'left' && styles.selectButtonActive]}
                            onPress={() => setNewAnchorSide('left')}
                        >
                            <Text style={[styles.selectText, newAnchorSide === 'left' && styles.selectTextActive]}>
                                Izq
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.selectButton, newAnchorSide === 'right' && styles.selectButtonActive]}
                            onPress={() => setNewAnchorSide('right')}
                        >
                            <Text style={[styles.selectText, newAnchorSide === 'right' && styles.selectTextActive]}>
                                Der
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Índice diamante (0-8)"
                        value={newAnchorIndex}
                        onChangeText={setNewAnchorIndex}
                        keyboardType="numeric"
                        placeholderTextColor="#666"
                    />

                    <View style={styles.row}>
                        {(Object.keys(VARIABLE_LABELS) as Array<keyof typeof VARIABLE_LABELS>).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeButton,
                                    newAnchorType === type && { backgroundColor: VARIABLE_COLORS[type] },
                                ]}
                                onPress={() => setNewAnchorType(type)}
                            >
                                <Text
                                    style={[
                                        styles.typeText,
                                        newAnchorType === type && styles.typeTextActive,
                                    ]}
                                >
                                    {VARIABLE_LABELS[type].split(' ')[0]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.addButton} onPress={addAnchor}>
                        <Text style={styles.addButtonText}>Agregar Número</Text>
                    </TouchableOpacity>
                </View>

                {/* List of anchors */}
                <View style={styles.anchorList}>
                    {anchors.map((anchor) => (
                        <View key={anchor.id} style={styles.anchorItem}>
                            <View style={[styles.anchorColor, { backgroundColor: anchor.color }]} />
                            <Text style={styles.anchorText}>
                                {anchor.value} ({anchor.side} #{anchor.diamondIndex})
                            </Text>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => removeAnchor(anchor.id)}
                            >
                                <Text style={styles.removeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>

            {/* Formula Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fórmula del Sistema</Text>

                <TextInput
                    style={[styles.input, styles.formulaInput]}
                    placeholder="Ej: {arrival} + {attack} = {departure}"
                    value={formulaExpression}
                    onChangeText={setFormulaExpression}
                    placeholderTextColor="#666"
                />

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Variables:</Text>

                    <View style={styles.variableRow}>
                        <View style={[styles.variableIndicator, { backgroundColor: VARIABLE_COLORS.arrival }]} />
                        <TextInput
                            style={styles.variableInput}
                            placeholder="Banda de llegada"
                            value={arrivalValue}
                            onChangeText={setArrivalValue}
                            placeholderTextColor="#666"
                        />
                    </View>

                    <View style={styles.variableRow}>
                        <View style={[styles.variableIndicator, { backgroundColor: VARIABLE_COLORS.attack }]} />
                        <TextInput
                            style={styles.variableInput}
                            placeholder="Banda de ataque"
                            value={attackValue}
                            onChangeText={setAttackValue}
                            placeholderTextColor="#666"
                        />
                    </View>

                    <View style={styles.variableRow}>
                        <View style={[styles.variableIndicator, { backgroundColor: VARIABLE_COLORS.departure }]} />
                        <TextInput
                            style={styles.variableInput}
                            placeholder="Banda de salida"
                            value={departureValue}
                            onChangeText={setDepartureValue}
                            placeholderTextColor="#666"
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.addButton} onPress={updateFormula}>
                    <Text style={styles.addButtonText}>Actualizar Fórmula</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#fff',
    },
    inputGroup: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        color: '#fff',
        fontSize: 14,
    },
    formulaInput: {
        fontFamily: 'monospace',
        fontSize: 13,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    selectButton: {
        flex: 1,
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#2a2a2a',
        alignItems: 'center',
    },
    selectButtonActive: {
        backgroundColor: '#3b82f6',
    },
    selectText: {
        color: '#fff',
        fontSize: 12,
    },
    selectTextActive: {
        fontWeight: 'bold',
    },
    typeButton: {
        flex: 1,
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#2a2a2a',
        alignItems: 'center',
    },
    typeText: {
        color: '#fff',
        fontSize: 11,
    },
    typeTextActive: {
        fontWeight: 'bold',
    },
    addButton: {
        backgroundColor: '#3b82f6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    anchorList: {
        gap: 8,
    },
    anchorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        padding: 12,
        borderRadius: 8,
    },
    anchorColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 12,
    },
    anchorText: {
        flex: 1,
        color: '#fff',
        fontSize: 13,
    },
    removeButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    label: {
        color: '#fff',
        fontSize: 13,
        marginBottom: 8,
    },
    variableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    variableIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    variableInput: {
        flex: 1,
        backgroundColor: '#2a2a2a',
        borderRadius: 6,
        padding: 8,
        color: '#fff',
        fontSize: 13,
    },
});
