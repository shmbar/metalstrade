'use client';

import { motion } from 'framer-motion';
import {
  FileText, Receipt, Boxes, Wallet, Ship, Warehouse, TrendingUp, Layers, Handshake,
} from 'lucide-react';

// One card per REAL module of the app — wording matches what each page actually does.
const features = [
  { icon: FileText, title: "Contracts", description: "Purchase orders with materials, pricing formulas, payment terms and linked documents — the source of truth for every deal." },
  { icon: Receipt, title: "Invoices", description: "Client invoices with credit & final notes, PDF export, payment tracking and automatic stock write-off on shipment." },
  { icon: Boxes, title: "Stocks & Warehousing", description: "Live inventory per warehouse with materials breakdown, transfers, aging alerts and a built-in stock audit." },
  { icon: Wallet, title: "Cashflow", description: "Outstanding client and supplier balances across all years — partial payments, settlements and final-invoice status at a glance." },
  { icon: Ship, title: "Shipments Tracking", description: "ETD/ETA per cargo with status lifecycle, overdue reminders and follow-up alerts 14 days past arrival." },
  { icon: Warehouse, title: "Storage Costs", description: "Average storage cost per MT by warehouse and month, with per-year summaries and untagged-invoice triage." },
  { icon: TrendingUp, title: "Margins", description: "Per-month deal margins with autosave, GIS splits, loss alerts and an AI explanation of every flagged item." },
  { icon: Layers, title: "Accounting", description: "Sales and purchase invoices reconciled side by side, with statements and Excel export for your accountant." },
  { icon: Handshake, title: "Sales Contracts", description: "Client sales contracts with shipped quantity tracking — status moves Outstanding → Partial → Fully shipped on its own." },
];

export default function FeatureSection() {
  return (
    <section id="modules" className="py-14 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--endeavour)] bg-[#dbeeff] px-4 py-1.5 rounded-full border border-[#b8ddf8]">
              Platform Modules
            </span>
            <h2 className="text-2xl md:text-4xl font-bold text-[var(--chathams-blue)] mt-4 mb-3">
              Everything in One Platform
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Nine integrated modules built specifically for metals &amp; alloys traders —
              one record of truth from purchase to settlement.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="group flex items-start gap-4 p-5 rounded-2xl border border-[#b8ddf8] bg-[#f8fbff] hover:bg-[#dbeeff] hover:border-[var(--endeavour)] hover:shadow-md transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--endeavour)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <f.icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--chathams-blue)] mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
