import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { colors, fonts, spacing, radius, shadows } from '../../src/theme';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={s.c} edges={['top']}>
      <Text style={s.h1}>Profilo</Text>

      <View style={s.card}>
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontFamily: fonts.headingBold, fontSize: 28 }}>
              {(user?.name || user?.email || 'V').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={s.name}>{user?.name || 'Utente'}</Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={s.badge}>
          <Ionicons name={user?.auth_provider === 'google' ? 'logo-google' : 'mail'} size={12} color={colors.text} />
          <Text style={s.badgeTxt}>{user?.auth_provider === 'google' ? 'Google' : 'Email'}</Text>
        </View>
      </View>

      <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={s.logoutTxt}>Esci</Text>
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
  email: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing.md },
  badgeTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text, marginLeft: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: spacing.md, padding: 16, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  logoutTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger, marginLeft: 8 },
});
