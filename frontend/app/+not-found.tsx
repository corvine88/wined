import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { readVibicoFileAtUri, setPendingSharePayload } from '../src/share';
import { colors, fonts, spacing, radius } from '../src/theme';

// Reached when Expo Router can't match the incoming URL to a known route.
// This happens for two unrelated reasons:
// 1) a genuinely broken/stale link — nothing to recover.
// 2) Android launched us via the .vibico VIEW intent, but the content:// URI
//    from the sharing app (WhatsApp, Drive, ...) got reported to us prefixed
//    with our own "wined://" scheme instead of its real "content://" scheme.
//    We try a few candidate URIs to recover the original file before giving up.
function candidateUris(raw: string): string[] {
  const candidates = [raw];
  const stripped = raw.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  if (stripped && stripped !== raw) {
    candidates.push(`content://${stripped}`);
    candidates.push(`file://${stripped}`);
  }
  return candidates;
}

export default function NotFound() {
  const router = useRouter();
  const url = useURL();
  const [status, setStatus] = useState<'checking' | 'failed'>('checking');

  useEffect(() => {
    if (!url) {
      setStatus('failed');
      return;
    }

    let cancelled = false;
    (async () => {
      console.warn('[not-found] unmatched URL received:', url);
      for (const uri of candidateUris(url)) {
        try {
          const payload = await readVibicoFileAtUri(uri);
          if (cancelled) return;
          setPendingSharePayload(payload);
          router.replace('/receive');
          return;
        } catch {
          // try next candidate
        }
      }
      if (!cancelled) setStatus('failed');
    })();

    return () => { cancelled = true; };
  }, [url, router]);

  if (status === 'checking') {
    return (
      <SafeAreaView style={s.c}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={s.txt}>Apertura file in corso...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
      <Text style={s.title}>Non riesco ad aprire questo link</Text>
      <Text style={s.txt}>
        Se stavi aprendo un file .vibico condiviso da un&apos;altra app, prova a usare
        &quot;Importa file&quot; nella tab Suggeriti invece di aprirlo direttamente.
      </Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace('/(tabs)/suggested')}>
        <Text style={s.btnTxt}>Vai a Suggeriti</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.linkBtn} onPress={() => router.replace('/(tabs)/home')}>
        <Text style={s.linkTxt}>Torna alla home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: 12 },
  title: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.text, textAlign: 'center', marginTop: 8 },
  txt: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 28, marginTop: 16 },
  btnTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 15 },
  linkBtn: { paddingVertical: 10 },
  linkTxt: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
