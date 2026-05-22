import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/auth';
import { colors, fonts, spacing, radius, shadows } from '../src/theme';

const HEADER_IMG = require('../assets/brand/header.jpg');
const LOGO = require('../assets/brand/logo.png');

export default function Login() {
  const { user, login, register, loginWithSessionId } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace('/(tabs)/home');
  }, [user, router]);

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, name || undefined);
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Qualcosa è andato storto');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + '/auth-callback';
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        return;
      }
      // Native: open auth in web browser and catch redirect fragment
      // Use the app's custom URL scheme (defined in app.json) so the redirect
      // works on the deployed app regardless of backend URL.
      const redirectUrl = 'wined://auth-callback';
      const result = await WebBrowser.openAuthSessionAsync(
        `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`,
        redirectUrl,
      );
      if (result.type === 'success' && result.url) {
        const hash = result.url.split('#')[1] || '';
        const params = new URLSearchParams(hash);
        const sid = params.get('session_id');
        if (sid) {
          setLoading(true);
          await loginWithSessionId(sid);
        }
      }
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Login Google fallito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Image source={HEADER_IMG} style={styles.heroImg} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroText}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.subtitle}>Registra, esplora e ricorda ogni degustazione.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity
              testID="tab-login"
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Accedi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="tab-register"
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Registrati</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <TextInput
              testID="input-name"
              placeholder="Nome"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          )}
          <TextInput
            testID="input-email"
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            testID="input-password"
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error} testID="auth-error">{error}</Text>}

          <TouchableOpacity
            testID="submit-btn"
            style={styles.primaryBtn}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Accedi' : 'Crea Account'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>oppure</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            testID="google-btn"
            style={styles.googleBtn}
            onPress={googleLogin}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={styles.googleText}>Continua con Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: colors.background },
  hero: { height: 360, position: 'relative' },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(44,42,41,0.35)' },
  heroText: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg, paddingBottom: spacing.xl },
  logo: { width: 160, height: 120, marginBottom: spacing.sm },
  title: { fontFamily: fonts.headingBold, fontSize: 42, lineHeight: 46, color: '#fff' },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: '#F4EDD9', marginTop: 4 },
  card: {
    marginTop: -24,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.bodySemi, color: colors.textMuted, fontSize: 14 },
  tabTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.md, color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  googleText: { fontFamily: fonts.bodySemi, color: colors.text, fontSize: 15, marginLeft: 8 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13, marginTop: 4, marginBottom: 4 },
});
