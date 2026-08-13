'use client';

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Sparkline, Donut } from "./MiniCharts";
import { Button } from "@components/ui/button";

// Mock Data for Charts
const lineData = [
  { time: "10:30 AM", value: 30 },
  { time: "11:00 AM", value: 25 },
  { time: "11:30 AM", value: 45 },
  { time: "12:00 PM", value: 30 },
  { time: "12:30 PM", value: 55 },
  { time: "01:00 PM", value: 40 },
  { time: "01:30 PM", value: 65 },
  { time: "02:00 PM", value: 50 },
  { time: "02:30 PM", value: 70 },
];

const pieData = [
  { name: "Facebook", value: 36, color: "var(--warn-text)" },
  { name: "Others", value: 64, color: "rgba(var(--surface-card-rgb), 0.2)" },
];

export function PlatformCard2() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch relative min-h-[260px]">
      
      {/* Left: Real-Time Data Analytics */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-start space-y-3 py-4 lg:pl-4 h-full justify-start"
      >
        <div className="w-10 h-10 bg-[var(--endeavour)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--endeavour)]/20">
          <Clock className="w-5 h-5 text-[var(--on-brand)]" strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <h2 className="responsiveTextPage font-bold text-[var(--chathams-blue)] tracking-tight">
            Real-Time Analytics
          </h2>
          <p className="text-gray-500 leading-relaxed responsiveTextTitle">
            Monitor your platform performance and user engagement live. Gain actionable insights instantly 
            to optimize growth and decision-making.
          </p>
        </div>
        <Button className="bg-[var(--endeavour)] hover:bg-[var(--brand-deep)] text-[var(--on-brand)] px-4 py-2 rounded-lg responsiveTextTitle font-medium shadow-md shadow-[var(--endeavour)]/25 transition-transform hover:scale-105 cursor-pointer">
          Explore Features
        </Button>
      </motion.div>

      {/* Right: Financial Growth Chart */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="relative h-full w-full bg-[var(--bg-card)] rounded-card shadow-sm border border-slate-100/50 p-8 lg:pr-12"
      >
        {/* Floating Card - Financial Overview */}
        <div className="absolute -top-16 right-8 w-56 bg-[var(--endeavour)] text-[var(--on-brand)] p-5 rounded-3xl shadow-2xl shadow-blue-500/30 z-10">
          <div className="space-y-1 mb-4">
            <h3 className="responsiveTextTitle font-semibold opacity-90">Financial Growth</h3>
            <p className="responsiveTextTable opacity-70">Total platform revenue increased by 46%</p>
          </div>
          <div className="h-32 relative flex items-center justify-center">
            <Donut segments={pieData} innerRadius={38} outerRadius={48} />
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
              <span className="responsiveTextTable font-light opacity-70">Facebook</span>
              <span className="responsiveTextStat font-bold">36%</span>
            </div>
          </div>
        </div>

        {/* Main Line Chart */}
        <div className="h-full w-full pt-4">
          <Sparkline
            data={lineData}
            stroke="var(--endeavour)"
            strokeWidth={3}
            fill={true}
            gradientFrom="var(--endeavour)"
            gradientFromOpacity={0.05}
            gradientToOpacity={0}
          />
        </div>
        
        {/* X Axis Labels */}
        <div className="flex justify-between responsiveTextTable text-[var(--ink-muted)] mt-2 px-2 font-medium uppercase tracking-wider">
          <span>10:30 AM</span>
          <span>11:30 AM</span>
          <span>12:30 PM</span>
          <span>01:30 PM</span>
          <span>02:30 PM</span>
        </div>
      </motion.div>
    </div>
  );
}
