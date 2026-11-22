'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AdminAppointment, AppointmentStatus } from '@/lib/types/dashboard';
import { useDashboardStore } from '@/lib/store/dashboard-store';

interface EditAppointmentModalProps {
  appointment: AdminAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditAppointmentModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: EditAppointmentModalProps) {
  const { updateAppointment } = useDashboardStore();

  const [customerName, setCustomerName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [serviceRequested, setServiceRequested] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('pending');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      setCustomerName(appointment.customer_name || '');
      setContactInfo(appointment.contact_info || '');
      setServiceRequested(appointment.service_requested || '');
      setAppointmentDate(appointment.appointment_date || '');
      setAppointmentTime(appointment.appointment_time || '');
      setStatus(appointment.status || 'pending');
      setNotes(appointment.notes || '');
      setError(null);
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !contactInfo.trim() || !appointmentDate) {
      setError('Customer name, contact info, and date are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await updateAppointment(appointment.id, {
      customer_name: customerName.trim(),
      contact_info: contactInfo.trim(),
      service_requested: serviceRequested.trim(),
      appointment_date: appointmentDate,
      appointment_time: appointmentTime.trim(),
      status,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(res.error || 'Failed to update appointment');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule / Edit Appointment"
      description="Update booking slot details, service, or customer notes"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
            Customer Name *
          </label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Contact Phone / Handle *
            </label>
            <input
              type="text"
              required
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Booking Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Date (YYYY-MM-DD) *
            </label>
            <input
              type="date"
              required
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-mono cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Time (IST)
            </label>
            <input
              type="text"
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
              placeholder="11:00 AM"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
            Service Requested
          </label>
          <input
            type="text"
            value={serviceRequested}
            onChange={(e) => setServiceRequested(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
            Session Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </form>
    </Modal>
  );
}
