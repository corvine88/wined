import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, spacing, shadows } from '../src/theme';

type Wine = {
  wine_id: string; name: string; macro_category: string; wine_type: string; location_name?: string;
  latitude?: number | null; longitude?: number | null;
};

export default function WineMapWeb({ wines }: { wines: Wine[] }) {
  const { t } = useTranslation();
  const [LeafletMap, setLeafletMap] = useState<any>(null);

  useEffect(() => {
    // Dynamic import: Leaflet touches `window` at module load, so only load in browser.
    if (typeof window === 'undefined') return;
    let cancelled = false;
    import('./LeafletMap').then(mod => {
      if (!cancelled) setLeafletMap(() => mod.default);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={s.c}>
      <View style={s.mapWrap}>
        {LeafletMap ? <LeafletMap wines={wines} /> : null}
      </View>

      <SafeAreaView edges={['top']} style={s.header} pointerEvents="box-none">
        <View style={s.headerInner}>
          <Text style={s.title}>{t('map.webTitle')}</Text>
          <Text style={s.sub}>{t('map.placesCount', { count: wines.length })}</Text>
        </View>
      </SafeAreaView>

      {LeafletMap && wines.length === 0 && (
        <View style={s.empty} pointerEvents="none">
          <Text style={s.emptyTxt}>{t('map.emptyState')}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, position: 'relative' },
  mapWrap: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  headerInner: { margin: spacing.md, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  title: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center', padding: spacing.lg },
  emptyTxt: { backgroundColor: 'rgba(255,255,255,0.95)', padding: spacing.md, borderRadius: radius.lg, fontFamily: fonts.body, color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
