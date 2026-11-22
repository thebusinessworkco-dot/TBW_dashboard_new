'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageCircle,
  Search,
  Edit2,
  X,
  Send,
  ShieldAlert,
  Film,
  ArrowRight,
  User,
  Clock,
  Sparkles,
  Bot,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sliders,
  ExternalLink,
  Receipt,
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  Tag,
  Check,
  CheckCheck,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore, deduplicateAndSortMessages } from '@/lib/store/dashboard-store';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getConversationStatusBadge,
} from '@/lib/utils';
import { AdminCommentAutomation, AdminMessage, ConversationStatus } from '@/lib/types/dashboard';

export default function InstagramPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'inbox' | 'automation'>('inbox');

  const {
    conversations,
    messages,
    commentAutomations,
    toggleReelAutomation,
    updateReelAutomation,
    updateConversationStatus,
    toggleManualTakeover,
    toggleAutomationPaused,
    updateInternalNotes,
    sendMessage,
  } = useDashboardStore();

  const igConversations = useMemo(() => {
    return conversations.filter((c) => c.platform === 'instagram');
  }, [conversations]);

  // INBOX STATES
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'takeover' | 'bot' | 'completed'>('all');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Internal Notes State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesNotice, setNotesNotice] = useState<string | null>(null);

  // AUTOMATION STATES
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleStatusFilter, setRuleStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editingRule, setEditingRule] = useState<AdminCommentAutomation | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReplyMessage, setNewReplyMessage] = useState('');
  const [newReelId, setNewReelId] = useState('');

  // Overview Counts
  const totalDMs = igConversations.length;
  const unreadCount = igConversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const takeoverCount = igConversations.filter((c) => c.manual_takeover).length;
  const botActiveCount = igConversations.filter((c) => !c.manual_takeover && !c.automation_paused).length;
  const completedCount = igConversations.filter((c) => c.status === 'completed').length;
  const activeRulesCount = commentAutomations.filter((r) => r.is_enabled).length;

  // Filtered DMs
  const filteredDms = useMemo(() => {
    return igConversations.filter((c) => {
      const q = inboxSearchQuery.toLowerCase().trim();
      const contactName = (c.contact?.name || '').toLowerCase();
      const igUser = (c.contact?.instagram_username || '').toLowerCase();
      const sessionUser = (c.session_customer_name || '').toLowerCase();
      const lastMsg = (c.last_message || '').toLowerCase();

      const matchesSearch = !q || contactName.includes(q) || igUser.includes(q) || sessionUser.includes(q) || lastMsg.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'unread') return (c.unread_count || 0) > 0;
      if (statusFilter === 'takeover') return c.manual_takeover;
      if (statusFilter === 'bot') return !c.manual_takeover && !c.automation_paused;
      if (statusFilter === 'completed') return c.status === 'completed';
      return true;
    });
  }, [igConversations, inboxSearchQuery, statusFilter]);

  // Selected Active DM
  const activeDm = useMemo(() => {
    if (selectedConvId) {
      const found = igConversations.find((c) => c.id === selectedConvId);
      if (found) return found;
    }
    return filteredDms[0] || igConversations[0] || null;
  }, [igConversations, filteredDms, selectedConvId]);

  // Messages for Active DM
  const activeMessages = useMemo(() => {
    if (!activeDm) return [];
    return deduplicateAndSortMessages(messages[activeDm.id] || []);
  }, [activeDm, messages]);

  // Filtered Automation Rules
  const filteredRules = useMemo(() => {
    return commentAutomations.filter((r) => {
      const q = ruleSearch.toLowerCase().trim();
      const matchQ = !q || r.trigger_keyword.toLowerCase().includes(q) || r.automatic_dm_message.toLowerCase().includes(q) || r.reel_caption.toLowerCase().includes(q);
      if (!matchQ) return false;
      if (ruleStatusFilter === 'enabled') return r.is_enabled;
      if (ruleStatusFilter === 'disabled') return !r.is_enabled;
      return true;
    });
  }, [commentAutomations, ruleSearch, ruleStatusFilter]);

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeDm || isSending) return;

    setSendError(null);
    setIsSending(true);
    const result = await sendMessage(activeDm.id, replyText.trim(), 'human_agent');
    if (!result?.success) {
      setSendError(result?.error || 'Failed to dispatch Instagram DM via Meta Graph API.');
    } else {
      setReplyText('');
    }
    setIsSending(false);
  };

  const handleCannedReply = (text: string) => {
    setReplyText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleSaveNotes = () => {
    if (!activeDm) return;
    updateInternalNotes(activeDm.id, notesDraft.trim());
    setIsEditingNotes(false);
    setNotesNotice('Internal notes saved');
    setTimeout(() => setNotesNotice(null), 3000);
  };

  const handleSaveRuleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    updateReelAutomation(editingRule.id, editKeyword.trim().toUpperCase(), editMessage.trim());
    setEditingRule(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F4F2EC]">
      <TopNavbar
        title="Instagram Control Center"
        subtitle="Manage official Instagram Direct Messages and configure Reel Comment-to-DM automated triggers."
      />

      {/* TOP OVERVIEW & TAB HEADER */}
      <div className="border-b border-[#DDD9D0] bg-white px-4 sm:px-6 py-3 shrink-0 space-y-3">
        {/* Connection & KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Meta Graph API</span>
            </div>
            <div className="text-xs font-bold font-mono text-emerald-800 mt-0.5">Online (22ms)</div>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Account</span>
            <div className="text-xs font-bold font-mono text-[#202B35] mt-0.5 truncate">@thebusinesswork.co</div>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Total DMs</span>
            <div className="text-sm font-bold font-mono text-[#202B35] mt-0.5">{totalDMs}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Unread</span>
            <div className="text-sm font-bold font-mono text-rose-600 mt-0.5">{unreadCount}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Human Takeover</span>
            <div className="text-sm font-bold font-mono text-purple-700 mt-0.5">{takeoverCount}</div>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Active Rules</span>
            <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">{activeRulesCount}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-[#202B35] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              <Instagram className="h-4 w-4 text-[#E1306C]" />
              <span>Direct Messages Inbox ({totalDMs})</span>
            </button>

            <button
              onClick={() => setActiveTab('automation')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'automation'
                  ? 'bg-[#202B35] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              <MessageCircle className="h-4 w-4 text-[#E1306C]" />
              <span>Comment-to-DM Triggers ({commentAutomations.length})</span>
            </button>
          </div>

          <a
            href="/automations/instagram-reels"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#202B35] hover:underline"
          >
            <Film className="h-3.5 w-3.5 text-[#E1306C]" />
            <span>Open V4 Reels Studio</span>
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* TAB A: INSTAGRAM INBOX */}
      {activeTab === 'inbox' && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Panel 1: Conversation List */}
          <div className="w-80 sm:w-96 border-r border-[#DDD9D0] bg-white flex flex-col shrink-0">
            {/* Search & Filter Header */}
            <div className="p-3 border-b border-stone-200/80 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by IG handle or customer name..."
                  value={inboxSearchQuery}
                  onChange={(e) => setInboxSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#202B35] focus:outline-none"
                />
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer transition-colors ${
                    statusFilter === 'all' ? 'bg-[#202B35] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('unread')}
                  className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer transition-colors ${
                    statusFilter === 'unread' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setStatusFilter('takeover')}
                  className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer transition-colors ${
                    statusFilter === 'takeover' ? 'bg-purple-700 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Takeover ({takeoverCount})
                </button>
                <button
                  onClick={() => setStatusFilter('bot')}
                  className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer transition-colors ${
                    statusFilter === 'bot' ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Bot ({botActiveCount})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2 py-0.5 rounded-lg font-medium cursor-pointer transition-colors ${
                    statusFilter === 'completed' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
              {filteredDms.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  <Instagram className="h-6 w-6 mx-auto text-stone-300 mb-2" />
                  <p className="font-medium text-stone-600">No Instagram conversations</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Matching current filters</p>
                </div>
              ) : (
                filteredDms.map((conv) => {
                  const isSelected = activeDm?.id === conv.id;
                  const statusBadge = getConversationStatusBadge(conv.status);
                  const igUsername = conv.contact?.instagram_username || conv.session_customer_name || 'user';

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`p-3.5 transition-all cursor-pointer border-l-4 ${
                        isSelected
                          ? 'bg-stone-50 border-l-[#E1306C] shadow-2xs'
                          : 'border-l-transparent hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-xs text-stone-900 truncate">
                            @{igUsername}
                          </span>
                          {conv.unread_count > 0 && (
                            <span className="h-4 min-w-[16px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-stone-400 shrink-0">
                          {formatRelativeTime(conv.last_message_at)}
                        </span>
                      </div>

                      <div className="text-[11px] text-stone-500 mb-1 truncate">
                        {conv.contact?.name || 'Customer'}
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-1 mb-2">
                        {conv.last_message || <span className="italic text-stone-400">No message snippet</span>}
                      </p>

                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                        >
                          {statusBadge.label}
                        </span>

                        {conv.manual_takeover ? (
                          <span className="rounded-full bg-purple-50 px-2 py-0.5 font-bold text-purple-700 border border-purple-200">
                            Takeover
                          </span>
                        ) : conv.automation_paused ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700 border border-amber-200">
                            Paused
                          </span>
                        ) : (
                          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Bot Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel 2: Main DM Chat Area */}
          {activeDm ? (
            <div className="flex-1 flex flex-col bg-[#F4F2EC] min-w-0 overflow-hidden">
              {/* Chat Header */}
              <div className="h-14 border-b border-[#DDD9D0] bg-white px-4 sm:px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E1306C] to-[#C13584] text-white font-bold text-xs shadow-xs">
                    IG
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-bold text-stone-900">
                        @{activeDm.contact?.instagram_username || activeDm.session_customer_name || 'instagram_user'}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                        {activeDm.contact?.name || 'Lead'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Session Ref: {activeDm.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleManualTakeover(activeDm.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                      activeDm.manual_takeover
                        ? 'bg-purple-700 text-white hover:bg-purple-800'
                        : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {activeDm.manual_takeover ? 'Takeover Active' : 'Human Takeover'}
                  </button>

                  <button
                    onClick={() =>
                      updateConversationStatus(
                        activeDm.id,
                        activeDm.status === 'completed' ? 'open' : 'completed'
                      )
                    }
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold border shadow-2xs transition-all cursor-pointer ${
                      activeDm.status === 'completed'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {activeDm.status === 'completed' ? 'Completed ✓' : 'Mark Done'}
                  </button>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
                {activeMessages.length === 0 ? (
                  <div className="py-20 text-center text-xs text-stone-400">
                    <MessageCircle className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                    <p className="font-semibold text-stone-600">No message history recorded yet</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Messages dispatched via Instagram Direct will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg: AdminMessage) => {
                    const isCustomer = msg.sender_type === 'customer';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-md sm:max-w-lg rounded-2xl p-3.5 shadow-2xs text-xs sm:text-sm leading-relaxed ${
                            isCustomer
                              ? 'bg-white border border-[#DDD9D0] text-stone-900 rounded-tl-xs'
                              : 'bg-[#202B35] text-white rounded-tr-xs'
                          }`}
                        >
                          <div className="whitespace-pre-line">{msg.content}</div>

                          <div
                            className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
                              isCustomer ? 'text-stone-400' : 'text-stone-300'
                            }`}
                          >
                            <span>{formatRelativeTime(msg.created_at)}</span>
                            {!isCustomer && (
                              <span className="inline-flex items-center">
                                {msg.status === 'read' ? (
                                  <CheckCheck className="h-3 w-3 text-sky-400" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="h-3 w-3 text-stone-300" />
                                ) : msg.status === 'sent' ? (
                                  <Check className="h-3 w-3 text-stone-300" />
                                ) : (
                                  <Clock className="h-3 w-3 text-stone-400" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Composer */}
              <div className="border-t border-[#DDD9D0] bg-white p-3 space-y-2">
                {sendError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between">
                    <span>{sendError}</span>
                    <button onClick={() => setSendError(null)} className="p-0.5 text-rose-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Fast Canned Replies */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className="text-stone-400 font-medium shrink-0">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleCannedReply('Hello! How can we assist your business today?')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Greeting 👋
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCannedReply('You can view our complete service catalogue and pricing on thebusinesswork.com')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Services & Pricing 💼
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCannedReply('Would you like to schedule a 30-minute discovery consultation call with our solutions architect?')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Book Call 📅
                  </button>
                </div>

                <form onSubmit={handleSendDm} className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendDm(e);
                      }
                    }}
                    placeholder={`Reply to @${activeDm.contact?.instagram_username || 'user'} via official Meta Graph API... (Press Enter to send)`}
                    className="flex-1 rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none resize-none"
                  />

                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={!replyText.trim() || isSending}
                    isLoading={isSending}
                    leftIcon={<Send className="h-3.5 w-3.5" />}
                  >
                    Send DM
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-stone-400">
              Select an Instagram conversation to start messaging.
            </div>
          )}

          {/* Panel 3: Customer Information Sidebar */}
          {activeDm && (
            <div className="w-80 border-l border-[#DDD9D0] bg-white flex flex-col shrink-0 overflow-y-auto p-4 space-y-5">
              {notesNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{notesNotice}</span>
                </div>
              )}

              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-center space-y-2">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-[#E1306C] to-[#C13584] text-white font-bold text-lg shadow-xs">
                  IG
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    @{activeDm.contact?.instagram_username || 'user'}
                  </h3>
                  <div className="text-xs text-stone-600 font-medium">
                    {activeDm.contact?.name || 'Customer'}
                  </div>
                  {activeDm.contact?.company_name && (
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {activeDm.contact.company_name}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-center gap-2">
                  <span className="text-[10px] font-semibold text-stone-600 px-2 py-0.5 rounded-full bg-stone-200/60">
                    Instagram Direct
                  </span>
                  <a
                    href={`https://instagram.com/${activeDm.contact?.instagram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:underline"
                  >
                    <span>Profile</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Session Controls */}
              <div className="space-y-3">
                <h4 className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
                  Session Controls
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                    <span className="font-medium text-stone-700">Automation State:</span>
                    <button
                      onClick={() => toggleAutomationPaused(activeDm.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        activeDm.automation_paused
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {activeDm.automation_paused ? 'Paused' : 'Active'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                    <span className="font-medium text-stone-700">Takeover State:</span>
                    <button
                      onClick={() => toggleManualTakeover(activeDm.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        activeDm.manual_takeover
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {activeDm.manual_takeover ? 'Human Control' : 'AI Agent'}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                    <span className="font-medium text-stone-700 block">Conversation Status:</span>
                    <select
                      value={activeDm.status}
                      onChange={(e) => updateConversationStatus(activeDm.id, e.target.value as ConversationStatus)}
                      className="w-full rounded-lg border border-stone-200 bg-white p-1.5 text-xs text-stone-800 focus:outline-none"
                    >
                      <option value="open">Open (Active)</option>
                      <option value="waiting_for_customer">Waiting for Customer</option>
                      <option value="needs_attention">Needs Attention</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Operator Internal Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
                    Internal Operator Notes
                  </h4>
                  {!isEditingNotes && (
                    <button
                      onClick={() => {
                        setNotesDraft(activeDm.internal_notes || '');
                        setIsEditingNotes(true);
                      }}
                      className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Add customer requirements or handover instructions..."
                      className="w-full rounded-xl border border-stone-300 p-2 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="xs" onClick={() => setIsEditingNotes(false)}>
                        Cancel
                      </Button>
                      <Button variant="default" size="xs" onClick={handleSaveNotes}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 leading-relaxed min-h-[60px] whitespace-pre-line">
                    {activeDm.internal_notes || (
                      <span className="text-stone-400 italic">No internal notes saved yet.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-2 pt-2 border-t border-stone-200/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(
                      `/quotations?new=true&leadName=${encodeURIComponent(
                        activeDm.contact?.name || activeDm.contact?.instagram_username || ''
                      )}`
                    )
                  }
                  leftIcon={<Receipt className="h-3.5 w-3.5 text-stone-600" />}
                >
                  Create Quotation
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push('/contacts')}
                  leftIcon={<UserCheck className="h-3.5 w-3.5 text-stone-600" />}
                >
                  Open Customer Profile
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: COMMENT-TO-DM AUTOMATION RULES */}
      {activeTab === 'automation' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Header & Controls */}
          <div className="rounded-2xl border border-[#DDD9D0] bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Comment-to-DM Trigger Engine
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Automates personalized direct messages when users comment on your published Instagram Reels.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/automations/instagram-reels"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
                >
                  <Film className="h-3.5 w-3.5 text-[#E1306C]" />
                  <span>Reels Media Manager</span>
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search triggers by keyword or message template..."
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-8 pr-3 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500 font-medium">Status:</span>
                <select
                  value={ruleStatusFilter}
                  onChange={(e) => setRuleStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                  className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-1.5 text-xs font-medium text-stone-800 focus:outline-none"
                >
                  <option value="all">All Rules ({commentAutomations.length})</option>
                  <option value="enabled">Active Only</option>
                  <option value="disabled">Paused Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-2xl border border-[#DDD9D0] bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-stone-900 text-white font-mono text-xs font-bold shadow-2xs">
                        {rule.trigger_keyword}
                      </span>
                      {rule.require_follow && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                          Follower Only
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleReelAutomation(rule.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                        rule.is_enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {rule.is_enabled ? 'Active' : 'Paused'}
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Reel Attachment
                    </span>
                    <div className="text-xs font-semibold text-stone-800 line-clamp-1 mt-0.5">
                      {rule.reel_caption || 'Universal Trigger (All Published Reels)'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Automated DM Message
                    </span>
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-700 leading-relaxed mt-1 line-clamp-4 whitespace-pre-line">
                      {rule.automatic_dm_message}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-400 font-mono">
                    ID: {rule.reel_media_id.slice(0, 10)}...
                  </span>

                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setEditKeyword(rule.trigger_keyword);
                      setEditMessage(rule.automatic_dm_message);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#202B35] hover:underline cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit Template</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT AUTOMATION RULE MODAL */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Edit Comment-to-DM Trigger
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Update trigger keyword and automatic direct message response
                </p>
              </div>
              <button
                onClick={() => setEditingRule(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                  Trigger Keyword (e.g. WORKFLOW, PRICE, DEMO)
                </label>
                <input
                  type="text"
                  required
                  value={editKeyword}
                  onChange={(e) => setEditKeyword(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 font-mono uppercase focus:border-[#202B35] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                  Automated DM Response Template
                </label>
                <textarea
                  rows={5}
                  required
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRule(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="default" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
