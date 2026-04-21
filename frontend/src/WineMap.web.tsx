// Web stub: react-native-maps is native-only. Main agent loads the native version via .native.tsx.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing, shadows, wineTypeColors } from '../src/theme';

type Wine = {
  wine_id: string; name: string; wine_type: string; location_name?: string;
  latitude?: number | null; longitude?: number | null;
};

export default function WineMapWeb({ wines }: { wines: Wine[] }) {
  const router = useRouter();
  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <Text style={s.h1}>La Mia Mappa dei Vini</Text>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={s.note}>La mappa interattiva è disponibile su dispositivo mobile. Ecco l&apos;elenco dei luoghi:</Text>
        {wines.length === 0 && <Text style={s.empty}>Nessun luogo registrato.</Text>}
        {wines.map(w => (
          <TouchableOpacity key={w.wine_id} style={s.card} onPress={() => router.push(`/wine/${w.wine_id}`)}>
            <View style={[s.pin, { backgroundColor: wineTypeColors[w.wine_type] || colors.primary }]}>
              <Ionicons name="wine" size={14} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={s.name}>{w.name}</Text>
              <Text style={s.meta}>{w.location_name || `${w.latitude?.toFixed(3)}, ${w.longitude?.toFixed(3)}`}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  h1: { fontFamily: fonts.headingBold, fontSize: 28, color: colors.text, padding: spacing.md },
  note: { fontFamily: fonts.body, color: colors.textMuted, marginBottom: spacing.md },
  empty: { fontFamily: fonts.body, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm, ...shadows.card },
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
