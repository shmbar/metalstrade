'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavbarLinks() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/features', label: 'Features' },
    { href: '/blog', label: 'Blog' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <div className="flex items-center gap-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`relative font-medium text-sm px-3 py-1.5 rounded-lg transition-all duration-200 group ${
            pathname === link.href
              ? 'text-[var(--endeavour)] bg-[#dbeeff]'
              : 'text-[var(--chathams-blue)] hover:text-[var(--endeavour)] hover:bg-[#dbeeff]/60'
          }`}
        >
          {link.label}
          <span className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--endeavour)] transition-all duration-200 ${
            pathname === link.href ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
          }`} />
        </Link>
      ))}

      <Link
        href="/signin"
        className={`relative font-medium text-sm px-3 py-1.5 rounded-lg transition-all duration-200 group ${
          pathname === '/signin'
            ? 'text-[var(--endeavour)] bg-[#dbeeff]'
            : 'text-[var(--chathams-blue)] hover:text-[var(--endeavour)] hover:bg-[#dbeeff]/60'
        }`}
      >
        Sign In
        <span className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--endeavour)] transition-all duration-200 ${
          pathname === '/signin' ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
        }`} />
      </Link>

      <Link
        href="/contact"
        className="ml-2 bg-[var(--endeavour)] text-white text-sm px-5 py-2 rounded-lg hover:bg-[var(--chathams-blue)] transition-all duration-200 font-medium shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
      >
        Contact
      </Link>
    </div>
  );
}
