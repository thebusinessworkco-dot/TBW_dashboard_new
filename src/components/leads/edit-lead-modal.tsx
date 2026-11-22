'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AdminLead, LeadSource, LeadStatus } from '@/lib/types/dashboard';
import { useDashboardStore } from '@/lib/store/dashboard-store';

interface EditLeadModalProps {
  lead: AdminLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditLeadModal({
  lead,
  isOpen,
  onClose,
  onSuccess,
}: EditLeadModalProps) {
  const { updateLead } = useDashboardStore();

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [instagramUsername, setInstagramUsername] = useState('');
  const [serviceInterest, setServiceInterest] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [estimatedValue, setEstimatedValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setContactName(lead.contact_name || '');
      setContactPhone(lead.contact_phone || '');
      setContactEmail(lead.contact_email || '');
      setInstagramUsername(lead.instagram_username || '');
      setServiceInterest(lead.service_interest || '');
      setStatus(lead.status || 'new');
      setEstimatedValue(String(lead.estimated_value || 0));
      setNotes(lead.notes || '');
      setError(null);
    }
  }, [lead]);

  if (!lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      setError('Contact name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await updateLead(lead.id, {
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      instagram_username: instagramUsername.trim() || undefined,
      service_interest: serviceInterest.trim() || lead.service_interest,
      status,
      estimated_value: parseFloat(estimatedValue) || 0,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(res.error || 'Failed to update lead');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Lead Information"
      description="Update contact coordinates, requirements, and status for this lead"
      maxWidth="lg"
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
            Lead Contact Name *
          </label>
          <input
            type="text"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Instagram Handle
            </label>
            <input
              type="text"
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value.replace(/^@/, ''))}
              placeholder="username"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Pipeline Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted (Closed Won)</option>
              <option value="lost">Lost (Closed Lost)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Service of Interest
            </label>
            <input
              type="text"
              value={serviceInterest}
              onChange={(e) => setServiceInterest(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
              Estimated Value (INR)
            </label>
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
            Notes / Requirements
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </form>
    </Modal>
  );
}
