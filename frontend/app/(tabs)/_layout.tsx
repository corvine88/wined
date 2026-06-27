import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '../../src/profile';
import { colors, fonts } from '../../src/theme';
import { View, ActivityIndicator, Platform } from 'react-native';

export default function TabLayout() {
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
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

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
      <Tabs.Screen name="home" options={{ title: 'Degustazioni', tabBarIcon: ({ color, size }) => <Ionicons name="wine" size={size} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Mappa', tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} /> }} />
      <Tabs.Screen name="add" options={{ title: 'Aggiungi', tabBarIcon: ({ size }) => <Ionicons name="add-circle" size={size + 6} color={colors.primary} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profilo', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
