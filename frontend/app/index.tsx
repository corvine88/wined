import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as storage from '../src/storage';
import { colors, fonts } from '../src/theme';

const LOGO = require('../assets/images/splash-icon.png');
const MIN_SPLASH_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [profile] = await Promise.all([
        storage.getProfile(),
        storage.getWines(), // preload in background so home.tsx finds them already cached
        delay(MIN_SPLASH_MS),
      ]);
      if (cancelled) return;
      if (profile) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding');
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  return (
    <SafeAreaView style={styles.c} edges={['bottom']} testID="splash-screen">
      <View style={styles.center}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>e tu come lo vedi il bicchiere?</Text>
        <Text style={styles.claim}>dipende da cosa c&apos;è dentro</Text>
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
      </View>
      <Text style={styles.copyright}>© 2026 Serena Bosca</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 80, paddingTop: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 160, marginBottom: 16 },
  tagline: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  claim: { fontFamily: fonts.headingBold, fontSize: 22, color: '#2F5350', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  spinner: { marginTop: 8 },
  copyright: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
});
