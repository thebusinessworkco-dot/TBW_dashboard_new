'use client';

import React, { useState } from 'react';
import {
  MessageCircle,
  Search,
  Edit2,
  X,
  Send,
  ShieldAlert,
  Film,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getConversationStatusBadge,
} from '@/lib/utils';
import { AdminCommentAutomation } from '@/lib/types/dashboard';

export default function InstagramPage() {
  const [activeTab, setActiveTab] = useState<'dms' | 'comment_dm'>('comment_dm');

  const {
    conversations,
    messages,
    commentAutomations,
    toggleReelAutomation,
    updateReelAutomation,
    updateConversationStatus,
    toggleManualTakeover,
    sendMessage,
  } = useDashboardStore();

  const igConversations = conversations.filter((c) => c.platform === 'instagram');

  // TAB A States
  const [selectedConvId, setSelectedConvId] = useState<string>(igConversations[0]?.id || '');
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [dmReplyText, setDmReplyText] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const [dmSendError, setDmSendError] = useState<string | null>(null);

  // TAB B States
  const [reelSearch, setReelSearch] = useState('');
  const [reelFilter, setReelFilter] = useState<'all' | 'enabled' | 'disabled' | 'failed'>('all');
  const [editingReel, setEditingReel] = useState<AdminCommentAutomation | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editMessage, setEditMessage] = useState('');

  // Filtered DMs with complete null-safety
  const filteredDms = igConversations.filter((c) => {
    const contactName = c.contact?.name || 'Instagram User';
    const igUsername = c.contact?.instagram_username || '';
    return (
      contactName.toLowerCase().includes(dmSearchQuery.toLowerCase()) ||
      igUsername.toLowerCase().includes(dmSearchQuery.toLowerCase())
    );
  });

  const activeDm = igConversations.find((c) => c.id === selectedConvId) || filteredDms[0];
  const activeDmMessages = activeDm ? messages[activeDm.id] || [] : [];

  // Filtered Reels
  const filteredReels = commentAutomations.filter((reel) => {
    const matchesSearch =
      reel.reel_caption.toLowerCase().includes(reelSearch.toLowerCase()) ||
      reel.trigger_keyword.toLowerCase().includes(reelSearch.toLowerCase()) ||
      reel.reel_media_id.includes(reelSearch);

    if (!matchesSearch) return false;
    if (reelFilter === 'enabled') return reel.is_enabled;
    if (reelFilter === 'disabled') return !reel.is_enabled;
    if (reelFilter === 'failed') return reel.last_status === 'failed';
    return true;
  });

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmReplyText.trim() || !activeDm || dmSending) return;

    setDmSendError(null);
    setDmSending(true);
    const result = await sendMessage(activeDm.id, dmReplyText.trim(), 'human_agent');
    if (!result?.success) {
      setDmSendError(result?.error || 'Failed to dispatch Instagram DM via Meta Graph API.');
    } else {
      setDmReplyText('');
    }
    setDmSending(false);
  };

  const handleOpenEditModal = (reel: AdminCommentAutomation) => {
    setEditingReel(reel);
    setEditKeyword(reel.trigger_keyword);
    setEditMessage(reel.automatic_dm_message);
  };

  const handleSaveReelEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReel) return;
    updateReelAutomation(editingReel.id, editKeyword.trim().toUpperCase(), editMessage.trim());
    setEditingReel(null);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FAF8F5]">
      <TopNavbar
        title="Instagram Control Center"
        subtitle="Manage official Instagram DMs and configure Reel Comment-to-DM automated triggers."
      />

      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between border-b border-[#E2DDD3] bg-white px-4 sm:px-6 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('comment_dm')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'comment_dm'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-[#555047] hover:bg-[#EFECE4]'
            }`}
          >
            <MessageCircle className="h-4 w-4 text-[#E1306C]" />
            <span>Tab B — Comment to DM Manager ({commentAutomations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dms')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'dms'
                ? 'bg-[#141413] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-[#555047] hover:bg-[#EFECE4]'
            }`}
          >
            <Instagram className="h-4 w-4 text-[#E1306C]" />
            <span>Tab A — Instagram DMs ({igConversations.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#7A756D]">
          <span>Connected Account:</span>
          <strong className="text-[#141413]">@thebusinesswork.co</strong>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'comment_dm' ? (
        /* TAB B: COMMENT TO DM MANAGER */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756D]" />
              <input
                type="text"
                placeholder="Search reels by caption, trigger keyword or media ID..."
                value={reelSearch}
                onChange={(e) => setReelSearch(e.target.value)}
                className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['all', 'enabled', 'disabled', 'failed'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setReelFilter(mode)}
                  className={`rounded-lg px-3 py-1.5 capitalize font-medium transition-colors ${
                    reelFilter === mode
                      ? 'bg-[#141413] text-white shadow-xs'
                      : 'border border-[#E2DDD3] bg-white text-[#555047] hover:bg-[#FAF8F5]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Reel Automations List / Cards */}
          <div className="space-y-4">
            {filteredReels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E2DDD3] bg-white p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF8F5] text-[#7A756D] mb-3">
                  <Film className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-[#141413]">No reel automations configured</h4>
                <p className="mt-1 text-xs text-[#7A756D] max-w-sm mx-auto">
                  {reelFilter === 'all'
                    ? 'Connect an Instagram Reel trigger above to auto-reply to comments and dispatch instant direct messages.'
                    : `No automations found with status "${reelFilter}".`}
                </p>
              </div>
            ) : (
              filteredReels.map((reel) => (
              <div
                key={reel.id}
                className="overflow-hidden rounded-xl border border-[#E2DDD3] bg-white shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="p-5 flex flex-col md:flex-row gap-5 items-start">
                  {/* Reel Thumbnail & Media Meta */}
                  <div className="flex gap-4 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={reel.reel_thumbnail}
                      alt="Instagram Reel"
                      className="h-28 w-20 rounded-lg object-cover border border-[#CDC7BA] shadow-2xs bg-stone-100"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-mono font-bold text-stone-700 border border-stone-200">
                          MEDIA: {reel.reel_media_id}
                        </span>
                        <span className="text-[11px] text-[#7A756D]">
                          {formatDate(reel.publish_date)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-[#141413]">
                        Trigger Keyword:
                      </div>
                      <span className="inline-block rounded-md bg-stone-900 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                        {reel.trigger_keyword}
                      </span>
                    </div>
                  </div>

                  {/* Caption & Automation Status */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A756D] mb-1">
                        Reel Caption
                      </h4>
                      <p className="text-xs text-[#141413] leading-relaxed line-clamp-2">
                        {reel.reel_caption}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#FAF8F5] border border-[#E2DDD3] p-3">
                      <div className="text-[11px] font-semibold text-[#555047] mb-1">
                        Automated Private DM Message:
                      </div>
                      <p className="text-xs text-[#141413] font-mono whitespace-pre-wrap">
                        {reel.automatic_dm_message}
                      </p>
                    </div>

                    {/* Meta Error Warning if any */}
                    {reel.last_status === 'failed' && (
                      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <strong className="block">Meta Private Reply Failure:</strong>
                          <span>{reel.last_error}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex flex-col justify-between items-end gap-4 shrink-0 w-full md:w-56 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-[#EFECE4] md:pl-5">
                    {/* Toggle Switch */}
                    <div className="flex items-center gap-3 w-full justify-between md:justify-end">
                      <span className="text-xs font-bold text-[#141413]">
                        {reel.is_enabled ? 'Active' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleReelAutomation(reel.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          reel.is_enabled ? 'bg-emerald-600' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            reel.is_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Metrics Stats */}
                    <div className="grid grid-cols-3 gap-2 w-full text-center text-xs">
                      <div className="rounded-md bg-[#FAF8F5] p-1.5 border border-[#E2DDD3]">
                        <span className="block text-[10px] text-[#7A756D]">Comments</span>
                        <strong className="text-[#141413]">{reel.matching_comments_count}</strong>
                      </div>
                      <div className="rounded-md bg-emerald-50 p-1.5 border border-emerald-200">
                        <span className="block text-[10px] text-emerald-800">Sent DMs</span>
                        <strong className="text-emerald-700">{reel.successful_replies_count}</strong>
                      </div>
                      <div className="rounded-md bg-rose-50 p-1.5 border border-rose-200">
                        <span className="block text-[10px] text-rose-800">Errors</span>
                        <strong className="text-rose-700">{reel.failed_replies_count}</strong>
                      </div>
                    </div>

                    {/* Edit Trigger Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(reel)}
                      className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#EFECE4]"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Automation Text</span>
                    </button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* TAB A: INSTAGRAM DMS */
        <div className="flex flex-1 overflow-hidden">
          {/* DM Conversation List */}
          <div className="flex w-full flex-col border-r border-[#E2DDD3] bg-white sm:w-80 md:w-96 shrink-0">
            <div className="border-b border-[#E2DDD3] p-3 bg-[#FAF8F5]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756D]" />
                <input
                  type="text"
                  placeholder="Search Instagram username..."
                  value={dmSearchQuery}
                  onChange={(e) => setDmSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-white py-1.5 pl-9 pr-3 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#EFECE4]">
              {filteredDms.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7A756D]">
                  No Instagram direct messages matching search.
                </div>
              ) : (
                filteredDms.map((conv) => {
                  const isSelected = activeDm?.id === conv.id;
                  const statusBadge = getConversationStatusBadge(conv.status);

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`cursor-pointer p-3.5 transition-colors ${
                        isSelected
                          ? 'bg-[#F2EFE9] border-l-4 border-l-[#E1306C]'
                          : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-[#141413]">
                          @{conv.contact.instagram_username}
                        </span>
                        <span className="text-[10px] text-[#7A756D]">
                          {formatRelativeTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#7A756D] mb-1">
                        {conv.contact.name} · {conv.contact.company_name}
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
                        ) : (
                          <span className="text-emerald-700">Bot Active</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* DM Active Conversation & Reply */}
          {activeDm ? (
            <div className="flex flex-1 flex-col bg-[#F7F5F0] overflow-hidden">
              <div className="flex h-16 items-center justify-between border-b border-[#E2DDD3] bg-white px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-[#E1306C] font-bold text-xs border border-rose-200">
                    IG
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#141413]">
                      @{activeDm.contact.instagram_username}
                    </h2>
                    <span className="text-xs text-[#7A756D]">
                      {activeDm.contact.name} ({activeDm.contact.company_name || 'Instagram User'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleManualTakeover(activeDm.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-2xs ${
                      activeDm.manual_takeover
                        ? 'bg-purple-700 text-white'
                        : 'border border-[#E2DDD3] bg-white text-[#555047] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    {activeDm.manual_takeover ? 'Takeover Active' : 'Manual Takeover'}
                  </button>

                  <button
                    onClick={() =>
                      updateConversationStatus(
                        activeDm.id,
                        activeDm.status === 'completed' ? 'open' : 'completed'
                      )
                    }
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border shadow-2xs ${
                      activeDm.status === 'completed'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-[#E2DDD3] bg-white text-[#555047] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    {activeDm.status === 'completed' ? 'Completed ✓' : 'Mark Completed'}
                  </button>
                </div>
              </div>

              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {activeDmMessages.map((msg) => {
                  const isCustomer = msg.sender_type === 'customer';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-lg rounded-2xl p-3.5 shadow-2xs text-xs sm:text-sm leading-relaxed ${
                          isCustomer
                            ? 'bg-white border border-[#E2DDD3] text-[#141413] rounded-tl-xs'
                            : 'bg-[#141413] text-white rounded-tr-xs'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px]">
                          {msg.sender_type === 'customer' ? (
                            <span className="font-semibold text-[#555047]">
                              @{activeDm.contact.instagram_username}
                            </span>
                          ) : msg.sender_type === 'automation_ai' ? (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-bold text-purple-300">
                              AI BOT
                            </span>
                          ) : msg.sender_type === 'automation_rule' ? (
                            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-bold text-sky-300">
                              COMMENT-TO-DM RULE
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-300">
                              HUMAN ADMIN
                            </span>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="mt-2 text-[10px] text-right opacity-70">
                          {formatDateTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="border-t border-[#E2DDD3] bg-white p-4">
                {dmSendError && (
                  <div className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{dmSendError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDmSendError(null)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendDm} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type official Instagram Graph API DM reply..."
                    value={dmReplyText}
                    onChange={(e) => setDmReplyText(e.target.value)}
                    className="flex-1 rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] px-4 py-2.5 text-xs sm:text-sm text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!dmReplyText.trim() || dmSending}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#141413] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2A2825] disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send DM</span>
                  </button>
                </form>
                <div className="mt-1.5 text-[11px] text-[#7A756D]">
                  Meta Graph API · Private replies strictly comply with Meta 7-day conversation eligibility window.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-xs text-[#7A756D]">
              Select an Instagram DM conversation to view history.
            </div>
          )}
        </div>
      )}

      {/* EDIT REEL AUTOMATION MODAL */}
      {editingReel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2DDD3] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#141413]">
                Configure Comment-to-DM Trigger
              </h3>
              <button
                onClick={() => setEditingReel(null)}
                className="text-[#7A756D] hover:text-[#141413]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReelEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-[#555047] mb-1">
                  Trigger Keyword (Uppercase)
                </label>
                <input
                  type="text"
                  required
                  value={editKeyword}
                  onChange={(e) => setEditKeyword(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 font-mono text-sm uppercase text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  placeholder="e.g. AUTOMATION, DEMO, CRM"
                />
                <p className="mt-1 text-[11px] text-[#7A756D]">
                  When a user leaves a comment matching this keyword, n8n will immediately dispatch the private DM.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#555047] mb-1">
                  Automated Private DM Response
                </label>
                <textarea
                  rows={4}
                  required
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  placeholder="Type the exact message to be delivered to the user's Instagram DM inbox..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingReel(null)}
                  className="rounded-lg border border-[#E2DDD3] px-4 py-2 text-xs font-semibold text-[#555047] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2825]"
                >
                  Save Trigger Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
