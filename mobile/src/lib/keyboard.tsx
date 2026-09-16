import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Dimensions, Keyboard, KeyboardEvent, NativeScrollEvent, NativeSyntheticEvent, Platform, View } from 'react-native';

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

try {
  const ios = Platform.OS === 'ios';
  Keyboard?.addListener?.(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => publish(fromEvent(e)));
  Keyboard?.addListener?.(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) =>
    publish(hidden(e?.duration && e.duration > 0 ? e.duration : 250))
  );
  // Switching keyboards (emoji, another language, the predictive bar) changes the frame.
  if (ios) Keyboard?.addListener?.('keyboardWillChangeFrame', (e) => publish(fromEvent(e)));
} catch {
  /* no native keyboard module (tests) */
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => current;

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

export interface KeyboardRevealer {
  reveal: (target: any) => void;
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
export function useKeyboardAwareScroll({ settleMs = 60, padForKeyboard = true }: { settleMs?: number; padForKeyboard?: boolean } = {}) {
  const keyboard = useKeyboard();
  const frame = useKeyboardOverlap();
  const scrollRef = useRef<any>(null);
  const offsetY = useRef(0);
  const target = useRef<any>(null);
  const latest = useRef(keyboard);
  latest.current = keyboard;

  const scrollTargetIntoView = useCallback(() => {
    const kb = latest.current;
    const field = target.current;
    const sv = scrollRef.current;
    if (!sv || !field || kb.height <= 0 || typeof field.measureLayout !== 'function') return;
    const inner = sv.getInnerViewRef?.();
    const host = sv.getNativeScrollRef?.() ?? sv;
    if (!inner || typeof host?.measureInWindow !== 'function') return;

    field.measureLayout(
      inner,
      (_x: number, fieldY: number, _w: number, fieldH: number) => {
        host.measureInWindow((_wx: number, viewTop: number, _ww: number, viewH: number) => {
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
      () => {}
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

  const revealer = useMemo<KeyboardRevealer>(() => ({ reveal }), [reveal]);

  return {
    keyboard: keyboard.height,
    scrollRef,
    frameRef: frame.ref,
    onFrameLayout: frame.onLayout,
    onScroll,
    revealer,
    bottomInset,
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
