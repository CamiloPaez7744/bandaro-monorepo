import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

// ── Layout ──────────────────────────────────────────────────────────
const BAR_H = 70;
const TOP_OVERHANG = 10; // Extra room above bar baseline so notch and dot never clip

// ── Scoop / Notch (fitted to reference: billiard-references/menu/esperado.png)
const NOTCH_R = 22; // half-width of scoop (total width = 60px)
const NOTCH_D = 15; // depth of scoop dip
const C1 = 14.0; // shoulder ease control point offset
const C2 = 13.0; // belly curve control point offset

// ── Floating Dot ────────────────────────────────────────────────────
const DOT_R = 4;

// ── Colors ──────────────────────────────────────────────────────────
const ACTIVE_COLOR = '#22c55e';
const INACTIVE_DARK = '#638b73';
const INACTIVE_LIGHT = '#94a3b8';

function clampCx(rawCx: number, totalW: number): number {
  return Math.max(NOTCH_R + 4, Math.min(totalW - NOTCH_R - 4, rawCx));
}

/**
 * Full-width bar path (straight edges at left, right, and bottom).
 * Top edge features a smooth concave scoop at cx.
 */
function barPath(cx: number, w: number, h: number): string {
  const y0 = TOP_OVERHANG;
  const r = NOTCH_R;
  const d = NOTCH_D;
  const x0 = cx - r;
  const x1 = cx + r;

  return [
    `M 0 ${y0}`,
    `L ${x0} ${y0}`,
    `C ${x0 + C1} ${y0} ${cx - C2} ${y0 + d} ${cx} ${y0 + d}`,
    `C ${cx + C2} ${y0 + d} ${x1 - C1} ${y0} ${x1} ${y0}`,
    `L ${w} ${y0}`,
    `L ${w} ${h}`,
    `L 0 ${h}`,
    'Z',
  ].join(' ');
}

/**
 * Top border path outlining only the horizontal top edge and the scoop contour.
 */
function topBorderPath(cx: number, w: number): string {
  const y0 = TOP_OVERHANG;
  const r = NOTCH_R;
  const d = NOTCH_D;
  const x0 = cx - r;
  const x1 = cx + r;

  return [
    `M 0 ${y0}`,
    `L ${x0} ${y0}`,
    `C ${x0 + C1} ${y0} ${cx - C2} ${y0 + d} ${cx} ${y0 + d}`,
    `C ${cx + C2} ${y0 + d} ${x1 - C1} ${y0} ${x1} ${y0}`,
    `L ${w} ${y0}`,
  ].join(' ');
}

import type { Tabs } from 'expo-router';

export type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export function AnimatedTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { width: screenWidth } = useWindowDimensions();

  // Hide bottom bar on desktop web (>= 1024px), but keep it visible on mobile and tablet web (< 1024px)
  if (Platform.OS === 'web' && screenWidth >= 1024) {
    return null;
  }

  const isDark = colorScheme === 'dark';
  const tabCount = Math.max(1, state.routes.length);
  const tabW = screenWidth / tabCount;
  const rootH = BAR_H + insets.bottom + TOP_OVERHANG;

  // ── Animated notch position ─────────────────────────────────────────
  const animX = useRef(new Animated.Value(state.index * tabW + tabW / 2)).current;
  const [svgCx, setSvgCx] = useState(state.index * tabW + tabW / 2);

  // ── Per-tab crossfade ──────────────────────────────────────────────
  const tabAnims = useRef(
    state.routes.map((_, i) => ({
      active: new Animated.Value(i === state.index ? 1 : 0),
    }))
  ).current;

  useEffect(() => {
    const target = state.index * tabW + tabW / 2;

    Animated.spring(animX, {
      toValue: target,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();

    const id = animX.addListener(({ value }) => setSvgCx(value));

    tabAnims.forEach((anim, i) =>
      Animated.timing(anim.active, {
        toValue: i === state.index ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    );

    return () => animX.removeListener(id);
  }, [state.index, animX, tabW, tabAnims]);

  const barBg = isDark ? '#102218' : '#ffffff';
  const barBorder = isDark ? '#1d3b2b' : '#e2e8f0';
  const inactive = isDark ? INACTIVE_DARK : INACTIVE_LIGHT;
  const dotCx = clampCx(svgCx, screenWidth);
  const dotCy = TOP_OVERHANG + 4.5;

  return (
    <View style={[styles.root, { height: rootH }]} pointerEvents="box-none">
      {/* ── Full width bar background & scoop via SVG ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={screenWidth} height={rootH}>
          {/* Main filled bar shape */}
          <Path d={barPath(dotCx, screenWidth, rootH)} fill={barBg} />
          {/* Top border line following top edge & scoop contour */}
          <Path
            d={topBorderPath(dotCx, screenWidth)}
            fill="none"
            stroke={barBorder}
            strokeWidth={1}
          />
          {/* Floating dot halo glow */}
          <Circle
            cx={dotCx}
            cy={dotCy}
            r={DOT_R + 3}
            fill={ACTIVE_COLOR}
            opacity={0.28}
          />
          {/* Floating dot core */}
          <Circle
            cx={dotCx}
            cy={dotCy}
            r={DOT_R}
            fill={ACTIVE_COLOR}
          />
        </Svg>
      </View>

      {/* ── Tab buttons ─────────────────────────────────── */}
      <View
        style={[
          styles.row,
          {
            height: BAR_H,
            marginTop: TOP_OVERHANG,
            paddingBottom: 2,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const labelKey =
            route.name === 'index'
              ? 'tabs.home'
              : route.name === 'catalog'
                ? 'tabs.catalog'
                : route.name === 'training'
                  ? 'tabs.training'
                  : route.name === 'history'
                    ? 'tabs.history'
                    : 'tabs.profile';

          const label = t(labelKey as Parameters<typeof t>[0]);

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                const ev = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !ev.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
            >
              <View style={styles.iconWrap}>
                {/* Inactive icon */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.center,
                    {
                      opacity: tabAnims[index].active.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    },
                  ]}
                >
                  {options.tabBarIcon?.({ focused: false, color: inactive, size: 22 })}
                </Animated.View>
                {/* Active icon */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.center,
                    {
                      opacity: tabAnims[index].active,
                    },
                  ]}
                >
                  {options.tabBarIcon?.({ focused: true, color: ACTIVE_COLOR, size: 22 })}
                </Animated.View>
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? ACTIVE_COLOR : inactive,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
    zIndex: 100,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  iconWrap: {
    width: 24,
    height: 24,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.1,
  },
});
