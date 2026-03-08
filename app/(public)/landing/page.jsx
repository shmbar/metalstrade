'use client';

import Navbar from '../../../components/Navbar/navbar';
import Hero from '../../../components/Hero/hero';
import Features from '../../../components/Features/features';
import CTA from '../../../components/CTA/cta';
import Footer from '../../../components/Footer/footer';

export default function LandingPage() {
  return (
    <div className="w-full">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
