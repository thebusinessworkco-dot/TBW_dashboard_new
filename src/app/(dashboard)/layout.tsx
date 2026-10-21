'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { DemoBanner } from '@/components/layout/demo-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8F7F3]">
      {/* Sidebar (Desktop fixed/static + Mobile slide-over) */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <DemoBanner />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
