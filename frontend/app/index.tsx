import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfile } from '../src/profile';
import { colors } from '../src/theme';

const LOGO = require('../assets/brand/logo.png');

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
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 120, marginBottom: 24 },
});
