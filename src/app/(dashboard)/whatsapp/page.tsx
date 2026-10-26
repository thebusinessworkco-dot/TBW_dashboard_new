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
  Trash2,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore, deduplicateAndSortMessages } from '@/lib/store/dashboard-store';
import { WhatsAppActivityView } from '@/components/whatsapp/whatsapp-activity-view';
import { WhatsAppContactsView } from '@/components/whatsapp/whatsapp-contacts-view';
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
    const actionButtons = interactive?.action?.buttons;
    if (Array.isArray(actionButtons) && actionButtons.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return actionButtons.map((b: any, idx: number) => {
        const title = b.reply?.title || b.title || b.text || `Option ${idx + 1}`;
        const id = b.reply?.id || b.id || `btn_${idx}`;
        return { id, title };
      });
    }

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
    <div className="space-y-2.5">
      {/* 1. Media Preview (Image, Audio, Video, Document) */}
      {msg.media_url && (
        <div className="overflow-hidden rounded-xl border border-stone-200/20">
          {msg.media_type === 'image' ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.media_url}
                alt="Shared via WhatsApp"
                className="max-h-64 w-auto rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                onClick={() => window.open(msg.media_url, '_blank')}
              />
            </div>
          ) : msg.media_type === 'audio' ? (
            <div className={`p-3 rounded-xl flex flex-col gap-2 ${isCustomer ? 'bg-stone-50 border border-stone-200' : 'bg-white/10'}`}>
              <div className="flex items-center gap-2 text-xs font-medium">
                <Volume2 className="h-4 w-4" />
                <span>Voice Note / Audio</span>
              </div>
              <audio controls src={msg.media_url} className="w-full h-8" />
            </div>
          ) : msg.media_type === 'video' ? (
            <video controls src={msg.media_url} className="max-h-64 rounded-xl w-full" />
          ) : (
            <a
              href={msg.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                isCustomer
                  ? 'border-stone-200 bg-stone-50 text-stone-900 hover:bg-stone-100'
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <FileText className="h-6 w-6 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold truncate">{meta.filename || 'Document attachment'}</p>
                <p className="text-[10px] opacity-70">Click to preview document</p>
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
          className={`flex items-start gap-2.5 p-3 rounded-xl border transition ${
            isCustomer
              ? 'border-stone-200 bg-stone-50 text-stone-900 hover:bg-stone-100'
              : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          <MapPin className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold">{location.name || 'Shared Location'}</p>
            {location.address && <p className="text-[11px] opacity-80 line-clamp-2 mt-0.5">{location.address}</p>}
            <p className="text-[10px] opacity-60 mt-1">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · View in Maps
            </p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </a>
      )}

      {/* 3. Text Content */}
      {bodyText &&
        (!selectedButton || (bodyText !== selectedButton.title && bodyText !== `Selected: ${selectedButton.title}`)) &&
        (!selectedListRow || (bodyText !== selectedListRow.title && bodyText !== `Selected: ${selectedListRow.title}`)) && (
          <div className="whitespace-pre-wrap break-words leading-relaxed">{bodyText}</div>
        )}

      {/* 4. Interactive Quick-Reply Buttons (Outgoing Options) */}
      {extractedButtons.length > 0 && (
        <div className="pt-2 flex flex-col gap-1.5">
          {extractedButtons.map((btn) => (
            <div
              key={btn.id}
              className={`rounded-xl px-3 py-2 text-xs font-semibold text-center border transition select-none ${
                isCustomer
                  ? 'border-purple-200 bg-purple-50/80 text-purple-900'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              <span>{btn.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5. Button Selection Reply (Incoming) */}
      {selectedButton && (
        <div className="flex items-center gap-2 text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-purple-600" />
          <span>
            Selected option: <strong>{selectedButton.title}</strong>
          </span>
        </div>
      )}

      {/* 6. Interactive List Sections (Outgoing) */}
      {extractedSections.length > 0 && (
        <div className="pt-1.5 space-y-2">
          {interactive?.action?.button && (
            <p className="text-[11px] font-semibold opacity-90">{interactive.action.button}</p>
          )}
          {extractedSections.map((sec, idx) => (
            <div key={idx} className="rounded-xl border border-white/20 bg-white/5 p-2.5 text-xs">
              {sec.title && <p className="font-bold text-[11px] text-white/80 uppercase tracking-wide mb-1.5">{sec.title}</p>}
              <div className="space-y-1.5">
                {sec.rows?.map((row) => (
                  <div key={row.id} className="rounded-lg bg-white/10 px-2.5 py-1.5">
                    <p className="font-semibold text-white">{row.title}</p>
                    {row.description && <p className="text-[10px] text-white/70 mt-0.5">{row.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. List Selection (Incoming) */}
      {selectedListRow && (
        <div className="flex items-start gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
          <ListIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-bold">{selectedListRow.title}</p>
            {selectedListRow.description && (
              <p className="text-[10px] text-emerald-700 font-normal mt-0.5">
                {selectedListRow.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 8. WhatsApp Flow Submission */}
      {parsedFlowData && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-950 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-sky-900">
            <Layers className="h-4 w-4 text-sky-700" />
            <span>WhatsApp Flow Submission</span>
          </div>
          <div className="space-y-1 text-[11px]">
            {Object.entries(parsedFlowData).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2 border-b border-sky-100 pb-1 last:border-0">
                <span className="capitalize font-medium text-sky-800">{key.replace(/_/g, ' ')}:</span>
                <span className="font-semibold text-right">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Appointment Booking Flow */}
      {appointment && (
        <div className="pt-1 space-y-2">
          {/* Available Dates */}
          {Array.isArray(appointment.available_dates) && appointment.available_dates.length > 0 && (
            <div className={`p-3 rounded-xl border text-xs ${
              isCustomer ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-emerald-500/30 bg-emerald-950/40 text-emerald-100'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold mb-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>Available Consultation Dates</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {appointment.available_dates.map((dateStr, idx) => (
                  <span
                    key={idx}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border ${
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
            <div className={`p-3 rounded-xl border text-xs ${
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
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border ${
                      isCustomer ? 'bg-white border-sky-300 text-sky-900' : 'bg-white/10 border-sky-400/30 text-white'
                    }`}
                  >
                    ⏰ {String(slotStr)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Customer Selection */}
          {Boolean(isCustomer && (appointment.date || appointment.time) && !appointment.available_slots?.length && !appointment.available_dates?.length) && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {appointment.date ? <span>Selected Date: <strong>{String(appointment.date)}</strong></span> : null}
              {appointment.time ? <span>· Time: <strong>{String(appointment.time)}</strong></span> : null}
            </div>
          )}

          {/* Confirmed Booking Card */}
          {Boolean(appointment.status === 'confirmed' || appointment.confirmation_id || (appointment.date && appointment.time && !isCustomer)) && (
            <div className={`rounded-xl border p-3.5 text-xs ${
              isCustomer
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-emerald-500/40 bg-emerald-950/40 text-white'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <CheckCheck className="h-4 w-4" />
                  <span>Booking Confirmed</span>
                </div>
                {appointment.confirmation_id ? (
                  <span className="font-mono text-[10px] rounded-lg bg-emerald-500/20 px-2 py-0.5 text-emerald-300 border border-emerald-500/30">
                    ID: {String(appointment.confirmation_id)}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1 text-[11px]">
                {appointment.service_name ? (
                  <p><span className="opacity-70">Service:</span> <strong>{String(appointment.service_name)}</strong></p>
                ) : null}
                {appointment.date ? (
                  <p><span className="opacity-70">Date:</span> <strong>{String(appointment.date)}</strong></p>
                ) : null}
                {appointment.time ? (
                  <p><span className="opacity-70">Time:</span> <strong>{String(appointment.time)}</strong></p>
                ) : null}
                {appointment.customer_name ? (
                  <p><span className="opacity-70">Client:</span> {String(appointment.customer_name)}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {Boolean(appointment.status === 'cancelled') && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-950/30 p-3 text-xs text-rose-200">
              <p className="font-bold flex items-center gap-1.5">
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

      {/* 10. Template Info Badge */}
      {template && (
        <div className="inline-flex items-center gap-1 text-[10px] rounded-lg bg-white/10 px-2 py-0.5 font-mono text-white/80">
          <span>Template: {template.name}</span>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-stone-500">Loading WhatsApp Inbox...</div>}>
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
  const [activeTab, setActiveTab] = useState<'inbox' | 'activity' | 'contacts'>('inbox');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // Real-time conversation list auto-refresh (4s) so new customer messages immediately appear
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshData();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [refreshData]);

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

  const handleDeleteActiveContact = async () => {
    if (!activeConversation) return;
    const phone = activeConversation.contact?.phone || activeConversation.contact_id;
    if (!phone) return;

    setIsDeletingContact(true);
    setDeleteError(null);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const res = await fetch(`/api/whatsapp/contacts/${encodeURIComponent(cleanPhone)}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          admin_email: 'thebusinesswork.co@gmail.com',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsDeleteModalOpen(false);
        setSelectedConvId('');
        await refreshData();
      } else {
        setDeleteError(data.error || 'Failed to delete contact');
      }
    } catch {
      setDeleteError('Network error while deleting contact');
    } finally {
      setIsDeletingContact(false);
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

  // Smart scroll effect (contained to feedRef, never scrolling ancestor window)
  useEffect(() => {
    if (prevConvIdRef.current !== effectiveConvId) {
      prevConvIdRef.current = effectiveConvId;
      prevMsgCountRef.current = activeMessages.length;
      setHasNewBelow(false);
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
      return;
    }

    if (activeMessages.length > prevMsgCountRef.current) {
      prevMsgCountRef.current = activeMessages.length;
      if (isAtBottom) {
        if (feedRef.current) {
          feedRef.current.scrollTo({
            top: feedRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
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

  const handleOpenChatByPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    const matched = waConversations.find(
      (c) => (c.contact?.phone || '').replace(/\D/g, '') === clean
    );
    if (matched) {
      setSelectedConvId(matched.id);
    }
    setActiveTab('inbox');
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAF8F5]">
      <TopNavbar
        title="WhatsApp Automation Master Dashboard"
        subtitle="Review bot conversations, monitor live real-time sessions, and manage customer contacts."
      />

      {/* WhatsApp V6 Top Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#E6E1D7] bg-[#FAF8F5] px-4 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'inbox'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Live Inbox</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Live Activity & Sessions</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Contact Management & CRM</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Supabase Connected
          </span>
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'activity' && <WhatsAppActivityView onSelectCustomer={handleOpenChatByPhone} />}
      {activeTab === 'contacts' && <WhatsAppContactsView onOpenChat={handleOpenChatByPhone} />}
      {activeTab === 'inbox' && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* PANEL 1: CONVERSATION LIST */}
        <div className="flex w-full flex-col border-r border-[#E6E1D7] bg-white sm:w-72 lg:w-80 shrink-0">
          {/* Search & Filter Header */}
          <div className="border-b border-[#E6E1D7] p-3 space-y-2.5 bg-[#FAF8F5]/60">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none transition shadow-2xs"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
              {['all', 'open', 'completed', 'incomplete', 'waiting_for_customer', 'needs_attention'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2 py-0.5 capitalize transition-all cursor-pointer whitespace-nowrap text-xs ${
                    statusFilter === s
                      ? 'bg-stone-900 text-white font-medium shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EFECE5]">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No WhatsApp conversations matching this filter.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const statusBadge = getConversationStatusBadge(conv.status);
                const contactInitial = (conv.contact?.name || conv.contact?.phone || 'W')[0].toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setNotesDraft(conv.internal_notes || '');
                    }}
                    className={`cursor-pointer p-3 transition-all relative ${
                      isSelected
                        ? 'bg-[#F2EFE7] border-l-3 border-l-stone-900 shadow-2xs'
                        : 'hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/25 text-emerald-800 font-bold text-xs border border-emerald-500/30">
                        {contactInitial}
                        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs text-stone-900 truncate">
                            {conv.contact?.name || conv.contact?.phone || 'WhatsApp Contact'}
                          </span>
                          <span className="text-[10px] text-stone-400 shrink-0 font-medium ml-1">
                            {formatRelativeTime(conv.last_message_at)}
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-500 font-mono mb-1 truncate">
                          {conv.contact?.phone || conv.contact?.company_name || ''}
                        </div>

                        <p className="text-xs text-stone-600 line-clamp-1 mb-1.5">
                          {conv.last_message || 'No messages yet'}
                        </p>

                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                          >
                            {statusBadge.label}
                          </span>

                          {conv.manual_takeover ? (
                            <span className="rounded-full bg-purple-50 px-2 py-0.5 font-bold text-purple-700 border border-purple-200">
                              Manual Takeover
                            </span>
                          ) : conv.automation_paused ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 border border-amber-200">
                              Bot Paused
                            </span>
                          ) : (
                            <span className="text-emerald-700 flex items-center gap-1 font-medium text-[10px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Auto Reply Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: ACTIVE CHAT CONVERSATION */}
        {activeConversation ? (
          <div className="flex flex-1 flex-col bg-[#F7F5F0] overflow-hidden min-w-0">
            {/* Chat Top Bar */}
            <div className="flex h-16 items-center justify-between border-b border-[#E6E1D7] bg-white px-4 sm:px-5 gap-3 shrink-0">
              {/* Contact Information */}
              <div className="flex items-center gap-2.5 min-w-0 shrink">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-xs shadow-xs">
                  WA
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1.5 ring-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                      {activeConversation.contact?.name || activeConversation.contact?.phone || 'WhatsApp Contact'}
                    </h2>
                    {activeConversation.contact?.phone && (
                      <span className="hidden 2xl:inline text-xs font-mono text-stone-500 truncate">
                        {activeConversation.contact.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 truncate">
                    <span>{activeConversation.contact?.company_name || 'Direct Contact'}</span>
                    <span>•</span>
                    <span className="capitalize font-medium text-stone-800">
                      {activeConversation.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Automation Controls & Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Instant Sync Button */}
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 transition disabled:opacity-60 cursor-pointer shrink-0"
                  title="Force refresh conversation & message records"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isManualSyncing ? 'animate-spin text-emerald-600' : 'text-stone-500'}`} />
                  <span className="hidden xl:inline">{isManualSyncing ? 'Syncing...' : 'Sync'}</span>
                </button>

                {/* Manual Takeover Toggle */}
                <button
                  type="button"
                  onClick={() => toggleManualTakeover(activeConversation.id)}
                  className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 ${
                    activeConversation.manual_takeover
                      ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs ring-1 ring-purple-600'
                      : 'border border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100'
                  }`}
                  title="When active, n8n stops automatic bot replies"
                >
                  <UserCheck className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">
                    {activeConversation.manual_takeover ? 'Takeover Active' : 'Take Over Chat'}
                  </span>
                  <span className="sm:hidden">
                    {activeConversation.manual_takeover ? 'Active' : 'Takeover'}
                  </span>
                </button>

                {/* Pause/Resume Automation Toggle */}
                <button
                  type="button"
                  onClick={() => toggleAutomationPaused(activeConversation.id)}
                  className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 ${
                    activeConversation.automation_paused
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                  title={activeConversation.automation_paused ? 'Resume automated replies' : 'Pause bot automation'}
                >
                  {activeConversation.automation_paused ? (
                    <>
                      <PlayCircle className="h-3.5 w-3.5 shrink-0 text-white" />
                      <span className="hidden md:inline">Resume Bot</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                      <span className="hidden md:inline">Pause Bot</span>
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
                  className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold border shadow-2xs transition cursor-pointer shrink-0 ${
                    activeConversation.status === 'completed'
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                  title={activeConversation.status === 'completed' ? 'Mark open' : 'Mark completed'}
                >
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden lg:inline">{activeConversation.status === 'completed' ? 'Completed' : 'Complete'}</span>
                </button>

                {/* Toggle details drawer */}
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className={`inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition shrink-0 cursor-pointer ${
                    rightPanelOpen ? 'bg-stone-100 text-stone-900 border-stone-300' : 'bg-white'
                  }`}
                  title="Toggle customer profile panel"
                >
                  <Info className="h-4 w-4" />
                </button>

                {/* Delete Contact & Reset Chat */}
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-2 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition shrink-0 cursor-pointer"
                  title="Delete contact and reset customer session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Takeover notice banner if active */}
            {activeConversation.manual_takeover && (
              <div className="bg-purple-50 border-b border-purple-200/80 px-4 py-2 text-xs text-purple-900 flex items-center justify-between shadow-2xs backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-700 shrink-0" />
                  <span>
                    <strong>Manual Takeover Active</strong>: Automatic n8n bot replies are suspended for this contact.
                  </span>
                </div>
                <button
                  onClick={() => toggleManualTakeover(activeConversation.id)}
                  className="font-bold underline hover:text-black cursor-pointer text-xs"
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
                <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-stone-500">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-2xs">
                    <MessageSquare className="h-6 w-6 text-stone-400" />
                  </div>
                  <p className="text-sm font-semibold text-stone-900">No message history in database</p>
                  <p className="mt-1 text-xs text-stone-500 max-w-sm">
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
                        className={`max-w-lg rounded-2xl p-4 shadow-2xs text-xs sm:text-sm leading-relaxed ${
                          isCustomer
                            ? 'bg-white border border-stone-200/90 text-stone-900 rounded-tl-xs'
                            : 'bg-[#18181B] text-white rounded-tr-xs shadow-xs'
                        }`}
                      >
                        {/* Sender Meta Tag */}
                        <div className="flex items-center gap-1.5 mb-2 text-[10px]">
                          {msg.sender_type === 'customer' ? (
                            <span className="font-semibold text-stone-600 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {msg.sender_name || 'Customer'}
                            </span>
                          ) : msg.sender_type === 'automation_ai' ? (
                            <span className="rounded-md bg-purple-500/20 px-2 py-0.5 font-bold text-purple-300 flex items-center gap-1 border border-purple-500/30">
                              <Sparkles className="h-3 w-3 text-purple-300" />
                              AI GENERATED REPLY
                            </span>
                          ) : msg.sender_type === 'automation_rule' ? (
                            <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-bold text-sky-300 flex items-center gap-1 border border-sky-500/30">
                              <Bot className="h-3 w-3 text-sky-300" />
                              AUTOMATION RULE
                            </span>
                          ) : (
                            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-bold text-amber-300 flex items-center gap-1 border border-amber-500/30">
                              <UserCheck className="h-3 w-3 text-amber-300" />
                              HUMAN ADMIN (Aman Rajbhar)
                            </span>
                          )}
                        </div>

                        {/* Rich WhatsApp Message Content */}
                        <RenderWhatsAppMessageBody msg={msg} />

                        {/* Timestamp & Status Receipt Indicator */}
                        <div
                          className={`mt-2.5 flex items-center justify-end gap-1.5 text-[10px] ${
                            isCustomer ? 'text-stone-400' : 'text-stone-400'
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
                    if (feedRef.current) {
                      feedRef.current.scrollTo({
                        top: feedRef.current.scrollHeight,
                        behavior: 'smooth',
                      });
                    }
                    setHasNewBelow(false);
                  }}
                  className="sticky bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-black hover:scale-105 z-10 cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span>New messages below</span>
                </button>
              )}
            </div>

            {/* Manual Reply Box */}
            <div className="border-t border-[#E6E1D7] bg-white p-3 sm:p-4 shrink-0">
              {sendError && (
                <div className="mb-3 flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Dispatch Error:</strong> {sendError}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSendError(null)}
                    className="text-rose-700 hover:text-rose-900 ml-2 cursor-pointer"
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
                      ? 'Type official WhatsApp reply (manual takeover active)...'
                      : 'Type manual reply (will automatically activate takeover)...'
                  }
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-40 cursor-pointer transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400">
                <span>
                  Official WhatsApp Cloud API · Connected to WABA <strong>392817462019384</strong>
                </span>
                <span className="hidden sm:inline">Messages captured & logged via n8n</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-xs text-stone-500">
            Select a WhatsApp conversation to inspect history and controls.
          </div>
        )}

        {/* PANEL 3: LEAD & CONTACT DRAWER */}
        {activeConversation && rightPanelOpen && (
          <div className="hidden lg:flex w-72 xl:w-80 flex-col border-l border-[#E6E1D7] bg-[#FAF8F5]/60 overflow-y-auto p-4 space-y-5 shrink-0">
            {/* Customer Details */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Customer Profile
                </h3>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="text-stone-400 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-200/50 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-2.5 shadow-2xs">
                <div className="font-bold text-sm text-stone-900">
                  {activeConversation.contact?.name || activeConversation.contact?.phone || 'WhatsApp Contact'}
                </div>
                <div className="text-xs text-stone-600 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  {activeConversation.contact?.phone ? (
                    <a
                      href={`https://wa.me/${activeConversation.contact.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-emerald-700 font-mono"
                    >
                      {activeConversation.contact.phone}
                    </a>
                  ) : (
                    <span>No phone registered</span>
                  )}
                </div>
                {activeConversation.contact?.company_name && (
                  <div className="text-xs text-stone-600">
                    Company: <strong className="text-stone-800">{activeConversation.contact.company_name}</strong>
                  </div>
                )}
                <div className="text-[11px] text-stone-400 border-t border-stone-100 pt-2 mt-2">
                  First contact: {activeConversation.contact?.created_at ? formatDateTime(activeConversation.contact.created_at) : 'Recent'}
                </div>
              </div>
            </div>

            {/* Linked Lead Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Linked Lead (Google Sheets)
                </h3>
              </div>

              {linkedLead ? (
                <div className="rounded-xl border border-stone-200/90 bg-white p-3.5 space-y-2 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-800">Status:</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      {linkedLead.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-stone-700">
                    Interest: <strong>{linkedLead.service_interest}</strong>
                  </div>
                  {linkedLead.estimated_value && (
                    <div className="text-stone-700">
                      Est. Value: <strong>{formatINR(linkedLead.estimated_value)}</strong>
                    </div>
                  )}
                  <div className="text-[11px] text-stone-400 font-mono border-t border-stone-100 pt-1.5">
                    Sheet Row ID: <span className="font-semibold text-stone-600">{linkedLead.google_sheet_row_id}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400 bg-white/40">
                  No linked lead for this contact.
                </div>
              )}
            </div>

            {/* Related Appointment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Linked Booking
                </h3>
              </div>

              {linkedAppointment ? (
                <div className="rounded-xl border border-stone-200/90 bg-white p-3.5 space-y-2 text-xs shadow-2xs">
                  <div className="font-semibold text-stone-900">
                    {linkedAppointment.service_requested}
                  </div>
                  <div className="flex items-center gap-2 text-stone-600">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    <span>
                      {linkedAppointment.appointment_date} at {linkedAppointment.appointment_time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      {linkedAppointment.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-stone-400">Google Calendar</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400 bg-white/40">
                  No appointment booked yet.
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
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
                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none transition shadow-2xs"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Notes</span>
              </button>
            </div>

            {/* Delete Contact & Reset Chat Session */}
            <div className="pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>Delete Contact & Reset Chat</span>
              </button>
              <p className="mt-1 text-[10px] text-stone-400 text-center">
                Next message from this number will be treated strictly as a new customer.
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Delete Contact Confirmation Modal */}
      {isDeleteModalOpen && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Delete Contact & Reset Chat</h3>
                <p className="text-xs text-stone-500">
                  {activeConversation.contact?.name || activeConversation.contact?.phone}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to delete this contact?
              <br /><br />
              • All messages and conversation records will be completely removed from the dashboard.
              <br />
              • In-memory session and customer state in n8n will be instantly cleared.
              <br />
              • When this customer messages your WhatsApp again, they will be treated strictly as a <strong>brand new customer</strong> (language prompt, collecting name/business/purpose, new customer alert).
            </p>

            {deleteError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingContact}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteActiveContact}
                disabled={isDeletingContact}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDeletingContact ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Delete & Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

