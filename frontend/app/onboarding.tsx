import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../src/profile';
import { colors, fonts, spacing, radius, shadows } from '../src/theme';

export default function Onboarding() {
  const router = useRouter();
  const { saveProfile } = useProfile();
  const [name, setName] = useState('');
  const [picture, setPicture] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => setPicture(reader.result as string);
          reader.readAsDataURL(file);
        };
        input.click();
        return;
      }
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) { Alert.alert('Permesso negato'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.6, base64: true, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setPicture(uri);
    } catch (e: any) {
      Alert.alert('Errore foto', e?.message || '');
    }
  };

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Inserisci il tuo nome'); return; }
    setSaving(true);
    try {
      await saveProfile({ name: name.trim(), picture: picture || undefined });
      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.c}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.content}>
          <Text style={s.h1}>Come ti chiami?</Text>
          <Text style={s.subtitle}>Personalizza il tuo profilo per iniziare a registrare le tue degustazioni.</Text>

          <TouchableOpacity testID="pick-avatar" style={s.avatarWrap} onPress={pickPhoto}>
            {picture ? (
              <Image source={{ uri: picture }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Ionicons name="camera" size={28} color={colors.textMuted} />
              </View>
            )}
            <Text style={s.avatarLabel}>Foto profilo (opzionale)</Text>
          </TouchableOpacity>

          <TextInput
            testID="name-input"
            placeholder="Il tuo nome"
            placeholderTextColor={colors.textMuted}
            style={s.input}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <TouchableOpacity testID="continue-btn" style={s.btn} onPress={submit} disabled={saving}>
            <Text style={s.btnTxt}>{saving ? 'Salvataggio...' : 'Continua'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  h1: { fontFamily: fonts.headingBold, fontSize: 32, color: colors.text, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  avatarLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: 14, fontSize: 16, color: colors.text, fontFamily: fonts.body, marginBottom: spacing.lg, textAlign: 'center',
    ...shadows.card,
  },
  btn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  btnTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
});
