import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { colors, fonts, radius, spacing, shadows, wineTypeColors } from '../../src/theme';

const DEFAULTS = ['Rosso', 'Bianco', 'Rosato', 'Spumante', 'Dolce', 'Altro'];

export default function AddWine() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [wineType, setWineType] = useState('Rosso');
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [customModal, setCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [photoTarget, setPhotoTarget] = useState<'front' | 'back' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/wine-types');
        setCustomTypes((r.data.custom || []).map((c: any) => c.name));
      } catch {}
    })();
  }, []);

  const pickPhoto = async (src: 'camera' | 'gallery') => {
    const target = photoTarget;
    setPhotoTarget(null);
    if (!target) return;
    try {
      // Web: use a native file input to avoid SPA reload issues on mobile browsers
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (src === 'camera') input.setAttribute('capture', 'environment');
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const uri = reader.result as string;
            if (target === 'front') setFrontPhoto(uri); else setBackPhoto(uri);
          };
          reader.readAsDataURL(file);
        };
        input.click();
        return;
      }

      // Native: use expo-image-picker
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
      if (target === 'front') setFrontPhoto(uri); else setBackPhoto(uri);
    } catch (e: any) {
      Alert.alert('Errore foto', e?.message || '');
    }
  };

  const useGPS = async () => {
    setGpsLoading(true);
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) { Alert.alert('Permesso posizione negato'); return; }
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const first = rev?.[0];
        if (first) {
          const parts = [first.name, first.city || first.region, first.country].filter(Boolean);
          if (parts.length) setLocation(parts.join(', '));
        }
      } catch {}
    } catch (e: any) {
      Alert.alert('GPS non disponibile', e?.message || '');
    } finally { setGpsLoading(false); }
  };

  const addCustomType = async () => {
    const n = customName.trim();
    if (!n) return;
    try {
      await api.post('/wine-types', { name: n });
      setCustomTypes(prev => Array.from(new Set([...prev, n])));
      setWineType(n);
      setCustomName('');
      setCustomModal(false);
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || '');
    }
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Nome richiesto'); return; }
    setSaving(true);
    try {
      await api.post('/wines', {
        name: name.trim(),
        wine_type: wineType,
        location_name: location,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        rating,
        notes,
        front_photo: frontPhoto || '',
        back_photo: backPhoto || '',
      });
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Salvataggio fallito');
    } finally { setSaving(false); }
  };

  const allTypes = [...DEFAULTS, ...customTypes];

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.topBar}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.h1}>Nuova Degustazione</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={s.photoRow}>
            <PhotoSlot label="Fronte" uri={frontPhoto} onPress={() => setPhotoTarget('front')} testID="front-photo" />
            <PhotoSlot label="Retro" uri={backPhoto} onPress={() => setPhotoTarget('back')} testID="back-photo" />
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
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Salva Degustazione</Text>}
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
          <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
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
  h1: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.text },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.lg },
  photo: { flex: 1, aspectRatio: 0.75, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', position: 'relative', ...shadows.card },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.lg },
  photoLabel: { marginTop: 8, fontFamily: fonts.bodySemi, color: colors.textMuted, fontSize: 13 },
  photoTag: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(44,42,41,0.65)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  photoTagTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
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
  coordsTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  starsRow: { flexDirection: 'row', marginBottom: spacing.md },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: spacing.lg },
  saveTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, gap: 10 },
  modalTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text, marginBottom: spacing.md },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, padding: 16, borderRadius: radius.lg },
  sheetBtnTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text, marginLeft: 8 },
});
