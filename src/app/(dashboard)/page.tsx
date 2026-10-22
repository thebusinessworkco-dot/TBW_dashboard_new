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
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Performance Telemetry
              </h2>
              <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                {timeFilter.toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] text-stone-400">
              Interactive metrics · Click to drill down
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {/* 1. Total Conversations */}
            <div
              onClick={() => router.push('/whatsapp')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-stone-400 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Chats</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                {totalConversations}
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                WhatsApp & Instagram
              </div>
            </div>

            {/* 2. Completed Conversations */}
            <div
              onClick={() => router.push('/whatsapp?status=completed')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Completed</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                {completedConversations}
              </div>
              <div className="mt-1 text-[11px] text-emerald-600">
                Resolved & closed
              </div>
            </div>

            {/* 3. Incomplete Conversations */}
            <div
              onClick={() => router.push('/whatsapp?status=incomplete')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-orange-500 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">Incomplete</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600 border border-orange-200 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-orange-700">
                {incompleteConversations}
              </div>
              <div className="mt-1 text-[11px] text-orange-600">
                Follow-up required
              </div>
            </div>

            {/* 4. WhatsApp Conversations */}
            <div
              onClick={() => router.push('/whatsapp')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">WhatsApp</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                {waConversations}
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                Meta Cloud API direct
              </div>
            </div>

            {/* 5. Instagram Conversations */}
            <div
              onClick={() => router.push('/instagram')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Instagram</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <Instagram className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                {igConversations}
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                DMs & Comments
              </div>
            </div>

            {/* 6. Total Leads */}
            <div
              onClick={() => router.push('/leads')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-stone-400 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Leads</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                {totalLeads}
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                Google Sheets synced
              </div>
            </div>

            {/* 7. Total Appointments */}
            <div
              onClick={() => router.push('/appointments')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-stone-400 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Bookings</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                {totalAppointments}
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                {upcomingAppointments.length} pending / confirmed
              </div>
            </div>

            {/* 8. Active Automations */}
            <div
              onClick={() => router.push('/n8n')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-purple-400 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Automations</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-200 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-purple-700">
                {activeAutomations}
              </div>
              <div className="mt-1 text-[11px] text-purple-600">
                n8n + Reel triggers
              </div>
            </div>

            {/* 9. Failed Automations */}
            <div
              onClick={() => router.push('/n8n?filter=failed')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Errors</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-rose-700">
                {failedAutomations}
              </div>
              <div className="mt-1 text-[11px] text-rose-600">
                Requires inspection
              </div>
            </div>

            {/* 10. VPS Health */}
            <div
              onClick={() => router.push('/vps')}
              className="group cursor-pointer rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-stone-400 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">VPS Status</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                  <Server className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    vpsMetrics.status === 'healthy'
                      ? 'bg-emerald-500 animate-pulse'
                      : vpsMetrics.status === 'warning'
                      ? 'bg-amber-500'
                      : vpsMetrics.status === 'not_connected'
                      ? 'bg-stone-400'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-lg font-bold capitalize text-stone-900">
                  {vpsMetrics.status === 'not_connected' ? 'Disconnected' : vpsMetrics.status}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-stone-400">
                CPU {vpsMetrics.cpu_percent}% · RAM {vpsMetrics.ram_percent}%
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: CONVERSATIONS & APPOINTMENTS (Immediate Attention) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pending Conversations Needing Attention */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Pending Conversations
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {pendingConversations.length} conversation{pendingConversations.length === 1 ? '' : 's'} awaiting follow-up
                  </p>
                </div>
              </div>
              <Link
                href="/whatsapp"
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition"
              >
                <span>View Inbox</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {pendingConversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                No pending conversations. All customer chats are resolved!
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingConversations.map((conv) => {
                  const badge = getConversationStatusBadge(conv.status);
                  return (
                    <div key={conv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-stone-900">
                            {conv.contact.name}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {conv.contact.company_name || conv.contact.phone || `@${conv.contact.instagram_username}`}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 line-clamp-1">
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </div>

                      {/* Quick Status Modifier dropdown */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={conv.status}
                          onChange={(e) => updateConversationStatus(conv.id, e.target.value as ConversationStatus)}
                          className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none transition"
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => router.push(`/${conv.platform}`)}
                          className="rounded-xl bg-stone-900 p-1.5 text-white hover:bg-stone-800 cursor-pointer transition shadow-2xs"
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
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Upcoming Appointments
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {upcomingAppointments.length} confirmed booking{upcomingAppointments.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <Link
                href="/appointments"
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition"
              >
                <span>All Appointments</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                No appointments scheduled for upcoming slots.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {upcomingAppointments.map((appt) => {
                  const badge = getAppointmentStatusBadge(appt.status);
                  return (
                    <div key={appt.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-stone-900">
                            {appt.customer_name}
                          </span>
                          <span className="text-[10px] rounded-md bg-stone-100 px-1.5 py-0.2 text-stone-600 font-mono font-medium">
                            {appt.platform.toUpperCase()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 line-clamp-1">
                          {appt.service_requested}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-stone-900">
                          {formatDate(appt.appointment_date)}
                        </div>
                        <div className="text-[11px] text-stone-400">
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
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-stone-900">
                  Recent WhatsApp Activity
                </h3>
              </div>
              <Link
                href="/whatsapp"
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>Open Inbox</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentWaChats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-6 text-center text-xs text-stone-400">
                  No WhatsApp conversations recorded yet.
                </div>
              ) : (
                recentWaChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => router.push('/whatsapp')}
                    className="cursor-pointer rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5 hover:border-stone-400 hover:bg-stone-50 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-stone-900">
                        {chat.contact.name} ({chat.contact.phone})
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">
                        {formatRelativeTime(chat.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 line-clamp-1 mb-2">
                      {chat.last_message}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">
                        Status: <strong className="text-stone-800 capitalize">{chat.status.replace('_', ' ')}</strong>
                      </span>
                      {chat.manual_takeover ? (
                        <span className="font-semibold text-purple-700 rounded bg-purple-50 px-2 py-0.5 border border-purple-200 text-[10px]">
                          Manual Takeover
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1 font-medium text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Auto Reply Active
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Instagram Messages */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <h3 className="text-sm font-bold text-stone-900">
                  Recent Instagram DMs & Reels
                </h3>
              </div>
              <Link
                href="/instagram"
                className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
              >
                <span>Open Instagram</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentIgChats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-6 text-center text-xs text-stone-400">
                  No Instagram conversations recorded yet.
                </div>
              ) : (
                recentIgChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => router.push('/instagram')}
                    className="cursor-pointer rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5 hover:border-stone-400 hover:bg-stone-50 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-stone-900">
                        @{chat.contact.instagram_username} ({chat.contact.name})
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">
                        {formatRelativeTime(chat.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 line-clamp-1 mb-2">
                      {chat.last_message}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">
                        Status: <strong className="text-stone-800 capitalize">{chat.status.replace('_', ' ')}</strong>
                      </span>
                      <span className="text-stone-400 text-[10px]">
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
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs lg:col-span-2">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    n8n Workflow Telemetry & Logs
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    VPS workflow execution health monitoring
                  </p>
                </div>
              </div>
              <Link
                href="/n8n"
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition"
              >
                <span>View n8n</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentWorkflowErrors.length === 0 ? (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 text-xs text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>All connected n8n workflows executed without errors in the last check window.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkflowErrors.map((err) => (
                  <div
                    key={err.id}
                    className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-xs text-rose-900 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>{err.workflow_name}</span>
                      <span className="text-[11px] text-rose-700">{formatDateTime(err.started_at)}</span>
                    </div>
                    <div className="text-rose-800 mb-2 font-mono text-[11px]">
                      Failed Node: <strong>{err.failed_node_name || 'Workflow Error'}</strong>
                    </div>
                    <p className="text-[11px] text-rose-950 bg-rose-100/70 p-2.5 rounded-lg border border-rose-200 font-mono">
                      {err.error_message}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span className="text-rose-700 font-mono text-[10px]">Execution ID: {err.execution_id}</span>
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
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Latest Quotations
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Client invoices & proposals
                  </p>
                </div>
              </div>
              <Link
                href="/quotations"
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition"
              >
                <span>Builder</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-stone-100">
              {latestQuotations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-6 text-center text-xs text-stone-400">
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
                        <div className="font-semibold text-xs text-stone-900">
                          {q.customer_name}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {q.quotation_number} · <span className="font-semibold text-stone-600">{q.status.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-stone-900">
                          {formatINR(subtotal - q.discount_amount)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {q.sent_via ? `Sent via ${q.sent_via}` : 'Draft'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3.5 border-t border-stone-100">
              <Link
                href="/quotations"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-xs cursor-pointer"
              >
                <span>Create New Quotation</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
