import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_AVATARS, useAuth } from '@/components/useAuth';
import { AVATAR_OPTIONS } from '@/src/constants/avatars';
import { FLAG_OPTIONS, getFlagByCode } from '@/src/constants/flags';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { IconArrowLeft } from '@/src/presentation/components/icons';

export function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);

  const [nombre, setNombre] = useState('');
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('co');
  const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]);
  const [submitting, setSubmitting] = useState(false);

  const selectedFlag = getFlagByCode(countryCode) ?? FLAG_OPTIONS[0];

  const onRegister = async () => {
    try {
      setSubmitting(true);
      await register({
        nombre,
        alias,
        nacionalidad: selectedFlag.name,
        countryCode: selectedFlag.code,
        avatar,
        email,
        password,
      });
      router.replace('/(tabs)/profile');
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.register.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: theme.spacing.md + insets.top,
          paddingBottom: theme.spacing.md + insets.bottom + 24,
        },
      ]}>
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
      <Text style={styles.title}>{t('auth.register.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>

      <View style={styles.formCard}>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
          placeholder={t('auth.register.name')}
          placeholderTextColor={palette.muted}
        />
        <TextInput
          value={alias}
          onChangeText={setAlias}
          style={styles.input}
          placeholder={t('auth.register.alias')}
          placeholderTextColor={palette.muted}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder={t('auth.register.email')}
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          placeholder={t('auth.register.password')}
          placeholderTextColor={palette.muted}
          secureTextEntry
        />

        <Text style={styles.label}>{t('auth.register.nationality')}</Text>
        <View style={[styles.selectedFlagCard, { borderColor: palette.border, backgroundColor: palette.background }]}>
          <Image source={selectedFlag.asset} style={styles.selectedFlagImage} />
          <Text style={[styles.selectedFlagText, { color: palette.text }]}>{selectedFlag.name}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flagsRow}>
          {FLAG_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.flagOption,
                { borderColor: palette.border, backgroundColor: palette.background },
                item.code === countryCode && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
              ]}
              onPress={() => setCountryCode(item.code)}>
              <Image source={item.asset} style={styles.flagImage} />
              <Text style={[styles.flagName, { color: item.code === countryCode ? palette.primary : palette.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>{t('auth.register.defaultAvatar')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarsRow}>
          {AVATAR_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setAvatar(item.key)}
              style={[
                styles.avatarWrap,
                { borderColor: avatar === item.key ? palette.primary : palette.border },
              ]}>
              <Image source={item.asset} style={styles.avatar} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={[styles.button, submitting && styles.disabled]} onPress={onRegister} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? t('auth.register.submitting') : t('auth.register.submit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/login')}>
          <Text style={styles.link}>{t('auth.register.haveAccount')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      minHeight: '100%',
      backgroundColor: palette.background,
      padding: theme.spacing.md,
      gap: 8,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
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
    label: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    selectedFlagCard: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    selectedFlagImage: {
      width: 28,
      height: 20,
      borderRadius: 3,
    },
    selectedFlagText: {
      fontWeight: '700',
      fontSize: 13,
    },
    flagsRow: {
      gap: 8,
      paddingVertical: 2,
      paddingRight: 4,
    },
    flagOption: {
      width: 108,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: 8,
      gap: 6,
      alignItems: 'center',
    },
    flagImage: {
      width: 42,
      height: 30,
      borderRadius: 4,
    },
    flagName: {
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    avatarsRow: {
      gap: 8,
      paddingRight: 4,
    },
    avatarWrap: {
      borderWidth: 2,
      borderRadius: 999,
      padding: 3,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
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
