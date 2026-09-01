'use client';

import { motion } from 'framer-motion';
import {
  FileText, Receipt, Boxes, Wallet, Ship, Warehouse, TrendingUp, Layers, Handshake,
} from 'lucide-react';

/* Nine modules used to render as nine identical cards in a 3-column grid — same
   icon square, same title, same grey paragraph, thirty-six times over if you
   count the other two card grids on the page. Identical repetition is what made
   the site read as a template.

   Same nine modules, same copy, laid out as a bento: a 12-column grid where the
   tiles that carry the most weight are wider and carry a small visual. Widths
   sum to 12 per implicit row, so there are no explicit row spans to fall out of
   alignment when the copy length changes.

   The visuals are deliberately monochrome brand. Status colour is reserved for
   real status (see components/statusUtils.js) and must not be borrowed as a
   decorative slot — and there is no real status on a marketing page. */

// ── Small brand-only visuals for the wide tiles ────────────────────────────────
function BarRows({ rows }) {
  return (
    <div className="mt-4 flex flex-col gap-2" aria-hidden>
      {rows.map(([label, pct, opacity]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="responsiveText text-[var(--ink-muted)] w-20 flex-shrink-0 truncate">
            {label}
          </span>
          <span className="h-1.5 flex-1 rounded-full overflow-hidden bg-[var(--bg-sunken)]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${pct}%`, background: 'var(--endeavour)', opacity }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function Sparkbars({ values }) {
  const max = Math.max(...values);
  return (
    <div className="mt-4 flex items-end gap-1.5 h-16" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-lg"
          style={{
            height: `${(v / max) * 100}%`,
            background: 'var(--endeavour)',
            opacity: 0.25 + (v / max) * 0.75,
          }}
        />
      ))}
    </div>
  );
}

function Pipeline({ stages }) {
  return (
    <div className="mt-4 flex items-center gap-1.5 flex-wrap" aria-hidden>
      {stages.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          <span
            className="responsiveText rounded-lg px-2.5 py-1 border whitespace-nowrap"
            style={{
              borderColor: 'var(--line)',
              background: i === 0 ? 'var(--violet-bg)' : 'var(--bg-sunken)',
              color: i === 0 ? 'var(--violet-text)' : 'var(--ink-muted)',
              fontWeight: i === 0 ? 600 : 400,
            }}
          >
            {s}
          </span>
          {i < stages.length - 1 && (
            <span className="w-3 h-px flex-shrink-0" style={{ background: 'var(--line-strong)' }} />
          )}
        </span>
      ))}
    </div>
  );
}

// One entry per REAL module of the app — wording matches what each page does.
// `span` is the lg column width out of 12; rows are formed by summing to 12.
const MODULES = [
  {
    icon: FileText, span: 'lg:col-span-7', title: 'Contracts',
    description: 'Purchase orders with materials, pricing formulas, payment terms and linked documents — the source of truth for every deal.',
    visual: <Pipeline stages={['Draft', 'Confirmed', 'Shipped', 'Settled']} />,
  },
  {
    icon: Wallet, span: 'lg:col-span-5', title: 'Cashflow',
    description: 'Outstanding client and supplier balances across all years — partial payments, settlements and final-invoice status at a glance.',
    visual: <BarRows rows={[['Clients', 72, 1], ['Suppliers', 48, 0.7], ['Expenses', 26, 0.45]]} />,
  },
  {
    icon: Boxes, span: 'lg:col-span-4', title: 'Stocks & Warehousing',
    description: 'Live inventory per warehouse with materials breakdown, transfers, aging alerts and a built-in stock audit.',
  },
  {
    icon: Ship, span: 'lg:col-span-4', title: 'Shipments Tracking',
    description: 'ETD/ETA per cargo with status lifecycle, overdue reminders and follow-up alerts 14 days past arrival.',
  },
  {
    icon: Receipt, span: 'lg:col-span-4', title: 'Invoices',
    description: 'Client invoices with credit & final notes, PDF export, payment tracking and automatic stock write-off on shipment.',
  },
  {
    icon: TrendingUp, span: 'lg:col-span-5', title: 'Margins',
    description: 'Per-month deal margins with autosave, GIS splits, loss alerts and an AI explanation of every flagged item.',
    visual: <Sparkbars values={[38, 52, 44, 67, 58, 79, 71, 92]} />,
  },
  {
    icon: Warehouse, span: 'lg:col-span-3', title: 'Storage Costs',
    description: 'Average storage cost per MT by warehouse and month, with per-year summaries.',
  },
  {
    icon: Layers, span: 'lg:col-span-4', title: 'Accounting',
    description: 'Sales and purchase invoices reconciled side by side, with statements and Excel export for your accountant.',
  },
  {
    icon: Handshake, span: 'lg:col-span-12', title: 'Sales Contracts',
    description: 'Client sales contracts with shipped quantity tracking — status moves Outstanding → Partial → Fully shipped on its own, as invoices are raised against each line.',
  },
];

export default function FeatureSection() {
  return (
    /* --bg-sunken, not --bg-card: the page runs dark hero → light → sunken →
       dark CTA. Before, four consecutive sections were all --bg-card or
       --bg-subtle and the scroll had no rhythm to it. */
    <section id="modules" className="py-14 bg-[var(--bg-sunken)] scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="responsiveTextInput font-semibold uppercase tracking-widest text-[var(--endeavour)] bg-[var(--bg-card)] px-4 py-1.5 rounded-lg border border-[var(--line)]">
              Platform Modules
            </span>
            <h2 className="responsiveTextDisplay text-[var(--ink)] mt-4 mb-3">
              Nine modules, one record of truth
            </h2>
            <p className="text-[var(--ink-secondary)] responsiveTextTitle max-w-xl mx-auto">
              Built specifically for metals &amp; alloys traders — every figure traceable
              from purchase confirmation to final settlement.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
            {MODULES.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                /* Capped at 4 steps rather than i * 0.06 across all nine: the
                   last tile used to start half a second after the first, which
                   on a fast scroll just looks like the page is lagging. */
                transition={{ duration: 0.4, delay: Math.min(i, 4) * 0.05 }}
                className={`${m.span} group flex flex-col p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] shadow-card hover:border-[var(--endeavour)] hover:shadow-md transition-all`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[var(--endeavour)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <m.icon size={18} className="text-[var(--on-brand)]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="responsiveTextTitle font-semibold text-[var(--ink)] mb-1">
                      {m.title}
                    </h3>
                    <p className="responsiveTextInput text-[var(--ink-secondary)] leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>

                {/* Visuals push to the bottom so a tall tile in a row doesn't
                    leave its neighbour's artwork floating mid-card. */}
                {m.visual && <div className="mt-auto">{m.visual}</div>}
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
