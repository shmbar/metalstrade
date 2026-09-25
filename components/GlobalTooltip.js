'use client';
import { useEffect } from 'react';

/* Every plain-text tooltip in the app, drawn by one instant engine: native `title`s, and
   the plain-text <Tltip>s (components/tlTip.js marks its child with data-tip).

   Two tooltips lived side by side: <Tltip> (the dark --tooltip-* pill) on ~70 screens,
   and the browser's own `title` box on ~280 elements in ~80 files — grey, OS-styled, and
   shown only after the browser's ~half-second hover delay (client, 2026-09-25: "make
   tooltip rendering instant … one consistent style across the whole application").

   One listener, mounted once in the root layout. When the pointer enters an element with
   a `title`, the title is lifted off it — the browser then has nothing to show — and drawn
   here in the pill components/ui/tooltip.tsx draws (.tooltip-pill); it goes back on the
   element when the pointer leaves, so the DOM is unchanged at rest. `\n` in a title keeps
   its line break. data-native-title on an element opts it out. Touch is left alone.

   Drawn IMPERATIVELY — one node, text and position set inside the event. Through React
   state it waited for a render, and on the heavy screens that queue put it 80–170ms
   behind the hover. Radix <Tltip> had the same problem for the same reason — 140–440ms on
   Stocks, ~160ms in the contract window (measured 2026-09-26) — so plain-text Tltips
   come here too, keeping what Radix gave them:
     · placement: data-tip-side (top | bottom | left | right), anchored to the element,
       flipped to the opposite side when there is no room, held inside the viewport;
     · keyboard: shown when focus arrives by keyboard (not by a click), hidden on blur,
       on Escape, and on activation (click / Enter / Space);
     · closed when the pointer leaves the element, on pointer-down, and on scroll;
     · screen readers: the element is aria-describedby the tooltip while it shows;
     · text as Radix rendered it: wrapped normally, not line-by-line. */

const GAP = 8;          // between the element and the tooltip, as sideOffset in ui/tooltip
const EDGE = 8;         // kept clear of the viewport edge, as collisionPadding
const TALL = 120;       // a TITLED element taller than this is a panel: anchor at the pointer
const SKIP = 'iframe, object, embed, [data-native-title]';
const TIPPED = '[data-tip], [title]';
const BOX_ID = 'ims-tooltip';
// .tooltip-pill (globals.css) is the one tooltip definition, shared with ui/tooltip.tsx.
const CLASS = 'tooltip-pill pointer-events-none break-words';
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export default function GlobalTooltip() {
    useEffect(() => {
        const box = document.createElement('div');
        box.id = BOX_ID;
        box.setAttribute('role', 'tooltip');
        box.setAttribute('data-tooltip', 'label');
        box.className = CLASS;
        Object.assign(box.style, {
            position: 'fixed', left: '0', top: '0', zIndex: 'var(--z-tooltip)', display: 'none',
            maxWidth: 'min(26rem, calc(100vw - 16px))',
        });
        document.body.appendChild(box);

        // { el, tip, text, side, anchor, via: 'pointer' | 'focus', title, describedBy, observer }
        let cur = null;
        let pointerIsDown = false;

        const textOf = (el) => {
            const tip = el.getAttribute('data-tip');
            if (tip != null && tip.trim()) return { tip: true, text: tip };
            const title = el.getAttribute('title');
            return title && title.trim() ? { tip: false, text: title } : null;
        };
        const sideOf = (el) => {
            const s = el.getAttribute('data-tip-side');
            return OPPOSITE[s] ? s : 'top';
        };
        const anchorOf = (el, tip, e) => {
            const r = el.getBoundingClientRect();
            if (!tip && e && (r.height > TALL || r.top < 0 || r.bottom > window.innerHeight)) {
                return { left: e.clientX, right: e.clientX, top: e.clientY - 4, bottom: e.clientY + 18, cx: e.clientX, cy: e.clientY };
            }
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
        };

        const place = ({ text, tip, side, anchor: a }) => {
            box.textContent = text;
            box.style.whiteSpace = tip ? 'normal' : 'pre-line';
            box.style.width = tip && cur?.el.hasAttribute('data-tip-wide') ? '26rem' : '';
            box.style.display = 'block';
            const w = box.offsetWidth, h = box.offsetHeight, W = window.innerWidth, H = window.innerHeight;
            const room = {
                top: a.top - GAP - h - EDGE, bottom: H - EDGE - a.bottom - GAP - h,
                left: a.left - GAP - w - EDGE, right: W - EDGE - a.right - GAP - w,
            };
            // The asked-for side, unless it does not fit and the opposite one fits better.
            const s = room[side] < 0 && room[OPPOSITE[side]] > room[side] ? OPPOSITE[side] : side;
            let x, y;
            if (s === 'top' || s === 'bottom') {
                x = a.cx - w / 2;
                y = s === 'top' ? a.top - GAP - h : a.bottom + GAP;
            } else {
                y = a.cy - h / 2;
                x = s === 'left' ? a.left - GAP - w : a.right + GAP;
            }
            x = Math.max(EDGE, Math.min(x, W - w - EDGE));
            y = Math.max(EDGE, Math.min(y, H - h - EDGE));
            box.dataset.side = s;
            box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        };
        const quiet = () => { box.style.display = 'none'; };

        const release = () => {
            if (!cur) return;
            const { el, title, describedBy, observer } = cur;
            observer.disconnect();
            if (el.isConnected) {
                if (title != null && !el.hasAttribute('title')) el.setAttribute('title', title);
                if (describedBy == null) el.removeAttribute('aria-describedby');
                else el.setAttribute('aria-describedby', describedBy);
            }
            cur = null;
        };
        const hide = () => { release(); quiet(); };

        const take = (el, via, e) => {
            const t = textOf(el);
            if (!t) return false;
            const title = el.getAttribute('title');
            if (title != null) el.removeAttribute('title');   // no grey box, whichever text shows
            const describedBy = el.getAttribute('aria-describedby');
            el.setAttribute('aria-describedby', describedBy ? `${describedBy} ${BOX_ID}` : BOX_ID);
            /* The element re-rendering while it shows: a new title is taken again at once,
               before the browser can show it; a Tltip whose text changes follows it, and one
               whose `show` turns false (data-tip removed) closes. */
            const observer = new MutationObserver(() => {
                if (!cur || cur.el !== el) return;
                const nt = el.getAttribute('title');
                if (nt != null) {
                    el.removeAttribute('title');
                    cur.title = nt;
                    if (!cur.tip) cur.text = nt;
                }
                if (cur.tip) {
                    const nd = el.getAttribute('data-tip');
                    if (nd == null || !nd.trim()) { hide(); return; }
                    cur.text = nd;
                    cur.side = sideOf(el);
                }
                if (box.style.display !== 'none' && cur.text.trim()) place(cur);
            });
            observer.observe(el, { attributes: true, attributeFilter: ['title', 'data-tip', 'data-tip-side'] });
            cur = { el, tip: t.tip, text: t.text, side: t.tip ? sideOf(el) : 'top', anchor: anchorOf(el, t.tip, e), via, title, describedBy, observer };
            place(cur);
            return true;
        };

        // ── pointer ────────────────────────────────────────────────────────────
        const over = (e) => {
            if (e.pointerType === 'touch') return;
            const target = e.target instanceof Element ? e.target : null;
            if (!target) return;
            if (cur && cur.el.contains(target)) {
                // Inside the element already shown. Its own title is lifted, so closest() finds
                // either an element INSIDE it — which wins, as the innermost title does in a
                // browser — or the element itself / one above it, which change nothing.
                const inner = target.closest(TIPPED);
                if (inner && inner !== cur.el && cur.el.contains(inner) && !inner.closest(SKIP)) {
                    release();
                    if (!take(inner, 'pointer', e)) quiet();
                }
                return;
            }
            const el = target.closest(TIPPED);
            if (!el || el.closest(SKIP)) {
                // Nothing to show here. A tooltip opened by keyboard focus stays, as in Radix.
                if (cur && cur.via === 'pointer') hide();
                return;
            }
            release();
            if (!take(el, 'pointer', e)) quiet();
        };
        const out = (e) => {
            if (!cur) return;
            const from = e.target, to = e.relatedTarget;
            if (!(from instanceof Node) || !cur.el.contains(from)) return;
            if (to instanceof Node && cur.el.contains(to)) return;
            hide();                                            // the pointer left the element
        };

        // ── keyboard ───────────────────────────────────────────────────────────
        // Tltip only: a native title never showed on focus, and still doesn't.
        const focusIn = (e) => {
            if (pointerIsDown) return;                         // focus from a click, as Radix
            const target = e.target instanceof Element ? e.target : null;
            const el = target && target.closest('[data-tip]');
            if (!el || el.closest(SKIP) || (cur && cur.el === el)) return;
            release();
            if (!take(el, 'focus', null)) quiet();
        };
        const focusOut = (e) => {
            if (!cur || cur.via !== 'focus') return;
            const to = e.relatedTarget;
            if (to instanceof Node && cur.el.contains(to)) return;
            hide();
        };
        const keyDown = (e) => {
            // Escape closes any tooltip; typing closes a native title's, as the browser
            // does, and leaves a Tltip's open, as Radix did.
            if (e.key === 'Escape' || (cur && !cur.tip)) quiet();
        };
        const down = () => { pointerIsDown = true; quiet(); };
        const up = () => { pointerIsDown = false; };

        document.addEventListener('pointerover', over, true);
        document.addEventListener('pointerout', out, true);
        document.addEventListener('focusin', focusIn, true);
        document.addEventListener('focusout', focusOut, true);
        document.addEventListener('keydown', keyDown, true);
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('pointerup', up, true);
        document.addEventListener('pointercancel', up, true);
        /* What closes a tooltip closes this one — but a lifted title stays lifted until the
           pointer leaves. Put back at once, the browser would show its grey box a moment
           after the click, over the very element just clicked. */
        document.addEventListener('click', quiet, true);      // incl. Enter / Space on a button
        document.addEventListener('wheel', quiet, true);
        window.addEventListener('scroll', quiet, true);
        window.addEventListener('blur', hide);
        // The element can vanish, or lose hover/focus, with no event to say so — a row
        // re-rendered, a dialog closed over it.
        const watch = setInterval(() => {
            if (!cur) return;
            if (!cur.el.isConnected) { hide(); return; }
            const hovered = cur.el.matches(':hover');
            const focused = cur.via === 'focus' && cur.el.contains(document.activeElement);
            if (!hovered && !focused) hide();
        }, 250);
        return () => {
            document.removeEventListener('pointerover', over, true);
            document.removeEventListener('pointerout', out, true);
            document.removeEventListener('focusin', focusIn, true);
            document.removeEventListener('focusout', focusOut, true);
            document.removeEventListener('keydown', keyDown, true);
            document.removeEventListener('pointerdown', down, true);
            document.removeEventListener('pointerup', up, true);
            document.removeEventListener('pointercancel', up, true);
            document.removeEventListener('click', quiet, true);
            document.removeEventListener('wheel', quiet, true);
            window.removeEventListener('scroll', quiet, true);
            window.removeEventListener('blur', hide);
            clearInterval(watch);
            release();
            box.remove();
        };
    }, []);

    return null;
}
