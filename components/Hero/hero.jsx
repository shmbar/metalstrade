import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import DashboardPreview from "./dashboard-preview";

export default function Hero() {
  return (
    <section
      className="relative pt-20 md:pt-24 pb-6 md:pb-12 text-white overflow-hidden"
      style={{ background: 'var(--chathams-blue)' }}
    >
      <div className="container mx-auto px-8 md:px-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

          {/* Left: Text + Buttons */}
          <div className="text-left">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight tracking-tight"
            >
              Advanced Metal Trading<br />Operations & Logistics Platform
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs sm:text-sm md:text-base text-[#dbeeff] mb-8 leading-relaxed font-light"
            >
              A complete digital system designed for metal traders to manage contracts, logistics, pricing,
              inventory, and financial documentation — all in one powerful dashboard with real-time accuracy.
            </motion.p>

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
              <a href="mailto:contact@metalstrade.com">
                <span className="border border-[#b8ddf8] text-white px-8 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 text-sm">
                  Contact Us <ArrowRight className="w-4 h-4" />
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
