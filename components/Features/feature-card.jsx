import { motion } from "framer-motion";

export default function FeatureCard({ icon: Icon, color, title, description, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6 }}
      className="bg-white rounded-2xl p-6 border border-[#b8ddf8] shadow-sm hover:shadow-md hover:border-[var(--endeavour)] transition-all h-full flex flex-col items-start text-left"
    >
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 shadow-sm`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      <h3 className="text-[var(--chathams-blue)] font-bold text-base mb-2">
        {title}
      </h3>

      <p className="text-slate-500 text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
