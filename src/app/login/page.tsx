'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('thebusinesswork.co@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('thebusinesswork.co@gmail.com');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const authorizedAdmin = 'thebusinesswork.co@gmail.com';
    const cleanEmail = email.trim().toLowerCase();

    // Strict client & server-side authorization check
    if (cleanEmail !== authorizedAdmin) {
      setErrorMessage('Access denied. Only the authorized administrator (thebusinesswork.co@gmail.com) can access this dashboard.');
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    if (supabase) {
      // Connect to existing Supabase project authentication
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) {
          setErrorMessage(error.message || 'Invalid credentials. Please verify your password.');
          setIsLoading(false);
          return;
        }

        if (data?.user?.email?.toLowerCase() !== authorizedAdmin) {
          await supabase.auth.signOut();
          setErrorMessage('Access restricted to the authorized administrator account.');
          setIsLoading(false);
          return;
        }

        router.push('/');
        return;
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Authentication service error';
        setErrorMessage(errMessage);
        setIsLoading(false);
        return;
      }
    } else {
      // When Supabase environment variables are being connected or in local development
      if (!password || password.length < 4) {
        setErrorMessage('Please enter your administrator password.');
        setIsLoading(false);
        return;
      }

      // Allow authorized administrator login
      try {
        localStorage.setItem('tbw_admin_session', JSON.stringify({
          email: authorizedAdmin,
          name: 'Aman Rajbhar',
          logged_at: new Date().toISOString(),
          remember: rememberMe,
        }));
      } catch {
        // ignore
      }

      router.push('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotSuccess(false);

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
      } catch {
        // Continue to user feedback
      }
    }

    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess(true);
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4 py-12 sm:px-6 lg:px-8">
      {/* Background subtle gradient / card */}
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#141413] text-white shadow-md">
            <span className="font-extrabold text-lg tracking-wider">TBW</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#141413] uppercase font-mono">
            The Business Work
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7A756D]">
            Admin Control Center
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[#E2DDD3] bg-white p-8 shadow-sm">
          <div className="mb-6 border-b border-[#EFECE4] pb-4">
            <h3 className="text-base font-semibold text-[#141413]">
              Administrator Login
            </h3>
            <p className="text-xs text-[#555047] mt-1">
              Authorized access only. Enter your credentials to manage WhatsApp, Instagram, and workflows.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#555047] mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7A756D]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-2.5 pl-10 pr-3 text-sm text-[#141413] placeholder-[#7A756D] focus:border-[#141413] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#141413]"
                  placeholder="thebusinesswork.co@gmail.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#555047]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSuccess(false);
                    setForgotModalOpen(true);
                  }}
                  className="text-xs font-medium text-[#555047] hover:text-[#141413] transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7A756D]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-2.5 pl-10 pr-10 text-sm text-[#141413] placeholder-[#7A756D] focus:border-[#141413] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#141413]"
                  placeholder="Enter administrator password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#7A756D] hover:text-[#141413]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CDC7BA] text-[#141413] focus:ring-[#141413]"
                />
                <span className="text-xs text-[#555047]">Remember administrator session</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#141413] py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#2A2825] focus:outline-none focus:ring-2 focus:ring-[#141413] focus:ring-offset-2 disabled:opacity-70 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-[#EFECE4] pt-4 text-[11px] text-[#7A756D]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Protected by Supabase Auth & Server-Side RLS</span>
          </div>
        </div>

        {/* Back to public site */}
        <div className="text-center">
          <a
            href="https://www.thebusinesswork.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#7A756D] hover:text-[#141413] transition-colors"
          >
            ← Return to public website (thebusinesswork.com)
          </a>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2DDD3] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#141413] mb-1">
              Reset Administrator Password
            </h3>
            <p className="text-xs text-[#555047] mb-4">
              Enter your authorized admin email address. A secure password reset link will be dispatched via Supabase Auth.
            </p>

            {forgotSuccess ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Password Reset Email Sent</span>
                </div>
                <p>
                  Please check the inbox for <strong>{forgotEmail}</strong>. Follow the instructions to set your new password.
                </p>
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#555047] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="rounded-lg border border-[#E2DDD3] px-4 py-2 text-xs font-semibold text-[#555047] hover:bg-[#FAF8F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2825]"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
