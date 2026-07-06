// Push-notification registration: ask permission, fetch the Expo push token and
// store it under the account namespace so the server digest (web /api/push/daily)
// can notify every device on this account. Fails silently — push is an extra,
// never a blocker.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const EAS_PROJECT_ID = '201cc15d-6ae4-4040-9fbf-30197e1db5fe';

// Show alerts when a push arrives while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
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

export async function registerPush(uidCollection: string, userEmail: string): Promise<void> {
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

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data;
    if (!token) return;

    // One doc per device token; id derived from the token so re-registration
    // is idempotent. Server reads these via collectionGroup('pushTokens').
    const id = token.replace(/[^a-zA-Z0-9]/g, '').slice(-40);
    await setDoc(
      doc(db, uidCollection, 'data', 'pushTokens', id),
      { token, uidCollection, userEmail, platform: Platform.OS, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // Simulators, denied permissions, or missing Play services — never block the app.
  }
}
