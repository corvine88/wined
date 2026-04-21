import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api';
import { colors } from '../../src/theme';
import WineMap from '../../src/WineMap';

type Wine = {
  wine_id: string; name: string; wine_type: string; location_name?: string;
  latitude?: number | null; longitude?: number | null; front_photo?: string;
};

export default function MapScreen() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/wines');
      setWines((r.data || []).filter((w: Wine) => w.latitude != null && w.longitude != null));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={s.c}><ActivityIndicator color={colors.primary} /></View>
    );
  }
  return <WineMap wines={wines} />;
}

const s = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
