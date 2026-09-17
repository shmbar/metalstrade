import { describe, expect, it } from 'vitest';
import { applyKeyboardEvent, presentStep, PresentPhase, KeyboardState } from '@/lib/keyboard';

/*
 * The flow reported repeatedly: a keyboard is open on Cash Flow's search field, the user taps
 * Add Entry, and the sheet used to appear underneath that keyboard.
 *
 * These tests drive the real gate (presentStep) with the real keyboard state logic
 * (applyKeyboardEvent) through the sequence iOS emits, and assert the one thing that matters:
 * the sheet is not presented until the old keyboard has FINISHED hiding, and is presented
 * after that.
 */
const SCREEN = 844;
const kb = (height: number) => ({ endCoordinates: { height, screenY: SCREEN - height, screenX: 0, width: 390 }, duration: 250 }) as any;
const DOWN: KeyboardState = { height: 0, top: SCREEN, duration: 0, settled: true };

/** Feed a keyboard event to both the store logic and the gate, as the hook does. */
const step = (state: KeyboardState, phase: PresentPhase, kind: Parameters<typeof applyKeyboardEvent>[1], e?: any) => {
  const next = applyKeyboardEvent(state, kind, e);
  return { state: next, phase: presentStep(phase, { type: 'keyboard', hidden: next.height <= 0, settled: next.settled }) };
};

describe('present a sheet while a keyboard is up', () => {
  it('REPORTED FLOW: search keyboard open -> tap Add Entry -> present only after did-hide', () => {
    // Typing in the search box: keyboard up and settled.
    let state = applyKeyboardEvent(DOWN, 'willShow', kb(336));
    state = applyKeyboardEvent(state, 'didShow', kb(336));
    expect(state).toMatchObject({ height: 336, settled: true });

    // Tap Add Entry: the gate sees a keyboard and starts closing it instead of presenting.
    let phase = presentStep('idle', { type: 'open', keyboardUp: state.height > 0 || !state.settled });
    expect(phase).toBe('closingKeyboard');

    // Keyboard.dismiss() -> iOS announces the hide. Announced is not finished: still waiting.
    ({ state, phase } = step(state, phase, 'willHide', kb(336)));
    expect(state).toMatchObject({ height: 0, settled: false });
    expect(phase).toBe('closingKeyboard');

    // The hide completes. NOW the sheet may present.
    ({ state, phase } = step(state, phase, 'didHide', kb(336)));
    expect(state).toMatchObject({ height: 0, settled: true });
    expect(phase).toBe('presented');

    // onShow -> the sheet's Title field is focused -> a NEW keyboard for the new field.
    state = applyKeyboardEvent(state, 'willShow', kb(336));
    state = applyKeyboardEvent(state, 'didShow', kb(336));
    expect(state).toMatchObject({ height: 336, top: 508, settled: true });
    // The sheet lifts by state.height — computed from THIS keyboard, never the old one.
  });

  it('with no keyboard up, the sheet presents at once', () => {
    expect(presentStep('idle', { type: 'open', keyboardUp: false })).toBe('presented');
  });

  it('a keyboard that is still animating counts as up (never present into a moving keyboard)', () => {
    const inFlight = applyKeyboardEvent(DOWN, 'willShow', kb(336)); // announced, not settled
    expect(presentStep('idle', { type: 'open', keyboardUp: inFlight.height > 0 || !inFlight.settled })).toBe('closingKeyboard');
  });

  it('a hide that never completes cannot hold the sheet hostage: the fallback presents it', () => {
    let phase = presentStep('idle', { type: 'open', keyboardUp: true });
    // Nothing was focused, so dismiss() had nothing to blur and no event ever arrives.
    phase = presentStep(phase, { type: 'timeout' });
    expect(phase).toBe('presented');
  });

  it('a "will hide" alone never presents — only "did hide" does', () => {
    let state = applyKeyboardEvent(DOWN, 'didShow', kb(336));
    let phase = presentStep('idle', { type: 'open', keyboardUp: true });
    for (let i = 0; i < 3; i++) ({ state, phase } = step(state, phase, 'willHide', kb(336)));
    expect(phase).toBe('closingKeyboard');
    ({ phase } = step(state, phase, 'didHide', kb(336)));
    expect(phase).toBe('presented');
  });

  it('closing the sheet resets the gate so the next open starts clean', () => {
    expect(presentStep('presented', { type: 'close' })).toBe('idle');
    expect(presentStep('closingKeyboard', { type: 'close' })).toBe('idle');
  });

  it('a stray late event after presentation does not un-present the sheet', () => {
    expect(presentStep('presented', { type: 'keyboard', hidden: false, settled: true })).toBe('presented');
    expect(presentStep('presented', { type: 'timeout' })).toBe('presented');
  });
});
