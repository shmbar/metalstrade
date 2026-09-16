// Haptics — the app's one vocabulary of touch feedback, and the rules for using it.
//
// Client review 2026-09-16 flagged haptics as uneven. They were: every Button buzzed
// (a delete button fired a WARNING pattern before anyone had confirmed anything), about
// ten screens buzzed on save while the other thirty did not, and chips, tabs, checkboxes
// and switches — the controls iOS itself ticks — were silent. The rules now follow
// Apple's own apps, and every call site goes through one of these five:
//
//   selection()  a value changed: tab, segmented option, filter chip, select option,
//                checkbox, switch, show/hide figures.
//   impact()     a physical threshold was crossed: pull-to-refresh fired, a swipe
//                revealed its action, a long-press opened something.
//   success()    something was saved, updated or deleted — fired by the success toast,
//                so every save in the app feels the same and none is missed.
//   error()      something failed or was refused — fired by the error toast.
//   warning()    reserved for a caution the user must read (not used on plain taps).
//
// Deliberately silent: ordinary buttons, row taps, navigation, back, opening a sheet,
// typing. A button's result (the toast) carries the feedback, so a save is one clear
// pulse rather than a tap-buzz followed by a success-buzz.
//
// Every call is fire-and-forget and safe without a haptic engine (simulators, some
// Androids). Repeats of the same kind inside a short window are dropped, so a burst of
// selection changes or two toasts landing together never becomes a rattle.
import * as Haptics from 'expo-haptics';

const WINDOW_MS = { selection: 60, impact: 250, success: 600, error: 600, warning: 600 } as const;
type Kind = keyof typeof WINDOW_MS;
const last: Record<Kind, number> = { selection: 0, impact: 0, success: 0, error: 0, warning: 0 };

const fire = (kind: Kind, run: () => Promise<void>) => {
  const now = Date.now();
  if (now - last[kind] < WINDOW_MS[kind]) return;
  last[kind] = now;
  run().catch(() => {});
};

export const haptics = {
  selection: () => fire('selection', () => Haptics.selectionAsync()),
  impact: () => fire('impact', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => fire('success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => fire('error', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => fire('warning', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
