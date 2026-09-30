import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

/** What this phone calls its biometrics — shown on every biometric control. A fingerprint
 *  reader is "Touch ID" on an iPhone (it used to read "Fingerprint" there). */
export async function biometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'Iris';
  return 'Biometrics';
}

/**
 * Ask for biometrics. When they fail, iOS offers the PHONE's passcode (disableDeviceFallback
 * false) — the same fallback banking apps allow — so the button says "Use passcode". It said
 * "Use password", which reads as the app password; the app-password way back in is a separate
 * button on the lock screen ("Use password instead"). Resolves false on cancel or failure.
 */
export async function authenticateBiometric(reason = 'Unlock IMS'): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Use passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return res.success;
}
