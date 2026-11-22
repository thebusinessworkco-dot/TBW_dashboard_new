'use client';

import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationSettings } from '@/lib/types/dashboard';

export interface NotificationsSettingsProps {
  initialNotifications: NotificationSettings;
}

export function NotificationsSettings({ initialNotifications }: NotificationsSettingsProps) {
  const [notifications, setNotifications] = useState<NotificationSettings>(initialNotifications);
  const [newNumber, setNewNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAddNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = newNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 10) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid phone number with country code.' });
      return;
    }
    if (notifications.suppressed_testing_numbers.includes(cleanNumber)) {
      setStatusMsg({ type: 'error', text: 'This phone number is already in the suppression list.' });
      return;
    }
    setNotifications({
      ...notifications,
      suppressed_testing_numbers: [...notifications.suppressed_testing_numbers, cleanNumber],
    });
    setNewNumber('');
  };

  const handleRemoveNumber = (numToRemove: string) => {
    setNotifications({
      ...notifications,
      suppressed_testing_numbers: notifications.suppressed_testing_numbers.filter((n) => n !== numToRemove),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'notifications', data: notifications }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'Notification preferences saved successfully.' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save notifications' });
      }
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error saving preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* SECTION 13A: TEST NUMBER ALERT SUPPRESSION */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDD9D0]/60 pb-3 dark:border-[#263342]">
          <div className="flex items-center gap-2">
            <BellOff className="h-4 w-4 text-[#7D8F82]" />
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Personal Number Alert Suppression
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Automated admin alerts on Telegram & WhatsApp are automatically muted when you test using these numbers.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{notifications.suppressed_testing_numbers.length} Numbers Muted</span>
          </span>
        </div>

        {/* Number cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {notifications.suppressed_testing_numbers.map((num) => (
            <div
              key={num}
              className="p-3.5 rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342] flex items-center justify-between space-y-0"
            >
              <div>
                <div className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                  +{num}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400">
                  Admin Alert Muted
                </div>
              </div>
              <Button
                variant="tertiary"
                size="xs"
                iconOnly
                onClick={() => handleRemoveNumber(num)}
                title="Remove number from suppression"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new number input */}
        <form onSubmit={handleAddNumber} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="e.g. 917821840347"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            className="w-full sm:max-w-xs text-xs font-mono rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Number
          </Button>
        </form>
      </div>

      {/* SECTION 13B: ALERT TRIGGER CHANNELS & MATRIX */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="border-b border-[#DDD9D0]/60 pb-3 dark:border-[#263342]">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#202B35] dark:text-white" />
            <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
              Automated Alert Dispatch Matrix
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Configure which events trigger immediate push alerts to the team.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#DDD9D0]/70 bg-white dark:bg-[#1A232D] dark:border-[#263342] cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                New Inbound Lead Received
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Dispatches alert via Telegram when a new lead enters from Website, WhatsApp, or Instagram.
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications.alert_on_new_lead}
              onChange={(e) =>
                setNotifications({ ...notifications, alert_on_new_lead: e.target.checked })
              }
              className="h-4 w-4 rounded border-[#DDD9D0] text-[#202B35] focus:ring-[#202B35]"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#DDD9D0]/70 bg-white dark:bg-[#1A232D] dark:border-[#263342] cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Appointment Scheduled or Rescheduled
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Sends meeting time, client name, and service requested directly to Admin Telegram.
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications.alert_on_appointment}
              onChange={(e) =>
                setNotifications({ ...notifications, alert_on_appointment: e.target.checked })
              }
              className="h-4 w-4 rounded border-[#DDD9D0] text-[#202B35] focus:ring-[#202B35]"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#DDD9D0]/70 bg-white dark:bg-[#1A232D] dark:border-[#263342] cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                Customer Escalation / Human Takeover Requested
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Urgent notification when an active bot session is paused for live human assistance.
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications.alert_on_human_takeover}
              onChange={(e) =>
                setNotifications({ ...notifications, alert_on_human_takeover: e.target.checked })
              }
              className="h-4 w-4 rounded border-[#DDD9D0] text-[#202B35] focus:ring-[#202B35]"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#DDD9D0]/70 bg-white dark:bg-[#1A232D] dark:border-[#263342] cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                n8n Workflow Execution Failure
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                Alerts on failed nodes or webhook timeouts with execution ID and error snippet.
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications.alert_on_workflow_failure}
              onChange={(e) =>
                setNotifications({ ...notifications, alert_on_workflow_failure: e.target.checked })
              }
              className="h-4 w-4 rounded border-[#DDD9D0] text-[#202B35] focus:ring-[#202B35]"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Save Notification Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
