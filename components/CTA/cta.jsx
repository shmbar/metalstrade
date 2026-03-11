'use client';

import Link from 'next/link';

export default function CTA() {
  return (
    <section className="relative bg-white py-8 overflow-hidden">
      <div className="container mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--chathams-blue)] mb-4">
          Accelerate Your Business Growth
        </h2>
        <p className="text-base text-[var(--endeavour)] mb-6 max-w-2xl mx-auto leading-relaxed opacity-80">
          Manage contracts, invoices, and analytics seamlessly with our all-in-one SaaS platform.
          Streamline your operations and make smarter decisions in real-time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <Link
            href="/signin"
            className="bg-[var(--endeavour)] text-white px-8 py-3 rounded-xl font-bold hover:bg-[var(--chathams-blue)] transition-all hover:shadow-lg"
          >
            Sign In
          </Link>
          <a
            href="mailto:contact@metalstrade.com"
            className="border border-[#b8ddf8] text-[var(--chathams-blue)] px-8 py-3 rounded-xl font-bold hover:bg-[#b8ddf8] transition-all"
          >
            Contact Us
          </a>
        </div>
      </div>

    </section>
  );
}
