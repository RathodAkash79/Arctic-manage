'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Validate inputs
      if (!email.trim()) {
        setError('❌ Email is required');
        setIsLoading(false);
        return;
      }

      if (!password) {
        setError('❌ Password is required');
        setIsLoading(false);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('❌ Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('❌ Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      // Attempt login
      await login(email, password);

      setSuccessMessage('✅ Login successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      
      console.error('Login error:', err);
      
      // Provide user-friendly error messages
      if (errorMessage.includes('user-not-found') || errorMessage.includes('INVALID_LOGIN_CREDENTIALS') || errorMessage.includes('auth/user-not-found')) {
        setError('❌ Email not found. Please sign up first.');
      } else if (errorMessage.includes('wrong-password') || errorMessage.includes('auth/wrong-password')) {
        setError('❌ Incorrect password. Please try again.');
      } else if (errorMessage.includes('invalid-credential') || errorMessage.includes('auth/invalid-credential')) {
        setError('❌ Invalid email or password. Please check and try again.');
      } else if (errorMessage.includes('is banned')) {
        setError('❌ Your account has been banned. Contact administrator.');
      } else if (errorMessage.includes('is timeout')) {
        setError('❌ Your account is temporarily suspended.');
      } else if (errorMessage.includes('User profile not found')) {
        setError('❌ User account not found in system. Please contact administrator.');
      } else {
        setError(`❌ ${errorMessage || 'An error occurred during login'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Arctic Manage
          </h1>
          <p className="text-slate-500">
            Internal Team Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors duration-200"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors duration-200"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-rose-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-emerald-700 text-sm font-medium">{successMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">New to Arctic?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href="/signup"
            className="w-full flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors duration-200"
          >
            Create Account
          </Link>

        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2025 Arctic Manage. All rights reserved.
        </p>
      </div>
    </div>
  );
}
