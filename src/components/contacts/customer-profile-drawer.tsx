'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Building2,
  Calendar,
  MessageSquare,
  Tag,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  Save,
  Check,
  Plus,
  ShieldCheck,
  History,
  FileText,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/form';
import { Tabs } from '@/components/ui/tabs';
import { AdminContact, AdminConversation, AdminLead, AdminAppointment } from '@/lib/types/dashboard';
import { formatDateTime, formatRelativeTime, formatINR } from '@/lib/utils';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  extractContactTags,
  extractSessionMetadata,
  getCustomerProfileSidebarNames,
} from '@/lib/whatsapp/session-identity';
import { SessionMessageInspectorModal } from '@/components/conversations/session-message-inspector-modal';

export function CustomerProfileDrawer({
  isOpen,
  onClose,
  contact,
  onEditContact,
  onDeleteContact,
}: {
  isOpen: boolean;
  onClose: () => void;
  contact: AdminContact | null;
  onEditContact?: (contact: AdminContact) => void;
  onDeleteContact?: (contact: AdminContact) => void;
}) {
  const { conversations, messages, leads, appointments, quotations, updateContact } =
    useDashboardStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'timeline' | 'history'>('profile');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveNotice, setNotesSaveNotice] = useState(false);

  // Tags state
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Inspector modal state
  const [inspectingConv, setInspectingConv] = useState<AdminConversation | null>(null);

  // Filter conversations for this contact
  const contactConvs = useMemo(() => {
    if (!contact) return [];
    return conversations.filter(
      (c) =>
        c.contact_id === contact.id ||
        c.contact?.id === contact.id ||
        (c.contact?.phone && contact.phone && c.contact.phone === contact.phone)
    );
  }, [conversations, contact]);

  // Latest conversation
  const latestConv = useMemo(() => {
    if (contactConvs.length === 0) return null;
    return [...contactConvs].sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.created_at).getTime();
      const timeB = new Date(b.last_message_at || b.created_at).getTime();
      return timeB - timeA;
    })[0];
  }, [contactConvs]);

  // Linked CRM Lead
  const linkedLead = useMemo(() => {
    if (!contact) return undefined;
    return leads.find(
      (l) =>
        (contact.phone && l.contact_phone && l.contact_phone.includes(contact.phone.replace(/\D/g, ''))) ||
        l.contact_name === contact.name ||
        l.contact_name === contact.custom_name
    );
  }, [leads, contact]);

  // Linked Calendar Appointment
  const linkedAppointment = useMemo(() => {
    if (!contact) return undefined;
    const clean = (contact.phone || '').replace(/\D/g, '');
    return appointments.find(
      (a) =>
        (clean && (a.contact_info || '').includes(clean)) ||
        a.customer_name === contact.name ||
        a.customer_name === contact.custom_name
    );
  }, [appointments, contact]);

  // Linked Quotation
  const linkedQuotation = useMemo(() => {
    if (!contact) return undefined;
    const clean = (contact.phone || '').replace(/\D/g, '');
    return quotations.find(
      (q) =>
        (clean && (q.phone || '').includes(clean)) ||
        q.customer_name === contact.name
    );
  }, [quotations, contact]);

  const {
    adminCustomName,
    currentSessionName,
    currentSessionNumber,
    currentSessionLanguage,
    previousSessions,
  } = getCustomerProfileSidebarNames(latestConv, contactConvs);

  // Tags
  const tags = useMemo(() => {
    return extractContactTags(contact);
  }, [contact]);

  useEffect(() => {
    setInternalNotes(contact?.notes || '');
  }, [contact]);

  if (!isOpen || !contact) return null;

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await updateContact(contact.id, { notes: internalNotes });
      if (res.success) {
        setNotesSaveNotice(true);
        setTimeout(() => setNotesSaveNotice(false), 2500);
      }
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddTag = async () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setTagInput('');
      setIsAddingTag(false);
      return;
    }
    const nextTags = [...tags, trimmed];
    await updateContact(contact.id, { tags: nextTags });
    setTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    await updateContact(contact.id, { tags: nextTags });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] lg:w-[600px] bg-[#FCFBF8] border-l border-[#DDD9D0] shadow-2xl flex flex-col text-[#202B35] dark:bg-[#10161E] dark:border-[#232D3B] dark:text-[#FCFBF8] transition-transform duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-6 border-b border-[#DDD9D0] bg-white flex items-center justify-between dark:bg-[#141A22] dark:border-[#232D3B] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#202B35] text-[#FCFBF8] font-bold text-lg font-mono shrink-0 dark:bg-[#FCFBF8] dark:text-[#202B35]">
              {(adminCustomName || contact.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-[#202B35] truncate dark:text-[#FCFBF8]">
                  {adminCustomName || contact.name || 'Customer Profile'}
                </h2>
                <Badge variant="sage" size="sm">
                  Active
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#566573] mt-0.5 dark:text-[#94A4B4]">
                <Phone className="h-3 w-3 text-[#7D8F82]" />
                <span>{contact.phone || 'No Phone'}</span>
                <span>·</span>
                <span>{contactConvs.length} Session(s)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onEditContact && (
              <Button
                variant="secondary"
                size="xs"
                iconOnly
                onClick={() => onEditContact(contact)}
                title="Edit Contact"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDeleteContact && (
              <Button
                variant="secondary"
                size="xs"
                iconOnly
                onClick={() => onDeleteContact(contact)}
                title="Delete Contact"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#566573] hover:bg-[#ECE9E1] cursor-pointer dark:text-[#94A4B4] dark:hover:bg-[#1E2734]"
              aria-label="Close Profile"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-[#DDD9D0] bg-[#F4F2EC]/40 dark:border-[#232D3B] dark:bg-[#10161E]/40 shrink-0">
          <Tabs
            items={[
              { id: 'profile', label: 'Profile 360 & Business' },
              { id: 'timeline', label: 'Session Timeline' },
              { id: 'history', label: `Session History (${contactConvs.length})` },
            ]}
            activeId={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
          />
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'profile' && (
            <>
              {/* 1. Contact Identity & Tags */}
              <div className="p-4 rounded-2xl border border-[#DDD9D0] bg-white space-y-3.5 dark:border-[#232D3B] dark:bg-[#141A22]">
                <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
                    Permanent Customer Identity
                  </span>
                  <Badge variant="navy" size="sm">
                    Admin Controlled
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#566573] block text-[11px] dark:text-[#94A4B4]">Admin Display Name:</span>
                    <span className="font-bold text-[#202B35] text-sm dark:text-[#FCFBF8]">
                      {adminCustomName || contact.name || 'Unassigned'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#566573] block text-[11px] dark:text-[#94A4B4]">Channel Identifier:</span>
                    <span className="font-mono text-xs text-[#202B35] font-semibold dark:text-[#FCFBF8]">
                      {contact.phone || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#566573] block text-[11px] dark:text-[#94A4B4]">First Seen Date:</span>
                    <span className="font-mono text-xs text-[#566573] dark:text-[#94A4B4]">
                      {formatDateTime(contact.created_at)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#566573] block text-[11px] dark:text-[#94A4B4]">Last Active:</span>
                    <span className="font-mono text-xs text-[#566573] dark:text-[#94A4B4]">
                      {latestConv?.last_message_at
                        ? formatRelativeTime(latestConv.last_message_at)
                        : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Tags Management */}
                <div className="pt-2 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#566573] dark:text-[#94A4B4]">Tags & Labels:</span>
                    {!isAddingTag && (
                      <button
                        type="button"
                        onClick={() => setIsAddingTag(true)}
                        className="text-[#7D8F82] hover:text-[#202B35] font-semibold inline-flex items-center gap-1 dark:hover:text-[#FCFBF8]"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Tag</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    {tags.length === 0 && !isAddingTag ? (
                      <span className="text-[11px] text-[#566573] italic dark:text-[#94A4B4]">
                        No tags assigned yet.
                      </span>
                    ) : (
                      tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold bg-[#ECE9E1] text-[#202B35] border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#FCFBF8]"
                        >
                          <Tag className="h-3 w-3 text-[#7D8F82]" />
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-rose-600 cursor-pointer ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    )}

                    {isAddingTag && (
                      <div className="flex items-center gap-1">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="e.g. VIP, Client"
                          className="h-6 text-xs w-28"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTag();
                            if (e.key === 'Escape') setIsAddingTag(false);
                          }}
                        />
                        <Button variant="primary" size="xs" iconOnly onClick={handleAddTag}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          iconOnly
                          onClick={() => setIsAddingTag(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Current Session Information */}
              <div className="p-4 rounded-2xl border border-[#DDD9D0] bg-white space-y-3 dark:border-[#232D3B] dark:bg-[#141A22]">
                <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
                    Current Session State
                  </span>
                  <Badge variant="sage" size="sm">
                    Session #{currentSessionNumber}
                  </Badge>
                </div>

                {latestConv ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#566573] dark:text-[#94A4B4]">Customer-Provided Name:</span>
                      <span className="font-bold text-[#202B35] bg-[#F4F2EC] px-2 py-0.5 rounded-lg border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#FCFBF8]">
                        {currentSessionName || 'Awaiting Onboarding'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#566573] dark:text-[#94A4B4]">Session Status:</span>
                      <Badge variant="neutral" size="sm">
                        {latestConv.status}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#566573] dark:text-[#94A4B4]">Selected Language:</span>
                      <span className="font-semibold text-[#202B35] dark:text-[#FCFBF8]">
                        {currentSessionLanguage}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#566573] dark:text-[#94A4B4]">Last Message Preview:</span>
                      <span className="font-medium text-[#202B35] truncate max-w-[240px] dark:text-[#FCFBF8]">
                        {latestConv.last_message || 'No messages yet'}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          window.location.href = `/whatsapp?id=${latestConv.id}`;
                        }}
                        rightIcon={<ExternalLink className="h-3 w-3" />}
                      >
                        Open in Live Inbox
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#566573] italic dark:text-[#94A4B4]">
                    No conversation sessions recorded yet.
                  </p>
                )}
              </div>

              {/* 3. Business Information & Linked Records */}
              <div className="p-4 rounded-2xl border border-[#DDD9D0] bg-white space-y-3 dark:border-[#232D3B] dark:bg-[#141A22]">
                <div className="flex items-center justify-between pb-2 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
                    Business 360 &amp; Linked Data
                  </span>
                  <Briefcase className="h-4 w-4 text-[#7D8F82]" />
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#566573] dark:text-[#94A4B4]">Company / Organization:</span>
                    <span className="font-semibold text-[#202B35] dark:text-[#FCFBF8]">
                      {contact.company_name || 'Individual Client'}
                    </span>
                  </div>

                  {/* Linked Lead */}
                  {linkedLead ? (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-950 text-xs dark:text-emerald-200">
                          {linkedLead.service_interest}
                        </span>
                        <Badge variant="sage" size="sm">
                          {linkedLead.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                        <span>Pipeline Value:</span>
                        <span className="font-mono font-bold">
                          {linkedLead.estimated_value ? `₹${linkedLead.estimated_value.toLocaleString()}` : '₹25,000'}
                        </span>
                      </div>
                      <div className="pt-1 flex justify-end">
                        <a
                          href={`/leads`}
                          className="text-[11px] font-bold text-emerald-900 hover:underline inline-flex items-center gap-1 dark:text-emerald-300"
                        >
                          <span>Inspect in CRM</span>
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px] text-[#566573] dark:text-[#94A4B4]">
                      <span>CRM Lead Status:</span>
                      <span>No active sales lead</span>
                    </div>
                  )}

                  {/* Linked Appointment */}
                  {linkedAppointment ? (
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-950 text-xs dark:text-amber-200">
                          {linkedAppointment.service_requested}
                        </span>
                        <Badge variant="warning" size="sm">
                          {linkedAppointment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-mono dark:text-amber-300">
                        <Calendar className="h-3 w-3" />
                        <span>{linkedAppointment.appointment_date} at {linkedAppointment.appointment_time}</span>
                      </div>
                      <div className="pt-1 flex justify-end">
                        <a
                          href={`/appointments`}
                          className="text-[11px] font-bold text-amber-900 hover:underline inline-flex items-center gap-1 dark:text-amber-300"
                        >
                          <span>Inspect Booking</span>
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px] text-[#566573] dark:text-[#94A4B4]">
                      <span>Consultation Booking:</span>
                      <span>No booked slots</span>
                    </div>
                  )}

                  {/* Linked Quotation */}
                  {linkedQuotation && (
                    <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-950/20 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sky-950 text-xs dark:text-sky-200">
                          {linkedQuotation.quotation_number}
                        </span>
                        <Badge variant="info" size="sm">
                          {linkedQuotation.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[11px] text-sky-900 dark:text-sky-300">
                        <span>Total Quote:</span>
                        <span className="font-mono font-bold">
                          {formatINR(
                            linkedQuotation.items?.reduce(
                              (s, it) => s + (it.setup_charge || 0) + (it.monthly_recurring_charge || 0),
                              0
                            ) || 0
                          )}
                        </span>
                      </div>
                      <div className="pt-1 flex justify-end">
                        <a
                          href={`/quotations`}
                          className="text-[11px] font-bold text-sky-900 hover:underline inline-flex items-center gap-1 dark:text-sky-300"
                        >
                          <span>Inspect Quotation</span>
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Operator Internal Notes */}
              <div className="p-4 rounded-2xl border border-[#DDD9D0] bg-white space-y-2 dark:border-[#232D3B] dark:bg-[#141A22]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
                    Operator Internal Notes
                  </span>
                  {notesSaveNotice && (
                    <span className="text-[11px] font-bold text-[#4A5D4F] dark:text-[#A8BBAE]">
                      Saved to Database ✓
                    </span>
                  )}
                </div>

                <Textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record customer preferences, account managers, special instructions..."
                  className="text-xs resize-none"
                />

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleSaveNotes}
                    isLoading={isSavingNotes}
                    leftIcon={<Save className="h-3 w-3" />}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#566573] block dark:text-[#94A4B4]">
                Customer Operational Milestones
              </span>

              <div className="relative border-l-2 border-[#DDD9D0] ml-3 pl-5 space-y-6 dark:border-[#232D3B]">
                {/* 1. Contact Created */}
                <div className="relative">
                  <div className="absolute -left-[27px] top-0 h-4 w-4 rounded-full bg-[#202B35] ring-4 ring-[#FCFBF8] dark:bg-[#FCFBF8] dark:ring-[#10161E]" />
                  <div className="text-xs">
                    <span className="font-bold text-[#202B35] block dark:text-[#FCFBF8]">
                      Customer Profile Created
                    </span>
                    <span className="text-[11px] font-mono text-[#566573] dark:text-[#94A4B4]">
                      {formatDateTime(contact.created_at)}
                    </span>
                    <p className="text-[11px] text-[#566573] mt-1 dark:text-[#94A4B4]">
                      First inbound interaction received from phone {contact.phone}.
                    </p>
                  </div>
                </div>

                {/* 2. Sessions Timeline */}
                {contactConvs.map((conv, idx) => {
                  const meta = extractSessionMetadata(conv);
                  return (
                    <div key={conv.id} className="relative">
                      <div className="absolute -left-[27px] top-0 h-4 w-4 rounded-full bg-[#7D8F82] ring-4 ring-[#FCFBF8] dark:bg-[#7D8F82] dark:ring-[#10161E]" />
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#202B35] dark:text-[#FCFBF8]">
                            Session #{meta.session_number || contactConvs.length - idx} Started
                          </span>
                          <Badge variant="neutral" size="sm">
                            {conv.status}
                          </Badge>
                        </div>
                        <span className="text-[11px] font-mono text-[#566573] block dark:text-[#94A4B4]">
                          {formatDateTime(conv.created_at)}
                        </span>
                        {meta.session_customer_name && (
                          <p className="text-[11px] text-[#202B35] font-semibold dark:text-[#FCFBF8]">
                            Customer self-identified as: &quot;{meta.session_customer_name}&quot;
                          </p>
                        )}
                        <p className="text-[11px] text-[#566573] line-clamp-2 dark:text-[#94A4B4]">
                          Last message: {conv.last_message || 'Session active'}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Lead Created (if present) */}
                {linkedLead && (
                  <div className="relative">
                    <div className="absolute -left-[27px] top-0 h-4 w-4 rounded-full bg-emerald-600 ring-4 ring-[#FCFBF8] dark:bg-emerald-400 dark:ring-[#10161E]" />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-900 block dark:text-emerald-300">
                        CRM Lead Generated ({linkedLead.service_interest})
                      </span>
                      <span className="text-[11px] font-mono text-[#566573] dark:text-[#94A4B4]">
                        {formatDateTime(linkedLead.created_at)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Appointment Booked (if present) */}
                {linkedAppointment && (
                  <div className="relative">
                    <div className="absolute -left-[27px] top-0 h-4 w-4 rounded-full bg-amber-600 ring-4 ring-[#FCFBF8] dark:bg-amber-400 dark:ring-[#10161E]" />
                    <div className="text-xs">
                      <span className="font-bold text-amber-900 block dark:text-amber-300">
                        Consultation Confirmed: {linkedAppointment.appointment_date} at {linkedAppointment.appointment_time}
                      </span>
                      <span className="text-[11px] font-mono text-[#566573] dark:text-[#94A4B4]">
                        Status: {linkedAppointment.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#566573] block dark:text-[#94A4B4]">
                Chronological Conversation Sessions ({contactConvs.length})
              </span>

              {contactConvs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-[#DDD9D0] bg-white text-xs text-[#566573] dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#94A4B4]">
                  No conversation sessions recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {contactConvs.map((conv, idx) => {
                    const meta = extractSessionMetadata(conv);
                    const sessionNum = meta.session_number || contactConvs.length - idx;
                    const sessionCustName = meta.session_customer_name || 'Unassigned';

                    return (
                      <div
                        key={conv.id}
                        className="p-4 rounded-2xl border border-[#DDD9D0] bg-white hover:border-[#7D8F82] transition space-y-2 dark:border-[#232D3B] dark:bg-[#141A22] dark:hover:border-[#7D8F82]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#202B35] dark:text-[#FCFBF8]">
                              Session #{sessionNum}
                            </span>
                            <Badge variant={conv.status === 'completed' ? 'neutral' : 'sage'} size="sm">
                              {conv.status}
                            </Badge>
                          </div>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => setInspectingConv(conv)}
                            rightIcon={<MessageSquare className="h-3 w-3" />}
                          >
                            Inspect Transcript
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#566573] dark:text-[#94A4B4]">
                          <div>
                            <span>Session Name: </span>
                            <strong className="text-[#202B35] dark:text-[#FCFBF8]">{sessionCustName}</strong>
                          </div>
                          <div>
                            <span>Language: </span>
                            <strong className="text-[#202B35] dark:text-[#FCFBF8]">{meta.selected_language || 'English'}</strong>
                          </div>
                          <div>
                            <span>Started: </span>
                            <span className="font-mono">{formatDateTime(conv.created_at)}</span>
                          </div>
                          <div>
                            <span>Last Active: </span>
                            <span className="font-mono">
                              {conv.last_message_at ? formatRelativeTime(conv.last_message_at) : 'Active'}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#566573] line-clamp-1 pt-1 border-t border-[#DDD9D0]/50 dark:border-[#232D3B]/50 dark:text-[#94A4B4]">
                          {conv.last_message || 'Session transcript'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 sm:p-5 border-t border-[#DDD9D0] bg-white flex items-center justify-between dark:bg-[#141A22] dark:border-[#232D3B] shrink-0">
          <span className="text-[11px] font-mono text-[#566573] dark:text-[#94A4B4]">
            ID: {contact.id.slice(0, 12)}...
          </span>

          <div className="flex items-center gap-2">
            {latestConv && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.location.href = `/whatsapp?id=${latestConv.id}`;
                }}
                rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Open Live Chat
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Historical Session Transcript Inspector Modal */}
      {inspectingConv && (
        <SessionMessageInspectorModal
          isOpen={Boolean(inspectingConv)}
          onClose={() => setInspectingConv(null)}
          conversation={inspectingConv}
          messages={messages[inspectingConv.id] || []}
        />
      )}
    </>
  );
}
