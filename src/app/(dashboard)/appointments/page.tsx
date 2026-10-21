'use client';

import React, { useState } from 'react';
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
  const { appointments, updateAppointmentStatus, addAppointment } = useDashboardStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [custName, setCustName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [platform, setPlatform] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [service, setService] = useState('AI Agents & Chatbots Consultation');
  const [date, setDate] = useState('2026-10-22');
  const [time, setTime] = useState('11:00 AM');
  const [notes, setNotes] = useState('');

  const todayStr = '2026-10-21'; // aligned with current workspace time

  const filteredAppointments = appointments.filter((appt) => {
    const matchesSearch =
      appt.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.contact_info.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.service_requested.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'today') {
      return appt.appointment_date === todayStr;
    }
    if (activeFilter === 'upcoming') {
      return (appt.status === 'confirmed' || appt.status === 'pending');
    }
    if (activeFilter === 'completed') {
      return appt.status === 'completed';
    }
    if (activeFilter === 'cancelled') {
      return appt.status === 'cancelled';
    }
    return true;
  });

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !contactInfo.trim()) return;

    addAppointment({
      customer_name: custName.trim(),
      contact_info: contactInfo.trim(),
      platform,
      service_requested: service,
      appointment_date: date,
      appointment_time: time,
      status: 'confirmed',
      notes: notes.trim() || undefined,
      google_calendar_event_id: `gcal_sync_${Date.now().toString().slice(-6)}`,
    });

    setCustName('');
    setContactInfo('');
    setNotes('');
    setModalOpen(false);
  };

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Appointment Bookings"
        subtitle="Unified calendar for WhatsApp & Instagram consultations, synced with Google Sheets & Google Calendar."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Sync Info Header Card */}
        <div className="rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <CalendarCheck className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#141413]">
                Single Master Appointment Worksheet
              </h3>
              <p className="text-xs text-[#555047]">
                Both WhatsApp and Instagram appointments synchronize directly to your existing appointment sheet with a <strong className="text-[#141413]">Source</strong> tag.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2A2825] shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1.5 text-xs font-bold uppercase tracking-wider">
              {(['all', 'today', 'upcoming', 'completed', 'cancelled'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                    activeFilter === tab
                      ? 'bg-[#141413] text-white shadow-xs'
                      : 'bg-[#FAF8F5] text-[#555047] hover:bg-[#EFECE4]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756D]" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="overflow-hidden rounded-xl border border-[#E2DDD3] bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2DDD3] bg-[#FAF8F5] text-[11px] font-bold uppercase tracking-wider text-[#7A756D]">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Service Requested</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Calendar Sync</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE4] text-xs">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#7A756D]">
                      No appointments matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => {
                    const statusBadge = getAppointmentStatusBadge(appt.status);

                    return (
                      <tr key={appt.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#141413]">
                            {appt.customer_name}
                          </div>
                          <div className="text-[11px] text-[#7A756D] font-mono">
                            {appt.contact_info}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-[#FAF8F5] border border-[#E2DDD3]">
                            {appt.platform === 'whatsapp' ? (
                              <>
                                <MessageSquare className="h-3 w-3 text-[#25D366]" />
                                <span>WhatsApp</span>
                              </>
                            ) : (
                              <>
                                <Instagram className="h-3 w-3 text-[#E1306C]" />
                                <span>Instagram</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#141413]">
                          <div>{appt.service_requested}</div>
                          {appt.notes && (
                            <div className="text-[11px] text-[#7A756D] line-clamp-1">{appt.notes}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#141413]">
                            {formatDate(appt.appointment_date)}
                          </div>
                          <div className="text-[11px] text-[#7A756D] flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{appt.appointment_time}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={appt.status}
                            onChange={(e) => updateAppointmentStatus(appt.id, e.target.value as AppointmentStatus)}
                            className={`rounded-md px-2 py-1 text-xs font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} focus:outline-none`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Google Cal Synced</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => router.push(`/${appt.platform}`)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#E2DDD3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#141413] hover:bg-[#FAF8F5]"
                          >
                            <span>Open Chat</span>
                            <ArrowRight className="h-3 w-3" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2DDD3] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#141413]">
                Schedule New Appointment
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#7A756D] hover:text-[#141413]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  placeholder="e.g. Dr. Rajiv Mehta"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Platform Channel
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as 'whatsapp' | 'instagram')}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Phone / Instagram Account *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                    placeholder="+91 98200 00000 or @username"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Service Demo / Consultation
                </label>
                <input
                  type="text"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Time Slot *
                  </label>
                  <input
                    type="text"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                    placeholder="11:00 AM"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Meeting agenda or client questions..."
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFECE4]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#E2DDD3] px-4 py-2 font-semibold text-[#555047] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#141413] px-4 py-2 font-semibold text-white hover:bg-[#2A2825]"
                >
                  Confirm & Sync to Google Sheets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
