'use client';

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
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
  { name: "Facebook", value: 36, color: "#FFC107" },
  { name: "Others", value: 64, color: "rgba(255,255,255,0.2)" },
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
        <div className="w-10 h-10 bg-[var(--endeavour)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--endeavour)]/20">
          <Clock className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-bold text-[var(--chathams-blue)] tracking-tight">
            Real-Time Analytics
          </h2>
          <p className="text-gray-500 leading-relaxed text-sm">
            Monitor your platform performance and user engagement live. Gain actionable insights instantly 
            to optimize growth and decision-making.
          </p>
        </div>
        <Button className="bg-[var(--endeavour)] hover:bg-[var(--port-gore)] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-[var(--endeavour)]/25 transition-transform hover:scale-105 cursor-pointer">
          Explore Features
        </Button>
      </motion.div>

      {/* Right: Financial Growth Chart */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="relative h-full w-full bg-white rounded-[2rem] shadow-sm border border-slate-100/50 p-8 lg:pr-12"
      >
        {/* Floating Card - Financial Overview */}
        <div className="absolute -top-16 right-8 w-56 bg-[var(--endeavour)] text-white p-5 rounded-3xl shadow-2xl shadow-blue-500/30 z-10">
          <div className="space-y-1 mb-4">
            <h3 className="text-sm font-semibold opacity-90">Financial Growth</h3>
            <p className="text-[10px] opacity-70">Total platform revenue increased by 46%</p>
          </div>
          <div className="h-32 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={38}
                  outerRadius={48}
                  paddingAngle={0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
              <span className="text-[10px] font-light opacity-70">Facebook</span>
              <span className="text-xl font-bold">36%</span>
            </div>
          </div>
        </div>

        {/* Main Line Chart */}
        <div className="h-full w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--endeavour)" stopOpacity={0.05}/>
                  <stop offset="95%" stopColor="var(--endeavour)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--endeavour)" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                dot={{ r: 4, fill: "var(--endeavour)", strokeWidth: 2, stroke: "white" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* X Axis Labels */}
        <div className="flex justify-between text-[10px] text-gray-300 mt-2 px-2 font-medium uppercase tracking-wider">
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
