'use client';

import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Mock Data
const salesTrendData = [
  { name: 'Jan', blue: 30, yellow: 20 },
  { name: 'Feb', blue: 45, yellow: 35 },
  { name: 'Mar', blue: 40, yellow: 45 },
  { name: 'Apr', blue: 60, yellow: 30 },
  { name: 'May', blue: 55, yellow: 40 },
  { name: 'Jun', blue: 45, yellow: 35 },
];

const pieData = [
  { name: 'July', value: 62, color: '#0056D2' }, // Blue
  { name: 'August', value: 38, color: '#FFC107' }, // Yellow
];

export function PlatformCard1() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative h-full py-4 lg:pr-4"
    >
      {/* Browser Window Frame */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100/50 relative overflow-visible">
        
        {/* Window Controls (Dots) */}
        <div className="flex space-x-2 mb-8 absolute top-8 left-8">
          <div className="w-3 h-3 rounded-full bg-[#C084FC]" /> {/* Purple */}
          <div className="w-3 h-3 rounded-full bg-[#FFC107]" /> {/* Yellow */}
          <div className="w-3 h-3 rounded-full bg-[#2DD4BF]" /> {/* Teal */}
        </div>

        {/* Floating Blue Card (Top Right) */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute -top-12 right-12 bg-[var(--endeavour)] w-48 h-32 rounded-2xl shadow-xl shadow-[var(--endeavour)]/20 flex flex-col justify-center px-6 space-y-3 z-10"
        >
          <div className="w-2/3 h-2 bg-white/90 rounded-full" />
          <div className="w-full h-2 bg-white/40 rounded-full" />
          <div className="w-5/6 h-2 bg-white/40 rounded-full" />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-8 mt-8">
          {/* Sales Trend Column */}
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Sales trend</p>
              <h3 className="text-3xl font-bold text-[var(--port-gore)]">68%</h3>
            </div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0056D2" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#0056D2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="blue" 
                    stroke="#0056D2" 
                    strokeWidth={2.5} 
                    fill="url(#gradBlue)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="yellow" 
                    stroke="#FFC107" 
                    strokeWidth={2.5} 
                    fill="transparent" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Fake lines to match design look */}
            <div className="space-y-2 pt-2">
               <div className="h-1.5 w-16 bg-gray-100 rounded-full" />
               <div className="h-1.5 w-full bg-gray-50 rounded-full" />
            </div>
          </div>

          {/* Pie Chart Column */}
          <div className="flex flex-col items-center justify-end pb-2">
            <div className="h-24 w-24 relative mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={0}
                    outerRadius={40}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex space-x-6 w-full justify-center">
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--port-gore)]">62%</p>
                <p className="text-xs text-gray-400">July</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--port-gore)]">38%</p>
                <p className="text-xs text-gray-400">August</p>
              </div>
            </div>

            {/* Fake lines */}
            <div className="space-y-2 pt-4 w-full">
               <div className="h-1.5 w-full bg-gray-50 rounded-full" />
               <div className="h-1.5 w-2/3 mx-auto bg-gray-50 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
