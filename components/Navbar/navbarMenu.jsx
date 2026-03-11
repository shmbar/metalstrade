'use client';

import Link from 'next/link';

export default function NavbarMenu({ isMenuOpen }) {
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
    <div className="flex flex-col space-y-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-[var(--chathams-blue)] hover:text-[var(--endeavour)] font-medium text-sm py-2 transition-colors"
        >
          {link.label}
        </Link>
      ))}
      <Link
        href="/signin"
        className="text-white hover:text-[#b8ddf8] font-medium text-sm py-2 transition-colors"
      >
        Sign In
      </Link>
    </div>
  );
}
