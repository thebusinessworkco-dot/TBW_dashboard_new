'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Phone,
  Mail,
  Building2,
  Calendar,
  MessageSquare,
  Globe,
  DollarSign,
  UserCheck,
  ExternalLink,
  Edit2,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Receipt,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { SlideOver } from '@/components/ui/slide-over';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { AdminLead, LeadStatus } from '@/lib/types/dashboard';
import { formatINR, formatDateTime, getLeadStatusBadge } from '@/lib/utils';

interface LeadDetailsDrawerProps {
  lead: AdminLead | null;
  isOpen: boolean;
  onClose: () => void;
  onEditLead?: (lead: AdminLead) => void;
}

export function LeadDetailsDrawer({
  lead,
  isOpen,
  onClose,
  onEditLead,
}: LeadDetailsDrawerProps) {
  const router = useRouter();
  const { updateLead, linkLeadToContact, conversations } = useDashboardStore();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>('new');
  const [isSaving, setIsSaving] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setNotesContent(lead.notes || '');
      setCurrentStatus(lead.status);
      setActionNotice(null);
      setIsEditingNotes(false);
    }
  }, [lead]);

  if (!lead) return null;

  // Extract metadata from notes if encoded
  const businessMatch = lead.notes?.match(/Business:\s*([^|]+)/i)?.[1]?.trim();
  const problemMatch = lead.notes?.match(/Problem:\s*([^|]+)/i)?.[1]?.trim();
  const purposeMatch = lead.notes?.match(/Purpose:\s*([^|]+)/i)?.[1]?.trim();
  const languageMatch = lead.notes?.match(/Language:\s*([^|]+)/i)?.[1]?.trim() || 'English';

  const businessName = businessMatch || 'Direct Inquirer';
  const requirement = problemMatch || purposeMatch || lead.service_interest;

  // Check linked conversation & contact
  const linkedConv = conversations.find(
    (c) =>
      (lead.source_conversation_id && c.id === lead.source_conversation_id) ||
      (lead.contact_id && c.contact_id === lead.contact_id) ||
      (lead.contact_phone && c.contact?.phone === lead.contact_phone)
  );
  const linkedContact = linkedConv?.contact;

  const handleStatusChange = async (newStatus: LeadStatus) => {
    setCurrentStatus(newStatus);
    setIsSaving(true);
    await updateLead(lead.id, { status: newStatus });
    setIsSaving(false);
    setActionNotice(`Status updated to ${newStatus}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    await updateLead(lead.id, { notes: notesContent.trim() });
    setIsSaving(false);
    setIsEditingNotes(false);
    setActionNotice('Notes saved successfully');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleLinkContact = async () => {
    setIsSaving(true);
    const res = await linkLeadToContact(lead.id);
    setIsSaving(false);
    if (res.success) {
      setActionNotice('Successfully linked to customer contact identity');
    } else {
      setActionNotice(res.error || 'Failed to link contact');
    }
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleOpenConversation = () => {
    if (linkedConv) {
      router.push(`/whatsapp?conversationId=${linkedConv.id}`);
    } else if (lead.contact_phone) {
      router.push(`/whatsapp?phone=${encodeURIComponent(lead.contact_phone)}`);
    } else {
      router.push('/whatsapp');
    }
  };

  const handleCreateQuotation = () => {
    router.push(
      `/quotations?new=true&leadName=${encodeURIComponent(lead.contact_name)}&phone=${encodeURIComponent(
        lead.contact_phone || ''
      )}&business=${encodeURIComponent(businessName)}`
    );
  };

  const statusBadge = getLeadStatusBadge(currentStatus);

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Lead CRM Profile"
      subtitle={`ID: ${lead.google_sheet_row_id || lead.id.slice(0, 8)} · Received ${formatDateTime(lead.created_at)}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-stone-500 font-mono">
            {lead.google_sheet_row_id ? `Sheets: ${lead.google_sheet_row_id}` : 'Direct Pipeline Lead'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateQuotation}
              leftIcon={<Receipt className="h-3.5 w-3.5" />}
            >
              Generate Quote
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-stone-800">
        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 transition-all">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Lead Header Card */}
        <div className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-white font-bold text-sm shadow-xs">
                {(lead.contact_name || 'L').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 leading-tight">
                  {lead.contact_name}
                </h3>
                <div className="text-xs text-stone-600 font-medium flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-stone-500" />
                  <span>{businessName}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                disabled={isSaving}
                className={`rounded-full px-3 py-1 text-xs font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} focus:outline-none cursor-pointer transition-all`}
              >
                <option value="new">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted (Closed Won)</option>
                <option value="lost">Lost (Closed Lost)</option>
              </select>
              <span className="text-[10px] text-stone-600 font-mono">
                Click to change status
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-200/60 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-600 tracking-wider">Channel Source</span>
              <div className="mt-1 flex items-center gap-1.5 font-medium text-stone-900 capitalize">
                {lead.source === 'whatsapp' && <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />}
                {lead.source === 'instagram' && <Instagram className="h-3.5 w-3.5 text-rose-500" />}
                {lead.source === 'website' && <Globe className="h-3.5 w-3.5 text-stone-600" />}
                <span>{lead.source}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-600 tracking-wider">Estimated Value</span>
              <div className="mt-1 font-bold font-mono text-stone-900">
                {lead.estimated_value ? formatINR(lead.estimated_value) : '₹0'}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Coordinates */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Contact Channels
            </h4>
            {onEditLead && (
              <button
                onClick={() => onEditLead(lead)}
                className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit Info</span>
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-2 text-stone-700">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span className="font-mono">{lead.contact_phone || 'No phone recorded'}</span>
              </div>
              {lead.contact_phone && (
                <button
                  onClick={handleOpenConversation}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>Open Chat</span>
                </button>
              )}
            </div>

            {lead.contact_email && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2 text-stone-700">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <span className="font-mono">{lead.contact_email}</span>
                </div>
                <a
                  href={`mailto:${lead.contact_email}`}
                  className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1"
                >
                  <span>Email</span>
                </a>
              </div>
            )}

            {lead.instagram_username && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2 text-stone-700">
                  <Instagram className="h-4 w-4 text-rose-500" />
                  <span className="font-mono">@{lead.instagram_username}</span>
                </div>
                <button
                  onClick={() => router.push('/instagram')}
                  className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1"
                >
                  <span>DM</span>
                </button>
              </div>
            )}
          </div>

          {/* Contact Identity Link Status */}
          <div className="pt-2">
            {linkedContact ? (
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-semibold text-stone-900">
                      Linked Contact: {linkedContact.name}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      Contact ID: {linkedContact.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/contacts')}
                  className="text-xs"
                >
                  View Contact
                </Button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-stone-800">
                    Not linked to persistent contact
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Connect this lead to the TBW Contact Directory
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLinkContact}
                  disabled={isSaving}
                  className="text-xs"
                >
                  Link Contact
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Business Needs & Requirements */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Business Requirements & Intent
          </h4>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="text-[10px] uppercase font-semibold text-stone-600">Primary Service Interest</div>
              <div className="text-xs font-semibold text-stone-900 mt-0.5">{lead.service_interest}</div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="text-[10px] uppercase font-semibold text-stone-600">Problem / Client Goal</div>
              <div className="text-xs text-stone-800 mt-0.5 leading-relaxed">{requirement}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="text-[10px] uppercase font-semibold text-stone-600">Preferred Language</div>
                <div className="text-xs font-medium text-stone-900 mt-0.5">{languageMatch}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="text-[10px] uppercase font-semibold text-stone-600">Pipeline Stage</div>
                <div className="text-xs font-medium text-stone-900 mt-0.5 capitalize">{currentStatus}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Internal Operator Notes */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Operator Internal Notes
            </h4>
            {!isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit Notes</span>
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                rows={4}
                placeholder="Enter client follow-up details, discussion points, or next steps..."
                className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none transition-all"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(false)}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveNotes} disabled={isSaving}>
                  Save Notes
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs text-stone-700 leading-relaxed min-h-[60px] whitespace-pre-line">
              {notesContent || <span className="text-stone-400 italic">No internal notes added yet.</span>}
            </div>
          )}
        </div>
      </div>
    </SlideOver>
  );
}
