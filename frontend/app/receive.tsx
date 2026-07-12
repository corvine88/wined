import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as storage from '../src/storage';
import * as categories from '../src/categories';
import { takePendingSharePayload, type VibicoSharePayload } from '../src/share';
import { colors, fonts, spacing, radius, shadows } from '../src/theme';

export default function Receive() {
  const { t } = useTranslation();
  const router = useRouter();
  const [payload, setPayload] = useState<VibicoSharePayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = takePendingSharePayload();
    setPayload(p);
    setLoaded(true);
  }, []);

  const saveToSuggested = async () => {
    if (!payload) return;
    setBusy(true);
    try {
      await storage.saveSuggestedWine(payload.wine, payload.shared_by);
      router.replace('/(tabs)/suggested');
    } catch {
      Alert.alert(t('common.error'), t('receive.saveErrorMessage'));
    } finally {
      setBusy(false);
    }
  };

  const addToCollection = async () => {
    if (!payload) return;
    setBusy(true);
    try {
      const { wine_id, created_at, ...body } = payload.wine;
      await storage.createWine(body);
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert(t('common.error'), t('receive.addErrorMessage'));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={s.c}><ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} /></SafeAreaView>
    );
  }

  if (!payload) {
    return (
      <SafeAreaView style={s.c} edges={['top']}>
        <View style={s.topBar}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={s.empty}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
          <Text style={s.emptyTxt}>{t('receive.emptyState')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { wine, shared_by } = payload;

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.h1}>{t('receive.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={s.sharedBadge}>
          <Ionicons name="happy-outline" size={14} color={colors.primary} />
          <Text style={s.sharedBadgeTxt}>{t('receive.sharedBy', { name: shared_by })}</Text>
        </View>

        {wine.front_photo ? (
          <Image source={{ uri: wine.front_photo }} style={s.hero} />
        ) : (
          <View style={[s.hero, { alignItems: 'center', justifyContent: 'center', backgroundColor: categories.getCategoryColor(wine.macro_category) }]}>
            <Image source={categories.getCategoryIcon(wine.macro_category)} style={{ width: 64, height: 64 }} resizeMode="contain" />
          </View>
        )}

        <View style={s.typeBadge}>
          <View style={[s.dot, { backgroundColor: categories.getCategoryColor(wine.macro_category) }]} />
          <Image source={categories.getCategoryIcon(wine.macro_category)} style={s.typeBadgeIcon} resizeMode="contain" />
          <Text style={s.typeBadgeTxt}>{t(`categories.macro.${wine.macro_category}`)} · {t(`categories.sub.${wine.wine_type}`, { defaultValue: wine.wine_type })}</Text>
        </View>
        <Text style={s.title}>{wine.name}</Text>
        <View style={s.starsRow}>
          {[1,2,3,4,5].map(i => (
            <Ionicons key={i} name="star" size={20} color={i <= wine.rating ? colors.starActive : colors.starInactive} style={{ marginRight: 4 }} />
          ))}
        </View>

        {wine.location_name ? (
          <View style={s.infoRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={s.infoTxt}>{wine.location_name}</Text>
          </View>
        ) : null}

        {wine.notes ? (
          <>
            <Text style={s.section}>{t('receive.notesLabel')}</Text>
            <Text style={s.notes}>{wine.notes}</Text>
          </>
        ) : null}

        {(wine.back_photo || wine.glass_photo) && (
          <>
            <Text style={s.section}>{t('receive.galleryLabel')}</Text>
            <View style={s.gallery}>
              {wine.back_photo ? <Image source={{ uri: wine.back_photo }} style={s.galImg} /> : null}
              {wine.glass_photo ? <Image source={{ uri: wine.glass_photo }} style={s.galImg} /> : null}
            </View>
          </>
        )}

        <TouchableOpacity testID="save-suggested-btn" style={s.primaryBtn} onPress={saveToSuggested} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>{t('receive.saveToSuggestedBtn')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity testID="add-collection-btn" style={s.secondaryBtn} onPress={addToCollection} disabled={busy}>
          <Text style={s.secondaryBtnTxt}>{t('receive.addToCollectionBtn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="ignore-btn" style={s.ignoreBtn} onPress={() => router.back()} disabled={busy}>
          <Text style={s.ignoreBtnTxt}>{t('receive.ignoreBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.text, flex: 1, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: spacing.xl },
  emptyTxt: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.md },
  sharedBadgeTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary, marginLeft: 4 },
  hero: { width: '100%', aspectRatio: 0.9, borderRadius: radius.xl, marginBottom: spacing.md, ...shadows.card },
  typeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.sm },
  typeBadgeIcon: { width: 14, height: 14, marginRight: 4 },
  typeBadgeTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  title: { fontFamily: fonts.headingBold, fontSize: 30, color: colors.text, lineHeight: 34 },
  starsRow: { flexDirection: 'row', marginTop: spacing.sm, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoTxt: { fontFamily: fonts.body, fontSize: 15, color: colors.text, marginLeft: 8 },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  notes: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.text },
  gallery: { flexDirection: 'row', gap: 12 },
  galImg: { flex: 1, aspectRatio: 0.75, borderRadius: radius.lg },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.xl },
  primaryBtnTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
  secondaryBtn: { borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  secondaryBtnTxt: { color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 16 },
  ignoreBtn: { paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  ignoreBtnTxt: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 14 },
});
