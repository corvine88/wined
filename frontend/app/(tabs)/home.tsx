import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as storage from '../../src/storage';
import type { Wine } from '../../src/storage';
import * as categories from '../../src/categories';
import type { MacroCategory } from '../../src/categories';
import { colors, fonts, radius, spacing, shadows } from '../../src/theme';

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [macroFilter, setMacroFilter] = useState<MacroCategory | null>(null);
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [subOptions, setSubOptions] = useState<string[]>([]);
  const [locFilter, setLocFilter] = useState<string | null>(null);
  const [viewBy, setViewBy] = useState<'type' | 'location'>('type');

  const fetchWines = useCallback(async () => {
    try {
      const data = await storage.getWines();
      setWines(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchWines(); }, [fetchWines]));

  useEffect(() => {
    if (!macroFilter) { setSubOptions([]); setSubFilter(null); return; }
    (async () => {
      const subs = await categories.getAllSubcategories(macroFilter);
      setSubOptions(subs);
    })();
  }, [macroFilter]);

  const locations = useMemo(() => {
    const s = new Set(wines.map(w => (w.location_name || '').trim()).filter(Boolean));
    return Array.from(s);
  }, [wines]);

  const filtered = useMemo(() => {
    return wines.filter(w => {
      if (macroFilter && w.macro_category !== macroFilter) return false;
      if (subFilter && w.wine_type !== subFilter) return false;
      if (locFilter && (w.location_name || '') !== locFilter) return false;
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [wines, macroFilter, subFilter, locFilter, search]);

  return (
    <SafeAreaView style={styles.c} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{t('home.kicker')}</Text>
          <Text style={styles.h1}>{t('home.title')}</Text>
        </View>
        <TouchableOpacity
          testID="add-fab"
          onPress={() => router.push('/(tabs)/add')}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          testID="search-input"
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.segment}>
        {(['type', 'location'] as const).map(v => (
          <TouchableOpacity
            key={v}
            testID={`segment-${v}`}
            onPress={() => { setViewBy(v); setMacroFilter(null); setSubFilter(null); setLocFilter(null); }}
            style={[styles.segBtn, viewBy === v && styles.segBtnActive]}
          >
            <Text style={[styles.segTxt, viewBy === v && styles.segTxtActive]}>
              {v === 'type' ? t('home.segmentByType') : t('home.segmentByLocation')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewBy === 'type' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
            <TouchableOpacity
              testID="chip-macro-all"
              style={[styles.chip, !macroFilter && styles.chipActive]}
              onPress={() => setMacroFilter(null)}
            >
              <Text style={[styles.chipTxt, !macroFilter && styles.chipTxtActive]}>{t('home.filterAll')}</Text>
            </TouchableOpacity>
            {categories.MACRO_CATEGORIES.map(m => (
              <TouchableOpacity
                key={m}
                testID={`chip-macro-${m}`}
                style={[styles.chip, macroFilter === m && styles.chipActive]}
                onPress={() => setMacroFilter(m)}
              >
                <Image source={categories.CATEGORIES[m].icon} style={styles.chipIcon} resizeMode="contain" />
                <Text style={[styles.chipTxt, macroFilter === m && styles.chipTxtActive]}>{t(`categories.macro.${m}`)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {macroFilter && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
              <TouchableOpacity
                testID="chip-sub-all"
                style={[styles.chip, !subFilter && styles.chipActive]}
                onPress={() => setSubFilter(null)}
              >
                <Text style={[styles.chipTxt, !subFilter && styles.chipTxtActive]}>{t('home.filterAllFem')}</Text>
              </TouchableOpacity>
              {subOptions.map(c => (
                <TouchableOpacity
                  key={c}
                  testID={`chip-sub-${c}`}
                  style={[styles.chip, subFilter === c && styles.chipActive]}
                  onPress={() => setSubFilter(c)}
                >
                  <Text style={[styles.chipTxt, subFilter === c && styles.chipTxtActive]}>{t(`categories.sub.${c}`, { defaultValue: c })}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
          <TouchableOpacity
            testID="chip-loc-all"
            style={[styles.chip, !locFilter && styles.chipActive]}
            onPress={() => setLocFilter(null)}
          >
            <Text style={[styles.chipTxt, !locFilter && styles.chipTxtActive]}>{t('home.filterAll')}</Text>
          </TouchableOpacity>
          {locations.map(c => (
            <TouchableOpacity
              key={c}
              testID={`chip-loc-${c}`}
              style={[styles.chip, locFilter === c && styles.chipActive]}
              onPress={() => setLocFilter(c)}
            >
              <Text style={[styles.chipTxt, locFilter === c && styles.chipTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ padding: 40 }}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.wine_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWines(); }} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty} testID="empty-state">
              <Ionicons name="wine-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTxt}>{t('home.emptyState')}</Text>
            </View>
          }
          renderItem={({ item }) => <WineCard wine={item} onPress={() => router.push(`/wine/${item.wine_id}`)} />}
        />
      )}
    </SafeAreaView>
  );
}

function WineCard({ wine, onPress }: { wine: Wine; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity testID={`wine-card-${wine.wine_id}`} style={styles.card} onPress={onPress}>
      <View style={styles.thumb}>
        {wine.front_photo ? (
          <Image source={{ uri: wine.front_photo }} style={styles.thumbImg} />
        ) : (
          <Image source={categories.getCategoryIcon(wine.macro_category)} style={styles.thumbIcon} resizeMode="contain" />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <View style={styles.typeBadge}>
          <View style={[styles.dot, { backgroundColor: categories.getCategoryColor(wine.macro_category) }]} />
          <Text style={styles.typeBadgeTxt}>{t(`categories.sub.${wine.wine_type}`, { defaultValue: wine.wine_type })}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{wine.name}</Text>
        {wine.location_name ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.cardMeta} numberOfLines={1}>{wine.location_name}</Text>
          </View>
        ) : null}
        <View style={styles.stars}>
          {[1,2,3,4,5].map(i => (
            <Ionicons key={i} name="star" size={13} color={i <= wine.rating ? colors.starActive : colors.starInactive} />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  kicker: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  h1: { fontFamily: fonts.headingBold, fontSize: 30, color: colors.text, marginTop: 4 },
  addBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: radius.pill, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  search: { flex: 1, fontFamily: fonts.body, padding: 12, color: colors.text },
  segment: { flexDirection: 'row', marginHorizontal: spacing.md, marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.pill },
  segBtnActive: { backgroundColor: colors.surface, ...shadows.card },
  segTxt: { fontFamily: fonts.bodySemi, color: colors.textMuted, fontSize: 13 },
  segTxtActive: { color: colors.primary },
  chipsRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8, alignItems: 'center' },
  chipsScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  chipTxtActive: { color: '#fff' },
  chipIcon: { width: 16, height: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.card },
  thumb: { width: 72, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbIcon: { width: 36, height: 36 },
  cardTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text, marginTop: 2 },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stars: { flexDirection: 'row', marginTop: 6, gap: 2 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  typeBadgeTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.8 },
  empty: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyTxt: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, marginTop: spacing.md, textAlign: 'center' },
});
