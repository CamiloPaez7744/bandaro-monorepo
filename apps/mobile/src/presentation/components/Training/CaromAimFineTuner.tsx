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
import { useI18n } from '@/components/useLanguage';

interface CaromAimFineTunerProps {
    aimDirection: Vec2;
    onAimChange: (direction: Vec2) => void;
    disabled?: boolean;
    compact?: boolean;
}

/**
 * Dial de micro-ajuste de puntería con precisión de 0.1° y 0.5°.
 * Evita la frustración del jitter táctil permitiendo encuadrar el tiro milimétricamente.
 */
export const CaromAimFineTuner = React.memo(function CaromAimFineTuner({
    aimDirection,
    onAimChange,
    disabled = false,
    compact = false,
}: CaromAimFineTunerProps) {
    const { language } = useI18n();
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

    if (compact) {
        return (
            <View style={[styles.container, styles.containerCompact]}>
                <TouchableOpacity
                    style={[styles.btn, styles.btnCompact, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(-0.25)}
                    disabled={disabled}
                    activeOpacity={0.7}
                    accessibilityLabel={language === 'en' ? 'Rotate left' : 'Girar izquierda'}>
                    <IconChevronLeft size={13} color="#e2e8f0" />
                </TouchableOpacity>

                <View style={[styles.angleDisplay, styles.angleDisplayCompact]}>
                    <Text style={[styles.angleText, styles.angleTextCompact]}>{currentAngleDeg.toFixed(1)}°</Text>
                </View>

                <TouchableOpacity
                    style={[styles.btn, styles.btnCompact, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(0.25)}
                    disabled={disabled}
                    activeOpacity={0.7}
                    accessibilityLabel={language === 'en' ? 'Rotate right' : 'Girar derecha'}>
                    <IconChevronRight size={13} color="#e2e8f0" />
                </TouchableOpacity>
            </View>
        );
    }

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
                    activeOpacity={0.7}
                    accessibilityLabel={language === 'en' ? 'Rotate left fast (-0.5°)' : 'Girar izquierda rápido (-0.5°)'}>
                    <IconChevronsLeft size={14} color="#94a3b8" />
                </TouchableOpacity>

                {/* Girar izquierda fino (-0.1°) */}
                <TouchableOpacity
                    style={[styles.btn, styles.btnFine, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(-0.1)}
                    disabled={disabled}
                    activeOpacity={0.7}
                    accessibilityLabel={language === 'en' ? 'Rotate left fine (-0.1°)' : 'Girar izquierda fino (-0.1°)'}>
                    <IconChevronLeft size={14} color="#e2e8f0" />
                </TouchableOpacity>

                {/* Girar derecha fino (+0.1°) */}
                <TouchableOpacity
                    style={[styles.btn, styles.btnFine, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(0.1)}
                    disabled={disabled}
                    activeOpacity={0.7}
                    accessibilityLabel={language === 'en' ? 'Rotate right fine (+0.1°)' : 'Girar derecha fino (+0.1°)'}>
                    <IconChevronRight size={14} color="#e2e8f0" />
                </TouchableOpacity>

                {/* Girar derecha rápido (+0.5°) */}
                <TouchableOpacity
                    style={[styles.btn, disabled && styles.btnDisabled]}
                    onPress={() => adjustAngle(0.5)}
                    disabled={disabled}
                    activeOpacity={0.7}
                    accessibilityLabel={language === 'en' ? 'Rotate right fast (+0.5°)' : 'Girar derecha rápido (+0.5°)'}>
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
    containerCompact: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 14,
        gap: 3,
    },
    btnCompact: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    angleDisplayCompact: {
        paddingRight: 1,
        gap: 2,
    },
    angleTextCompact: {
        fontSize: 10,
    },
});
