import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// "Hide balances" — the eye-icon privacy toggle every banking app has (Revolut,
// Monzo, N26) so a headline figure can be masked on a train or in an open
// office. Persisted like the theme preference, so it stays off/on across app
// launches rather than quietly resetting the next time someone opens the app
// in public and gets surprised by a number back on screen.
interface PrivacyStore {
  hidden: boolean;
  toggle: () => void;
}

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set) => ({
      hidden: false,
      toggle: () => set((s) => ({ hidden: !s.hidden })),
    }),
    { name: 'ims-privacy', storage: createJSONStorage(() => AsyncStorage) }
  )
);

/** A dot-mask that reads as "hidden money" regardless of the real string's
    length — a fixed width, not a same-length blur, so the mask itself never
    leaks a hint about the figure's magnitude. */
export const MASKED = '••••••';

/** `hidden ? MASKED : value` — the one place every masked figure in the app
    should route through, so the mask pattern can change in one place. */
export const maskIfHidden = (hidden: boolean, value: string): string => (hidden ? MASKED : value);
