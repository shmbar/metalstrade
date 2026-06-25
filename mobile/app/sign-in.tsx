import { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextField, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { spacing, radius, getShadow } from '@/theme/tokens';
import { getBiometricCredentials, setBiometricCredentials, isBiometricEnabled } from '@/lib/secureStore';
import { isBiometricAvailable, authenticateBiometric, biometricLabel } from '@/lib/biometric';

export default function SignIn() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user, signIn, error, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [bioName, setBioName] = useState('Biometrics');

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      setBioReady(available && enabled);
      if (available) setBioName(await biometricLabel());
    })();
  }, []);

  if (user) return <Redirect href="/(app)" />;

  const doSignIn = async (e: string, p: string, fromBio = false) => {
    setBusy(true);
    const ok = await signIn(e, p);
    setBusy(false);
    if (ok && !fromBio) {
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      if (available && !enabled) {
        Alert.alert(`Enable ${bioName} sign-in?`, 'Sign in faster next time without typing your password.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Enable', onPress: async () => { const auth = await authenticateBiometric(`Enable ${bioName}`); if (auth) await setBiometricCredentials(e, p); } },
        ]);
      }
    }
  };

  const onBiometric = async () => {
    const ok = await authenticateBiometric(`Sign in with ${bioName}`);
    if (!ok) return;
    const creds = await getBiometricCredentials();
    if (creds) await doSignIn(creds.email, creds.password, true);
  };

  const onForgot = async () => {
    const res = await resetPassword(email);
    Alert.alert(res.ok ? 'Email sent' : 'Reset password', res.message);
  };

  const heroH = Math.min(Math.max(height * 0.42, 300), 420);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Brand hero with gradient */}
      <LinearGradient
        colors={scheme === 'dark' ? ['#0b3b73', '#0a1322'] : ['#0a6fc2', '#0366ae', '#0b3b73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: heroH,
          paddingTop: insets.top + 24,
          paddingHorizontal: spacing.xl,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
          }}
        >
          <Ionicons name="cube" size={34} color="#fff" />
        </View>
        <Text variant="display" color="#ffffff" style={{ fontSize: 34, lineHeight: 40 }}>IMS</Text>
        <Text variant="body" color="rgba(255,255,255,0.82)" style={{ marginTop: 4 }}>
          Inventory & Trading Management
        </Text>
        <Text variant="caption" color="rgba(255,255,255,0.6)" style={{ marginTop: 14 }}>
          Welcome back — sign in to continue
        </Text>
      </LinearGradient>

      {/* Floating form card overlapping the hero */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius['2xl'],
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.xl,
              marginTop: -56,
              gap: spacing.lg,
              ...getShadow(scheme, 'lg'),
            }}
          >
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              textContentType="password"
              rightElement={
                <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={8}>
                  <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color={colors.textFaint} />
                </Pressable>
              }
            />

            <Pressable onPress={onForgot} hitSlop={6} style={{ alignSelf: 'flex-end', marginTop: -6 }}>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'Poppins_500Medium' }}>Forgot password?</Text>
            </Pressable>

            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.negative + '14', borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 12 }}>
                <Ionicons name="alert-circle" size={16} color={colors.negative} />
                <Text variant="caption" tone="negative" style={{ flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            <Button title="Sign in" loading={busy} disabled={!email || !password} onPress={() => doSignIn(email.trim(), password)} />

            {bioReady && (
              <Button
                title={`Sign in with ${bioName}`}
                variant="secondary"
                leftIcon={<Ionicons name="finger-print" size={18} color={colors.primary} />}
                onPress={onBiometric}
              />
            )}
          </View>

          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: spacing.xl }}>
            🔒 Secure access · same account as the web CRM
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
