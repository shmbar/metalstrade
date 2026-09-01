'use client';

import { useEffect, useState } from 'react';
import { FileText, Check, Sparkles } from 'lucide-react';

/* The hero preview used to be /dashboard-preview.png — a 410KB screenshot in a
   glass frame. Three problems with that: it soft-focuses on a retina display,
   it can never match the app's actual theme, and it shows a dashboard, which is
   the least distinctive thing this product does.

   This renders the distinctive thing instead: a supplier invoice PDF being read
   and turned into form fields. Real DOM, real Plus Jakarta Sans, real tokens.

   Everything here is painted from the --on-brand* family, never from surface
   tokens. The hero behind it is --brand-deep in BOTH themes (see hero.jsx), so
   a --bg-card panel would flip to near-black in dark mode while the text on it
   stayed white. Glass-over-violet is theme-proof by construction. */

// What the AI pulls off the document, in the order it appears on the form.
const FIELDS = [
  { label: 'Supplier',   value: 'Nordmetall GmbH' },
  { label: 'Invoice no', value: 'INV-2291' },
  { label: 'Date',       value: '12 Aug 2026' },
  { label: 'Material',   value: 'AISI 316 Turnings' },
  { label: 'Net weight', value: '24.180 MT' },
  { label: 'Amount',     value: '118,442.00 EUR' },
];

const CHEMISTRY = [
  ['Ni', '10.4'],
  ['Cr', '16.8'],
  ['Mo', '2.1'],
];

const STEP_MS = 420;     // one field lands every 420ms
const HOLD_MS = 2200;    // full form sits complete this long before looping

export default function DashboardPreview() {
  // How many fields have landed. 0 = blank form; FIELDS.length = complete.
  const [filled, setFilled] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    // Reduced motion gets the finished state, no loop — the information is the
    // point, the animation is only how it's introduced.
    if (reduced) { setFilled(FIELDS.length); return; }

    let timer;
    const tick = () => {
      setFilled((n) => {
        if (n >= FIELDS.length) { timer = setTimeout(tick, STEP_MS); return 0; }
        const next = n + 1;
        timer = setTimeout(tick, next === FIELDS.length ? HOLD_MS : STEP_MS);
        return next;
      });
    };
    timer = setTimeout(tick, STEP_MS);
    return () => clearTimeout(timer);
  }, [reduced]);

  const done = filled >= FIELDS.length;

  return (
    <div
      className="relative rounded-3xl p-3 border shadow-2xl backdrop-blur-xl"
      style={{
        background: 'linear-gradient(160deg, var(--on-brand-soft-strong), var(--on-brand-soft))',
        borderColor: 'var(--on-brand-soft-strong)',
      }}
    >
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: 'var(--on-brand-soft)', background: 'var(--on-brand-soft)' }}
      >

        {/* ── Window chrome ─────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 border-b"
          style={{ borderColor: 'var(--on-brand-soft)' }}
        >
          <FileText className="w-3.5 h-3.5 flex-shrink-0 text-[var(--on-brand-muted)]" />
          <span className="responsiveText font-medium text-[var(--on-brand)] truncate">
            supplier-invoice-2291.pdf
          </span>

          <span
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 border flex-shrink-0"
            style={{ borderColor: 'var(--on-brand-soft-strong)', background: 'var(--on-brand-soft)' }}
          >
            {done ? (
              <Check className="w-3 h-3 text-[var(--on-brand)]" strokeWidth={3} />
            ) : (
              <Sparkles className="w-3 h-3 text-[var(--on-brand)] animate-pulse" />
            )}
            <span className="responsiveText font-semibold text-[var(--on-brand)] whitespace-nowrap">
              {done ? 'Form filled' : 'Reading…'}
            </span>
          </span>
        </div>

        {/* ── Extracted fields ──────────────────────────────────────────── */}
        <div className="px-4 py-3.5 flex flex-col gap-2">
          {FIELDS.map((f, i) => {
            const isIn = i < filled;
            const isLatest = i === filled - 1;
            return (
              <div
                key={f.label}
                className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 border transition-all duration-300"
                style={{
                  borderColor: isLatest ? 'var(--primary-bright)' : 'var(--on-brand-soft)',
                  background: isIn ? 'var(--on-brand-soft)' : 'transparent',
                }}
              >
                <span className="responsiveText font-semibold uppercase tracking-wide text-[var(--on-brand-muted)] whitespace-nowrap">
                  {f.label}
                </span>

                {/* The value and its placeholder bar occupy the same row, so
                    nothing reflows as fields land — the panel height is fixed
                    from first paint and the hero never shifts under it. */}
                {isIn ? (
                  <span className="responsiveText font-medium text-[var(--on-brand)] truncate">
                    {f.value}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="h-2 w-20 rounded-full flex-shrink-0"
                    style={{ background: 'var(--on-brand-soft)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Chemistry, read off the same document ─────────────────────── */}
        <div
          className="flex items-center gap-2 px-4 pb-3.5 pt-0.5 flex-wrap"
          style={{ opacity: done ? 1 : 0.35, transition: 'opacity 400ms' }}
        >
          <span className="responsiveText font-semibold uppercase tracking-wide text-[var(--on-brand-muted)]">
            Chemistry
          </span>
          {CHEMISTRY.map(([el, pct]) => (
            <span
              key={el}
              className="responsiveText rounded-lg px-2 py-0.5 border text-[var(--on-brand)]"
              style={{ borderColor: 'var(--on-brand-soft-strong)', background: 'var(--on-brand-soft)' }}
            >
              <span className="font-semibold">{el}</span>{' '}
              <span className="font-medium tabular-nums">{pct}%</span>
            </span>
          ))}
        </div>

        {/* ── What happened to the numbers after extraction ──────────────── */}
        <div
          className="grid grid-cols-3 border-t"
          style={{ borderColor: 'var(--on-brand-soft)' }}
        >
          {[
            ['Units', 'kg → MT'],
            ['FX', 'EUR @ 1.0842'],
            ['Matched', 'PO-4471'],
          ].map(([k, v]) => (
            <div key={k} className="px-4 py-2.5 text-left">
              <div className="responsiveText font-semibold uppercase tracking-wide text-[var(--on-brand-muted)]">
                {k}
              </div>
              <div className="responsiveText font-medium text-[var(--on-brand)] tabular-nums truncate">
                {v}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
