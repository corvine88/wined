import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth';
import { colors } from '../src/theme';

export default function Index() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Handle web auth callback fragment
    if (typeof window !== 'undefined' && window.location.hash?.includes('session_id=')) {
      router.replace('/auth-callback');
      return;
    }
    if (user === undefined) return;
    if (user) router.replace('/(tabs)/home');
    else router.replace('/login');
  }, [user, router]);

  return (
    <View style={styles.c} testID="splash-screen">
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
