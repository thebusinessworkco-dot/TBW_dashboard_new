'use client';

import React from 'react';
import { Menu, AlertTriangle } from 'lucide-react';
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
  const { timeFilter, setTimeFilter, integrationStatuses, vpsMetrics } = useDashboardStore();

  const hasIssues = integrationStatuses.some((i) => i.status === 'error') || vpsMetrics.status === 'critical';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E2DDD3] bg-[#FAF8F5]/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile hamburger & Titles */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-[#555047] hover:bg-[#EFECE4] lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#141413] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden sm:block text-xs text-[#7A756D]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Time Range filter & System Status Pill */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Time Filter Pills */}
        <div className="flex items-center rounded-lg border border-[#E2DDD3] bg-white p-0.5 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setTimeFilter('today')}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              timeFilter === 'today'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'text-[#555047] hover:text-[#141413]'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('7d')}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              timeFilter === '7d'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'text-[#555047] hover:text-[#141413]'
            }`}
          >
            Last 7D
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('30d')}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              timeFilter === '30d'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'text-[#555047] hover:text-[#141413]'
            }`}
          >
            Last 30D
          </button>
        </div>

        {/* Integration Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[#E2DDD3] bg-white px-3 py-1 text-xs text-[#555047] shadow-2xs">
          {hasIssues ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium text-amber-800">Check Integrations</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-[#141413]">System Active</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
