'use client';

import Link from 'next/link';

const linkCls = "text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm";

export default function Footer() {
  return (
    <footer className="relative bg-[#e3f3ff] border-t border-[#b8ddf8] overflow-hidden">
      <div className="container mx-auto px-8 md:px-16 py-5">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 mb-4">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="mb-3 overflow-hidden h-11">
              <img src="/logo/logoNew.svg" alt="IMS Logo" className="h-24 w-auto -mt-[26px]" />
            </div>
            <p className="text-[var(--chathams-blue)] text-sm leading-relaxed max-w-xs opacity-80">
              The operations platform for metals &amp; alloys trading — contracts, inventory,
              cashflow and AI-assisted document handling in one place.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-[var(--chathams-blue)] mb-3 text-xs tracking-wide uppercase">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features" className={linkCls}>Features</Link></li>
              <li><Link href="/signin" className={linkCls}>Sign In</Link></li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-[var(--chathams-blue)] mb-3 text-xs tracking-wide uppercase">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className={linkCls}>About IMS</Link></li>
              <li><Link href="/blog" className={linkCls}>Blog</Link></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-[var(--chathams-blue)] mb-3 text-xs tracking-wide uppercase">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className={linkCls}>Privacy Policy</Link></li>
              <li><Link href="/about" className={linkCls}>Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Divider + Copyright */}
        <div className="border-t border-[#b8ddf8] pt-4">
          <p className="text-[var(--chathams-blue)] text-xs text-center opacity-60">
            © {new Date().getFullYear()} IMS Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
