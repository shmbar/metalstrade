// import { BarChart3, TrendingUp, MoreHorizontal } from "lucide-react";
// import { motion, Variants } from "framer-motion";

// export default function DashboardPreview() {
//   // Animation variants
//   const containerVariants = {    hidden: { opacity: 0 },
//     visible: { 
//       opacity: 1,
//       transition: { 
//         staggerChildren: 0.1,
//         delayChildren: 0.2
//       }
//     }
//   };

//   const itemVariants = {
//     hidden: { y: 20, opacity: 0 },
//     visible: { 
//       y: 0, 
//       opacity: 1,
//        transition: { type: "spring", stiffness: 100, damping: 10 }
//     }
//   };

//   const chartPathVariants = {

//     hidden: { pathLength: 0, opacity: 0 },
//     visible: { 
//       pathLength: 1, 
//       opacity: 1,
//          transition: { type: "spring", stiffness: 100, damping: 10 }
//     }
//   };

//   return (
//     <div className="relative max-w-6xl mx-auto perspective-1000">
//        {/* Glass Container */}
//       <motion.div 
//         initial={{ rotateX: 10, opacity: 0, y: 50 }}
//         animate={{ rotateX: 0, opacity: 1, y: 0 }}
//         transition={{ duration: 0.8, ease: "easeOut" }}
//         className="relative rounded-3xl p-3 bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl"
//       >
        
//         {/* Inner White Dashboard */}
//         <div className="bg-[#F8FAFC] rounded-2xl overflow-hidden shadow-inner">
//           {/* Header/URL Bar */}
//           <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white">
//             <div className="flex gap-2">
//               <div className="w-2.5 h-2.5 rounded-full bg-gray-300/80"></div>
//               <div className="w-2.5 h-2.5 rounded-full bg-gray-300/80"></div>
//               <div className="w-2.5 h-2.5 rounded-full bg-gray-300/80"></div>
//             </div>
//             <div className="flex-1 max-w-3xl mx-auto">
//               <div className="bg-gray-100/50 px-4 py-2 rounded-lg text-xs text-gray-400 flex items-center justify-center font-medium font-mono">
//                 www.saas.com/users
//               </div>
//             </div>
//           </div>

//           {/* Dashboard Content Area */}
//           <motion.div 
//             variants={containerVariants}
//             initial="hidden"
//             animate="visible"
//             className="p-8"
//           >
            
//             {/* Top Stats Row */}
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
//               {/* Stat 1: All Traffic */}
//               <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-center h-20 cursor-default transition-shadow hover:shadow-lg">
//                 <div className="flex items-start justify-between mb-2">
//                     <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
//                         <TrendingUp className="w-4 h-4" />
//                     </div>
//                 </div>
//                 <div>
//                     <p className="text-gray-400 text-xs font-medium mb-1">All Traffic</p>
//                     <p className="text-xl font-bold text-gray-900">574.34k</p>
//                 </div>
//               </motion.div>

//               {/* Stat 2: Spent this month */}
//               <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-center h-20 cursor-default transition-shadow hover:shadow-lg">
//                 <div className="flex items-start justify-between w-full">
//                     <div>
//                         <p className="text-gray-400 text-xs font-medium mb-1">Spent this month</p>
//                         <p className="text-xl font-bold text-gray-900">$682.5</p>
//                     </div>
//                     <div className="flex items-end gap-1 h-6">
//                          <motion.div initial={{ height: 0 }} animate={{ height: "50%" }} transition={{ delay: 0.5 }} className="w-1 bg-blue-200 rounded-full"></motion.div>
//                          <motion.div initial={{ height: 0 }} animate={{ height: "70%" }} transition={{ delay: 0.6 }} className="w-1 bg-blue-300 rounded-full"></motion.div>
//                          <motion.div initial={{ height: 0 }} animate={{ height: "40%" }} transition={{ delay: 0.7 }} className="w-1 bg-blue-200 rounded-full"></motion.div>
//                          <motion.div initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ delay: 0.8 }} className="w-1 bg-blue-500 rounded-full"></motion.div>
//                          <motion.div initial={{ height: 0 }} animate={{ height: "60%" }} transition={{ delay: 0.9 }} className="w-1 bg-blue-300 rounded-full"></motion.div>
//                     </div>
//                 </div>
//               </motion.div>

//               {/* Stat 3: Chart Icon */}
//               <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex items-center justify-center h-28 cursor-default transition-shadow hover:shadow-lg">
//                 <div className="text-blue-400">
//                     <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                       <rect x="3" y="3" width="7" height="7"></rect>
//                       <rect x="14" y="3" width="7" height="7"></rect>
//                       <rect x="14" y="14" width="7" height="7"></rect>
//                       <rect x="3" y="14" width="7" height="7"></rect>
//                     </svg>
//                 </div>
//               </motion.div>

//               {/* Stat 4: Earnings */}
//               <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-center h-20 cursor-default transition-shadow hover:shadow-lg">
//                 <p className="text-gray-400 text-xs font-medium mb-1">Earnings</p>
//                 <p className="text-xl font-bold text-gray-900">$350.40</p>
//               </motion.div>
//             </div>

//             {/* Bottom Section */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
//               {/* Left Column */}
//               <div className="space-y-4">
//                 {/* Blue Credit Balance Card */}
//                 <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="bg-[#0066FF] text-white p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-blue-500/20 h-[90px] flex flex-col justify-between cursor-pointer">
//                     <div className="flex justify-between items-start z-10 relative">
//                         <div>
//                             <p className="text-blue-100 text-xs font-medium mb-1">Credit Balance</p>
//                             <p className="text-3xl font-bold tracking-tight">$25,215</p>
//                         </div>
//                         <MoreHorizontal className="text-blue-200 opacity-70 w-4 h-4" />
//                     </div>
                    
//                     {/* Decorative Wave inside blue card */}
//                     <div className="absolute bottom-0 right-0 w-32 h-14 opacity-40">
//                         <svg viewBox="0 0 100 50" className="w-full h-full text-white fill-none stroke-current stroke-2">
//                             <motion.path 
//                               d="M0,30 Q25,10 50,30 T100,20" 
//                               initial={{ pathLength: 0 }}
//                               animate={{ pathLength: 1 }}
//                               transition={{ duration: 2, ease: "easeInOut" }}
//                             />
//                         </svg>
//                     </div>
//                 </motion.div>

//                 {/* Recent Stats List */}
//                 <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
//                     <p className="text-gray-600 text-xs mb-4 font-bold uppercase">Recent</p>
//                     <div className="space-y-4">
//                          <motion.div whileHover={{ x: 3 }} className="flex justify-between items-center text-sm group cursor-pointer">
//                             <span className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Profit</span>
//                             <span className="font-bold text-gray-900">125k</span>
//                           </motion.div>
//                           <motion.div whileHover={{ x: 3 }} className="flex justify-between items-center text-sm group cursor-pointer">
//                             <span className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Sales</span>
//                             <span className="font-bold text-gray-900">100K</span>
//                           </motion.div>
//                           <motion.div whileHover={{ x: 3 }} className="flex justify-between items-center text-sm group cursor-pointer">
//                             <span className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Cost</span>
//                             <span className="font-bold text-gray-900">110K</span>
//                           </motion.div>
//                     </div>
//                 </motion.div>
//               </div>

//               {/* Right Column: Main Chart - Spans 2 columns */}
//               <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
//                  <div className="flex justify-between items-start mb-4">
//                   <div>
//                     <p className="text-xs text-gray-400 font-medium mb-2">This month earnings</p>
//                     <p className="text-4xl font-bold text-gray-900 tracking-tight">$801.5</p>
//                     <div className="flex items-center gap-1 mt-2">
//                         <span className="text-emerald-400 text-sm font-bold">+2.45%</span>
//                     </div>
//                   </div>
//                   <BarChart3 className="text-gray-200 w-5 h-5" />
//                 </div>

//                 {/* Smooth Wave Chart */}
//                 <div className="mt-auto h-24 w-full">
//                      <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
//                         <defs>
//                             <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
//                             <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1"/>
//                             <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0"/>
//                             </linearGradient>
//                         </defs>
//                         <motion.path
//                             d="M0,120 C50,120 80,100 100,80 S150,60 180,100 S250,130 300,80 S350,50 400,70"
//                             fill="none"
//                             stroke="#0ea5e9"
//                             strokeWidth="3"
//                             strokeLinecap="round"
//                             variants={chartPathVariants}
//                         />
//                         <motion.path
//                             d="M0,120 C50,120 80,100 100,80 S150,60 180,100 S250,130 300,80 S350,50 400,70 L400,150 L0,150 Z"
//                             fill="url(#chartGradient)"
//                             initial={{ opacity: 0 }}
//                             animate={{ opacity: 1 }}
//                             transition={{ duration: 1, delay: 1 }}
//                         />
//                     </svg>
//                 </div>
//               </motion.div>

//             </div>
//           </motion.div>
//         </div>
//       </motion.div>
//     </div>
//   );
// }
import { BarChart3, TrendingUp, MoreHorizontal } from "lucide-react";
import { motion, Variants } from "framer-motion";

export default function DashboardPreview() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 10 }
    }
  };

  const chartPathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 10 }
    }
  };

  return (
    <div className="relative max-w-6xl mx-auto perspective-1000">
      {/* Glass Container */}
      <motion.div 
        initial={{ rotateX: 10, opacity: 0, y: 50 }}
        animate={{ rotateX: 0, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative rounded-3xl p-3 bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl"
      >
        {/* Inner White Dashboard */}
        <div className="bg-[#F8FAFC] rounded-2xl overflow-hidden shadow-inner">
          {/* Header/URL Bar */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-white">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300/80"></div>
            </div>
            <div className="flex-1 max-w-3xl mx-auto">
              <div className="bg-gray-100/50 px-4 py-2 rounded-lg text-xs text-gray-400 flex items-center justify-center font-medium font-mono">
                www.ims-tech.com/dashboard
              </div>
            </div>
          </div>

          {/* Dashboard Content Area */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="p-4"
          >
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Stat 1: Total Transactions */}
              <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-center h-20 cursor-default transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between mb-2">
                          <div className="w-9 h-9 rounded-full bg-[var(--rock-blue)] flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[var(--endeavour)]" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-1">Total Transactions</p>
                  <p className="text-xl font-bold text-gray-900">1,245</p>
                </div>
              </motion.div>

              {/* Stat 2: Revenue This Month */}
              <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-center h-20 cursor-default transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between w-full">
                  <div>
                    <p className="text-gray-400 text-xs font-medium mb-1">Revenue This Month</p>
                    <p className="text-xl font-bold text-gray-900">$25,450</p>
                  </div>
                  <div className="flex items-end gap-1 h-6">
                    <motion.div initial={{ height: 0 }} animate={{ height: "50%" }} transition={{ delay: 0.5 }} className="w-1 bg-blue-200 rounded-full"></motion.div>
                    <motion.div initial={{ height: 0 }} animate={{ height: "70%" }} transition={{ delay: 0.6 }} className="w-1 bg-blue-300 rounded-full"></motion.div>
                    <motion.div initial={{ height: 0 }} animate={{ height: "40%" }} transition={{ delay: 0.7 }} className="w-1 bg-blue-200 rounded-full"></motion.div>
                    <motion.div initial={{ height: 0 }} animate={{ height: "100%" }} transition={{ delay: 0.8 }} className="w-1 bg-blue-500 rounded-full"></motion.div>
                    <motion.div initial={{ height: 0 }} animate={{ height: "60%" }} transition={{ delay: 0.9 }} className="w-1 bg-blue-300 rounded-full"></motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Stat 3: Chart Icon */}
              <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex items-center justify-center h-28 cursor-default transition-shadow hover:shadow-lg">
                <div className="text-blue-400">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </div>
              </motion.div>

              {/* Stat 4: Net Profit */}
              <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-center h-20 cursor-default transition-shadow hover:shadow-lg">
                <p className="text-gray-400 text-xs font-medium mb-1">Net Profit</p>
                  <p className="text-xl font-bold text-[var(--endeavour)]">$18,200</p>
              </motion.div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Blue Account Balance Card */}
                <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="bg-[var(--endeavour)] text-white p-6 rounded-2xl relative overflow-hidden shadow-lg shadow-[var(--endeavour)]/20 h-[90px] flex flex-col justify-between cursor-pointer">
                  <div className="flex justify-between items-start z-10 relative">
                    <div>
                             <p className="text-[var(--rock-blue)] text-xs font-medium mb-1">Account Balance</p>
                      <p className="text-3xl font-bold tracking-tight">$45,750</p>
                    </div>
                    <MoreHorizontal className="text-[var(--selago)] opacity-70 w-4 h-4" />
                  </div>
                  
                  {/* Decorative Wave inside blue card */}
                  <div className="absolute bottom-0 right-0 w-32 h-14 opacity-40">
                    <svg viewBox="0 0 100 50" className="w-full h-full text-white fill-none stroke-current stroke-2">
                      <motion.path 
                        d="M0,30 Q25,10 50,30 T100,20" 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                      />
                    </svg>
                  </div>
                </motion.div>

                {/* Recent Stats List */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                  <p className="text-gray-600 text-xs mb-4 font-bold uppercase">Recent</p>
                  <div className="space-y-4">
                    <motion.div whileHover={{ x: 3 }} className="flex justify-between items-center text-sm group cursor-pointer">
                      <span className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Profit</span>
                      <span className="font-bold text-gray-900">$12,500</span>
                    </motion.div>
                    <motion.div whileHover={{ x: 3 }} className="flex justify-between items-center text-sm group cursor-pointer">
                      <span className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Sales</span>
                      <span className="font-bold text-gray-900">420 Units</span>
                    </motion.div>
                    <motion.div whileHover={{ x: 3 }} className="flex justify-between items-center text-sm group cursor-pointer">
                      <span className="text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Cost</span>
                      <span className="font-bold text-gray-900">$8,900</span>
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Main Chart */}
              <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-50 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2">This Month Revenue</p>
                    <p className="text-4xl font-bold text-gray-900 tracking-tight">$32,400</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-emerald-400 text-sm font-bold">+4.2%</span>
                    </div>
                  </div>
                  <BarChart3 className="text-gray-200 w-5 h-5" />
                </div>

                {/* Smooth Wave Chart */}
                <div className="mt-auto h-24 w-full">
                  <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1"/>
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M0,120 C50,120 80,100 100,80 S150,60 180,100 S250,130 300,80 S350,50 400,70"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="3"
                      strokeLinecap="round"
                      variants={chartPathVariants}
                    />
                    <motion.path
                      d="M0,120 C50,120 80,100 100,80 S150,60 180,100 S250,130 300,80 S350,50 400,70 L400,150 L0,150 Z"
                      fill="url(#chartGradient)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 1 }}
                    />
                  </svg>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
