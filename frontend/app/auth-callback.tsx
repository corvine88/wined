import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { colors, fonts } from '../src/theme';

export default function AuthCallback() {
  const router = useRouter();
  const { loginWithSessionId } = useAuth();
  const processed = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      try {
        if (typeof window === 'undefined') {
          router.replace('/login');
          return;
        }
        const hash = window.location.hash || '';
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const sid = params.get('session_id');
        if (!sid) {
          router.replace('/login');
          return;
        }
        await loginWithSessionId(sid);
        // Clear hash
        if (window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        router.replace('/(tabs)/home');
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Autenticazione fallita');
        setTimeout(() => router.replace('/login'), 1500);
      }
    };
    run();
  }, [loginWithSessionId, router]);

  return (
    <View style={s.c}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={s.t}>{error || 'Accesso in corso...'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 16 },
  t: { fontFamily: fonts.body, color: colors.textMuted, marginTop: 12 },
});
