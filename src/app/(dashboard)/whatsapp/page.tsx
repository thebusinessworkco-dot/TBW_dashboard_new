'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Send,
  Bot,
  User,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Calendar,
  Phone,
  Sparkles,
  Info,
  UserCheck,
  Save,
  Check,
  X,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatDateTime,
  formatRelativeTime,
  getConversationStatusBadge,
  formatINR,
} from '@/lib/utils';
import { ConversationStatus } from '@/lib/types/dashboard';

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#7A756D]">Loading WhatsApp Inbox...</div>}>
      <WhatsAppPageContent />
    </Suspense>
  );
}

function WhatsAppPageContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') as ConversationStatus | null;

  const {
    conversations,
    messages,
    leads,
    appointments,
    updateConversationStatus,
    toggleAutomationPaused,
    toggleManualTakeover,
    updateInternalNotes,
    sendMessage,
  } = useDashboardStore();

  // Deduplicate WhatsApp conversations by normalized phone number or contact ID
  const waConversations = useMemo(() => {
    const raw = conversations.filter((c) => c.platform === 'whatsapp');
    const seen = new Set<string>();
    const unique: typeof raw = [];

    // Sort with freshest message first
    const sorted = [...raw].sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.created_at || 0).getTime();
      const timeB = new Date(b.last_message_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    for (const c of sorted) {
      const cleanPhone = (c.contact?.phone || '').replace(/[^0-9]/g, '');
      const dedupKey = cleanPhone ? `phone:${cleanPhone}` : `contact:${c.contact_id || c.id}`;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        unique.push(c);
      }
    }
    return unique;
  }, [conversations]);

  const [selectedConvId, setSelectedConvId] = useState<string>(
    waConversations[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || 'all');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [notesDraft, setNotesDraft] = useState(waConversations[0]?.internal_notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter conversations
  // Filter conversations with complete null-safety
  const filteredConversations = waConversations.filter((c) => {
    const contactName = c.contact?.name || c.contact?.phone || 'WhatsApp Contact';
    const phone = c.contact?.phone || '';
    const company = c.contact?.company_name || '';

    const matchesSearch =
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeConversation = conversations.find((c) => c.id === selectedConvId) || filteredConversations[0];
  const activeMessages = activeConversation ? messages[activeConversation.id] || [] : [];
  const linkedLead = activeConversation?.linked_lead_id
    ? leads.find((l) => l.id === activeConversation.linked_lead_id)
    : undefined;
  const linkedAppointment = activeConversation?.linked_appointment_id
    ? appointments.find((a) => a.id === activeConversation.linked_appointment_id)
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, selectedConvId]);

  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversation || isSending) return;

    setSendError(null);
    setIsSending(true);
    const result = await sendMessage(activeConversation.id, replyText.trim(), 'human_agent');
    if (!result?.success) {
      setSendError(result?.error || 'Failed to dispatch message via Meta WhatsApp Cloud API.');
    } else {
      setReplyText('');
    }
    setIsSending(false);
  };

  const handleSaveNotes = () => {
    if (!activeConversation) return;
    updateInternalNotes(activeConversation.id, notesDraft);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FAF8F5]">
      <TopNavbar
        title="WhatsApp Automation Inbox"
        subtitle="Review what your bot says, take over conversations manually, and monitor message delivery."
      />

      {/* 3-Panel Master-Detail Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* PANEL 1: CONVERSATION LIST */}
        <div className="flex w-full flex-col border-r border-[#E2DDD3] bg-white sm:w-80 md:w-96 shrink-0">
          {/* Search & Filter Header */}
          <div className="border-b border-[#E2DDD3] p-3 space-y-2.5 bg-[#FAF8F5]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756D]" />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E2DDD3] bg-white py-1.5 pl-9 pr-3 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
              />
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {['all', 'open', 'completed', 'incomplete', 'waiting_for_customer', 'needs_attention'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2 py-0.5 capitalize transition-colors ${
                    statusFilter === s
                      ? 'bg-[#141413] text-white font-medium'
                      : 'bg-white border border-[#E2DDD3] text-[#555047] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EFECE4]">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7A756D]">
                No WhatsApp conversations matching this filter.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const statusBadge = getConversationStatusBadge(conv.status);

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setNotesDraft(conv.internal_notes || '');
                    }}
                    className={`cursor-pointer p-3.5 transition-colors ${
                      isSelected
                        ? 'bg-[#F2EFE9] border-l-4 border-l-[#141413]'
                        : 'hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-[#141413] truncate">
                        {conv.contact?.name || conv.contact?.phone || 'WhatsApp Contact'}
                      </span>
                      <span className="text-[10px] text-[#7A756D] shrink-0">
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#7A756D] font-mono mb-1 truncate">
                      {conv.contact?.phone || conv.contact?.company_name || ''}
                    </div>

                    <p className="text-xs text-[#555047] line-clamp-1 mb-2">
                      {conv.last_message}
                    </p>

                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                      >
                        {statusBadge.label}
                      </span>

                      {conv.manual_takeover ? (
                        <span className="font-bold text-purple-700">Manual Takeover</span>
                      ) : conv.automation_paused ? (
                        <span className="text-amber-700">Paused</span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Auto Reply Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: ACTIVE CHAT CONVERSATION */}
        {activeConversation ? (
          <div className="flex flex-1 flex-col bg-[#F7F5F0] overflow-hidden">
            {/* Chat Top Bar */}
            <div className="flex h-16 items-center justify-between border-b border-[#E2DDD3] bg-white px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">
                  WA
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#141413]">
                      {activeConversation.contact?.name || activeConversation.contact?.phone || 'WhatsApp Contact'}
                    </h2>
                    {activeConversation.contact?.phone && (
                      <span className="text-xs font-mono text-[#7A756D]">
                        {activeConversation.contact.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#7A756D]">
                    <span>{activeConversation.contact?.company_name || 'Individual Contact'}</span>
                    <span>•</span>
                    <span className="capitalize font-medium text-[#141413]">
                      {activeConversation.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Automation Controls */}
              <div className="flex items-center gap-2">
                {/* Manual Takeover Toggle */}
                <button
                  type="button"
                  onClick={() => toggleManualTakeover(activeConversation.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors ${
                    activeConversation.manual_takeover
                      ? 'bg-purple-700 text-white hover:bg-purple-800'
                      : 'border border-[#E2DDD3] bg-white text-[#555047] hover:bg-[#FAF8F5]'
                  }`}
                  title="When active, n8n stops automatic bot replies"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {activeConversation.manual_takeover ? 'Takeover Active' : 'Take Over Chat'}
                  </span>
                </button>

                {/* Pause/Resume Automation Toggle */}
                <button
                  type="button"
                  onClick={() => toggleAutomationPaused(activeConversation.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors ${
                    activeConversation.automation_paused
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'border border-[#E2DDD3] bg-white text-[#555047] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {activeConversation.automation_paused ? (
                    <>
                      <PlayCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Resume Bot</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Pause Bot</span>
                    </>
                  )}
                </button>

                {/* Mark Completed Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    updateConversationStatus(
                      activeConversation.id,
                      activeConversation.status === 'completed' ? 'open' : 'completed'
                    )
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border shadow-2xs transition-colors ${
                    activeConversation.status === 'completed'
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'border-[#E2DDD3] bg-white text-[#555047] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {activeConversation.status === 'completed' ? 'Completed ✓' : 'Mark Complete'}
                </button>

                {/* Toggle details drawer */}
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className="rounded-lg border border-[#E2DDD3] bg-white p-2 text-[#555047] hover:bg-[#FAF8F5]"
                  title="Toggle details panel"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Takeover notice banner if active */}
            {activeConversation.manual_takeover && (
              <div className="bg-purple-50 border-b border-purple-200 px-4 py-2 text-xs text-purple-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-700" />
                  <span>
                    <strong>Manual Takeover Active</strong>: Automatic n8n bot replies are suspended for this contact.
                  </span>
                </div>
                <button
                  onClick={() => toggleManualTakeover(activeConversation.id)}
                  className="font-bold underline hover:text-black"
                >
                  Release to Bot
                </button>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {activeMessages.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-[#7A756D]">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E2DDD3] bg-[#FAF8F5]">
                    <MessageSquare className="h-6 w-6 text-[#7A756D]" />
                  </div>
                  <p className="text-sm font-semibold text-[#141413]">No message history in database</p>
                  <p className="mt-1 text-xs text-[#7A756D] max-w-sm">
                    {activeConversation.last_message
                      ? `Conversation preview: "${activeConversation.last_message}". Individual messages are empty or were archived.`
                      : 'Send a message below or wait for inbound WhatsApp customer messages.'}
                  </p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isCustomer = msg.sender_type === 'customer';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                  >
                    {/* Message Card */}
                    <div
                      className={`max-w-lg rounded-2xl p-3.5 shadow-2xs text-xs sm:text-sm leading-relaxed ${
                        isCustomer
                          ? 'bg-white border border-[#E2DDD3] text-[#141413] rounded-tl-xs'
                          : 'bg-[#141413] text-white rounded-tr-xs'
                      }`}
                    >
                      {/* Sender Meta Tag */}
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px]">
                        {msg.sender_type === 'customer' ? (
                          <span className="font-semibold text-[#555047] flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {msg.sender_name || 'Customer'}
                          </span>
                        ) : msg.sender_type === 'automation_ai' ? (
                          <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-bold text-purple-300 flex items-center gap-1 border border-purple-500/30">
                            <Sparkles className="h-3 w-3" />
                            AI GENERATED REPLY
                          </span>
                        ) : msg.sender_type === 'automation_rule' ? (
                          <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-bold text-sky-300 flex items-center gap-1 border border-sky-500/30">
                            <Bot className="h-3 w-3" />
                            AUTOMATION RULE
                          </span>
                        ) : (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-300 flex items-center gap-1 border border-amber-500/30">
                            <UserCheck className="h-3 w-3" />
                            HUMAN ADMIN (Aman Rajbhar)
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Timestamp & Status */}
                      <div
                        className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${
                          isCustomer ? 'text-[#7A756D]' : 'text-stone-400'
                        }`}
                      >
                        <span>{formatDateTime(msg.created_at)}</span>
                        {!isCustomer && (
                          <span className="capitalize font-mono">
                            · {msg.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
            </div>

            {/* Manual Reply Box */}
            <div className="border-t border-[#E2DDD3] bg-white p-4">
              {sendError && (
                <div className="mb-3 flex items-start justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Dispatch Error:</strong> {sendError}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSendError(null)}
                    className="text-rose-700 hover:text-rose-900 ml-2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendManualReply} className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    activeConversation.manual_takeover
                      ? 'Type official WhatsApp reply (manual takeover)...'
                      : 'Type manual reply (will automatically activate takeover)...'
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] px-4 py-2.5 text-xs sm:text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#141413] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#2A2825] disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </form>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#7A756D]">
                <span>
                  Official WhatsApp Cloud API · Connected to WABA <strong>392817462019384</strong>
                </span>
                <span>Messages captured & logged via n8n</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-xs text-[#7A756D]">
            Select a WhatsApp conversation to inspect history and controls.
          </div>
        )}

        {/* PANEL 3: LEAD & CONTACT DRAWER */}
        {activeConversation && rightPanelOpen && (
          <div className="hidden lg:flex w-80 flex-col border-l border-[#E2DDD3] bg-white overflow-y-auto p-4 space-y-6 shrink-0">
            {/* Customer Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A756D]">
                  Customer Profile
                </h3>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="text-[#7A756D] hover:text-[#141413]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3.5 space-y-2">
                <div className="font-bold text-sm text-[#141413]">
                  {activeConversation.contact?.name || activeConversation.contact?.phone || 'WhatsApp Contact'}
                </div>
                <div className="text-xs text-[#555047] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#7A756D]" />
                  <span>{activeConversation.contact?.phone || 'No phone'}</span>
                </div>
                {activeConversation.contact?.company_name && (
                  <div className="text-xs text-[#555047]">
                    Company: <strong>{activeConversation.contact.company_name}</strong>
                  </div>
                )}
                <div className="text-[11px] text-[#7A756D]">
                  First contact: {activeConversation.contact?.created_at ? formatDateTime(activeConversation.contact.created_at) : 'Recent'}
                </div>
              </div>
            </div>

            {/* Linked Lead Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A756D]">
                  Linked Lead (Google Sheets)
                </h3>
              </div>

              {linkedLead ? (
                <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#141413]">Status:</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {linkedLead.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    Interest: <strong>{linkedLead.service_interest}</strong>
                  </div>
                  {linkedLead.estimated_value && (
                    <div>
                      Est. Value: <strong>{formatINR(linkedLead.estimated_value)}</strong>
                    </div>
                  )}
                  <div className="text-[11px] text-[#7A756D]">
                    Row ID: <span className="font-mono">{linkedLead.google_sheet_row_id}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#CDC7BA] p-3 text-center text-xs text-[#7A756D]">
                  No linked lead for this contact.
                </div>
              )}
            </div>

            {/* Related Appointment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A756D]">
                  Linked Booking
                </h3>
              </div>

              {linkedAppointment ? (
                <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-3.5 space-y-2 text-xs">
                  <div className="font-semibold text-[#141413]">
                    {linkedAppointment.service_requested}
                  </div>
                  <div className="flex items-center gap-1.5 text-[#555047]">
                    <Calendar className="h-3.5 w-3.5 text-[#7A756D]" />
                    <span>
                      {linkedAppointment.appointment_date} at {linkedAppointment.appointment_time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      {linkedAppointment.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-[#7A756D]">Google Calendar</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#CDC7BA] p-3 text-center text-xs text-[#7A756D]">
                  No appointment booked yet.
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A756D]">
                  Internal Notes
                </h3>
                {notesSaved && (
                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add confidential customer notes or follow-up instructions..."
                className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E2DDD3] bg-white py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#FAF8F5]"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Notes</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
