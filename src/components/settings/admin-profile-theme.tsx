'use client';

import React from 'react';
import {
  ShieldCheck,
  Lock,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  Mail,
  MapPin,
  Key,
} from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export function AdminProfileTheme() {
  const { theme, setTheme } = useDashboardStore();

  return (
    <div className="space-y-6">
      {/* SECTION 3: ADMIN PROFILE */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div>
            <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
              Principal Administrator Profile
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Authorized superadmin account mapped to Supabase Authentication & Allowlist.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Superadmin Allowlisted</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#202B35] text-[#FCFBF8] font-bold text-lg shadow-sm">
              AR
            </div>
            <div className="space-y-1">
              <div className="font-bold text-base text-[#202B35] dark:text-[#FCFBF8]">
                Aman Rajbhar
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                <span className="font-mono">thebusinesswork.co@gmail.com</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                <MapPin className="h-3.5 w-3.5 text-stone-400" />
                <span>Boisar, Maharashtra, India</span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1 font-mono text-[11px] text-stone-500 dark:text-stone-400 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 dark:border-stone-800">
            <div>
              Auth UID: <strong className="text-stone-800 dark:text-stone-200">92318d7c...cb73</strong>
            </div>
            <div>
              Role: <strong className="text-emerald-700 dark:text-emerald-400">Superadmin (Owner)</strong>
            </div>
            <div>
              Status: <strong className="text-stone-800 dark:text-stone-200">Active Session</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 14: THEME PREFERENCES */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDD9D0]/60 pb-3 dark:border-[#263342]">
          <div>
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-indigo-500" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Theme & Interface Preferences
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Customize dashboard visual mode. Persists automatically in browser storage.
            </p>
          </div>
          <span className="rounded-lg bg-stone-100 border border-[#DDD9D0] px-2.5 py-1 text-[11px] font-mono text-stone-600 dark:bg-[#1A232D] dark:border-[#263342] dark:text-stone-300">
            Active: <strong className="capitalize text-[#202B35] dark:text-white">{theme} Mode</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              theme === 'light'
                ? 'border-[#202B35] bg-[#F4F2EC] ring-2 ring-[#202B35]/20 shadow-xs'
                : 'border-[#DDD9D0] bg-white hover:border-stone-400 dark:bg-[#1A232D] dark:border-[#263342]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
                <Sun className="h-4 w-4 text-amber-600" />
              </div>
              {theme === 'light' && <CheckCircle2 className="h-4 w-4 text-[#202B35]" />}
            </div>
            <div>
              <div className="font-semibold text-xs text-[#202B35]">Light Theme</div>
              <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                Warm Ivory (#F4F2EC) canvas with crisp stone borders.
              </div>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              theme === 'dark'
                ? 'border-indigo-500 bg-[#161F2A] ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-[#DDD9D0] bg-white hover:border-stone-400 dark:bg-[#1A232D] dark:border-[#263342]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-indigo-950 p-2 border border-indigo-800">
                <Moon className="h-4 w-4 text-indigo-400" />
              </div>
              {theme === 'dark' && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
            </div>
            <div>
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">Dark Theme</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                Obsidian slate dark palette for low-light focus.
              </div>
            </div>
          </button>

          {/* System Default */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
              theme === 'system'
                ? 'border-[#202B35] bg-[#F4F2EC] ring-2 ring-[#202B35]/20 shadow-xs dark:border-indigo-500 dark:bg-[#161F2A]'
                : 'border-[#DDD9D0] bg-white hover:border-stone-400 dark:bg-[#1A232D] dark:border-[#263342]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-stone-100 p-2 border border-stone-200 dark:bg-[#202B35]">
                <Monitor className="h-4 w-4 text-stone-700 dark:text-stone-300" />
              </div>
              {theme === 'system' && <CheckCircle2 className="h-4 w-4 text-[#202B35] dark:text-indigo-400" />}
            </div>
            <div>
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">System Preference</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                Automatically matches your operating system display mode.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 15: SECURITY SUMMARY */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="border-b border-[#DDD9D0]/60 pb-3 dark:border-[#263342]">
          <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
            Security & Authentication Policies
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Architecture safeguards protecting administrative actions and API access.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Allowlist Enforcement</span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
              Only UIDs registered in <code className="font-mono text-[10px]">admin_user_allowlist</code> can access management routes.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#DDD9D0] bg-white dark:bg-[#1A232D] dark:border-[#263342] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-[#202B35] dark:text-[#FCFBF8]">
              <Lock className="h-4 w-4 text-stone-500" />
              <span>Row Level Security (RLS)</span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
              Every table has strict RLS policies checking <code className="font-mono text-[10px]">is_authorized_admin()</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#DDD9D0] bg-white dark:bg-[#1A232D] dark:border-[#263342] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-[#202B35] dark:text-[#FCFBF8]">
              <Key className="h-4 w-4 text-stone-500" />
              <span>Zero Browser Secrets</span>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
              Tokens, service role keys, and webhook secrets execute strictly server-side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
