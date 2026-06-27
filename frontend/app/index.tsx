import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { getToken } from '../src/api';
import { colors } from '../src/theme';

const LOGO = require('../assets/brand/logo.png');

function hasSessionIdInHash() {
  try {
    if (typeof window === 'undefined') return false;
    const loc = (window as any).location;
    if (!loc || typeof loc.hash !== 'string') return false;
    return loc.hash.includes('session_id=');
  } catch {
    return false;
  }
}

function clearHash() {
  try {
    if (typeof window === 'undefined') return;
    const loc = (window as any).location;
    const hist = (window as any).history;
    if (!loc || !hist?.replaceState) return;
    hist.replaceState(null, '', (loc.pathname || '') + (loc.search || ''));
  } catch {}
}

export default function Index() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        if (hasSessionIdInHash()) {
          const existing = await getToken();
          if (existing) {
            clearHash();
          } else {
            router.replace('/auth-callback');
            return;
          }
        }

        if (user === undefined) {
          return;
        }
        if (user) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/login');
        }
      } catch {}
    })();
  }, [user, router]);

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
