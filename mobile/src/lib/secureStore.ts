import * as SecureStore from 'expo-secure-store';

// Thin typed wrapper over expo-secure-store (Keychain / Keystore backed). Used to
// hold the opt-in biometric quick-login credentials — never written unless the
// user explicitly enables Face ID / fingerprint sign-in.
const KEY = {
  bioEnabled: 'ims.bio.enabled',
  bioEmail: 'ims.bio.email',
  bioPassword: 'ims.bio.password',
  lockEnabled: 'ims.lock.enabled',
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

/*
 * "Lock with Face ID" is a separate choice from "Sign in with Face ID".
 *
 * Signing in with Face ID needs the password kept in the Keychain (after a real sign-out
 * there is no session left to unlock). Locking needs nothing stored at all: the session is
 * still there, Face ID only has to prove it is the owner holding the phone. Unset means
 * "follow the sign-in choice", so everyone who already turned Face ID on gets the lock
 * instead of being signed out.
 */
export async function getLockPreference(): Promise<boolean | null> {
  const v = await SecureStore.getItemAsync(KEY.lockEnabled);
  return v === '1' ? true : v === '0' ? false : null;
}

export async function setLockPreference(on: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY.lockEnabled, on ? '1' : '0');
}

/** Is the Face ID lock on for this device (explicit choice, else the sign-in choice)? */
export async function isLockEnabled(): Promise<boolean> {
  const pref = await getLockPreference();
  return pref ?? (await isBiometricEnabled());
}
