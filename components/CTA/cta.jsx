'use client';

import Link from 'next/link';

export default function CTA() {
  return (
    <section className="relative bg-[var(--surface-card)] py-8 overflow-hidden">
      <div className="container mx-auto px-6 text-center relative z-10">
        <h2 className="responsiveTextDisplay font-bold text-[var(--chathams-blue)] mb-4">
          Run your whole trading operation in one place
        </h2>
        <p className="responsiveTextPage text-[var(--endeavour)] mb-6 max-w-2xl mx-auto leading-relaxed opacity-80">
          From the purchase confirmation to the final settlement — contracts, stock, shipments,
          cashflow and margins that always agree with each other.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <Link
            href="/signin"
            className="responsiveTextTitle bg-[var(--endeavour)] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[var(--brand-deep)] transition-all hover:shadow-lg"
          >
            Sign In
          </Link>
          <a
            href="#modules"
            className="responsiveTextTitle border border-[var(--border-divider)] text-[var(--chathams-blue)] px-8 py-3 rounded-2xl font-bold hover:bg-[var(--surface-header)] transition-all"
          >
            See the modules
          </a>
        </div>
      </div>

    </section>
  );
}
