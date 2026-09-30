import { beforeEach, describe, expect, it, vi } from 'vitest';

// The phone's biometrics, controllable per test. Everything else in the auth store is real.
const la = vi.hoisted(() => ({
  types: [] as number[],
  result: { success: true } as { success: boolean; error?: string },
  lastOptions: null as any,
}));
// Every expo-* module resolves to ONE native stub file in the root test run (vitest.config.js),
// so this extends that stub rather than replacing it — the other expo modules keep theirs.
vi.mock('expo-local-authentication', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  // AsyncStorage resolves to the same stub; the store chains .catch on its promises.
  default: {
    ...((await importOriginal<any>()).default || {}),
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    multiRemove: async () => {},
    getAllKeys: async () => [],
  },
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  supportedAuthenticationTypesAsync: async () => la.types,
  authenticateAsync: async (o: any) => {
    la.lastOptions = o;
    return la.result;
  },
}));

import { authenticateBiometric, biometricLabel } from '@/lib/biometric';
import { useAuth } from '@/store/auth';

describe('biometric naming (what every biometric control says)', () => {
  it('Face ID on a Face ID iPhone, Touch ID on a Touch ID iPhone — never "Fingerprint" on iOS', async () => {
    la.types = [2];
    expect(await biometricLabel()).toBe('Face ID');
    la.types = [1];
    expect(await biometricLabel()).toBe('Touch ID');
    la.types = [];
    expect(await biometricLabel()).toBe('Biometrics');
  });

  it("the system prompt's fallback is the phone passcode, so it says so", async () => {
    la.result = { success: true };
    await authenticateBiometric('Unlock IMS');
    expect(la.lastOptions).toMatchObject({ promptMessage: 'Unlock IMS', fallbackLabel: 'Use passcode', disableDeviceFallback: false });
  });
});

describe('Face ID lock — unlock and fallback', () => {
  beforeEach(() => useAuth.setState({ locked: true, covered: true } as any));

  it('a successful Face ID lifts the lock and the cover; the session is kept', async () => {
    la.result = { success: true };
    expect(await useAuth.getState().unlock()).toBe(true);
    expect([useAuth.getState().locked, useAuth.getState().covered]).toEqual([false, false]);
  });

  it('a failed or cancelled Face ID keeps the app locked — nothing is shown', async () => {
    la.result = { success: false, error: 'user_cancel' };
    expect(await useAuth.getState().unlock()).toBe(false);
    expect([useAuth.getState().locked, useAuth.getState().covered]).toEqual([true, true]);
  });

  it('a biometric error never unlocks either', async () => {
    const spy = vi.spyOn(la, 'result', 'get').mockImplementation(() => { throw new Error('hardware'); });
    expect(await useAuth.getState().unlock()).toBe(false);
    expect(useAuth.getState().locked).toBe(true);
    spy.mockRestore();
  });

  it('"Use password instead" (sign out) clears the lock so the password form is reachable', async () => {
    await useAuth.getState().signOut();
    expect([useAuth.getState().locked, useAuth.getState().covered]).toEqual([false, false]);
  });
});
