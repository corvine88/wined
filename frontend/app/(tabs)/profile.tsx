import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../src/profile';
import * as storage from '../../src/storage';
import * as googleDrive from '../../src/googleDrive';
import { colors, fonts, spacing, radius, shadows } from '../../src/theme';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Profile() {
  const { profile } = useProfile();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  const resetData = () => {
    Alert.alert(
      'Elimina tutti i dati',
      'Verranno eliminati il profilo e tutte le degustazioni salvate su questo dispositivo. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive', onPress: async () => {
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
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
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

        <Text style={s.sectionTitle}>Backup</Text>
        <GoogleDriveCard />
        <ComingSoonCard label="Dropbox" icon="logo-dropbox" />
        <ComingSoonCard label="OneDrive" icon="cloud-outline" />

        <TouchableOpacity testID="reset-btn" style={s.resetBtn} onPress={resetData} disabled={resetting}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={s.resetTxt}>{resetting ? 'Eliminazione...' : 'Elimina tutti i dati'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoogleDriveCard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState<'connect' | 'backup' | 'restore' | 'disconnect' | null>(null);

  const refresh = useCallback(async () => {
    const [c, last] = await Promise.all([googleDrive.isConnected(), googleDrive.getLastBackupAt()]);
    setConnected(c);
    setLastBackup(last);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleConnect = async () => {
    setBusy('connect');
    try {
      await googleDrive.connect();
      await googleDrive.backupNow();
      await refresh();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Connessione a Google Drive non riuscita');
    } finally {
      setBusy(null);
    }
  };

  const handleBackupNow = async () => {
    setBusy('backup');
    try {
      await googleDrive.backupNow();
      await refresh();
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Backup non riuscito');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Ripristina da Google Drive',
      'I dati locali (profilo e degustazioni) verranno sovrascritti con quelli del backup. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ripristina', onPress: async () => {
            setBusy('restore');
            try {
              await googleDrive.restore();
              Alert.alert('Fatto', 'Dati ripristinati da Google Drive.');
            } catch (e: any) {
              Alert.alert('Errore', e?.message || 'Ripristino non riuscito');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnetti Google Drive', 'Il backup automatico verrà interrotto. Continuare?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Disconnetti', style: 'destructive', onPress: async () => {
          setBusy('disconnect');
          try { await googleDrive.disconnect(); await refresh(); } finally { setBusy(null); }
        },
      },
    ]);
  };

  return (
    <View style={s.cloudCard}>
      <View style={s.cloudHeader}>
        <View style={s.cloudIconWrap}>
          <Ionicons name="logo-google" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cloudTitle}>Google Drive</Text>
          {connected === null ? null : connected ? (
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: '#3A9D5A' }]} />
              <Text style={s.statusTxt}>Connesso</Text>
            </View>
          ) : (
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: colors.textMuted }]} />
              <Text style={s.statusTxt}>Non connesso</Text>
            </View>
          )}
        </View>
      </View>

      {connected && (
        <Text style={s.lastBackupTxt}>
          {lastBackup ? `Ultimo backup: ${formatDateTime(lastBackup)}` : 'Nessun backup ancora eseguito'}
        </Text>
      )}

      <View style={s.cloudActions}>
        {!connected ? (
          <TouchableOpacity testID="gdrive-connect" style={s.primaryAction} onPress={handleConnect} disabled={busy !== null}>
            {busy === 'connect' ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryActionTxt}>Connetti</Text>}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity testID="gdrive-backup" style={s.secondaryAction} onPress={handleBackupNow} disabled={busy !== null}>
              {busy === 'backup' ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={s.secondaryActionTxt}>Backup ora</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="gdrive-restore" style={s.secondaryAction} onPress={handleRestore} disabled={busy !== null}>
              {busy === 'restore' ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={s.secondaryActionTxt}>Ripristina</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="gdrive-disconnect" style={s.dangerAction} onPress={handleDisconnect} disabled={busy !== null}>
              {busy === 'disconnect' ? <ActivityIndicator color={colors.danger} size="small" /> : <Text style={s.dangerActionTxt}>Disconnetti</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function ComingSoonCard({ label, icon }: { label: string; icon: any }) {
  return (
    <View style={[s.cloudCard, { opacity: 0.5 }]}>
      <View style={s.cloudHeader}>
        <View style={s.cloudIconWrap}>
          <Ionicons name={icon} size={20} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cloudTitle}>{label}</Text>
          <Text style={s.statusTxt}>Prossimamente</Text>
        </View>
      </View>
    </View>
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
  sectionTitle: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  cloudCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  cloudHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cloudIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  cloudTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  lastBackupTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  cloudActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  primaryAction: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  primaryActionTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 13 },
  secondaryAction: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill },
  secondaryActionTxt: { color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 },
  dangerAction: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  dangerActionTxt: { color: colors.danger, fontFamily: fonts.bodySemi, fontSize: 13 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: spacing.md, marginTop: spacing.lg, padding: 16, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  resetTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.danger, marginLeft: 8 },
});
