import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, useWindowDimensions } from 'react-native';

/*
 * Keyboard handling — one implementation for every screen, sheet and form.
 *
 * Why not KeyboardAvoidingView alone: it only shrinks its own frame. A field lower in a
 * scrolling form stays exactly where it was — now under the keyboard — and on Android,
 * where Expo's edge-to-edge layout stops the window from resizing, it does nothing at
 * all. Inside a sheet (a Modal) the panel kept its full height and was pushed off screen.
 *
 * What this does instead:
 *  - useKeyboardHeight: the keyboard's height, from the platform's own show/hide events
 *    (the "will" events on iOS, so layout moves with the keyboard, not after it).
 *  - useKeyboardAwareScroll: for any ScrollView. The container adds the keyboard height
 *    as bottom padding so its last field can scroll clear, and when a field inside it is
 *    focused it scrolls just far enough to show that field above the keyboard.
 *  - KeyboardRevealContext: how a field reaches its container. TextField calls
 *    `reveal(itself)` on focus; with no container it is a no-op.
 */

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const onShow = (e: KeyboardEvent) => setHeight(Math.max(0, e.endCoordinates?.height || 0));
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', onShow),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0)),
    ];
    // Switching keyboards (emoji, a different language, predictive bar) changes the height.
    if (ios) subs.push(Keyboard.addListener('keyboardWillChangeFrame', onShow));
    return () => subs.forEach((s) => s.remove());
  }, []);
  return height;
}

export interface KeyboardRevealer {
  reveal: (target: any) => void;
}

export const KeyboardRevealContext = createContext<KeyboardRevealer | null>(null);

/** For a focusable field: the container that can scroll it into view, if any. */
export const useKeyboardRevealer = () => useContext(KeyboardRevealContext);

/** Space kept between a revealed field and the keyboard's top edge. */
const REVEAL_MARGIN = 28;

export function useKeyboardAwareScroll({ settleMs = 60 }: { settleMs?: number } = {}) {
  const keyboard = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const target = useRef<any>(null);

  const scrollTargetIntoView = useCallback(() => {
    const sv: any = scrollRef.current;
    const field = target.current;
    if (!sv || !field || keyboard <= 0 || typeof field.measureLayout !== 'function') return;
    const inner = sv.getInnerViewRef?.();
    const host = sv.getNativeScrollRef?.() ?? sv;
    if (!inner || typeof host?.measureInWindow !== 'function') return;

    field.measureLayout(
      inner,
      (_x: number, fieldY: number, _w: number, fieldH: number) => {
        host.measureInWindow((_wx: number, viewTop: number, _ww: number, viewH: number) => {
          // What is actually visible: the scroll view's frame, cut off by the keyboard.
          const visibleBottom = Math.min(viewTop + viewH, windowHeight - keyboard);
          const visible = visibleBottom - viewTop;
          if (visible <= REVEAL_MARGIN * 2) return;
          const top = offsetY.current;
          if (fieldY + fieldH + REVEAL_MARGIN > top + visible) {
            sv.scrollTo({ y: fieldY + fieldH + REVEAL_MARGIN - visible, animated: true });
          } else if (fieldY - REVEAL_MARGIN < top) {
            sv.scrollTo({ y: Math.max(0, fieldY - REVEAL_MARGIN), animated: true });
          }
        });
      },
      () => {}
    );
  }, [keyboard, windowHeight]);

  // The keyboard arrives after the focus that summoned it: reveal once it has a height,
  // and after the container has had a moment to take its new padding / position.
  useEffect(() => {
    if (keyboard <= 0) {
      target.current = null;
      return;
    }
    if (!target.current) return;
    const id = setTimeout(scrollTargetIntoView, settleMs);
    return () => clearTimeout(id);
  }, [keyboard, scrollTargetIntoView, settleMs]);

  const reveal = useCallback(
    (field: any) => {
      target.current = field;
      // Moving between fields while the keyboard is already up.
      if (keyboard > 0) setTimeout(scrollTargetIntoView, settleMs);
    },
    [keyboard, scrollTargetIntoView, settleMs]
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const revealer = useMemo<KeyboardRevealer>(() => ({ reveal }), [reveal]);

  return { keyboard, scrollRef, onScroll, revealer };
}
