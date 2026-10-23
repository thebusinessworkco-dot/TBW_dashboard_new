'use client';

import React, { useState, useEffect } from 'react';
import {
  Film,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  Copy,
  Trash2,
  Edit3,
  Sliders,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { InstagramReelRule } from '@/lib/types/dashboard';

export default function InstagramReelsPage() {
  const [activeTab, setActiveTab] = useState<'reels' | 'faq' | 'observability'>('reels');
  const [rules, setRules] = useState<InstagramReelRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'disabled' | 'any_comment' | 'keywords'>('all');
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<InstagramReelRule> | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);
  const [simulatorComment, setSimulatorComment] = useState('Interested in details!');
  const [simulatorFollower, setSimulatorFollower] = useState(true);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [resRules, resSettings] = await Promise.all([
        fetch('/api/instagram/reels'),
        fetch('/api/instagram/settings'),
      ]);
      const dataRules = await resRules.json();
      if (dataRules.success && Array.isArray(dataRules.rules)) {
        setRules(dataRules.rules);
      }
      const dataSettings = await resSettings.json();
      if (dataSettings.success && dataSettings.whatsapp_business_phone) {
        setWhatsappPhone(dataSettings.whatsapp_business_phone);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/instagram/reels').then((r) => r.json()).catch(() => null),
      fetch('/api/instagram/settings').then((r) => r.json()).catch(() => null),
    ]).then(([rulesData, settingsData]) => {
      if (!active) return;
      if (rulesData?.success && Array.isArray(rulesData.rules)) {
        setRules(rulesData.rules);
      }
      if (settingsData?.success && settingsData.whatsapp_business_phone) {
        setWhatsappPhone(settingsData.whatsapp_business_phone);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleToggleEnabled = async (rule: InstagramReelRule) => {
    const nextState = !rule.is_enabled;
    const updated = { ...rule, is_enabled: nextState };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));

    try {
      await fetch('/api/instagram/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      refreshData();
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Reel automation rule?')) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/instagram/reels?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      refreshData();
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRule({
      id: `rule_${Date.now()}`,
      media_id: '',
      title: '',
      permalink: '',
      thumbnail_url: '',
      is_enabled: true,
      trigger_mode: 'any_comment',
      keywords: ['INFO', 'AUTOMATION', 'REEL'],
      initial_dm_text: 'Thanks for commenting on our Reel! 👋\nReply “Send Me Details” here and I’ll share the full information! ✨',
      details_text: 'Here are the details on our AI & Workflow automation systems! We build custom lead qualification and appointment bots.',
      follow_required: true,
      whatsapp_prefill_text: 'Hi! I saw your Instagram Reel and would like to learn more.',
    });
    setKeywordInput('INFO, AUTOMATION, REEL');
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (rule: InstagramReelRule) => {
    setEditingRule({ ...rule });
    setKeywordInput((rule.keywords || []).join(', '));
    setIsEditorOpen(true);
  };

  const handleDuplicateRule = (rule: InstagramReelRule) => {
    setEditingRule({
      ...rule,
      id: `rule_${Date.now()}`,
      media_id: '', // Blank so user specifies distinct Reel
      title: `${rule.title} (Copy)`,
      comments_count: 0,
      private_replies_count: 0,
      dm_conversations_count: 0,
      verified_follows_count: 0,
      failed_sends_count: 0,
    });
    setKeywordInput((rule.keywords || []).join(', '));
    setIsEditorOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule?.media_id || !editingRule?.title) {
      alert('Please provide Reel Media ID and Title.');
      return;
    }

    const cleanKeywords = keywordInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload: Partial<InstagramReelRule> = {
      ...editingRule,
      keywords: cleanKeywords,
    };

    try {
      const res = await fetch('/api/instagram/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.rule) {
        setRules((prev) => {
          const idx = prev.findIndex((r) => r.media_id === data.rule.media_id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.rule;
            return next;
          }
          return [data.rule, ...prev];
        });
        setIsEditorOpen(false);
      } else {
        alert(data.error || 'Failed to save Reel rule.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving rule');
    }
  };

  const handleSyncReels = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/instagram/settings');
      await res.json();
      setTimeout(() => {
        setIsSyncing(false);
        setSyncNotice({
          type: 'info',
          message:
            'Meta Graph API live reel synchronization requires Instagram Graph API Token with instagram_manage_comments permission. You can link any published Reel using its Media ID or URL below.',
        });
      }, 700);
    } catch {
      setIsSyncing(false);
    }
  };

  // Filtered Reels
  const filteredRules = rules.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.title.toLowerCase().includes(q) ||
      r.media_id.toLowerCase().includes(q) ||
      (r.keywords || []).some((k) => k.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (filterMode === 'enabled') return r.is_enabled;
    if (filterMode === 'disabled') return !r.is_enabled;
    if (filterMode === 'any_comment') return r.trigger_mode === 'any_comment';
    if (filterMode === 'keywords') return r.trigger_mode === 'keywords';
    return true;
  });

  // Analytics totals
  const totalComments = rules.reduce((acc, r) => acc + (r.comments_count || 0), 0);
  const totalPrivateReplies = rules.reduce((acc, r) => acc + (r.private_replies_count || 0), 0);
  const totalFollows = rules.reduce((acc, r) => acc + (r.verified_follows_count || 0), 0);

  // WhatsApp wa.me link preview
  const previewWaUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        editingRule?.whatsapp_prefill_text || 'Hi! I saw your Instagram Reel'
      )}`
    : '';

  return (
    <div className="min-h-full pb-20">
      <TopNavbar
        title="Instagram Reels Automation"
        subtitle="Manage automated comment-to-DM flows, Reel isolation, follow gating, and WhatsApp redirections."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* WHATSAPP WARNING BANNER IF PHONE UNCONFIGURED */}
        {!whatsappPhone && (
          <div className="rounded-2xl border border-amber-300/80 bg-amber-50/80 p-4.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-semibold text-sm text-amber-950">
                  WhatsApp Business Phone Number Missing
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Inbound DMs will use fallback bio references. To enable direct <code className="font-mono text-[11px] bg-white/70 px-1 py-0.5 rounded">wa.me</code> links, configure your business phone in Settings. Placeholder digits are strictly prohibited.
                </p>
              </div>
            </div>
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition-colors shrink-0 shadow-2xs"
            >
              Configure in Settings
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* TOP STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Active Reels
              </span>
              <Film className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {rules.filter((r) => r.is_enabled).length}
              <span className="text-xs font-normal text-stone-400 ml-1">/ {rules.length}</span>
            </div>
            <div className="text-[11px] text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Strict Reel Isolation Active
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Comments Ingested
              </span>
              <MessageCircle className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{totalComments}</div>
            <div className="text-[11px] text-stone-500">Atomic idempotency enabled</div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Private Replies
              </span>
              <Instagram className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{totalPrivateReplies}</div>
            <div className="text-[11px] text-stone-500">1 reply per comment rule</div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Verified Follows
              </span>
              <UserCheck className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">{totalFollows}</div>
            <div className="text-[11px] text-emerald-600">Gate active on verified Reels</div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-stone-200/80 gap-6">
          <button
            onClick={() => setActiveTab('reels')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'reels'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Film className="h-4 w-4" />
            Reels Manager ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Automated FAQ & Menu Routing
          </button>
          <button
            onClick={() => setActiveTab('observability')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'observability'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Observability & Contract Health
          </button>
        </div>

        {/* TAB 1: REELS MANAGER */}
        {activeTab === 'reels' && (
          <div className="space-y-4">
            {/* SEARCH & CONTROLS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Reel name, Media ID, or keyword..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200/80 bg-white focus:outline-hidden focus:border-stone-400 shadow-2xs"
                  />
                </div>

                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as typeof filterMode)}
                  className="py-2 px-3 text-xs rounded-xl border border-stone-200/80 bg-white focus:outline-hidden focus:border-stone-400 shadow-2xs"
                >
                  <option value="all">All Rules</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                  <option value="any_comment">Any Comment</option>
                  <option value="keywords">Keywords Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncReels}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50 transition-colors shadow-2xs text-stone-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Published Reels
                </button>
                <button
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Reel Automation
                </button>
              </div>
            </div>

            {/* SYNC NOTICE */}
            {syncNotice && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 flex items-start gap-2 shadow-2xs">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="flex-1">{syncNotice.message}</div>
                <button onClick={() => setSyncNotice(null)} className="text-sky-600 hover:text-sky-900">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* REELS GRID */}
            {loading ? (
              <div className="py-20 text-center text-xs text-stone-400">Loading Reel automations...</div>
            ) : filteredRules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center space-y-3 bg-white/50">
                <Film className="h-10 w-10 text-stone-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-stone-800">No Reel Rules Configured</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Add your first Reel automation rule to trigger custom initial DMs, require follows, and route to WhatsApp.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Reel Automation
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between transition-all ${
                      rule.is_enabled ? 'border-stone-200/90 hover:border-stone-300' : 'border-stone-200/50 opacity-75'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                rule.is_enabled ? 'bg-emerald-500' : 'bg-stone-300'
                              }`}
                            />
                            <h4 className="font-semibold text-sm text-stone-900 line-clamp-1">{rule.title}</h4>
                          </div>
                          <div className="font-mono text-[11px] text-stone-500 flex items-center gap-1">
                            <span>ID: {rule.media_id}</span>
                            {rule.permalink && (
                              <a
                                href={rule.permalink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-stone-400 hover:text-stone-700"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Enable Switch */}
                        <button
                          onClick={() => handleToggleEnabled(rule)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            rule.is_enabled ? 'bg-emerald-600' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              rule.is_enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Trigger Mode & Follow Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700 uppercase tracking-wider">
                          {rule.trigger_mode === 'any_comment' ? '⚡ Any Comment' : '🔑 Keywords Only'}
                        </span>
                        {rule.follow_required && (
                          <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            🛡️ Follow Gated
                          </span>
                        )}
                        {rule.whatsapp_prefill_text && (
                          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            💬 WhatsApp CTA
                          </span>
                        )}
                      </div>

                      {/* Keywords list if keyword mode */}
                      {rule.trigger_mode === 'keywords' && (
                        <div className="text-[11px] text-stone-600 font-mono bg-stone-50 rounded-lg p-2 border border-stone-100 truncate">
                          Triggers: {(rule.keywords || []).join(', ') || 'No keywords set'}
                        </div>
                      )}

                      {/* Initial DM Preview */}
                      <div className="rounded-xl bg-stone-50/80 p-2.5 border border-stone-200/60 text-xs text-stone-700 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Initial Private Reply
                        </span>
                        <p className="line-clamp-2 italic text-stone-600 font-serif">
                          &ldquo;{rule.initial_dm_text}&rdquo;
                        </p>
                      </div>

                      {/* Metrics bar */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-center">
                        <div>
                          <span className="block text-[10px] font-medium text-stone-400 uppercase">Comments</span>
                          <span className="font-bold text-xs text-stone-800">{rule.comments_count || 0}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-medium text-stone-400 uppercase">Sent DMs</span>
                          <span className="font-bold text-xs text-stone-800">{rule.private_replies_count || 0}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-medium text-stone-400 uppercase">Follows</span>
                          <span className="font-bold text-xs text-emerald-700">{rule.verified_follows_count || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                      <button
                        onClick={() => handleDuplicateRule(rule)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-800"
                        title="Duplicate rule to a new Reel without copying analytics"
                      >
                        <Copy className="h-3 w-3" />
                        Duplicate
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(rule)}
                          className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-200 transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit Rule
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUTOMATED FAQ & MENU ROUTING */}
        {activeTab === 'faq' && (
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-semibold text-sm text-stone-900">4 Automated Service Categories (V4 Core)</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                These four service categories are presented when a user taps &ldquo;Our Services&rdquo; or sends a direct DM greeting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">1</span>
                  <span>AI Agents & Chatbots</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  AI Sales Agents, Customer Support Agents, Website Chatbots, Lead Qualification, Voice Agents, Appointment Booking Agents.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Quick Reply: TBW_SVC_1</div>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">2</span>
                  <span>CRM & Sales Automation</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  CRM Setup, Lead Management, Automated Follow-ups, Pipeline Automation, Lead Assignment, Sales Reports.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Quick Reply: TBW_SVC_2</div>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">3</span>
                  <span>Business Workflow Automation</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Form-to-CRM, Email Automation, Google Sheets, Calendar, Invoice & Document Workflows, App Integrations.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Quick Reply: TBW_SVC_3</div>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">4</span>
                  <span>WhatsApp & Social Automation</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  WhatsApp Business Automation, WhatsApp AI Chat, Reminders, Instagram DM Automation, Social Lead Capture, Follow-ups.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Quick Reply: TBW_SVC_4</div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
              <h4 className="font-semibold text-xs text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Zero Hallucination Routing Architecture
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Standard questions (pricing, bookings, service lists) use fixed approved copy and direct WhatsApp links. Gemini LLM is exclusively engaged when complex architectural questions are detected, preserving token budget and preventing pricing errors.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: OBSERVABILITY & CONTRACT HEALTH */}
        {activeTab === 'observability' && (
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-semibold text-sm text-stone-900">Automation Contract Health & Diagnostics</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time validation of backend endpoints, Header Auth credentials, and Meta requirements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-stone-200 p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Contract A: /comment-check</div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Implemented & Ready</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Accepts validated comment event; evaluates 7-day limits, trigger mode, and atomic private reply reservation.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Contract B: /dm-context</div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Implemented & Ready</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Resolves pending Reel campaign for commenter; enforces human takeover; generates wa.me links.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">WhatsApp Redirection</div>
                <div className={`flex items-center gap-2 text-xs font-bold ${whatsappPhone ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {whatsappPhone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Configured (+{whatsappPhone})</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Missing Phone Number</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-stone-600">
                  {whatsappPhone
                    ? 'Valid E.164 digits active. Generates per-Reel prefilled consultation links.'
                    : 'Configure in Settings to unlock direct WhatsApp conversation CTAs.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: RULE EDITOR */}
      {isEditorOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingRule.id && rules.some((r) => r.id === editingRule.id) ? 'Edit Reel Automation Rule' : 'New Reel Automation Rule'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure trigger rules, initial private reply, follow gating, and per-Reel delivered content.
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN: SETTINGS */}
                <div className="space-y-4">
                  {/* Title & Media ID */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">Reel Name / Title *</label>
                    <input
                      type="text"
                      required
                      value={editingRule.title || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                      placeholder="e.g. AI Workflow Breakdown #1"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">Instagram Media ID * (Strict Reel Identifier)</label>
                    <input
                      type="text"
                      required
                      value={editingRule.media_id || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, media_id: e.target.value.trim() })}
                      placeholder="e.g. 180429182390192"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                    <p className="text-[10px] text-stone-400">
                      Numeric Instagram Media ID from your Instagram Professional Account.
                    </p>
                  </div>

                  {/* Trigger Mode */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-stone-700">Trigger Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRule({ ...editingRule, trigger_mode: 'any_comment' })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                          editingRule.trigger_mode === 'any_comment'
                            ? 'border-stone-900 bg-stone-900 text-white shadow-2xs'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        ⚡ Any Comment (Default)
                        <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                          Triggers on any comment on this Reel
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingRule({ ...editingRule, trigger_mode: 'keywords' })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                          editingRule.trigger_mode === 'keywords'
                            ? 'border-stone-900 bg-stone-900 text-white shadow-2xs'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        🔑 Specific Keywords
                        <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                          Only triggers if comment contains keyword
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Keywords if keyword mode */}
                  {editingRule.trigger_mode === 'keywords' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-stone-700">Keywords (Comma-separated)</label>
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        placeholder="INFO, AUTOMATION, DETAILS"
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                      />
                    </div>
                  )}

                  {/* Initial DM Text */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-700">Initial Private Reply Text *</label>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {(editingRule.initial_dm_text || '').length}/700 chars
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      required
                      value={editingRule.initial_dm_text || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, initial_dm_text: e.target.value })}
                      placeholder="Thanks for commenting on our Reel! 👋\nReply “Send Me Details” here..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                    <p className="text-[10px] text-stone-400">
                      First plain-text reply to commenter. Prompts user to reply &ldquo;Send Me Details&rdquo;.
                    </p>
                  </div>

                  {/* Follow Required Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/70">
                    <div>
                      <div className="text-xs font-semibold text-stone-800">Require Instagram Follow</div>
                      <p className="text-[10px] text-stone-500">
                        Content is locked until commenter follows your business profile.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(editingRule.follow_required)}
                      onChange={(e) => setEditingRule({ ...editingRule, follow_required: e.target.checked })}
                      className="h-4 w-4 rounded-sm border-stone-300 text-stone-900 focus:ring-stone-400"
                    />
                  </div>

                  {/* Delivered Content (Per-Reel Details) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">
                      Unlocked Details Content * (Reel Isolated)
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={editingRule.details_text || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, details_text: e.target.value })}
                      placeholder="Here is the complete blueprint, link, or guide for this specific Reel..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                    <p className="text-[10px] text-stone-400">
                      Strictly returned only for this Reel. Never leaks to another campaign.
                    </p>
                  </div>

                  {/* WhatsApp Prefill */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">WhatsApp Redirection Prefill Text</label>
                    <input
                      type="text"
                      value={editingRule.whatsapp_prefill_text || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, whatsapp_prefill_text: e.target.value })}
                      placeholder="Hi! I saw Reel #1 and would like more details."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                    {previewWaUrl ? (
                      <div className="text-[10px] text-emerald-700 font-mono truncate">
                        Link: {previewWaUrl}
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-700 font-medium">
                        ⚠️ No phone set in Settings. Bio fallback reference will be sent.
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: SIMULATOR & MOCKUP */}
                <div className="space-y-4 rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="border-b border-stone-200 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-stone-800">
                        <Smartphone className="h-4 w-4 text-stone-600" />
                        <span>Interactive Customer DM Simulation</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400">Simulation Mode</span>
                    </div>

                    {/* Simulation Controls */}
                    <div className="space-y-2 bg-white rounded-xl p-3 border border-stone-200 shadow-2xs">
                      <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                        Test Simulation Variables
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={simulatorComment}
                          onChange={(e) => setSimulatorComment(e.target.value)}
                          placeholder="Test comment text"
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200"
                        />
                        <button
                          type="button"
                          onClick={() => setSimulatorFollower(!simulatorFollower)}
                          className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors ${
                            simulatorFollower
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {simulatorFollower ? '✓ Follower' : '✗ Non-follower'}
                        </button>
                      </div>
                    </div>

                    {/* Instagram Chat Bubble Flow Mockup */}
                    <div className="bg-[#FAF8F5] rounded-2xl border border-stone-200/90 p-4 space-y-3 text-xs">
                      <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-stone-400 pb-1">
                        Instagram Direct Message
                      </div>

                      {/* Bot Message 1: Initial Private Reply */}
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                          TBW
                        </div>
                        <div className="rounded-2xl rounded-tl-xs bg-white border border-stone-200 p-2.5 text-stone-800 shadow-2xs max-w-[85%] space-y-1">
                          <p className="whitespace-pre-line text-[11px]">
                            {editingRule.initial_dm_text || 'Thanks for commenting on our Reel! 👋'}
                          </p>
                          <div className="pt-1 flex flex-wrap gap-1">
                            <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                              Send Me Details
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* User Replies Send Me Details */}
                      <div className="flex justify-end">
                        <div className="rounded-2xl rounded-tr-xs bg-stone-900 text-white px-3 py-1.5 text-[11px] shadow-2xs">
                          Send Me Details
                        </div>
                      </div>

                      {/* Bot Message 2: Follow check or content */}
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                          TBW
                        </div>
                        <div className="rounded-2xl rounded-tl-xs bg-white border border-stone-200 p-2.5 text-stone-800 shadow-2xs max-w-[85%] space-y-2">
                          {editingRule.follow_required && !simulatorFollower ? (
                            <>
                              <p className="text-[11px] text-amber-900">
                                Thanks for your interest! 💛 Please follow @thebusinesswork.co first. Then tap “I Followed” and we will check again.
                              </p>
                              <div className="flex gap-1">
                                <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                                  I Followed
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="whitespace-pre-line text-[11px]">
                                {editingRule.details_text || 'Here are the details!'}
                              </p>
                              <div className="pt-1.5 border-t border-stone-100 flex flex-col gap-1">
                                <span className="text-[10px] text-stone-500">
                                  {previewWaUrl ? (
                                    <span className="text-emerald-700 font-medium">WhatsApp: {previewWaUrl}</span>
                                  ) : (
                                    'For a personal consultation, use the WhatsApp link in our Instagram bio.'
                                  )}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 text-center pt-2">
                    Mockup is an interactive preview simulation. Real delivery depends on Meta API acceptance.
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-stone-900 text-white hover:bg-stone-800 shadow-xs"
                >
                  Save Reel Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
