// 'use client';

// import Navbar from '@components/Navbar/navbar';
// import Footer from '@components/Footer/footer';

// export default function AboutPage() {
//   return (
//     <div className="w-full">
//       <Navbar />
//       <main className="pt-24">
//         {/* Hero Section */}
//         <section className="py-20 bg-blue-600 text-white">
//           <div className="container mx-auto px-4 text-center">
//             <h1 className="text-5xl font-bold mb-4">About MetalsTrade</h1>
//             <p className="text-xl text-blue-100">
//               Revolutionizing the metal trade industry with innovative solutions
//             </p>
//           </div>
//         </section>

//         {/* Mission Section */}
//         <section className="py-20 bg-white">
//           <div className="container mx-auto px-4">
//             <div className="grid md:grid-cols-2 gap-12 items-center">
//               <div>
//                 <h2 className="text-4xl font-bold mb-6">Our Mission</h2>
//                 <p className="text-gray-600 text-lg mb-4">
//                   We believe that technology should simplify business operations, not complicate them.
//                 </p>
//                 <p className="text-gray-600 text-lg mb-4">
//                   MetalsTrade was founded with a mission to provide metal trade companies with a
//                   comprehensive, easy-to-use platform that handles all aspects of their business.
//                 </p>
//                 <p className="text-gray-600 text-lg">
//                   From contracts to invoices, expenses to inventory—we've got you covered.
//                 </p>
//               </div>
//               <div className="bg-blue-100 rounded-xl h-96 flex items-center justify-center">
//                 <div className="text-center">
//                   <svg
//                     className="w-20 h-20 mx-auto mb-4 text-[var(--endeavour)] opacity-50"
//                     fill="none"
//                     stroke="currentColor"
//                     viewBox="0 0 24 24"
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       strokeWidth={2}
//                       d="M13 10V3L4 14h7v7l9-11h-7z"
//                     />
//                   </svg>
//                   <p className="text-[var(--endeavour)] opacity-75">Innovation</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Values Section */}
//         <section className="py-20 bg-gray-50">
//           <div className="container mx-auto px-4">
//             <h2 className="text-4xl font-bold text-center mb-16">Our Values</h2>
//             <div className="grid md:grid-cols-3 gap-8">
//               {[
//                 {
//                   title: 'Innovation',
//                   description: 'We continuously innovate to provide cutting-edge solutions.',
//                 },
//                 {
//                   title: 'Reliability',
//                   description: 'Our platform is built to be stable, secure, and always available.',
//                 },
//                 {
//                   title: 'Customer Focus',
//                   description: 'Your success is our success. We prioritize your needs.',
//                 },
//               ].map((value, index) => (
//                 <div key={index} className="bg-white p-8 rounded-xl shadow-lg">
//                   <h3 className="text-2xl font-bold mb-4">{value.title}</h3>
//                   <p className="text-gray-600">{value.description}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>

//         {/* Team Section */}
//         <section className="py-20 bg-white">
//           <div className="container mx-auto px-4">
//             <h2 className="text-4xl font-bold text-center mb-16">Our Team</h2>
//             <div className="grid md:grid-cols-4 gap-8">
//               {[
//                 { name: 'John Doe', role: 'CEO & Founder' },
//                 { name: 'Sarah Smith', role: 'CTO' },
//                 { name: 'Mike Johnson', role: 'Lead Developer' },
//                 { name: 'Emma Brown', role: 'Product Manager' },
//               ].map((member, index) => (
//                 <div key={index} className="text-center">
//                   <div className="bg-gradient-to-br from-blue-600 to-blue-800 w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center">
//                     <svg
//                       className="w-16 h-16 text-white"
//                       fill="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
//                     </svg>
//                   </div>
//                   <h3 className="text-xl font-bold">{member.name}</h3>
//                   <p className="text-gray-600">{member.role}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>
//       </main>
//       <Footer />
//     </div>
//   );
// }
'use client';
import { motion } from "framer-motion";
import { Users, Shield, Target, TrendingUp, Award, Globe, BarChart,Rocket,Handshake,Headphones,BarChart3 } from "lucide-react";
 import Navbar from '../../../components/Navbar/navbar';
 import Footer from '../../../components/Footer/footer';
 import HeroSection from "../../../components/Hero/HeroSection";

export default function AboutPage() {
  return (
    <div className="w-full bg-white min-h-screen font-sans text-foreground">
      {/* Navbar Placeholder if needed - assuming layout handles it or user adds it */}
       <Navbar />
      <main className="pt-15">
     <HeroSection
  title="About MetalsTrade"
  subtitle="Revolutionizing the metal trade industry with precision, innovation, and comprehensive solutions."
/>

     {/* Mission Section */}
<section className="py-12 bg-white relative z-10">
  <div className="container mx-auto px-4">
    <div className="grid md:grid-cols-2 gap-16 items-center">

      {/* LEFT — Text */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-[var(--chathams-blue)] mb-6">Our Mission</h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-4">
          We believe technology should simplify metal trading — not complicate it.
          MetalsTrade was built to streamline trade operations end-to-end.
        </p>
        <p className="text-lg text-gray-600 leading-relaxed">
          From real-time expense tracking, smart invoicing, contract automation, inventory
          optimization, and analytics — we provide the infrastructure for the future of metal trade.
        </p>
      </motion.div>

      {/* RIGHT — Multi-Layer Animated Mission Graphic */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative h-[460px] bg-white border border-gray-200 rounded-3xl shadow-lg shadow-blue-900/5 flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--selago)]/60 to-transparent"></div>

        <div className="relative z-10 w-72 h-72">

          {/* OUTER CIRCLE */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-16 border border-blue-200/70 rounded-full"
          >
            {/* OUTER ICONS */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--endeavour)] text-white p-3 rounded-xl shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[var(--endeavour)] text-white p-3 rounded-xl shadow-md">
              <Globe className="w-6 h-6" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-[var(--endeavour)] text-white p-3 rounded-xl shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-[var(--endeavour)] text-white p-3 rounded-xl shadow-md">
              <BarChart className="w-6 h-6" />
            </div>
          </motion.div>

          {/* MIDDLE CIRCLE */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-[var(--rock-blue)] rounded-full"
          >
            {/* MIDDLE ICONS */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-[var(--endeavour)] p-2 rounded-full shadow">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white text-[var(--endeavour)] p-2 rounded-full shadow">
              <Shield className="w-5 h-5" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-white text-[var(--endeavour)] p-2 rounded-full shadow">
              <Award className="w-5 h-5" />
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white text-[var(--endeavour)] p-2 rounded-full shadow">
              <Handshake className="w-5 h-5" />
            </div>
          </motion.div>

          {/* INNER CORE */}
          <div className="absolute inset-10 bg-white rounded-full shadow-xl flex items-center justify-center">
            <Target className="w-20 h-20 text-[var(--endeavour)]" strokeWidth={1.8} />
          </div>

        </div>
      </motion.div>

    </div>
  </div>
</section>



       {/* Values Section */}
<section className="py-12 bg-[#e3f3ff] relative z-10">
  <div className="container mx-auto px-4">

    {/* Header */}
    <div className="text-center max-w-3xl mx-auto mb-10">
      <h2 className="text-3xl font-bold text-[var(--chathams-blue)] mb-4">Core Values</h2>
      <p className="text-gray-600 text-lg leading-relaxed">
        Principles that drive our culture, our decisions, and the experiences we create.
      </p>
    </div>

    {/* Values Grid */}
    <div className="grid md:grid-cols-3 gap-10">
      {[
        {
          icon: Globe,
          title: 'Global Innovation',
          description:
            'We push beyond conventional boundaries to deliver advanced, scalable, and global-first technological solutions.',
        },
        {
          icon: Shield,
          title: 'Unwavering Reliability',
          description:
            'Our platform is engineered for consistency, security, and unmatched reliability with 99.9% uptime guarantees.',
        },
        {
          icon: Users,
          title: 'Customer Obsession',
          description:
            'Your success drives every product decision we make. We constantly evolve from real customer insights.',
        },
      ].map((value, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="group relative p-8 rounded-2xl bg-white border border-[#b8ddf8] shadow-sm
                     hover:shadow-md hover:border-[var(--endeavour)] transition-all duration-300 overflow-hidden"
        >

          {/* Glow Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[var(--endeavour)] transition-opacity duration-300"></div>

          {/* Icon Wrapper */}
          <div className="relative z-10 w-16 h-16 mb-6 flex items-center justify-center rounded-2xl bg-[var(--selago)] 
                          shadow-md group-hover:bg-[var(--endeavour)] transition-all duration-300">
            <value.icon className="w-8 h-8 text-[var(--endeavour)] group-hover:text-white transition-colors duration-300" />
          </div>

          {/* Content */}
          <h3 className="text-lg font-bold text-[var(--chathams-blue)] group-hover:text-[var(--endeavour)] transition-colors duration-300 mb-3">
            {value.title}
          </h3>
          <p className="text-gray-600 leading-relaxed relative z-10">
            {value.description}
          </p>
        </motion.div>
      ))}
    </div>
  </div>
</section>


       {/* Why Choose Us Section */}
<section className="py-12 bg-white">
  <div className="container mx-auto px-4">

    {/* Heading */}
    <div className="text-center max-w-3xl mx-auto mb-10">
      <h2 className="text-3xl font-bold text-[var(--chathams-blue)] mb-4">
        Why Businesses Choose Us
      </h2>
      <p className="text-gray-500 text-lg">
        Trusted by global organizations for unmatched performance,
        intelligent automation, and enterprise-grade scalability.
      </p>
    </div>

    {/* 4 Feature Cards */}
    <div className="grid md:grid-cols-4 gap-8">
      
      {[
        {
          title: "Faster Deployment",
          description:
            "Our optimized workflows reduce integration time and accelerate your business operations.",
          icon: Rocket
        },
        {
          title: "Enterprise Security",
          description:
            "Advanced encryption, secure protocols, and continuous monitoring for maximum protection.",
          icon: Shield
        },
        {
          title: "24/7 Expert Support",
          description:
            "Our dedicated engineering team is always available to resolve issues and guide your growth.",
          icon: Headphones
        },
        {
          title: "Smart Analytics",
          description:
            "Gain real-time insights with intelligent dashboards built to support data-driven decisions.",
          icon: BarChart3
        }
      ].map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="bg-[#f8fbff] p-6 rounded-2xl border border-[#b8ddf8] shadow-sm hover:shadow-md hover:border-[var(--endeavour)] hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-[var(--selago)] mb-5 group-hover:bg-[var(--endeavour)] transition-colors duration-300">
            <item.icon className="w-7 h-7 text-[var(--endeavour)] group-hover:text-white transition-all duration-300" />
          </div>

          <h3 className="text-base font-bold text-[var(--chathams-blue)] mb-2 group-hover:text-[var(--endeavour)] transition-colors duration-300">
            {item.title}
          </h3>

          <p className="text-gray-500 leading-relaxed">
            {item.description}
          </p>
        </motion.div>
      ))}
    </div>
  </div>
</section>

      </main>
       <Footer />
    </div>
  );
}
