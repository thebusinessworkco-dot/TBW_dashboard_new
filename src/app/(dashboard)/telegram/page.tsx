'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <TopNavbar title="Telegram Alerts" subtitle="Real-time Admin Notifications" />

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
                  Telegram Admin Alerts
                  <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Free • 0-Delay • 24/7
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                  Real-time push notifications for customer messages, appointments, leads, and human support.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={handleSyncChatId}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 transition-colors disabled:opacity-50 flex-1 sm:flex-none cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Checking...' : 'Sync Connection'}
            </button>
            <button
              onClick={handleTestAlert}
              disabled={testing || !config?.chat_id}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-colors disabled:opacity-50 shadow-lg shadow-sky-500/20 flex-1 sm:flex-none cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {testing ? 'Sending...' : 'Send Test Alert'}
            </button>
          </div>
        </div>

        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in-50 duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <div className="flex-1">{statusMessage.text}</div>
          </div>
        )}

        {/* Top Cards: Status & Setup */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connection Status Card */}
          <div className="lg:col-span-1 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Bot Status
                </span>
                {config?.is_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connected & Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Waiting for /start
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-neutral-400">Telegram Bot Handle</div>
                  <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                    @{config?.bot_username || 'TBW_Admin_Alerts_Bot'}
                    <button
                      onClick={copyBotLink}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                      title="Copy bot link"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Admin Chat ID</div>
                  <div className="text-sm font-mono font-medium text-neutral-200 mt-0.5">
                    {config?.chat_id ? (
                      <span className="text-sky-400 font-semibold">{config.chat_id}</span>
                    ) : (
                      <span className="text-neutral-500 italic">Not connected yet</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400">Admin Identity</div>
                  <div className="text-sm text-neutral-200 mt-0.5">
                    {config?.admin_name || 'Aman Rajbhar (Owner)'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-800/80 mt-6">
              <a
                href="https://t.me/TBW_Admin_Alerts_Bot"
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-lg shadow-sky-500/20"
              >
                <Smartphone className="w-4 h-4" />
                Open Bot in Telegram
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="lg:col-span-2 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Quick Activation (30 Seconds)
                </span>
                <span className="text-xs text-neutral-400">No Meta 24h restrictions</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 font-bold flex items-center justify-center text-sm border border-sky-500/20 mb-3">
                    1
                  </div>
                  <h4 className="text-sm font-semibold text-white">Open Bot</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Click the button or search for{' '}
                    <code className="text-sky-300">@TBW_Admin_Alerts_Bot</code> in Telegram.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/20 mb-3">
                    2
                  </div>
                  <h4 className="text-sm font-semibold text-white">Tap &quot;Start&quot;</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Press the blue <strong className="text-neutral-200">Start</strong> button (or send{' '}
                    <code className="text-emerald-300">/start</code>) in the bot chat.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/20 mb-3">
                    3
                  </div>
                  <h4 className="text-sm font-semibold text-white">Click Sync</h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Click <strong className="text-neutral-200">&quot;Sync Connection&quot;</strong> above. You will
                    receive a confirmation alert instantly.
                  </p>
                </div>
              </div>

              {/* Manual Override Option */}
              <div className="mt-5 p-3.5 rounded-xl bg-neutral-950/40 border border-neutral-800 flex flex-col md:flex-row items-center gap-3">
                <div className="text-xs text-neutral-400 flex-1">
                  Already have your numerical Telegram Chat ID? (e.g. from @userinfobot):
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Enter Chat ID (e.g. 860460029)"
                    value={manualChatId}
                    onChange={(e) => setManualChatId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-neutral-900 border border-neutral-700 text-neutral-200 focus:outline-none focus:border-sky-500 w-full md:w-48"
                  />
                  <button
                    onClick={handleSyncChatId}
                    disabled={syncing || !manualChatId}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    Save ID
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Alert Triggers Grid */}
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Configured Alert Triggers</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Every event below automatically pushes an instant alert to your Telegram with interactive 📞 Call and 💬 WhatsApp buttons.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">New Customers</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Active
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Triggers on first message from any brand-new WhatsApp number.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Returning Customers</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Active
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Triggers when an existing contact restarts a new chat session.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Appointments Booked</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Active
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Triggers when a customer chooses an appointment date & confirms.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Human Support</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Priority
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Triggers whenever a customer taps &quot;Talk to Human&quot; or asks for support.
                </p>
              </div>
            </div>
          </div>

          {/* Muted Numbers Notice */}
          <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <BellOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Personal Numbers Muted:</strong> Automated alerts are disabled for personal test numbers (<code>+91 7821840347</code>, <code>+91 8604600292</code>, <code>+91 7972020292</code>) to keep your Telegram inbox clean during testing.
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              Test Spam Protection Active
            </span>
          </div>
        </div>

        {/* Live Dispatched Alerts Feed */}
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Recent Dispatched Telegram Alerts
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-normal">
                  {history.length}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Audit history of recent alerts sent to your Telegram account.
              </p>
            </div>
            <button
              onClick={fetchStatus}
              className="p-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Refresh log"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-neutral-500 text-sm">Loading alert logs...</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              No Telegram alerts sent yet. Once you tap Start on{' '}
              <a
                href="https://t.me/TBW_Admin_Alerts_Bot"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline underline-offset-2"
              >
                @TBW_Admin_Alerts_Bot
              </a>
              , new alerts will appear here in real time.
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm hover:border-neutral-700/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${
                        item.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        {item.title}
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full uppercase font-bold tracking-wider ${
                            item.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-300 mt-1 whitespace-pre-line line-clamp-2">
                        {item.text}
                      </div>
                      {item.phone && (
                        <div className="text-xs text-neutral-400 mt-1.5 flex items-center gap-2">
                          <span>Phone: +{item.phone.replace(/\D/g, '')}</span>
                          {item.customer_name && <span>• Name: {item.customer_name}</span>}
                        </div>
                      )}
                      {item.error && (
                        <div className="text-xs text-rose-400 mt-1">Error: {item.error}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between text-xs text-neutral-500 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.sent_at).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {new Date(item.sent_at).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
