import { describe, it, expect } from 'vitest';
import { countValueChars, offsetAfterValueChars, isValueChar } from '@utils/numericCaret';

// Mirrors addComma in app/(root)/cashflow/funcs.js, which cannot be imported here:
// that file contains JSX and vitest cannot parse a .js file that does (see the
// caveat at the top of vitest.config.js). Kept character-for-character identical
// so what these tests drive is the real formatting pipeline.
const addComma = (nStr) => {
    nStr += '';
    const x = nStr.split('.');
    let x1 = x[0];
    let x2 = x.length > 1 ? '.' + x[1] : '';
    const rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) x1 = x1.replace(rgx, '$1,$2');
    x2 = x2.length > 3 ? x2.substring(0, 3) : x2;
    return '$' + x1 + x2;
};

// As in app/(root)/margins/funcs.js
const removeNonNumeric = (num) => num.toString().replace(/[^0-9.\-]/g, '');

/**
 * One keystroke through the real pipeline:
 *   the browser edits the displayed string -> handleChange strips the formatting
 *   -> state re-renders through addComma -> the caret is restored.
 * Returns the value now on screen and where the caret ends up.
 */
const type = (shown, caret, ch) => {
    const edited = shown.slice(0, caret) + ch + shown.slice(caret);
    const editedCaret = caret + ch.length;
    const kept = countValueChars(edited, editedCaret);
    const next = addComma(removeNonNumeric(edited));
    return { value: next, caret: offsetAfterValueChars(next, kept) };
};

describe('isValueChar', () => {
    it('counts digits, decimal point and minus — not the separators', () => {
        expect('0123456789.-'.split('').every(isValueChar)).toBe(true);
        expect(['$', ',', ' '].some(isValueChar)).toBe(false);
    });
});

describe('the reported bug: $55,000 -> $555,000', () => {
    it('keeps the caret with the digit just typed, not at the end', () => {
        // Caret sits right after the "$", before the first 5.
        const r = type('$55,000', 1, '5');
        expect(r.value).toBe('$555,000');
        // Immediately after the 5 that was typed: "$5|55,000"
        expect(r.caret).toBe(2);
        expect(r.value.slice(0, r.caret)).toBe('$5');
    });

    it('a second keystroke continues where the first left off', () => {
        let r = type('$55,000', 1, '5');       // -> $555,000
        r = type(r.value, r.caret, '5');       // -> $5,555,000
        expect(r.value).toBe('$5,555,000');
        // Two digits typed, so two digits sit behind the caret. Not "$55": the
        // value crossed a thousands boundary and a comma now falls BETWEEN them
        // ("$5,5|55,000"), which is exactly why the caret is tracked by digit
        // count and not by character offset.
        expect(countValueChars(r.value, r.caret)).toBe(2);
        expect(r.value.slice(0, r.caret)).toBe('$5,5');
    });

    it('does not append to the end, which was the old behaviour', () => {
        const r = type('$55,000', 1, '5');
        expect(r.value).not.toBe('$550,005');   // what typing-at-the-end produced
        expect(r.caret).not.toBe(r.value.length);
    });
});

describe('the caret survives a separator moving', () => {
    it('a digit that pushes a comma along keeps the same count behind the caret', () => {
        // "$1,234", caret after the 1 (index 2), type 9 -> "$19,234"
        const r = type('$1,234', 2, '9');
        expect(r.value).toBe('$19,234');
        expect(r.value.slice(0, r.caret)).toBe('$19');
    });

    it('typing at the very end stays at the very end', () => {
        const r = type('$1,234', 6, '5');
        expect(r.value).toBe('$12,345');
        expect(r.caret).toBe(r.value.length);
    });

    it('keeps its place around a decimal', () => {
        const r = type('$1,234.5', 2, '9');
        expect(r.value).toBe('$19,234.5');
        expect(r.value.slice(0, r.caret)).toBe('$19');
    });
});

describe('offsetAfterValueChars edges', () => {
    it('n = 0 lands after the currency mark, not before it', () => {
        expect(offsetAfterValueChars('$55,000', 0)).toBe(1);
        expect(offsetAfterValueChars('55,000', 0)).toBe(0);
    });

    it('a count past the end clamps to the end', () => {
        expect(offsetAfterValueChars('$55', 99)).toBe(3);
    });

    it('an empty value is safe', () => {
        expect(offsetAfterValueChars('', 3)).toBe(0);
        expect(countValueChars('', 5)).toBe(0);
    });

    it('counting stops at the caret, not at the end of the string', () => {
        expect(countValueChars('$1,234', 4)).toBe(2);   // "$1,2" -> the 1 and the 2
    });
});
