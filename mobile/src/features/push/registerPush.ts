// Push-notification registration: ask permission, fetch the Expo push token and
// store it under the account namespace so the server digest (web /api/push/daily)
// can notify every device on this account. Fails silently — push is an extra,
// never a blocker.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';
import { db } from '@/lib/firebase';
import { isCategoryEnabled } from '@shared/notificationPrefs';
import { currentNotificationPrefs } from './notificationPrefs';

// The Expo project this BUILD belongs to. It was hard-coded to the project the app was first
// built under; builds now come from a different project, and a push token issued for the
// wrong project is rejected when the server sends to it. Read from the build itself.
const easProjectId = (): string | undefined =>
  (Constants as any)?.expoConfig?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;

// A push that arrives while the app is open is shown — unless its category is switched off
// in this person's notification settings (the same settings the web uses).
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const category = (n?.request?.content?.data as any)?.category as string | undefined;
    const wanted = !category || isCategoryEnabled(currentNotificationPrefs(), category);
    return { shouldShowBanner: wanted, shouldShowList: wanted, shouldPlaySound: false, shouldSetBadge: false };
  },
});

// Tapping a push opens the screen it points at (e.g. unpaid invoices).
// Returns the unsubscribe so the caller can clean up.
export function listenPushTaps(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { screen?: string; filter?: string };
    if (data?.screen === '/invoices') {
      router.push(`/(app)/invoices${data.filter ? `?filter=${data.filter}` : ''}` as any);
    }
  });
  return () => sub.remove();
}

export async function registerPush(uidCollection: string, userEmail: string, userUid = ''): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const perms = await Notifications.getPermissionsAsync();
    let status = perms.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = easProjectId();
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    if (!token) return;

    // One doc per device token; id derived from the token so re-registration
    // is idempotent. Server reads these via collectionGroup('pushTokens').
    const id = token.replace(/[^a-zA-Z0-9]/g, '').slice(-40);
    await setDoc(
      doc(db, uidCollection, 'data', 'pushTokens', id),
      // userUid lets the server match this device to its owner's notification settings.
      { token, uidCollection, userEmail, userUid, platform: Platform.OS, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // Simulators, denied permissions, or missing Play services — never block the app.
  }
}
