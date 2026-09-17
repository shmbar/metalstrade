import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Dimensions, Keyboard, KeyboardEvent, NativeScrollEvent, NativeSyntheticEvent, Platform, View } from 'react-native';

/*
 * Keyboard handling — one implementation for every screen, sheet, footer and field.
 *
 * Why the platform's KeyboardAvoidingView is not enough here:
 *  - it only shrinks its own frame, so a field lower in a scrolling form stays where it
 *    was — now under the keyboard;
 *  - on Android, Expo's edge-to-edge layout stops the window resizing, so it does nothing;
 *  - inside a sheet (a Modal) the panel kept its full height and was pushed off screen.
 *
 * Why the keyboard state lives in a module-level store and not in each component: the
 * keyboard's "will show" event fires the moment a field takes focus. A sheet whose
 * field autofocuses ("Add entry" on Cashflow) mounts, focuses, and hears that event
 * BEFORE its own useEffect has subscribed — so it never learned the keyboard was up and
 * stayed hidden behind it. One listener, attached when this module first loads and
 * seeded from Keyboard.metrics(), means no component can miss the keyboard.
 *
 * Why positions are measured, not assumed: what matters is how much of THIS view the
 * keyboard covers. A screen ends at the top of the tab bar, a sheet at the bottom of the
 * screen, and Android may or may not have resized the window already. So every consumer
 * measures its own frame against the keyboard's top edge (in screen coordinates) and
 * moves by exactly the overlap.
 */

export interface KeyboardState {
  /** Height of the keyboard on screen; 0 when hidden. */
  height: number;
  /** Top edge of the keyboard in screen coordinates; the screen height when hidden. */
  top: number;
  /** Duration of the platform's show/hide animation, ms. */
  duration: number;
}

const screenHeight = () => {
  try {
    return Dimensions.get('screen')?.height ?? 0;
  } catch {
    return 0;
  }
};

const hidden = (duration = 250): KeyboardState => ({ height: 0, top: screenHeight(), duration });

let current: KeyboardState = (() => {
  try {
    const m = (Keyboard as any)?.metrics?.();
    if (m && m.height > 0) return { height: Math.round(m.height), top: Math.round(m.screenY), duration: 0 };
  } catch {
    /* no metrics before first show */
  }
  return hidden(0);
})();

const listeners = new Set<() => void>();

const publish = (next: KeyboardState) => {
  if (next.height === current.height && next.top === current.top) return;
  current = next;
  listeners.forEach((l) => l());
};

const fromEvent = (e?: KeyboardEvent): KeyboardState => {
  const duration = e?.duration && e.duration > 0 ? e.duration : 250;
  const c = e?.endCoordinates;
  if (!c) return hidden(duration);
  const bottom = screenHeight();
  const top = typeof c.screenY === 'number' ? c.screenY : bottom - (c.height || 0);
  // iOS reports where the keyboard will END: one sliding away, or an undocked iPad
  // keyboard, ends at or below the screen's bottom edge — it covers nothing.
  const height = Platform.OS === 'ios' ? bottom - top : c.height || 0;
  if (height <= 0) return hidden(duration);
  return { height: Math.round(height), top: Math.round(top), duration };
};

/*
 * Which keyboard events move the store, and why the "did" events are the authority.
 *
 * iOS sends each change twice: "will" when the keyboard is ABOUT to move (so layout can
 * travel with it) and "did" once it has. The store used to listen to the "will" events
 * only. When focus jumps from a field on one screen to a field inside a newly opened sheet
 * — keyboard already up on Cash Flow's search, then Add Entry — iOS can announce "will hide"
 * for the old field AFTER "will show" for the new one. The keyboard never left the screen,
 * but the last word the store heard was "hidden", so every sheet, Save bar and scroll-to-field
 * in the app acted as if there were no keyboard: the form was drawn underneath it
 * (client screenshots, build 37). Nothing ever corrected it.
 *
 * Now "will" events still start the movement early, and the matching "did" event — what
 * actually happened — overrides whatever the "will" events left behind.
 */
export type KeyboardEventKind = 'willShow' | 'willHide' | 'willChangeFrame' | 'didShow' | 'didHide' | 'didChangeFrame';

export function applyKeyboardEvent(state: KeyboardState, kind: KeyboardEventKind, e?: KeyboardEvent): KeyboardState {
  const duration = e?.duration && e.duration > 0 ? e.duration : 250;
  switch (kind) {
    case 'willHide':
    case 'didHide':
      return hidden(duration);
    default:
      return fromEvent(e);
  }
}

const IOS_EVENTS: [string, KeyboardEventKind][] = [
  ['keyboardWillShow', 'willShow'],
  ['keyboardWillHide', 'willHide'],
  ['keyboardWillChangeFrame', 'willChangeFrame'],
  ['keyboardDidShow', 'didShow'],
  ['keyboardDidHide', 'didHide'],
  ['keyboardDidChangeFrame', 'didChangeFrame'],
];
// Android has no "will" events; its "did" events are the only ones.
const ANDROID_EVENTS: [string, KeyboardEventKind][] = [
  ['keyboardDidShow', 'didShow'],
  ['keyboardDidHide', 'didHide'],
];

try {
  for (const [name, kind] of Platform.OS === 'ios' ? IOS_EVENTS : ANDROID_EVENTS) {
    Keyboard?.addListener?.(name as any, (e: KeyboardEvent) => publish(applyKeyboardEvent(current, kind, e)));
  }
} catch {
  /* no native keyboard module (tests) */
}

/**
 * Re-read the keyboard from React Native's own record of the last "did" event. Called at
 * the moments the app is most likely to have been told a story out of order: a sheet has
 * finished presenting, the app has come back to the foreground.
 */
export function syncKeyboard() {
  try {
    const visible = (Keyboard as any)?.isVisible?.();
    const m = (Keyboard as any)?.metrics?.();
    if (!visible || !m || !(m.height > 0)) {
      publish(hidden(0));
      return;
    }
    publish(applyKeyboardEvent(current, 'didShow', { endCoordinates: m, duration: 0 } as any));
  } catch {
    /* no native keyboard module (tests) */
  }
}

try {
  AppState?.addEventListener?.('change', (s: string) => {
    if (s === 'active') syncKeyboard();
  });
} catch {
  /* no AppState (tests) */
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => current;
/** The keyboard right now, outside React (timers, measure callbacks). */
export const latestKeyboard = () => current;

/** The keyboard, as every component sees it at the same moment. */
export function useKeyboard(): KeyboardState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const useKeyboardHeight = () => useKeyboard().height;

/**
 * How much of a view the keyboard covers. Attach `ref` (and `onLayout`) to the view.
 *
 * `shifts`: the caller moves THIS view up by the returned overlap (a footer). Its
 * measured bottom then already includes that lift, so it is added back before
 * comparing — otherwise the footer would settle halfway, then drop, then rise again.
 */
export function useKeyboardOverlap({ shifts = false }: { shifts?: boolean } = {}) {
  const keyboard = useKeyboard();
  const ref = useRef<View>(null);
  const applied = useRef(0);
  const [overlap, setOverlap] = useState(0);

  const measure = useCallback(() => {
    if (keyboard.height <= 0) {
      applied.current = 0;
      setOverlap(0);
      return;
    }
    const node: any = ref.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      applied.current = keyboard.height;
      setOverlap(keyboard.height);
      return;
    }
    node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      if (!h) return; // not laid out yet — onLayout will measure again
      const restingBottom = y + h + (shifts ? applied.current : 0);
      const next = overlapFor(restingBottom, keyboard.top);
      applied.current = next;
      setOverlap(next);
    });
  }, [keyboard.height, keyboard.top, shifts]);

  useEffect(() => {
    measure();
  }, [measure]);

  return { ref, overlap, onLayout: measure, duration: keyboard.duration };
}

/**
 * Lift for a bar pinned to the bottom of a screen. Replaces measuring the bar WHILE it moves,
 * which fed its own animation back into the maths and, inside an iOS page sheet (where views
 * report positions relative to the sheet, not the screen), came out short — the Save bar on
 * contract and invoice edit stayed under the keyboard (build 37, 2026-09-16).
 */
export function useKeyboardLift() {
  const keyboard = useKeyboard();
  const ref = useRef<View>(null);
  const resting = useRef<number | null>(null);
  const [, bump] = useState(0);

  const measureRest = useCallback((attempt = 0) => {
    if (latestKeyboard().height > 0) return; // only the resting position is trustworthy
    const node: any = ref.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      if (!h) {
        // Not attached yet (a screen still animating in): try again shortly.
        if (attempt < 6) setTimeout(() => measureRest(attempt + 1), 80);
        return;
      }
      const bottom = Math.round(y + h);
      if (resting.current !== bottom) {
        resting.current = bottom;
        bump((n) => n + 1);
      }
    });
  }, []);

  useEffect(() => {
    if (keyboard.height <= 0) measureRest();
  }, [keyboard.height, measureRest]);

  return {
    ref,
    onLayout: () => measureRest(),
    lift: footerLift(keyboard.height, screenHeight(), resting.current),
    duration: keyboard.duration,
  };
}

export interface FieldHandle {
  /** the TextInput, to focus */
  input: { current: any };
  /** the field's outer box, to find where it sits in the form */
  box: { current: any };
}

export interface KeyboardRevealer {
  reveal: (target: any) => void;
  /** A field announces itself so Return on the field above can move to it. */
  register?: (field: FieldHandle) => () => void;
  /** Return pressed: focus the next field down the form, or close the keyboard on the last. */
  focusNext?: (field: FieldHandle) => void;
  /**
   * Present in a container that is still appearing (a sheet). A field that wants autoFocus
   * hands itself over instead, and the container focuses it once it is really on screen.
   */
  deferAutoFocus?: (field: FieldHandle) => void;
}

export const KeyboardRevealContext = createContext<KeyboardRevealer | null>(null);

/** For a focusable field: the container that can scroll it into view, if any. */
export const useKeyboardRevealer = () => useContext(KeyboardRevealContext);

/**
 * For a raw TextInput (table cells, composers): `ref` and `onFocus` that ask the
 * nearest screen or sheet to scroll the input above the keyboard. TextField does this
 * itself.
 */
export function useRevealOnFocus() {
  const revealer = useKeyboardRevealer();
  const ref = useRef<any>(null);
  const onFocus = useCallback(() => revealer?.reveal(ref.current), [revealer]);
  return { ref, onFocus };
}

/** Space kept between a revealed field and the keyboard's top edge. */
const REVEAL_MARGIN = 24;

/**
 * How far a scroll view must move so a focused field clears the keyboard.
 * Pure on purpose: every rule below is covered by __tests__/keyboard-geometry.test.ts
 * across iPhone sizes and keyboard heights, because this is the part that decides
 * whether the user can see what they are typing.
 *
 * Returns null when nothing needs to move.
 */
export function revealOffset(input: {
  /** field position inside the scrolled content */
  fieldY: number;
  fieldH: number;
  /** current scroll offset */
  offsetY: number;
  /** scroll view frame in window coordinates */
  viewTop: number;
  viewH: number;
  /** top edge of the keyboard in window coordinates */
  keyboardTop: number;
  margin?: number;
}): number | null {
  const { fieldY, fieldH, offsetY, viewTop, viewH, keyboardTop } = input;
  const margin = input.margin ?? REVEAL_MARGIN;
  // What the user can actually see: this view's frame, cut off by the keyboard.
  const visible = Math.min(viewTop + viewH, keyboardTop) - viewTop;
  if (visible <= margin * 2) return null; // nothing usable is left; moving would only jitter
  // A field taller than the space left (a long comment box) shows its TOP, where the
  // cursor is — scrolling its bottom into view would push the cursor off the screen.
  const need = Math.min(fieldH, visible - margin * 2);
  const next =
    fieldY + need + margin > offsetY + visible
      ? Math.max(0, fieldY + need + margin - visible) // under the keyboard: bring it up
      : fieldY - margin < offsetY
        ? Math.max(0, fieldY - margin) // above the fold (Prev, or a re-focus): bring it down
        : offsetY;
  // Already where it needs to be. Returning an offset here would scroll the form by a
  // pixel on every focus — the flicker that made moving between fields feel wrong.
  return Math.abs(next - offsetY) < 1 ? null : next;
}

/**
 * How far a bar pinned to the bottom of a screen (a Save bar, a composer) must rise so its
 * bottom edge sits on the keyboard's top edge.
 *
 * `restingBottom` is where the bar's bottom edge sits with the keyboard DOWN, in screen
 * coordinates, measured once at rest. Whatever lies below it (a tab bar, nothing) is covered
 * by the keyboard first, so it is subtracted. When the resting position is unknown the bar
 * rises by the whole keyboard: it may sit a little high, but it can never end up hidden.
 */
export function footerLift(keyboardHeight: number, screenHeight: number, restingBottom: number | null): number {
  if (keyboardHeight <= 0) return 0;
  if (restingBottom == null || restingBottom <= 0 || restingBottom > screenHeight + 1) return Math.round(keyboardHeight);
  return Math.max(0, Math.round(keyboardHeight - (screenHeight - restingBottom)));
}

/** How much of a view's frame the keyboard covers (0 when it is clear of it). */
export function overlapFor(bottom: number, keyboardTop: number): number {
  return Math.max(0, Math.round(bottom - keyboardTop));
}

/**
 * For a ScrollView that hosts fields. Wire `frameRef` to a view with the scroll view's
 * frame, `scrollRef` + `onScroll` to the ScrollView, provide `revealer` through
 * KeyboardRevealContext, and add `bottomInset` to the content's bottom padding.
 *
 * `padForKeyboard: false` for a container that moves above the keyboard itself (a sheet).
 */
export function useKeyboardAwareScroll({
  settleMs = 60,
  padForKeyboard = true,
  deferAutoFocus = false,
}: { settleMs?: number; padForKeyboard?: boolean; deferAutoFocus?: boolean } = {}) {
  const keyboard = useKeyboard();
  const frame = useKeyboardOverlap();
  const scrollRef = useRef<any>(null);
  const offsetY = useRef(0);
  const target = useRef<any>(null);
  const latest = useRef(keyboard);
  latest.current = keyboard;

  const scrollTargetIntoView = useCallback((attempt = 0) => {
    const kb = latest.current;
    const field = target.current;
    const sv = scrollRef.current;
    if (!sv || !field || kb.height <= 0 || typeof field.measureLayout !== 'function') return;
    const retry = () => {
      // A view that has not attached yet measures as nothing; that used to end the reveal.
      if (attempt < 5) setTimeout(() => scrollTargetIntoView(attempt + 1), 90);
    };
    const inner = sv.getInnerViewRef?.();
    const host = sv.getNativeScrollRef?.() ?? sv;
    if (!inner || typeof host?.measureInWindow !== 'function') return;

    field.measureLayout(
      inner,
      (_x: number, fieldY: number, _w: number, fieldH: number) => {
        host.measureInWindow((_wx: number, viewTop: number, _ww: number, viewH: number) => {
          if (!viewH) return retry();
          const y = revealOffset({
            fieldY,
            fieldH,
            offsetY: offsetY.current,
            viewTop,
            viewH,
            keyboardTop: latest.current.top,
          });
          if (y != null) sv.scrollTo({ y, animated: true });
        });
      },
      retry
    );
  }, []);

  const bottomInset = padForKeyboard ? frame.overlap : 0;

  // The keyboard arrives after the focus that summoned it, and the padding that makes
  // room — or a Save bar riding up onto the keyboard and shrinking this frame — arrives
  // after the keyboard: reveal once the keyboard's own animation has finished, so the
  // visible area is measured where it ends up, not halfway there.
  useEffect(() => {
    if (keyboard.height <= 0) {
      target.current = null;
      return;
    }
    if (!target.current) return;
    const id = setTimeout(scrollTargetIntoView, Math.max(settleMs, (keyboard.duration || 0) + 40));
    return () => clearTimeout(id);
  }, [keyboard.height, keyboard.top, keyboard.duration, bottomInset, scrollTargetIntoView, settleMs]);

  const reveal = useCallback(
    (field: any) => {
      target.current = field;
      // Moving between fields while the keyboard is already up.
      if (latest.current.height > 0) setTimeout(scrollTargetIntoView, settleMs);
    },
    [scrollTargetIntoView, settleMs]
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Fields in this form, in no particular order: the NEXT one is found by where each sits on
  // the page when Return is pressed, so fields that appear conditionally still chain right.
  const fields = useRef(new Set<FieldHandle>());
  const register = useCallback((field: FieldHandle) => {
    fields.current.add(field);
    return () => {
      fields.current.delete(field);
    };
  }, []);

  const focusNext = useCallback((from: FieldHandle) => {
    const inner = scrollRef.current?.getInnerViewRef?.();
    const all = [...fields.current].filter((f) => f.box.current && f.input.current);
    if (!inner || all.length < 2) {
      Keyboard.dismiss();
      return;
    }
    const positions: { field: FieldHandle; y: number }[] = [];
    let pending = all.length;
    const done = () => {
      const mine = positions.find((p) => p.field === from);
      const next = positions
        .filter((p) => mine && p.field !== from && p.y > mine.y + 1)
        .sort((a, b) => a.y - b.y)[0];
      if (next) next.field.input.current.focus(); // keyboard stays up; reveal() scrolls it clear
      else Keyboard.dismiss();
    };
    all.forEach((field) => {
      field.box.current.measureLayout(
        inner,
        (_x: number, y: number) => {
          positions.push({ field, y });
          if (--pending === 0) done();
        },
        () => {
          if (--pending === 0) done();
        }
      );
    });
  }, []);

  // autoFocus inside a Modal fires while the Modal is still being presented — before it is
  // in a window — so the focus either fails (the screen behind keeps the keyboard and gets
  // the typing) or lands mid-transition. The container focuses the field once it is shown.
  const pendingFocus = useRef<FieldHandle | null>(null);
  const deferFocus = useCallback((field: FieldHandle) => {
    if (!pendingFocus.current) pendingFocus.current = field; // the first field that asked
  }, []);
  const flushAutoFocus = useCallback(() => {
    const field = pendingFocus.current;
    pendingFocus.current = null;
    if (field) setTimeout(() => field.input.current?.focus?.(), 60);
  }, []);

  const revealer = useMemo<KeyboardRevealer>(
    () => ({ reveal, register, focusNext, ...(deferAutoFocus ? { deferAutoFocus: deferFocus } : null) }),
    [reveal, register, focusNext, deferAutoFocus, deferFocus]
  );

  return {
    keyboard: keyboard.height,
    scrollRef,
    frameRef: frame.ref,
    onFrameLayout: frame.onLayout,
    onScroll,
    revealer,
    bottomInset,
    flushAutoFocus,
  };
}

/**
 * The props EVERY scrollable in the app spreads — screens, sheet bodies, lists, chat.
 *
 * `automaticallyAdjustKeyboardInsets` hands iOS the job it already knows how to do: it
 * insets the scroll view by the part the keyboard covers and UIKit scrolls the focused
 * field into view. The measured path above stays as well, and the two agree because both
 * work from the keyboard's real top edge — but this one keeps working when measurement
 * cannot (a field that is not a TextField, a view that has not laid out yet, a list whose
 * rows are recycled). A field being hidden then needs BOTH to fail, not either.
 *
 * `keyboardShouldPersistTaps: 'handled'` lets a tap land on a button while the keyboard
 * is open instead of being swallowed by the dismiss.
 */
export const keyboardScrollProps = {
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: Platform.OS === 'ios' ? ('interactive' as const) : ('on-drag' as const),
  automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
};

/** True when iOS is adding the keyboard inset itself, so we must not add it a second time. */
export const NATIVE_KEYBOARD_INSETS = Platform.OS === 'ios';
