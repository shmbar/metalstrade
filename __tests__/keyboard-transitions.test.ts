import { describe, expect, it } from 'vitest';
import { applyKeyboardEvent, KeyboardEventKind, KeyboardState } from '@/lib/keyboard';

/*
 * Replays the keyboard event sequences iOS sends during the flows the client reported, through
 * the app's real keyboard state logic. The test environment is an iPhone-sized screen
 * (844pt tall). A 336pt keyboard therefore starts at y = 508.
 *
 * What these cannot do: prove the ORDER iOS uses on a given device. What they do prove: for
 * every order iOS might use, the state the whole app reads ends up matching the keyboard that
 * is actually on screen — because the "did" events, which report what really happened, win.
 */
const SCREEN = 844;
const kbEvent = (height: number) => ({ endCoordinates: { height, screenY: SCREEN - height, screenX: 0, width: 390 }, duration: 250 }) as any;
const START: KeyboardState = { height: 0, top: SCREEN, duration: 0, settled: true };

type Step = [KeyboardEventKind, number?];
const replay = (steps: Step[], { willOnly = false } = {}) =>
  steps
    .filter(([kind]) => !willOnly || kind.startsWith('will'))
    .reduce((state, [kind, h]) => applyKeyboardEvent(state, kind, h == null ? undefined : kbEvent(h)), START);

describe('keyboard transitions', () => {
  it('REPORTED: keyboard already up on Cash Flow search → Add Entry takes focus', () => {
    // Focus moves from the search box to the sheet's Title field. iOS can announce the NEW
    // field's "will show" before the OLD field's "will hide"; the keyboard never leaves.
    const steps: Step[] = [
      ['willShow', 336], ['didShow', 336], // typing in search
      ['willShow', 336], // Title in the sheet takes focus
      ['willHide'], // …and the search box's resignation is announced afterwards
      ['didShow', 336], // what actually happened: the keyboard is up
    ];
    // The old store (will-events only) ended here: the app believed there was no keyboard,
    // so the sheet stayed down and the form was drawn underneath it.
    expect(replay(steps, { willOnly: true }).height).toBe(0);
    // Now the "did" event corrects it.
    expect(replay(steps).height).toBe(336);
    expect(replay(steps).top).toBe(508);
  });

  it('with the sheet closing the old keyboard first, the sequence is simply hide → show', () => {
    const steps: Step[] = [
      ['willShow', 336], ['didShow', 336], // search box
      ['willHide'], ['didHide'], // Sheet opens → Keyboard.dismiss()
      ['willShow', 336], ['didShow', 336], // sheet on screen → Title focused
    ];
    expect(replay(steps).height).toBe(336);
    expect(replay(steps, { willOnly: true }).height).toBe(336);
  });

  it('moving between fields with Next keeps the keyboard state steady', () => {
    const steps: Step[] = [
      ['willShow', 336], ['didShow', 336],
      ['willShow', 336], ['didShow', 336], // Title → Amount
      ['willShow', 291], ['didShow', 291], // Amount is a number pad: shorter keyboard
    ];
    expect(replay(steps).height).toBe(291);
  });

  it('a taller keyboard (emoji, another language) re-lifts everything', () => {
    const steps: Step[] = [['willShow', 336], ['didShow', 336], ['willChangeFrame', 398], ['didChangeFrame', 398]];
    expect(replay(steps).height).toBe(398);
  });

  it('dismiss and reopen, repeatedly, always ends where the keyboard really is', () => {
    const cycle: Step[] = [['willShow', 336], ['didShow', 336], ['willHide'], ['didHide']];
    expect(replay([...cycle, ...cycle, ...cycle]).height).toBe(0);
    expect(replay([...cycle, ...cycle, ['willShow', 336], ['didShow', 336]]).height).toBe(336);
  });

  it('a hide that iOS announces but then cancels does not leave the app thinking it is gone', () => {
    // Interactive dismiss: the user drags the keyboard down, then lets go and it springs back.
    const steps: Step[] = [['willShow', 336], ['didShow', 336], ['willHide'], ['didShow', 336]];
    expect(replay(steps, { willOnly: true }).height).toBe(0);
    expect(replay(steps).height).toBe(336);
  });

  it('a keyboard sliding off the bottom edge counts as hidden', () => {
    const offscreen = { endCoordinates: { height: 336, screenY: SCREEN, screenX: 0, width: 390 }, duration: 250 } as any;
    expect(applyKeyboardEvent({ height: 336, top: 508, duration: 0, settled: true }, 'willChangeFrame', offscreen).height).toBe(0);
  });
});

describe('settled flag', () => {
  it('"will" events leave the state in flight; "did" events settle it', () => {
    const a = applyKeyboardEvent(START, 'willShow', kbEvent(336));
    expect(a.settled).toBe(false);
    const b = applyKeyboardEvent(a, 'didShow', kbEvent(336));
    expect(b.settled).toBe(true);
    const c = applyKeyboardEvent(b, 'willHide');
    expect(c).toMatchObject({ height: 0, settled: false });
    const d = applyKeyboardEvent(c, 'didHide');
    expect(d).toMatchObject({ height: 0, settled: true });
  });
});
