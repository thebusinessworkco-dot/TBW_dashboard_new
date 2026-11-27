'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
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
  CornerDownRight,
  List as ListIcon,
  ExternalLink,
  ArrowDown,
  ArrowLeft,
  Layers,
  X,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Trash2,
  Edit3,
  Copy,
  Zap,
  CheckCircle2,
  ChevronDown,
  MoreVertical,
  Paperclip,
  Share2,
  Camera,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { QuickRepliesManager } from '@/components/whatsapp/quick-replies-manager';
import { CustomerInfoSidebar } from '@/components/whatsapp/customer-info-sidebar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { getWhatsAppInboxDisplayName } from '@/lib/whatsapp/session-identity';
import {
  formatDateTime,
  formatRelativeTime,
  getConversationStatusBadge,
} from '@/lib/utils';
import {
  ConversationStatus,
  AdminMessage,
  MessageStatus,
  MessageMetadata,
  WhatsAppListSection,
} from '@/lib/types/dashboard';

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === 'read') {
    return (
      <span className="inline-flex items-center gap-1 text-sky-400 font-semibold" title="Read by customer">
        <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
        <span className="capitalize text-[10px]">Read</span>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-1 text-[#DDD9D0] font-medium" title="Delivered to customer device">
        <CheckCheck className="h-3.5 w-3.5 text-[#DDD9D0]" />
        <span className="capitalize text-[10px]">Delivered</span>
      </span>
    );
  }
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-[#7D8F82] font-medium" title="Sent via WhatsApp Cloud API">
        <Check className="h-3.5 w-3.5 text-[#7D8F82]" />
        <span className="capitalize text-[10px]">Sent</span>
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 font-semibold" title="Delivery failed">
        <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
        <span className="capitalize text-[10px]">Failed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[#7D8F82] font-medium" title="Queued">
      <Clock className="h-3.5 w-3.5 text-[#7D8F82]" />
      <span className="capitalize text-[10px]">Queued</span>
    </span>
  );
}

function RenderWhatsAppMessageBody({ msg }: { msg: AdminMessage }) {
  const isCustomer = msg.sender_type === 'customer';
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
  const appointment = meta.appointment;

  const extractedButtons: Array<{ id: string; title: string }> = (() => {
    const actionButtons = interactive?.action?.buttons;
    if (Array.isArray(actionButtons) && actionButtons.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return actionButtons.map((b: any, idx: number) => ({
        id: b.reply?.id || b.id || `btn_${idx}`,
        title: b.reply?.title || b.title || b.text || `Option ${idx + 1}`,
      }));
    }
    if (Array.isArray(interactive?.buttons) && interactive.buttons.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return interactive.buttons.map((b: any, idx: number) => ({
        id: b.id || b.reply?.id || `btn_${idx}`,
        title: b.title || b.reply?.title || b.text || `Option ${idx + 1}`,
      }));
    }
    return [];
  })();

  const extractedSections: WhatsAppListSection[] = (() => {
    const actionSections = interactive?.action?.sections;
    if (Array.isArray(actionSections) && actionSections.length > 0) return actionSections;
    if (Array.isArray(interactive?.sections) && interactive.sections.length > 0) return interactive.sections;
    return [];
  })();

  const selectedButton = interactive?.selected_button || interactive?.button_reply || null;
  const selectedListRow = interactive?.selected_list_item || interactive?.list_reply || null;

  const bodyText = msg.content || interactive?.body?.text || '';

  const isImageMessage =
    msg.media_type === 'image' ||
    Boolean(msg.media_url) ||
    bodyText === '📷' ||
    bodyText.startsWith('[Photo]') ||
    bodyText === '[Image received]';

  const hasMediaUrl = Boolean(
    msg.media_url &&
    (msg.media_url.startsWith('http://') ||
     msg.media_url.startsWith('https://') ||
     msg.media_url.startsWith('/') ||
     msg.media_url.startsWith('data:image'))
  );

  const cleanBodyText =
    bodyText === '📷' ||
    bodyText === '[Photo]' ||
    bodyText === '[Image received]'
      ? ''
      : bodyText;

  return (
    <div className="space-y-2.5">
      {location && (
        <a
          href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 rounded-xl bg-[#ECE9E1] hover:bg-[#DDD9D0] text-[#202B35] text-xs transition border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#FCFBF8]"
        >
          <div className="font-semibold truncate">📍 {location.name || 'View Location'}</div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </a>
      )}

      {isImageMessage && (
        <div className="space-y-1.5">
          {hasMediaUrl ? (
            <div className="relative group/media overflow-hidden rounded-xl border border-black/10 dark:border-white/10 max-w-sm bg-black/5 dark:bg-white/5">
              <img
                src={msg.media_url}
                alt={cleanBodyText || 'WhatsApp Photo'}
                className="w-full max-h-80 object-cover rounded-xl transition duration-200 hover:opacity-95 cursor-pointer"
                onClick={() => window.open(msg.media_url, '_blank')}
                loading="lazy"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/media:opacity-100 transition-opacity bg-black/70 backdrop-blur-xs text-white px-2 py-1 rounded-lg text-[10px] font-medium pointer-events-none">
                <ExternalLink className="h-3 w-3" />
                <span>View Full</span>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-start gap-2.5 p-3 rounded-xl border ${
                isCustomer
                  ? 'bg-[#F4F2EC] border-[#DDD9D0] text-[#202B35] dark:bg-[#151C24] dark:border-[#232D3B] dark:text-[#FCFBF8]'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Camera className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs">Photo Attachment</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono opacity-70">
                    WhatsApp Image
                  </span>
                </div>
                <p className="text-[11px] opacity-75 mt-0.5">
                  Media file received from customer
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {cleanBodyText && (
        <div className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm">
          {cleanBodyText}
        </div>
      )}

      {extractedButtons.length > 0 && (
        <div className="pt-2 flex flex-col gap-1.5">
          {extractedButtons.map((btn) => (
            <div
              key={btn.id}
              className={`rounded-xl px-3 py-2 text-xs font-semibold text-center border transition select-none ${
                isCustomer
                  ? 'border-purple-200 bg-purple-50 text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'border-[#7D8F82]/40 bg-[#7D8F82]/15 text-[#202B35] shadow-2xs dark:border-[#7D8F82]/30 dark:bg-[#7D8F82]/20 dark:text-[#FCFBF8]'
              }`}
            >
              <span>{btn.title}</span>
            </div>
          ))}
        </div>
      )}

      {selectedButton && (
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300">
          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
          <span>Selected: <strong>{selectedButton.title}</strong></span>
        </div>
      )}

      {extractedSections.length > 0 && (
        <div className="pt-1.5 space-y-2">
          {interactive?.action?.button && (
            <p className="text-[11px] font-bold opacity-90">{interactive.action.button}</p>
          )}
          {extractedSections.map((sec, idx) => (
            <div key={idx} className="rounded-xl border border-white/20 bg-white/5 p-2.5 text-xs">
              {sec.title && <p className="font-bold text-[11px] uppercase tracking-wide mb-1.5 opacity-80">{sec.title}</p>}
              <div className="space-y-1.5">
                {sec.rows?.map((row) => (
                  <div key={row.id} className="rounded-lg bg-white/10 px-2.5 py-1.5">
                    <p className="font-semibold">{row.title}</p>
                    {row.description && <p className="text-[10px] opacity-80 mt-0.5">{row.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedListRow && (
        <div className="flex items-start gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300">
          <ListIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold">{selectedListRow.title}</p>
            {selectedListRow.description && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal mt-0.5">{selectedListRow.description}</p>
            )}
          </div>
        </div>
      )}

      {appointment && (
        <div className="pt-1 space-y-2">
          {Array.isArray(appointment.available_dates) && appointment.available_dates.length > 0 && (
            <div className="p-3 rounded-xl border border-[#7D8F82]/30 bg-[#7D8F82]/10 text-xs text-[#202B35] dark:text-[#FCFBF8]">
              <div className="flex items-center gap-1.5 font-bold mb-2">
                <Calendar className="h-4 w-4 text-[#7D8F82]" />
                <span>Available Consultation Dates</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {appointment.available_dates.map((dateStr, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#DDD9D0] text-[#202B35] dark:bg-[#151C24] dark:border-[#232D3B] dark:text-[#FCFBF8]"
                  >
                    📅 {String(dateStr)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(appointment.available_slots) && appointment.available_slots.length > 0 && (
            <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 text-xs">
              <div className="flex items-center gap-1.5 font-bold mb-2">
                <Clock className="h-4 w-4 text-sky-500" />
                <span>Available Time Slots</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {appointment.available_slots.map((slotStr, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-white border border-sky-200 text-sky-900 dark:bg-[#151C24] dark:border-sky-800 dark:text-sky-200"
                  >
                    ⏰ {String(slotStr)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WhatsAppInboxContent() {
  const searchParams = useSearchParams();
  const urlConvId = searchParams.get('id');

  const {
    conversations,
    messages,
    leads,
    appointments,
    fetchConversationMessages,
    sendMessage,
    toggleManualTakeover,
    toggleAutomationPaused,
    updateConversationStatus,
    syncAllMessages,
    refreshData,
    realtimeStatus,
  } = useDashboardStore();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'latest' | 'oldest' | 'unread'>('latest');

  // Chat window state
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [isSyncingCurrent, setIsSyncingCurrent] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState(true);

  // Auto-sync polling toggle
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // WhatsApp-only conversations
  const waConversations = useMemo(() => {
    return conversations.filter((c) => c.platform === 'whatsapp');
  }, [conversations]);

  // Handle URL pre-selection or first conversation
  useEffect(() => {
    if (urlConvId && waConversations.some((c) => c.id === urlConvId)) {
      setActiveConvId(urlConvId);
    } else if (!activeConvId && waConversations.length > 0) {
      setActiveConvId(waConversations[0].id);
    }
  }, [urlConvId, waConversations, activeConvId]);

  // Load active conversation messages
  useEffect(() => {
    if (activeConvId) {
      fetchConversationMessages(activeConvId);
    }
  }, [activeConvId, fetchConversationMessages]);

  // Auto-sync timer (3 seconds)
  useEffect(() => {
    if (!autoSyncEnabled) return;
    const interval = setInterval(() => {
      refreshData();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoSyncEnabled, refreshData]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return waConversations.find((c) => c.id === activeConvId) || null;
  }, [waConversations, activeConvId]);

  // Active messages list
  const activeMessages = useMemo(() => {
    if (!activeConvId) return [];
    return messages[activeConvId] || [];
  }, [messages, activeConvId]);

  // Filtered messages inside chat
  const filteredChatMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return activeMessages;
    return activeMessages.filter((m) =>
      (m.content || '').toLowerCase().includes(chatSearchQuery.toLowerCase())
    );
  }, [activeMessages, chatSearchQuery]);

  // Filtered & Sorted Conversation List
  const filteredConversations = useMemo(() => {
    const result = waConversations.filter((c) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (c.contact?.name || '').toLowerCase().includes(q) ||
        (c.contact?.phone || '').toLowerCase().includes(q) ||
        (c.last_message || '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      switch (filterMode) {
        case 'open':
          return c.status === 'open';
        case 'completed':
          return c.status === 'completed';
        case 'waiting':
          return c.status === 'waiting_for_customer';
        case 'takeover':
          return c.manual_takeover;
        case 'bot':
          return !c.manual_takeover && !c.automation_paused;
        case 'unread':
          return (c.unread_count || 0) > 0;
        case 'today': {
          const today = new Date().toISOString().slice(0, 10);
          return (c.last_message_at || c.created_at || '').slice(0, 10) === today;
        }
        default:
          return true;
      }
    });

    result.sort((a, b) => {
      if (sortMode === 'unread') {
        const diff = (b.unread_count || 0) - (a.unread_count || 0);
        if (diff !== 0) return diff;
      }
      const timeA = new Date(a.last_message_at || a.created_at || 0).getTime();
      const timeB = new Date(b.last_message_at || b.created_at || 0).getTime();
      return sortMode === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [waConversations, searchTerm, filterMode, sortMode]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages.length]);

  // Send message handler
  const handleSend = async () => {
    if (!replyText.trim() || !activeConvId || isSending) return;
    setIsSending(true);
    const content = replyText.trim();
    setReplyText('');

    try {
      const res = await sendMessage(activeConvId, content, 'human_agent');
      if (res.success) {
        showToast('Message dispatched via Meta Cloud API ✓');
        scrollToBottom();
      } else {
        alert(res.error || 'Failed to dispatch message');
        setReplyText(content);
      }
    } catch (err) {
      console.error('Send error:', err);
      alert('Error sending message');
      setReplyText(content);
    } finally {
      setIsSending(false);
    }
  };

  // Sync single chat handler
  const handleSyncThisChat = async () => {
    if (!activeConvId) return;
    setIsSyncingCurrent(true);
    try {
      await fetchConversationMessages(activeConvId);
      showToast('Chat synchronized ✓');
    } finally {
      setIsSyncingCurrent(false);
    }
  };

  // Sync all chats master handler
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const res = await syncAllMessages();
      showToast(`Synced ${res.count} messages across all chats ✓`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Linked entities
  const linkedLead = useMemo(() => {
    if (!activeConversation) return undefined;
    return leads.find(
      (l) =>
        l.contact_id === activeConversation.contact_id ||
        (l.contact_phone && l.contact_phone === activeConversation.contact?.phone)
    );
  }, [activeConversation, leads]);

  const linkedAppointment = useMemo(() => {
    if (!activeConversation) return undefined;
    return appointments.find(
      (a) =>
        a.contact_info === activeConversation.contact?.phone ||
        a.customer_name === activeConversation.contact?.name
    );
  }, [activeConversation, appointments]);

  return (
    <div className="flex flex-col h-full h-[100dvh] overflow-hidden bg-[#F4F2EC] dark:bg-[#0D1217]">
      {/* Top Navbar */}
      <TopNavbar
        title="WhatsApp Live Command Desk"
        subtitle="Meta WhatsApp Cloud API v21.0 Direct Production Dispatcher"
        breadcrumbs={[
          { label: 'Communication', href: '/whatsapp' },
          { label: 'WhatsApp Inbox' },
        ]}
      />

      {/* Action Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-[#7D8F82] bg-[#202B35] px-4 py-2.5 text-xs font-semibold text-[#FCFBF8] shadow-2xl animate-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#7D8F82]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN 4-PANEL WORKSPACE CANVAS */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* PANEL A & B: CONVERSATION LIST (Collapsible / Mobile responsive) */}
        <div
          className={`w-full md:w-84 lg:w-96 flex flex-col border-r border-[#DDD9D0] bg-[#FCFBF8] shrink-0 dark:border-[#232D3B] dark:bg-[#141A22] ${
            activeConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Panel Header & Controls */}
          <div className="p-3.5 border-b border-[#DDD9D0] space-y-3 dark:border-[#232D3B] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#202B35] dark:text-[#FCFBF8]">
                  WhatsApp Chats
                </span>
                <Badge variant="sage" size="sm">
                  {waConversations.length}
                </Badge>
              </div>

              {/* Auto Sync & Master Sync Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  title={autoSyncEnabled ? 'Auto-sync active (3s)' : 'Auto-sync paused'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    autoSyncEnabled
                      ? 'border-[#7D8F82]/40 bg-[#7D8F82]/15 text-[#4A5D4F] dark:text-[#A8BBAE]'
                      : 'border-[#DDD9D0] bg-[#ECE9E1] text-[#566573] dark:border-[#232D3B] dark:bg-[#1E2734]'
                  }`}
                >
                  {autoSyncEnabled ? '● 3s Live' : '○ Paused'}
                </button>

                <Button
                  variant="secondary"
                  size="xs"
                  onClick={handleSyncAll}
                  isLoading={isSyncingAll}
                  title="Master Sync All Conversations"
                  iconOnly
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Search Input */}
            <SearchInput
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Search by name, phone, message..."
              size="sm"
            />

            {/* Filters Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'open', label: 'Open' },
                { id: 'waiting', label: 'Waiting' },
                { id: 'takeover', label: 'Takeover' },
                { id: 'bot', label: 'AI Active' },
                { id: 'completed', label: 'Resolved' },
                { id: 'today', label: 'Today' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition cursor-pointer select-none ${
                    filterMode === f.id
                      ? 'bg-[#202B35] text-[#FCFBF8] dark:bg-[#FCFBF8] dark:text-[#202B35]'
                      : 'bg-[#ECE9E1] text-[#566573] hover:text-[#202B35] dark:bg-[#1E2734] dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#DDD9D0]/50 dark:divide-[#232D3B]/50">
            {filteredConversations.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#566573] dark:text-[#94A4B4] px-4">
                No WhatsApp conversations found matching &ldquo;{searchTerm || filterMode}&rdquo;.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                const statusBadge = getConversationStatusBadge(conv.status);

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`p-3.5 transition-all cursor-pointer relative select-none ${
                      isSelected
                        ? 'bg-[#ECE9E1] border-l-4 border-[#202B35] dark:bg-[#1B232D] dark:border-[#7D8F82]'
                        : 'hover:bg-[#F4F2EC]/60 dark:hover:bg-[#18202A]'
                    }`}
                  >
                    {(() => {
                      const nameInfo = getWhatsAppInboxDisplayName(conv);
                      return (
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#202B35] text-[#FCFBF8] font-bold text-xs font-mono shrink-0 dark:bg-[#FCFBF8] dark:text-[#202B35]">
                              {(nameInfo.primaryName || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-xs text-[#202B35] truncate block dark:text-[#FCFBF8]">
                                  {nameInfo.primaryName}
                                </span>
                                {nameInfo.secondaryName && (
                                  <span
                                    className="text-[10px] text-[#7D8F82] truncate font-medium dark:text-[#94A4B4]"
                                    title={`Admin Contact: ${nameInfo.secondaryName}`}
                                  >
                                    ({nameInfo.secondaryName})
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-[#566573] dark:text-[#94A4B4]">
                                {conv.contact?.phone || ''}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-[#566573] shrink-0 dark:text-[#94A4B4]">
                            {conv.last_message_at ? formatRelativeTime(conv.last_message_at) : 'Active'}
                          </span>
                        </div>
                      );
                    })()}

                    <p className="text-xs text-[#566573] line-clamp-1 pl-10 dark:text-[#94A4B4]">
                      {conv.last_message || 'Awaiting interaction'}
                    </p>

                    <div className="mt-2 flex items-center justify-between pl-10">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant={conv.manual_takeover ? 'warning' : 'sage'}
                          size="sm"
                          showDot
                        >
                          {conv.manual_takeover ? 'Human' : 'AI'}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          {statusBadge.label}
                        </Badge>
                      </div>

                      {conv.unread_count > 0 && (
                        <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#202B35] text-[#FCFBF8] text-[10px] font-bold flex items-center justify-center font-mono dark:bg-[#FCFBF8] dark:text-[#202B35]">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL C: MAIN CHAT WINDOW */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col min-w-0 h-full bg-[#FCFBF8] dark:bg-[#11161D]">
            {/* C1: Conversation Action Toolbar */}
            <div className="p-3 sm:px-5 border-b border-[#DDD9D0] bg-white flex items-center justify-between gap-3 dark:border-[#232D3B] dark:bg-[#151C24] shrink-0">
              {/* Left Info: Back on Mobile & Customer Details */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConvId(null)}
                  className="p-1.5 rounded-lg text-[#202B35] hover:bg-[#ECE9E1] md:hidden cursor-pointer dark:text-[#FCFBF8] dark:hover:bg-[#1E2734]"
                  aria-label="Back to chat list"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {(() => {
                  const headerNameInfo = getWhatsAppInboxDisplayName(activeConversation);
                  return (
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#202B35] truncate dark:text-[#FCFBF8]">
                          {headerNameInfo.primaryName}
                        </span>
                        {headerNameInfo.secondaryName && (
                          <Badge variant="sage" size="sm">
                            Contact: {headerNameInfo.secondaryName}
                          </Badge>
                        )}
                        <Badge variant={activeConversation.manual_takeover ? 'warning' : 'sage'} size="sm">
                          {activeConversation.manual_takeover ? 'Human Agent Mode' : 'Autopilot AI Mode'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#566573] font-mono dark:text-[#94A4B4]">
                        <span>{activeConversation.contact?.phone}</span>
                        <span>·</span>
                        <span className="capitalize">{activeConversation.status}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Search in chat toggle */}
                <Button
                  variant="secondary"
                  size="xs"
                  iconOnly
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  title="Search in messages"
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>

                {/* Sync This Chat */}
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={handleSyncThisChat}
                  isLoading={isSyncingCurrent}
                  leftIcon={<RefreshCw className="h-3 w-3" />}
                  className="hidden sm:inline-flex"
                >
                  Sync Chat
                </Button>

                {/* Take Over / Resume Bot */}
                <Button
                  variant={activeConversation.manual_takeover ? 'secondary' : 'primary'}
                  size="xs"
                  onClick={() => {
                    const willTakeover = !activeConversation.manual_takeover;
                    toggleManualTakeover(activeConversation.id, willTakeover);
                    showToast(
                      willTakeover
                        ? 'Human takeover activated. AI bot paused.'
                        : 'AI Bot resumed ✓'
                    );
                  }}
                  leftIcon={activeConversation.manual_takeover ? <Bot className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                >
                  {activeConversation.manual_takeover ? 'Resume AI' : 'Take Over'}
                </Button>

                {/* Mark Complete / Reopen */}
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    const nextStatus: ConversationStatus =
                      activeConversation.status === 'completed' ? 'open' : 'completed';
                    updateConversationStatus(activeConversation.id, nextStatus);
                    showToast(`Marked as ${nextStatus} ✓`);
                  }}
                  className="hidden md:inline-flex"
                >
                  {activeConversation.status === 'completed' ? 'Reopen' : 'Complete'}
                </Button>

                {/* Customer Info Sidebar Toggle */}
                <Button
                  variant={isCustomerInfoOpen ? 'primary' : 'secondary'}
                  size="xs"
                  iconOnly
                  onClick={() => setIsCustomerInfoOpen(!isCustomerInfoOpen)}
                  title="Toggle Customer Info Panel"
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* In-Chat Search Bar Drawer (if open) */}
            {showChatSearch && (
              <div className="p-2 border-b border-[#DDD9D0] bg-[#ECE9E1]/60 flex items-center gap-2 dark:border-[#232D3B] dark:bg-[#151C24]">
                <SearchInput
                  value={chatSearchQuery}
                  onValueChange={setChatSearchQuery}
                  placeholder="Filter messages in this transcript..."
                  size="sm"
                />
                <Button
                  variant="secondary"
                  size="xs"
                  iconOnly
                  onClick={() => {
                    setChatSearchQuery('');
                    setShowChatSearch(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* C2: Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F4F2EC]/40 dark:bg-[#0D1217]">
              {filteredChatMessages.length === 0 ? (
                <div className="py-20 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
                  No messages recorded in this conversation thread.
                </div>
              ) : (
                filteredChatMessages.map((msg) => {
                  const isCustomer = msg.sender_type === 'customer';
                  const isAgent = msg.sender_type === 'human_agent';
                  const isAI = msg.sender_type === 'automation_ai';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col group ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      {/* Sender identification pill */}
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#566573] dark:text-[#94A4B4]">
                        <span className="font-semibold">
                          {isCustomer
                            ? activeConversation.contact?.name || 'Customer'
                            : isAgent
                            ? 'Human Agent (TBW)'
                            : 'AI Assistant (Autopilot)'}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-[10px]">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Message Bubble Canvas */}
                      <div
                        className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-2xs ${
                          isCustomer
                            ? 'bg-white text-[#202B35] border border-[#DDD9D0] rounded-tl-xs dark:bg-[#18202A] dark:border-[#263342] dark:text-[#FCFBF8]'
                            : isAgent
                            ? 'bg-[#202B35] text-[#FCFBF8] rounded-tr-xs border border-[#202B35] dark:bg-[#1E2734] dark:border-[#2D3A4B]'
                            : 'bg-[#7D8F82] text-white rounded-tr-xs border border-[#7D8F82] shadow-xs'
                        }`}
                      >
                        <RenderWhatsAppMessageBody msg={msg} />

                        {/* Status ticks and quick copy button */}
                        <div
                          className={`mt-2 flex items-center justify-between gap-3 text-[10px] pt-1.5 border-t ${
                            isCustomer
                              ? 'border-black/5 text-[#566573] dark:border-white/10 dark:text-[#94A4B4]'
                              : 'border-white/15 text-white/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content || '');
                              showToast('Message copied ✓');
                            }}
                            className="hover:underline flex items-center gap-1 opacity-70 group-hover:opacity-100 transition"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>

                          {!isCustomer && <MessageStatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* C3: Message Composer */}
            <div className="p-3 sm:p-4 border-t border-[#DDD9D0] bg-white dark:border-[#232D3B] dark:bg-[#151C24] shrink-0 space-y-2">
              {/* Quick Actions Bar above composer */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setIsQuickRepliesOpen(true)}
                    leftIcon={<Zap className="h-3 w-3 text-[#7D8F82]" />}
                  >
                    Quick Replies
                  </Button>
                </div>

                <span className="text-[11px] text-[#566573] dark:text-[#94A4B4]">
                  Press <kbd className="font-mono bg-[#ECE9E1] px-1 rounded dark:bg-[#1E2734]">Enter</kbd> to dispatch
                </span>
              </div>

              {/* Textarea & Send Button */}
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type an official WhatsApp reply (direct Meta API dispatch)..."
                  className="flex-1 rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] p-2.5 text-xs sm:text-sm text-[#202B35] placeholder:text-[#566573]/60 focus:border-[#202B35] focus:outline-none focus:ring-2 focus:ring-[#202B35]/15 transition resize-none dark:border-[#232D3B] dark:bg-[#11161D] dark:text-[#FCFBF8] dark:placeholder:text-[#566573]"
                />

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSend}
                  isLoading={isSending}
                  disabled={!replyText.trim() || isSending}
                  iconOnly
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
            <MessageSquare className="h-10 w-10 text-[#7D8F82] mb-3" />
            <span className="font-bold text-sm text-[#202B35] dark:text-[#FCFBF8]">
              Select a conversation
            </span>
            <p className="mt-1 max-w-sm">
              Choose a customer from the left list to inspect live transcripts and send direct Meta replies.
            </p>
          </div>
        )}

        {/* PANEL D: CUSTOMER INFORMATION SIDEBAR (Collapsible desktop, drawer on mobile) */}
        {activeConversation && isCustomerInfoOpen && (
          <div className="hidden lg:block shrink-0">
            <CustomerInfoSidebar
              conversation={activeConversation}
              linkedLead={linkedLead}
              linkedAppointment={linkedAppointment}
              allConversations={conversations}
              onClose={() => setIsCustomerInfoOpen(false)}
            />
          </div>
        )}
      </div>

      {/* QUICK REPLIES MODAL */}
      <QuickRepliesManager
        isOpen={isQuickRepliesOpen}
        onClose={() => setIsQuickRepliesOpen(false)}
        onInsert={(templateText) => {
          setReplyText(templateText);
          textareaRef.current?.focus();
        }}
      />

    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#566573]">Loading WhatsApp Desk...</div>}>
      <WhatsAppInboxContent />
    </Suspense>
  );
}
