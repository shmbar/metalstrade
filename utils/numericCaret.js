// Caret preservation for a controlled input that REFORMATS its value.
//
// Across the app a money field is rendered as `value={addComma(x)}` and parsed
// back with removeNonNumeric on change. That means the string React writes back
// after a keystroke is rarely the string the browser just edited — the '$' and
// the thousands separators are re-inserted — and the browser responds by putting
// the caret at the end. The next digit then lands there: typing a 5 into
// "$55,000" to make "$555,000" produced "$550,005" instead.
//
// A raw character offset cannot survive that reformat, because inserting one
// digit can move every separator after it. So remember how many VALUE characters
// (digits, '.', '-') sat before the caret and restore it after the same count.
// The separators shift around it; the caret does not.
//
// No JSX in this file on purpose — vitest cannot parse a .js file that contains
// any (see the caveat at the top of vitest.config.js), and these need tests.

import { useRef, useLayoutEffect } from 'react';

export const isValueChar = (ch) => (ch >= '0' && ch <= '9') || ch === '.' || ch === '-';

/** How many value characters precede `upto` in `s`. */
export const countValueChars = (s, upto) => {
    let n = 0;
    for (let i = 0; i < upto && i < s.length; i++) if (isValueChar(s[i])) n++;
    return n;
};

/**
 * Offset just after the nth value character. n === 0 means "before the first
 * digit" — placed after any leading '$' so typing continues inside the number
 * rather than in front of the currency mark.
 */
export const offsetAfterValueChars = (s, n) => {
    let seen = 0;
    for (let i = 0; i < s.length; i++) {
        if (!isValueChar(s[i])) continue;
        if (n === 0) return i;
        seen++;
        if (seen === n) return i + 1;
    }
    return s.length;
};

/**
 * One hook per component, however many inputs it renders: only one field can hold
 * the caret at a time, so the element is taken from the change event rather than
 * from a ref — which is what lets a single call cover a whole .map() of rows.
 *
 *   const rememberCaret = useNumericCaret();
 *   <input value={addComma(v)} onChange={e => { rememberCaret(e); handleChange(e); }} />
 *
 * Pass 'raw' for a free-text field that is written back verbatim; its offset needs
 * no translation.
 *
 * @returns {(e: {target: HTMLInputElement}, mode?: 'value'|'raw') => void}
 */
export const useNumericCaret = () => {
    const saved = useRef(null);

    useLayoutEffect(() => {
        const s = saved.current;
        if (!s) return;
        saved.current = null;
        const el = s.el;
        // Never move the caret in a field the user has already left: any number of
        // these re-render for reasons that have nothing to do with typing.
        if (!el || typeof document === 'undefined' || document.activeElement !== el) return;
        const next = s.mode === 'raw' ? s.pos : offsetAfterValueChars(el.value, s.pos);
        try { el.setSelectionRange(next, next); } catch { /* not a text input — ignore */ }
    });

    return (e, mode = 'value') => {
        const el = e?.target;
        if (!el) return;
        const pos = mode === 'raw'
            ? el.selectionStart
            : countValueChars(el.value, el.selectionStart);
        saved.current = { el, mode, pos };
    };
};

export default useNumericCaret;
