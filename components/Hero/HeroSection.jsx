"use client";
import { motion } from "framer-motion";

export default function HeroSection({ title, subtitle }) {
  return (
    <section className="relative text-white overflow-hidden flex items-center justify-center py-12 md:py-16"
      style={{ background: 'var(--chathams-blue)' }}>

      <div className="container px-8 md:px-16 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
