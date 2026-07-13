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
    <section className="py-10 bg-[#e3f3ff]">
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
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--endeavour)] bg-[#dbeeff] px-4 py-1.5 rounded-full border border-[#b8ddf8]">
              Why It&apos;s Different
            </span>
            <h2 className="text-2xl md:text-4xl font-bold text-[var(--chathams-blue)] mt-4 mb-2">
              Built for Modern Metal Trading
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
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
                className="rounded-2xl border border-[#b8ddf8] bg-[#f8fbff] p-8 flex flex-col gap-4 hover:border-[var(--endeavour)] hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[var(--endeavour)] rounded-xl flex items-center justify-center shadow-md">
                  <card.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-[var(--chathams-blue)]">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{card.description}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

export default PlatformSection;
