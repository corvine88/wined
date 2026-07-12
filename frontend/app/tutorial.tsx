import React, { useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as storage from '../src/storage';
import * as googleDrive from '../src/googleDrive';
import { fonts, spacing, radius } from '../src/theme';

const TEAL = '#2f5350';
const TERRACOTTA = '#a65b4b';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = { image: number; key: 'welcome' | 'record' | 'map' | 'share' | 'backup' };

const SLIDES: Slide[] = [
  { image: require('../assets/tutorial/welcome.png'), key: 'welcome' },
  { image: require('../assets/tutorial/record.png'), key: 'record' },
  { image: require('../assets/tutorial/map.png'), key: 'map' },
  { image: require('../assets/tutorial/share.png'), key: 'share' },
  { image: require('../assets/tutorial/backup.png'), key: 'backup' },
];

export default function Tutorial() {
  const { t } = useTranslation();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await storage.setTutorialSeen();
    router.replace('/(tabs)/home');
  };

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    const next = index + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setIndex(next);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(i);
  };

  const connectGoogleDrive = async () => {
    setConnecting(true);
    try {
      await googleDrive.connect();
      await googleDrive.backupNow();
      finish();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('tutorial.alertConnectErrorDefault'));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView style={s.c}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[s.slide, { width: SCREEN_WIDTH }]}>
            <Image source={slide.image} style={s.image} resizeMode="contain" />
            <Text style={s.title}>{t(`tutorial.slides.${slide.key}.title`)}</Text>
            <Text style={s.description}>{t(`tutorial.slides.${slide.key}.description`)}</Text>

            {i === SLIDES.length - 1 && (
              <TouchableOpacity testID="connect-gdrive-btn" style={s.gdriveBtn} onPress={connectGoogleDrive} disabled={connecting}>
                {connecting ? <ActivityIndicator color="#fff" /> : <Text style={s.gdriveBtnTxt}>{t('tutorial.connectGoogleDrive')}</Text>}
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>

        <TouchableOpacity testID="next-btn" style={s.nextBtn} onPress={goNext} disabled={connecting}>
          <Text style={s.nextBtnTxt}>{isLast ? t('tutorial.start') : t('tutorial.next')}</Text>
        </TouchableOpacity>

        {isLast && (
          <TouchableOpacity testID="skip-btn" onPress={finish} disabled={connecting}>
            <Text style={s.skipTxt}>{t('tutorial.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#F9F8F5' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  image: { width: 180, height: 180, marginBottom: spacing.xl },
  title: { fontFamily: fonts.headingBold, fontSize: 28, color: TEAL, textAlign: 'center', marginBottom: spacing.md },
  description: { fontFamily: fonts.body, fontSize: 15, color: '#7A7570', textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md },
  gdriveBtn: { backgroundColor: TEAL, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 28, marginTop: spacing.xl },
  gdriveBtnTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 15 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E3DEC7' },
  dotActive: { backgroundColor: TERRACOTTA, width: 22 },
  nextBtn: { backgroundColor: TERRACOTTA, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', width: '100%' },
  nextBtnTxt: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
  skipTxt: { color: '#7A7570', fontFamily: fonts.bodyMedium, fontSize: 14, marginTop: spacing.md },
});
