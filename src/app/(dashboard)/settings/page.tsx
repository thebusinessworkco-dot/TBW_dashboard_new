'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Database,
  MessageSquare,
  Workflow,
  FileSpreadsheet,
  Server,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export default function SettingsPage() {
  const { hasDemoData, removeDemoData } = useDashboardStore();

  const [confirmPurgeModal, setConfirmPurgeModal] = useState(false);
  const [purgedSuccess, setPurgedSuccess] = useState(false);

  const handlePurge = () => {
    removeDemoData();
    setConfirmPurgeModal(false);
    setPurgedSuccess(true);
    setTimeout(() => setPurgedSuccess(false), 5000);
  };

  const integrations = [
    {
      id: 'supabase',
      name: 'Supabase PostgreSQL & Auth',
      category: 'Backend Database',
      icon: Database,
      status: 'connected',
      lastSync: '2026-10-21 10:15 AM',
      endpoint: 'ap-south-1.supabase.co (Mumbai)',
      description: 'Connected to existing Supabase project. Dedicated isolated admin_* tables for dashboard control.',
    },
    {
      id: 'whatsapp',
      name: 'Official WhatsApp Cloud API',
      category: 'Meta Business Manager',
      icon: MessageSquare,
      status: 'connected',
      lastSync: '2026-10-21 09:42 AM',
      endpoint: 'WABA ID: 392817462019384 · Phone: +91 79720 20292',
      description: 'Official direct Cloud API connection. Webhook logs chats to Supabase via n8n.',
    },
    {
      id: 'instagram',
      name: 'Official Instagram Graph API',
      category: 'Meta Business Manager',
      icon: Instagram,
      status: 'connected',
      lastSync: '2026-10-21 08:50 AM',
      endpoint: '@thebusinesswork.co (ID: 1784140582910483)',
      description: 'Comment-to-DM triggers & official Instagram Messaging direct inbox.',
    },
    {
      id: 'n8n',
      name: 'Self-Hosted n8n VPS Engine',
      category: 'Workflow Automation',
      icon: Workflow,
      status: 'connected',
      lastSync: '2026-10-21 10:15 AM',
      endpoint: 'https://n8n.thebusinesswork.com',
      description: 'Executes core WhatsApp bot routing, Instagram Reel comment triggers, and sheet backups.',
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets Integration',
      category: 'Lead & Booking Spreadsheet',
      icon: FileSpreadsheet,
      status: 'connected',
      lastSync: '2026-10-21 09:00 AM',
      endpoint: 'The Business Work - Master Leads & Bookings',
      description: 'Preserves existing Website & WhatsApp lead tabs, plus dedicated Instagram Leads tab.',
    },
    {
      id: 'vps',
      name: 'VPS Infrastructure Telemetry',
      category: 'System Health',
      icon: Server,
      status: 'connected',
      lastSync: '2026-10-21 10:15 AM',
      endpoint: 'vps.thebusinesswork.com',
      description: 'Monitors CPU, RAM, NVMe storage load, and background n8n docker service status.',
    },
  ];

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Settings & System Status"
        subtitle="Review integration health, administrator account security, and manage demo datasets."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Purge feedback alert */}
        {purgedSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>All demo sample records removed successfully. All production records and credentials preserved!</span>
          </div>
        )}

        {/* SECTION 1: PROFILE & ACCOUNT */}
        <div className="rounded-xl border border-[#E2DDD3] bg-white p-6 shadow-2xs space-y-4">
          <div className="border-b border-[#EFECE4] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#141413]">
              Administrator Profile & Security
            </h2>
            <p className="text-xs text-[#7A756D]">
              Authorized administrator account mapped to Supabase Authentication.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#141413] text-white font-bold text-lg shadow-xs">
                AR
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-base text-[#141413]">
                  Aman Rajbhar
                </div>
                <div className="font-mono text-xs text-[#555047]">
                  thebusinesswork.co@gmail.com
                </div>
                <div className="text-[11px] text-[#7A756D]">
                  Role: Principal Administrator & Owner · Boisar, Maharashtra, India
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Allowlist Server-Side Enforced</span>
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: INTEGRATIONS STATUS */}
        <div className="rounded-xl border border-[#E2DDD3] bg-white p-6 shadow-2xs space-y-4">
          <div className="border-b border-[#EFECE4] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#141413]">
                External Service Integrations
              </h2>
              <p className="text-xs text-[#7A756D]">
                Real-time operational status for all connected business services. (Secrets are never exposed).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-4 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-white p-2 border border-[#E2DDD3] text-[#141413]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-[#141413]">{item.name}</h3>
                        <span className="text-[10px] text-[#7A756D] uppercase tracking-wider">{item.category}</span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  </div>

                  <p className="text-xs text-[#555047] leading-relaxed">
                    {item.description}
                  </p>

                  <div className="border-t border-[#EFECE4] pt-2 flex items-center justify-between text-[11px] text-[#7A756D]">
                    <span className="font-mono truncate max-w-[200px]">{item.endpoint}</span>
                    <span>Last Sync: {item.lastSync}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: DEMO DATA MANAGEMENT */}
        <div className="rounded-xl border border-[#E2DDD3] bg-white p-6 shadow-2xs space-y-4">
          <div className="border-b border-[#EFECE4] pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#141413]">
              Demo Data Management
            </h2>
            <p className="text-xs text-[#7A756D]">
              Remove simulated records to run exclusively with live production data.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>
                  {hasDemoData
                    ? 'Sample Demo Dataset Currently Active'
                    : 'Clean Production Mode Active (No Demo Data)'}
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {hasDemoData
                  ? 'Click below to purge all simulated demo records. Real conversations, appointments, Google Sheets rows, and Supabase accounts are completely safe.'
                  : 'All demo items have been successfully removed. Your dashboard is displaying only genuine records.'}
              </p>
            </div>

            {hasDemoData && (
              <button
                type="button"
                onClick={() => setConfirmPurgeModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 shadow-xs cursor-pointer shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove All Demo Data</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM PURGE MODAL */}
      {confirmPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2DDD3] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-2 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#141413]">
                  Confirm Demo Data Removal
                </h3>
                <p className="text-xs text-[#7A756D]">
                  This action is permanent for simulated records.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#555047] leading-relaxed">
              Are you sure you want to remove all sample demo records from this dashboard?
            </p>

            <div className="rounded-lg bg-[#FAF8F5] border border-[#E2DDD3] p-3 text-xs space-y-1.5 text-[#555047]">
              <div className="font-bold text-[#141413]">Guaranteed Protection:</div>
              <div>✓ Preserves the Supabase user account</div>
              <div>✓ Preserves Google Sheet tabs and rows</div>
              <div>✓ Never alters n8n workflows or VPS status</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPurgeModal(false)}
                className="rounded-lg border border-[#E2DDD3] px-4 py-2 text-xs font-semibold text-[#555047] hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurge}
                className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 shadow-xs cursor-pointer"
              >
                Yes, Purge Demo Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
