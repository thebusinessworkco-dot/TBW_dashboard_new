'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
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
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  List as ListIcon,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppointmentDetailsDrawer } from '@/components/appointments/appointment-details-drawer';
import { CreateAppointmentModal } from '@/components/appointments/create-appointment-modal';
import { EditAppointmentModal } from '@/components/appointments/edit-appointment-modal';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatDate,
  getAppointmentStatusBadge,
} from '@/lib/utils';
import { AdminAppointment, AppointmentStatus } from '@/lib/types/dashboard';

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

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

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date anchor (YYYY-MM-DD in IST)
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date('2026-10-01T00:00:00.000Z'));

  // Drawer & Modal States
  const [drawerAppt, setDrawerAppt] = useState<AdminAppointment | null>(null);
  const [editAppt, setEditAppt] = useState<AdminAppointment | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [todayStr, setTodayStr] = useState<string>('');

  useEffect(() => {
    setSelectedMonth(new Date());
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    setSelectedDate(today);
    setTodayStr(today);
  }, []);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const q = searchQuery.toLowerCase().trim();
      const customer = (appt.customer_name || '').toLowerCase();
      const contact = (appt.contact_info || '').toLowerCase();
      const srv = (appt.service_requested || '').toLowerCase();
      const matchesSearch = !q || customer.includes(q) || contact.includes(q) || srv.includes(q);

      if (!matchesSearch) return false;

      if (activeStatusFilter !== 'all') {
        return appt.status === activeStatusFilter;
      }
      return true;
    });
  }, [appointments, searchQuery, activeStatusFilter]);

  // Appointment counts
  const totalCount = appointments.length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;
  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const todayCount = appointments.filter((a) => a.appointment_date === todayStr).length;

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
    } else if (viewMode === 'day') {
      const d = new Date(selectedDate || todayStr);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate || todayStr);
      d.setDate(d.getDate() - 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    } else if (viewMode === 'day') {
      const d = new Date(selectedDate || todayStr);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate || todayStr);
      d.setDate(d.getDate() + 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
    setSelectedMonth(new Date());
  };

  // Month Matrix Computation
  const monthData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Weekday of 1st day (0=Sun, 1=Mon, ..., convert to 0=Mon, 6=Sun)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();
    const matrix: Array<{ dayNum: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      matrix.push({
        dayNum: d,
        dateStr: prevDate.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      matrix.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill complete grid of 35 or 42
    const remaining = 35 - matrix.length > 0 ? 35 - matrix.length : 42 - matrix.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      matrix.push({
        dayNum: d,
        dateStr: nextDate.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }

    return matrix;
  }, [selectedMonth]);

  // Week computation
  const currentWeekDays = useMemo(() => {
    const rawDate = selectedDate || todayStr || '2026-10-21';
    const anchor = new Date(rawDate);
    if (isNaN(anchor.getTime())) return [];
    let dayOfWeek = anchor.getDay() - 1;
    if (dayOfWeek < 0) dayOfWeek = 6;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - dayOfWeek);

    const week: Array<{ dateStr: string; label: string; dayNum: number }> = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      week.push({
        dateStr: str,
        label: dayNames[i],
        dayNum: d.getDate(),
      });
    }
    return week;
  }, [selectedDate, todayStr]);

  return (
    <div className="min-h-full pb-16 bg-[#F4F2EC]">
      <TopNavbar
        title="Bookings & Calendar"
        subtitle="Manage client consultations synchronized with Google Calendar in Asia/Kolkata (IST)."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Total Consultations</span>
            <div className="text-xl font-bold font-mono text-[#202B35] mt-1">{totalCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <div className="flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Confirmed</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{confirmedCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Pending Confirmation</span>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">{pendingCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Scheduled Today (IST)</span>
            <div className="text-xl font-bold font-mono text-[#202B35] mt-1">{todayCount}</div>
          </div>
        </div>

        {/* Master Calendar Bar & Controls */}
        <div className="rounded-2xl border border-[#DDD9D0] bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200/60 self-start sm:self-auto">
              <button
                onClick={() => setViewMode('month')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Month</span>
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                <span>Week</span>
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Day</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span>Agenda</span>
              </button>
            </div>

            {/* Date Navigation & Today */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200/80 rounded-xl px-2 py-1">
                <button
                  onClick={handlePrev}
                  className="p-1 rounded-lg text-stone-600 hover:bg-stone-200/70 transition-colors cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold font-mono text-stone-900 px-2 min-w-[140px] text-center">
                  {viewMode === 'month'
                    ? selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : viewMode === 'day'
                    ? formatDate(selectedDate || todayStr)
                    : `Week of ${formatDate(currentWeekDays[0]?.dateStr || todayStr)}`}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 rounded-lg text-stone-600 hover:bg-stone-200/70 transition-colors cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Book Appointment
              </Button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by customer name, phone, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#DDD9D0] bg-stone-50/60 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#202B35] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500 font-medium">Status:</span>
              <select
                value={activeStatusFilter}
                onChange={(e) => setActiveStatusFilter(e.target.value as 'all' | AppointmentStatus)}
                className="rounded-xl border border-[#DDD9D0] bg-stone-50/60 px-3 py-1.5 text-xs font-medium text-stone-800 focus:border-[#202B35] focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">All Bookings</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* 1. MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="rounded-2xl border border-[#DDD9D0] bg-white shadow-xs overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500 py-2.5">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            {/* Date Matrix */}
            <div className="grid grid-cols-7 divide-x divide-y divide-stone-100">
              {monthData.map((item, idx) => {
                const dayAppointments = filteredAppointments.filter(
                  (a) => a.appointment_date === item.dateStr
                );
                const isToday = item.dateStr === todayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(item.dateStr);
                      setViewMode('day');
                    }}
                    className={`min-h-[105px] p-2 transition-colors cursor-pointer flex flex-col justify-between ${
                      item.isCurrentMonth ? 'bg-white hover:bg-stone-50/70' : 'bg-stone-50/40 text-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                          isToday
                            ? 'bg-[#202B35] text-white shadow-xs'
                            : item.isCurrentMonth
                            ? 'text-stone-800'
                            : 'text-stone-400'
                        }`}
                      >
                        {item.dayNum}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayAppointments.slice(0, 2).map((appt) => {
                        const statusBadge = getAppointmentStatusBadge(appt.status);
                        return (
                          <div
                            key={appt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerAppt(appt);
                            }}
                            className={`p-1 rounded-md text-[10px] border truncate flex items-center justify-between font-medium cursor-pointer ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                            title={`${appt.appointment_time} - ${appt.customer_name} (${appt.service_requested})`}
                          >
                            <span className="font-mono">{appt.appointment_time}</span>
                            <span className="truncate ml-1 font-semibold">{appt.customer_name}</span>
                          </div>
                        );
                      })}
                      {dayAppointments.length > 2 && (
                        <div className="text-[10px] text-stone-400 text-center font-semibold">
                          +{dayAppointments.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="rounded-2xl border border-[#DDD9D0] bg-white shadow-xs overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-stone-200 border-b border-stone-200 bg-stone-50 text-center py-3">
              {currentWeekDays.map((d) => {
                const isToday = d.dateStr === todayStr;
                return (
                  <div key={d.dateStr} className="px-2">
                    <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                      {d.label}
                    </div>
                    <div
                      className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold mt-1 ${
                        isToday ? 'bg-[#202B35] text-white shadow-xs' : 'text-stone-800'
                      }`}
                    >
                      {d.dayNum}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 divide-x divide-stone-100 min-h-[420px] bg-white">
              {currentWeekDays.map((d) => {
                const dayAppointments = filteredAppointments.filter(
                  (a) => a.appointment_date === d.dateStr
                );

                return (
                  <div key={d.dateStr} className="p-2 space-y-2">
                    {dayAppointments.length === 0 ? (
                      <div className="text-[11px] text-stone-300 text-center py-8 italic">
                        No slots
                      </div>
                    ) : (
                      dayAppointments.map((appt) => {
                        const statusBadge = getAppointmentStatusBadge(appt.status);
                        return (
                          <div
                            key={appt.id}
                            onClick={() => setDrawerAppt(appt)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-2xs space-y-1 transition-all hover:scale-[1.02] ${statusBadge.bg} ${statusBadge.border}`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                              <span>{appt.appointment_time}</span>
                              <span className="capitalize">{appt.platform}</span>
                            </div>
                            <div className="font-bold text-stone-900 truncate">
                              {appt.customer_name}
                            </div>
                            <div className="text-[11px] text-stone-600 line-clamp-1">
                              {appt.service_requested}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. DAY VIEW */}
        {viewMode === 'day' && (
          <div className="rounded-2xl border border-[#DDD9D0] bg-white shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Daily Schedule: {formatDate(selectedDate || todayStr)}
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">Timezone: Asia/Kolkata (IST)</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Slot
              </Button>
            </div>

            <div className="space-y-2.5">
              {filteredAppointments.filter((a) => a.appointment_date === (selectedDate || todayStr)).length === 0 ? (
                <div className="py-16 text-center text-stone-400 text-xs">
                  <Calendar className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                  <p className="font-medium text-stone-600">No appointments scheduled for this day</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Click &quot;Add Slot&quot; to book a consultation</p>
                </div>
              ) : (
                filteredAppointments
                  .filter((a) => a.appointment_date === (selectedDate || todayStr))
                  .map((appt) => {
                    const statusBadge = getAppointmentStatusBadge(appt.status);
                    return (
                      <div
                        key={appt.id}
                        onClick={() => setDrawerAppt(appt)}
                        className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/60 hover:bg-stone-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white font-mono text-xs font-bold">
                            {appt.appointment_time.split(' ')[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-stone-900">
                                {appt.customer_name}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                {appt.status}
                              </span>
                            </div>
                            <div className="text-xs text-stone-600 mt-0.5">
                              {appt.service_requested}
                            </div>
                            <div className="text-[11px] text-stone-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>Phone: {appt.contact_info}</span>
                              <span>·</span>
                              <span className="capitalize">{appt.platform}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditAppt(appt);
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <Button variant="outline" size="sm" onClick={() => setDrawerAppt(appt)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* 4. AGENDA / LIST VIEW */}
        {viewMode === 'agenda' && (
          <div className="overflow-hidden rounded-2xl border border-[#DDD9D0] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200/70 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Booking Date</th>
                    <th className="py-3 px-4">Time Slot (IST)</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Calendar Sync</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-xs text-stone-500">
                        <Calendar className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                        <p className="font-medium text-stone-700">No scheduled appointments found</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Try adjusting your search query or status filter.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => {
                      const statusBadge = getAppointmentStatusBadge(appt.status);

                      return (
                        <tr key={appt.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setDrawerAppt(appt)}
                              className="font-semibold text-stone-900 hover:underline text-left cursor-pointer"
                            >
                              {appt.customer_name}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-stone-600">
                            {appt.contact_info}
                          </td>

                          <td className="py-3.5 px-4 font-medium text-stone-800 whitespace-nowrap">
                            {formatDate(appt.appointment_date)}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                            {appt.appointment_time}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs text-stone-700 truncate" title={appt.service_requested}>
                            {appt.service_requested}
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
                            <span className="font-mono text-[10px] text-stone-600 bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded-md">
                              {appt.google_calendar_event_id ? 'Synced' : 'Local'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setDrawerAppt(appt)}
                                title="View Details"
                                className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => setEditAppt(appt)}
                                title="Edit / Reschedule"
                                className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* APPOINTMENT DETAILS DRAWER */}
      <AppointmentDetailsDrawer
        appointment={drawerAppt}
        isOpen={!!drawerAppt}
        onClose={() => setDrawerAppt(null)}
        onEdit={(appt) => {
          setDrawerAppt(null);
          setEditAppt(appt);
        }}
      />

      {/* CREATE APPOINTMENT MODAL */}
      <CreateAppointmentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultDate={selectedDate || todayStr}
      />

      {/* EDIT APPOINTMENT MODAL */}
      <EditAppointmentModal
        appointment={editAppt}
        isOpen={!!editAppt}
        onClose={() => setEditAppt(null)}
      />
    </div>
  );
}
