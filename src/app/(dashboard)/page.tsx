'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Server,
  FileText,
  ArrowRight,
  ChevronRight,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatINR,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getConversationStatusBadge,
  getAppointmentStatusBadge,
} from '@/lib/utils';
import { ConversationStatus } from '@/lib/types/dashboard';

export default function OverviewPage() {
  const router = useRouter();
  const {
    conversations,
    leads,
    appointments,
    quotations,
    workflows,
    vpsMetrics,
    commentAutomations,
    timeFilter,
    updateConversationStatus,
  } = useDashboardStore();

  // Metrics computation based on store data
  const totalConversations = conversations.length;
  const completedConversations = conversations.filter((c) => c.status === 'completed').length;
  const incompleteConversations = conversations.filter((c) => c.status === 'incomplete').length;
  const waConversations = conversations.filter((c) => c.platform === 'whatsapp').length;
  const igConversations = conversations.filter((c) => c.platform === 'instagram').length;
  const pendingConversations = conversations.filter(
    (c) => c.status === 'open' || c.status === 'waiting_for_customer' || c.status === 'needs_attention'
  );
  const totalLeads = leads.length;
  const totalAppointments = appointments.length;
  const upcomingAppointments = appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending');
  
  const activeAutomations = commentAutomations.filter((a) => a.is_enabled).length + workflows.filter((w) => w.is_active).length;
  const failedAutomations = commentAutomations.filter((a) => a.last_status === 'failed').length + workflows.filter((w) => w.last_execution_status === 'error').length;

  const recentWaChats = conversations.filter((c) => c.platform === 'whatsapp').slice(0, 3);
  const recentIgChats = conversations.filter((c) => c.platform === 'instagram').slice(0, 3);
  const recentWorkflowErrors = workflows
    .flatMap((w) => w.recent_executions)
    .filter((e) => e.status === 'error')
    .slice(0, 3);

  const latestQuotations = quotations.slice(0, 3);

  // Status options for quick inline modifier
  const statusOptions: { value: ConversationStatus; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'waiting_for_customer', label: 'Waiting for Customer' },
    { value: 'completed', label: 'Completed' },
    { value: 'incomplete', label: 'Incomplete' },
    { value: 'needs_attention', label: 'Needs Attention' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Business Overview"
        subtitle="Control all automation channels, leads, appointments, quotations, and workflows from one place."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* TOP SUMMARY CARDS (10 Key Business Metrics) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A756D]">
              Real-time Performance Metrics ({timeFilter.toUpperCase()})
            </h2>
            <span className="text-[11px] text-[#7A756D]">
              Click any metric to drill down
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {/* 1. Total Conversations */}
            <div
              onClick={() => router.push('/whatsapp')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-[#141413] hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Chats</span>
                <MessageSquare className="h-4 w-4 group-hover:text-[#141413] transition-colors" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-[#141413]">
                {totalConversations}
              </div>
              <div className="mt-1 text-[11px] text-[#7A756D]">
                WhatsApp & Instagram
              </div>
            </div>

            {/* 2. Completed Conversations */}
            <div
              onClick={() => router.push('/whatsapp?status=completed')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-emerald-600 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                {completedConversations}
              </div>
              <div className="mt-1 text-[11px] text-emerald-600">
                Verified resolved
              </div>
            </div>

            {/* 3. Incomplete Conversations */}
            <div
              onClick={() => router.push('/whatsapp?status=incomplete')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-orange-600 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-800">Incomplete</span>
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-orange-700">
                {incompleteConversations}
              </div>
              <div className="mt-1 text-[11px] text-orange-600">
                Dropped off / follow-up
              </div>
            </div>

            {/* 4. WhatsApp Conversations */}
            <div
              onClick={() => router.push('/whatsapp')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-[#25D366] hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#25D366]">WhatsApp</span>
                <MessageSquare className="h-4 w-4 text-[#25D366]" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-[#141413]">
                {waConversations}
              </div>
              <div className="mt-1 text-[11px] text-[#7A756D]">
                Cloud API direct
              </div>
            </div>

            {/* 5. Instagram Conversations */}
            <div
              onClick={() => router.push('/instagram')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-[#E1306C] hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#E1306C]">Instagram</span>
                <Instagram className="h-4 w-4 text-[#E1306C]" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-[#141413]">
                {igConversations}
              </div>
              <div className="mt-1 text-[11px] text-[#7A756D]">
                DMs & Comments
              </div>
            </div>

            {/* 6. Total Leads */}
            <div
              onClick={() => router.push('/leads')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-[#141413] hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
                <Users className="h-4 w-4 group-hover:text-[#141413]" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-[#141413]">
                {totalLeads}
              </div>
              <div className="mt-1 text-[11px] text-[#7A756D]">
                Synced with Google Sheets
              </div>
            </div>

            {/* 7. Total Appointments */}
            <div
              onClick={() => router.push('/appointments')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-[#141413] hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider">Bookings</span>
                <Calendar className="h-4 w-4 group-hover:text-[#141413]" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-[#141413]">
                {totalAppointments}
              </div>
              <div className="mt-1 text-[11px] text-[#7A756D]">
                {upcomingAppointments.length} upcoming/pending
              </div>
            </div>

            {/* 8. Active Automations */}
            <div
              onClick={() => router.push('/n8n')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-emerald-600 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Automations</span>
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                {activeAutomations}
              </div>
              <div className="mt-1 text-[11px] text-emerald-600">
                n8n + Reel triggers active
              </div>
            </div>

            {/* 9. Failed Automations */}
            <div
              onClick={() => router.push('/n8n?filter=failed')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-rose-600 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Errors</span>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-rose-700">
                {failedAutomations}
              </div>
              <div className="mt-1 text-[11px] text-rose-600">
                Needs attention
              </div>
            </div>

            {/* 10. VPS Health */}
            <div
              onClick={() => router.push('/vps')}
              className="group cursor-pointer rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs hover:border-emerald-600 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-[#7A756D]">
                <span className="text-xs font-semibold uppercase tracking-wider">VPS Status</span>
                <Server className="h-4 w-4 group-hover:text-[#141413]" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    vpsMetrics.status === 'healthy'
                      ? 'bg-emerald-500 animate-pulse'
                      : vpsMetrics.status === 'warning'
                      ? 'bg-amber-500'
                      : vpsMetrics.status === 'not_connected'
                      ? 'bg-stone-400'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-lg font-bold capitalize text-[#141413]">
                  {vpsMetrics.status === 'not_connected' ? 'Disconnected' : vpsMetrics.status}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#7A756D]">
                CPU {vpsMetrics.cpu_percent}% · RAM {vpsMetrics.ram_percent}%
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: CONVERSATIONS & APPOINTMENTS (Immediate Attention) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pending Conversations Needing Attention */}
          <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#141413]">
                  Pending Conversations ({pendingConversations.length})
                </h3>
              </div>
              <Link
                href="/whatsapp"
                className="text-xs font-semibold text-[#555047] hover:text-[#141413] flex items-center gap-1"
              >
                <span>View Inbox</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {pendingConversations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A756D]">
                No pending conversations. All customer chats are resolved!
              </div>
            ) : (
              <div className="divide-y divide-[#EFECE4]">
                {pendingConversations.map((conv) => {
                  const badge = getConversationStatusBadge(conv.status);
                  return (
                    <div key={conv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-[#141413]">
                            {conv.contact.name}
                          </span>
                          <span className="text-[11px] text-[#7A756D]">
                            {conv.contact.company_name || conv.contact.phone || `@${conv.contact.instagram_username}`}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#555047] line-clamp-1">
                          {conv.last_message}
                        </p>
                      </div>

                      {/* Quick Status Modifier dropdown */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={conv.status}
                          onChange={(e) => updateConversationStatus(conv.id, e.target.value as ConversationStatus)}
                          className="rounded-md border border-[#E2DDD3] bg-[#FAF8F5] px-2 py-1 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => router.push(`/${conv.platform}`)}
                          className="rounded-md bg-[#141413] p-1.5 text-white hover:bg-[#2A2825]"
                          title="Open in inbox"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#141413]" />
                <h3 className="text-sm font-bold text-[#141413]">
                  Upcoming Appointments ({upcomingAppointments.length})
                </h3>
              </div>
              <Link
                href="/appointments"
                className="text-xs font-semibold text-[#555047] hover:text-[#141413] flex items-center gap-1"
              >
                <span>All Appointments</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A756D]">
                No appointments scheduled for upcoming slots.
              </div>
            ) : (
              <div className="divide-y divide-[#EFECE4]">
                {upcomingAppointments.map((appt) => {
                  const badge = getAppointmentStatusBadge(appt.status);
                  return (
                    <div key={appt.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-[#141413]">
                            {appt.customer_name}
                          </span>
                          <span className="text-[11px] text-[#7A756D]">
                            ({appt.platform.toUpperCase()})
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#555047] line-clamp-1">
                          {appt.service_requested}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-[#141413]">
                          {formatDate(appt.appointment_date)}
                        </div>
                        <div className="text-[11px] text-[#7A756D]">
                          {appt.appointment_time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: LIVE INBOX ACTIVITY (WhatsApp & Instagram) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent WhatsApp Messages */}
          <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#25D366]" />
                <h3 className="text-sm font-bold text-[#141413]">
                  Recent WhatsApp Automation Activity
                </h3>
              </div>
              <Link
                href="/whatsapp"
                className="text-xs font-semibold text-[#25D366] hover:underline"
              >
                Open WhatsApp Inbox →
              </Link>
            </div>

            <div className="space-y-3">
              {recentWaChats.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E2DDD3] bg-[#FAF8F5] p-6 text-center text-xs text-[#7A756D]">
                  No WhatsApp conversations recorded yet.
                </div>
              ) : (
                recentWaChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => router.push('/whatsapp')}
                    className="cursor-pointer rounded-lg border border-[#EFECE4] bg-[#FAF8F5] p-3 hover:border-[#CDC7BA] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#141413]">
                        {chat.contact.name} ({chat.contact.phone})
                      </span>
                      <span className="text-[10px] text-[#7A756D]">
                        {formatRelativeTime(chat.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#555047] line-clamp-2">
                      {chat.last_message}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[#7A756D]">
                        Status: <strong className="text-[#141413] capitalize">{chat.status.replace('_', ' ')}</strong>
                      </span>
                      {chat.manual_takeover ? (
                        <span className="font-semibold text-purple-700">Manual Takeover Active</span>
                      ) : (
                        <span className="text-emerald-700">Automation Running</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Instagram Messages */}
          <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#E1306C]" />
                <h3 className="text-sm font-bold text-[#141413]">
                  Recent Instagram DMs & Reel Triggers
                </h3>
              </div>
              <Link
                href="/instagram"
                className="text-xs font-semibold text-[#E1306C] hover:underline"
              >
                Open Instagram Manager →
              </Link>
            </div>

            <div className="space-y-3">
              {recentIgChats.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E2DDD3] bg-[#FAF8F5] p-6 text-center text-xs text-[#7A756D]">
                  No Instagram conversations recorded yet.
                </div>
              ) : (
                recentIgChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => router.push('/instagram')}
                    className="cursor-pointer rounded-lg border border-[#EFECE4] bg-[#FAF8F5] p-3 hover:border-[#CDC7BA] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#141413]">
                        @{chat.contact.instagram_username} ({chat.contact.name})
                      </span>
                      <span className="text-[10px] text-[#7A756D]">
                        {formatRelativeTime(chat.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#555047] line-clamp-2">
                      {chat.last_message}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[#7A756D]">
                        Status: <strong className="text-[#141413] capitalize">{chat.status.replace('_', ' ')}</strong>
                      </span>
                      <span className="text-[#7A756D]">
                        {chat.unread_count > 0 ? `${chat.unread_count} unread` : 'Read'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM STABILITY & WORKFLOW ERRORS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Workflow Execution Errors */}
          <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-bold text-[#141413]">
                  n8n Workflow Monitoring & Failure Logs
                </h3>
              </div>
              <Link
                href="/n8n"
                className="text-xs font-semibold text-[#555047] hover:text-[#141413]"
              >
                View n8n Workflows →
              </Link>
            </div>

            {recentWorkflowErrors.length === 0 ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>All connected n8n workflows executed without errors in the last check window.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkflowErrors.map((err) => (
                  <div
                    key={err.id}
                    className="rounded-lg border border-rose-200 bg-rose-50/60 p-3.5 text-xs text-rose-900"
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>{err.workflow_name}</span>
                      <span className="text-[11px] text-rose-700">{formatDateTime(err.started_at)}</span>
                    </div>
                    <div className="text-rose-800 mb-2 font-mono text-[11px]">
                      Failed Node: <strong>{err.failed_node_name || 'Workflow Error'}</strong>
                    </div>
                    <p className="text-[11px] text-rose-950 bg-rose-100/70 p-2 rounded border border-rose-200">
                      {err.error_message}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span className="text-rose-700 font-mono">Execution ID: {err.execution_id}</span>
                      <Link
                        href="/n8n"
                        className="font-semibold text-rose-900 underline hover:text-black"
                      >
                        Inspect in n8n →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quotations & Quick Summary */}
          <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#141413]" />
                <h3 className="text-sm font-bold text-[#141413]">
                  Latest Quotations
                </h3>
              </div>
              <Link
                href="/quotations"
                className="text-xs font-semibold text-[#555047] hover:text-[#141413]"
              >
                Builder →
              </Link>
            </div>

            <div className="divide-y divide-[#EFECE4]">
              {latestQuotations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E2DDD3] bg-[#FAF8F5] p-6 text-center text-xs text-[#7A756D]">
                  No quotations created yet.
                </div>
              ) : (
                latestQuotations.map((q) => {
                  const subtotal = q.items.reduce(
                    (sum, item) => sum + (item.setup_charge * item.quantity),
                    0
                  );
                  return (
                    <div key={q.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-[#141413]">
                          {q.customer_name}
                        </div>
                        <div className="text-[11px] text-[#7A756D]">
                          {q.quotation_number} · {q.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#141413]">
                          {formatINR(subtotal - q.discount_amount)}
                        </div>
                        <div className="text-[10px] text-[#7A756D]">
                          {q.sent_via ? `Sent via ${q.sent_via}` : 'Draft'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#EFECE4]">
              <Link
                href="/quotations"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#141413] py-2 text-xs font-semibold text-white hover:bg-[#2A2825]"
              >
                <span>Create New Quotation (INR ₹)</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
