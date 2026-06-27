import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as storage from '../../src/storage';
import type { Wine } from '../../src/storage';
import { colors } from '../../src/theme';
import WineMap from '../../src/WineMap';

export default function MapScreen() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await storage.getWines();
      setWines(data.filter((w) => w.latitude != null && w.longitude != null));
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
