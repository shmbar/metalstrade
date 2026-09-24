import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { layout, spacing } from '@/theme/tokens';

/*
 * The privacy cover and the Face ID lock.
 *
 * Whether to cover or lock is decided in ONE place — the session rule in store/auth.ts
 * (lib/sessionPolicy decideSession). This component only draws it:
 *   - covered: the app is in the switcher or backgrounded — figures hidden;
 *   - locked:  the session is kept, but Face ID must confirm the owner before anything
 *              shows. That is what replaced being signed out after a day away.
 *
 * It used to run its own 45-second timer on app-switch events only, so an app that had
 * been fully closed and reopened skipped the lock entirely.
 */
export function PrivacyLock() {
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const covered = useAuth((s) => s.covered);
  const locked = useAuth((s) => s.locked);
  const unlock = useAuth((s) => s.unlock);
  const signOut = useAuth((s) => s.signOut);
  const prompted = useRef(false);

  // Ask for Face ID as soon as the lock appears — once; after that the button asks.
  useEffect(() => {
    if (locked && !prompted.current) {
      prompted.current = true;
      unlock();
    }
    if (!locked) prompted.current = false;
  }, [locked, unlock]);

  if (!user || (!covered && !locked)) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.xl,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={locked ? 'lock-closed' : 'cube'} size={26} color={colors.primaryText} />
      </View>
      <Text variant="h2">IMS</Text>
      {locked && (
        <>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Locked. Your session is kept — unlock to continue.
          </Text>
          <Button
            title="Unlock"
            fullWidth={false}
            leftIcon={<Ionicons name="scan-outline" size={16} color={colors.primaryText} />}
            onPress={unlock}
            style={{ minWidth: 160 }}
          />
          {/* A way out that is not Face ID: sign in with the password instead. */}
          <Button title="Use password instead" variant="ghost" fullWidth={false} onPress={signOut} style={{ minWidth: 160, minHeight: layout.controlHeight }} />
        </>
      )}
    </View>
  );
}
