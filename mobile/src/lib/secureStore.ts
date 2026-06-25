import * as SecureStore from 'expo-secure-store';

// Thin typed wrapper over expo-secure-store (Keychain / Keystore backed). Used to
// hold the opt-in biometric quick-login credentials — never written unless the
// user explicitly enables Face ID / fingerprint sign-in.
const KEY = {
  bioEnabled: 'ims.bio.enabled',
  bioEmail: 'ims.bio.email',
  bioPassword: 'ims.bio.password',
} as const;

export async function setBiometricCredentials(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(KEY.bioEmail, email, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(KEY.bioPassword, password, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(KEY.bioEnabled, '1');
}

export async function getBiometricCredentials(): Promise<{ email: string; password: string } | null> {
  const enabled = await SecureStore.getItemAsync(KEY.bioEnabled);
  if (enabled !== '1') return null;
  const email = await SecureStore.getItemAsync(KEY.bioEmail);
  const password = await SecureStore.getItemAsync(KEY.bioPassword);
  if (!email || !password) return null;
  return { email, password };
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY.bioEnabled)) === '1';
}

export async function clearBiometricCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY.bioEnabled),
    SecureStore.deleteItemAsync(KEY.bioEmail),
    SecureStore.deleteItemAsync(KEY.bioPassword),
  ]);
}
