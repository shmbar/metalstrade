import { describe, expect, it } from 'vitest';
import { overlapFor, revealOffset } from '@/lib/keyboard';

/*
 * The rules that decide whether a user can see what they are typing.
 *
 * The app's keyboard handling measures views at runtime, which no unit test can do — but
 * every DECISION it makes from those measurements lives in these two pure functions, so
 * the arithmetic is checked here across real iPhone sizes and keyboard heights instead of
 * being re-discovered on a device.
 *
 * Points, portrait, from Apple's device metrics; keyboard heights include the predictive bar.
 */
const PHONES = [
  { name: 'iPhone SE (3rd gen)', h: 667, kb: 291, tabBar: 49, topInset: 20 },
  { name: 'iPhone 15', h: 852, kb: 336, tabBar: 83, topInset: 59 },
  { name: 'iPhone 17 Pro Max', h: 956, kb: 398, tabBar: 83, topInset: 62 },
];

describe.each(PHONES)('keyboard geometry · $name', ({ h, kb, tabBar, topInset }) => {
  const keyboardTop = h - kb;
  // A tab screen: content runs from under the status bar to the top of the tab bar.
  const viewTop = topInset;
  const viewH = h - topInset - tabBar;
  const field = { fieldH: 48 };

  it('lifts a field the keyboard would cover', () => {
    // A field sitting just below the keyboard's top edge, with the form not scrolled.
    const fieldY = keyboardTop - viewTop + 10;
    const y = revealOffset({ ...field, fieldY, offsetY: 0, viewTop, viewH, keyboardTop });
    expect(y).not.toBeNull();
    // After scrolling, the field's bottom clears the keyboard with margin to spare.
    const visibleBottomInContent = (y as number) + (Math.min(viewTop + viewH, keyboardTop) - viewTop);
    expect(fieldY + field.fieldH).toBeLessThanOrEqual(visibleBottomInContent);
  });

  it('leaves a field that is already clear of the keyboard alone', () => {
    expect(revealOffset({ ...field, fieldY: 24, offsetY: 0, viewTop, viewH, keyboardTop })).toBeNull();
  });

  it('scrolls back up for a field above the fold (moving to a previous field)', () => {
    const y = revealOffset({ ...field, fieldY: 100, offsetY: 400, viewTop, viewH, keyboardTop });
    expect(y).toBe(76); // 100 - 24 margin
  });

  it('shows the TOP of a field taller than the space left, where the cursor is', () => {
    const visible = Math.min(viewTop + viewH, keyboardTop) - viewTop;
    const tall = { fieldY: 600, fieldH: visible * 2 };
    const y = revealOffset({ ...tall, offsetY: 0, viewTop, viewH, keyboardTop });
    expect(y).not.toBeNull();
    expect(y as number).toBeLessThanOrEqual(tall.fieldY); // never scrolls past the field's top
  });

  it('does nothing when the keyboard is down', () => {
    expect(revealOffset({ ...field, fieldY: 5000, offsetY: 0, viewTop, viewH, keyboardTop: h })).not.toBeNull();
    // …and nothing at all when the field is already visible with no keyboard.
    expect(revealOffset({ ...field, fieldY: 10, offsetY: 0, viewTop, viewH, keyboardTop: h })).toBeNull();
  });

  it('never returns a negative offset', () => {
    const y = revealOffset({ ...field, fieldY: 0, offsetY: 300, viewTop, viewH, keyboardTop });
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it('refuses to jitter when almost nothing is visible', () => {
    // A sheet whose visible strip is thinner than two margins: moving would only flicker.
    expect(revealOffset({ ...field, fieldY: 200, offsetY: 0, viewTop: keyboardTop - 40, viewH: 40, keyboardTop })).toBeNull();
  });

  it('measures how much of a view the keyboard covers', () => {
    expect(overlapFor(h, keyboardTop)).toBe(kb); // a sheet spanning the screen
    expect(overlapFor(h - tabBar, keyboardTop)).toBe(Math.max(0, kb - tabBar)); // a tab screen
    expect(overlapFor(keyboardTop - 1, keyboardTop)).toBe(0); // a bar already above it
  });
});

describe('keyboard geometry · moving between fields', () => {
  const phone = { h: 852, kb: 336 };
  const keyboardTop = phone.h - phone.kb;
  const viewTop = 59;
  const viewH = phone.h - 59 - 83;

  it('each Next lands the new field above the keyboard', () => {
    // Eight fields, 72pt apart, in one form; tab through them from the top.
    let offsetY = 0;
    for (let i = 0; i < 8; i++) {
      const fieldY = i * 72;
      const y = revealOffset({ fieldY, fieldH: 48, offsetY, viewTop, viewH, keyboardTop });
      if (y != null) offsetY = y;
      const visible = Math.min(viewTop + viewH, keyboardTop) - viewTop;
      expect(fieldY).toBeGreaterThanOrEqual(offsetY - 1); // the field is not above the fold
      expect(fieldY + 48).toBeLessThanOrEqual(offsetY + visible + 1); // nor under the keyboard
    }
  });

  it('a taller keyboard (emoji / another language) re-lifts the same field', () => {
    const fieldY = 500;
    const first = revealOffset({ fieldY, fieldH: 48, offsetY: 0, viewTop, viewH, keyboardTop });
    const taller = revealOffset({ fieldY, fieldH: 48, offsetY: first ?? 0, viewTop, viewH, keyboardTop: keyboardTop - 60 });
    expect(taller).not.toBeNull();
    expect(taller as number).toBeGreaterThan(first as number);
  });
});
