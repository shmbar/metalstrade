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
      className="relative pt-20 md:pt-24 pb-10 md:pb-16 text-[var(--on-brand)] overflow-hidden"
      /* --brand-deep, not --chathams-blue: the latter is a TEXT token and the
         theme engine inverts it in dark mode, which flipped this hero light
         while its white text stayed white. */
      style={{ background: 'linear-gradient(160deg, var(--brand-deep) 0%, var(--brand-deep) 55%, var(--endeavour) 130%)' }}
    >
      {/* Ambient glow + grid, purely decorative */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, var(--primary-bright) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 right-0 w-[520px] h-[520px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--rock-blue) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(var(--on-brand) 1px, transparent 1px), linear-gradient(90deg, var(--on-brand) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      </div>

      <div className="container mx-auto px-8 md:px-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

          {/* Left: Text + Buttons */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 mb-5 border border-[var(--on-brand-soft-strong)] bg-[var(--on-brand-soft)] backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--on-brand-muted)]" />
              {/* --on-brand, not --bg-subtle: this hero is a DEEP surface in both
                  modes (see --brand-deep above), but --bg-subtle is a SURFACE
                  token — the theme engine turns it dark in dark mode, which put
                  near-black text on the violet hero. Everything painted on this
                  section has to come from the non-inverting --on-brand* family. */}
              <span className="responsiveText font-semibold tracking-wide uppercase text-[var(--on-brand)]">
                AI-powered IMS for metals &amp; alloys trading
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              /* .responsiveTextHeroXL, not .responsiveTextHero: the latter is the
                 rung for the ABOUT/FEATURES page headings, and using it here put
                 the homepage h1 at 30px/600 on a laptop — smaller and lighter
                 than a dashboard KPI. The XL rung carries font-extrabold, which
                 CLAUDE.md reserves for exactly this one headline. */
              className="responsiveTextHeroXL mb-5"
            >
              {/* The subject phrase is the one that should be brightest. A
                  background-clip gradient running muted → white put the FIRST
                  half of "metal trading" at 78% opacity, so the two emphasised
                  words rendered dimmer than the lead-in that qualifies them —
                  it read as a font that had failed to load. Muted lead-in,
                  solid subject: same emphasis, the right way round. */}
              <span className="text-[var(--on-brand-muted)]">The operating system for</span>{' '}
              metal trading
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              /* fontSize via the variable rather than a class: .responsiveTextPage
                 is the right RUNG for a hero lede but it @applies font-semibold,
                 which would fight the font-light this paragraph wants. CLAUDE.md
                 documents `fontSize: 'var(--fs-*)'` as the second way onto the
                 same ladder — it ramps at the same breakpoints, no weight baggage.
                 (`md:text-base` was a raw Tailwind size and off the ladder.) */
              style={{ fontSize: 'var(--fs-page)' }}
              className="text-[var(--on-brand-muted)] mb-6 leading-relaxed font-light max-w-xl"
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
                <span key={s} className="responsiveText font-medium text-[var(--on-brand)] rounded-lg px-3 py-1 border border-[var(--on-brand-soft-strong)] bg-[var(--on-brand-soft)]">
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
                {/* Same reasoning as the eyebrow: --bg-card/--chathams-blue are a
                    surface + text pair, so in dark mode this white button turned
                    into a dark one on a dark-violet hero. --on-brand stays white
                    and --brand-deep stays deep, in both modes. */}
                {/* Hero CTAs sit on the --fs-page rung, not --fs-title: at 13px
                    they read as app chrome next to a 52px headline. */}
                <span style={{ fontSize: 'var(--fs-page)' }} className="bg-[var(--on-brand)] text-[var(--brand-deep)] px-8 py-3 rounded-2xl font-bold hover:bg-[var(--on-brand-muted)] transition-all shadow-lg cursor-pointer inline-block hover:scale-105 active:scale-95">
                  Sign In
                </span>
              </Link>
              <a href="#modules">
                <span style={{ fontSize: 'var(--fs-page)' }} className="border border-[var(--on-brand-soft-strong)] text-[var(--on-brand)] px-8 py-3 rounded-2xl font-bold hover:bg-[var(--on-brand-soft)] transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95">
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
