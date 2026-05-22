import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { getToken } from '../src/api';
import { colors, fonts } from '../src/theme';

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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '(undefined)';

export default function Index() {
  const { user, bootLogs } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([
    `BACKEND_URL: ${BACKEND_URL}`,
    `Mounted at ${new Date().toLocaleTimeString()}`,
  ]);

  const addLog = (msg: string) => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log('SPLASH', line);
    setLogs((prev) => [...prev, line]);
  };

  useEffect(() => {
    addLog(`useEffect run — user is: ${user === undefined ? 'undefined' : user === null ? 'null' : 'object'}`);

    (async () => {
      try {
        if (hasSessionIdInHash()) {
          addLog('Hash has session_id, checking token...');
          const existing = await getToken();
          addLog(`getToken() returned: ${existing ? 'token-present' : 'no-token'}`);
          if (existing) {
            clearHash();
          } else {
            addLog('Navigating to /auth-callback');
            router.replace('/auth-callback');
            return;
          }
        }

        if (user === undefined) {
          addLog('user still undefined, waiting...');
          return;
        }
        if (user) {
          addLog(`user is set (${user.email || user.user_id}), going to /(tabs)/home`);
          router.replace('/(tabs)/home');
        } else {
          addLog('user is null, going to /login');
          router.replace('/login');
        }
      } catch (e: any) {
        addLog(`ERROR in index effect: ${e?.message || String(e)}`);
      }
    })();
  }, [user, router]);

  return (
    <View style={styles.c} testID="splash-screen">
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.title}>wine D</Text>
      <Text style={styles.subtitle}>Diagnostica avvio</Text>
      <ScrollView style={styles.logBox} contentContainerStyle={{ padding: 12 }}>
        {logs.map((l, i) => (
          <Text key={`i-${i}`} style={styles.logLine}>{l}</Text>
        ))}
        {bootLogs.map((l, i) => (
          <Text key={`a-${i}`} style={styles.logLine}>{l}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 80 },
  title: { fontFamily: fonts.headingBold, fontSize: 28, color: colors.text, marginTop: 16 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  logBox: { marginTop: 12, width: '92%', maxHeight: 380, backgroundColor: '#111', borderRadius: 12 },
  logLine: { fontFamily: 'monospace', fontSize: 11, color: '#9EF09E', marginBottom: 4 },
});
