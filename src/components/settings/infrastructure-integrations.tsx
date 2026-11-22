'use client';

import React, { useState } from 'react';
import {
  Workflow,
  Database,
  FileSpreadsheet,
  Calendar,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface InfrastructureIntegrationsProps {
  integrations: Array<{
    service_name: string;
    status: string;
    last_sync_at?: string | null;
    error_message?: string;
    details?: Record<string, unknown>;
  }>;
}

export function InfrastructureIntegrations({ integrations }: InfrastructureIntegrationsProps) {
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncResult, setSheetsSyncResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSyncSheets = async () => {
    setIsSyncingSheets(true);
    setSheetsSyncResult(null);
    try {
      const res = await fetch('/api/sync/google-sheets', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSheetsSyncResult({
          type: 'success',
          text: `Google Sheets synced: ${data.leads_synced || 0} leads and ${data.appointments_synced || 0} appointments verified.`,
        });
      } else {
        setSheetsSyncResult({
          type: 'error',
          text: data.error || 'Failed to sync with Google Sheets.',
        });
      }
    } catch (err: unknown) {
      setSheetsSyncResult({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error syncing Google Sheets',
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 9: N8N ENGINE */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-600 p-2 text-white">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Self-Hosted n8n VPS Engine
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Core automation orchestrator running on dedicated CloudOnFire VPS.
              </p>
            </div>
          </div>

          <a
            href="https://n8n.thebusinesswork.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 dark:text-orange-400"
          >
            <span>Open n8n Instance</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342] text-xs font-mono">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Base URL
            </span>
            <strong className="text-stone-800 dark:text-stone-200">https://n8n.thebusinesswork.com</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Public API Key
            </span>
            <strong className="text-stone-800 dark:text-stone-200">Protected (Server-Side Only)</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Webhook Dispatch
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400">HTTP/2 Direct VPS Tunnel</strong>
          </div>
        </div>
      </div>

      {/* SECTION 10: SUPABASE CONFIGURATION */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2 text-white">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Supabase PostgreSQL & Realtime Engine
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Exclusive production database source of truth. 12 dedicated admin tables.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>PostgreSQL Active</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342] text-xs font-mono">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Supabase Project Ref
            </span>
            <strong className="text-stone-800 dark:text-stone-200">mkeostxsprhhknmznpke</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              RLS Allowlist Security
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400">Strict Auth UID Check</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              PDF Storage Bucket
            </span>
            <strong className="text-stone-800 dark:text-stone-200">tbw-quotations (Private)</strong>
          </div>
        </div>
      </div>

      {/* SECTION 11: GOOGLE SHEETS */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-600 p-2 text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Google Sheets CRM Integration
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Two-way lead synchronization with Master Spreadsheet.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSyncSheets}
            isLoading={isSyncingSheets}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Sync Sheets Now
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342] text-xs">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Spreadsheet Target
            </span>
            <strong className="text-stone-800 dark:text-stone-200">The Business Work - Master</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Preserved Tabs
            </span>
            <strong className="font-mono text-stone-800 dark:text-stone-200">Website, WhatsApp, Instagram</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Service Account
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400">Authenticated (Read/Write)</strong>
          </div>
        </div>

        {sheetsSyncResult && (
          <div
            className={`text-xs p-3 rounded-xl border flex items-center gap-2 ${
              sheetsSyncResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {sheetsSyncResult.type === 'success' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{sheetsSyncResult.text}</span>
          </div>
        )}
      </div>

      {/* SECTION 12: GOOGLE CALENDAR */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Google Calendar Synchronization
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Automated consultation scheduling with deduplicated reminder dispatch.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Calendar Linked</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342] text-xs font-mono">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Calendar Timezone
            </span>
            <strong className="text-stone-800 dark:text-stone-200">Asia/Kolkata (+05:30 IST)</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Meeting Slot Duration
            </span>
            <strong className="text-stone-800 dark:text-stone-200">30 Minutes Default</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Reminder Schedule
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400">24h & 1h WhatsApp Alerts</strong>
          </div>
        </div>
      </div>

      {/* VPS HARDWARE TELEMETRY SUMMARY */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-stone-800 p-2 text-white">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                CloudOnFire VPS Infrastructure
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Host specs: 1 vCPU, 1 GB RAM, 10 GB NVMe storage at Boisar datacenter.
              </p>
            </div>
          </div>

          <a
            href="/vps"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#202B35] hover:underline dark:text-stone-200"
          >
            <span>View Full VPS Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342]">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Compute</span>
            <strong className="text-xs text-stone-800 dark:text-stone-200">1 vCPU (AMD/Intel)</strong>
          </div>
          <div className="p-3.5 rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342]">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Memory</span>
            <strong className="text-xs text-stone-800 dark:text-stone-200">1.0 GB RAM</strong>
          </div>
          <div className="p-3.5 rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342]">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">NVMe Disk</span>
            <strong className="text-xs text-stone-800 dark:text-stone-200">10.0 GB NVMe</strong>
          </div>
          <div className="p-3.5 rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342]">
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Container Stack</span>
            <strong className="text-xs text-emerald-700 dark:text-emerald-400">n8n, Caddy, Postgres</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
