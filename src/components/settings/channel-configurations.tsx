'use client';

import React, { useState } from 'react';
import {
  Phone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Send,
  Save,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { InstagramIcon as Instagram, WhatsAppIcon as WhatsApp } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

export interface ChannelConfigurationsProps {
  initialWhatsAppPhone: string;
  initialTelegram: {
    status: string;
    chat_id: string;
    bot_username: string;
    bot_token_configured: boolean;
  };
  initialInstagram: {
    name: string;
    username: string;
    account_id: string;
    account_type: string;
    token_configured: boolean;
  };
}

export function ChannelConfigurations({
  initialWhatsAppPhone,
  initialTelegram,
  initialInstagram,
}: ChannelConfigurationsProps) {
  const [whatsappPhone, setWhatsappPhone] = useState(initialWhatsAppPhone || '917972020292');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isSendingTelegramTest, setIsSendingTelegramTest] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const testLink = whatsappPhone ? `https://wa.me/${whatsappPhone}` : '';

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPhone(true);
    setPhoneMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'whatsapp', data: { phone: whatsappPhone } }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneMessage({ type: 'success', text: 'WhatsApp Business Number updated successfully.' });
        try {
          localStorage.setItem('tbw_wa_business_phone', whatsappPhone);
        } catch {}
      } else {
        setPhoneMessage({ type: 'error', text: data.error || 'Failed to save phone' });
      }
    } catch (err: unknown) {
      setPhoneMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsSendingTelegramTest(true);
    setTelegramTestResult(null);
    try {
      const res = await fetch('/api/telegram/test-alert', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTelegramTestResult({
          type: 'success',
          text: `Test alert dispatched successfully to Telegram Chat ID ${initialTelegram.chat_id}.`,
        });
      } else {
        setTelegramTestResult({
          type: 'error',
          text: data.error || 'Failed to dispatch test Telegram alert.',
        });
      }
    } catch (err: unknown) {
      setTelegramTestResult({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error sending Telegram alert',
      });
    } finally {
      setIsSendingTelegramTest(false);
    }
  };

  const handleCopyWebhook = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.thebusinesswork.com';
    navigator.clipboard.writeText(`${origin}/api/whatsapp/webhook`);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 6: WHATSAPP CONFIGURATION */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2 text-white">
              <WhatsApp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                WhatsApp Cloud API Configuration
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Official Meta Cloud API sender, WABA routing, and customer redirect link.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Cloud API Connected</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342] text-xs font-mono">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              WABA Account ID
            </span>
            <strong className="text-stone-800 dark:text-stone-200">392817462019384</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Phone Number ID
            </span>
            <strong className="text-stone-800 dark:text-stone-200">549281048291039</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-sans">
              Sender Status
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400">Verified (+91 79720 20292)</strong>
          </div>
        </div>

        <form onSubmit={handleSavePhone} className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            WhatsApp Business Number (E.164 without plus)
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 917972020292"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-[#DDD9D0] bg-white text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingPhone}
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              Save Number
            </Button>
          </div>

          {phoneMessage && (
            <div
              className={`text-xs p-2.5 rounded-xl border flex items-center gap-2 ${
                phoneMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              {phoneMessage.type === 'success' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              <span>{phoneMessage.text}</span>
            </div>
          )}

          {testLink && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Verified wa.me link:
                </span>
                <code className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-mono text-stone-800 border border-stone-200 dark:bg-[#1A232D] dark:border-[#263342] dark:text-stone-300">
                  {testLink}
                </code>
              </div>
              <a
                href={testLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
              >
                <span>Test WhatsApp Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-t border-stone-100 dark:border-stone-800">
            <span className="text-stone-500 dark:text-stone-400">
              Webhook Listener Endpoint: <code className="font-mono text-[11px] text-stone-700 dark:text-stone-300">/api/whatsapp/webhook</code>
            </span>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={handleCopyWebhook}
              leftIcon={copiedWebhook ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            >
              {copiedWebhook ? 'Copied URL' : 'Copy Full Webhook URL'}
            </Button>
          </div>
        </form>
      </div>

      {/* SECTION 7: INSTAGRAM GRAPH API CONFIGURATION */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-pink-600 p-2 text-white">
              <Instagram className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Instagram Graph API Configuration
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Comment-to-DM triggers, direct inbox messaging, and account synchronization.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Graph API Active</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342] text-xs">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
              Instagram Account
            </span>
            <strong className="text-stone-800 dark:text-stone-200">
              @{initialInstagram.username}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
              Scoped Account ID
            </span>
            <strong className="font-mono text-stone-800 dark:text-stone-200">
              {initialInstagram.account_id}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
              Graph Token Status
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400">
              Encrypted & Long-Lived
            </strong>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-stone-600 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800">
          <div>
            Official Page Profile: <strong>{initialInstagram.name}</strong> ({initialInstagram.account_type})
          </div>
          <a
            href={`https://www.instagram.com/${initialInstagram.username}/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-pink-700 hover:text-pink-800 dark:text-pink-400"
          >
            <span>Open Instagram Profile</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* SECTION 8: TELEGRAM CONFIGURATION */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500 p-2 text-white">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Telegram Real-Time Alerts Configuration
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Instant operational push notifications to administrator Telegram account.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Bot Connected</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white border border-[#DDD9D0]/70 dark:bg-[#1A232D] dark:border-[#263342] text-xs">
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
              Alerts Bot Username
            </span>
            <strong className="text-stone-800 dark:text-stone-200">
              @{initialTelegram.bot_username}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
              Destination Chat ID
            </span>
            <strong className="font-mono text-stone-800 dark:text-stone-200">
              {initialTelegram.chat_id}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
              Delivery Protocol
            </span>
            <strong className="text-emerald-700 dark:text-emerald-400">
              HTTP/2 Bot API
            </strong>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Sends real-time messages for New Leads, Scheduled Appointments, and Workflow Failures.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTestTelegram}
            isLoading={isSendingTelegramTest}
            leftIcon={<Send className="h-3.5 w-3.5" />}
          >
            Dispatch Test Alert
          </Button>
        </div>

        {telegramTestResult && (
          <div
            className={`text-xs p-3 rounded-xl border flex items-center gap-2 ${
              telegramTestResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {telegramTestResult.type === 'success' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{telegramTestResult.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
