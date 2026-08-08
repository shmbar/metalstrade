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
      className={`relative bg-[var(--bg-card)] rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 ${
        isActive ? "p-8" : "p-6 opacity-70"
      }`}
      whileHover={isActive ? { y: -5, boxShadow: 'var(--shadow-lg)' } : {}}
    >
      <div className="flex flex-col items-center text-center">
        {/* Profile Image */}
        <div className={`rounded-full overflow-hidden border-4 border-[var(--bg-card)] shadow-lg mb-4 ${
          isActive ? "w-24 h-24" : "w-20 h-20"
        }`}>
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>

        {/* Name */}
        <h3 className={`font-bold text-[var(--brand)] ${isActive ? "text-xl" : "text-lg"} mb-1`}>
          {name}
        </h3>

        {/* Role */}
        <p className="text-gray-500 font-medium responsiveTextTitle mb-3">
          {role}
        </p>

        {/* Quote Icon */}
        <Quote className={`text-[var(--brand)] ${isActive ? "w-6 h-6" : "w-5 h-5"} mb-3`} />

        {/* Quote Text */}
        <p className={`text-gray-600 leading-relaxed ${isActive ? "responsiveTextTitle" : "responsiveTextInput"} line-clamp-6`}>
          {quote}
        </p>
      </div>
    </motion.div>
  );
}
