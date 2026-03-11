'use client';

import { motion } from "framer-motion";
import { Monitor } from "lucide-react";
import { SectionHeader } from "./section-header";

export function PlatformContact() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col justify-between py-4 lg:pl-4 h-full"
    >
      <SectionHeader
        icon={Monitor}
        title="Cross-Platform Reach"
        description="Connect and monitor your applications seamlessly across web, mobile, and desktop platforms. 
                     Gain actionable insights with real-time analytics and performance metrics."
      />
    </motion.div>
  );
}
