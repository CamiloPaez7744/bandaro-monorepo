import { useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import {
  IconBarbell,
  IconBook,
  IconDeviceGamepad2,
  IconChartBar,
  IconClipboardList,
} from '@tabler/icons-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

const { width: W } = Dimensions.get('window');
const CARD_GAP  = 12;
const SIDE_PAD  = 20;

// ── Animated card ────────────────────────────────────────────────────
function HubCard({
  card,
  onPress,
  style,
}: {
  card: { id: string; route: string; label: string; icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>; bg: string; accent: string; wide: boolean };
  onPress: () => void;
  style?: object;
}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }),
      Animated.timing(opacity, { toValue: 0.82, duration: 80, useNativeDriver: true }),
    ]).start();

  const handlePressOut = () =>
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

  const Icon = card.icon;

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={style}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: card.bg, transform: [{ scale }], opacity },
        ]}
      >
        {/* Top-right glow blob via SVG (no expo-linear-gradient needed) */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id={`g_${card.id}`} cx="80%" cy="20%" r="60%">
              <Stop offset="0%" stopColor={card.accent} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={card.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="80%" cy="20%" rx="60%" ry="60%" fill={`url(#g_${card.id})`} />
        </Svg>

        {/* Accent border */}
        <View style={[StyleSheet.absoluteFill, styles.cardBorder, { borderColor: `${card.accent}35` }]} />

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={[styles.iconCircle, { backgroundColor: `${card.accent}1a`, borderColor: `${card.accent}55` }]}>
            <Icon size={card.wide ? 28 : 24} color={card.accent} strokeWidth={1.8} />
          </View>
          <Text style={styles.cardLabel} numberOfLines={2}>{card.label}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Main screen ──────────────────────────────────────────────────────
export function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const isDark  = useColorScheme() === 'dark';
  const { t }   = useI18n();

  const navigate = (route: string) => {
    try { router.push(route as never); } catch { /* route unavailable */ }
  };

  const cards = [
    { id: 'training', route: '/(tabs)/training', label: t('home.card.training'), icon: IconBarbell, bg: '#0a2e1a', accent: '#22c55e', wide: false },
    { id: 'catalog', route: '/(tabs)/catalog', label: t('home.card.catalog'), icon: IconBook, bg: '#0a1e30', accent: '#38bdf8', wide: false },
    { id: 'simulator', route: '/training/simulate', label: t('home.card.simulator'), icon: IconDeviceGamepad2, bg: '#1e0f45', accent: '#a78bfa', wide: true },
    { id: 'match', route: '/match/new', label: t('home.card.match'), icon: IconClipboardList, bg: '#2e0f08', accent: '#fb923c', wide: false },
    { id: 'dashboard', route: '/(tabs)/history', label: t('home.card.dashboard'), icon: IconChartBar, bg: '#0a2030', accent: '#34d399', wide: false },
  ];

  const row1 = cards.filter(c => c.id === 'training' || c.id === 'catalog');
  const row2 = cards.filter(c => c.id === 'simulator');
  const row3 = cards.filter(c => c.id === 'match'    || c.id === 'dashboard');

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#060e09' : '#f0f5f1' }]}>
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
        <Text style={[styles.greeting, { color: isDark ? '#4ade80' : '#166534' }]}>
          {t('home.greeting')}
        </Text>

        {/* ── Grid 2-1-2 ───────────────────────────────────── */}
        <View style={styles.grid}>
          <View style={styles.rowFlex}>
            {row1.map(card => (
              <HubCard key={card.id} card={card} onPress={() => navigate(card.route)} style={styles.halfCard} />
            ))}
          </View>

          <View style={styles.rowFlex}>
            {row2.map(card => (
              <HubCard key={card.id} card={card} onPress={() => navigate(card.route)} style={styles.wideCard} />
            ))}
          </View>

          <View style={styles.rowFlex}>
            {row3.map(card => (
              <HubCard key={card.id} card={card} onPress={() => navigate(card.route)} style={styles.halfCard} />
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
  grid: { width: '100%', gap: CARD_GAP },
  rowFlex: { flexDirection: 'row', gap: CARD_GAP },
  halfCard: { flex: 1, height: 150 },
  wideCard: { flex: 1, height: 125 },

  // Card
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardBorder: {
    borderRadius: 20,
    borderWidth: 1,
  },
  cardContent: { padding: 14, gap: 8 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 19,
  },
  cardSub: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    opacity: 0.85,
  },
});
