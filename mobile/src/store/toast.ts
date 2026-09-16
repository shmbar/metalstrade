import { create } from 'zustand';
import { haptics } from '@/lib/haptics';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  title?: string;
  /** ms before auto-dismiss */
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => number;
  dismiss: (id: number) => void;
}

let seq = 0;

// Non-blocking confirmations. A "Saved" that needed an OK tap to go away was
// the single most 2020 thing left in the app: Alert.alert is for decisions
// (delete? discard?), not for telling someone the thing they just did worked.
export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => {
    const id = ++seq;
    const duration = t.duration ?? (t.tone === 'error' ? 4200 : 2600);
    // Keep the stack short — a burst of saves shows the latest two, not a column.
    set((s) => ({ items: [...s.items.slice(-1), { ...t, id, duration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

// The toast is where an outcome is announced, so it is also where the outcome is felt:
// one success pulse for every save/update/delete in the app, one error pulse for every
// failure — no screen has to remember to add it (lib/haptics).
const push = (tone: ToastTone) => (message: string, title?: string) => {
  if (tone === 'success') haptics.success();
  else if (tone === 'error') haptics.error();
  return useToastStore.getState().push({ tone, message, title });
};

export const toast = {
  success: push('success'),
  error: push('error'),
  info: push('info'),
};
