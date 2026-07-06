import { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { spacing, radius, getShadow } from '@/theme/tokens';
import { getBiometricCredentials, setBiometricCredentials, isBiometricEnabled } from '@/lib/secureStore';
import { isBiometricAvailable, authenticateBiometric, biometricLabel } from '@/lib/biometric';

export default function SignIn() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Brand hero with gradient — extra bottom padding leaves room for the
              card to overlap into empty space (not over the fields). */}
          <LinearGradient
            colors={scheme === 'dark' ? ['#0b3b73', '#0a1322'] : ['#0a6fc2', '#0366ae', '#0b3b73']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: insets.top + 36,
              paddingHorizontal: spacing.xl,
              paddingBottom: 84,
              borderBottomLeftRadius: 36,
              borderBottomRightRadius: 36,
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

          {/* Floating form card overlapping the hero's bottom padding */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: radius['2xl'],
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.xl,
              marginHorizontal: spacing.xl,
              marginTop: -48,
              gap: spacing.lg,
              ...getShadow(scheme, 'lg'),
            }}
          >
            <TextField
              label="Username or email"
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. sharonims"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              autoComplete="username"
              textContentType="username"
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
              <Text variant="caption" tone="primary" style={{ fontFamily: 'Inter_500Medium' }}>Forgot password?</Text>
            </Pressable>

            {error ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.negative + '14', borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 12 }}>
                <Ionicons name="alert-circle" size={16} color={colors.negative} />
                <Text variant="caption" tone="negative" style={{ flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            {/* Self-contained sign-in button — explicit bg/height so it always
                renders regardless of the shared Button component's theming. */}
            <Pressable
              onPress={() => { if (email && password && !busy) doSignIn(email.trim(), password); }}
              disabled={busy}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: !email || !password ? 0.5 : busy ? 0.8 : 1,
                ...getShadow(scheme, 'sm'),
              }}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text variant="bodyMedium" color="#ffffff" style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>
                  Sign in
                </Text>
              )}
            </Pressable>

            {bioReady && (
              <Pressable
                onPress={onBiometric}
                style={{
                  backgroundColor: scheme === 'dark' ? colors.surfaceAlt : '#eef0f3',
                  borderRadius: radius.md,
                  minHeight: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <Ionicons name="finger-print" size={18} color={colors.primary} />
                <Text variant="bodyMedium" tone="primary" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  Sign in with {bioName}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Spacer pushes the footer to the bottom so the screen fills fully */}
          <View style={{ flex: 1, minHeight: spacing.xl }} />

          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.xl }}>
            🔒 Secure access · same account as the web CRM
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
