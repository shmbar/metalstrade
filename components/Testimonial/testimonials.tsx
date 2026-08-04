'use client';

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import TestimonialCard from "./testimonial-card";

// Replace this with your **real testimonial content**
const testimonials = [
  {
    id: 1,
    name: "Hannah Schmitt",
    role: "Lead Designer",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    quote: "Hannah helped us transform our UI into something incredible, her creativity and attention to detail is unmatched."
  },
  {
    id: 2,
    name: "Sarah Johnson",
    role: "Product Manager",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    quote: "Sarah's leadership ensured our project was delivered on time with exceptional quality and attention to every detail."
  },
  {
    id: 3,
    name: "Michael Chen",
    role: "Tech Lead",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    quote: "Michael's technical expertise helped us overcome complex challenges and improve overall performance significantly."
  },
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 2000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const prevIdx = (activeIndex - 1 + testimonials.length) % testimonials.length;
  const nextIdx = (activeIndex + 1) % testimonials.length;

  return (
    <section className="py-20 bg-[var(--surface-card)] overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button onClick={prevSlide} className="p-2 hover:opacity-70">
            <ChevronLeft className="w-10 h-10 text-[var(--primary-bright)]" strokeWidth={2.5} />
          </button>

          <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary-bright)] text-center flex-1">
            What Our Clients Say About Us
          </h2>

          <button onClick={nextSlide} className="p-2 hover:opacity-70">
            <ChevronRight className="w-10 h-10 text-[var(--primary-bright)]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mb-16">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > activeIndex ? 1 : -1);
                setActiveIndex(idx);
              }}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex ? "w-3 h-3 bg-[var(--primary-bright)]" : "w-2.5 h-2.5 bg-[var(--primary-bright)] opacity-30"
              }`}
            />
          ))}
        </div>

        {/* Cards */}
        <div className="relative overflow-visible" style={{ minHeight: "420px", paddingTop: "60px" }}>
          <div className="flex items-stretch justify-center gap-8 relative px-4">
            <AnimatePresence mode="sync" initial={false}>
              {/* Previous Card */}
              <motion.div
                key={`prev-${testimonials[prevIdx].id}`}
                className="w-72 flex-shrink-0 hidden lg:block"
                initial={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
                animate={{ x: 0, opacity: 0.5 }}
                exit={{ x: direction > 0 ? -100 : 100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <TestimonialCard {...testimonials[prevIdx]} />
              </motion.div>

              {/* Active Card */}
              <motion.div
                key={`active-${testimonials[activeIndex].id}`}
                className="w-72 flex-shrink-0 relative z-10"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <TestimonialCard {...testimonials[activeIndex]} isActive />
              </motion.div>

              {/* Next Card */}
              <motion.div
                key={`next-${testimonials[nextIdx].id}`}
                className="w-72 flex-shrink-0 hidden lg:block"
                initial={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 0.5 }}
                exit={{ x: direction > 0 ? 100 : -100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <TestimonialCard {...testimonials[nextIdx]} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
