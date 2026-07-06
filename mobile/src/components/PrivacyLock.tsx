import { useEffect, useRef, useState } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { isBiometricEnabled } from '@/lib/secureStore';
import { isBiometricAvailable, authenticateBiometric } from '@/lib/biometric';

const RELOCK_AFTER_MS = 45_000; // background longer than this → require unlock

// Finance-app privacy screen: covers content the moment the app leaves the
// foreground (so the iOS/Android app switcher shows no figures) and requires
// Face ID / fingerprint to resume after a longer absence — only when the user
// has biometric sign-in enabled.
export function PrivacyLock() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [covered, setCovered] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const leftAt = useRef<number | null>(null);
  const enabled = useRef(false);

  useEffect(() => {
    (async () => {
      enabled.current = (await isBiometricAvailable()) && (await isBiometricEnabled());
    })();
  }, [user]);

  const unlock = async () => {
    const ok = await authenticateBiometric('Unlock IMS');
    if (ok) {
      setNeedsAuth(false);
      setCovered(false);
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (!user || !enabled.current) return;
      if (next === 'background' || next === 'inactive') {
        leftAt.current = leftAt.current ?? Date.now();
        setCovered(true);
      } else if (next === 'active') {
        const away = leftAt.current ? Date.now() - leftAt.current : 0;
        leftAt.current = null;
        if (away > RELOCK_AFTER_MS) {
          setNeedsAuth(true);
          unlock(); // prompt immediately; the cover stays until it succeeds
        } else {
          setCovered(false);
        }
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!covered) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 32,
      }}
    >
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="cube" size={34} color="#fff" />
      </View>
      <Text variant="h2">IMS</Text>
      {needsAuth && (
        <>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Unlock to continue
          </Text>
          <Button title="Unlock" fullWidth={false} leftIcon={<Ionicons name="finger-print" size={18} color={colors.primaryText} />} onPress={unlock} />
        </>
      )}
    </View>
  );
}
