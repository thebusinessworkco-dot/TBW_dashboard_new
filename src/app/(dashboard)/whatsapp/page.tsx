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
  CheckCheck,
  Clock,
  AlertCircle,
  MapPin,
  FileText,
  FileDown,
  Volume2,
  CornerDownRight,
  List as ListIcon,
  ExternalLink,
  ArrowDown,
  Layers,
  X,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore, deduplicateAndSortMessages } from '@/lib/store/dashboard-store';
import {
  formatDateTime,
  formatRelativeTime,
  getConversationStatusBadge,
  formatINR,
} from '@/lib/utils';
import { ConversationStatus, AdminMessage, MessageStatus, MessageMetadata, WhatsAppListSection } from '@/lib/types/dashboard';

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === 'read') {
    return (
      <span className="inline-flex items-center gap-1 text-sky-400 font-medium" title="Read by customer">
        <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
        <span className="capitalize text-[10px]">Read</span>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-1 text-stone-300" title="Delivered to customer device">
        <CheckCheck className="h-3.5 w-3.5 text-stone-300" />
        <span className="capitalize text-[10px]">Delivered</span>
      </span>
    );
  }
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-stone-400" title="Sent via WhatsApp Cloud API">
        <Check className="h-3.5 w-3.5 text-stone-400" />
        <span className="capitalize text-[10px]">Sent</span>
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 font-medium" title="Delivery failed">
        <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
        <span className="capitalize text-[10px]">Failed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-stone-400" title="Queued">
      <Clock className="h-3.5 w-3.5 text-stone-400" />
      <span className="capitalize text-[10px]">Queued</span>
    </span>
  );
}

function RenderWhatsAppMessageBody({ msg }: { msg: AdminMessage }) {
  const isCustomer = msg.sender_type === 'customer';

  // Safely parse metadata if provided as object or string
  let meta: MessageMetadata = {};
  if (typeof msg.metadata === 'string') {
    try {
      meta = JSON.parse(msg.metadata);
    } catch {
      meta = {};
    }
  } else if (msg.metadata && typeof msg.metadata === 'object') {
    meta = msg.metadata;
  }

  const interactive = meta.interactive;
  const location = meta.location;
  const template = meta.template;
  const appointment = meta.appointment;

  // 1. Extract interactive buttons from both Meta WhatsApp action.buttons and flat buttons arrays
  const extractedButtons: Array<{ id: string; title: string }> = (() => {
    // A. Meta WhatsApp Cloud API interactive button structure: interactive.action.buttons
    const actionButtons = interactive?.action?.buttons;
    if (Array.isArray(actionButtons) && actionButtons.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return actionButtons.map((b: any, idx: number) => {
        const title = b.reply?.title || b.title || b.text || `Option ${idx + 1}`;
        const id = b.reply?.id || b.id || `btn_${idx}`;
        return { id, title };
      });
    }

    // B. Direct interactive.buttons array
    if (Array.isArray(interactive?.buttons) && interactive.buttons.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return interactive.buttons.map((b: any, idx: number) => {
        const title = b.title || b.reply?.title || b.text || `Option ${idx + 1}`;
        const id = b.id || b.reply?.id || `btn_${idx}`;
        return { id, title };
      });
    }

    return [];
  })();

  // 2. Extract interactive list sections
  const extractedSections: WhatsAppListSection[] = (() => {
    const actionSections = interactive?.action?.sections;
    if (Array.isArray(actionSections) && actionSections.length > 0) {
      return actionSections;
    }
    if (Array.isArray(interactive?.sections) && interactive.sections.length > 0) {
      return interactive.sections;
    }
    return [];
  })();

  // 3. Extract incoming button selection reply
  const selectedButton = (() => {
    if (interactive?.selected_button?.title) return interactive.selected_button;
    if (interactive?.button_reply?.title) return interactive.button_reply;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((interactive as any)?.reply?.title) return (interactive as any).reply;
    return null;
  })();

  // 4. Extract incoming list selection reply
  const selectedListRow = (() => {
    if (interactive?.selected_list_item?.title) return interactive.selected_list_item;
    if (interactive?.list_reply?.title) return interactive.list_reply;
    return null;
  })();

  // 5. Extract WhatsApp Flow submission
  const parsedFlowData: Record<string, unknown> | null = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawFlow = meta.flow_data || interactive?.flow_response || (interactive as any)?.nfm_reply?.response_json;
    if (!rawFlow) return null;
    if (typeof rawFlow === 'string') {
      try {
        const parsed = JSON.parse(rawFlow);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        return { response: rawFlow };
      }
    }
    if (typeof rawFlow === 'object') {
      return rawFlow as Record<string, unknown>;
    }
    return null;
  })();

  const bodyText = msg.content || interactive?.body?.text || '';

  return (
    <div className="space-y-2">
      {/* 1. Media Preview (Image, Audio, Video, Document) */}
      {msg.media_url && (
        <div className="overflow-hidden rounded-xl">
          {msg.media_type === 'image' ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.media_url}
                alt="Shared via WhatsApp"
                className="max-h-60 w-auto rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                onClick={() => window.open(msg.media_url, '_blank')}
              />
            </div>
          ) : msg.media_type === 'audio' ? (
            <div className={`p-2.5 rounded-xl flex flex-col gap-1.5 ${isCustomer ? 'bg-[#FAF8F5]' : 'bg-white/10'}`}>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Volume2 className="h-4 w-4" />
                <span>Voice Note / Audio</span>
              </div>
              <audio controls src={msg.media_url} className="w-full h-8" />
            </div>
          ) : msg.media_type === 'video' ? (
            <video controls src={msg.media_url} className="max-h-60 rounded-xl w-full" />
          ) : (
            <a
              href={msg.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition ${
                isCustomer
                  ? 'border-[#E2DDD3] bg-[#FAF8F5] text-[#141413] hover:bg-stone-100'
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <FileText className="h-6 w-6 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold truncate">{meta.filename || 'Document attachment'}</p>
                <p className="text-[10px] opacity-70">Click to view or download</p>
              </div>
              <FileDown className="h-4 w-4 shrink-0" />
            </a>
          )}
        </div>
      )}

      {/* 2. Location Card */}
      {location && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition ${
            isCustomer
              ? 'border-[#E2DDD3] bg-[#FAF8F5] text-[#141413] hover:bg-stone-100'
              : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          <MapPin className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold">{location.name || 'Shared Location'}</p>
            {location.address && <p className="text-[11px] opacity-80 line-clamp-2">{location.address}</p>}
            <p className="text-[10px] opacity-60 mt-0.5">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · View in Google Maps
            </p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </a>
      )}

      {/* 3. Text Content */}
      {bodyText &&
        (!selectedButton || (bodyText !== selectedButton.title && bodyText !== `Selected: ${selectedButton.title}`)) &&
        (!selectedListRow || (bodyText !== selectedListRow.title && bodyText !== `Selected: ${selectedListRow.title}`)) && (
          <div className="whitespace-pre-wrap break-words">{bodyText}</div>
        )}

      {/* 4. Interactive Quick-Reply Buttons (Outgoing Options) */}
      {extractedButtons.length > 0 && (
        <div className="pt-2 flex flex-wrap gap-2">
          {extractedButtons.map((btn) => (
            <div
              key={btn.id}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm border transition select-none ${
                isCustomer
                  ? 'border-purple-300 bg-purple-50 text-purple-900'
                  : 'border-white/30 bg-white/20 text-white'
              }`}
            >
              <span>{btn.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Button Selection Reply (Incoming) */}
      {selectedButton && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5">
          <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
          <span>
            Selected: <strong>{selectedButton.title}</strong>
          </span>
        </div>
      )}

      {/* 6. Interactive List Sections (Outgoing) */}
      {extractedSections.length > 0 && (
        <div className="pt-1 space-y-1.5">
          {interactive?.action?.button && (
            <p className="text-[11px] font-semibold opacity-90">{interactive.action.button}</p>
          )}
          {extractedSections.map((sec, idx) => (
            <div key={idx} className="rounded-lg border border-white/20 bg-white/5 p-2 text-xs">
              {sec.title && <p className="font-bold text-[11px] text-white/80 uppercase tracking-wide mb-1">{sec.title}</p>}
              <div className="space-y-1">
                {sec.rows?.map((row) => (
                  <div key={row.id} className="rounded bg-white/10 px-2 py-1">
                    <p className="font-semibold text-white">{row.title}</p>
                    {row.description && <p className="text-[10px] text-white/70">{row.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. List Selection (Incoming) */}
      {selectedListRow && (
        <div className="flex items-start gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
          <ListIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{selectedListRow.title}</p>
            {selectedListRow.description && (
              <p className="text-[10px] text-emerald-700 font-normal">
                {selectedListRow.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 8. WhatsApp Flow Submission */}
      {parsedFlowData && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-2.5 text-xs text-sky-950 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-sky-900">
            <Layers className="h-4 w-4" />
            <span>WhatsApp Flow Submission</span>
          </div>
          <div className="space-y-1 text-[11px]">
            {Object.entries(parsedFlowData).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2 border-b border-sky-100 pb-0.5 last:border-0">
                <span className="capitalize font-medium text-sky-800">{key.replace(/_/g, ' ')}:</span>
                <span className="font-semibold text-right">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Appointment Booking Flow (Available dates, available time slots, booking confirmation) */}
      {appointment && (
        <div className="pt-1 space-y-2">
          {/* Available Dates */}
          {Array.isArray(appointment.available_dates) && appointment.available_dates.length > 0 && (
            <div className={`p-2.5 rounded-xl border text-xs ${
              isCustomer ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-emerald-500/30 bg-emerald-950/40 text-emerald-100'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold mb-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>Available Appointment Dates</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {appointment.available_dates.map((dateStr, idx) => (
                  <span
                    key={idx}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium border ${
                      isCustomer ? 'bg-white border-emerald-300 text-emerald-900' : 'bg-white/10 border-emerald-400/30 text-white'
                    }`}
                  >
                    📅 {String(dateStr)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Available Time Slots */}
          {Array.isArray(appointment.available_slots) && appointment.available_slots.length > 0 && (
            <div className={`p-2.5 rounded-xl border text-xs ${
              isCustomer ? 'border-sky-200 bg-sky-50 text-sky-950' : 'border-sky-500/30 bg-sky-950/40 text-sky-100'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold mb-2">
                <Clock className="h-4 w-4 text-sky-400" />
                <span>Available Time Slots</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {appointment.available_slots.map((slotStr, idx) => (
                  <span
                    key={idx}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium border ${
                      isCustomer ? 'bg-white border-sky-300 text-sky-900' : 'bg-white/10 border-sky-400/30 text-white'
                    }`}
                  >
                    ⏰ {String(slotStr)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Customer Selection of Date or Time */}
          {Boolean(isCustomer && (appointment.date || appointment.time) && !appointment.available_slots?.length && !appointment.available_dates?.length) && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
              <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {appointment.date ? <span>Selected Date: <strong>{String(appointment.date)}</strong></span> : null}
              {appointment.time ? <span>· Time: <strong>{String(appointment.time)}</strong></span> : null}
            </div>
          )}

          {/* Confirmed Booking Card */}
          {Boolean(appointment.status === 'confirmed' || appointment.confirmation_id || (appointment.date && appointment.time && !isCustomer)) && (
            <div className={`rounded-xl border p-3 text-xs ${
              isCustomer
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-emerald-500/40 bg-emerald-950/40 text-white'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <CheckCheck className="h-4 w-4" />
                  <span>Booking Confirmation</span>
                </div>
                {appointment.confirmation_id ? (
                  <span className="font-mono text-[10px] rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300 border border-emerald-500/30">
                    ID: {String(appointment.confirmation_id)}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1 text-[11px]">
                {appointment.service_name ? (
                  <p><span className="opacity-70">Service:</span> <strong>{String(appointment.service_name)}</strong></p>
                ) : null}
                {appointment.date ? (
                  <p><span className="opacity-70">Appointment Date:</span> <strong>{String(appointment.date)}</strong></p>
                ) : null}
                {appointment.time ? (
                  <p><span className="opacity-70">Time Slot:</span> <strong>{String(appointment.time)}</strong></p>
                ) : null}
                {appointment.customer_name ? (
                  <p><span className="opacity-70">Customer:</span> {String(appointment.customer_name)}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Reschedule Notice */}
          {Boolean(appointment.status === 'rescheduled' || appointment.rescheduled_from) && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-2.5 text-xs text-amber-200">
              <p className="font-bold flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Appointment Rescheduled</span>
              </p>
              {appointment.rescheduled_from ? (
                <p className="text-[11px] opacity-80 mt-1">Previous: {String(appointment.rescheduled_from)}</p>
              ) : null}
              {appointment.date ? (
                <p className="text-[11px] font-semibold mt-0.5">New: {String(appointment.date)} at {String(appointment.time)}</p>
              ) : null}
            </div>
          )}

          {/* Cancellation Notice */}
          {Boolean(appointment.status === 'cancelled') && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-950/30 p-2.5 text-xs text-rose-200">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>Appointment Cancelled</span>
              </p>
              {appointment.cancelled_reason ? (
                <p className="text-[11px] opacity-80 mt-1">Reason: {String(appointment.cancelled_reason)}</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* 9. Template Info Badge */}
      {template && (
        <div className="inline-flex items-center gap-1 text-[10px] rounded bg-white/10 px-2 py-0.5 font-mono text-white/80">
          <span>Template: {template.name}</span>
        </div>
      )}
    </div>
  );
}

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
    realtimeStatus,
    refreshData,
    fetchConversationMessages,
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
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [notesDraft, setNotesDraft] = useState(waConversations[0]?.internal_notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Derived active conversation ID: guarantees instant valid selection without cascading renders
  const effectiveConvId =
    selectedConvId && waConversations.some((c) => c.id === selectedConvId)
      ? selectedConvId
      : waConversations[0]?.id || '';

  // Immediate message fetch when conversation selection changes
  useEffect(() => {
    if (effectiveConvId) {
      void fetchConversationMessages(effectiveConvId);
    }
  }, [effectiveConvId, fetchConversationMessages]);

  // Active conversation polling (3s) while document is visible
  useEffect(() => {
    if (!effectiveConvId) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchConversationMessages(effectiveConvId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [effectiveConvId, fetchConversationMessages]);

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await Promise.all([
        refreshData(),
        effectiveConvId ? fetchConversationMessages(effectiveConvId) : Promise.resolve(),
      ]);
    } finally {
      setTimeout(() => setIsManualSyncing(false), 500);
    }
  };

  const feedRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

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

  const activeConversation = conversations.find((c) => c.id === effectiveConvId) || filteredConversations[0];
  const activeMessages = deduplicateAndSortMessages(
    activeConversation ? messages[activeConversation.id] || [] : []
  );
  const linkedLead = activeConversation?.linked_lead_id
    ? leads.find((l) => l.id === activeConversation.linked_lead_id)
    : undefined;
  const linkedAppointment = activeConversation?.linked_appointment_id
    ? appointments.find((a) => a.id === activeConversation.linked_appointment_id)
    : undefined;

  const prevMsgCountRef = useRef(activeMessages.length);
  const prevConvIdRef = useRef(effectiveConvId);

  const handleScrollFeed = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setIsAtBottom(nearBottom);
    if (nearBottom) setHasNewBelow(false);
  };

  // Smart scroll effect: only auto-scroll if user is already at the bottom or switched conversation
  useEffect(() => {
    if (prevConvIdRef.current !== effectiveConvId) {
      prevConvIdRef.current = effectiveConvId;
      prevMsgCountRef.current = activeMessages.length;
      setHasNewBelow(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      return;
    }

    if (activeMessages.length > prevMsgCountRef.current) {
      prevMsgCountRef.current = activeMessages.length;
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasNewBelow(true);
      }
    }
  }, [activeMessages.length, effectiveConvId, isAtBottom]);

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

              {/* Automation Controls & Realtime Indicator */}
              <div className="flex items-center gap-2">
                {/* Realtime Live Indicator */}
                <div
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E2DDD3] bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-medium text-[#555047]"
                  title="Supabase Realtime status"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      realtimeStatus === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : realtimeStatus === 'fallback_polling'
                        ? 'bg-amber-500'
                        : 'bg-stone-400'
                    }`}
                  />
                  <span>
                    {realtimeStatus === 'connected'
                      ? 'Realtime'
                      : realtimeStatus === 'fallback_polling'
                      ? 'Sync Active'
                      : 'Connecting...'}
                  </span>
                </div>

                {/* Instant Sync Button */}
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DDD3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#555047] shadow-2xs hover:bg-[#FAF8F5] transition disabled:opacity-60 cursor-pointer"
                  title="Force refresh conversation & message records"
                >
                  <RefreshCw className={`h-3 w-3 ${isManualSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                  <span className="hidden sm:inline">{isManualSyncing ? 'Syncing...' : 'Sync'}</span>
                </button>

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
            <div
              ref={feedRef}
              onScroll={handleScrollFeed}
              className="relative flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
            >
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

                        {/* Rich WhatsApp Message Content */}
                        <RenderWhatsAppMessageBody msg={msg} />

                        {/* Timestamp & Status Receipt Indicator */}
                        <div
                          className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${
                            isCustomer ? 'text-[#7A756D]' : 'text-stone-400'
                          }`}
                        >
                          <span>{formatDateTime(msg.created_at)}</span>
                          {!isCustomer && (
                            <span className="flex items-center gap-1 ml-1">
                              · <MessageStatusIcon status={msg.status} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />

              {/* Floating Jump to Bottom Button */}
              {hasNewBelow && (
                <button
                  type="button"
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    setHasNewBelow(false);
                  }}
                  className="sticky bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-black hover:scale-105 z-10"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span>New messages below</span>
                </button>
              )}
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
