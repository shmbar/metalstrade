'use client';

import { Quote } from "lucide-react";
import { motion } from "framer-motion";

interface TestimonialCardProps {
  name: string;
  role: string;
  image: string;
  quote: string;
  isActive?: boolean;
}

export default function TestimonialCard({ name, role, image, quote, isActive = false }: TestimonialCardProps) {
  return (
    <motion.div
      className={`relative bg-[var(--surface-card)] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 ${
        isActive ? "p-8" : "p-6 opacity-70"
      }`}
      whileHover={isActive ? { y: -5, boxShadow: "0 20px 40px rgba(0,86,210,0.25)" } : {}}
    >
      <div className="flex flex-col items-center text-center">
        {/* Profile Image */}
        <div className={`rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 ${
          isActive ? "w-24 h-24" : "w-20 h-20"
        }`}>
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>

        {/* Name */}
        <h3 className={`font-bold text-[var(--primary-bright)] ${isActive ? "text-xl" : "text-lg"} mb-1`}>
          {name}
        </h3>

        {/* Role */}
        <p className={`text-gray-500 font-medium ${isActive ? "text-sm" : "text-xs"} mb-3`}>
          {role}
        </p>

        {/* Quote Icon */}
        <Quote className={`text-[var(--primary-bright)] ${isActive ? "w-6 h-6" : "w-5 h-5"} mb-3`} />

        {/* Quote Text */}
        <p className={`text-gray-600 leading-relaxed ${isActive ? "text-sm" : "text-xs"} line-clamp-6`}>
          {quote}
        </p>
      </div>
    </motion.div>
  );
}
