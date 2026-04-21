import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { getToken } from '../src/api';
import { colors } from '../src/theme';

function hasSessionIdInHash() {
  if (typeof window === 'undefined') return false;
  return !!window.location.hash?.includes('session_id=');
}

function clearHash() {
  if (typeof window === 'undefined') return;
  if (window.history?.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export default function Index() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // If returning from Google OAuth redirect → process it, but only if we don't already have a valid session
      if (hasSessionIdInHash()) {
        const existing = await getToken();
        if (existing) {
          // Already logged in (e.g. iOS Safari reloaded the page with stale hash after camera).
          // Clear the hash and continue to home — don't re-process the old session_id.
          clearHash();
        } else {
          router.replace('/auth-callback');
          return;
        }
      }
      if (user === undefined) return;
      if (user) router.replace('/(tabs)/home');
      else router.replace('/login');
    })();
  }, [user, router]);

  return (
    <View style={styles.c} testID="splash-screen">
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
