import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { IconFlame } from '@tabler/icons-react-native';

export interface AnimatedFlameBadgeProps {
    /**
     * Size of the flame icon in pixels (default: 14)
     */
    size?: number;
    /**
     * Whether to show the text label next to the flame logo (default: false)
     */
    showLabel?: boolean;
    /**
     * Optional custom label text (default: 'DIFÍCIL')
     */
    label?: string;
    /**
     * Optional custom container style
     */
    style?: ViewStyle;
}

export const AnimatedFlameBadge = memo(function AnimatedFlameBadge({
    size = 14,
    showLabel = false,
    label = 'DIFÍCIL',
    style,
}: AnimatedFlameBadgeProps) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 750,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 750,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    // Flame scale pulse
    const scale = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1.0, 1.18, 1.0],
    });

    // Flame gentle dancing sway
    const rotate = anim.interpolate({
        inputRange: [0, 0.25, 0.75, 1],
        outputRange: ['0deg', '-5deg', '5deg', '0deg'],
    });

    // Slight vertical float
    const translateY = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -1.5, 0],
    });

    // Pulsing fiery glow
    const glowOpacity = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.55, 0.95, 0.55],
    });

    return (
        <View
            style={[
                styles.badgeContainer,
                showLabel ? styles.badgeWithLabel : styles.badgeIconOnly,
                style,
            ]}
            accessibilityRole="image"
            accessibilityLabel="Tiro difícil (llama animada)"
            {...(Platform.OS === 'web' ? ({ title: 'Tiro Difícil' } as any) : {})}
        >
            {/* Animated Flame Icon */}
            <Animated.View
                style={[
                    styles.flameWrap,
                    {
                        transform: [{ translateY }, { scale }, { rotate }],
                        opacity: glowOpacity,
                    },
                ]}
            >
                <IconFlame
                    size={size}
                    color="#FF3D00"
                    fill="#FF9100"
                    strokeWidth={2.4}
                />
            </Animated.View>

            {/* Optional Text Label */}
            {showLabel && (
                <Text style={styles.badgeLabelText}>
                    {label}
                </Text>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 61, 0, 0.14)',
        borderColor: 'rgba(255, 109, 0, 0.45)',
        borderWidth: 1,
        borderRadius: 6,
        shadowColor: '#FF3D00',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 3,
    },
    badgeIconOnly: {
        paddingHorizontal: 5,
        paddingVertical: 3,
        minWidth: 26,
        minHeight: 22,
    },
    badgeWithLabel: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        gap: 4,
    },
    flameWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeLabelText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FF6D00',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
});

export default AnimatedFlameBadge;
