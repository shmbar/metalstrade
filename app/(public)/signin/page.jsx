'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { RiRefreshLine } from "react-icons/ri";
import { UserAuth } from '../../../contexts/useAuthContext';
import { completeUserEmail } from '../../../actions/validations';
import Image from 'next/image';
import imsLogo from '../../../public/logo/logoNew.svg';

export default function SignInPage() {
  const { SignIn, err } = UserAuth();
  /* Set by the inactivity logout — see components/idle.js. Read from location rather
     than useSearchParams(): that hook forces a client-side-rendering bail unless the page
     is wrapped in <Suspense>, which made /signin intermittently 404. */
  const [expired, setExpired] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get('expired') === '1');
  }, []);
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

  /* No redirect-on-user effect here. useAuthContext owns the "logged in but sitting on
     /signin" redirect; a second push from this page raced it for the same login. */

  const handleSubmit = async () => {
    try {
      setDisabled(true);
      const tmpEmail = completeUserEmail(email);
      await SignIn(tmpEmail, password, remember);
      if (remember) localStorage.setItem("email", email);
      else localStorage.removeItem("email");
    } catch (error) {
      console.log(error);
    } finally {
      setDisabled(false);
    }
  };

  /* handleKeyPress removed: the <form> submits on Enter natively, and keeping a
     second Enter path alongside it fired handleSubmit twice. */

  return (
    <div className="marketing h-screen w-full overflow-hidden flex font-sans">

      {/* LEFT — Brand Panel */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-between p-12" style={{ background: 'var(--brand-deep)' }}>
        {/* Spacer top */}
        <div />

        {/* Center content */}
        <div className="text-[var(--on-brand)] text-center">
          <p className="text-[var(--on-brand)]/80 responsiveTextTitle font-semibold uppercase tracking-[0.2em] mb-4">Welcome to IMS</p>
          <h2 className="responsiveTextDisplay font-bold mb-3 leading-snug">
            Unlock the power of intelligent trading
          </h2>
          <div className="w-10 h-0.5 bg-[var(--on-brand-soft-strong)] mb-5 rounded-full mx-auto" />
          <p className="text-[var(--on-brand)]/60 responsiveTextTitle leading-relaxed">
            Create, manage, and monitor all your business transactions in one place. Streamline your operations, gain real-time insights, and stay in control of your finances effortlessly.
          </p>

          {/* Feature bullets */}
          <ul className="mt-8 space-y-3.5">
            {['Real-time analytics & reporting', 'Contract & invoice management', 'Secure & role-based access'].map((item) => (
              <li key={item} className="flex items-center justify-center gap-3 responsiveTextTitle text-[var(--on-brand)]/75">
                <span className="w-4 h-4 rounded-full border border-[var(--on-brand-soft-strong)] bg-[var(--on-brand-soft)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-[var(--on-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
      <div className="w-full md:w-1/2 flex items-center justify-center bg-[var(--bg-subtle)]">
        <div className="w-full max-w-md mx-8 bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--bg-subtle)] p-10">

          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mb-5 flex justify-center">
              <Image src={imsLogo} alt="IMS Logo" width={90} height={44} priority className="mb-1" />
            </div>
            <h1 className="responsiveTextStat font-bold text-[var(--chathams-blue)]">Welcome back</h1>
            <p className="responsiveTextTitle text-[var(--text-faint)] mt-0.5">
              {expired ? 'Your session timed out after 2 hours of inactivity. Sign in to continue.' : 'Sign in to your IMS account to continue'}
            </p>
          </div>

          {/* A real <form>, not a <div> of inputs. Browser and password-manager
              autofill keys off a form with a submit control — without one,
              1Password/Chrome would offer to fill and then not fire, and Enter
              only worked because of a hand-rolled onKeyPress. Native submit
              replaces that handler. */}
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

            {/* Email */}
            <div>
              <label htmlFor="signin-email" className="block responsiveTextInput font-semibold text-[var(--ink-secondary)] mb-1.5 uppercase tracking-wide">Email</label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-[var(--bg-subtle)] rounded-lg responsiveTextTitle text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30 focus:border-[var(--endeavour)] transition-all bg-[var(--bg-card)]"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signin-password" className="block responsiveTextInput font-semibold text-[var(--ink-secondary)] mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  id="signin-password"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-[var(--bg-subtle)] rounded-lg responsiveTextTitle text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30 focus:border-[var(--endeavour)] transition-all bg-[var(--bg-card)] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-secondary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {err && (
              /* The --danger-* family, not Tailwind red: this is the one place
                 on the marketing side showing real status, and the muted family
                 is what the rest of the product uses for a failure. Raw red-600
                 also never inverted, so it stayed bright on the dark card. */
              <div className="bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg px-3 py-2.5" role="alert">
                <span className="responsiveTextInput text-[var(--danger-text)] font-medium">{err}</span>
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
                <span className="responsiveTextInput text-[var(--ink-secondary)] whitespace-nowrap">Remember me</span>
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={disabled && !err}
              className="w-full py-2.5 rounded-lg font-semibold responsiveTextTitle text-[var(--on-brand)] transition-all flex items-center justify-center gap-2 mt-2 hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'var(--endeavour)' }}
            >
              {(disabled && !err) ? (
                <>Connecting <div className="animate-spin"><RiRefreshLine className="scale-125" /></div></>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Was <a href="#">Forgot password?</a> sitting opposite "Remember me"
                — a link that went nowhere. There is no self-serve reset (accounts
                are provisioned, see createSuperAdmin.mjs), so this states the real
                recovery path. It lives under the button rather than beside the
                checkbox because at this width the sentence wrapped "Remember me"
                onto two lines. */}
            <p className="responsiveTextInput text-[var(--ink-muted)] text-center pt-1">
              Forgot your password? Contact your administrator.
            </p>
          </form>

          {/* Divider + copyright */}
          <div className="mt-8 pt-5 border-t border-[var(--selago)] text-center">
            {/* gray-300 maps to --line-strong, a BORDER token: 1.5:1 on the card
                in dark mode (and barely better in light). Fine print still has
                to be readable — --ink-muted is the token for it. */}
            <p className="responsiveTextInput text-[var(--ink-muted)]">© {new Date().getFullYear()} IMS Inc. All Rights Reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
