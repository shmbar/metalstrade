'use client';


import React from 'react';
import Image from 'next/image';
import logo from '../../public/logo/logoNew.svg';

export default function NavbarContent({ isMenuOpen, toggleMenu, children }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
      <div className="flex justify-between items-center">
        {/* Logo */}

        <div className="flex-shrink-0 flex items-center ml-8">
          <Image src={logo} alt="IMS Logo" width={80} height={100} />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          {children[0]}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-[var(--chathams-blue)] hover:bg-[#b8ddf8] focus:outline-none"
        >
          <svg
            className={`h-6 w-6 transition-transform ${isMenuOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-[#b8ddf8]">
          {children[1]}
        </div>
      )}
    </div>
  );
}
