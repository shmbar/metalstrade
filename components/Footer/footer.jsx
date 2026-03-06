'use client';

export default function Footer() {
  return (
    <footer className="relative bg-[var(--endeavour)] text-white overflow-hidden pt-20">
      <div className="relative container mx-auto px-16 py-16">
        {/* Main Content Grid */}
        <div className="grid grid-cols-5 gap-24 mb-24">
          {/* Brand Column - Left */}
          <div className="col-span-1">
            <div className="mb-8">
              {/* Logo */}
              <div className="inline-flex items-center justify-center  rounded w-16 h-16 mb-6">
                <span className="text-white font-bold text-2xl">IMS</span>
              </div>

              {/* Description */}
              <p className="text-white/80 text-xs leading-relaxed mb-8">
                IMS provides innovative solutions for businesses worldwide, helping them grow with technology and expertise.
              </p>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-bold text-white mb-8 text-sm">Product</h4>
            <ul className="space-y-4">
              <li><a href="/landing" className="text-white/70 hover:text-white transition-colors text-xs">Landing Page</a></li>
              <li><a href="/features" className="text-white/70 hover:text-white transition-colors text-xs">Features</a></li>
              <li><a href="/pricing" className="text-white/70 hover:text-white transition-colors text-xs">Pricing</a></li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-bold text-white mb-8 text-sm">Company</h4>
            <ul className="space-y-4">
              <li><a href="/about" className="text-white/70 hover:text-white transition-colors text-xs">About IMS</a></li>
              <li><a href="/contact" className="text-white/70 hover:text-white transition-colors text-xs">Contact Us</a></li>
              <li><a href="/blog" className="text-white/70 hover:text-white transition-colors text-xs">Blog</a></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="font-bold text-white mb-8 text-sm">Resources</h4>
            <ul className="space-y-4">
              <li><a href="/blog" className="text-white/70 hover:text-white transition-colors text-xs">Blog</a></li>
              <li><a href="/features" className="text-white/70 hover:text-white transition-colors text-xs">Features</a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-bold text-white mb-8 text-sm">Legal</h4>
            <ul className="space-y-4">
              <li><a href="/about" className="text-white/70 hover:text-white transition-colors text-xs">Privacy Policy</a></li>
              <li><a href="/about" className="text-white/70 hover:text-white transition-colors text-xs">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <p className="text-white/60 text-xs text-center">
            © {new Date().getFullYear()} IMS Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
