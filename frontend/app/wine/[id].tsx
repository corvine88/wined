import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as storage from '../../src/storage';
import type { Wine } from '../../src/storage';
import { colors, fonts, spacing, radius, shadows, wineTypeColors } from '../../src/theme';

export default function WineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [wine, setWine] = useState<Wine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const w = await storage.getWine(id);
        setWine(w);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  const del = () => {
    Alert.alert('Elimina', 'Sei sicuro di voler eliminare questa degustazione?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          try { await storage.deleteWine(id); router.back(); } catch {}
        }
      },
    ]);
  };

  const edit = () => {
    router.push({ pathname: '/(tabs)/add', params: { id: String(id) } });
  };

  if (loading) {
    return (
      <SafeAreaView style={s.c}><ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} /></SafeAreaView>
    );
  }
  if (!wine) {
    return (
      <SafeAreaView style={s.c}><Text style={{ padding: 20, fontFamily: fonts.body }}>Non trovato</Text></SafeAreaView>
    );
  }

  return (
    <View style={s.c}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.heroWrap}>
          {wine.front_photo ? (
            <Image source={{ uri: wine.front_photo }} style={s.hero} />
          ) : (
            <View style={[s.hero, { alignItems: 'center', justifyContent: 'center', backgroundColor: wineTypeColors[wine.wine_type] || colors.primary }]}>
              <Ionicons name="wine" size={80} color="#fff" />
            </View>
          )}
          <View style={s.heroOverlay} />
          <SafeAreaView edges={['top']} style={s.topBar}>
            <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={s.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity testID="edit-btn" onPress={edit} style={s.iconBtn}>
                <Ionicons name="create-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity testID="delete-btn" onPress={del} style={s.iconBtn}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View style={s.contentCard}>
          <View style={s.typeBadge}>
            <View style={[s.dot, { backgroundColor: wineTypeColors[wine.wine_type] || colors.primary }]} />
            <Text style={s.typeBadgeTxt}>{wine.wine_type}</Text>
          </View>
          <Text style={s.title}>{wine.name}</Text>
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => (
              <Ionicons key={i} name="star" size={22} color={i <= wine.rating ? colors.starActive : colors.starInactive} style={{ marginRight: 4 }} />
            ))}
          </View>

          {wine.location_name ? (
            <View style={s.infoRow}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Text style={s.infoTxt}>{wine.location_name}</Text>
            </View>
          ) : null}
          {wine.latitude != null && wine.longitude != null && (
            <View style={s.infoRow}>
              <Ionicons name="navigate" size={18} color={colors.primary} />
              <Text style={s.infoTxt}>{wine.latitude.toFixed(4)}, {wine.longitude.toFixed(4)}</Text>
            </View>
          )}

          {wine.notes ? (
            <>
              <Text style={s.section}>Note</Text>
              <Text style={s.notes}>{wine.notes}</Text>
            </>
          ) : null}

          {(wine.back_photo || wine.glass_photo) && (
            <>
              <Text style={s.section}>Galleria</Text>
              <View style={s.gallery}>
                {wine.back_photo ? (
                  <View style={s.galItem}>
                    <Image source={{ uri: wine.back_photo }} style={s.galImg} />
                    <Text style={s.galLabel}>Retro</Text>
                  </View>
                ) : null}
                {wine.glass_photo ? (
                  <View style={s.galItem}>
                    <Image source={{ uri: wine.glass_photo }} style={s.galImg} />
                    <Text style={s.galLabel}>Bicchiere</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}

          <TouchableOpacity testID="edit-btn-bottom" style={s.editBtnBottom} onPress={edit}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={s.editBtnBottomTxt}>Modifica Degustazione</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  heroWrap: { height: 420, width: '100%', position: 'relative' },
  hero: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(44,42,41,0.15)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  contentCard: { backgroundColor: colors.surface, marginTop: -40, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: spacing.lg, minHeight: 300, ...shadows.card },
  typeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.sm },
  typeBadgeTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  title: { fontFamily: fonts.headingBold, fontSize: 34, color: colors.text, lineHeight: 38 },
  starsRow: { flexDirection: 'row', marginTop: spacing.sm, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoTxt: { fontFamily: fonts.body, fontSize: 15, color: colors.text, marginLeft: 8 },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  notes: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.text },
  gallery: { flexDirection: 'row', gap: 12 },
  galItem: { flex: 1 },
  galImg: { width: '100%', aspectRatio: 0.75, borderRadius: radius.lg },
  galLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6, textAlign: 'center' },
  editBtnBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.xl, padding: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary },
  editBtnBottomTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primary, marginLeft: 8 },
});
