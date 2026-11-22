'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  Tag,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Check,
  X,
  Phone,
  Building2,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, FormField, Label } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { AdminContact } from '@/lib/types/dashboard';
import { extractContactTags } from '@/lib/whatsapp/session-identity';

/**
 * 1. CREATE CONTACT MODAL
 */
export function CreateContactModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    phone: string;
    company_name?: string;
    notes?: string;
    tags?: string[];
  }) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setCompany('');
      setNotes('');
      setTagsInput('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Contact display name is required.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit phone number with country code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const ok = await onSubmit({
        name: name.trim(),
        phone: cleanPhone,
        company_name: company.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      if (ok) {
        onClose();
      } else {
        setError('Failed to create contact. Please verify details.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Customer Contact"
      description="Create a persistent customer identity for WhatsApp and omnichannel communications."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200">
            {error}
          </div>
        )}

        <FormField>
          <Label required>Admin Custom Display Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aman Rajbhar, Client Mumbai, Sharma Sir"
            required
            autoFocus
          />
          <span className="text-[11px] text-[#566573] dark:text-[#94A4B4]">
            This admin name is persistent and will NEVER be overwritten by customer responses.
          </span>
        </FormField>

        <FormField>
          <Label required>Phone Number (with Country Code)</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +91 9876543210"
            required
          />
        </FormField>

        <FormField>
          <Label>Company / Business Name</Label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Mumbai Logistics Ltd."
          />
        </FormField>

        <FormField>
          <Label>Tags / Labels (comma-separated)</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="VIP, Retail, Priority Client"
          />
        </FormField>

        <FormField>
          <Label>Internal Operator Notes</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferences, order inquiries, referral sources..."
            className="text-xs resize-none"
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Save Contact
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * 2. EDIT CONTACT MODAL
 */
export function EditContactModal({
  isOpen,
  onClose,
  contact,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  contact: AdminContact | null;
  onSubmit: (
    contactId: string,
    data: { name?: string; company_name?: string; notes?: string; tags?: string[] }
  ) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact && isOpen) {
      setName(contact.custom_name || contact.name || '');
      setCompany(contact.company_name || '');
      setNotes(contact.notes || '');
      const existingTags = extractContactTags(contact);
      setTagsInput(existingTags.join(', '));
      setError(null);
    }
  }, [contact, isOpen]);

  if (!contact) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Contact display name cannot be blank.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const ok = await onSubmit(contact.id, {
        name: name.trim(),
        company_name: company.trim() || undefined,
        notes: notes.trim(),
        tags,
      });

      if (ok) {
        onClose();
      } else {
        setError('Failed to update contact.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Customer Contact Profile"
      description={`Editing persistent identity for ${contact.phone || contact.id}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200">
            {error}
          </div>
        )}

        <FormField>
          <Label required>Persistent Admin Display Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aman Rajbhar, Client Mumbai"
            required
            autoFocus
          />
          <span className="text-[11px] text-[#566573] dark:text-[#94A4B4]">
            Changes here are permanent and do NOT alter historical session transcripts.
          </span>
        </FormField>

        <FormField>
          <Label>Company / Organization</Label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Cafe Owner"
          />
        </FormField>

        <FormField>
          <Label>Tags (comma-separated)</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="VIP, Lead, In Negotiation"
          />
        </FormField>

        <FormField>
          <Label>Internal Operator Notes</Label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Customer notes, special instructions..."
            className="text-xs resize-none"
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * 3. DELETE CONTACT SAFEGUARD MODAL
 */
export function DeleteContactSafeguardModal({
  isOpen,
  onClose,
  contact,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  contact: AdminContact | null;
  onConfirm: (contactId: string, phone: string) => Promise<boolean>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!contact) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const ok = await onConfirm(contact.id, contact.phone || '');
      if (ok) {
        onClose();
      } else {
        setError('Failed to safely delete contact.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error executing deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Protected Contact Deletion"
      description={`Contact: ${contact.name} (${contact.phone || contact.id})`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Audit &amp; Booking Safeguard Guarantee:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px]">
            <li>Active sessions and contact records will be archived from live CRM view.</li>
            <li>Confirmed Google Calendar consultations remain strictly <strong>PRESERVED and PROTECTED</strong>.</li>
            <li>Future incoming messages from this phone will be welcomed as a fresh new session.</li>
          </ul>
        </div>

        <p className="text-xs text-[#566573] dark:text-[#94A4B4]">
          Are you sure you want to delete <strong>{contact.name}</strong>? This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Keep Contact
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Confirm Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * 4. BULK ADD TAG MODAL
 */
export function BulkAddTagModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (tag: string) => Promise<boolean>;
}) {
  const [tag, setTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setTag('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim()) return;
    setIsSubmitting(true);
    try {
      const ok = await onConfirm(tag.trim());
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Apply Tag (${selectedCount} Selected)`}
      description="Add a common categorization label across all highlighted customer profiles."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField>
          <Label required>Tag Name</Label>
          <Input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. High Priority, VIP, Follow-Up Required"
            required
            autoFocus
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Apply Tag
          </Button>
        </div>
      </form>
    </Modal>
  );
}
