import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPalette } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';

function HomeTabIcon({ color, size }: Readonly<{ color: string; size: number }>) {
  return <Ionicons name="home" size={size} color={color} />;
}

function HistoryTabIcon({ color, size }: Readonly<{ color: string; size: number }>) {
  return <Ionicons name="time" size={size} color={color} />;
}

function TrainingTabIcon({ color, size }: Readonly<{ color: string; size: number }>) {
  return <Ionicons name="barbell" size={size} color={color} />;
}

function ProfileTabIcon({ color, size }: Readonly<{ color: string; size: number }>) {
  return <Ionicons name="person" size={size} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const palette = getPalette(colorScheme);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const useWebSidebar = Platform.OS === 'web' && width >= 1024;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          display: useWebSidebar ? 'none' : 'flex',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: HomeTabIcon,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: HistoryTabIcon,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: t('tabs.training'),
          tabBarIcon: TrainingTabIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ProfileTabIcon,
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
