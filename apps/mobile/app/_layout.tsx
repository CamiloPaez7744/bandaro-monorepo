import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ColorSchemeProvider, useColorScheme } from '@/components/useColorScheme';
import { LanguageProvider, useI18n } from '@/components/useLanguage';
import { AuthProvider } from '@/components/useAuth';
import { WebSidebar } from '@/components/WebSidebar';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ColorSchemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ColorSchemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const showWebSidebar = Platform.OS === 'web' && width >= 1024 && !pathname.startsWith('/auth') && !pathname.startsWith('/+');

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {showWebSidebar ? (
        <View style={styles.webShell}>
          <WebSidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((value) => !value)} />
          <View style={styles.webContent}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="training/simulate" options={{ headerShown: false }} />
              <Stack.Screen name="auth/login" options={{ title: t('stack.login') }} />
              <Stack.Screen name="auth/register" options={{ title: t('stack.register') }} />
              <Stack.Screen name="training/index" options={{ title: t('stack.training') }} />
              <Stack.Screen name="training/[systemId]" options={{ title: t('stack.trainingSystem') }} />
              <Stack.Screen name="match/new" options={{ title: t('stack.newMatch') }} />
              <Stack.Screen name="match/live" options={{ title: t('stack.liveMatch') }} />
              <Stack.Screen name="match/summary" options={{ title: t('stack.summary') }} />
            </Stack>
          </View>
        </View>
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="training/simulate" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ title: t('stack.login') }} />
          <Stack.Screen name="auth/register" options={{ title: t('stack.register') }} />
          <Stack.Screen name="training/index" options={{ title: t('stack.training') }} />
          <Stack.Screen name="training/[systemId]" options={{ title: t('stack.trainingSystem') }} />
          <Stack.Screen name="match/new" options={{ title: t('stack.newMatch') }} />
          <Stack.Screen name="match/live" options={{ title: t('stack.liveMatch') }} />
          <Stack.Screen name="match/summary" options={{ title: t('stack.summary') }} />
        </Stack>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  webShell: {
    flex: 1,
    flexDirection: 'row',
  },
  webContent: {
    flex: 1,
    minWidth: 0,
  },
});
