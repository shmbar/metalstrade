'use client';

import { motion } from 'framer-motion';
import { Layers, PieChart, Grid3x3, TrendingUp, BarChart2, FileText } from 'lucide-react';

const features = [
  { icon: Layers, title: "Accounting", description: "Manage invoices, track expenses, and streamline financial reporting with full transparency." },
  { icon: FileText, title: "Contracts", description: "Create, track, and store contracts with ease, security, and real-time status updates." },
  { icon: Grid3x3, title: "Invoices", description: "Generate and manage invoices efficiently — export, filter, and track payments instantly." },
  { icon: TrendingUp, title: "Expenses", description: "Track expenses by category, date, and vendor to optimize your financial performance." },
  { icon: BarChart2, title: "Analytics", description: "Visualize trends, margins, and KPIs across all your shipments and contracts." },
  { icon: PieChart, title: "Statements", description: "Automated financial statements with drill-down reports for every business entity." },
];

export default function FeatureSection() {
  return (
    <section className="py-10 bg-white">
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
              Built specifically for metal traders — every module works together seamlessly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group flex items-start gap-4 p-5 rounded-2xl border border-[#b8ddf8] bg-[#f8fbff] hover:bg-[#dbeeff] hover:border-[var(--endeavour)] transition-all cursor-pointer"
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
