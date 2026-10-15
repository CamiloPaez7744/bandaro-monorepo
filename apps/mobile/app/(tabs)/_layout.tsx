import { Tabs } from 'expo-router';
import {
  IconHome,
  IconBook,
  IconBarbell,
  IconUser,
  IconChartBar,
} from '@/src/presentation/components/icons';
import { Platform, useWindowDimensions } from 'react-native';

import { AnimatedTabBar } from '@/src/presentation/components/AnimatedTabBar';
import { useI18n } from '@/components/useLanguage';

function HomeTabIcon({ color, size }: Readonly<{ color: any; size: number }>) {
  return <IconHome size={size} color={color} strokeWidth={2} />;
}

function CatalogTabIcon({ color, size }: Readonly<{ color: any; size: number }>) {
  return <IconBook size={size} color={color} strokeWidth={2} />;
}

function DashboardTabIcon({ color, size }: Readonly<{ color: any; size: number }>) {
  return <IconChartBar size={size} color={color} strokeWidth={2} />;
}

function TrainingTabIcon({ color, size }: Readonly<{ color: any; size: number }>) {
  return <IconBarbell size={size} color={color} strokeWidth={2} />;
}

function ProfileTabIcon({ color, size }: Readonly<{ color: any; size: number }>) {
  return <IconUser size={size} color={color} strokeWidth={2} />;
}

export default function TabLayout() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const hideBottomBar = Platform.OS === 'web' && width >= 1024;

  return (
    <Tabs
      tabBar={hideBottomBar ? () => null : (props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: hideBottomBar ? { display: 'none' } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: HomeTabIcon,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t('tabs.catalog'),
          tabBarIcon: CatalogTabIcon,
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
        name="history"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: DashboardTabIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ProfileTabIcon,
        }}
      />
    </Tabs>
  );
}
