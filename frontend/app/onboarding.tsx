import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../src/profile';
import * as storage from '../src/storage';
import * as googleDrive from '../src/googleDrive';
import { colors, fonts, spacing, radius, shadows } from '../src/theme';

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const { saveProfile } = useProfile();
  const [name, setName] = useState('');
  const [picture, setPicture] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

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
      if (!p.granted) { Alert.alert(t('onboarding.alertPermissionDenied')); return; }
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.6, base64: true, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setPicture(uri);
    } catch (e: any) {
      Alert.alert(t('onboarding.alertPhotoErrorTitle'), e?.message || '');
    }
  };

  const submit = async () => {
    if (!name.trim()) { Alert.alert(t('onboarding.alertEnterName')); return; }
    if (!ageConfirmed) return;
    setSaving(true);
    try {
      await storage.setAgeConsent();
      await saveProfile({ name: name.trim(), picture: picture || undefined });
      router.replace('/tutorial');
    } finally {
      setSaving(false);
    }
  };

  const restoreFromGoogleDrive = async () => {
    setRestoring(true);
    try {
      if (!(await googleDrive.isConnected())) {
        await googleDrive.connect();
      }
      await googleDrive.restore();
      const restoredProfile = await storage.getProfile();
      if (restoredProfile) await saveProfile(restoredProfile);
      await storage.setTutorialSeen(); // chi ripristina un backup è già un utente esperto
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('onboarding.alertRestoreErrorDefault'));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={s.c}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.content}>
          <Text style={s.h1}>{t('onboarding.title')}</Text>
          <Text style={s.subtitle}>{t('onboarding.subtitle')}</Text>

          <TouchableOpacity testID="pick-avatar" style={s.avatarWrap} onPress={pickPhoto}>
            {picture ? (
              <Image source={{ uri: picture }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Ionicons name="camera" size={28} color={colors.textMuted} />
              </View>
            )}
            <Text style={s.avatarLabel}>{t('onboarding.avatarLabel')}</Text>
          </TouchableOpacity>

          <TextInput
            testID="name-input"
            placeholder={t('onboarding.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={s.input}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <TouchableOpacity
            testID="age-consent-checkbox"
            style={s.consentRow}
            onPress={() => setAgeConfirmed((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, ageConfirmed && s.checkboxChecked]}>
              {ageConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={s.consentTxt}>{t('onboarding.ageConsent')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="continue-btn"
            style={[s.btn, !ageConfirmed && s.btnDisabled]}
            onPress={submit}
            disabled={saving || restoring || !ageConfirmed}
          >
            <Text style={s.btnTxt}>{saving ? t('onboarding.saving') : t('onboarding.continue')}</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="restore-backup-btn" style={s.restoreBtn} onPress={restoreFromGoogleDrive} disabled={saving || restoring}>
            <Ionicons name="cloud-download-outline" size={16} color={colors.primary} />
            <Text style={s.restoreBtnTxt}>{restoring ? t('onboarding.restoring') : t('onboarding.restoreBackup')}</Text>
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
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.lg },
  checkbox: {
    width: 22, height: 22, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentTxt: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.text, lineHeight: 18 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: spacing.md },
  restoreBtnTxt: { color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 14, marginLeft: 6 },
});
