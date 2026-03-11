'use client';

export default function Footer() {
  return (
    <footer className="relative bg-[#e3f3ff] border-t border-[#b8ddf8] overflow-hidden">
      <div className="container mx-auto px-8 md:px-16 py-5">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 mb-4">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="inline-flex items-center justify-center rounded w-12 h-12 mb-3 bg-[var(--endeavour)]">
              <span className="text-white font-bold text-lg">IMS</span>
            </div>
            <p className="text-[var(--chathams-blue)] text-sm leading-relaxed max-w-xs opacity-80">
              IMS provides innovative solutions for businesses worldwide, helping them grow with technology and expertise.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-[var(--chathams-blue)] mb-3 text-xs tracking-wide uppercase">Product</h4>
            <ul className="space-y-2">
              <li><a href="/landing" className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm">Landing Page</a></li>
              <li><a href="/features" className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm">Features</a></li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-[var(--chathams-blue)] mb-3 text-xs tracking-wide uppercase">Company</h4>
            <ul className="space-y-2">
              <li><a href="/about" className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm">About IMS</a></li>
              <li><a href="/contact" className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm">Contact Us</a></li>
              <li><a href="/blog" className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm">Blog</a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-[var(--chathams-blue)] mb-3 text-xs tracking-wide uppercase">Legal</h4>
            <ul className="space-y-2">
              <li><a href="/about" className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="/about" className="text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors text-sm">Terms of Service</a></li>
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
