'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Search,
  Plus,
  MessageSquare,
  CheckCircle2,
  CalendarCheck,
  X,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatDate,
  getAppointmentStatusBadge,
} from '@/lib/utils';
import { AppointmentStatus } from '@/lib/types/dashboard';

export default function AppointmentsPage() {
  const router = useRouter();
  const {
    appointments,
    updateAppointmentStatus,
    refreshData,
    syncGoogleSheets,
    isSyncingSheets,
    lastSheetsSyncAt,
  } = useDashboardStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Dynamic current date in Asia/Kolkata
  const [todayStr, setTodayStr] = useState('');

  // Form states
  const [custName, setCustName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [platform, setPlatform] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [service, setService] = useState('AI Agents & Chatbots Consultation');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('11:00 AM');
  const [endTime, setEndTime] = useState('11:30 AM');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayStr(today);
    setDate((prev) => prev || today);
  }, []);

  const filteredAppointments = appointments.filter((appt) => {
    const q = searchQuery.toLowerCase().trim();
    const customer = (appt.customer_name || '').toLowerCase();
    const contact = (appt.contact_info || '').toLowerCase();
    const srv = (appt.service_requested || '').toLowerCase();
    const matchesSearch = !q || customer.includes(q) || contact.includes(q) || srv.includes(q);

    if (!matchesSearch) return false;

    if (activeFilter === 'today') {
      return appt.appointment_date === todayStr;
    }
    if (activeFilter === 'upcoming') {
      return (appt.status === 'confirmed' || appt.status === 'pending') && appt.appointment_date >= todayStr;
    }
    if (activeFilter === 'completed') {
      return appt.status === 'completed';
    }
    if (activeFilter === 'cancelled') {
      return appt.status === 'cancelled';
    }
    return true;
  });

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !contactInfo.trim()) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: custName.trim(),
          phone: contactInfo.trim(),
          platform,
          serviceRequested: service.trim(),
          appointmentDate: date,
          startTimeIST: time.trim(),
          endTimeIST: endTime.trim(),
          source: platform,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to book appointment in Google Calendar');
      }

      // Success: refresh appointments
      await refreshData();

      setCustName('');
      setContactInfo('');
      setNotes('');
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      setBookingError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to extract clean Calendar link from notes
  const getCalendarLink = (notes?: string | null): string | null => {
    if (!notes) return null;
    const match = notes.match(/https:\/\/www\.google\.com\/calendar\/event[^\s]+/i);
    return match ? match[0] : null;
  };

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Appointment Bookings"
        subtitle="Unified schedule for consultations, synchronized with Google Sheets Appointments worksheet & Google Calendar."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Sync Info Header Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
              <CalendarCheck className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  Google Calendar & Sheets Sync Active
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Asia/Kolkata (IST)
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Appointments are automatically recorded in worksheet <strong className="text-stone-700">Appointments</strong> and Google Calendar.
                {lastSheetsSyncAt && (
                  <span className="ml-2 text-stone-400 font-mono text-[11px]">
                    (Last synced: {formatDate(lastSheetsSyncAt)})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => void syncGoogleSheets()}
              disabled={isSyncingSheets}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Refresh appointments from Google Sheets and Calendar"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-amber-700 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheets ? 'Syncing...' : 'Sync Calendar & Sheets'}</span>
            </button>

            <button
              onClick={() => {
                setBookingError(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm shadow-stone-950/10 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 border border-stone-200/60">
              <button
                onClick={() => setActiveFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Bookings ({appointments.length})
              </button>
              <button
                onClick={() => setActiveFilter('today')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === 'today'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Today ({appointments.filter((a) => a.appointment_date === todayStr).length})
              </button>
              <button
                onClick={() => setActiveFilter('upcoming')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === 'upcoming'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Upcoming ({appointments.filter((a) => (a.status === 'confirmed' || a.status === 'pending') && a.appointment_date >= todayStr).length})
              </button>
              <button
                onClick={() => setActiveFilter('completed')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === 'completed'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Completed ({appointments.filter((a) => a.status === 'completed').length})
              </button>
              <button
                onClick={() => setActiveFilter('cancelled')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  activeFilter === 'cancelled'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Cancelled ({appointments.filter((a) => a.status === 'cancelled').length})
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200/70 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Service Requested</th>
                  <th className="py-3 px-4">Date & Time (IST)</th>
                  <th className="py-3 px-4">Booking Status</th>
                  <th className="py-3 px-4">Google Calendar</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-xs text-stone-500">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-2">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-stone-700">No appointments scheduled</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {appointments.length === 0
                          ? 'The Appointments worksheet currently has 0 rows. Use "Book Appointment" to schedule consultations.'
                          : 'No appointments match the active filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => {
                    const statusBadge = getAppointmentStatusBadge(appt.status);
                    const calLink = getCalendarLink(appt.notes);

                    return (
                      <tr key={appt.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700 font-semibold text-xs border border-stone-200/60">
                              {(appt.customer_name || 'C').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-stone-900">
                                {appt.customer_name || 'Client'}
                              </div>
                              <div className="text-[11px] text-stone-500 font-mono">
                                {appt.contact_info || 'No contact provided'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-stone-100/80 border border-stone-200/60 text-stone-800">
                            {appt.platform === 'whatsapp' ? (
                              <>
                                <MessageSquare className="h-3 w-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </>
                            ) : (
                              <>
                                <Instagram className="h-3 w-3 text-rose-500" />
                                <span>Instagram</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-stone-800">
                          <div>{appt.service_requested || 'Automation Consultation'}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-stone-900">
                            {formatDate(appt.appointment_date)}
                          </div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-stone-400" />
                            <span>{appt.appointment_time} (IST)</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={appt.status}
                            onChange={(e) => updateAppointmentStatus(appt.id, e.target.value as AppointmentStatus)}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} focus:outline-none cursor-pointer transition-all`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Google Cal Synced</span>
                            </div>
                            {calLink ? (
                              <a
                                href={calLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                              >
                                <span>View in Calendar</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              <span className="text-[10px] font-mono text-stone-400">
                                {appt.google_calendar_event_id ? `ID: ${appt.google_calendar_event_id.slice(0, 10)}...` : 'ID Synced'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/${appt.platform}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-2xs cursor-pointer"
                          >
                            <span>Open Chat</span>
                            <ArrowRight className="h-3 w-3 text-stone-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BOOK APPOINTMENT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Book New Consultation Appointment
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Creates Google Calendar event and saves to the master Appointments sheet
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  placeholder="e.g. Dr. Rajiv Mehta"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Platform Channel
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as 'whatsapp' | 'instagram')}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Phone / Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    placeholder="+91 98200 00000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Service Requested
                </label>
                <input
                  type="text"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Date (IST) *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    placeholder="11:00 AM"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    End Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    placeholder="11:30 AM"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Notes / Agenda
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Initial requirements discussion for automation..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Booking with Google Calendar...' : 'Confirm & Sync to Google Calendar & Sheets'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
