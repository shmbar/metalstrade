
'use client';

import Navbar from '../components/Navbar/navbar';
import Hero from '../components/Hero/hero';
import EfficientShipment from '../components/Features/EfficientShipment';
import Features from '../components/Features/features';
import CTA from '../components/CTA/cta';
import Footer from '../components/Footer/footer';
// import Pricing from '../components/Pricing/pricing';
// import Testimonials from '../components/Testimonial/testimonials';
import PlatformSection from '../components/platform/PlatformSection';

export default function HomePage() {
  return (
    <div className="marketing w-full">
      <Navbar />
      <main>
        <Hero />
        <EfficientShipment />
     
        <PlatformSection />
           <Features />
        {/* <Testimonials /> */}
        {/* <Pricing /> */}
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
