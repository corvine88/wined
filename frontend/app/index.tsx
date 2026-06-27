import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfile } from '../src/profile';
import { colors, fonts } from '../src/theme';

const LOGO = require('../assets/images/splash-icon.png');

export default function Index() {
  const { profile } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile === undefined) return;
    if (profile) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/onboarding');
    }
  }, [profile, router]);

  return (
    <View style={styles.c} testID="splash-screen">
      <View style={styles.center}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>e tu come lo vedi il bicchiere?</Text>
        <Text style={styles.claim}>dipende da cosa c&apos;è dentro</Text>
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
      </View>
      <Text style={styles.copyright}>© 2026 Serena Bosca</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingBottom: 24 },
  center: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 160, marginBottom: 16 },
  tagline: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  claim: { fontFamily: fonts.headingBold, fontSize: 22, color: '#2F5350', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  spinner: { marginTop: 8 },
  copyright: { position: 'absolute', bottom: 24, fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
});
