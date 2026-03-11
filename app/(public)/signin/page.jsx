'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { RiRefreshLine } from "react-icons/ri";
import { UserAuth } from '../../../contexts/useAuthContext';
import { completeUserEmail } from '../../../actions/validations';
import Image from 'next/image';
import imsLogo from '../../../public/logo/logoNew.svg';

export default function SignInPage() {
  const { SignIn, user, err } = UserAuth();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async () => {
    try {
      setDisabled(true);
      const tmpEmail = completeUserEmail(email);
      await SignIn(tmpEmail, password);
      if (remember) localStorage.setItem("email", email);
      else localStorage.removeItem("email");
    } catch (error) {
      console.log(error);
    } finally {
      setDisabled(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="h-screen w-full overflow-hidden flex font-sans">

      {/* LEFT — Brand Panel */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12" style={{ background: 'var(--chathams-blue)' }}>
        {/* Spacer top */}
        <div />

        {/* Center content */}
        <div className="text-white text-center">
          <p className="text-white/80 text-sm font-semibold uppercase tracking-[0.2em] mb-4">Welcome to IMS-Tech</p>
          <h2 className="text-2xl font-bold mb-3 leading-snug">
            Unlock the power of intelligent trading
          </h2>
          <div className="w-10 h-0.5 bg-white/30 mb-5 rounded-full mx-auto" />
          <p className="text-white/60 text-sm leading-relaxed">
            Create, manage, and monitor all your business transactions in one place. Streamline your operations, gain real-time insights, and stay in control of your finances effortlessly.
          </p>

          {/* Feature bullets */}
          <ul className="mt-8 space-y-3.5">
            {['Real-time analytics & reporting', 'Contract & invoice management', 'Secure & role-based access'].map((item) => (
              <li key={item} className="flex items-center justify-center gap-3 text-sm text-white/75">
                <span className="w-4 h-4 rounded-full border border-white/30 bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Spacer bottom */}
        <div />
      </div>

      {/* RIGHT — Form Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-[#f4f8fd]">
        <div className="w-full max-w-md mx-8 bg-white rounded-2xl shadow-sm border border-[#dbeeff] p-10">

          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mb-5 flex justify-center">
              <Image src={imsLogo} alt="IMS Logo" width={90} height={44} priority className="mb-1" />
            </div>
            <h1 className="text-xl font-bold text-[var(--chathams-blue)]">Welcome back</h1>
            <p className="text-sm text-gray-400 mt-0.5">Sign in to your IMS account to continue</p>
          </div>

          {/* Form */}
          <div className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-[#dbeeff] rounded-lg text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30 focus:border-[var(--endeavour)] transition-all bg-white"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-[#dbeeff] rounded-lg text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30 focus:border-[var(--endeavour)] transition-all bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {err && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <span className="text-xs text-red-600 font-medium">{err}</span>
              </div>
            )}

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                  className="w-3.5 h-3.5 accent-[var(--endeavour)] rounded"
                />
                <span className="text-xs text-gray-500">Remember me</span>
              </label>
              <a href="#" className="text-xs text-[var(--endeavour)] hover:text-[var(--chathams-blue)] transition-colors font-semibold">
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              onClick={handleSubmit}
              disabled={disabled && !err}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 mt-2 hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'var(--endeavour)' }}
            >
              {(disabled && !err) ? (
                <>Connecting <div className="animate-spin"><RiRefreshLine className="scale-125" /></div></>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {/* Divider + copyright */}
          <div className="mt-8 pt-5 border-t border-[#eef4fb] text-center">
            <p className="text-xs text-gray-300">© {new Date().getFullYear()} IMS Inc. All Rights Reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
