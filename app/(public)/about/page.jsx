'use client';
import { motion } from "framer-motion";
import { Users, Shield, Target, TrendingUp, Award, Globe, BarChart,Rocket,Handshake,Headphones,BarChart3 } from "lucide-react";
 import Navbar from '../../../components/Navbar/navbar';
 import Footer from '../../../components/Footer/footer';
 import HeroSection from "../../../components/Hero/HeroSection";

export default function AboutPage() {
  return (
    <div className="marketing w-full bg-[var(--bg-card)] min-h-screen font-sans text-foreground">
      {/* Navbar Placeholder if needed - assuming layout handles it or user adds it */}
       <Navbar />
      <main className="pt-20">
     <HeroSection
  title="About IMS"
  subtitle="Revolutionizing the metal trade industry with precision, innovation, and comprehensive solutions."
/>

     {/* Mission Section */}
<section className="py-12 bg-[var(--bg-card)] relative z-10">
  <div className="container mx-auto px-4">
    <div className="grid md:grid-cols-2 gap-16 items-center">

      {/* LEFT — Text */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="responsiveTextDisplay font-bold text-[var(--chathams-blue)] mb-6">Our Mission</h2>
        <p className="responsiveTextPage text-[var(--ink-secondary)] leading-relaxed mb-4">
          We believe technology should simplify metal trading — not complicate it.
          IMS was built to streamline trade operations end-to-end.
        </p>
        <p className="responsiveTextPage text-[var(--ink-secondary)] leading-relaxed">
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
        className="relative h-[460px] bg-[var(--bg-card)] border border-[var(--line)] rounded-3xl shadow-lg shadow-card flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--selago)]/60 to-transparent"></div>

        <div className="relative z-10 w-72 h-72">

          {/* OUTER CIRCLE */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-16 border border-[var(--line-strong)] rounded-full"
          >
            {/* OUTER ICONS */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--endeavour)] text-[var(--on-brand)] p-3 rounded-2xl shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[var(--endeavour)] text-[var(--on-brand)] p-3 rounded-2xl shadow-md">
              <Globe className="w-6 h-6" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-[var(--endeavour)] text-[var(--on-brand)] p-3 rounded-2xl shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-[var(--endeavour)] text-[var(--on-brand)] p-3 rounded-2xl shadow-md">
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--bg-card)] text-[var(--endeavour)] p-2 rounded-full shadow">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[var(--bg-card)] text-[var(--endeavour)] p-2 rounded-full shadow">
              <Shield className="w-5 h-5" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-[var(--bg-card)] text-[var(--endeavour)] p-2 rounded-full shadow">
              <Award className="w-5 h-5" />
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-[var(--bg-card)] text-[var(--endeavour)] p-2 rounded-full shadow">
              <Handshake className="w-5 h-5" />
            </div>
          </motion.div>

          {/* INNER CORE */}
          <div className="absolute inset-10 bg-[var(--bg-card)] rounded-full shadow-xl flex items-center justify-center">
            <Target className="w-20 h-20 text-[var(--endeavour)]" strokeWidth={1.8} />
          </div>

        </div>
      </motion.div>

    </div>
  </div>
</section>



       {/* Values Section */}
<section className="py-12 bg-[var(--bg-subtle)] relative z-10">
  <div className="container mx-auto px-4">

    {/* Header */}
    <div className="text-center max-w-3xl mx-auto mb-10">
      <h2 className="responsiveTextDisplay font-bold text-[var(--chathams-blue)] mb-4">Core Values</h2>
      <p className="text-[var(--ink-secondary)] responsiveTextPage leading-relaxed">
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
          className="group relative p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--line)] shadow-sm
                     hover:shadow-md hover:border-[var(--endeavour)] transition-all duration-300 overflow-hidden"
        >

          {/* Glow Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[var(--endeavour)] transition-opacity duration-300"></div>

          {/* Icon Wrapper */}
          <div className="relative z-10 w-16 h-16 mb-6 flex items-center justify-center rounded-2xl bg-[var(--bg-subtle)] 
                          shadow-md group-hover:bg-[var(--endeavour)] transition-all duration-300">
            <value.icon className="w-8 h-8 text-[var(--endeavour)] group-hover:text-[var(--on-brand)] transition-colors duration-300" />
          </div>

          {/* Content */}
          <h3 className="responsiveTextPage font-bold text-[var(--chathams-blue)] group-hover:text-[var(--endeavour)] transition-colors duration-300 mb-3">
            {value.title}
          </h3>
          <p className="text-[var(--ink-secondary)] leading-relaxed relative z-10">
            {value.description}
          </p>
        </motion.div>
      ))}
    </div>
  </div>
</section>


       {/* Why Choose Us Section */}
<section className="py-12 bg-[var(--bg-card)]">
  <div className="container mx-auto px-4">

    {/* Heading */}
    <div className="text-center max-w-3xl mx-auto mb-10">
      <h2 className="responsiveTextDisplay font-bold text-[var(--chathams-blue)] mb-4">
        Why Businesses Choose Us
      </h2>
      <p className="text-[var(--ink-secondary)] responsiveTextPage">
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
          className="bg-[var(--bg-subtle)] p-6 rounded-2xl border border-[var(--line)] shadow-sm hover:shadow-md hover:border-[var(--endeavour)] hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[var(--bg-subtle)] mb-5 group-hover:bg-[var(--endeavour)] transition-colors duration-300">
            <item.icon className="w-7 h-7 text-[var(--endeavour)] group-hover:text-[var(--on-brand)] transition-all duration-300" />
          </div>

          <h3 className="responsiveTextPage font-bold text-[var(--chathams-blue)] mb-2 group-hover:text-[var(--endeavour)] transition-colors duration-300">
            {item.title}
          </h3>

          <p className="text-[var(--ink-secondary)] leading-relaxed">
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
