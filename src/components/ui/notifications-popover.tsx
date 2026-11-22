import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, AlertTriangle, MessageSquare, ExternalLink } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const { conversations, appointments, vpsMetrics, integrationStatuses } = useDashboardStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadConversations = conversations.filter((c) => (c.unread_count || 0) > 0);
  const pendingAppointments = appointments.filter((a) => a.status === 'pending');
  const errorIntegrations = integrationStatuses.filter((i) => i.status === 'error');

  const totalAlertCount =
    unreadConversations.length +
    pendingAppointments.length +
    errorIntegrations.length +
    (vpsMetrics.status === 'critical' ? 1 : 0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] text-[#202B35] hover:bg-[#F4F2EC] hover:border-[#C7C1B5] transition shadow-2xs cursor-pointer active:scale-95 dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8] dark:hover:bg-[#1B232D]"
        aria-label="Open notifications center"
      >
        <Bell className="h-4 w-4 text-[#7D8F82] dark:text-[#A8BBAE]" />
        {totalAlertCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
            {totalAlertCount > 9 ? '9+' : totalAlertCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 dark:border-[#232D3B] dark:bg-[#141A22]">
          <div className="flex items-center justify-between border-b border-[#DDD9D0]/70 p-3.5 bg-white dark:border-[#232D3B]/70 dark:bg-[#151C24]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#202B35] uppercase tracking-wider dark:text-[#FCFBF8]">
                Notifications & Alerts
              </span>
              {totalAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#202B35] text-[10px] font-mono font-bold text-[#FCFBF8] dark:bg-[#FCFBF8] dark:text-[#202B35]">
                  {totalAlertCount}
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#7D8F82]">Realtime Feed</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#DDD9D0]/40 p-2 dark:divide-[#232D3B]/50">
            {totalAlertCount === 0 ? (
              <div className="py-8 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
                <CheckCircle2 className="mx-auto h-6 w-6 text-[#7D8F82] mb-1.5" />
                All systems normal. No pending alerts.
              </div>
            ) : (
              <>
                {unreadConversations.map((c) => (
                  <Link
                    key={c.id}
                    href="/whatsapp"
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#F4F2EC] transition cursor-pointer dark:hover:bg-[#1B232D]"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#202B35] truncate dark:text-[#FCFBF8]">
                          {c.contact?.name || 'Customer Message'}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded dark:bg-emerald-950/40">
                          {c.unread_count} unread
                        </span>
                      </div>
                      <p className="text-[11px] text-[#566573] truncate mt-0.5 dark:text-[#94A4B4]">
                        {c.last_message || 'New inbound message'}
                      </p>
                    </div>
                  </Link>
                ))}

                {pendingAppointments.map((a) => (
                  <Link
                    key={a.id}
                    href="/appointments"
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#F4F2EC] transition cursor-pointer dark:hover:bg-[#1B232D]"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 shrink-0 dark:bg-amber-950/40 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-[#202B35] truncate dark:text-[#FCFBF8]">
                        Pending Consultation: {a.customer_name}
                      </span>
                      <p className="text-[11px] text-[#566573] truncate mt-0.5 dark:text-[#94A4B4]">
                        {a.appointment_date} at {a.appointment_time}
                      </p>
                    </div>
                  </Link>
                ))}

                {errorIntegrations.map((i) => (
                  <div
                    key={i.service_name}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 shrink-0 dark:bg-rose-900/40 dark:text-rose-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        {i.service_name} Disconnected
                      </span>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">
                        Check credentials in Settings &gt; Integrations
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="border-t border-[#DDD9D0]/70 p-2.5 bg-[#F4F2EC]/60 text-center dark:border-[#232D3B]/70 dark:bg-[#10161E]/60">
            <Link
              href="/whatsapp"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[#202B35] hover:underline dark:text-[#FCFBF8]"
            >
              View All Live Operations →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
