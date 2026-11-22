'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/lib/store/dashboard-store';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  onSuccess?: () => void;
}

export function CreateAppointmentModal({
  isOpen,
  onClose,
  defaultDate,
  onSuccess,
}: CreateAppointmentModalProps) {
  const { refreshData } = useDashboardStore();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [platform, setPlatform] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [service, setService] = useState('AI Agents & Chatbots Consultation');
  const [date, setDate] = useState(defaultDate || '2026-10-21');
  const [startTime, setStartTime] = useState('11:00 AM');
  const [endTime, setEndTime] = useState('11:30 AM');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    } else if (isOpen) {
      setDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()));
    }
  }, [defaultDate, isOpen]);

  const timeSlots = [
    { start: '10:00 AM', end: '10:30 AM' },
    { start: '10:30 AM', end: '11:00 AM' },
    { start: '11:00 AM', end: '11:30 AM' },
    { start: '11:30 AM', end: '12:00 PM' },
    { start: '12:00 PM', end: '12:30 PM' },
    { start: '02:00 PM', end: '02:30 PM' },
    { start: '02:30 PM', end: '03:00 PM' },
    { start: '03:00 PM', end: '03:30 PM' },
    { start: '03:30 PM', end: '04:00 PM' },
    { start: '04:00 PM', end: '04:30 PM' },
    { start: '04:30 PM', end: '05:00 PM' },
    { start: '05:00 PM', end: '05:30 PM' },
    { start: '05:30 PM', end: '06:00 PM' },
  ];

  const handleTimeSlotSelect = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !date) {
      setError('Customer name, phone, and date are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          platform,
          serviceRequested: service.trim(),
          appointmentDate: date,
          startTimeIST: startTime.trim(),
          endTimeIST: endTime.trim(),
          source: platform,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to book appointment in Google Calendar');
      }

      await refreshData();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to book appointment';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Client Consultation"
      description="Books a confirmed slot synchronized to TBW Google Calendar and Sheets in Asia/Kolkata (IST)"
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
            Confirm & Sync Booking
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Sharma"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Phone / Contact *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Channel Source
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'whatsapp' | 'instagram')}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="whatsapp">WhatsApp Consultation</option>
              <option value="instagram">Instagram DM Consultation</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Booking Date (IST) *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-mono cursor-pointer"
            />
          </div>
        </div>

        {/* Time Slots Presets */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
            Select IST Time Slot (30 mins duration)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {timeSlots.map((slot) => {
              const isSelected = startTime === slot.start && endTime === slot.end;
              return (
                <button
                  type="button"
                  key={slot.start}
                  onClick={() => handleTimeSlotSelect(slot.start, slot.end)}
                  className={`p-2 rounded-xl text-center text-xs font-mono font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-stone-50/80 hover:bg-stone-100 text-stone-700 border-stone-200/60'
                  }`}
                >
                  {slot.start}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
            Service Requested
          </label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
          >
            <option value="AI Agents & Chatbots Consultation">AI Agents & Chatbots Consultation</option>
            <option value="CRM & Sales Automation Consultation">CRM & Sales Automation Consultation</option>
            <option value="Business Workflow Automation Architecture">Business Workflow Automation Architecture</option>
            <option value="WhatsApp & Meta Cloud API Onboarding">WhatsApp & Meta Cloud API Onboarding</option>
            <option value="Custom Technical Architecture Discovery">Custom Technical Architecture Discovery</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
            Agenda / Consultation Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Discuss requirements, business scale, integrations needed..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </form>
    </Modal>
  );
}
