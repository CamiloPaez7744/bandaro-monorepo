import { memo, useState, useCallback } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { BilliardsTableThumbnail } from '@/src/presentation/components/Training/BilliardsTableThumbnail';
import { getPalette } from '@/constants/theme';
import type { CatalogShot } from '@/src/infrastructure/catalog/shotAdapter';

const CATEGORY_COLORS: Record<string, string> = {
    draw: '#3B82F6',
    side_spin: '#8B5CF6',
    follow: '#10B981',
    cut: '#F59E0B',
    big_spin: '#EF4444',
    standing: '#6366F1',
    double_cushion: '#EC4899',
    cross_table: '#14B8A6',
    reverse: '#F97316',
    come_back: '#06B6D4',
    bounce: '#84CC16',
    bank_shot: '#E11D48',
    basic: '#6B7280',
    rescue: '#A855F7',
    ball_choice: '#0EA5E9',
};

const CATEGORY_NAMES: Record<string, string> = {
    draw: 'Retro',
    side_spin: 'Lateral',
    follow: 'Seguimiento',
    cut: 'Corte',
    big_spin: 'Gran Rot.',
    standing: 'Vertical',
    double_cushion: 'Doble Banda',
    cross_table: 'Travesía',
    reverse: 'Reversa',
    come_back: 'Regreso',
    bounce: 'Rebote',
    bank_shot: 'Banco',
    basic: 'Básico',
    rescue: 'Rescate',
    ball_choice: 'Selección',
};

type ShotCatalogCardProps = {
    shot: CatalogShot;
    onPress: (shot: CatalogShot) => void;
    palette: ReturnType<typeof getPalette>;
};

const WEB_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const ShotCatalogCard = memo(function ShotCatalogCard({
    shot,
    onPress,
    palette,
}: ShotCatalogCardProps) {
    const color = CATEGORY_COLORS[shot.category] ?? '#6B7280';
    const isDark = palette.background === '#112118' || palette.background === '#0f172a';
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => setIsHovered(false), []);

    const active = isHovered;
    const glowOpacity = active ? 1 : 0;

    return (
        <Pressable
            onPress={() => onPress(shot)}
            onHoverIn={handleMouseEnter}
            onHoverOut={handleMouseLeave}
            style={({ pressed }) => ({
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
                marginBottom: 16,
                backgroundColor: palette.card,
                borderWidth: 1,
                borderColor: pressed ? color : active ? `${color}40` : palette.border,
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: active ? 0.25 : 0.06,
                shadowRadius: active ? 16 : 4,
                elevation: active ? 6 : 2,
            })}
        >
            {/* Ambient glow (web hover) */}
            {Platform.OS === 'web' && (
                <div
                    style={{
                        position: 'absolute',
                        inset: -2,
                        background: `radial-gradient(ellipse at center, ${color}18, transparent 70%)`,
                        borderRadius: 18,
                        opacity: glowOpacity,
                        transition: 'opacity 0.35s ease-out',
                        pointerEvents: 'none' as const,
                        zIndex: 0,
                    }}
                />
            )}

            <View style={{ position: 'relative', zIndex: 1 }}>
                {/* Category badge + future left element */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingTop: 8,
                    paddingBottom: 4,
                }}>
                    <View style={{
                        backgroundColor: color,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                    }}>
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: '#fff',
                        }}>
                            {CATEGORY_NAMES[shot.category] ?? shot.category}
                        </Text>
                    </View>
                </View>

                {/* Table */}
                <View style={{ paddingHorizontal: 8 }}>
                    <View style={{
                        borderRadius: theme.radius.md,
                        overflow: 'hidden',
                    }}>
                        <BilliardsTableThumbnail
                            balls={[
                                { id: 'white', x: shot.white.x, y: shot.white.y, color: '#FFFFFF', border: '#CCCCCC' },
                                { id: 'yellow', x: shot.yellow.x, y: shot.yellow.y, color: '#FBBF24', border: '#D97706' },
                                { id: 'red', x: shot.red.x, y: shot.red.y, color: '#EF4444', border: '#B91C1C' },
                            ]}
                            paths={[
                                { id: 'cue', points: shot.cueBallTrajectory, color, width: 2, opacity: 0.9 },
                                { id: 'obj1', points: shot.objectBall1Trajectory, color: '#FBBF24', width: 1.25, dash: [4, 3], opacity: 0.5 },
                                { id: 'obj2', points: shot.objectBall2Trajectory, color: '#EF4444', width: 1.25, dash: [4, 3], opacity: 0.5 },
                            ]}
                            showPath
                            style={{ width: '100%', aspectRatio: 2 / 1 }}
                        />
                    </View>
                </View>

                {/* Description */}
                {shot.description ? (
                    <View style={{
                        paddingHorizontal: 14,
                        paddingTop: 10,
                        paddingBottom: 14,
                    }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '500',
                            color: palette.muted,
                            lineHeight: 17,
                        }} numberOfLines={2}>
                            {shot.description}
                        </Text>
                    </View>
                ) : null}

                {/* Hover overlay (web) — shows on hover with tactical details */}
                {Platform.OS === 'web' && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: isDark
                                ? `linear-gradient(180deg, ${color}30, ${color}48 40%, ${color}58)`
                                : `linear-gradient(180deg, ${color}25, ${color}40 40%, ${color}50)`,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            display: 'flex',
                            flexDirection: 'column' as const,
                            justifyContent: 'flex-end',
                            padding: 14,
                            opacity: isHovered ? 1 : 0,
                            pointerEvents: isHovered ? 'auto' : 'none',
                            transition: 'opacity 0.3s ease-out',
                            zIndex: 20,
                        }}
                    >
                        {/* Top label */}
                        <div style={{
                            position: 'absolute',
                            top: 10,
                            left: 14,
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: WEB_FONT,
                            color,
                            textTransform: 'uppercase' as const,
                            letterSpacing: 1.2,
                        }}>
                            Detalles
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '5px 0',
                                borderBottom: `1px solid ${isDark ? '#274a39' : '#e2e8f0'}`,
                            }}>
                                <span style={{ fontSize: 11, fontFamily: WEB_FONT, color: palette.muted }}>Potencia</span>
                                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: WEB_FONT, color: palette.text }}>{shot.powerLevel.toFixed(1)}</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '5px 0',
                                borderBottom: `1px solid ${isDark ? '#274a39' : '#e2e8f0'}`,
                            }}>
                                <span style={{ fontSize: 11, fontFamily: WEB_FONT, color: palette.muted }}>Velocidad</span>
                                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: WEB_FONT, color: palette.text }}>{(shot.powerLevel * 0.7).toFixed(1)} m/s</span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '5px 0',
                            }}>
                                <span style={{ fontSize: 11, fontFamily: WEB_FONT, color: palette.muted }}>Trayectoria</span>
                                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: WEB_FONT, color: palette.text }}>{shot.cueBallTrajectory.length} pts</span>
                            </div>
                        </div>

                        {/* Power bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            marginTop: 8,
                        }}>
                            {Array.from({ length: 5 }, (_, i) => {
                                const filled = i < Math.ceil(shot.powerLevel / 1.5);
                                return (
                                    <div key={i} style={{
                                        flex: 1,
                                        height: 4,
                                        borderRadius: 2,
                                        background: filled ? color : isDark ? '#274a39' : '#e2e8f0',
                                    }} />
                                );
                            })}
                        </div>

                        {/* Simular button */}
                        <button
                            style={{
                                marginTop: 10,
                                padding: '8px 0',
                                borderRadius: 10,
                                background: color,
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: WEB_FONT,
                                border: 'none',
                                cursor: 'pointer',
                                letterSpacing: 0.3,
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPress(shot);
                            }}
                        >
                            Simular
                        </button>
                    </div>
                )}
            </View>
        </Pressable>
    );
});

const theme = {
    radius: { md: 12, lg: 18 },
};
