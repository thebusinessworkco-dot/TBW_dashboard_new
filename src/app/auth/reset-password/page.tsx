'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (supabase) {
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }

        setSuccess(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update password');
      }
    } else {
      // In local mode / preview
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#E2DDD3] bg-white p-8 shadow-sm">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#141413] text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold text-[#141413]">
            Set New Password
          </h2>
          <p className="text-xs text-[#555047]">
            Enter a new password for administrator account <strong>thebusinesswork.co@gmail.com</strong>
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-xs text-emerald-800 space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-700" />
            </div>
            <h3 className="font-semibold text-sm text-emerald-900">
              Password Changed Successfully
            </h3>
            <p>
              Your administrator password has been updated. You can now log into your dashboard.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2825]"
              >
                <span>Proceed to Login</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-[#555047] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 pr-10 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#7A756D] hover:text-[#141413]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-[#555047] mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                placeholder="Re-type new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#141413] py-2.5 text-sm font-semibold text-white hover:bg-[#2A2825] disabled:opacity-70 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Update Password & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
