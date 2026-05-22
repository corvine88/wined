import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { colors, fonts, radius, spacing, shadows, wineTypeColors } from '../src/theme';

type Wine = {
  wine_id: string; name: string; wine_type: string; location_name?: string;
  latitude?: number | null; longitude?: number | null; front_photo?: string; rating?: number;
};

type Cluster = { key: string; lat: number; lng: number; wines: Wine[] };

function clusterize(wines: Wine[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const w of wines) {
    if (w.latitude == null || w.longitude == null) continue;
    const key = `${w.latitude.toFixed(4)}_${w.longitude.toFixed(4)}`;
    if (!map.has(key)) map.set(key, { key, lat: w.latitude, lng: w.longitude, wines: [] });
    map.get(key)!.wines.push(w);
  }
  return Array.from(map.values());
}

export default function WineMapNative({ wines }: { wines: Wine[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clusters = useMemo(() => clusterize(wines), [wines]);
  console.log('clusters:', clusters.length, 'wines:', wines.length);

  const initialRegion = clusters[0]
    ? { latitude: clusters[0].lat, longitude: clusters[0].lng, latitudeDelta: 3, longitudeDelta: 3 }
    : { latitude: 41.9, longitude: 12.5, latitudeDelta: 10, longitudeDelta: 10 };

  if (error) {
    return (
      <View style={s.errBox}>
        <Ionicons name="warning-outline" size={36} color={colors.danger}/>
        <Text style={s.errTxt}>Mappa non disponibile: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelected(null)}
      >
        {clusters.map(c => {
          const first = c.wines[0];
          const isCluster = c.wines.length > 1;
          const color = isCluster ? colors.primary : (wineTypeColors[first.wine_type] || colors.primary);
          return (
            <Marker
              key={c.key}
              coordinate={{ latitude: c.lat, longitude: c.lng }}
              onPress={(e) => { e.stopPropagation?.(); setSelected(c); }}
              tracksViewChanges={true}
            >
              <View style={[s.pin, { backgroundColor: color }]}>
                {isCluster
                  ? <Text style={s.pinTxt}>{c.wines.length}</Text>
                  : <Ionicons name="wine" size={14} color="#fff" />}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {!mapReady && (
        <View style={s.loading} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      <SafeAreaView edges={['top']} style={s.mapHeader} pointerEvents="box-none">
        <View style={s.mapHeaderInner}>
          <Text style={s.mapTitle}>La Mia Mappa dei Vini</Text>
          <Text style={s.mapSub}>{wines.length} {wines.length === 1 ? 'luogo' : 'luoghi'}</Text>
        </View>
      </SafeAreaView>

      {selected && (
        <View style={s.selCard}>
          <Text style={s.selHeader}>
            {selected.wines.length > 1 ? `${selected.wines.length} degustazioni qui` : 'Degustazione'}
          </Text>
          {selected.wines.slice(0, 3).map(w => (
            <TouchableOpacity
              key={w.wine_id}
              style={s.selRow}
              onPress={() => router.push(`/wine/${w.wine_id}`)}
            >
              {w.front_photo ? (
                <Image source={{ uri: w.front_photo }} style={s.selImg} />
              ) : (
                <View style={[s.selImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: wineTypeColors[w.wine_type] || colors.primary }]}>
                  <Ionicons name="wine" size={18} color="#fff" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.selName} numberOfLines={1}>{w.name}</Text>
                <Text style={s.selMeta} numberOfLines={1}>{w.wine_type}{w.location_name ? ` · ${w.location_name}` : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
          {selected.wines.length > 3 && (
            <Text style={s.selMore}>+ altri {selected.wines.length - 3}</Text>
          )}
          <TouchableOpacity style={s.selClose} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  mapHeaderInner: { margin: spacing.md, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  mapTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text },
  mapSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(249,248,245,0.6)' },
  pin: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', ...shadows.card },
  pinTxt: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
  selCard: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, ...shadows.card },
  selHeader: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  selRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  selImg: { width: 44, height: 56, borderRadius: radius.sm },
  selName: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.text },
  selMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  selMore: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  selClose: { position: 'absolute', top: 8, right: 8, padding: 4 },
  errBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: 8 },
  errTxt: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12 },
});
