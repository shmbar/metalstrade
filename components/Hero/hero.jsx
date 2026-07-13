import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import DashboardPreview from "./dashboard-preview";

// Capability chips under the headline — each names a REAL platform feature.
const heroStats = [
  "AI reads supplier invoices",
  "Live LME & FX rates",
  "Multi-company · multi-currency",
  "Priority alerts",
];

export default function Hero() {
  return (
    <section
      className="relative pt-20 md:pt-24 pb-10 md:pb-16 text-white overflow-hidden"
      style={{ background: 'linear-gradient(160deg, var(--chathams-blue) 0%, #0b2f66 55%, var(--endeavour) 130%)' }}
    >
      {/* Ambient glow + grid, purely decorative */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #4aa3e8 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 right-0 w-[520px] h-[520px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7cc3ff 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      </div>

      <div className="container mx-auto px-8 md:px-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

          {/* Left: Text + Buttons */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-5 border border-white/25 bg-white/10 backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#9ed2ff]" />
              <span className="text-[11px] font-semibold tracking-wide uppercase text-[#dbeeff]">
                AI-powered IMS for metals &amp; alloys trading
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-[1.15] tracking-tight"
            >
              The operating system for{' '}
              <span style={{
                background: 'linear-gradient(90deg, #9ed2ff 0%, #dff0ff 60%, #ffffff 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>
                metal trading
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm md:text-base text-[#dbeeff] mb-6 leading-relaxed font-light max-w-lg"
            >
              Contracts, inventory, shipments, cashflow and margins — connected end to end.
              Drop a supplier invoice and the AI fills it in. Watch live metal prices and FX.
              Every figure reconciles, from purchase order to final settlement.
            </motion.p>

            {/* Capability chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-2 mb-8"
            >
              {heroStats.map((s) => (
                <span key={s} className="text-[11px] font-medium text-[#dbeeff] rounded-full px-3 py-1 border border-white/20 bg-white/[0.07]">
                  {s}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 items-start"
            >
              <Link href="/signin">
                <span className="bg-white text-[var(--chathams-blue)] px-8 py-2.5 rounded-xl font-bold hover:bg-[#dbeeff] transition-all shadow-lg cursor-pointer inline-block hover:scale-105 active:scale-95 text-sm">
                  Sign In
                </span>
              </Link>
              <a href="#modules">
                <span className="border border-[#b8ddf8]/60 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 text-sm">
                  Explore the platform <ArrowRight className="w-4 h-4" />
                </span>
              </a>
            </motion.div>
          </div>

          {/* Right: Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <DashboardPreview />
          </motion.div>

        </div>
      </div>

    </section>
  );
}
