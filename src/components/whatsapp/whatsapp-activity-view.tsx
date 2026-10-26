'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  RotateCcw,
  Activity,
  Clock,
  Send,
  TimerOff,
  UserX,
  Bell,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCheck,
  Globe,
  Radio,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface Metrics {
  totalActiveContacts: number;
  newCustomersToday: number;
  returningCustomersToday: number;
  activeSessions: number;
  waitingForCustomer: number;
  followUpsSent: number;
  expiredSessions: number;
  humanTakeoverActive: number;
  adminAlertsSent: number;
  adminAlertFailures: number;
  conversationsToday: number;
}

interface ActivityCustomer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
  classification: string;
  selected_language: string | null;
  session_status: string;
  last_message_at: string;
  last_message: string;
  has_appointment: boolean;
}

interface ActivityEvent {
  id: string;
  session_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function WhatsAppActivityView({ onSelectCustomer }: { onSelectCustomer?: (phone: string) => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [customers, setCustomers] = useState<ActivityCustomer[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/activity');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setCustomers(data.contacts || []);
        setEvents(data.events || []);
        setLastRefreshed(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
      }
    } catch (err) {
      console.error('Activity fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActivity();
    const interval = setInterval(fetchActivity, 3000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAF8F5] p-6 space-y-6">
      {/* Header with live pulse */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">Real-Time Customer Activity</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Live Feed
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time sessions, multilingual engagement, 3-minute follow-ups, and personal admin WhatsApp notifications.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          {lastRefreshed && <span>Updated {lastRefreshed} IST</span>}
          <button
            onClick={() => void fetchActivity()}
            className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 10 Dashboard Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Active Contacts */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Total Contacts</span>
            <Users className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {metrics?.totalActiveContacts ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-stone-400">Active customer profiles</div>
        </div>

        {/* 2. New Customers Today */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>New Customers Today</span>
            <UserPlus className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {metrics?.newCustomersToday ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700/80">First-time visitors</div>
        </div>

        {/* 3. Returning Customers Today */}
        <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-medium">
            <span>Returning Customers</span>
            <RotateCcw className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-900">
            {metrics?.returningCustomersToday ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-indigo-700/80">Fresh session after timeout</div>
        </div>

        {/* 4. Active Sessions */}
        <div className="rounded-2xl border border-sky-200/90 bg-sky-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-sky-700 text-xs font-medium">
            <span>Active Sessions</span>
            <Activity className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-900">
            {metrics?.activeSessions ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-sky-700/80">Within 20-min window</div>
        </div>

        {/* 5. Waiting for Customer */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
            <span>Waiting for Customer</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics?.waitingForCustomer ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80">3-min timer pending</div>
        </div>

        {/* 6. Follow-ups Sent */}
        <div className="rounded-2xl border border-purple-200/90 bg-purple-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-purple-700 text-xs font-medium">
            <span>Follow-ups Sent</span>
            <Send className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-900">
            {metrics?.followUpsSent ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-purple-700/80">Exactly 1 per session</div>
        </div>

        {/* 7. Expired Sessions */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Expired Sessions</span>
            <TimerOff className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-700">
            {metrics?.expiredSessions ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-stone-400">Past 20 min inactivity</div>
        </div>

        {/* 8. Human Takeover Active */}
        <div className="rounded-2xl border border-rose-200/90 bg-rose-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Human Takeover</span>
            <UserX className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">
            {metrics?.humanTakeoverActive ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-rose-700/80">Automated replies paused</div>
        </div>

        {/* 9. Admin Alerts Sent */}
        <div className="rounded-2xl border border-teal-200/90 bg-teal-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-teal-700 text-xs font-medium">
            <span>Admin Alerts Sent</span>
            <Bell className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-900">
            {metrics?.adminAlertsSent ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-teal-700/80">Sent to 918604600292</div>
        </div>

        {/* 10. Admin Alert Failures */}
        <div className="rounded-2xl border border-orange-200/90 bg-orange-50/50 p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-orange-700 text-xs font-medium">
            <span>Alert Failures</span>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-900">
            {metrics?.adminAlertFailures ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-orange-700/80">Template / window required</div>
        </div>
      </div>

      {/* Main Grid: Live Customer Status & Live Realtime Events Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Customer List Table (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden flex flex-col">
          <div className="border-b border-stone-200 px-4 py-3 bg-[#FAF8F5]/80 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              Live Customer Status Table
            </h3>
            <span className="text-[11px] text-stone-500 font-medium">
              {customers.length} total contacts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-3 py-3">Classification</th>
                  <th className="px-3 py-3">Language</th>
                  <th className="px-3 py-3">Session Status</th>
                  <th className="px-3 py-3">Last Message</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-stone-400">
                      No active WhatsApp customer records found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50/80 transition">
                      {/* Customer Name & Phone */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900">{c.name}</div>
                        <div className="text-[11px] font-mono text-stone-500">{c.phone}</div>
                        {c.has_appointment && (
                          <span className="inline-flex items-center gap-1 mt-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            <Calendar className="h-3 w-3" /> Booking Active
                          </span>
                        )}
                      </td>

                      {/* NEW or RETURNING badge */}
                      <td className="px-3 py-3">
                        {c.classification === 'NEW_CUSTOMER' ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            NEW
                          </span>
                        ) : (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-300">
                            RETURNING
                          </span>
                        )}
                      </td>

                      {/* Selected Language */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-stone-700">
                          <Globe className="h-3.5 w-3.5 text-stone-400" />
                          <span>{c.selected_language || 'English'}</span>
                        </div>
                      </td>

                      {/* Current Session Status */}
                      <td className="px-3 py-3">
                        {c.session_status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 border border-sky-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Last Message Preview & Relative Time */}
                      <td className="px-3 py-3 max-w-xs">
                        <div className="truncate text-stone-800 font-medium">{c.last_message}</div>
                        <div className="text-[10px] text-stone-400">
                          {formatRelativeTime(c.last_message_at)}
                        </div>
                      </td>

                      {/* View Chat Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onSelectCustomer?.(c.phone)}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Real-Time Live Events Stream */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden flex flex-col">
          <div className="border-b border-stone-200 px-4 py-3 bg-[#FAF8F5]/80 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-sky-600" />
              Live Events Stream
            </h3>
            <span className="text-[10px] font-mono text-stone-400">Latest 25 events</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 max-h-[500px]">
            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No real-time events logged yet.
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="p-3 hover:bg-stone-50/80 rounded-xl transition space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-900 capitalize">
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(ev.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>

                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                    <div className="text-[11px] text-stone-600">
                      {String(
                        ev.metadata.phone ||
                        ev.metadata.customer_name ||
                        ev.metadata.language ||
                        ev.metadata.status ||
                        JSON.stringify(ev.metadata)
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
