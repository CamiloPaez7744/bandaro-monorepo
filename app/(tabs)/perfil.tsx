import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/useAuth';
import { useColorScheme, useColorSchemePreference } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette } from '@/constants/theme';
import { AVATAR_OPTIONS, getAvatarSource } from '@/src/constants/avatars';
import { FLAG_OPTIONS, getFlagByCode } from '@/src/constants/flags';

export default function PerfilRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session, isAuthenticated, logout, refresh, isLoading, updateProfile } = useAuth();
  const { preference, setPreference } = useColorSchemePreference();
  const { preference: languagePreference, setPreference: setLanguagePreference, t } = useI18n();
  const palette = getPalette(useColorScheme());
  const [countryCode, setCountryCode] = useState('co');
  const [avatarKey, setAvatarKey] = useState('avatar-01');
  const [isSavingCountry, setIsSavingCountry] = useState(false);

  useEffect(() => {
    if (user?.countryCode) {
      setCountryCode(user.countryCode);
    }
  }, [user?.countryCode]);

  useEffect(() => {
    if (user?.avatar) {
      setAvatarKey(user.avatar);
    }
  }, [user?.avatar]);

  const selectedFlag = getFlagByCode(countryCode) ?? FLAG_OPTIONS[0];

  const onGuardarNacionalidad = async () => {
    if (!user) {
      return;
    }

    setIsSavingCountry(true);
    try {
      await updateProfile({ nacionalidad: selectedFlag.name, countryCode: selectedFlag.code });
    } finally {
      setIsSavingCountry(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: palette.background,
          paddingTop: 20 + insets.top,
          paddingBottom: 20 + insets.bottom + 70,
        },
      ]}>
      <Text style={[styles.title, { color: palette.text }]}>{t('profile.title')}</Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>{t('profile.subtitle')}</Text>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.cardTitle, { color: palette.text }]}>{t('profile.section.account')}</Text>
        {isLoading ? (
          <Text style={[styles.cardSubtitle, { color: palette.muted }]}>{t('profile.loadingSession')}</Text>
        ) : isAuthenticated && user ? (
          <>
            <View style={styles.userRow}>
              <Image source={getAvatarSource(user.avatar)} style={styles.avatar} />
              <View style={styles.userMeta}>
                <Text style={[styles.userName, { color: palette.text }]}>{user.alias}</Text>
                <Text style={[styles.userSub, { color: palette.muted }]}>{user.nombre}</Text>
                <View style={styles.flagInlineRow}>
                  <Image source={(getFlagByCode(user.countryCode) ?? selectedFlag).asset} style={styles.inlineFlag} />
                  <Text style={[styles.userSub, { color: palette.muted }]}>{user.nacionalidad}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.cardSubtitle, { color: palette.muted }]}>
              {t('profile.tokenExpires', { date: new Date(session!.accessExpiresAt).toLocaleString() })}
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.action, { borderColor: palette.border, backgroundColor: palette.background }]}
                onPress={refresh}>
                <Text style={[styles.actionText, { color: palette.text }]}>{t('profile.refreshSession')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.action, { borderColor: palette.border, backgroundColor: `${palette.primary}22` }]}
                onPress={logout}>
                <Text style={[styles.actionText, { color: palette.primary }]}>{t('profile.logout')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardTitle, { color: palette.text, marginTop: 8 }]}>{t('profile.section.nationality')}</Text>
            <View style={[styles.currentCountryCard, { borderColor: palette.border, backgroundColor: palette.background }]}>
              <Image source={selectedFlag.asset} style={styles.currentCountryFlag} />
              <Text style={[styles.currentCountryText, { color: palette.text }]}>{selectedFlag.name}</Text>
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

            <TouchableOpacity
              style={[styles.saveCountryButton, { backgroundColor: palette.primary }, isSavingCountry && styles.disabledButton]}
              onPress={onGuardarNacionalidad}
              disabled={isSavingCountry}>
              <Text style={styles.saveCountryText}>{isSavingCountry ? t('profile.saving') : t('profile.saveNationality')}</Text>
            </TouchableOpacity>

            <Text style={[styles.cardTitle, { color: palette.text, marginTop: 8 }]}>{t('profile.section.avatar')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarsRow}>
              {AVATAR_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.avatarChoice,
                    { borderColor: avatarKey === item.key ? palette.primary : palette.border },
                  ]}
                  onPress={() => setAvatarKey(item.key)}>
                  <Image source={item.asset} style={styles.avatarChoiceImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveCountryButton, { backgroundColor: palette.primary }, isSavingCountry && styles.disabledButton]}
              onPress={async () => {
                setIsSavingCountry(true);
                try {
                  await updateProfile({ avatar: avatarKey });
                } finally {
                  setIsSavingCountry(false);
                }
              }}
              disabled={isSavingCountry}>
              <Text style={styles.saveCountryText}>{isSavingCountry ? t('profile.saving') : t('profile.saveAvatar')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.cardSubtitle, { color: palette.muted }]}>{t('profile.noSession')}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.action, { borderColor: palette.border, backgroundColor: palette.background }]}
                onPress={() => router.push('/auth/login')}>
                <Text style={[styles.actionText, { color: palette.text }]}>{t('profile.login')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.action, { borderColor: palette.border, backgroundColor: `${palette.primary}22` }]}
                onPress={() => router.push('/auth/register')}>
                <Text style={[styles.actionText, { color: palette.primary }]}>{t('profile.register')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.cardTitle, { color: palette.text }]}>{t('profile.section.theme')}</Text>
        <Text style={[styles.cardSubtitle, { color: palette.muted }]}>{t('profile.theme.subtitle')}</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: palette.border, backgroundColor: palette.background },
              preference === 'system' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setPreference('system')}>
            <Text style={[styles.pillText, { color: preference === 'system' ? palette.primary : palette.text }]}>{t('common.system')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: palette.border, backgroundColor: palette.background },
              preference === 'light' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setPreference('light')}>
            <Text style={[styles.pillText, { color: preference === 'light' ? palette.primary : palette.text }]}>{t('common.light')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: palette.border, backgroundColor: palette.background },
              preference === 'dark' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setPreference('dark')}>
            <Text style={[styles.pillText, { color: preference === 'dark' ? palette.primary : palette.text }]}>{t('common.dark')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
        <Text style={[styles.cardTitle, { color: palette.text }]}>{t('profile.section.language')}</Text>
        <Text style={[styles.cardSubtitle, { color: palette.muted }]}>{t('profile.language.subtitle')}</Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: palette.border, backgroundColor: palette.background },
              languagePreference === 'system' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setLanguagePreference('system')}>
            <Text style={[styles.pillText, { color: languagePreference === 'system' ? palette.primary : palette.text }]}>
              {t('common.system')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: palette.border, backgroundColor: palette.background },
              languagePreference === 'es' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setLanguagePreference('es')}>
            <Text style={[styles.pillText, { color: languagePreference === 'es' ? palette.primary : palette.text }]}>
              {t('common.spanish')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: palette.border, backgroundColor: palette.background },
              languagePreference === 'en' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setLanguagePreference('en')}>
            <Text style={[styles.pillText, { color: languagePreference === 'en' ? palette.primary : palette.text }]}>
              {t('common.english')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
    padding: 20,
    gap: 8,
  },
  title: {
    fontWeight: '800',
    fontSize: 24,
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    marginTop: 16,
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  userMeta: {
    flex: 1,
    gap: 1,
  },
  userName: {
    fontWeight: '800',
    fontSize: 20,
  },
  userSub: {
    fontSize: 12,
  },
  flagInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineFlag: {
    width: 20,
    height: 14,
    borderRadius: 2,
  },
  currentCountryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentCountryFlag: {
    width: 28,
    height: 20,
    borderRadius: 3,
  },
  currentCountryText: {
    fontWeight: '700',
    fontSize: 13,
  },
  avatarsRow: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  avatarChoice: {
    borderWidth: 2,
    borderRadius: 999,
    padding: 3,
  },
  avatarChoiceImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  flagsRow: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  flagOption: {
    width: 108,
    borderWidth: 1,
    borderRadius: 10,
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
  saveCountryButton: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveCountryText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.7,
  },
  action: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: {
    fontWeight: '700',
    fontSize: 12,
  },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pillText: {
    fontWeight: '700',
  },
});
