import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as storage from '../../src/storage';
import { colors, fonts, radius, spacing, shadows, wineTypeColors } from '../../src/theme';

const DEFAULTS = ['Rosso', 'Bianco', 'Rosato', 'Spumante', 'Dolce', 'Altro'];

type PhotoTarget = 'front' | 'back' | 'glass';

export default function AddOrEditWine() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' && params.id ? params.id : null;

  const [name, setName] = useState('');
  const [wineType, setWineType] = useState('Rosso');
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [glassPhoto, setGlassPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [customModal, setCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [loadingWine, setLoadingWine] = useState(!!editingId);

  // Load custom types
  useEffect(() => {
    (async () => {
      try {
        const types = await storage.getCustomTypes();
        setCustomTypes(types);
      } catch {}
    })();
  }, []);

  // If editing, load the wine
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const w = await storage.getWine(editingId);
        if (!w) throw new Error('not found');
        setName(w.name || '');
        setWineType(w.wine_type || 'Rosso');
        setRating(w.rating || 0);
        setLocation(w.location_name || '');
        if (w.latitude != null && w.longitude != null) {
          setCoords({ lat: w.latitude, lng: w.longitude });
        }
        setNotes(w.notes || '');
        setFrontPhoto(w.front_photo || null);
        setBackPhoto(w.back_photo || null);
        setGlassPhoto(w.glass_photo || null);
      } catch {
        Alert.alert('Errore', 'Impossibile caricare il vino');
        router.back();
      } finally {
        setLoadingWine(false);
      }
    })();
  }, [editingId, router]);

  // Reset form when the screen is re-opened in "add" mode (no id)
  useEffect(() => {
    if (editingId) return;
    setName(''); setWineType('Rosso'); setRating(0); setLocation('');
    setCoords(null); setNotes(''); setFrontPhoto(null); setBackPhoto(null); setGlassPhoto(null);
    setLocationSuggestions([]);
  }, [editingId]);

  const pickPhoto = async (src: 'camera' | 'gallery') => {
    const target = photoTarget;
    setPhotoTarget(null);
    if (!target) return;

    const apply = (uri: string) => {
      if (target === 'front') setFrontPhoto(uri);
      else if (target === 'back') setBackPhoto(uri);
      else setGlassPhoto(uri);
    };

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (src === 'camera') input.setAttribute('capture', 'environment');
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => apply(reader.result as string);
          reader.readAsDataURL(file);
        };
        input.click();
        return;
      }

      let res;
      if (src === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Alert.alert('Permesso negato'); return; }
        res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true, allowsEditing: true });
      } else {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { Alert.alert('Permesso negato'); return; }
        res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      }
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      apply(uri);
    } catch (e: any) {
      Alert.alert('Errore foto', e?.message || '');
    }
  };

  const fetchLocationSuggestions = async (lat: number, lng: number) => {
    try {
      const names = await storage.getNearbyLocationNames(lat, lng, 200);
      setLocationSuggestions(names);
    } catch {}
  };

  const useGPS = async () => {
    setGpsLoading(true);
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) { Alert.alert('Permesso posizione negato'); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });
      fetchLocationSuggestions(lat, lng);
      if (!location) {
        try {
          const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          const first = rev?.[0];
          if (first) {
            const parts = [first.name, first.city || first.region, first.country].filter(Boolean);
            if (parts.length) setLocation(parts.join(', '));
          }
        } catch {}
      }
    } catch (e: any) {
      Alert.alert('GPS non disponibile', e?.message || '');
    } finally { setGpsLoading(false); }
  };

  const addCustomType = async () => {
    const n = customName.trim();
    if (!n) return;
    try {
      await storage.addCustomType(n);
      setCustomTypes(prev => Array.from(new Set([...prev, n])));
      setWineType(n);
      setCustomName('');
      setCustomModal(false);
    } catch {
      Alert.alert('Errore', 'Impossibile salvare la tipologia');
    }
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Nome richiesto'); return; }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        wine_type: wineType,
        location_name: location,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        rating,
        notes,
        front_photo: frontPhoto || '',
        back_photo: backPhoto || '',
        glass_photo: glassPhoto || '',
      };
      if (editingId) {
        await storage.updateWine(editingId, body);
        router.replace(`/wine/${editingId}`);
      } else {
        await storage.createWine(body);
        router.replace('/(tabs)/home');
      }
    } catch {
      Alert.alert('Errore', 'Salvataggio fallito');
    } finally { setSaving(false); }
  };

  const allTypes = [...DEFAULTS, ...customTypes];

  if (loadingWine) {
    return (
      <SafeAreaView style={s.c} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.topBar}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.h1}>{editingId ? 'Modifica Degustazione' : 'Nuova Degustazione'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={s.photoRow}>
            <PhotoSlot label="Fronte" uri={frontPhoto} onPress={() => setPhotoTarget('front')} testID="front-photo" />
            <PhotoSlot label="Retro" uri={backPhoto} onPress={() => setPhotoTarget('back')} testID="back-photo" />
            <PhotoSlot label="Bicchiere" uri={glassPhoto} onPress={() => setPhotoTarget('glass')} testID="glass-photo" />
          </View>

          <Text style={s.label}>Nome del Vino</Text>
          <TextInput
            testID="name-input"
            placeholder="Es. Barolo 2018"
            placeholderTextColor={colors.textMuted}
            style={s.input}
            value={name}
            onChangeText={setName}
          />

          <Text style={s.label}>Tipologia</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {allTypes.map(t => (
              <TouchableOpacity
                key={t}
                testID={`type-${t}`}
                onPress={() => setWineType(t)}
                style={[s.typeChip, wineType === t && s.typeChipActive]}
              >
                <View style={[s.dot, { backgroundColor: wineTypeColors[t] || colors.primaryLight }]} />
                <Text style={[s.typeChipTxt, wineType === t && s.typeChipTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity testID="add-custom-type" onPress={() => setCustomModal(true)} style={[s.typeChip, s.typeChipAdd]}>
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[s.typeChipTxt, { color: colors.primary }]}>Personalizzato</Text>
            </TouchableOpacity>
          </ScrollView>

          <Text style={s.label}>Luogo</Text>
          <View style={s.locationRow}>
            <TextInput
              testID="location-input"
              placeholder="Dove lo hai bevuto?"
              placeholderTextColor={colors.textMuted}
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={location}
              onChangeText={setLocation}
            />
            <TouchableOpacity testID="gps-btn" onPress={useGPS} style={s.gpsBtn} disabled={gpsLoading}>
              {gpsLoading ? <ActivityIndicator color="#fff" /> : <Ionicons name="locate" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
          {coords && (
            <Text style={s.coordsTxt} testID="coords">
              📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </Text>
          )}
          {locationSuggestions.length > 0 && (
            <View style={s.sugWrap} testID="location-suggestions">
              <Text style={s.sugLabel}>Usato in precedenza qui vicino:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {locationSuggestions.map((sug, i) => (
                  <TouchableOpacity
                    key={i}
                    testID={`sug-${i}`}
                    style={s.sugChip}
                    onPress={() => setLocation(sug)}
                  >
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={s.sugChipTxt} numberOfLines={1}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={s.label}>Valutazione</Text>
          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => (
              <TouchableOpacity key={i} testID={`star-${i}`} onPress={() => setRating(i)}>
                <Ionicons name="star" size={36} color={i <= rating ? colors.starActive : colors.starInactive} style={{ marginRight: 6 }} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Note di Degustazione</Text>
          <TextInput
            testID="notes-input"
            placeholder="Profumi, sapori, abbinamenti..."
            placeholderTextColor={colors.textMuted}
            style={[s.input, { height: 120, textAlignVertical: 'top' }]}
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity testID="save-btn" style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={s.saveTxt}>{editingId ? 'Salva Modifiche' : 'Salva Degustazione'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo source modal */}
      <Modal visible={photoTarget !== null} transparent animationType="slide" onRequestClose={() => setPhotoTarget(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPhotoTarget(null)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Scegli da Galleria o Scatta Foto</Text>
            <TouchableOpacity testID="photo-camera" style={s.sheetBtn} onPress={() => pickPhoto('camera')}>
              <Ionicons name="camera" size={20} color={colors.text} />
              <Text style={s.sheetBtnTxt}>Scatta Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="photo-gallery" style={s.sheetBtn} onPress={() => pickPhoto('gallery')}>
              <Ionicons name="images" size={20} color={colors.text} />
              <Text style={s.sheetBtnTxt}>Scegli da Galleria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sheetBtn, { justifyContent: 'center' }]} onPress={() => setPhotoTarget(null)}>
              <Text style={[s.sheetBtnTxt, { color: colors.textMuted }]}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom type modal */}
      <Modal visible={customModal} transparent animationType="fade" onRequestClose={() => setCustomModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { alignSelf: 'center', margin: spacing.lg, borderRadius: radius.xl }]}>
            <Text style={s.modalTitle}>Nuova Tipologia</Text>
            <TextInput
              testID="custom-type-input"
              placeholder="Nome tipologia"
              placeholderTextColor={colors.textMuted}
              style={s.input}
              value={customName}
              onChangeText={setCustomName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[s.sheetBtn, { flex: 1, justifyContent: 'center', backgroundColor: colors.surfaceAlt }]} onPress={() => setCustomModal(false)}>
                <Text style={s.sheetBtnTxt}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="custom-type-save" style={[s.sheetBtn, { flex: 1, justifyContent: 'center', backgroundColor: colors.primary }]} onPress={addCustomType}>
                <Text style={[s.sheetBtnTxt, { color: '#fff' }]}>Aggiungi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PhotoSlot({ label, uri, onPress, testID }: { label: string; uri: string | null; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity testID={testID} style={s.photo} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={s.photoImg} />
      ) : (
        <View style={s.photoPlaceholder}>
          <Ionicons name={label === 'Bicchiere' ? 'wine-outline' : 'camera-outline'} size={26} color={colors.textMuted} />
          <Text style={s.photoLabel}>{label}</Text>
        </View>
      )}
      <View style={s.photoTag}><Text style={s.photoTagTxt}>{label}</Text></View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text, flex: 1, textAlign: 'center' },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  photo: { flex: 1, aspectRatio: 0.75, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', position: 'relative', ...shadows.card },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.lg },
  photoLabel: { marginTop: 6, fontFamily: fonts.bodySemi, color: colors.textMuted, fontSize: 11 },
  photoTag: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(44,42,41,0.65)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  photoTagTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: spacing.sm, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, fontFamily: fonts.body, marginBottom: spacing.md },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: 8 },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text, marginLeft: 4 },
  typeChipTxtActive: { color: '#fff' },
  typeChipAdd: { borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.surface },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  gpsBtn: { width: 50, height: 50, backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  coordsTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  sugWrap: { marginBottom: spacing.md, backgroundColor: colors.surfaceAlt, padding: spacing.sm, borderRadius: radius.md },
  sugLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  sugChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, marginRight: 6, maxWidth: 220 },
  sugChipTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary, marginLeft: 4 },
  starsRow: { flexDirection: 'row', marginBottom: spacing.md },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  saveTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  modalTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text, marginBottom: spacing.md },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, padding: 16, borderRadius: radius.lg },
  sheetBtnTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text, marginLeft: 8 },
});
