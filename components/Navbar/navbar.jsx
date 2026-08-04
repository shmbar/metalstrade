'use client';

import React, { useState, useEffect } from 'react';
import NavbarContent from './navbarContent';
import NavbarLinks from './navbarLinks';
import NavbarMenu from './navbarMenu';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-sticky transition-all duration-300 ${
        scrolled
          ? 'bg-[rgba(var(--surface-card-rgb),0.95)] backdrop-blur-md shadow-md border-b border-[var(--border-cell)]'
          : 'bg-[var(--surface-header)] border-b border-[var(--border-divider)] shadow-sm'
      }`}
      style={{ height: 'clamp(56px, 7vh, 80px)' }}
    >
      <NavbarContent isMenuOpen={isMenuOpen} toggleMenu={toggleMenu}>
        <NavbarLinks />
        <NavbarMenu isMenuOpen={isMenuOpen} />
      </NavbarContent>
    </nav>
  );
}
