'use client';
import { motion } from "framer-motion";
import { Clock, Lock, Monitor } from "lucide-react";

const cards = [
  {
    icon: Clock,
    title: "AI Document Reading",
    description: "Drop a supplier invoice or purchase confirmation PDF — the AI extracts vendor, amounts, dates, weights and even chemistry, converts units to MT, and fills the form for you.",
  },
  {
    icon: Monitor,
    title: "Live Market Data",
    description: "LME metal prices and cross-currency FX rates on your dashboard, with EUR/USD conversion applied consistently across contracts, invoices and cashflow.",
  },
  {
    icon: Lock,
    title: "Priority Alerts",
    description: "Overdue invoices, delayed shipments, storage risks and settlement deadlines — ranked High / Medium / Low so the real fires surface first, and cleared automatically when resolved.",
  },
];

export function PlatformSection() {
  return (
    <section className="py-10 bg-[var(--bg-subtle)]">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">

          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <span className="responsiveTextInput font-semibold uppercase tracking-widest text-[var(--endeavour)] bg-[var(--bg-card)] px-4 py-1.5 rounded-lg border border-[var(--line)]">
              Why It&apos;s Different
            </span>
            <h2 className="responsiveTextDisplay font-bold text-[var(--chathams-blue)] mt-4 mb-2">
              Built for Modern Metal Trading
            </h2>
            <p className="text-[var(--ink-secondary)] responsiveTextTitle max-w-xl mx-auto">
              Not a generic ERP — the workflows, documents and market data of a metals trading desk, built in.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                /* --bg-card, not --bg-subtle: the section behind these is
                   already --bg-subtle, so card and ground were the same fill
                   and the tiles read as outlines rather than surfaces. */
                className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] shadow-card p-8 flex flex-col gap-4 hover:border-[var(--endeavour)] hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[var(--endeavour)] rounded-2xl flex items-center justify-center shadow-md">
                  <card.icon className="w-6 h-6 text-[var(--on-brand)]" strokeWidth={2} />
                </div>
                <h3 className="responsiveTextPage font-bold text-[var(--chathams-blue)]">{card.title}</h3>
                <p className="text-[var(--ink-secondary)] responsiveTextTitle leading-relaxed">{card.description}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

export default PlatformSection;
