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
    <div className="flex items-center gap-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`font-medium text-sm transition-colors ${
            pathname === link.href ? 'text-[var(--endeavour)]' : 'text-[var(--chathams-blue)] hover:text-[var(--endeavour)]'
          }`}
        >
          {link.label}
        </Link>
      ))}

      <Link
        href="/signin"
        className={`font-medium text-sm transition-colors ${
          pathname === '/signin' ? 'text-[var(--endeavour)]' : 'text-[var(--chathams-blue)] hover:text-[var(--endeavour)]'
        }`}
      >
        Sign In
      </Link>

      <Link
        href="/contact"
        className="border border-[var(--endeavour)] text-[var(--chathams-blue)] text-sm px-5 py-2 rounded-lg hover:bg-[var(--endeavour)] hover:text-white transition-colors font-medium"
      >
        Contact
      </Link>
    </div>
  );
}
