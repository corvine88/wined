import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts as useCormorant, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { useFonts as useManrope, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { View, ActivityIndicator } from 'react-native';
import { ProfileProvider } from '../src/profile';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [c] = useCormorant({ CormorantGaramond_600SemiBold, CormorantGaramond_700Bold });
  const [m] = useManrope({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });

  if (!c || !m) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="tutorial" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="wine/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="receive" options={{ presentation: 'modal' }} />
        </Stack>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
