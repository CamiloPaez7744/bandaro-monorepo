import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCompass,
} from '@/src/presentation/components/icons';
import { Vec2, vec2 } from '@bandaro/core';

interface CaromAimFineTunerProps {
    aimDirection: Vec2;
    onAimChange: (direction: Vec2) => void;
    disabled?: boolean;
}

/**
 * Dial de micro-ajuste de puntería con precisión de 0.1° y 0.5°.
 * Evita la frustración del jitter táctil permitiendo encuadrar el tiro milimétricamente.
 */
export const CaromAimFineTuner = React.memo(function CaromAimFineTuner({
    aimDirection,
    onAimChange,
    disabled = false,
}: CaromAimFineTunerProps) {
    const currentAngleRad = Math.atan2(aimDirection.y, aimDirection.x);
    let currentAngleDeg = (currentAngleRad * 180) / Math.PI;
    if (currentAngleDeg < 0) currentAngleDeg += 360;

    const adjustAngle = useCallback(
        (deltaDeg: number) => {
            if (disabled) return;
            const newAngleRad = currentAngleRad + (deltaDeg * Math.PI) / 180;
            onAimChange(vec2(Math.cos(newAngleRad), Math.sin(newAngleRad)));
        },
        [currentAngleRad, onAimChange, disabled]
    );

    return (
        <View style={styles.container}>
            <View style={styles.angleDisplay}>
                <IconCompass size={13} color="#38bdf8" />
                <Text style={styles.angleText}>{currentAngleDeg.toFixed(1)}°</Text>
            </View>

            <View style={styles.buttonsRow}>
                {/* Girar izquierda rápido (-0.5°) */}
                <TouchableOpacity
                    style={[styles.btn, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(-0.5)}
                    disabled={disabled}
                    activeOpacity={0.7}>
                    <IconChevronsLeft size={14} color="#94a3b8" />
                </TouchableOpacity>

                {/* Girar izquierda fino (-0.1°) */}
                <TouchableOpacity
                    style={[styles.btn, styles.btnFine, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(-0.1)}
                    disabled={disabled}
                    activeOpacity={0.7}>
                    <IconChevronLeft size={14} color="#e2e8f0" />
                </TouchableOpacity>

                {/* Girar derecha fino (+0.1°) */}
                <TouchableOpacity
                    style={[styles.btn, styles.btnFine, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(0.1)}
                    disabled={disabled}
                    activeOpacity={0.7}>
                    <IconChevronRight size={14} color="#e2e8f0" />
                </TouchableOpacity>

                {/* Girar derecha rápido (+0.5°) */}
                <TouchableOpacity
                    style={[styles.btn, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(0.5)}
                    disabled={disabled}
                    activeOpacity={0.7}>
                    <IconChevronsRight size={14} color="#94a3b8" />
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        userSelect: 'none',
    },
    angleDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingRight: 4,
    },
    angleText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#f8fafc',
        fontVariant: ['tabular-nums'],
    },
    buttonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    btn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnFine: {
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
    },
    btnDisabled: {
        opacity: 0.4,
    },
});
