'use client';

import React from 'react';
import { Menu, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export function TopNavbar({
  title,
  subtitle,
  onOpenMobile,
}: {
  title: string;
  subtitle?: string;
  onOpenMobile?: () => void;
}) {
  const {
    timeFilter,
    setTimeFilter,
    integrationStatuses,
    vpsMetrics,
    setMobileMenuOpen,
    theme,
    toggleTheme,
  } = useDashboardStore();

  const handleOpenMobile = onOpenMobile || (() => setMobileMenuOpen(true));
  const hasIssues = integrationStatuses.some((i) => i.status === 'error') || vpsMetrics.status === 'critical';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E6E1D7] bg-white/85 px-3 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile hamburger & Titles */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={handleOpenMobile}
          className="rounded-xl p-2.5 -ml-1 text-stone-700 hover:bg-stone-100 hover:text-stone-900 lg:hidden cursor-pointer transition-colors active:scale-95 shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-stone-500 truncate max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Time Range filter & System Status Pill */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Time Filter Segmented Control */}
        <div className="flex items-center rounded-xl border border-stone-200/80 bg-stone-100/80 p-0.5 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setTimeFilter('today')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
              timeFilter === 'today'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('7d')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
              timeFilter === '7d'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            7D
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('30d')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
              timeFilter === '30d'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            30D
          </button>
        </div>

        {/* Theme Toggle (Dark / Light Mode) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex h-7.5 w-7.5 items-center justify-center rounded-xl border border-stone-200/80 bg-stone-100/80 text-stone-700 hover:bg-stone-200/80 hover:text-stone-900 transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-stone-600" />
          )}
        </button>

        {/* Integration Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white px-3 py-1 text-xs text-stone-600 shadow-2xs">
          {hasIssues ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-amber-800">Check Integrations</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-medium text-stone-800">Systems Operational</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

