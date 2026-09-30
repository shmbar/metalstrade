import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { useAuth } from '@/store/auth';
import {
  normalizeNotificationPrefs,
  notificationPrefsPath,
  NotificationPrefs,
  allCategories,
} from '@shared/notificationPrefs';

/*
 * Notification preferences on the phone — the SAME Firestore document the web settings and
 * the web bell read ({workspace}/data/notificationPrefs/{userUid}, see
 * shared/notificationPrefs.js). Followed live, so switching a category off on the web turns
 * it off here within a second, and the other way round.
 *
 * Kept in a small store as well as React state because the push handler runs outside React
 * and must decide synchronously whether to show an arriving push.
 */
interface PrefsState {
  prefs: NotificationPrefs;
  loaded: boolean;
  set: (prefs: NotificationPrefs) => void;
}

export const useNotificationPrefsStore = create<PrefsState>((set) => ({
  prefs: normalizeNotificationPrefs(null),
  loaded: false,
  set: (prefs) => set({ prefs, loaded: true }),
}));

/** Current preferences, for code outside React (the push handler). */
export const currentNotificationPrefs = () => useNotificationPrefsStore.getState().prefs;

/** Follow this person's preference document while signed in. Mounted once, in the app layout. */
export function useFollowNotificationPrefs() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const userUid = useAuth((s) => s.user?.uid || '');
  useEffect(() => {
    if (!uidCollection || !userUid) {
      useNotificationPrefsStore.getState().set(normalizeNotificationPrefs(null));
      return;
    }
    const [a, b, c, d] = notificationPrefsPath(uidCollection, userUid);
    return onSnapshot(
      doc(db, a, b, c, d),
      (snap) => useNotificationPrefsStore.getState().set(normalizeNotificationPrefs(snap.exists() ? snap.data() : null)),
      () => {} // offline / permission: keep the last known choices
    );
  }, [uidCollection, userUid]);
}

/** Preferences plus a setter, for the settings screen and the feed. */
export function useNotificationPrefs() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const user = useAuth((s) => s.user);
  const prefs = useNotificationPrefsStore((s) => s.prefs);
  const loaded = useNotificationPrefsStore((s) => s.loaded);
  const [saving, setSaving] = useState<string | null>(null);

  /* One write path for every switch. The change shows at once and the live snapshot confirms
     it; a failed write puts the previous choices back, so the screen never shows a setting
     that was not saved (it used to keep the flipped switch). */
  const write = useCallback(
    async (categories: Record<string, boolean>, savingKey: string) => {
      if (!uidCollection || !user?.uid) return false;
      const before = useNotificationPrefsStore.getState().prefs.categories;
      useNotificationPrefsStore.getState().set({ categories });
      setSaving(savingKey);
      try {
        const [a, b, c, d] = notificationPrefsPath(uidCollection, user.uid);
        await setDoc(
          doc(db, a, b, c, d),
          { categories, userUid: user.uid, userEmail: user.email || '', updatedAt: new Date().toISOString(), updatedFrom: 'mobile' },
          { merge: true }
        );
        return true;
      } catch {
        useNotificationPrefsStore.getState().set({ categories: before });
        return false;
      } finally {
        setSaving(null);
      }
    },
    [uidCollection, user]
  );

  const setCategoryEnabled = useCallback(
    (key: string, on: boolean) => write({ ...useNotificationPrefsStore.getState().prefs.categories, [key]: on }, key),
    [write]
  );
  /** The "All notifications" switch — every category at once (@shared/notificationPrefs). */
  const setAllEnabled = useCallback((on: boolean) => write(allCategories(on), '*'), [write]);

  return useMemo(() => ({ prefs, loaded, saving, setCategoryEnabled, setAllEnabled }), [prefs, loaded, saving, setCategoryEnabled, setAllEnabled]);
}
