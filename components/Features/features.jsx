import { Activity, Command, TrendingUp, MousePointer2 } from "lucide-react";
import { motion } from "framer-motion";
import FeatureCard from "./feature-card";

/* The icon tiles used --danger-text / --warn-text / --teal-text as decorative
   fills. Those are STATUS tokens: they mean overdue, at-risk and settled
   everywhere else in the product, and spending them on a marketing icon is how
   a status palette stops meaning anything. Four steps down the brand ramp
   instead — same visual variety, no borrowed meaning. */
const features = [
  {
    icon: Activity,
    color: "bg-[var(--brand-deep)]",
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
    color: "bg-[var(--brand-strong)]",
    title: "Figures That Reconcile",
    description: "Dashboard, cashflow, reviews and statements all read the same records — from purchase order to final settlement, every number adds up."
  },
  {
    icon: MousePointer2,
    color: "bg-[var(--primary-bright)]",
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
          {/* Was "Everything you need to grow your business" — the third
              interchangeable promise on one page, after "Everything in One
              Platform" and "Built for Modern Metal Trading". This section is
              about the numbers being trustworthy, so it says that. */}
          <h2 className="responsiveTextDisplay text-[var(--on-brand)]">
            Built to be trusted with the numbers
          </h2>
          <p className="responsiveTextTitle text-[var(--on-brand-muted)] max-w-xl mx-auto mt-3">
            Reading documents is the easy part. Keeping every figure consistent across
            nine modules, several entities and two currencies is the hard part.
          </p>
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
