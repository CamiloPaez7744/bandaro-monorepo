import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import {
  HairlineFigureProps,
  HairlineTrainingFigure,
  HairlineCatalogFigure,
  HairlineSimulatorFigure,
  HairlineMatchFigure,
  HairlineDashboardFigure,
} from '@/src/presentation/components/HairlineIcons';


const { width: W } = Dimensions.get('window');
const CARD_GAP = 12;
const SIDE_PAD = 20;

interface CardDef {
  id: string;
  route: string;
  label: string;
  subtitle?: string;
  figure: React.ComponentType<HairlineFigureProps>;
  bg: string;
  accent: string;
  wide: boolean;
}

// ── Animated Card with Interactive Hairline Figure ───────────────────
function HubCard({
  card,
  onPress,
  style,
}: {
  card: CardDef;
  onPress: () => void;
  style?: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [isCardHovered, setIsCardHovered] = useState(false);

  const handlePressIn = () =>
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: Platform.OS !== 'web',
        tension: 200,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 0.82,
        duration: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

  const handlePressOut = () =>
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        tension: 180,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

  const Figure = card.figure;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      // @ts-ignore - Web pointer events for card border affordance only
      onPointerEnter={() => setIsCardHovered(true)}
      onPointerLeave={() => setIsCardHovered(false)}
      style={style}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: card.bg, transform: [{ scale }], opacity },
        ]}
      >
        {/* Top-right ambient glow blob via SVG */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id={`g_${card.id}`} cx="80%" cy="25%" r="65%">
              <Stop
                offset="0%"
                stopColor={card.accent}
                stopOpacity={isCardHovered ? 0.35 : 0.22}
              />
              <Stop offset="100%" stopColor={card.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx="80%"
            cy="25%"
            rx="65%"
            ry="65%"
            fill={`url(#g_${card.id})`}
          />
        </Svg>

        {/* Accent border with glow transition on hover */}
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.cardBorder,
            {
              borderColor: isCardHovered
                ? `${card.accent}77`
                : `${card.accent}33`,
            },
          ]}
        />

        {/* ── Card Content ── */}
        {card.wide ? (
          <View style={styles.wideCardContent}>
            <View style={styles.wideTextWrap}>
              <View style={styles.tagRow}>
                <View
                  style={[styles.statusDot, { backgroundColor: card.accent }]}
                />
                <Text style={[styles.cardTag, { color: card.accent }]}>
                  FÍSICAS Y TRAYECTORIAS
                </Text>
              </View>
              <Text style={styles.wideCardLabel}>{card.label}</Text>
              <Text style={styles.wideCardSub}>
                Mesa isométrica, bandas y cálculo de carambola
              </Text>
            </View>
            <View style={styles.wideFigureWrap}>
              <Figure
                size={142}
                accent={card.accent}
                autoPlay={true}
              />
            </View>
          </View>
        ) : (
          <View style={styles.cardContent}>
            <View style={styles.figureWrap}>
              <Figure
                size={
                  card.id === 'training'
                    ? 162
                    : card.id === 'dashboard'
                    ? 136
                    : 146
                }
                accent={card.accent}
                autoPlay={true}
              />
            </View>
            <View style={styles.labelRow}>
              <View
                style={[styles.miniDot, { backgroundColor: card.accent }]}
              />
              <Text style={styles.cardLabel} numberOfLines={2}>
                {card.label}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { t } = useI18n();

  const navigate = (route: string) => {
    try {
      router.push(route as never);
    } catch {
      /* route unavailable */
    }
  };

  const cards: CardDef[] = [
    {
      id: 'training',
      route: '/(tabs)/training',
      label: t('home.card.training'),
      figure: HairlineTrainingFigure,
      bg: '#051f11',
      accent: '#22c55e',
      wide: false,
    },
    {
      id: 'catalog',
      route: '/(tabs)/catalog',
      label: t('home.card.catalog'),
      figure: HairlineCatalogFigure,
      bg: '#051524',
      accent: '#38bdf8',
      wide: false,
    },
    {
      id: 'simulator',
      route: '/training/simulate',
      label: t('home.card.simulator'),
      figure: HairlineSimulatorFigure,
      bg: '#14082e',
      accent: '#a78bfa',
      wide: true,
    },
    {
      id: 'match',
      route: '/match/new',
      label: t('home.card.match'),
      figure: HairlineMatchFigure,
      bg: '#220803',
      accent: '#fb923c',
      wide: false,
    },
    {
      id: 'dashboard',
      route: '/(tabs)/history',
      label: t('home.card.dashboard'),
      figure: HairlineDashboardFigure,
      bg: '#04171a',
      accent: '#34d399',
      wide: false,
    },
  ];

  const row1 = cards.filter((c) => c.id === 'training' || c.id === 'catalog');
  const row2 = cards.filter((c) => c.id === 'simulator');
  const row3 = cards.filter((c) => c.id === 'match' || c.id === 'dashboard');

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: isDark ? '#060e09' : '#f0f5f1' },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ─────────────────────────────────────────── */}
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/BandaroLogo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        {/* ── Greeting ─────────────────────────────────────── */}
        <Text
          style={[styles.greeting, { color: isDark ? '#4ade80' : '#166534' }]}
        >
          {t('home.greeting')}
        </Text>

        {/* ── Grid 2-1-2 ───────────────────────────────────── */}
        <View style={styles.grid}>
          <View style={styles.rowFlex}>
            {row1.map((card) => (
              <HubCard
                key={card.id}
                card={card}
                onPress={() => navigate(card.route)}
                style={styles.halfCard}
              />
            ))}
          </View>

          <View style={styles.rowFlex}>
            {row2.map((card) => (
              <HubCard
                key={card.id}
                card={card}
                onPress={() => navigate(card.route)}
                style={styles.wideCard}
              />
            ))}
          </View>

          <View style={styles.rowFlex}>
            {row3.map((card) => (
              <HubCard
                key={card.id}
                card={card}
                onPress={() => navigate(card.route)}
                style={styles.halfCard}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── StyleSheet ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: SIDE_PAD,
    alignItems: 'center',
  },

  // Logo
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoImg: {
    width: 180,
    height: 180,
  },

  greeting: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 20,
  },

  // Grid
  grid: { width: '100%', maxWidth: 620, gap: CARD_GAP },
  rowFlex: { flexDirection: 'row', gap: CARD_GAP },
  halfCard: { flex: 1, height: 184 },
  wideCard: { flex: 1, height: 162 },

  // Card
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cardBorder: {
    borderRadius: 20,
    borderWidth: 1.2,
  },
  cardContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  figureWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cardLabel: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 18,
    flexShrink: 1,
  },

  // Wide card (Simulator) layout
  wideCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wideTextWrap: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  wideCardLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  wideCardSub: {
    color: '#cbd5e1',
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 15,
    maxWidth: 190,
  },
  wideFigureWrap: {
    width: 206,
    height: 138,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
