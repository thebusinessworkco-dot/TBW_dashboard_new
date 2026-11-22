'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Building2,
  Calendar,
  FileText,
  Edit2,
  Check,
  X,
  ShieldCheck,
  Zap,
  Globe,
  Tag,
  Clock,
  ExternalLink,
  Save,
  MessageSquare,
  History,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormField, Label, Input, Textarea } from '@/components/ui/form';
import { AdminConversation, AdminLead, AdminAppointment } from '@/lib/types/dashboard';
import { formatDateTime, formatINR } from '@/lib/utils';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  getCustomerProfileSidebarNames,
  extractSessionMetadata,
} from '@/lib/whatsapp/session-identity';

export function CustomerInfoSidebar({
  conversation,
  linkedLead,
  linkedAppointment,
  allConversations = [],
  onClose,
  isMobileDrawer = false,
}: {
  conversation: AdminConversation;
  linkedLead?: AdminLead;
  linkedAppointment?: AdminAppointment;
  allConversations?: AdminConversation[];
  onClose?: () => void;
  isMobileDrawer?: boolean;
}) {
  const { updateContactName, updateInternalNotes } = useDashboardStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(
    conversation.contact?.custom_name || conversation.contact?.name || ''
  );
  const [isSavingName, setIsSavingName] = useState(false);

  const [internalNotes, setInternalNotes] = useState(conversation.internal_notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveNotice, setNotesSaveNotice] = useState(false);

  // Filter conversations for this specific contact
  const contactConvs = (allConversations || []).filter(
    (c) =>
      c.contact_id === conversation.contact_id ||
      c.contact?.id === conversation.contact?.id ||
      (c.contact?.phone && conversation.contact?.phone && c.contact.phone === conversation.contact.phone)
  );

  const {
    adminCustomName,
    currentSessionName,
    currentSessionNumber,
    currentSessionLanguage,
    previousSessions,
  } = getCustomerProfileSidebarNames(conversation, contactConvs);

  useEffect(() => {
    setEditedName(conversation.contact?.custom_name || conversation.contact?.name || '');
    setInternalNotes(conversation.internal_notes || '');
  }, [conversation]);

  const handleSaveName = async () => {
    if (!editedName.trim() || !conversation.contact_id) return;
    setIsSavingName(true);
    try {
      const ok = await updateContactName(conversation.contact_id, editedName.trim());
      if (ok) {
        setIsEditingName(false);
      }
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    try {
      updateInternalNotes(conversation.id, internalNotes);
      setNotesSaveNotice(true);
      setTimeout(() => setNotesSaveNotice(false), 2500);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div
      className={`h-full flex flex-col justify-between border-l border-[#DDD9D0] bg-[#FCFBF8] text-[#202B35] dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8] ${
        isMobileDrawer ? 'w-full' : 'w-80 lg:w-88'
      }`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#DDD9D0]/70 flex items-center justify-between dark:border-[#232D3B]/70 shrink-0">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-[#7D8F82]" />
          <h3 className="font-bold text-sm text-[#202B35] dark:text-[#FCFBF8]">Customer Profile & Sessions</h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#566573] hover:bg-[#ECE9E1] dark:text-[#94A4B4] dark:hover:bg-[#1B232D]"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable Information Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
        {/* 1. Permanent Customer Contact (Admin Controlled) */}
        <div className="p-4 rounded-xl border border-[#DDD9D0] bg-white dark:border-[#232D3B] dark:bg-[#151C24] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
              Persistent Customer Contact
            </span>
            <Badge variant="sage" size="sm">
              Permanent Identity
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#202B35] text-[#FCFBF8] font-bold text-base font-mono dark:bg-[#FCFBF8] dark:text-[#202B35]">
              {(adminCustomName || conversation.contact?.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="e.g. Aman Rajbhar, Client Mumbai"
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="xs"
                    iconOnly
                    onClick={handleSaveName}
                    isLoading={isSavingName}
                    title="Save custom name"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    iconOnly
                    onClick={() => {
                      setEditedName(adminCustomName || conversation.contact?.name || '');
                      setIsEditingName(false);
                    }}
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-[#202B35] truncate block dark:text-[#FCFBF8]">
                      {adminCustomName || conversation.contact?.name || 'Unnamed Client'}
                    </span>
                    <span className="text-[10px] text-[#7D8F82] font-medium block dark:text-[#94A4B4]">
                      Admin Display Name
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded text-[#7D8F82] hover:text-[#202B35] hover:bg-[#ECE9E1] transition dark:hover:text-[#FCFBF8]"
                    title="Edit Admin Custom Name"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 font-mono text-[#566573] text-[11px] mt-1.5 dark:text-[#94A4B4]">
                <Phone className="h-3 w-3 text-[#7D8F82]" />
                <span>{conversation.contact?.phone || 'No phone'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#DDD9D0]/60 space-y-1.5 text-[11px] text-[#566573] dark:border-[#232D3B]/60 dark:text-[#94A4B4]">
            <div className="flex items-center justify-between">
              <span>Channel:</span>
              <span className="font-semibold capitalize text-[#202B35] dark:text-[#FCFBF8]">
                {conversation.platform} Cloud API
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Contact ID:</span>
              <span className="font-mono text-[10px] text-[#566573] dark:text-[#94A4B4]">
                {conversation.contact_id ? `${conversation.contact_id.slice(0, 10)}...` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Current Conversation Session (Isolated Session Record) */}
        <div className="p-4 rounded-xl border border-[#DDD9D0] bg-white dark:border-[#232D3B] dark:bg-[#151C24] space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
              Current Active Session
            </span>
            <Badge variant="navy" size="sm">
              Session #{currentSessionNumber}
            </Badge>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-[#566573] dark:text-[#94A4B4]">Session Customer Name:</span>
              <span className="font-bold text-xs text-[#202B35] bg-[#F4F2EC] px-2 py-0.5 rounded-lg border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#FCFBF8]">
                {currentSessionName || 'Awaiting Onboarding'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#566573] dark:text-[#94A4B4]">Selected Language:</span>
              <span className="font-semibold text-[#202B35] dark:text-[#FCFBF8]">
                {currentSessionLanguage}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#566573] dark:text-[#94A4B4]">Session Status:</span>
              <Badge variant="neutral" size="sm">
                {conversation.status}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#566573] dark:text-[#94A4B4]">Operator Mode:</span>
              <Badge variant={conversation.manual_takeover ? 'warning' : 'sage'} size="sm">
                {conversation.manual_takeover ? 'Human Agent' : 'Autopilot AI'}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#566573] dark:text-[#94A4B4]">Session Started:</span>
              <span className="font-mono text-[#566573] dark:text-[#94A4B4]">
                {new Date(conversation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Previous Session History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092] flex items-center gap-1.5">
              <History className="h-3 w-3" />
              <span>Session History ({previousSessions.length})</span>
            </span>
          </div>

          {previousSessions.length === 0 ? (
            <div className="p-3 rounded-xl border border-[#DDD9D0]/60 bg-[#F4F2EC]/30 text-center text-[11px] text-[#566573] dark:border-[#232D3B]/60 dark:bg-[#151C24]/40 dark:text-[#94A4B4]">
              First conversation session for this contact.
            </div>
          ) : (
            <div className="space-y-2">
              {previousSessions.map((prev) => (
                <div
                  key={prev.id}
                  className="p-3 rounded-xl border border-[#DDD9D0] bg-white space-y-1.5 dark:border-[#232D3B] dark:bg-[#151C24]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#202B35] dark:text-[#FCFBF8]">
                      Session #{prev.sessionNumber}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {prev.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#566573] dark:text-[#94A4B4]">
                    <span>Customer Name:</span>
                    <span className="font-semibold text-[#202B35] dark:text-[#FCFBF8]">
                      {prev.sessionCustomerName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#566573] font-mono dark:text-[#94A4B4]">
                    <span>Date: {new Date(prev.createdAt).toLocaleDateString()}</span>
                    <span>Lang: {prev.language}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Internal Operator Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
              Internal Operator Notes
            </span>
            {notesSaveNotice && (
              <span className="text-[10px] font-semibold text-[#4A5D4F] dark:text-[#A8BBAE]">
                Saved ✓
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl border border-[#DDD9D0] bg-white space-y-2 dark:border-[#232D3B] dark:bg-[#151C24]">
            <Textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add internal notes about client preferences, order items, or follow-ups..."
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
        </div>

        {/* Linked Sales Lead (if present) */}
        {linkedLead && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
              Linked CRM Lead
            </span>
            <div className="p-3.5 rounded-xl border border-[#DDD9D0] bg-white space-y-1.5 dark:border-[#232D3B] dark:bg-[#151C24]">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#202B35] dark:text-[#FCFBF8]">{linkedLead.service_interest}</span>
                <Badge variant="sage" size="sm">{linkedLead.status}</Badge>
              </div>
              <div className="flex justify-between text-[11px] text-[#566573] dark:text-[#94A4B4]">
                <span>Pipeline Value:</span>
                <span className="font-mono font-bold text-[#202B35] dark:text-[#FCFBF8]">
                  {linkedLead.estimated_value ? `₹${linkedLead.estimated_value.toLocaleString()}` : '₹25,000'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Linked Consultation (if present) */}
        {linkedAppointment && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
              Linked Calendar Booking
            </span>
            <div className="p-3.5 rounded-xl border border-[#DDD9D0] bg-white space-y-1.5 dark:border-[#232D3B] dark:bg-[#151C24]">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#202B35] dark:text-[#FCFBF8]">
                  {linkedAppointment.service_requested}
                </span>
                <Badge variant="warning" size="sm">{linkedAppointment.status}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#566573] font-mono dark:text-[#94A4B4]">
                <Calendar className="h-3 w-3 text-[#7D8F82]" />
                <span>{linkedAppointment.appointment_date} at {linkedAppointment.appointment_time}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Audit Information */}
      <div className="p-3 border-t border-[#DDD9D0]/70 bg-[#F4F2EC]/40 text-[11px] text-[#566573] flex items-center justify-between dark:border-[#232D3B]/70 dark:bg-[#10161E]/40 dark:text-[#94A4B4] shrink-0">
        <span>Session ID: {conversation.id.slice(0, 8)}</span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(conversation.contact?.phone || '')}
          className="hover:text-[#202B35] font-semibold dark:hover:text-[#FCFBF8]"
        >
          Copy Phone
        </button>
      </div>
    </div>
  );
}
