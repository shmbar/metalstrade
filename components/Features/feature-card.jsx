import { motion } from "framer-motion";

export default function FeatureCard({ icon: Icon, color, title, description, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6 }}
      className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--line)] shadow-sm hover:shadow-md hover:border-[var(--endeavour)] transition-all h-full flex flex-col items-start text-left"
    >
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4 shadow-sm`}>
        <Icon className="w-6 h-6 text-[var(--on-brand)]" />
      </div>

      <h3 className="text-[var(--chathams-blue)] font-bold responsiveTextPage mb-2">
        {title}
      </h3>

      {/* --ink-secondary, not text-slate-500: slate is a raw Tailwind colour
          that never inverts, so it stayed mid-grey on the dark card. */}
      <p className="text-[var(--ink-secondary)] responsiveTextTitle leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
