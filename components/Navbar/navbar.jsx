'use client';

import React, { useState } from 'react';
import NavbarContent from './navbarContent';
import NavbarLinks from './navbarLinks';
import NavbarMenu from './navbarMenu';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-[#e3f3ff] border-b border-[#b8ddf8] shadow-sm z-50" style={{ height: 'clamp(56px, 7vh, 80px)' }}>
      <NavbarContent isMenuOpen={isMenuOpen} toggleMenu={toggleMenu}>
        <NavbarLinks />
        <NavbarMenu isMenuOpen={isMenuOpen} />
      </NavbarContent>
    </nav>
  );
}
