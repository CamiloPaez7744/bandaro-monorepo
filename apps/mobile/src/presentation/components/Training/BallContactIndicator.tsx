import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { Ball, BallId, Vec2, vec2Sub, vec2Length, vec2Normalize, vec2Dot } from '@bandaro/core';
import { getPalette } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

interface BallContactIndicatorProps {
    cueBall: Ball;
    targetBall: Ball;
    aimDirection: Vec2;
    disabled?: boolean;
}

interface ContactInfo {
    willContact: boolean;
    contactPoint: Vec2 | null;
    contactAngle: number;
    contactPercentage: number;
    cutAngle: number;
    contactType: 'full' | 'half' | 'quarter' | 'eighth' | 'thin' | 'none';
    contactSide: 'left' | 'right' | 'none';
}

function calculateContact(
    cueBall: Ball,
    targetBall: Ball,
    aimDirection: Vec2
): ContactInfo {
    const direction = vec2Normalize(aimDirection);
    const toTarget = vec2Sub(targetBall.pos, cueBall.pos);
    const distance = vec2Length(toTarget);

    const dotProduct = vec2Dot(toTarget, direction);
    
    if (dotProduct <= 0) {
        return {
            willContact: false,
            contactPoint: null,
            contactAngle: 0,
            contactPercentage: 0,
            cutAngle: 0,
            contactType: 'none',
            contactSide: 'none',
        };
    }

    const closestPoint = {
        x: cueBall.pos.x + direction.x * dotProduct,
        y: cueBall.pos.y + direction.y * dotProduct,
    };

    const missDistance = vec2Length(vec2Sub(closestPoint, targetBall.pos));
    const ballRadius = targetBall.radius;
    const contactThreshold = ballRadius * 2;

    if (missDistance > contactThreshold) {
        return {
            willContact: false,
            contactPoint: null,
            contactAngle: 0,
            contactPercentage: 0,
            cutAngle: 0,
            contactType: 'none',
            contactSide: 'none',
        };
    }

    const contactOffset = Math.sqrt(contactThreshold * contactThreshold - missDistance * missDistance);
    const contactPoint = {
        x: cueBall.pos.x + direction.x * (dotProduct - contactOffset),
        y: cueBall.pos.y + direction.y * (dotProduct - contactOffset),
    };

    const contactVector = vec2Sub(targetBall.pos, contactPoint);
    const contactNormal = vec2Normalize(contactVector);
    
    const cutAngle = Math.acos(Math.max(-1, Math.min(1, vec2Dot(direction, contactNormal)))) * (180 / Math.PI);
    
    const contactPercentage = Math.max(0, Math.min(100, ((contactThreshold - missDistance) / contactThreshold) * 100));

    let contactType: ContactInfo['contactType'];
    if (contactPercentage > 90) {
        contactType = 'full';
    } else if (contactPercentage > 65) {
        contactType = 'half';
    } else if (contactPercentage > 40) {
        contactType = 'quarter';
    } else if (contactPercentage > 20) {
        contactType = 'eighth';
    } else {
        contactType = 'thin';
    }

    const contactAngle = Math.atan2(contactNormal.y, contactNormal.x) * (180 / Math.PI);

    const crossProduct = toTarget.x * direction.y - toTarget.y * direction.x;
    const contactSide: ContactInfo['contactSide'] = crossProduct > 0 ? 'right' : 'left';

    return {
        willContact: true,
        contactPoint,
        contactAngle,
        contactPercentage,
        cutAngle,
        contactType,
        contactSide,
    };
}

function BallContactIndicatorBase(props: Readonly<BallContactIndicatorProps>) {
    const { cueBall, targetBall, aimDirection, disabled = false } = props;
    const { language } = useI18n();
    const palette = getPalette(useColorScheme());

    const contactInfo = useMemo(
        () => calculateContact(cueBall, targetBall, aimDirection),
        [cueBall, targetBall, aimDirection]
    );

    const size = 120;
    const center = size / 2;
    const ballRadius = 40;

    const getBallColor = (ballId: BallId): string => {
        switch (ballId) {
            case 'white':
                return '#f8fafc';
            case 'yellow':
                return '#facc15';
            case 'red':
                return '#dc2626';
            default:
                return '#f8fafc';
        }
    };

    const getBallGradient = (ballId: BallId): string => {
        switch (ballId) {
            case 'white':
                return 'contactBallWhite';
            case 'yellow':
                return 'contactBallYellow';
            case 'red':
                return 'contactBallRed';
            default:
                return 'contactBallWhite';
        }
    };

    const getContactLabel = (): string => {
        if (language === 'en') {
            const sideLabel = contactInfo.contactSide === 'left' ? 'L' : contactInfo.contactSide === 'right' ? 'R' : '';
            switch (contactInfo.contactType) {
                case 'full':
                    return 'Full';
                case 'half':
                    return `1/2 ${sideLabel}`.trim();
                case 'quarter':
                    return `1/4 ${sideLabel}`.trim();
                case 'eighth':
                    return `1/8 ${sideLabel}`.trim();
                case 'thin':
                    return `Thin ${sideLabel}`.trim();
                case 'none':
                    return 'No contact';
            }
        }

        const sideLabel = contactInfo.contactSide === 'left' ? 'Izq' : contactInfo.contactSide === 'right' ? 'Der' : '';
        switch (contactInfo.contactType) {
            case 'full':
                return 'Llena';
            case 'half':
                return `1/2 ${sideLabel}`.trim();
            case 'quarter':
                return `1/4 ${sideLabel}`.trim();
            case 'eighth':
                return `1/8 ${sideLabel}`.trim();
            case 'thin':
                return `Fina ${sideLabel}`.trim();
            case 'none':
                return 'Sin contacto';
        }
    };

    const eclipseOffsetX = (1 - contactInfo.contactPercentage / 100) * ballRadius * 2;
    const eclipseX = contactInfo.contactSide === 'left' 
        ? center - eclipseOffsetX 
        : center + eclipseOffsetX;
    const eclipseY = center;

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: palette.text }]}>{language === 'en' ? 'Ball Contact' : 'Toma de Bola'}</Text>

            <View style={[styles.indicatorContainer, { width: size, height: size }]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                        <RadialGradient id="contactBallWhite" cx="35%" cy="35%" r="65%">
                            <Stop offset="0%" stopColor="#ffffff" />
                            <Stop offset="70%" stopColor="#e8e8e8" />
                            <Stop offset="100%" stopColor="#c8c8c8" />
                        </RadialGradient>
                        <RadialGradient id="contactBallYellow" cx="35%" cy="35%" r="65%">
                            <Stop offset="0%" stopColor="#ffe066" />
                            <Stop offset="70%" stopColor="#facc15" />
                            <Stop offset="100%" stopColor="#ca8a04" />
                        </RadialGradient>
                        <RadialGradient id="contactBallRed" cx="35%" cy="35%" r="65%">
                            <Stop offset="0%" stopColor="#f87171" />
                            <Stop offset="70%" stopColor="#dc2626" />
                            <Stop offset="100%" stopColor="#991b1b" />
                        </RadialGradient>
                    </Defs>

                    {contactInfo.willContact && (
                        <G>
                            <Line
                                x1={center}
                                y1={center}
                                x2={eclipseX}
                                y2={eclipseY}
                                stroke="rgba(255,255,255,0.3)"
                                strokeWidth={1}
                                strokeDasharray="2 2"
                            />
                        </G>
                    )}

                    <Circle
                        cx={center}
                        cy={center}
                        r={ballRadius}
                        fill={`url(#${getBallGradient(targetBall.id)})`}
                        stroke="#cbd5e1"
                        strokeWidth={1.5}
                    />

                    {contactInfo.willContact && (
                        <G>
                            <Circle
                                cx={eclipseX}
                                cy={eclipseY}
                                r={ballRadius}
                                fill={`url(#${getBallGradient(cueBall.id)})`}
                                stroke="#cbd5e1"
                                strokeWidth={1.5}
                                opacity={0.85}
                            />
                            
                            <Circle
                                cx={eclipseX - ballRadius * 0.3}
                                cy={eclipseY - ballRadius * 0.3}
                                r={ballRadius * 0.15}
                                fill="rgba(255,255,255,0.6)"
                            />
                        </G>
                    )}

                    {!contactInfo.willContact && (
                        <G>
                            <Line
                                x1={center - ballRadius * 0.5}
                                y1={center - ballRadius * 0.5}
                                x2={center + ballRadius * 0.5}
                                y2={center + ballRadius * 0.5}
                                stroke="#ef4444"
                                strokeWidth={3}
                                strokeLinecap="round"
                            />
                            <Line
                                x1={center + ballRadius * 0.5}
                                y1={center - ballRadius * 0.5}
                                x2={center - ballRadius * 0.5}
                                y2={center + ballRadius * 0.5}
                                stroke="#ef4444"
                                strokeWidth={3}
                                strokeLinecap="round"
                            />
                        </G>
                    )}
                </Svg>
            </View>

            <View style={styles.infoContainer}>
                <Text style={[styles.contactLabel, { color: contactInfo.willContact ? palette.text : '#ef4444' }]}>
                    {getContactLabel()}
                </Text>
                
                {contactInfo.willContact && (
                    <>
                        <Text style={[styles.percentageText, { color: palette.primary }]}>
                            {contactInfo.contactPercentage.toFixed(0)}%
                        </Text>
                        <Text style={[styles.angleText, { color: palette.muted }]}>
                            {language === 'en' ? 'Cut' : 'Corte'}: {contactInfo.cutAngle.toFixed(1)}°
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
}

export const BallContactIndicator = memo(BallContactIndicatorBase);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    indicatorContainer: {
        borderRadius: 60,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    infoContainer: {
        alignItems: 'center',
        gap: 4,
    },
    contactLabel: {
        fontSize: 18,
        fontWeight: '900',
    },
    percentageText: {
        fontSize: 24,
        fontWeight: '800',
    },
    angleText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
