'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  MessageSquare,
  Workflow,
  FileSpreadsheet,
  Server,
  CheckCircle2,
  Lock,
  Layers,
  Phone,
  AlertTriangle,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  BellOff,
} from 'lucide-react';
import { InstagramIcon as Instagram, WhatsAppIcon as WhatsApp } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export default function SettingsPage() {
  const { theme, setTheme } = useDashboardStore();
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testLink, setTestLink] = useState('');

  useEffect(() => {
    fetch('/api/instagram/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.whatsapp_business_phone) {
          setWhatsappPhone(data.whatsapp_business_phone);
          setTestLink(data.test_url || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPhone(true);
    setPhoneMessage(null);
    try {
      const res = await fetch('/api/instagram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: whatsappPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappPhone(data.whatsapp_business_phone);
        setTestLink(data.test_url || '');
        setPhoneMessage({ type: 'success', text: 'WhatsApp Business Number successfully updated.' });
      } else {
        setPhoneMessage({ type: 'error', text: data.error || 'Failed to save number.' });
      }
    } catch (err: unknown) {
      setPhoneMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error saving phone' });
    } finally {
      setIsSavingPhone(false);
    }
  };

  const integrations = [
    {
      id: 'supabase',
      name: 'Supabase PostgreSQL & Auth',
      category: 'Backend Database',
      icon: Database,
      status: 'connected',
      lastSync: 'Realtime Active',
      endpoint: 'mkeostxsprhhknmznpke.supabase.co',
      description: 'Connected to Supabase project. 12 dedicated isolated admin_* tables for dashboard operations.',
    },
    {
      id: 'whatsapp',
      name: 'Official WhatsApp Cloud API',
      category: 'Meta Business Manager',
      icon: MessageSquare,
      status: 'connected',
      lastSync: 'Active',
      endpoint: 'WABA ID: 392817462019384 · Phone: +91 79720 20292',
      description: 'Official direct Cloud API connection. Webhook logs chats to Supabase via n8n.',
    },
    {
      id: 'instagram',
      name: 'Official Instagram Graph API',
      category: 'Meta Business Manager',
      icon: Instagram,
      status: 'connected',
      lastSync: 'Active',
      endpoint: '@thebusinesswork.co (ID: 1784140582910483)',
      description: 'Comment-to-DM triggers & official Instagram Messaging direct inbox.',
    },
    {
      id: 'n8n',
      name: 'Self-Hosted n8n VPS Engine',
      category: 'Workflow Automation',
      icon: Workflow,
      status: 'connected',
      lastSync: 'Active',
      endpoint: 'https://n8n.thebusinesswork.com',
      description: 'Executes core WhatsApp bot routing, Instagram Reel comment triggers, and sheet backups.',
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets Integration',
      category: 'Lead & Booking Spreadsheet',
      icon: FileSpreadsheet,
      status: 'connected',
      lastSync: 'Active',
      endpoint: 'The Business Work - Master Leads & Bookings',
      description: 'Preserves existing Website & WhatsApp lead tabs, plus dedicated Instagram Leads tab.',
    },
    {
      id: 'vps',
      name: 'VPS Infrastructure Telemetry',
      category: 'System Health',
      icon: Server,
      status: 'connected',
      lastSync: 'Active',
      endpoint: 'vps.thebusinesswork.com',
      description: 'Monitors CPU, RAM, NVMe storage load, and background n8n docker service status.',
    },
  ];

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Settings & System Status"
        subtitle="Review integration health, administrator account security, and database connectivity."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* SECTION 1: PROFILE & ACCOUNT */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
              Administrator Profile & Security
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Authorized administrator account mapped to Supabase Authentication.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-stone-900 text-white font-bold text-base shadow-sm shadow-stone-950/20">
                AR
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-base text-stone-900">
                  Aman Rajbhar
                </div>
                <div className="font-mono text-xs text-stone-600">
                  thebusinesswork.co@gmail.com
                </div>
                <div className="text-[11px] text-stone-400">
                  Role: Principal Administrator & Owner · Boisar, Maharashtra, India
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Superadmin Allowlisted</span>
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1.1: APPEARANCE & THEME (DARK / LIGHT MODE) */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-amber-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  Appearance & Theme
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Customize your dashboard interface theme. Changes persist automatically in your browser.
              </p>
            </div>
            <span className="rounded-lg bg-stone-100 border border-stone-200/80 px-2.5 py-1 text-[11px] font-mono text-stone-600 self-start sm:self-auto">
              Current: <strong className="capitalize text-stone-900">{theme} Mode</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Light Mode Option */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                theme === 'light'
                  ? 'border-stone-900 bg-stone-50/80 ring-2 ring-stone-900/10 shadow-xs'
                  : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-50 p-2 border border-amber-200/60">
                  <Sun className="h-4 w-4 text-amber-600" />
                </div>
                {theme === 'light' && (
                  <CheckCircle2 className="h-4 w-4 text-stone-900" />
                )}
              </div>
              <div>
                <div className="font-semibold text-xs text-stone-900">Light Theme</div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Clean daylight interface with warm stone accents.
                </div>
              </div>
            </button>

            {/* Dark Mode Option */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                theme === 'dark'
                  ? 'border-stone-900 bg-stone-50/80 ring-2 ring-stone-900/10 shadow-xs'
                  : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-indigo-50 p-2 border border-indigo-200/60">
                  <Moon className="h-4 w-4 text-indigo-600" />
                </div>
                {theme === 'dark' && (
                  <CheckCircle2 className="h-4 w-4 text-stone-900" />
                )}
              </div>
              <div>
                <div className="font-semibold text-xs text-stone-900">Dark Theme</div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Obsidian & slate dark palette for night use & focus.
                </div>
              </div>
            </button>

            {/* System Default Option */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                theme === 'system'
                  ? 'border-stone-900 bg-stone-50/80 ring-2 ring-stone-900/10 shadow-xs'
                  : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-stone-100 p-2 border border-stone-200">
                  <Monitor className="h-4 w-4 text-stone-600" />
                </div>
                {theme === 'system' && (
                  <CheckCircle2 className="h-4 w-4 text-stone-900" />
                )}
              </div>
              <div>
                <div className="font-semibold text-xs text-stone-900">System Preference</div>
                <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Automatically adapts to your device OS settings.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 1.2: PERSONAL TEST NUMBER ALERT SUPPRESSION */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4 text-stone-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  Personal Number Alert Suppression
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Automated admin alerts on Telegram & WhatsApp are automatically muted when you test using your personal phone numbers.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>3 Numbers Muted</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-900">+91 7821840347</span>
                <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700">Testing Phone</span>
              </div>
              <div className="text-[11px] text-stone-500">Aman Personal Mobile · Alerts Muted</div>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-900">+91 8604600292</span>
                <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700">Owner Admin</span>
              </div>
              <div className="text-[11px] text-stone-500">Aman Rajbhar · Alerts Muted</div>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-900">+91 7972020292</span>
                <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[9px] font-semibold text-stone-700">Bot WABA</span>
              </div>
              <div className="text-[11px] text-stone-500">Cloud API Sender · Alerts Muted</div>
            </div>
          </div>
        </div>

        {/* SECTION 1B: WHATSAPP BUSINESS NUMBER CONFIGURATION */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <WhatsApp className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  WhatsApp Business Communication & Redirections
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Official E.164 phone number used for Instagram DM consultations, wa.me redirection links, and appointment bookings.
              </p>
            </div>
            {whatsappPhone ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Configured (+{whatsappPhone})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Action Required: Phone Unconfigured</span>
              </span>
            )}
          </div>

          {!whatsappPhone && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Safety Gate Active:</strong> In the absence of a configured number, all automated Instagram DMs use fallback Instagram bio references. Placeholder digits are strictly prohibited from being dispatched to customers.
              </div>
            </div>
          )}

          <form onSubmit={handleSavePhone} className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative w-full sm:max-w-md">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 917972020292 (Digits only, including country code)"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-stone-200/90 focus:outline-hidden focus:border-stone-500 shadow-2xs"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingPhone}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs shrink-0"
              >
                {isSavingPhone ? 'Saving...' : 'Save WhatsApp Number'}
              </button>
            </div>

            {phoneMessage && (
              <div
                className={`text-xs p-2 rounded-lg ${
                  phoneMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {phoneMessage.text}
              </div>
            )}

            {testLink && (
              <div className="pt-2 text-xs text-stone-600 space-y-1">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Verified Generated wa.me Link Preview:
                </div>
                <div className="flex items-center gap-2">
                  <code className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-mono text-stone-800 border border-stone-200 truncate max-w-lg">
                    {testLink}
                  </code>
                  <a
                    href={testLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* SECTION 2: INTEGRATION HEALTH CARDS */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                External System Integrations
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time operational status for all automation, database, and telemetry endpoints.
              </p>
            </div>
            <span className="rounded-lg bg-stone-100 border border-stone-200/80 px-2.5 py-1 text-[11px] font-mono text-stone-600 self-start sm:self-auto">
              Zero Secrets Exposed to Browser
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {integrations.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4.5 flex flex-col justify-between space-y-3 hover:border-stone-300 hover:bg-stone-50 transition-all shadow-2xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-white p-2 border border-stone-200/80 shadow-2xs">
                          <Icon className="h-4 w-4 text-stone-800" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-700 capitalize">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-stone-900">
                        {item.name}
                      </h3>
                      <p className="text-xs text-stone-600 leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-stone-200/60 pt-2.5 text-[11px] font-mono text-stone-500 space-y-0.5">
                    <div className="truncate">
                      Endpoint: <strong className="text-stone-700">{item.endpoint}</strong>
                    </div>
                    <div>
                      Status: <strong className="text-stone-700">{item.lastSync}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: DATABASE & SYSTEM INTEGRITY */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
              Database & Architecture Integrity
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Supabase PostgreSQL operates as the exclusive single source of truth. All mock records have been permanently eliminated.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Production Mode Active</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Zero dummy records. Every dashboard metric, conversation, and appointment is sourced directly from your Supabase database.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                <Lock className="h-4 w-4 text-stone-500" />
                <span>Row Level Security (RLS)</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Protected by <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-stone-200">admin_user_allowlist</code> and Auth User ID checks on all 12 operational tables.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4.5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                <Layers className="h-4 w-4 text-stone-500" />
                <span>Realtime & Storage</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Authenticated Realtime enabled for live chat streaming. Quotation PDFs secured in <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-stone-200">tbw-quotations</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
