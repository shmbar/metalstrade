'use client';
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { RiRefreshLine } from "react-icons/ri";
import { IoMdArrowDropright } from "react-icons/io";
import { useRouter } from 'next/navigation';

import { UserAuth } from '@contexts/useAuthContext';
import { completeUserEmail } from '@actions/validations';

export default function SignInPage() {
  const { SignIn, err, user } = UserAuth(); // Added user
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // Load saved email
  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Submit Handler
  const handleSubmit = async () => {
    try {
      setDisabled(true);
      let tmpEmail = completeUserEmail(email);
      await SignIn(tmpEmail, password);

      if (remember) {
        localStorage.setItem("email", email);
      } else {
        localStorage.removeItem("email");
      }

      // Redirect after login
      router.push('/dashboard');

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
    <div className="w-full bg-white min-h-screen font-sans">
      <main>
        <section className="relative bg-gradient-to-br from-[var(--endeavour)] via-[var(--rock-blue)] to-[var(--port-gore)] text-white overflow-hidden min-h-screen flex items-center justify-center py-6">
          
          {/* Sign In Card */}
          <div className="container px-4 relative z-20 py-8">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-lg shadow-2xl w-full p-8 relative">

                {/* Back Arrow */}
                <button className="absolute top-8 left-8 text-gray-600 hover:text-gray-800 transition-colors">
                  <ArrowLeft size={20} />
                </button>

                {/* Logo */}
                <div className="text-center mb-8 pt-6">
                  <div className="inline-block">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-4xl font-bold text-[var(--endeavour)]">IMS</span>
                    </div>
                    <p className="text-xs text-gray-500 tracking-[0.2em] mt-1">METALS & ALLOYS</p>
                  </div>
                </div>

                {/* Welcome Text */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                    Welcome to IMS
                  </h1>
                  <p className="text-sm text-gray-500">
                    Login to your account
                  </p>
                </div>

                {/* Sign In Form */}
                <div className="space-y-5">

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="abc@gmail.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)] focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)] focus:border-transparent transition-all text-gray-800 placeholder-gray-400 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {err && (
                    <div className="text-center">
                      <span className="text-sm text-red-500 font-medium uppercase">
                        {err.slice(22, err.length - 2)}
                      </span>
                    </div>
                  )}

                  {/* Remember Me */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={() => setRemember(!remember)}
                    />
                    <label className="text-sm text-gray-600">Remember me</label>
                  </div>

                  {/* Forgot */}
                  <div className="flex justify-end">
                    <a href="#" className="text-sm text-[var(--endeavour)] hover:text-[var(--port-gore)] transition-colors">
                      Forgot Password?
                    </a>
                  </div>

                  {/* Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={disabled && !err}
                    className="w-full bg-[var(--endeavour)] text-white py-3 rounded-md font-medium hover:bg-[var(--port-gore)] transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    {(disabled && !err) ? 'Connecting' : 'Sign In'}
                    {(disabled && !err) && <div className="animate-spin"><RiRefreshLine className="scale-125" /></div>}
                    {!disabled && <IoMdArrowDropright />}
                  </button>
                </div>

                {/* Register */}
                <div className="text-center mt-6">
                  <p className="text-sm text-gray-600">
                    Don&#39;t have an account?{' '}
                    <a href="#" className="text-[var(--endeavour)] hover:text-[var(--port-gore)] font-medium transition-colors">
                      Register
                    </a>
                  </p>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-400">© 2025 IMS. All Rights Reserved</p>
                </div>
              </div>
            </div>
          </div>

          {/* Curved Background Overlay */}
          <div
            className="absolute left-0 right-0 h-[40%] z-0 pointer-events-none"
            style={{ bottom: "30px" }}
          >
            <svg
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              className="w-full h-full text-white"
            >
              <path
                d="M0,160 C 400,160 800,60 1440,60 L 1440,320 L 0,320 Z"
                fill="currentColor"
              />
            </svg>
          </div>

        </section>
      </main>
    </div>
  );
}
