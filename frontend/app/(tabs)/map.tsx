import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, fonts, radius, spacing, shadows, wineTypeColors } from '../../src/theme';

type Wine = {
  wine_id: string; name: string; wine_type: string; location_name?: string;
  rating: number; latitude?: number | null; longitude?: number | null; front_photo?: string;
};

// Conditional native map (not available on web)
let MapView: any = null, Marker: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require('react-native-maps');
  MapView = m.default;
  Marker = m.Marker;
}

export default function MapScreen() {
  const router = useRouter();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Wine | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/wines');
      setWines((r.data || []).filter((w: Wine) => w.latitude != null && w.longitude != null));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const center = wines[0]
    ? { latitude: wines[0].latitude!, longitude: wines[0].longitude!, latitudeDelta: 3, longitudeDelta: 3 }
    : { latitude: 41.9, longitude: 12.5, latitudeDelta: 10, longitudeDelta: 10 };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={s.c} edges={['top']}>
        <Text style={s.h1}>La Mia Mappa dei Vini</Text>
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Text style={s.webNote}>La mappa interattiva è disponibile su dispositivo mobile. Ecco l'elenco dei luoghi:</Text>
          {wines.length === 0 && !loading && <Text style={s.empty}>Nessun luogo registrato.</Text>}
          {wines.map(w => (
            <TouchableOpacity key={w.wine_id} style={s.webCard} onPress={() => router.push(`/wine/${w.wine_id}`)}>
              <View style={[s.pin, { backgroundColor: wineTypeColors[w.wine_type] || colors.primary }]}>
                <Ionicons name="wine" size={14} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={s.cardName}>{w.name}</Text>
                <Text style={s.cardMeta}>{w.location_name || `${w.latitude?.toFixed(3)}, ${w.longitude?.toFixed(3)}`}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <MapView style={{ flex: 1 }} initialRegion={center}>
          {wines.map(w => (
            <Marker
              key={w.wine_id}
              coordinate={{ latitude: w.latitude!, longitude: w.longitude! }}
              title={w.name}
              description={w.location_name || ''}
              pinColor={wineTypeColors[w.wine_type] || colors.primary}
              onPress={() => setSelected(w)}
            />
          ))}
        </MapView>
      )}

      <SafeAreaView edges={['top']} style={s.mapHeader}>
        <View style={s.mapHeaderInner}>
          <Text style={s.mapTitle}>La Mia Mappa dei Vini</Text>
          <Text style={s.mapSub}>{wines.length} {wines.length === 1 ? 'luogo' : 'luoghi'}</Text>
        </View>
      </SafeAreaView>

      {selected && (
        <View style={s.selCard}>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push(`/wine/${selected.wine_id}`)}>
            {selected.front_photo ? (
              <Image source={{ uri: selected.front_photo }} style={s.selImg} />
            ) : (
              <View style={[s.selImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="wine" size={24} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.cardName}>{selected.name}</Text>
              <Text style={s.cardMeta}>{selected.location_name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelected(null)} style={{ paddingLeft: 8 }}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  h1: { fontFamily: fonts.headingBold, fontSize: 28, color: colors.text, padding: spacing.md, paddingTop: spacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  mapHeaderInner: { margin: spacing.md, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  mapTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text },
  mapSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  selCard: { position: 'absolute', bottom: 24, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, ...shadows.card },
  selImg: { width: 56, height: 72, borderRadius: radius.md },
  cardName: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.text },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  webNote: { fontFamily: fonts.body, color: colors.textMuted, marginBottom: spacing.md },
  empty: { fontFamily: fonts.body, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  webCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm, ...shadows.card },
});
