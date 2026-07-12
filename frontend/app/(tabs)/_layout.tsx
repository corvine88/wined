import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../src/profile';
import { colors, fonts } from '../../src/theme';
import { View, ActivityIndicator, Platform } from 'react-native';

export default function TabLayout() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (profile === null) router.replace('/onboarding');
  }, [profile, router]);

  if (profile === undefined || profile === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const baseHeight = Platform.OS === 'ios' ? 60 : 56;
  const bottomInset = insets.bottom + 16;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: baseHeight + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <Ionicons name="wine" size={size} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: t('tabs.map'), tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} /> }} />
      <Tabs.Screen name="add" options={{ title: t('tabs.add'), tabBarIcon: ({ size }) => <View style={{ marginTop: 2, marginBottom: 4 }}><Ionicons name="add-circle" size={size + 2} color={colors.primary} /></View> }} />
      <Tabs.Screen name="suggested" options={{ title: t('tabs.suggested'), tabBarIcon: ({ color, size }) => <Ionicons name="happy-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
