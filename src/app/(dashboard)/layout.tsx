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
  const { error, refreshData } = useDashboardStore();

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-[#F8F7F4]">
      {/* Sidebar (Desktop fixed/static + Mobile slide-over) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {error && (
          <div className="bg-rose-50/90 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center justify-between shadow-2xs backdrop-blur-xs shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => refreshData()}
              className="inline-flex items-center gap-1.5 font-semibold text-rose-900 hover:text-black cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs transition hover:bg-rose-50"
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

