import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { colors, fonts, radius, spacing, shadows, wineTypeColors } from '../src/theme';

type Wine = {
  wine_id: string; name: string; wine_type: string; location_name?: string;
  latitude?: number | null; longitude?: number | null; front_photo?: string;
};

export default function WineMapNative({ wines }: { wines: Wine[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Wine | null>(null);
  const center = wines[0]
    ? { latitude: wines[0].latitude!, longitude: wines[0].longitude!, latitudeDelta: 3, longitudeDelta: 3 }
    : { latitude: 41.9, longitude: 12.5, latitudeDelta: 10, longitudeDelta: 10 };

  return (
    <View style={{ flex: 1 }}>
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
              <Text style={s.name}>{selected.name}</Text>
              <Text style={s.meta}>{selected.location_name}</Text>
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
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  mapHeaderInner: { margin: spacing.md, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  mapTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text },
  mapSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  selCard: { position: 'absolute', bottom: 24, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, ...shadows.card },
  selImg: { width: 56, height: 72, borderRadius: radius.md },
  name: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
