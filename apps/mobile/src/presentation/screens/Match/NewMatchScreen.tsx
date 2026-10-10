import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/useAuth';
import { useColorScheme } from '@/components/useColorScheme';
import { useI18n } from '@/components/useLanguage';
import { getPalette, theme } from '@/constants/theme';
import { IconArrowLeft } from '@/src/presentation/components/icons';
import { container } from '@/src/presentation/container';

export function NewMatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const palette = getPalette(useColorScheme());
  const styles = getStyles(palette);
  const [jugadorA, setPlayerA] = useState('');
  const [jugadorB, setPlayerB] = useState('');
  const [ganadorSalida, setGanadorSalida] = useState<'A' | 'B'>('A');
  const [modoHandicap, setModoHandicap] = useState(false);
  const [distanciaManos, setDistanceManos] = useState('20');
  const [distanciaA, setDistanceA] = useState('20');
  const [distanciaB, setDistanceB] = useState('20');

  const onCrear = async () => {
    try {
      const distanciaBase = Number(distanciaManos);
      const objetivoManos = Number.isFinite(distanciaBase) && distanciaBase > 0 ? distanciaBase : 20;

      const objetivoA = modoHandicap
        ? (Number.isFinite(Number(distanciaA)) && Number(distanciaA) > 0 ? Number(distanciaA) : 20)
        : objetivoManos;
      const objetivoB = modoHandicap
        ? (Number.isFinite(Number(distanciaB)) && Number(distanciaB) > 0 ? Number(distanciaB) : 20)
        : objetivoManos;

      const nombreA = jugadorA.trim() || t('newMatch.playerADefault');
      const nombreB = jugadorB.trim() || t('newMatch.playerBDefault');
      const jugador1Nombre = ganadorSalida === 'A' ? nombreA : nombreB;
      const jugador2Nombre = ganadorSalida === 'A' ? nombreB : nombreA;

      const partida = await container.crearMatch.execute({
        jugadorA: jugador1Nombre,
        jugadorB: jugador2Nombre,
        ganadorSalida: 'A',
        bolaPlayerA: 'BLANCA',
        bolaPlayerB: 'AMARILLA',
        distanciaObjetivoA: objetivoA,
        distanciaObjetivoB: objetivoB,
      });
      router.replace({ pathname: '/match/live', params: { id: partida.id } });
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('newMatch.errorCreate'));
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
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <IconArrowLeft size={20} color={palette.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTag}>{t('newMatch.heroTag')}</Text>
        <Text style={styles.title}>{t('newMatch.title')}</Text>
        <Text style={styles.subtitle}>{t('newMatch.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('newMatch.section.players')}</Text>
        {isAuthenticated && user ? (
          <TouchableOpacity
            style={[styles.meButton, { borderColor: palette.primary, backgroundColor: `${palette.primary}18` }]}
            onPress={() => setPlayerA(user.alias)}>
            <Text style={[styles.meButtonText, { color: palette.primary }]}>{t('newMatch.mePlaying', { alias: user.alias })}</Text>
          </TouchableOpacity>
        ) : null}
        <TextInput
          value={jugadorA}
          onChangeText={setPlayerA}
          style={styles.input}
          placeholder={t('newMatch.playerAPlaceholder')}
          placeholderTextColor={palette.muted}
        />
        <TextInput
          value={jugadorB}
          onChangeText={setPlayerB}
          style={styles.input}
          placeholder={t('newMatch.playerBPlaceholder')}
          placeholderTextColor={palette.muted}
        />

        <View style={styles.arrimeCard}>
          <Text style={styles.arrimeTitle}>{t('newMatch.arrime.title')}</Text>
          <Text style={styles.helper}>{t('newMatch.arrime.subtitle')}</Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: palette.border, backgroundColor: palette.background },
                ganadorSalida === 'A' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
              ]}
              onPress={() => setGanadorSalida('A')}>
              <Text style={[styles.modeText, { color: ganadorSalida === 'A' ? palette.primary : palette.text }]}>
                {jugadorA || t('newMatch.playerADefault')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: palette.border, backgroundColor: palette.background },
                ganadorSalida === 'B' && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
              ]}
              onPress={() => setGanadorSalida('B')}>
              <Text style={[styles.modeText, { color: ganadorSalida === 'B' ? palette.primary : palette.text }]}>
                {jugadorB || t('newMatch.playerBDefault')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helper}>
            {t('newMatch.arrime.player1', {
              name: ganadorSalida === 'A' ? jugadorA || t('newMatch.playerADefault') : jugadorB || t('newMatch.playerBDefault'),
            })}
          </Text>
          <Text style={styles.helper}>
            {t('newMatch.arrime.player2', {
              name: ganadorSalida === 'A' ? jugadorB || t('newMatch.playerBDefault') : jugadorA || t('newMatch.playerADefault'),
            })}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('newMatch.section.target')}</Text>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              { borderColor: palette.border, backgroundColor: palette.background },
              !modoHandicap && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setModoHandicap(false)}>
            <Text style={[styles.modeText, { color: !modoHandicap ? palette.primary : palette.text }]}>{t('newMatch.mode.manos')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              { borderColor: palette.border, backgroundColor: palette.background },
              modoHandicap && { borderColor: palette.primary, backgroundColor: `${palette.primary}22` },
            ]}
            onPress={() => setModoHandicap(true)}>
            <Text style={[styles.modeText, { color: modoHandicap ? palette.primary : palette.text }]}>{t('newMatch.mode.handicap')}</Text>
          </TouchableOpacity>
        </View>

        {modoHandicap ? (
          <View style={styles.handicapRow}>
            <View style={styles.handicapItem}>
              <Text style={styles.helper}>{t('newMatch.target.playerA')}</Text>
              <TextInput
                value={distanciaA}
                onChangeText={setDistanceA}
                style={styles.input}
                placeholder="15"
                placeholderTextColor={palette.muted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.handicapItem}>
              <Text style={styles.helper}>{t('newMatch.target.playerB')}</Text>
              <TextInput
                value={distanciaB}
                onChangeText={setDistanceB}
                style={styles.input}
                placeholder="20"
                placeholderTextColor={palette.muted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        ) : (
          <View style={styles.handicapItem}>
            <Text style={styles.helper}>{t('newMatch.target.shared')}</Text>
            <TextInput
              value={distanciaManos}
              onChangeText={setDistanceManos}
              style={styles.input}
              placeholder="20"
              placeholderTextColor={palette.muted}
              keyboardType="number-pad"
            />
            <Text style={styles.helper}>{t('newMatch.target.defaultHint')}</Text>
          </View>
        )}

        <Text style={styles.helper}>{t('newMatch.target.rangeHint')}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={onCrear}>
        <Text style={styles.buttonText}>{t('newMatch.start')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (palette: ReturnType<typeof getPalette>) =>
  StyleSheet.create({
    container: {
      minHeight: '100%',
      backgroundColor: palette.background,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
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
    hero: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: theme.spacing.md,
      gap: 6,
    },
    heroTag: {
      alignSelf: 'flex-start',
      backgroundColor: `${palette.primary}22`,
      color: palette.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.text,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 13,
    },
    card: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: palette.text,
      fontWeight: '800',
      fontSize: 16,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    arrimeCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: theme.radius.md,
      padding: 10,
      gap: 8,
      backgroundColor: palette.background,
    },
    arrimeTitle: {
      color: palette.text,
      fontWeight: '800',
      fontSize: 13,
      textTransform: 'uppercase',
    },
    meButton: {
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
    },
    meButtonText: {
      fontWeight: '800',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    modeButton: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeText: {
      fontWeight: '700',
      fontSize: 12,
    },
    handicapRow: {
      flexDirection: 'row',
      gap: 10,
    },
    handicapItem: {
      flex: 1,
      gap: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.background,
      color: palette.text,
      borderRadius: theme.radius.md,
      padding: 12,
    },
    helper: {
      color: palette.muted,
      fontSize: 12,
    },
    button: {
      marginTop: 6,
      backgroundColor: palette.primary,
      borderRadius: theme.radius.lg,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
  });
