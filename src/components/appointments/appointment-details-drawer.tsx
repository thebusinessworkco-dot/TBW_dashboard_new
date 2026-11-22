'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  Globe,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Building2,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { SlideOver } from '@/components/ui/slide-over';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { AdminAppointment, AppointmentStatus } from '@/lib/types/dashboard';
import { formatDate, getAppointmentStatusBadge } from '@/lib/utils';

interface AppointmentDetailsDrawerProps {
  appointment: AdminAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (appt: AdminAppointment) => void;
}

export function AppointmentDetailsDrawer({
  appointment,
  isOpen,
  onClose,
  onEdit,
}: AppointmentDetailsDrawerProps) {
  const router = useRouter();
  const { updateAppointmentStatus, cancelAppointment, conversations } = useDashboardStore();

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Client requested reschedule');
  const [isUpdating, setIsUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!appointment) return null;

  const statusBadge = getAppointmentStatusBadge(appointment.status);

  // Link to contact or conversation
  const linkedConv = conversations.find(
    (c) =>
      c.contact?.phone === appointment.contact_info ||
      c.contact?.name.toLowerCase() === appointment.customer_name.toLowerCase()
  );
  const linkedContact = linkedConv?.contact;

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    setIsUpdating(true);
    updateAppointmentStatus(appointment.id, newStatus);
    setIsUpdating(false);
    setNotice(`Status marked as ${newStatus}`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleConfirmCancel = async () => {
    setIsUpdating(true);
    await cancelAppointment(appointment.id, cancelReason);
    setIsUpdating(false);
    setConfirmCancelOpen(false);
    setNotice('Appointment cancelled successfully');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleOpenChat = () => {
    if (linkedConv) {
      router.push(`/whatsapp?conversationId=${linkedConv.id}`);
    } else if (appointment.contact_info) {
      router.push(`/whatsapp?phone=${encodeURIComponent(appointment.contact_info)}`);
    } else {
      router.push('/whatsapp');
    }
  };

  return (
    <>
      <SlideOver
        isOpen={isOpen}
        onClose={onClose}
        title="Appointment Consultation Details"
        subtitle={`Booking Ref: ${appointment.google_calendar_event_id || appointment.id.slice(0, 8)} · ${appointment.appointment_date}`}
        width="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[11px]">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              <span>Timezone: Asia/Kolkata (IST)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              {appointment.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmCancelOpen(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6 text-stone-800">
          {notice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          {/* Booking Overview Card */}
          <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-600 tracking-wider">
                  Client & Service
                </span>
                <h3 className="text-base font-bold text-stone-900 mt-0.5">
                  {appointment.customer_name}
                </h3>
                <p className="text-xs text-stone-600 font-medium mt-0.5">
                  {appointment.service_requested}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <select
                  value={appointment.status}
                  onChange={(e) => handleStatusChange(e.target.value as AppointmentStatus)}
                  disabled={isUpdating}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} focus:outline-none cursor-pointer transition-all`}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <span className="text-[10px] text-stone-600 font-mono">
                  Change status
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-200/60 text-xs">
              <div className="p-3 rounded-xl bg-white border border-stone-200/60">
                <span className="text-[10px] uppercase font-semibold text-stone-600 tracking-wider">
                  Date
                </span>
                <div className="mt-1 font-bold text-stone-900 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-stone-500" />
                  <span>{formatDate(appointment.appointment_date)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-stone-200/60">
                <span className="text-[10px] uppercase font-semibold text-stone-600 tracking-wider">
                  Time Slot (IST)
                </span>
                <div className="mt-1 font-bold text-stone-900 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-stone-500" />
                  <span>{appointment.appointment_time}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Coordinates */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Contact & Channel
              </h4>
              {onEdit && (
                <button
                  onClick={() => onEdit(appointment)}
                  className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Reschedule / Edit</span>
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2 text-stone-700">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span className="font-mono">{appointment.contact_info}</span>
                  <span className="capitalize text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                    {appointment.platform}
                  </span>
                </div>
                {appointment.platform === 'whatsapp' && (
                  <button
                    onClick={handleOpenChat}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </button>
                )}
                {appointment.platform === 'instagram' && (
                  <button
                    onClick={() => router.push('/instagram')}
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Instagram className="h-3 w-3" />
                    <span>Instagram</span>
                  </button>
                )}
              </div>

              {linkedContact && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-stone-500" />
                    <span className="font-medium text-stone-800">
                      Customer Profile: {linkedContact.name}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/contacts')}
                    className="text-xs"
                  >
                    View Directory
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Google Calendar Synchronization */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Google Calendar Synchronization
            </h4>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-700">
                  <CalendarCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">Master Calendar Event:</span>
                </div>
                <span className="font-mono text-[10px] text-stone-500">
                  {appointment.google_calendar_event_id || 'Auto-Synced'}
                </span>
              </div>

              {appointment.google_calendar_event_id && (
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">
                    Synced with The Business Work official calendar
                  </span>
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <span>Open in Google Calendar</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Booking Notes */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Session Agenda & Notes
            </h4>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs text-stone-700 leading-relaxed min-h-[50px]">
              {appointment.notes || <span className="text-stone-400 italic">No notes provided for this consultation slot.</span>}
            </div>
          </div>
        </div>
      </SlideOver>

      {/* CANCEL CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Scheduled Appointment"
        description={`Are you sure you want to cancel the appointment for ${appointment.customer_name} on ${appointment.appointment_date} at ${appointment.appointment_time}? This will mark the booking as cancelled.`}
        confirmLabel="Yes, Cancel Appointment"
        isDestructive={true}
        isLoading={isUpdating}
      />
    </>
  );
}
