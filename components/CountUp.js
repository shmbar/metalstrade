'use client';
import { useEffect, useRef, useState } from 'react';

// Animated number: counts from 0 (or the previous value) to `value` over `duration`ms.
// `format` receives the in-flight number and returns the rendered string, so any
// Intl/prefix/suffix formatting keeps working. Respects prefers-reduced-motion.
export default function CountUp({ value, format = (n) => Math.round(n).toLocaleString(), duration = 600 }) {
    const target = Number(value) || 0;
    const [display, setDisplay] = useState(target);
    const fromRef = useRef(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const reduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced) { setDisplay(target); fromRef.current = target; return; }

        const from = fromRef.current;
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            setDisplay(from + (target - from) * ease(p));
            if (p < 1) rafRef.current = requestAnimationFrame(tick);
            else fromRef.current = target;
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration]);

    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(display)}</span>;
}
