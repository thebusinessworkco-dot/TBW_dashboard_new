'use client';

import React from 'react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { AuditLogsSecurity } from '@/components/settings/audit-logs-security';
import { ShieldCheck, Lock, Key, CheckCircle2 } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-full pb-16 bg-[#F4F2EC] dark:bg-[#0E1318]">
      <TopNavbar
        title="Security & Governance Audit"
        subtitle="Row Level Security compliance, allowlist verification, and immutable administrative activity audit."
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'Security & Audit' },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5 space-y-1.5 dark:bg-emerald-950/20 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Allowlist Barrier Active</span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
              Superadmin account <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-emerald-200 dark:bg-emerald-900">thebusinesswork.co@gmail.com</code> strictly verified against <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-emerald-200 dark:bg-emerald-900">admin_user_allowlist</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-5 space-y-1.5 dark:bg-[#151C24] dark:border-[#263342]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#202B35] dark:text-[#FCFBF8]">
              <Lock className="h-4 w-4 text-[#7D8F82]" />
              <span>RLS Enforced on 12 Tables</span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Row Level Security policies prevent unauthorized access across all contacts, messages, leads, and quotations.
            </p>
          </div>

          <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-5 space-y-1.5 dark:bg-[#151C24] dark:border-[#263342]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#202B35] dark:text-[#FCFBF8]">
              <Key className="h-4 w-4 text-[#7D8F82]" />
              <span>Zero Browser Secrets</span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Supabase service-role keys, Meta tokens, n8n credentials, and VPS access keys are strictly isolated to server routes.
            </p>
          </div>
        </div>

        {/* Audit Log Component */}
        <AuditLogsSecurity />
      </div>
    </div>
  );
}
