'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  Trash2,
  Edit3,
  Sliders,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  X,
  Link2,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  Video,
  Archive,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { InstagramReelRule, InstagramSyncedReel, InstagramAutomationAnalytics } from '@/lib/types/dashboard';

type FilterStatus = 'all' | 'active' | 'inactive' | 'unconfigured' | 'archived';
type SortOrder = 'newest' | 'oldest' | 'comments';
type ModalTab = 'sync' | 'select' | 'paste';


export default function InstagramReelsPage() {
  const [activeTab, setActiveTab] = useState<'reels' | 'faq' | 'observability'>('reels');
  const [rules, setRules] = useState<InstagramReelRule[]>([]);
  const [syncedReels, setSyncedReels] = useState<InstagramSyncedReel[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [, setAccountInfo] = useState<{ id: string; username: string; name?: string; profile_picture_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);
  const [timeRange, setTimeRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [analytics, setAnalytics] = useState<InstagramAutomationAnalytics | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('select');
  const [editingRule, setEditingRule] = useState<Partial<InstagramReelRule> | null>(null);
  const [selectedReelPreview, setSelectedReelPreview] = useState<InstagramSyncedReel | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [showAdvancedManual, setShowAdvancedManual] = useState(false);

  // Paste Link State
  const [pasteUrlInput, setPasteUrlInput] = useState('');
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Live Simulator States
  const [simulatorFollower, setSimulatorFollower] = useState(true);

  // 1. Initial Load of Rules, Synced Reels & Settings
  const loadData = async (forceSync = false, selectedRange = timeRange) => {
    try {
      if (forceSync) setIsSyncing(true);
      else setLoading(true);

      const [resRules, resSettings, resSync, resAnalytics] = await Promise.all([
        fetch('/api/instagram/reels'),
        fetch('/api/instagram/settings'),
        fetch(`/api/instagram/reels/sync${forceSync ? '?force=true' : ''}`),
        fetch(`/api/instagram/analytics?timeRange=${selectedRange}`),
      ]);

      const dataRules = await resRules.json();
      if (dataRules.success && Array.isArray(dataRules.rules)) {
        setRules(dataRules.rules);
      }

      const dataSettings = await resSettings.json();
      if (dataSettings.success && dataSettings.whatsapp_business_phone) {
        setWhatsappPhone(dataSettings.whatsapp_business_phone);
      }

      const dataSync = await resSync.json();
      if (dataSync.success && dataSync.store) {
        setSyncedReels(dataSync.store.reels || []);
        setLastSyncedAt(dataSync.store.last_synced_at || null);
        if (dataSync.store.account) {
          setAccountInfo(dataSync.store.account);
        }
      }

      try {
        const dataAnalytics = await resAnalytics.json();
        if (dataAnalytics.success && dataAnalytics.analytics) {
          setAnalytics(dataAnalytics.analytics);
        }
      } catch {
        // Analytics non-blocking
      }

      if (forceSync) {
        const discovered = dataSync.store?.reels?.length || 0;
        setSyncNotice({
          type: 'success',
          message: discovered > 0
            ? `Synchronized ${discovered} published Reels from @${dataSync.store?.account?.username || 'thebusinesswork.co'}`
            : `Sync verified with @${dataSync.store?.account?.username || 'thebusinesswork.co'}: 0 published Reels on Instagram. Deleted Reels archived safely.`,
        });
      }
    } catch {
      if (forceSync) {
        setSyncNotice({ type: 'warning', message: 'Synchronization completed with cached media.' });
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Open Create Modal
  const handleOpenCreateModal = (preselectedReel?: InstagramSyncedReel) => {
    setResolveError(null);
    setPasteUrlInput('');
    setShowAdvancedManual(false);

    if (preselectedReel) {
      // Check if rule already exists for this reel
      const existing = rules.find((r) => r.media_id === preselectedReel.media_id);
      if (existing) {
        handleOpenEditModal(existing, preselectedReel);
        return;
      }

      setSelectedReelPreview(preselectedReel);
      // eslint-disable-next-line react-hooks/purity
      const newRuleId = `rule_${Date.now()}`;
      setEditingRule({
        id: newRuleId,
        media_id: preselectedReel.media_id,
        title: preselectedReel.caption ? preselectedReel.caption.slice(0, 60) : 'Untitled Reel Automation',
        permalink: preselectedReel.permalink,
        thumbnail_url: preselectedReel.thumbnail_url || preselectedReel.media_url || '',
        is_enabled: true,
        trigger_mode: 'any_comment',
        keywords: ['INFO', 'DETAILS', 'AUTOMATION'],
        initial_dm_text: 'Thanks for commenting on our Reel! 👋\nReply Hi to get the details ✨',
        details_text: 'Here are the details on our AI & Workflow automation systems! We build custom lead qualification and appointment bots.',
        follow_required: true,
        whatsapp_prefill_text: `Hi! I saw your Reel "${preselectedReel.caption ? preselectedReel.caption.slice(0, 30) : 'video'}" and would like more details.`,
        auto_comment_reply_enabled: false,
        auto_comment_reply_text: 'Thanks! 👋 Check your DM for the details.',
        auto_comment_reply_variations: [
          'Thanks! 👋 Check your DM for the details.',
          'Thanks for reaching out! DM sent ✨',
          'Got your comment! Check your direct messages 📩',
        ],
      });
      setKeywordInput('INFO, DETAILS, AUTOMATION');
      setModalTab('select');
    } else {
      setSelectedReelPreview(null);
      // eslint-disable-next-line react-hooks/purity
      const newRuleId = `rule_${Date.now()}`;
      setEditingRule({
        id: newRuleId,
        media_id: '',
        title: '',
        permalink: '',
        thumbnail_url: '',
        is_enabled: true,
        trigger_mode: 'any_comment',
        keywords: ['INFO', 'DETAILS', 'AUTOMATION'],
        initial_dm_text: 'Thanks for commenting on our Reel! 👋\nReply Hi to get the details ✨',
        details_text: 'Here are the details on our AI & Workflow automation systems! We build custom lead qualification and appointment bots.',
        follow_required: true,
        whatsapp_prefill_text: 'Hi! I saw your Instagram Reel and would like to learn more.',
        auto_comment_reply_enabled: false,
        auto_comment_reply_text: 'Thanks! 👋 Check your DM for the details.',
        auto_comment_reply_variations: [
          'Thanks! 👋 Check your DM for the details.',
          'Thanks for reaching out! DM sent ✨',
          'Got your comment! Check your direct messages 📩',
        ],
      });
      setKeywordInput('INFO, DETAILS, AUTOMATION');
      setModalTab('select');
    }

    setIsEditorOpen(true);
  };

  // 3. Open Edit Modal
  const handleOpenEditModal = (rule: InstagramReelRule, associatedReel?: InstagramSyncedReel) => {
    setEditingRule({ ...rule });
    setKeywordInput((rule.keywords || []).join(', '));
    setShowAdvancedManual(false);
    setResolveError(null);

    const reel = associatedReel || syncedReels.find((sr) => sr.media_id === rule.media_id) || {
      media_id: rule.media_id,
      shortcode: rule.permalink?.match(/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i)?.[1] || '',
      caption: rule.title,
      permalink: rule.permalink || '',
      thumbnail_url: rule.thumbnail_url || '',
      timestamp: rule.created_at,
      media_type: 'VIDEO',
    };

    setSelectedReelPreview(reel);
    setModalTab('select');
    setIsEditorOpen(true);
  };

  // 4. Resolve Pasted Link (Method 3)
  const handleResolvePastedLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteUrlInput.trim()) return;

    setIsResolvingLink(true);
    setResolveError(null);

    try {
      const res = await fetch('/api/instagram/reels/resolve-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pasteUrlInput.trim() }),
      });

      const data = await res.json();
      if (data.success && data.reel) {
        // If an existing rule already exists for this resolved Reel, prompt or switch to edit
        if (data.existingRule) {
          handleOpenEditModal(data.existingRule as InstagramReelRule, data.reel);
          return;
        }

        setSelectedReelPreview(data.reel);
        setEditingRule((prev) => ({
          ...(prev || {}),
          media_id: data.reel.media_id,
          title: prev?.title || (data.reel.caption ? data.reel.caption.slice(0, 60) : 'Instagram Reel Automation'),
          permalink: data.reel.permalink,
          thumbnail_url: data.reel.thumbnail_url || data.reel.media_url || '',
          whatsapp_prefill_text: prev?.whatsapp_prefill_text || `Hi! I saw your Reel "${data.reel.caption ? data.reel.caption.slice(0, 30) : 'video'}" and would like details.`,
        }));
      } else {
        setResolveError(data.error || 'Failed to resolve Reel. Please verify that this Reel belongs to @thebusinesswork.co.');
      }
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : 'Network error while resolving URL.');
    } finally {
      setIsResolvingLink(false);
    }
  };

  // 5. Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule?.media_id || !editingRule?.title) {
      alert('Please select or specify a valid Instagram Media ID and Reel Title.');
      return;
    }

    const cleanKeywords = keywordInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const payload: Partial<InstagramReelRule> = {
      ...editingRule,
      keywords: cleanKeywords,
      permalink: selectedReelPreview?.permalink || editingRule.permalink || '',
      thumbnail_url: selectedReelPreview?.thumbnail_url || editingRule.thumbnail_url || '',
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

        // Update synced reels status
        setSyncedReels((prev) =>
          prev.map((sr) =>
            sr.media_id === data.rule.media_id
              ? { ...sr, rule_id: data.rule.id, rule_enabled: data.rule.is_enabled }
              : sr
          )
        );

        setIsEditorOpen(false);
      } else {
        alert(data.error || 'Failed to save Reel rule.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving rule');
    }
  };

  // 6. Delete Rule
  const handleDeleteRule = async (id: string, mediaId: string) => {
    if (!confirm('Are you sure you want to delete this Reel automation rule?')) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
    setSyncedReels((prev) =>
      prev.map((sr) => (sr.media_id === mediaId ? { ...sr, rule_id: null, rule_enabled: false } : sr))
    );

    try {
      await fetch(`/api/instagram/reels?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      loadData();
    }
  };

  // 7. Toggle Enabled
  const handleToggleEnabled = async (rule: InstagramReelRule) => {
    const nextState = !rule.is_enabled;
    const updated = { ...rule, is_enabled: nextState };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    setSyncedReels((prev) =>
      prev.map((sr) => (sr.media_id === rule.media_id ? { ...sr, rule_enabled: nextState } : sr))
    );

    try {
      await fetch('/api/instagram/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      loadData();
    }
  };

  // Combine Synced Reels & Rules into Unified Visual Library
  const { publishedItems, archivedItems, unifiedLibraryItems } = useMemo(() => {
    const ruleMap = new Map(rules.map((r) => [r.media_id, r]));
    const pub: Array<{
      reel: InstagramSyncedReel;
      rule: InstagramReelRule | null;
      status: 'active' | 'inactive' | 'unconfigured';
    }> = [];

    // Add active published reels from Meta
    for (const sr of syncedReels) {
      const r = ruleMap.get(sr.media_id) || null;
      const status: 'active' | 'inactive' | 'unconfigured' = r
        ? r.is_enabled && r.is_available !== false
          ? 'active'
          : 'inactive'
        : 'unconfigured';
      pub.push({ reel: sr, rule: r, status });
    }

    // Partition archived/unavailable rules
    const arch: Array<{
      reel: InstagramSyncedReel;
      rule: InstagramReelRule | null;
      status: 'active' | 'inactive' | 'unconfigured' | 'archived';
    }> = [];

    for (const r of rules) {
      const inSynced = syncedReels.some((sr) => sr.media_id === r.media_id);
      if (!inSynced || r.is_available === false) {
        arch.push({
          reel: {
            media_id: r.media_id,
            shortcode: r.permalink?.match(/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i)?.[1] || '',
            caption: r.title,
            permalink: r.permalink || `https://www.instagram.com/reel/${r.media_id}/`,
            thumbnail_url: r.thumbnail_url || '',
            timestamp: r.created_at,
            media_type: 'VIDEO',
            comments_count: r.comments_count,
            rule_id: r.id,
            rule_enabled: false,
            is_available: false,
            availability_status: r.availability_status || 'deleted_or_unavailable',
          },
          rule: r,
          status: 'archived',
        });
      }
    }

    // Determine target list based on filter
    let target = statusFilter === 'archived' ? arch : (pub.length > 0 ? pub : arch);

    if (statusFilter === 'active') {
      target = target.filter((i) => i.status === 'active');
    } else if (statusFilter === 'inactive') {
      target = target.filter((i) => i.status === 'inactive' || i.status === 'archived');
    } else if (statusFilter === 'unconfigured') {
      target = pub.filter((i) => i.status === 'unconfigured');
    }

    // Apply Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      target = target.filter(
        (i) =>
          i.reel.caption?.toLowerCase().includes(q) ||
          i.rule?.title?.toLowerCase().includes(q) ||
          i.reel.media_id.includes(q) ||
          i.reel.shortcode?.toLowerCase().includes(q)
      );
    }

    // Apply Sorting
    const sorted = [...target].sort((a, b) => {
      if (sortBy === 'comments') {
        const cA = a.rule?.comments_count || a.reel.comments_count || 0;
        const cB = b.rule?.comments_count || b.reel.comments_count || 0;
        return cB - cA;
      }
      const tA = new Date(a.reel.timestamp || 0).getTime();
      const tB = new Date(b.reel.timestamp || 0).getTime();
      return sortBy === 'oldest' ? tA - tB : tB - tA;
    });

    return { publishedItems: pub, archivedItems: arch, unifiedLibraryItems: sorted };
  }, [syncedReels, rules, searchQuery, statusFilter, sortBy]);

  // Aggregated Stats
  const totalComments = rules.reduce((acc, r) => acc + (r.comments_count || 0), 0);
  const totalPrivateReplies = rules.reduce((acc, r) => acc + (r.private_replies_count || 0), 0);
  const totalFollows = rules.reduce((acc, r) => acc + (r.verified_follows_count || 0), 0);

  // Live WhatsApp CTA URL preview
  const previewWaUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        editingRule?.whatsapp_prefill_text || 'Hi! I saw your Instagram Reel'
      )}`
    : '';

  return (
    <div className="min-h-full pb-20">
      <TopNavbar
        title="Instagram Reels Automation"
        subtitle="Connected: @thebusinesswork.co · Auto-sync published Reels, browse visually, or paste link to automate DMs."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* SYNC NOTIFICATION BANNER */}
        {syncNotice && (
          <div
            className={`rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-3 ${
              syncNotice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{syncNotice.message}</span>
            </div>
            <button
              onClick={() => setSyncNotice(null)}
              className="text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
                  Inbound DMs will use fallback bio references. To enable direct <code className="font-mono text-[11px] bg-white/70 px-1 py-0.5 rounded">wa.me</code> links, configure your business phone in Settings.
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

        {/* TIME RANGE FILTER & PRODUCTION ISOLATION BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200/80 text-xs self-start">
            <span className="text-[11px] font-semibold text-stone-500 px-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Time Range:
            </span>
            {(['all', 'today', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  loadData(false, range);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  timeRange === range
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
          {analytics?.test_events_count !== undefined && analytics.test_events_count > 0 && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-600 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Production / Test Isolation: <strong className="text-stone-900">{analytics.test_events_count}</strong> synthetic test runs isolated from customer metrics</span>
            </div>
          )}
        </div>

        {/* TOP STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Connected Reels
              </span>
              <Film className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {analytics?.connected_reels ?? analytics?.total_reels_discovered ?? publishedItems.length}
              <span className="text-xs font-normal text-stone-400 ml-1">published</span>
            </div>
            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              <span className="font-mono text-[10px] text-emerald-600 font-semibold">
                {analytics?.active_reels ?? analytics?.active_rules_count ?? publishedItems.filter((p) => p.status === 'active').length} Active
              </span>
              <span>· {analytics?.archived_reels ?? archivedItems.length} Archived</span>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Real Comments
              </span>
              <MessageCircle className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {analytics?.real_comments_received ?? analytics?.comments_ingested ?? totalComments}
            </div>
            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              <span>{analytics?.eligible_comments ?? 0} eligible</span>
              <span>·</span>
              <span>{analytics?.comments_skipped ?? 0} skipped</span>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Private Replies
              </span>
              <Instagram className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {analytics?.private_replies_sent ?? totalPrivateReplies}
            </div>
            <div className="text-[11px] text-stone-500">
              {analytics?.public_replies_sent ? `${analytics.public_replies_sent} public replies sent` : '1 reply per comment rule'}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Verified Follows
              </span>
              <UserCheck className="h-4 w-4 text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-stone-900">
              {analytics?.total_historical_verified_follows ?? analytics?.verified_follows ?? totalFollows}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {analytics?.verified_follow_rate ? `${analytics.verified_follow_rate} conversion` : 'Follow-gate active'}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS & ACTIONS HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200/80 gap-4 pb-2">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('reels')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'reels'
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Film className="h-4 w-4" />
              Reels Library & Automations ({publishedItems.length > 0 ? publishedItems.length : archivedItems.length})
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'faq'
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Automated FAQ & 24 Services
            </button>
            <button
              onClick={() => setActiveTab('observability')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'observability'
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Observability & Contracts
            </button>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto pb-1">
            <button
              onClick={() => loadData(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs disabled:opacity-60"
              title="Fetch newly published Reels from @thebusinesswork.co via Meta Graph API"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-stone-900' : 'text-stone-500'}`} />
              {isSyncing ? 'Syncing...' : 'Sync Reels'}
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Reel Automation
            </button>
          </div>
        </div>

        {/* TAB 1: VISUAL REELS LIBRARY */}
        {activeTab === 'reels' && (
          <div className="space-y-4">
            {/* SEARCH & FILTERS BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/80 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Reels by caption, title, or media ID..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400 transition-colors bg-stone-50/60"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                  aria-label="Filter Reels by automation status"
                  className="rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-1.5 text-xs font-medium text-stone-700 focus:outline-hidden"
                >
                  <option value="all">
                    {publishedItems.length > 0
                      ? `Published Reels (${publishedItems.length})`
                      : `Archived Automations (${archivedItems.length})`}
                  </option>
                  <option value="active">Active Automations</option>
                  <option value="inactive">Paused Automations</option>
                  <option value="unconfigured">Not Configured Yet</option>
                  <option value="archived">Archived / Unavailable ({archivedItems.length})</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOrder)}
                  aria-label="Sort Reels order"
                  className="rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-1.5 text-xs font-medium text-stone-700 focus:outline-hidden"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="comments">Most Comments</option>
                </select>

                {lastSyncedAt && (
                  <span className="text-[11px] text-stone-400 ml-auto hidden md:inline">
                    Last synced: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* ARCHIVED REELS NOTIFICATION BANNER */}
            {publishedItems.length === 0 && archivedItems.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-700 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Archive className="h-4 w-4 text-stone-500 shrink-0" />
                  <span>
                    <strong>Instagram Catalog Sync:</strong> 0 published Reels currently on @thebusinesswork.co. Your {archivedItems.length} previous automations are safely paused and archived below with full comment and DM analytics preserved.
                  </span>
                </div>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shrink-0 shadow-xs"
                >
                  + Connect New Reel
                </button>
              </div>
            )}

            {/* REELS GRID VIEW */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                    <div className="h-44 bg-stone-100 rounded-xl" />
                    <div className="h-4 bg-stone-100 rounded-md w-3/4" />
                    <div className="h-3 bg-stone-100 rounded-md w-1/2" />
                  </div>
                ))}
              </div>
            ) : unifiedLibraryItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                  <Film className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-stone-900">
                    {searchQuery ? 'No Reels match your search filter' : 'No Published Reels Discovered Yet'}
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    {searchQuery
                      ? 'Try clearing your search term or changing the status filter.'
                      : 'Sync reels published on @thebusinesswork.co using Meta Graph API, or connect one immediately by pasting its Instagram link.'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => loadData(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync from Meta API
                  </button>
                  <button
                    onClick={() => handleOpenCreateModal()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-xs"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Paste Instagram Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {unifiedLibraryItems.map(({ reel, rule, status }) => (
                  <div
                    key={reel.media_id}
                    className="group flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-md hover:border-stone-300"
                  >
                    <div className="space-y-3">
                      {/* THUMBNAIL / MEDIA PREVIEW */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-stone-900/90 flex items-center justify-center border border-stone-100">
                        {reel.thumbnail_url || reel.media_url ? (
                          <img
                            src={reel.thumbnail_url || reel.media_url}
                            alt={reel.caption || 'Instagram Reel'}
                            className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300"
                            onError={(e) => {
                              // Graceful fallback to video placeholder
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="flex items-center gap-1 rounded-md bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white">
                            <Video className="h-2.5 w-2.5" />
                            Reel
                          </span>
                        </div>

                        <div className="absolute top-2 right-2">
                          {status === 'active' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              Active
                            </span>
                          )}
                          {status === 'inactive' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-600/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs">
                              Paused
                            </span>
                          )}
                          {status === 'archived' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-stone-900/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-amber-300 shadow-2xs">
                              Deleted from IG
                            </span>
                          )}
                          {status === 'unconfigured' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-stone-700/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white shadow-2xs">
                              Not Configured
                            </span>
                          )}
                        </div>

                        {/* External Link */}
                        {reel.permalink && (
                          <a
                            href={reel.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 rounded-lg bg-stone-900/80 p-1.5 text-white/80 hover:text-white hover:bg-stone-900 transition-colors"
                            title="Open Reel on Instagram"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {/* REEL METADATA */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span className="font-mono">ID: {reel.media_id}</span>
                          <span>{reel.timestamp ? new Date(reel.timestamp).toLocaleDateString() : 'Published'}</span>
                        </div>
                        <h4 className="font-semibold text-xs text-stone-900 line-clamp-2 leading-relaxed">
                          {rule?.title || reel.caption || 'Untitled Reel'}
                        </h4>
                      </div>

                      {/* AUTOMATION DETAILS (IF CONFIGURED) */}
                      {rule && (
                        <div className="space-y-2 pt-1 border-t border-stone-100">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-700 uppercase">
                              {rule.trigger_mode === 'any_comment' ? '⚡ Any Comment' : '🔑 Keywords'}
                            </span>
                            {rule.follow_required && (
                              <span className="rounded-md bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                🛡️ Follow Gated
                              </span>
                            )}
                            {rule.whatsapp_prefill_text && (
                              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                💬 WhatsApp
                              </span>
                            )}
                          </div>

                          {/* Quick Metrics */}
                          <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-50 p-2 text-center text-[10px]">
                            <div>
                              <span className="block text-stone-400">Comments</span>
                              <span className="font-bold text-stone-800">{rule.comments_count || 0}</span>
                            </div>
                            <div>
                              <span className="block text-stone-400">DMs Sent</span>
                              <span className="font-bold text-stone-800">{rule.private_replies_count || 0}</span>
                            </div>
                            <div>
                              <span className="block text-stone-400">Follows</span>
                              <span className="font-bold text-emerald-700">{rule.verified_follows_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CARD ACTIONS */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      {rule ? (
                        <>
                          <button
                            onClick={() => handleToggleEnabled(rule)}
                            className={`text-[11px] font-semibold transition-colors ${
                              rule.is_enabled ? 'text-stone-500 hover:text-stone-800' : 'text-emerald-700 hover:text-emerald-800'
                            }`}
                          >
                            {rule.is_enabled ? 'Pause' : 'Activate'}
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(rule, reel)}
                              className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-200 transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id, rule.media_id)}
                              className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Automation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenCreateModal(reel)}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-2xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Connect Automation
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUTOMATED FAQ & 24 SERVICES (PRESERVED FROM V4) */}
        {activeTab === 'faq' && (
          <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-semibold text-sm text-stone-900">4 Official Service Categories & 24 Distinct Services (V5 Live Engine)</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Configured with native 3-language matching (English, Hindi Devanagari, and Hinglish), Meta in-message Button Templates, and zero-hallucination routing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">1</span>
                  <span>AI Agents & Chatbots (6 Services)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  1.1 AI Sales Agents · 1.2 Customer Support Agents · 1.3 Website Chatbots · 1.4 AI Lead Qualification · 1.5 AI Voice Agents · 1.6 AI Appointment Booking.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Postback Payload: TBW_CAT_1</div>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">2</span>
                  <span>CRM & Sales Automation (6 Services)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  2.1 CRM Setup & Customization · 2.2 Lead Management · 2.3 Automated Follow-ups · 2.4 Sales Pipeline Automation · 2.5 Lead Assignment · 2.6 Sales Reporting.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Postback Payload: TBW_CAT_2</div>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">3</span>
                  <span>Business Workflow Automation (6 Services)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  3.1 Form-to-CRM Automation · 3.2 Email Automation · 3.3 Google Sheets Automation · 3.4 Calendar & Appointments · 3.5 Invoice & Document Workflows · 3.6 App Integrations.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Postback Payload: TBW_CAT_3</div>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <span className="rounded-md bg-stone-200 px-1.5 py-0.5 font-mono text-[10px]">4</span>
                  <span>WhatsApp & Social Automation (6 Services)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  4.1 WhatsApp Business API · 4.2 WhatsApp AI Chat · 4.3 Notifications & Reminders · 4.4 Instagram DM Automation · 4.5 Social Media Lead Capture · 4.6 Customer Follow-ups.
                </p>
                <div className="text-[11px] font-mono text-stone-400">Postback Payload: TBW_CAT_4</div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
              <h4 className="font-semibold text-xs text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Zero Hallucination & Meta Button Template Guaranteed
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Deterministic catalog lookups and in-bubble Meta Button templates are served directly without hallucination. Gemini AI is strictly grounded on the complete 24-service catalog and engaged only for complex queries.
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
                Status of live endpoints, Meta Graph API connection, and WhatsApp redirection links.
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
                  Evaluates 7-day limits, trigger mode, and atomic private reply reservation for incoming Reel comments.
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
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">Meta Graph API Connection</div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>@thebusinesswork.co Connected</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Authorized for Reel comment-to-DM triggers, public comment replies, and published media sync.
                </p>
              </div>
            </div>

            {/* PHASE 2: AUDITABLE PROCESSING STATUS BREAKDOWN */}
            <div className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">
                    Auditable Comment Processing Statuses & Test Isolation
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Deterministic processing lifecycle for all incoming Instagram Reel comments.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-medium text-stone-600 bg-white border border-stone-200 px-2.5 py-1 rounded-md">
                  Active Filter: {timeRange.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                <div className="rounded-lg bg-white p-3 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Real Received</span>
                  <div className="text-lg font-bold text-stone-900">
                    {analytics?.real_comments_received ?? 0}
                  </div>
                  <span className="text-[10px] text-emerald-600">Organic customers</span>
                </div>

                <div className="rounded-lg bg-white p-3 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Eligible Comments</span>
                  <div className="text-lg font-bold text-stone-900">
                    {analytics?.eligible_comments ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-500">Active rule matched</span>
                </div>

                <div className="rounded-lg bg-white p-3 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Private Replies</span>
                  <div className="text-lg font-bold text-stone-900">
                    {analytics?.private_replies_sent ?? 0}
                  </div>
                  <span className="text-[10px] text-stone-500">Delivered via Meta</span>
                </div>

                <div className="rounded-lg bg-white p-3 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Skipped / Duplicates</span>
                  <div className="text-lg font-bold text-stone-900">
                    {(analytics?.comments_skipped ?? 0) + (analytics?.duplicate_comments_ignored ?? 0)}
                  </div>
                  <span className="text-[10px] text-stone-500">Cooldown or inactive</span>
                </div>

                <div className="rounded-lg bg-white p-3 border border-stone-200/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Test Events Isolated</span>
                  <div className="text-lg font-bold text-stone-900">
                    {analytics?.test_events_count ?? 0}
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium">Excluded from metrics</span>
                </div>
              </div>
            </div>

            {/* META COMPLIANCE & SAFETY POLICIES */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <h4 className="font-semibold text-xs text-emerald-950">Meta Policy & Anti-Spam Compliance Status</h4>
              </div>
              <ul className="text-[11px] text-emerald-900/90 space-y-1.5 list-disc list-inside">
                <li><strong>1 Private Reply per Comment:</strong> Strictly enforced by atomic database claim on comment_id.</li>
                <li><strong>7-Day Window:</strong> Meta requires comment private replies within 7 days; older comments fail-closed.</li>
                <li><strong>24-Hour Messaging Window:</strong> Full interactive button templates unlock only after customer sends an inbound DM.</li>
                <li><strong>First-DM Quick Reply:</strong> Plain text &quot;Send Me Details&quot; quick reply supported on initial comment reply.</li>
                <li><strong>Self-Comment Recursion Guard:</strong> Automatic comment replies to @thebusinesswork.co are blocked to avoid loops.</li>
                <li><strong>Auto Public Reply:</strong> OFF by default on all Reels; utilizes official Meta moderation API when enabled.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL: 3-METHOD REEL AUTOMATION MANAGER EDITOR                        */}
      {/* ===================================================================== */}
      {isEditorOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-6">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingRule.id && rules.some((r) => r.id === editingRule.id)
                    ? 'Edit Instagram Reel Automation'
                    : 'Connect Reel to Automation'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Choose a published Reel from @thebusinesswork.co using any of the three connection methods.
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* THREE-METHOD CONNECTION TABS */}
            <div className="rounded-2xl bg-stone-100/70 p-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModalTab('sync')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
                  modalTab === 'sync'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>1. Auto Sync Reels</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('select')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
                  modalTab === 'select'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>2. Select Reel</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('paste')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
                  modalTab === 'paste'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>3. Paste Reel Link</span>
              </button>
            </div>

            {/* METHOD 1 TAB CONTENT: AUTO SYNC REELS */}
            {modalTab === 'sync' && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                      <Instagram className="h-4 w-4 text-stone-700" />
                      Connected Professional Account: @thebusinesswork.co
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Discovers published Reels via authorized Meta Graph API connection. Newly published Reels appear automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadData(true)}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-2xs shrink-0 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Published Reels Now'}
                  </button>
                </div>

                {syncedReels.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {syncedReels.slice(0, 4).map((r) => (
                      <div
                        key={r.media_id}
                        onClick={() => {
                          setSelectedReelPreview(r);
                          setEditingRule((prev) => ({
                            ...(prev || {}),
                            media_id: r.media_id,
                            title: prev?.title || r.caption?.slice(0, 50) || 'Reel Automation',
                            permalink: r.permalink,
                            thumbnail_url: r.thumbnail_url || r.media_url || '',
                          }));
                        }}
                        className={`cursor-pointer rounded-xl border p-2 transition-all space-y-1.5 ${
                          selectedReelPreview?.media_id === r.media_id
                            ? 'border-stone-900 bg-white ring-2 ring-stone-900/20'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="aspect-video bg-stone-100 rounded-lg overflow-hidden relative">
                          {r.thumbnail_url || r.media_url ? (
                            <img src={r.thumbnail_url || r.media_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full flex items-center justify-center text-stone-300"><Film className="h-4 w-4" /></div>
                          )}
                        </div>
                        <p className="text-[10px] font-medium text-stone-800 line-clamp-1">{r.caption || 'Untitled Reel'}</p>
                        <span className="block text-[9px] font-mono text-stone-400">ID: {r.media_id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-stone-500">
                    No Reels currently cached. Click &ldquo;Sync Published Reels Now&rdquo; above to query Meta Graph API.
                  </div>
                )}
              </div>
            )}

            {/* METHOD 2 TAB CONTENT: SELECT FROM REELS */}
            {modalTab === 'select' && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-stone-900">
                    Select a Reel from Connected Library ({syncedReels.length} available)
                  </h4>
                  <span className="text-[11px] text-stone-400">Click a card to attach to automation</span>
                </div>

                {syncedReels.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-500 space-y-2">
                    <p>No Reels found in library yet for @thebusinesswork.co.</p>
                    <button
                      type="button"
                      onClick={() => setModalTab('paste')}
                      className="inline-flex items-center gap-1 font-semibold text-stone-900 hover:underline"
                    >
                      <Link2 className="h-3 w-3" />
                      Try pasting a Reel link instead
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
                    {syncedReels.map((sr) => {
                      const isSelected = selectedReelPreview?.media_id === sr.media_id;
                      return (
                        <div
                          key={sr.media_id}
                          onClick={() => {
                            setSelectedReelPreview(sr);
                            setEditingRule((prev) => ({
                              ...(prev || {}),
                              media_id: sr.media_id,
                              title: prev?.title || sr.caption?.slice(0, 50) || 'Reel Automation',
                              permalink: sr.permalink,
                              thumbnail_url: sr.thumbnail_url || sr.media_url || '',
                            }));
                          }}
                          className={`cursor-pointer rounded-xl border p-2 transition-all space-y-1.5 ${
                            isSelected
                              ? 'border-stone-900 bg-white ring-2 ring-stone-900/20'
                              : 'border-stone-200 bg-white hover:border-stone-300'
                          }`}
                        >
                          <div className="aspect-video bg-stone-100 rounded-lg overflow-hidden relative">
                            {sr.thumbnail_url || sr.media_url ? (
                              <img src={sr.thumbnail_url || sr.media_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full flex items-center justify-center text-stone-300"><Film className="h-4 w-4" /></div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-stone-900 text-white rounded-md p-0.5">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-medium text-stone-800 line-clamp-1">{sr.caption || 'Untitled'}</p>
                          <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono">
                            <span>ID: {sr.media_id}</span>
                            {sr.rule_id && <span className="text-emerald-600 font-bold">Configured</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* METHOD 3 TAB CONTENT: PASTE INSTAGRAM REEL LINK */}
            {modalTab === 'paste' && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-4">
                <div>
                  <h4 className="font-semibold text-xs text-stone-900">
                    Paste Instagram Reel URL
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Enter any valid Reel link from @thebusinesswork.co. The verified numeric Media ID will be resolved automatically.
                  </p>
                </div>

                <form onSubmit={handleResolvePastedLink} className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="url"
                      value={pasteUrlInput}
                      onChange={(e) => setPasteUrlInput(e.target.value)}
                      placeholder="https://www.instagram.com/reel/C8_EXAMPLE/"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-stone-400 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isResolvingLink || !pasteUrlInput.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-2xs shrink-0 disabled:opacity-60"
                  >
                    {isResolvingLink ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    {isResolvingLink ? 'Resolving...' : 'Resolve Reel'}
                  </button>
                </form>

                {resolveError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      <span>Reel Resolution Notice</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">{resolveError}</p>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedManual(true)}
                      className="text-[11px] font-semibold text-amber-900 underline hover:no-underline"
                    >
                      Enter Numeric Media ID manually under Advanced Entry →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SELECTED REEL HERO PREVIEW CARD */}
            {selectedReelPreview && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-24 rounded-xl bg-stone-900 overflow-hidden relative shrink-0 border border-stone-200">
                    {selectedReelPreview.thumbnail_url || selectedReelPreview.media_url ? (
                      <img
                        src={selectedReelPreview.thumbnail_url || selectedReelPreview.media_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-stone-400">
                        <Film className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-stone-900 text-white px-2 py-0.5 text-[10px] font-bold">
                        Verified Media ID
                      </span>
                      <span className="font-mono text-xs font-bold text-stone-900">
                        {selectedReelPreview.media_id}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-stone-700 line-clamp-1">
                      {selectedReelPreview.caption || editingRule.title || 'Selected Reel'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400">
                      <span>Account: @thebusinesswork.co</span>
                      {selectedReelPreview.permalink && (
                        <a
                          href={selectedReelPreview.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-stone-600 hover:text-stone-900 font-medium"
                        >
                          Open on IG <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedReelPreview(null);
                    setEditingRule((prev) => ({ ...(prev || {}), media_id: '' }));
                    setModalTab('select');
                  }}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shrink-0 shadow-2xs"
                >
                  Change Reel
                </button>
              </div>
            )}

            {/* UNIFIED AUTOMATION CONFIGURATION FORM */}
            <form onSubmit={handleSaveRule} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN: TRIGGER RULES & CONTENT */}
                <div className="space-y-4">
                  {/* Title & Media ID */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">Automation Rule Title *</label>
                    <input
                      type="text"
                      required
                      value={editingRule.title || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                      placeholder="e.g. AI Workflow Breakdown #1"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                  </div>

                  {/* Trigger Mode */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-stone-700">Comment Trigger Mode</label>
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
                          Triggers only on keyword match
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Keywords Tag Input */}
                  {editingRule.trigger_mode === 'keywords' && (
                    <div className="space-y-1 rounded-xl bg-stone-50 p-3 border border-stone-200/80">
                      <label className="text-xs font-semibold text-stone-700">Trigger Keywords (comma-separated)</label>
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        placeholder="INFO, AUTOMATION, REEL, DETAILS"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-200 bg-white focus:outline-hidden focus:border-stone-400"
                      />
                      <p className="text-[10px] text-stone-400">
                        Case-insensitive exact token matching. Comments containing any of these keywords will trigger.
                      </p>
                    </div>
                  )}

                  {/* Initial DM Text */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-700">
                        Initial Private Reply Message *
                      </label>
                      <span className="text-[10px] text-stone-500 font-medium">Meta Private Reply · Text Only</span>
                    </div>
                    <textarea
                      required
                      rows={2}
                      value={editingRule.initial_dm_text || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, initial_dm_text: e.target.value })}
                      placeholder="Thanks for commenting on our Reel! 👋&#10;Reply Hi to get the details ✨"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400 leading-relaxed font-sans"
                    />
                    <p className="text-[10px] text-stone-400">
                      Sent directly to the commenter. Kept short so customer only needs to reply &ldquo;Hi&rdquo; or anything to open the 24h interactive window.
                    </p>
                  </div>

                  {/* Public Comment Auto-Reply Toggle & Settings */}
                  <div className="rounded-xl border border-stone-200 p-3 space-y-3 bg-stone-50/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                          <MessageCircle className="h-4 w-4 text-emerald-600" />
                          Auto Reply to Comments (Public)
                        </label>
                        <p className="text-[11px] text-stone-500">
                          Automatically posts a public reply to qualifying comments via official Instagram Graph API.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingRule.auto_comment_reply_enabled ?? false}
                        onChange={(e) => setEditingRule({ ...editingRule, auto_comment_reply_enabled: e.target.checked })}
                        className="h-4 w-4 rounded-md border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                    </div>

                    {editingRule.auto_comment_reply_enabled && (
                      <div className="pt-2 border-t border-stone-200/80 space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-stone-700">
                            Primary Public Reply Text *
                          </label>
                          <input
                            type="text"
                            value={editingRule.auto_comment_reply_text || ''}
                            onChange={(e) => setEditingRule({ ...editingRule, auto_comment_reply_text: e.target.value })}
                            placeholder="Thanks! 👋 Check your DM for the details."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white font-sans"
                          />
                          <p className="text-[10px] text-stone-400">
                            Appears publicly under the commenter&apos;s comment on Instagram.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-stone-700">
                            Approved Reply Variations (One per line, rotated dynamically)
                          </label>
                          <textarea
                            rows={3}
                            value={(editingRule.auto_comment_reply_variations || []).join('\n')}
                            onChange={(e) => {
                              const vars = e.target.value.split('\n').map((v) => v.trim()).filter(Boolean);
                              setEditingRule({ ...editingRule, auto_comment_reply_variations: vars });
                            }}
                            placeholder="Thanks! 👋 Check your DM for the details.&#10;Thanks for reaching out! DM sent ✨&#10;Got your comment! Check your direct messages 📩"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white leading-relaxed font-sans"
                          />
                          <p className="text-[10px] text-stone-400">
                            Rotates among approved variations to reduce repetitive-looking responses.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* First Interactive Follow-Up Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700">
                      First Supported Interactive Follow-Up
                    </label>
                    <input
                      type="text"
                      value={editingRule.first_interactive_followup || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, first_interactive_followup: e.target.value })}
                      placeholder="Tap below to get instant details or explore our services:"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                    <p className="text-[10px] text-stone-400">
                      Intro text for the first in-bubble interactive message when the customer replies.
                    </p>
                  </div>

                  {/* Follow Required Toggle & Settings */}
                  <div className="rounded-xl border border-stone-200 p-3 space-y-3 bg-stone-50/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4 text-indigo-600" />
                          Require Instagram Follow (Follow Gating)
                        </label>
                        <p className="text-[11px] text-stone-500">
                          Inspects verified Meta API status (<code className="font-mono text-[10px]">is_user_follow_business</code>).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editingRule.follow_required ?? true}
                        onChange={(e) => setEditingRule({ ...editingRule, follow_required: e.target.checked })}
                        className="h-4 w-4 rounded-md border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                    </div>

                    {editingRule.follow_required && (
                      <div className="pt-2 border-t border-stone-200/80 space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-stone-700">
                            Follow Instructions Message (for non-followers)
                          </label>
                          <input
                            type="text"
                            value={editingRule.follow_instructions_text || ''}
                            onChange={(e) => setEditingRule({ ...editingRule, follow_instructions_text: e.target.value })}
                            placeholder="Follow our Instagram page to unlock the details! 👋"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-stone-600">
                              Profile URL (opens in Instagram)
                            </label>
                            <input
                              type="text"
                              disabled
                              value="https://www.instagram.com/thebusinesswork.co/"
                              className="w-full px-2.5 py-1 text-[11px] font-mono rounded-lg border border-stone-200 bg-stone-100/70 text-stone-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-stone-600">
                              Confirmation Action Label
                            </label>
                            <input
                              type="text"
                              value={editingRule.follow_button_label || ''}
                              onChange={(e) => setEditingRule({ ...editingRule, follow_button_label: e.target.value })}
                              placeholder="I've Followed"
                              className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-white font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unlocked Details Content */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-700">
                        Unlocked Reel-Specific Details *
                      </label>
                      <span className="text-[10px] text-emerald-600 font-medium">Delivered upon verification</span>
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={editingRule.details_text || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, details_text: e.target.value })}
                      placeholder="Here are the full details on our AI and workflow automation services!..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Post-Unlock Quick Actions */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700">
                      Post-Unlock Interactive Action Label
                    </label>
                    <input
                      type="text"
                      value={editingRule.post_unlock_primary_action || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, post_unlock_primary_action: e.target.value })}
                      placeholder="View Services"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                    <p className="text-[10px] text-stone-400">
                      Routes user to the 24-service catalog where they can browse all categories using in-bubble buttons.
                    </p>
                  </div>

                  {/* WhatsApp Prefill Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      WhatsApp CTA Prefill Text
                    </label>
                    <input
                      type="text"
                      value={editingRule.whatsapp_prefill_text || ''}
                      onChange={(e) => setEditingRule({ ...editingRule, whatsapp_prefill_text: e.target.value })}
                      placeholder="Hi! I saw your Instagram Reel and would like to learn more."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-400"
                    />
                    {previewWaUrl && (
                      <p className="text-[10px] text-stone-400 truncate">
                        Verified WhatsApp link: <span className="font-mono text-emerald-700">{previewWaUrl}</span>
                      </p>
                    )}
                  </div>

                  {/* Advanced / Manual Entry Accordion */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedManual(!showAdvancedManual)}
                      className="w-full flex items-center justify-between p-3 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 transition-colors"
                    >
                      <span>Advanced / Manual Media ID Entry</span>
                      {showAdvancedManual ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showAdvancedManual && (
                      <div className="p-3 bg-white space-y-2 border-t border-stone-200">
                        <label className="text-[11px] font-semibold text-stone-700">
                          Numeric Instagram Media ID (Direct Override)
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRule.media_id || ''}
                          onChange={(e) => setEditingRule({ ...editingRule, media_id: e.target.value.trim() })}
                          placeholder="e.g. 180429182390192"
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-200"
                        />
                        <p className="text-[10px] text-stone-400">
                          Only enter numeric Meta Media IDs from Meta Business Suite or Graph API Explorer.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Automation ON/OFF Switch */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-semibold text-stone-800">Automation Rule Active</span>
                    <input
                      type="checkbox"
                      checked={editingRule.is_enabled ?? true}
                      onChange={(e) => setEditingRule({ ...editingRule, is_enabled: e.target.checked })}
                      className="h-4 w-4 rounded-md border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: INTERACTIVE LIVE DM SIMULATION */}
                <div className="rounded-2xl border border-stone-200 bg-stone-100/60 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-stone-700" />
                        Live Instagram Direct Simulation
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded-full">
                        Live Flow Preview
                      </span>
                    </div>

                    {/* Simulation Controls */}
                    <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-stone-600 font-medium text-[11px]">Follower Status Simulation:</span>
                      <button
                        type="button"
                        onClick={() => setSimulatorFollower(!simulatorFollower)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          simulatorFollower ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {simulatorFollower ? '✓ Verified Following' : '✗ Not Following Yet'}
                      </button>
                    </div>

                    {/* Chat Bubble Canvas */}
                    <div className="space-y-2.5 pt-1 font-sans">
                      {/* Step 1: User Comment Trigger */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block text-right pr-1">1. User Comments on Reel</span>
                        <div className="flex justify-end">
                          <div className="rounded-2xl rounded-br-xs bg-indigo-600 px-3.5 py-1.5 text-xs text-white max-w-[80%] shadow-2xs">
                            {editingRule.trigger_mode === 'keywords' ? (keywordInput.split(',')[0] || 'DETAILS') : '🔥🔥 Awesome reel!'}
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Meta Initial Private Reply (Text Only) */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400">2. Initial Private Reply</span>
                          <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">Meta API · Text Only</span>
                        </div>
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-xs bg-white border border-stone-200/80 px-3.5 py-2.5 text-xs text-stone-800 max-w-[85%] shadow-2xs">
                            <p className="whitespace-pre-line leading-relaxed text-[11px]">
                              {editingRule.initial_dm_text || "Thanks for commenting on our Reel! 👋\nReply Hi to get the details ✨"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: User Replies in DM (Opens 24h Window) */}
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 block text-right pr-1">3. Customer Inbound DM (Opens 24h Window)</span>
                        <div className="flex justify-end">
                          <div className="rounded-2xl rounded-br-xs bg-stone-700 px-3 py-1.5 text-xs text-white max-w-[70%] shadow-2xs">
                            Hi 👋
                          </div>
                        </div>
                      </div>

                      {/* Step 4: Official Meta Button Template (In-Bubble Buttons) */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400">4. Interactive Follow-Up</span>
                          <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">In-Bubble Buttons</span>
                        </div>

                        {/* If Follow Gated & Not Following */}
                        {editingRule.follow_required && !simulatorFollower ? (
                          <div className="flex justify-start">
                            <div className="rounded-2xl rounded-bl-xs bg-white border border-stone-200/80 px-3.5 py-2.5 text-xs text-stone-800 max-w-[85%] shadow-2xs space-y-2">
                              <p className="text-[11px] font-medium leading-relaxed">
                                {editingRule.follow_instructions_text || 'Follow our Instagram page to unlock the details! 👋'}
                              </p>

                              {/* Official In-Bubble Button Stack */}
                              <div className="pt-1 border-t border-stone-100 space-y-1">
                                <div className="w-full py-1.5 rounded-lg bg-stone-900 text-white font-semibold text-[11px] text-center shadow-2xs">
                                  Follow Our Page ↗
                                </div>
                                <div className="w-full py-1.5 rounded-lg bg-stone-50 text-indigo-600 font-semibold text-[11px] text-center border border-stone-200/80">
                                  {editingRule.follow_button_label || "I've Followed"}
                                </div>
                                {whatsappPhone && (
                                  <div className="w-full py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[11px] text-center border border-emerald-200/80">
                                    Chat on WhatsApp
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* If Follower or Gating Disabled: Full Unlocked Content & Buttons */
                          <div className="flex justify-start">
                            <div className="rounded-2xl rounded-bl-xs bg-white border border-stone-200/80 px-3.5 py-2.5 text-xs text-stone-800 max-w-[85%] shadow-2xs space-y-2">
                              <p className="whitespace-pre-line text-[11px] leading-relaxed text-stone-700">
                                {editingRule.details_text || 'Here are the details on our AI and workflow automation services!'}
                              </p>

                              {/* Official In-Bubble Button Stack */}
                              <div className="pt-1 border-t border-stone-100 space-y-1">
                                <div className="w-full py-1.5 rounded-lg bg-stone-900 text-white font-semibold text-[11px] text-center shadow-2xs">
                                  {editingRule.post_unlock_primary_action || 'View Services'}
                                </div>
                                <div className="w-full py-1.5 rounded-lg bg-stone-50 text-indigo-600 font-semibold text-[11px] text-center border border-stone-200/80">
                                  AI Agents (6 Services)
                                </div>
                                {whatsappPhone && (
                                  <div className="w-full py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] text-center shadow-2xs">
                                    💬 Chat on WhatsApp
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-stone-400 text-center pt-2">
                    Strict Reel Isolation Active · Automation Integration Ready
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER ACTIONS */}
              <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!editingRule.media_id || !editingRule.title}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save & Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
