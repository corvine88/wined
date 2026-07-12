import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../src/profile';
import * as storage from '../../src/storage';
import * as googleDrive from '../../src/googleDrive';
import { setAppLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../src/i18n';
import * as levels from '../../src/levels';
import LevelBadge from '../../src/components/LevelBadge';
import AchievementModal from '../../src/components/AchievementModal';
import { colors, fonts, spacing, radius, shadows } from '../../src/theme';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  it: 'Italiano',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ja: '日本語',
  ko: '한국어',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Profile() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  const resetData = () => {
    Alert.alert(
      t('profile.resetConfirmTitle'),
      t('profile.resetConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive', onPress: async () => {
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
        <Text style={s.h1}>{t('profile.title')}</Text>

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
          <Text style={s.name}>{profile?.name || t('profile.defaultUserName')}</Text>
          <View style={s.badge}>
            <Ionicons name="phone-portrait-outline" size={12} color={colors.text} />
            <Text style={s.badgeTxt}>{t('profile.deviceOnlyBadge')}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>{t('levels.sectionTitle')}</Text>
        <LevelsSection />

        <Text style={s.sectionTitle}>{t('profile.languageSectionTitle')}</Text>
        <LanguageCard />

        <Text style={s.sectionTitle}>{t('profile.backupSectionTitle')}</Text>
        <GoogleDriveCard />
        <ComingSoonCard label={t('profile.dropbox')} icon="logo-dropbox" />
        <ComingSoonCard label={t('profile.onedrive')} icon="cloud-outline" />

        <TouchableOpacity testID="reset-btn" style={s.resetBtn} onPress={resetData} disabled={resetting}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={s.resetTxt}>{resetting ? t('profile.resetBtnBusy') : t('profile.resetBtn')}</Text>
        </TouchableOpacity>

        <View style={s.feedbackBlock}>
          <Text style={s.feedbackTxt}>{t('profile.feedbackText')}</Text>
          <TouchableOpacity
            testID="feedback-email-btn"
            onPress={() => Linking.openURL('mailto:vibico@serenabosca.it')}
          >
            <Text style={s.feedbackEmailTxt}>vibico@serenabosca.it</Text>
          </TouchableOpacity>
        </View>

        <View style={s.legalLinks}>
          <TouchableOpacity
            testID="privacy-policy-btn"
            onPress={() => Linking.openURL('https://corvine88.github.io/vibico-privacy/')}
          >
            <Text style={s.privacyLinkTxt}>{t('profile.privacyPolicy')}</Text>
          </TouchableOpacity>
          <Text style={s.legalLinksSep}>·</Text>
          <TouchableOpacity
            testID="terms-of-service-btn"
            onPress={() => Linking.openURL('https://corvine88.github.io/vibico-privacy/terms.html')}
          >
            <Text style={s.privacyLinkTxt}>{t('profile.termsOfService')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.copyright}>{t('profile.copyright')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoogleDriveCard() {
  const { t } = useTranslation();
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
      Alert.alert(t('common.error'), e?.message || t('profile.googleDrive.connectErrorDefault'));
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
      Alert.alert(t('common.error'), e?.message || t('profile.googleDrive.backupErrorDefault'));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      t('profile.googleDrive.restoreConfirmTitle'),
      t('profile.googleDrive.restoreConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.googleDrive.restore'), onPress: async () => {
            setBusy('restore');
            try {
              await googleDrive.restore();
              Alert.alert(t('profile.googleDrive.restoreDoneTitle'), t('profile.googleDrive.restoreDoneMessage'));
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message || t('profile.googleDrive.restoreErrorDefault'));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleDisconnect = () => {
    Alert.alert(t('profile.googleDrive.disconnectConfirmTitle'), t('profile.googleDrive.disconnectConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.googleDrive.disconnect'), style: 'destructive', onPress: async () => {
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
          <Text style={s.cloudTitle}>{t('profile.googleDrive.title')}</Text>
          {connected === null ? null : connected ? (
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: '#3A9D5A' }]} />
              <Text style={s.statusTxt}>{t('profile.googleDrive.connected')}</Text>
            </View>
          ) : (
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: colors.textMuted }]} />
              <Text style={s.statusTxt}>{t('profile.googleDrive.notConnected')}</Text>
            </View>
          )}
        </View>
      </View>

      {connected && (
        <Text style={s.lastBackupTxt}>
          {lastBackup ? t('profile.googleDrive.lastBackup', { date: formatDateTime(lastBackup) }) : t('profile.googleDrive.noBackupYet')}
        </Text>
      )}

      <View style={s.cloudActions}>
        {!connected ? (
          <TouchableOpacity testID="gdrive-connect" style={s.primaryAction} onPress={handleConnect} disabled={busy !== null}>
            {busy === 'connect' ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryActionTxt}>{t('profile.googleDrive.connect')}</Text>}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity testID="gdrive-backup" style={s.secondaryAction} onPress={handleBackupNow} disabled={busy !== null}>
              {busy === 'backup' ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={s.secondaryActionTxt}>{t('profile.googleDrive.backupNow')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="gdrive-restore" style={s.secondaryAction} onPress={handleRestore} disabled={busy !== null}>
              {busy === 'restore' ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={s.secondaryActionTxt}>{t('profile.googleDrive.restore')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="gdrive-disconnect" style={s.dangerAction} onPress={handleDisconnect} disabled={busy !== null}>
              {busy === 'disconnect' ? <ActivityIndicator color={colors.danger} size="small" /> : <Text style={s.dangerActionTxt}>{t('profile.googleDrive.disconnect')}</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function LevelsSection() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [unlocked, setUnlocked] = useState<number[]>([]);
  const [viewLevel, setViewLevel] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [wines, unlockedLevels] = await Promise.all([storage.getWines(), levels.getUnlockedLevels()]);
    setCount(wines.length);
    setUnlocked(unlockedLevels);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const { level, current, next } = levels.getProgressToNext(count);
  const progressPct = next ? Math.min(100, Math.round(((current - (next - 10)) / 10) * 100)) : 100;

  const onPressBadge = (badgeLevel: number) => {
    if (unlocked.includes(badgeLevel)) {
      setViewLevel(badgeLevel);
    } else {
      Alert.alert(t('levels.lockedHint', { threshold: levels.getThresholdForLevel(badgeLevel) }));
    }
  };

  return (
    <View style={s.cloudCard}>
      <View style={s.levelHeaderRow}>
        {level > 0 ? (
          <LevelBadge level={level} size={56} />
        ) : (
          <View style={s.levelHeaderIconWrap}>
            <Ionicons name="ribbon-outline" size={26} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={s.cloudTitle}>
            {level > 0 ? t(`levels.lv${level}.title`) : t('levels.noLevelYet')}
          </Text>
          {next ? (
            <Text style={s.statusTxt}>{t('levels.progressToNext', { current, next })}</Text>
          ) : (
            <Text style={s.statusTxt}>{t('levels.allUnlocked')}</Text>
          )}
        </View>
      </View>

      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={s.badgeGrid}>
        {levels.LEVEL_THRESHOLDS.map((_, idx) => {
          const badgeLevel = idx + 1;
          return (
            <TouchableOpacity key={badgeLevel} testID={`level-badge-${badgeLevel}`} onPress={() => onPressBadge(badgeLevel)}>
              <LevelBadge level={badgeLevel} size={52} locked={!unlocked.includes(badgeLevel)} />
            </TouchableOpacity>
          );
        })}
      </View>

      <AchievementModal level={viewLevel} onClose={() => setViewLevel(null)} />
    </View>
  );
}

function LanguageCard() {
  const { t } = useTranslation();
  const [pref, setPref] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const refresh = useCallback(async () => {
    setPref(await storage.getLanguagePreference());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const select = async (lang: SupportedLanguage | null) => {
    await setAppLanguage(lang);
    setPref(lang);
    setModalVisible(false);
  };

  const currentLabel = pref && LANGUAGE_LABELS[pref as SupportedLanguage]
    ? LANGUAGE_LABELS[pref as SupportedLanguage]
    : t('profile.languageAuto');

  return (
    <>
      <TouchableOpacity testID="language-btn" style={s.cloudCard} onPress={() => setModalVisible(true)}>
        <View style={s.cloudHeader}>
          <View style={s.cloudIconWrap}>
            <Ionicons name="language-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cloudTitle}>{t('profile.languageSectionTitle')}</Text>
            <Text style={s.statusTxt}>{currentLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>{t('profile.languageModalTitle')}</Text>
            <TouchableOpacity testID="lang-auto" style={s.langRow} onPress={() => select(null)}>
              <Text style={s.langRowTxt}>{t('profile.languageAuto')}</Text>
              {!pref && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity key={lang} testID={`lang-${lang}`} style={s.langRow} onPress={() => select(lang)}>
                <Text style={s.langRowTxt}>{LANGUAGE_LABELS[lang]}</Text>
                {pref === lang && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ComingSoonCard({ label, icon }: { label: string; icon: any }) {
  const { t } = useTranslation();
  return (
    <View style={[s.cloudCard, { opacity: 0.5 }]}>
      <View style={s.cloudHeader}>
        <View style={s.cloudIconWrap}>
          <Ionicons name={icon} size={20} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cloudTitle}>{label}</Text>
          <Text style={s.statusTxt}>{t('profile.comingSoon')}</Text>
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
  feedbackBlock: { alignItems: 'center', marginTop: spacing.lg },
  feedbackTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  feedbackEmailTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary, textDecorationLine: 'underline', marginTop: 4 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  legalLinksSep: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  privacyLinkTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary, textDecorationLine: 'underline' },
  copyright: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.text, marginBottom: spacing.md },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  langRowTxt: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  levelHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  levelHeaderIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, marginTop: spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, justifyContent: 'center' },
});
