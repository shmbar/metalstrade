import { useEffect, useRef, useState } from 'react';
import { View, Platform, ScrollView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextField } from '@/components/ui';
import { ImsTechLogo } from '@/components/brand/ImsTechLogo';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { spacing, radius, getShadow } from '@/theme/tokens';
import { useKeyboardHeight } from '@/lib/keyboard';
import { getBiometricCredentials, setBiometricCredentials, isBiometricEnabled } from '@/lib/secureStore';
import { isBiometricAvailable, authenticateBiometric, biometricLabel } from '@/lib/biometric';

/** How far the form card reaches down into the brand ground behind it. */
const CARD_OVERLAP = 28;

export default function SignIn() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user, signIn, error, resetPassword } = useAuth();
  const keyboard = useKeyboardHeight();
  const scrollRef = useRef<ScrollView>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [bioName, setBioName] = useState('Biometrics');

  /* Layout, measured once with the keyboard down:
     - groupH: brand block + card + footer, so the group can be centred on the screen.
       The old layout pinned everything to the top and pushed the footer to the bottom,
       leaving a ~260pt empty band between them on a modern phone.
     - brandBottom: where the brand block ends inside the group, so the gradient stops
       just under the card's top edge on every screen height.
     Positions are kept relative to the group; the centring offset is added where they
     are used, because it changes after the first measure and a child's onLayout does
     not fire again when only its parent's padding moves.
     Centring with a measured offset (not justifyContent) keeps the group still when the
     keyboard adds its padding. */
  const [groupH, setGroupH] = useState(0);
  const [brandBottom, setBrandBottom] = useState(0);
  const card = useRef({ y: 0, h: 0 });
  const frameTop = insets.top + spacing.xl;
  const frameBottom = insets.bottom + spacing.xl;
  const centreOffset = groupH ? Math.max(0, (height - frameTop - frameBottom - groupH) / 2) : 0;

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      setBioReady(available && enabled);
      if (available) setBioName(await biometricLabel());
    })();
  }, []);

  // Keyboard up: scroll just enough that the whole card — both fields and Sign in —
  // sits above it. Measured against the card, not the focused field, so the button
  // never hides under the keyboard while the password is being typed.
  useEffect(() => {
    if (keyboard <= 0) return;
    const id = setTimeout(
      () => {
        const overflow = frameTop + centreOffset + card.current.y + card.current.h + spacing.lg - (height - keyboard);
        if (overflow > 0) scrollRef.current?.scrollTo({ y: overflow, animated: true });
      },
      Platform.OS === 'ios' ? 40 : 90
    );
    return () => clearTimeout(id);
  }, [keyboard, height, frameTop, centreOffset]);

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
    if (res.ok) toast.success(res.message, 'Email sent');
    else Alert.alert('Reset password', res.message);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: frameTop + centreOffset,
          paddingBottom: frameBottom + keyboard,
          paddingHorizontal: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Brand ground — ends CARD_OVERLAP + 24 below the brand block, so the card
            always sits across its lower edge. */}
        <LinearGradient
          colors={scheme === 'dark' ? ['#4A3BB0', '#131120'] : ['#8B7CF7', '#6D5CE0', '#4A3BB0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: brandBottom ? frameTop + centreOffset + brandBottom + spacing.xl + CARD_OVERLAP : Math.round(height * 0.42),
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
          }}
        />

        <View
          // Hidden for the one frame before it has been measured and centred.
          style={{ opacity: groupH ? 1 : 0 }}
          onLayout={(e) => {
            if (keyboard === 0) setGroupH(e.nativeEvent.layout.height);
          }}
        >
          <View
            onLayout={(e) => {
              if (keyboard === 0) setBrandBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
            }}
          >
            {/* The IMS Tech wordmark on a white tile — its navy gradient is the brand,
                and would sink into the purple ground without one. */}
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#ffffff',
                borderRadius: 18,
                paddingVertical: 10,
                paddingHorizontal: 14,
                ...getShadow(scheme, 'md'),
              }}
            >
              <ImsTechLogo width={112} />
            </View>
            <Text variant="h1" color="#ffffff" style={{ marginTop: spacing.lg }}>
              Inventory & Trading Management
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.8)" style={{ marginTop: 6 }}>
              Welcome back — sign in to continue
            </Text>
          </View>

          <View
            onLayout={(e) => {
              card.current = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
            }}
            style={{
              backgroundColor: colors.card,
              borderRadius: radius['2xl'],
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.xl,
              marginTop: spacing.xl,
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
              returnKeyType="next"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => {
                if (email && password && !busy) doSignIn(email.trim(), password);
              }}
              rightElement={
                <Pressable
                  onPress={() => setShowPw((s) => !s)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color={colors.textFaint} />
                </Pressable>
              }
            />

            <Pressable onPress={onForgot} hitSlop={6} style={{ alignSelf: 'flex-end', marginTop: -6 }}>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>Forgot password?</Text>
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
              accessibilityRole="button"
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
                <Text variant="bodyMedium" color="#ffffff" style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 }}>
                  Sign in
                </Text>
              )}
            </Pressable>

            {bioReady && (
              <Pressable
                onPress={onBiometric}
                accessibilityRole="button"
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  minHeight: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <Ionicons name="finger-print" size={18} color={colors.primary} />
                <Text variant="bodyMedium" tone="primary" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                  Sign in with {bioName}
                </Text>
              </Pressable>
            )}
          </View>

          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: spacing.lg }}>
            🔒 Secure access · same account as the web CRM
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
