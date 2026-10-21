'use client';

import React, { useState } from 'react';
import { Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export function DemoBanner() {
  const { hasDemoData, removeDemoData } = useDashboardStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [removedNotification, setRemovedNotification] = useState(false);

  if (!hasDemoData && !removedNotification) return null;

  if (removedNotification) {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Demo data successfully removed. Only real records will appear.</span>
        </div>
        <button
          onClick={() => setRemovedNotification(false)}
          className="text-xs font-semibold hover:underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  const handleConfirmPurge = () => {
    removeDemoData();
    setShowConfirmModal(false);
    setRemovedNotification(true);
  };

  return (
    <>
      <div className="bg-[#FAF4E6] border-b border-[#E8DEC7] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B5A33]">
        <div className="flex items-center gap-2">
          <span className="flex h-5 items-center rounded bg-[#8A6D2A] px-1.5 font-bold uppercase tracking-wider text-[10px] text-white">
            DEMO
          </span>
          <span className="font-medium">
            Demo data active for preview. Production records and real integrations remain completely isolated.
          </span>
        </div>

        <button
          onClick={() => setShowConfirmModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#D5C4A1] bg-white px-2.5 py-1 text-xs font-semibold text-[#57451B] hover:bg-[#F2E8D3] transition-colors shadow-2xs"
        >
          <Trash2 className="h-3 w-3" />
          <span>Remove All Demo Data</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#E2DDD3] bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 text-amber-800 mb-3">
              <div className="rounded-full bg-amber-100 p-2">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </div>
              <h3 className="font-semibold text-base text-[#141413]">
                Remove All Demo Data?
              </h3>
            </div>

            <p className="text-sm text-[#555047] leading-relaxed mb-4">
              This will safely remove simulated demo conversations, sample leads, mock appointments, and test quotations.
            </p>

            <div className="rounded-lg bg-[#FAF8F5] border border-[#E2DDD3] p-3 text-xs text-[#555047] mb-5 space-y-1">
              <div className="font-semibold text-[#141413] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Guaranteed Safe Action:
              </div>
              <div>• Preserves your Supabase user account</div>
              <div>• Preserves all real Google Sheets leads & rows</div>
              <div>• Never alters n8n workflows or production data</div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg border border-[#E2DDD3] px-4 py-2 text-xs font-semibold text-[#555047] hover:bg-[#F8F7F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPurge}
                className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 shadow-xs"
              >
                Yes, Remove Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
