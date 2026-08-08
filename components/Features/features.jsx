import { Activity, Command, TrendingUp, MousePointer2 } from "lucide-react";
import { motion } from "framer-motion";
import FeatureCard from "./feature-card";

const features = [
  {
    icon: Activity,
    color: "bg-[var(--danger-text)]",
    title: "AI Autofill from PDF",
    description: "Supplier invoices, purchase confirmations and sales contracts read automatically — dates, amounts, materials and weights, in any format."
  },
  {
    icon: Command,
    color: "bg-[var(--endeavour)]",
    title: "Multi-Company, Multi-Currency",
    description: "Run several trading entities side by side with shared stock visibility, cross-company copies and consistent USD/EUR conversion."
  },
  {
    icon: TrendingUp,
    color: "bg-[var(--warn-text)]",
    title: "Figures That Reconcile",
    description: "Dashboard, cashflow, reviews and statements all read the same records — from purchase order to final settlement, every number adds up."
  },
  {
    icon: MousePointer2,
    color: "bg-[var(--teal-text)]",
    title: "Secure Access",
    description: "Per-user accounts with role restrictions, controlled sessions, and a full activity log of who changed what, when."
  }
];

export default function Features() {
  return (
    <section className="py-10 bg-[var(--brand-deep)]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="responsiveTextDisplay font-bold text-[var(--on-brand)] tracking-tight">
            Everything you need to grow your business
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              index={index}
              icon={feature.icon}
              color={feature.color}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
