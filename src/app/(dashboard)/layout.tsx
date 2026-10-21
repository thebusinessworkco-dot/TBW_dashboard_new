'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { error, refreshData } = useDashboardStore();

  return (
    <div className="flex min-h-screen bg-[#F8F7F3]">
      {/* Sidebar (Desktop fixed/static + Mobile slide-over) */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {error && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => refreshData()}
              className="inline-flex items-center gap-1.5 font-semibold text-rose-900 hover:text-black cursor-pointer bg-white px-2 py-1 rounded border border-rose-200 shadow-2xs"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
