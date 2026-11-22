'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { error, refreshData } = useDashboardStore();

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#F4F2EC] text-[#202B35] dark:bg-[#0D1217] dark:text-[#FCFBF8]">
      {/* Global Collapsible & Mobile Drawer Sidebar */}
      <Sidebar />

      {/* Main Content Viewport Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {error && (
          <div className="bg-rose-50/95 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center justify-between shadow-2xs backdrop-blur-xs shrink-0 dark:bg-rose-950/70 dark:border-rose-900/60 dark:text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 dark:text-rose-400" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={() => refreshData()}
              className="inline-flex items-center gap-1.5 font-bold text-rose-900 hover:text-black cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs transition hover:bg-rose-50 dark:bg-[#141A22] dark:border-rose-900 dark:text-rose-200 dark:hover:bg-[#1B232D]"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
