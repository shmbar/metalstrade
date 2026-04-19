'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavbarMenu({ isMenuOpen }) {
  const pathname = usePathname();

  if (!isMenuOpen) return null;

  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/features', label: 'Features' },
    { href: '/blog', label: 'Blog' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <div className="flex flex-col space-y-1 pt-2 pb-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`font-medium text-sm py-2 px-3 rounded-lg transition-all duration-200 ${
            pathname === link.href
              ? 'text-[var(--endeavour)] bg-[#dbeeff]'
              : 'text-[var(--chathams-blue)] hover:text-[var(--endeavour)] hover:bg-[#dbeeff]/60'
          }`}
        >
          {link.label}
        </Link>
      ))}
      <Link
        href="/signin"
        className="mt-2 bg-[var(--endeavour)] text-white font-medium text-sm py-2 px-3 rounded-lg text-center hover:bg-[var(--chathams-blue)] transition-all duration-200"
      >
        Sign In
      </Link>
    </div>
  );
}
