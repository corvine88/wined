import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../src/profile';
import * as storage from '../../src/storage';
import { colors, fonts, spacing, radius, shadows } from '../../src/theme';

export default function Profile() {
  const { profile } = useProfile();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  const resetData = () => {
    Alert.alert(
      'Reimposta app',
      'Verranno eliminati il profilo e tutte le degustazioni salvate su questo dispositivo. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Reimposta', style: 'destructive', onPress: async () => {
            setResetting(true);
            try {
              await storage.clearAllData();
              router.replace('/onboarding');
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <Text style={s.h1}>Profilo</Text>

      <View style={s.card}>
        {profile?.picture ? (
          <Image source={{ uri: profile.picture }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontFamily: fonts.headingBold, fontSize: 28 }}>
              {(profile?.name || 'V').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={s.name}>{profile?.name || 'Utente'}</Text>
        <View style={s.badge}>
          <Ionicons name="phone-portrait-outline" size={12} color={colors.text} />
          <Text style={s.badgeTxt}>Solo su questo dispositivo</Text>
        </View>
      </View>

      <TouchableOpacity testID="reset-btn" style={s.resetBtn} onPress={resetData} disabled={resetting}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
        <Text style={s.resetTxt}>{resetting ? 'Reimpostazione...' : 'Reimposta app'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  h1: { fontFamily: fonts.headingBold, fontSize: 28, color: colors.text, padding: spacing.md, paddingTop: spacing.sm },
  card: { alignItems: 'center', backgroundColor: colors.surface, margin: spacing.md, borderRadius: radius.xl, padding: spacing.xl, ...shadows.card },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: spacing.md },
  name: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing.md },
  badgeTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text, marginLeft: 4 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: spacing.md, padding: 16, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  resetTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger, marginLeft: 8 },
});
