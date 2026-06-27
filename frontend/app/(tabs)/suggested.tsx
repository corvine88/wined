import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as storage from '../../src/storage';
import type { SuggestedWine } from '../../src/storage';
import * as categories from '../../src/categories';
import { pickVibicoFile, setPendingSharePayload } from '../../src/share';
import { colors, fonts, radius, spacing, shadows } from '../../src/theme';

export default function Suggested() {
  const router = useRouter();
  const [suggested, setSuggested] = useState<SuggestedWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await storage.getSuggestedWines();
      setSuggested(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const importFile = async () => {
    setImporting(true);
    try {
      const payload = await pickVibicoFile();
      if (!payload) return;
      setPendingSharePayload(payload);
      router.push('/receive');
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'File .vibico non valido');
    } finally {
      setImporting(false);
    }
  };

  const addToCollection = async (item: SuggestedWine) => {
    setBusyId(item.wine_id);
    try {
      const { wine_id, created_at, shared_by, received_at, ...body } = item;
      await storage.createWine(body);
      await storage.deleteSuggestedWine(item.wine_id);
      load();
      router.push('/(tabs)/home');
    } catch {
      Alert.alert('Errore', 'Impossibile spostare nella collezione');
    } finally {
      setBusyId(null);
    }
  };

  const remove = (item: SuggestedWine) => {
    Alert.alert('Elimina suggerimento', `Eliminare "${item.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          setBusyId(item.wine_id);
          try { await storage.deleteSuggestedWine(item.wine_id); load(); } finally { setBusyId(null); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.kicker}>Dagli Amici</Text>
          <Text style={s.h1}>Suggeriti</Text>
        </View>
        <TouchableOpacity testID="import-btn" onPress={importFile} style={s.importBtn} disabled={importing}>
          {importing ? <ActivityIndicator color="#fff" /> : <Ionicons name="document-attach-outline" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 40 }}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={suggested}
          keyExtractor={(item) => item.wine_id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.empty} testID="empty-state">
              <Ionicons name="gift-outline" size={48} color={colors.textMuted} />
              <Text style={s.emptyTxt}>Nessun suggerimento ricevuto. Importa un file .vibico da un amico!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View testID={`suggested-card-${item.wine_id}`} style={s.card}>
              <View style={s.thumb}>
                {item.front_photo ? (
                  <Image source={{ uri: item.front_photo }} style={s.thumbImg} />
                ) : (
                  <Text style={s.thumbEmoji}>{categories.getCategoryEmoji(item.macro_category)}</Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={s.fromBadge}>
                  <Ionicons name="gift-outline" size={11} color={colors.primary} />
                  <Text style={s.fromBadgeTxt}>Da {item.shared_by}</Text>
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={s.cardMeta} numberOfLines={1}>{item.macro_category} · {item.wine_type}</Text>
                <View style={s.actions}>
                  <TouchableOpacity testID={`collect-${item.wine_id}`} style={s.actionBtn} onPress={() => addToCollection(item)} disabled={busyId === item.wine_id}>
                    <Text style={s.actionBtnTxt}>Nella collezione</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`remove-${item.wine_id}`} onPress={() => remove(item)} disabled={busyId === item.wine_id}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  kicker: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  h1: { fontFamily: fonts.headingBold, fontSize: 30, color: colors.text, marginTop: 4 },
  importBtn: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.card },
  thumb: { width: 64, height: 84, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmoji: { fontSize: 28 },
  fromBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginBottom: 4 },
  fromBadgeTxt: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.primary, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardTitle: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.text },
  cardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  actionBtn: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  actionBtnTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
  empty: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyTxt: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15, marginTop: spacing.md, textAlign: 'center' },
});
