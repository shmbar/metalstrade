import { Activity, Command, TrendingUp, MousePointer2 } from "lucide-react";
import { motion } from "framer-motion";
import FeatureCard from "./feature-card";

const features = [
  {
    icon: Activity,
    color: "bg-[#FF5555]",
    title: "Quick Onboarding",
    description: "Get started in minutes with our intuitive and easy-to-use setup."
  },
  {
    icon: Command,
    color: "bg-[var(--endeavour)]",
    title: "Bank-Grade Security",
    description: "Your data is fully encrypted and secured with industry-leading standards."
  },
  {
    icon: TrendingUp,
    color: "bg-[#F59E0B]",
    title: "Advanced Analytics",
    description: "Track performance, visualize trends, and make data-driven decisions."
  },
  {
    icon: MousePointer2,
    color: "bg-[#14B8A6]",
    title: "Global Reach",
    description: "Expand your operations with actionable insights from multiple locations."
  }
];

export default function Features() {
  return (
    <section className="py-10 bg-[var(--chathams-blue)]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
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
