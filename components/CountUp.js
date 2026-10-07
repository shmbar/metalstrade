'use client';
import { useEffect, useRef, useState } from 'react';

// Animated number: counts from 0 (or the figure on screen) to `value` over `duration`ms.
// `format` receives the in-flight number and returns the rendered string, so any
// Intl/prefix/suffix formatting keeps working. Respects prefers-reduced-motion.
const reducedMotion = () => typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, format = (n) => Math.round(n).toLocaleString(), duration = 600 }) {
    const target = Number(value) || 0;
    // Starts where the count starts. It used to start AT the target and drop to 0 on
    // the first frame, so every card showed its final figure for one frame first.
    const [display, setDisplay] = useState(() => (reducedMotion() ? target : 0));
    // The figure on screen now: a new value counts on from here. Counting on from the
    // last value REACHED made a card jump back whenever its value changed mid-count.
    const shownRef = useRef(display);
    const rafRef = useRef(null);

    useEffect(() => {
        if (reducedMotion()) { setDisplay(target); shownRef.current = target; return; }

        const from = shownRef.current;
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

        const tick = (now) => {
            // Clamped at 0 as well as 1. A frame's timestamp is when the frame BEGAN,
            // which is before `start` when a long render held this effect back; the
            // negative progress then came out of the cubic as a figure many times the
            // target, the wrong way. Cashflow's Total Balance read −$533,994,659.81 for a
            // frame on its way to $31.5M (2026-10-07).
            const p = Math.min(Math.max((now - start) / duration, 0), 1);
            const v = p >= 1 ? target : from + (target - from) * ease(p);
            shownRef.current = v;
            setDisplay(v);
            if (p < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration]);

    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(display)}</span>;
}
