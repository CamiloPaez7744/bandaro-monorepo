import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/useAuth';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';

export function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async () => {
    try {
      setSubmitting(true);
      await login({ email, password });
      router.replace('/(tabs)/perfil');
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.login.error'));
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
      <Text style={styles.title}>{t('auth.login.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>

      <View style={styles.formCard}>
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

        <TouchableOpacity style={[styles.button, submitting && styles.disabled]} onPress={onLogin} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? t('auth.login.submitting') : t('auth.login.submit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={styles.link}>{t('auth.login.noAccount')}</Text>
        </TouchableOpacity>
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
      gap: 8,
    },
    title: {
      color: palette.text,
      fontSize: 30,
      fontWeight: '800',
    },
    subtitle: {
      color: palette.muted,
    },
    formCard: {
      marginTop: 10,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.md,
      padding: 12,
      color: palette.text,
      backgroundColor: palette.background,
    },
    button: {
      marginTop: 6,
      backgroundColor: palette.primary,
      borderRadius: theme.radius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    disabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: 'white',
      fontWeight: '700',
      fontSize: 16,
    },
    link: {
      color: palette.primary,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 6,
    },
  });
