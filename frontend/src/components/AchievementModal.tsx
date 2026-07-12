import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import LevelBadge from './LevelBadge';
import { colors, fonts, spacing, radius, shadows } from '../theme';

export default function AchievementModal({ level, onClose }: { level: number | null; onClose: () => void }) {
  const { t } = useTranslation();
  if (level === null) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.eyebrow}>{t('levels.unlockedBadgeLabel')}</Text>
          <View style={s.badgeWrap}>
            <LevelBadge level={level} size={132} />
          </View>
          <Text style={s.title}>{t(`levels.lv${level}.title`)}</Text>
          <Text style={s.description}>{t(`levels.lv${level}.description`)}</Text>
          <Text style={s.quote}>{t(`levels.lv${level}.quote`)}</Text>

          <View style={s.rewardBox}>
            <Text style={s.rewardLabel}>{t('levels.rewardLabel')}</Text>
            <Text style={s.rewardTxt}>{t(`levels.lv${level}.reward`)}</Text>
          </View>

          <TouchableOpacity testID="achievement-continue-btn" style={s.btn} onPress={onClose}>
            <Text style={s.btnTxt}>{t('levels.continueBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: 'center', ...shadows.card,
  },
  eyebrow: {
    fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary, textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: spacing.md,
  },
  badgeWrap: { marginBottom: spacing.md },
  title: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  description: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  quote: {
    fontFamily: fonts.heading, fontSize: 15, color: colors.text, textAlign: 'center', fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  rewardBox: {
    width: '100%', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  rewardLabel: {
    fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 4,
  },
  rewardTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: spacing.xxl, width: '100%', alignItems: 'center' },
  btnTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
});
