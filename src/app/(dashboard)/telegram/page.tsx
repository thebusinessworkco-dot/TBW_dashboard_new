'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Bell,
  UserCheck,
  Calendar,
  Headphones,
  Sparkles,
  Smartphone,
  Copy,
  Check,
  BellOff,
  Search,
  Filter,
  ShieldCheck,
  Lock,
  ChevronRight,
  Eye,
  AlertTriangle,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';

interface TelegramConfig {
  bot_username: string;
  chat_id: string | number | null;
  admin_name: string | null;
  status: string;
  notify_customer_chat: boolean;
  notify_new_leads: boolean;
  notify_appointments: boolean;
  notify_human_support: boolean;
  updated_at: string;
  is_connected: boolean;
}

interface AlertLog {
  id: string;
  title: string;
  text: string;
  phone?: string;
  customer_name?: string;
  type: string;
  status: 'sent' | 'failed' | 'queued';
  error?: string | null;
  sent_at: string;
}

type SeverityLevel = 'all' | 'success' | 'warning' | 'error' | 'critical';

export default function TelegramAlertsPage() {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [history, setHistory] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<AlertLog | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setHistory(data.history || []);
        if (data.config?.chat_id) {
          setManualChatId(String(data.config.chat_id));
        }
      }
    } catch (e) {
      console.error('Failed to load status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSyncChatId = async () => {
    setSyncing(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/telegram/sync-chat-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: manualChatId || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `Linked successfully to Chat ID: ${data.chatId || manualChatId}! A confirmation test message was sent to your Telegram.`,
        });
        await fetchStatus();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Could not find a new /start command. Make sure you tapped Start on @TBW_Admin_Alerts_Bot.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network request failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/telegram/test-alert', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: 'Test alert delivered to your Telegram app successfully! Check your phone.',
        });
        await fetchStatus();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to deliver test alert',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network request failed' });
    } finally {
      setTesting(false);
    }
  };

  const copyBotLink = () => {
    navigator.clipboard.writeText('https://t.me/TBW_Admin_Alerts_Bot');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Classify severity from alert type & status
  const getSeverity = (alert: AlertLog): 'success' | 'warning' | 'error' | 'critical' => {
    if (alert.status === 'failed') return 'error';
    const textLower = (alert.title + ' ' + alert.text).toLowerCase();
    if (textLower.includes('critical') || textLower.includes('emergency') || textLower.includes('takeover')) {
      return 'critical';
    }
    if (textLower.includes('warning') || textLower.includes('degraded') || textLower.includes('timeout')) {
      return 'warning';
    }
    if (textLower.includes('error') || textLower.includes('failed')) {
      return 'error';
    }
    return 'success';
  };

  // Filtered Alert History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
        (item.phone && item.phone.includes(q));

      if (!matchSearch) return false;

      const severity = getSeverity(item);
      if (severityFilter !== 'all' && severity !== severityFilter) return false;

      if (categoryFilter !== 'all' && item.type !== categoryFilter) return false;

      return true;
    });
  }, [history, searchQuery, severityFilter, categoryFilter]);

  // Counts
  const totalAlerts = history.length;
  const criticalCount = history.filter((h) => getSeverity(h) === 'critical').length;
  const errorCount = history.filter((h) => getSeverity(h) === 'error').length;
  const successCount = history.filter((h) => getSeverity(h) === 'success').length;

  return (
    <div className="min-h-full pb-16 bg-[#F4F2EC]">
      <TopNavbar
        title="Telegram Alerts Center"
        subtitle="Real-time push notifications for critical customer events, leads, bookings, and operator takeovers."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 text-xs shadow-xs animate-in fade-in-50 duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            )}
            <div className="flex-1 font-medium">{statusMessage.text}</div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-stone-600 p-1"
            >
              ×
            </button>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Total Dispatched</span>
            <div className="text-xl font-bold font-mono text-[#202B35] mt-1">{totalAlerts}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Delivered</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{successCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-600" />
              <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Critical Takeovers</span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-700 mt-1">{criticalCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Errors / Retries</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">{errorCount}</div>
          </div>
        </div>

        {/* Telegram Configuration & Destination Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Bot Connection & Destination */}
          <div className="lg:col-span-1 rounded-2xl border border-[#DDD9D0] bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Bot Connection
                </span>
                {config?.is_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected & Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Awaiting Link
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Official Bot Handle
                  </span>
                  <div className="text-sm font-bold text-[#202B35] mt-0.5 flex items-center gap-2">
                    @{config?.bot_username || 'TBW_Admin_Alerts_Bot'}
                    <button
                      onClick={copyBotLink}
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 transition-colors cursor-pointer"
                      title="Copy bot link"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Configured Destination Chat ID
                  </span>
                  <div className="text-xs font-mono font-bold text-[#202B35] mt-0.5">
                    {config?.chat_id ? (
                      <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        {config.chat_id}
                      </span>
                    ) : (
                      <span className="text-stone-400 italic">Not linked yet</span>
                    )}
                  </div>
                </div>

                {/* Manual Chat ID update field */}
                <div className="pt-2 border-t border-stone-100 space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-stone-500">
                    Update Telegram Chat ID
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={manualChatId}
                      onChange={(e) => setManualChatId(e.target.value)}
                      placeholder="e.g. 918604600292"
                      className="flex-1 rounded-xl border border-stone-200 bg-stone-50/60 p-2 text-xs font-mono text-stone-900 focus:border-[#202B35] focus:outline-none"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSyncChatId}
                      disabled={syncing}
                    >
                      {syncing ? 'Linking...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Alert & Security Card Footer */}
            <div className="pt-3 border-t border-stone-100 space-y-3">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={handleTestAlert}
                disabled={testing || !config?.chat_id}
                isLoading={testing}
                leftIcon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />}
              >
                Send Test Notification
              </Button>

              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 text-[10px] text-stone-500 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Security Guarantee:</strong> Bot tokens and API credentials remain securely on the server and are never rendered to the client.
                </span>
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Configured Notification Categories */}
          <div className="lg:col-span-2 rounded-2xl border border-[#DDD9D0] bg-white p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Subscribed Alert Categories
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                The Telegram bot dispatches push notifications directly to the admin phone with zero 24-hour window restrictions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Customer Messages</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Notifies whenever a customer initiates or replies on WhatsApp Cloud API or Instagram Direct.
                  </div>
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active (Priority)
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-800 shrink-0">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">New Inbound Leads</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Notifies on website form submissions and qualified WhatsApp sales inquiries.
                  </div>
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                    Active (Sheets Synced)
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-800 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Consultation Bookings</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Pushes instant alert with customer name, IST slot, and Google Calendar event link.
                  </div>
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Active (Calendar Synced)
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-800 shrink-0">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900">Emergency Human Takeover</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Highest priority alert triggered when a client requests a real person or AI agent needs support.
                  </div>
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Critical Alarm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ALERTS STREAM & AUDIT HISTORY TABLE */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#DDD9D0] bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search alert stream by title, text, customer phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#202B35] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-stone-500 font-medium">Severity:</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel)}
                    className="rounded-xl border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Severities</option>
                    <option value="success">Success / Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStatus}
                  leftIcon={<RefreshCw className={`h-3.5 w-3.5 text-stone-600 ${loading ? 'animate-spin' : ''}`} />}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Alerts Stream Table */}
          <div className="overflow-hidden rounded-2xl border border-[#DDD9D0] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200/70 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Alert Content</th>
                    <th className="py-3 px-4">Customer Context</th>
                    <th className="py-3 px-4">Timestamp (IST)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-xs text-stone-500">
                        <Bell className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                        <p className="font-semibold text-stone-700">No alert logs recorded</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Click &quot;Send Test Notification&quot; above to dispatch a live verification ping.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((alert) => {
                      const severity = getSeverity(alert);

                      const badgeStyle =
                        severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                          : severity === 'error'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : severity === 'warning'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                      return (
                        <tr
                          key={alert.id}
                          onClick={() => setSelectedAlert(alert)}
                          className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${badgeStyle}`}>
                              {severity}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-stone-800 capitalize whitespace-nowrap">
                            {alert.type || 'general'}
                          </td>

                          <td className="py-3.5 px-4 max-w-md">
                            <div className="font-bold text-stone-900">{alert.title}</div>
                            <div className="text-[11px] text-stone-600 line-clamp-1 mt-0.5">
                              {alert.text}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {alert.customer_name ? (
                              <div>
                                <span className="font-medium text-stone-900">{alert.customer_name}</span>
                                {alert.phone && (
                                  <div className="text-[10px] font-mono text-stone-400">{alert.phone}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-400 text-[11px]">System Workflow</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-stone-500 whitespace-nowrap text-[11px]">
                            {formatDateTime(alert.sent_at)}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold capitalize ${
                                alert.status === 'sent'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {alert.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlert(alert);
                              }}
                              className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                              title="Inspect Alert Diagnostic Payload"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ALERT DIAGNOSTIC MODAL */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={selectedAlert.title}
          description={`Alert Reference ID: ${selectedAlert.id} · Dispatched ${formatDateTime(selectedAlert.sent_at)}`}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="default" size="sm" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-stone-800">
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 whitespace-pre-line leading-relaxed text-xs">
              {selectedAlert.text}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400">Category:</span>
                <div className="font-semibold text-stone-800 mt-0.5 capitalize">{selectedAlert.type}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400">Delivery Status:</span>
                <div className="font-semibold text-stone-800 mt-0.5 capitalize">{selectedAlert.status}</div>
              </div>
            </div>

            {selectedAlert.customer_name && (
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-400">Client Contact:</span>
                <div className="font-semibold text-stone-800 mt-0.5">
                  {selectedAlert.customer_name} {selectedAlert.phone ? `(${selectedAlert.phone})` : ''}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
