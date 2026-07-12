import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { readVibicoFileAtUri, setPendingSharePayload } from '../src/share';
import { colors, fonts, spacing, radius } from '../src/theme';

// Reached when Expo Router can't match the incoming URL to a known route.
// This happens for two unrelated reasons:
// 1) a genuinely broken/stale link — nothing to recover.
// 2) Android launched us via the .vibico VIEW intent, but the content:// URI
//    from the sharing app (WhatsApp, Drive, ...) got reported to us prefixed
//    with our own "wined://" scheme instead of its real "content://" scheme.
//    We try a few candidate URIs to recover the original file before giving up.
// Note: we never check the filename/extension here — each candidate is read and
// handed to parseVibicoPayload, which accepts it only if the JSON content has
// type === 'vibico_share'. WhatsApp and other apps often strip or rename the
// .vibico extension, so extension-based detection would silently fail for them.
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
  const { t } = useTranslation();
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
      console.warn('[not-found] URL non riconosciuto da Expo Router:', url);
      Alert.alert(t('notFound.urlReceivedAlertTitle'), url);
      const candidates = candidateUris(url);
      console.warn('[not-found] candidate URI da provare:', candidates);
      for (const uri of candidates) {
        try {
          const payload = await readVibicoFileAtUri(uri);
          console.warn('[not-found] lettura riuscita con candidate URI:', uri);
          if (cancelled) return;
          setPendingSharePayload(payload);
          router.replace('/receive');
          return;
        } catch (e: any) {
          console.warn('[not-found] candidate URI fallita:', uri, '-', e?.message || String(e));
        }
      }
      console.warn('[not-found] tutti i candidate URI sono falliti, mostro schermata di errore');
      if (!cancelled) setStatus('failed');
    })();

    return () => { cancelled = true; };
  }, [url, router]);

  if (status === 'checking') {
    return (
      <SafeAreaView style={s.c}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={s.txt}>{t('notFound.checking')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
      <Text style={s.title}>{t('notFound.title')}</Text>
      <Text style={s.txt}>{t('notFound.message')}</Text>
      <TouchableOpacity style={s.btn} onPress={() => router.replace('/(tabs)/suggested')}>
        <Text style={s.btnTxt}>{t('notFound.goToSuggested')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.linkBtn} onPress={() => router.replace('/(tabs)/home')}>
        <Text style={s.linkTxt}>{t('notFound.goHome')}</Text>
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
