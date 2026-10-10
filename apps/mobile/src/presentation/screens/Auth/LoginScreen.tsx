import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/useAuth';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { IconArrowLeft, IconSparkles } from '@/src/presentation/components/icons';

export function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle, loginWithMicrosoft } = useAuth();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null);

  const onLogin = async () => {
    try {
      setSubmitting(true);
      await login({ email, password });
      router.replace('/(tabs)/profile');
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    try {
      setSocialLoading('google');
      await loginWithGoogle({
        email: 'google_player@bandaro.app',
        name: 'Jugador Google',
        avatarUrl: 'avatar-02',
        isDevDemo: true,
      });
      router.replace('/(tabs)/profile');
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.login.googleError'));
    } finally {
      setSocialLoading(null);
    }
  };

  const onMicrosoftLogin = async () => {
    try {
      setSocialLoading('microsoft');
      await loginWithMicrosoft({
        email: 'ms_player@bandaro.app',
        name: 'Jugador Microsoft',
        avatarUrl: 'avatar-03',
        isDevDemo: true,
      });
      router.replace('/(tabs)/profile');
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.login.microsoftError'));
    } finally {
      setSocialLoading(null);
    }
  };

  const onQuickDemoLogin = async () => {
    try {
      setSubmitting(true);
      setEmail('demo@bandaro.app');
      setPassword('Password123!');
      await login({ email: 'demo@bandaro.app', password: 'Password123!' });
      router.replace('/(tabs)/training');
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.login.demoError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.md + insets.bottom + 24,
        },
      ]}>
      <View style={styles.contentWrap}>
        {router.canGoBack() && (
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}>
              <IconArrowLeft size={20} color={palette.text} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.headerCol}>
          <Text style={styles.title}>{t('auth.login.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
        </View>

        <View style={styles.formCard}>
          {/* Quick Demo Access Badge */}
          <TouchableOpacity
            style={styles.demoBadgeBtn}
            activeOpacity={0.8}
            onPress={onQuickDemoLogin}
            disabled={submitting}
          >
            <IconSparkles size={16} color={palette.primary} />
            <Text style={styles.demoBadgeText}>{t('auth.login.demoBadge')}</Text>
          </TouchableOpacity>

          {/* Social OAuth Logins: Google & Microsoft */}
          <View style={styles.socialCol}>
            <TouchableOpacity
              style={[styles.socialBtn, styles.googleBtn]}
              activeOpacity={0.85}
              onPress={onGoogleLogin}
              disabled={socialLoading !== null || submitting}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <View style={styles.socialIconCircle}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.socialBtnText}>{t('auth.login.google')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, styles.microsoftBtn]}
              activeOpacity={0.85}
              onPress={onMicrosoftLogin}
              disabled={socialLoading !== null || submitting}
            >
              {socialLoading === 'microsoft' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <View style={styles.socialIconCircle}>
                    <Text style={styles.msIconText}>⊞</Text>
                  </View>
                  <Text style={styles.socialBtnText}>{t('auth.login.microsoft')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.login.orEmail')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder={t('auth.login.email')}
            placeholderTextColor={palette.muted}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder={t('auth.login.password')}
            placeholderTextColor={palette.muted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.disabled]}
            onPress={onLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login.submit')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.link}>{t('auth.login.noAccount')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
      padding: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentWrap: {
      width: '100%',
      maxWidth: 480,
      gap: 12,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radius.md,
      backgroundColor: palette.surfaceLow,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCol: {
      gap: 4,
    },
    title: {
      color: palette.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 14,
    },
    formCard: {
      marginTop: 6,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 6,
    },
    demoBadgeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: `${palette.primary}15`,
      borderWidth: 1,
      borderColor: `${palette.primary}35`,
      borderRadius: theme.radius.md,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    demoBadgeText: {
      color: palette.primary,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    socialCol: {
      gap: 10,
      marginTop: 4,
    },
    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: theme.radius.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    googleBtn: {
      backgroundColor: '#1f2937',
    },
    microsoftBtn: {
      backgroundColor: '#0f172a',
    },
    socialIconCircle: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleIconText: {
      color: '#4285F4',
      fontSize: 16,
      fontWeight: '900',
    },
    msIconText: {
      color: '#00a4ef',
      fontSize: 16,
      fontWeight: '900',
    },
    socialBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 4,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: palette.border,
    },
    dividerText: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.md,
      padding: 12,
      color: palette.text,
      backgroundColor: palette.surfaceLow,
      fontSize: 14,
    },
    button: {
      marginTop: 4,
      backgroundColor: palette.primary,
      borderRadius: theme.radius.md,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: '#ffffff',
      fontWeight: '800',
      fontSize: 15,
    },
    link: {
      color: palette.primary,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 4,
      fontSize: 13,
    },
  });
