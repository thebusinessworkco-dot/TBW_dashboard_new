'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Palette,
  UserCheck,
  Users,
  ShieldCheck,
  MessageSquare,
  Server,
  Bell,
  FileText,
  Loader2,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { GeneralBrandSettings } from '@/components/settings/general-brand-settings';
import { AdminProfileTheme } from '@/components/settings/admin-profile-theme';
import { TeamPermissionsSettings } from '@/components/settings/team-permissions-settings';
import { ChannelConfigurations } from '@/components/settings/channel-configurations';
import { InfrastructureIntegrations } from '@/components/settings/infrastructure-integrations';
import { NotificationsSettings } from '@/components/settings/notifications-settings';
import { AuditLogsSecurity } from '@/components/settings/audit-logs-security';

type SettingsTab =
  | 'general'
  | 'profile'
  | 'team'
  | 'channels'
  | 'infrastructure'
  | 'notifications'
  | 'audit';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [settingsData, setSettingsData] = useState<{
    general: {
      company_name: string;
      tagline: string;
      support_email: string;
      support_phone: string;
      website_url: string;
      timezone: string;
      business_hours: string;
      address: string;
    };
    brand: {
      brand_name: string;
      tagline: string;
      primary_color: string;
      accent_sage: string;
      neutral_ivory: string;
      stone_border: string;
      card_white: string;
      logo_url?: string;
      favicon_url?: string;
    };
    notifications: {
      suppressed_testing_numbers: string[];
      enable_telegram_alerts: boolean;
      enable_whatsapp_admin_alerts: boolean;
      alert_on_new_lead: boolean;
      alert_on_appointment: boolean;
      alert_on_human_takeover: boolean;
      alert_on_workflow_failure: boolean;
      alert_on_vps_high_load: boolean;
    };
    whatsapp_phone: string;
    telegram: {
      status: string;
      chat_id: string;
      bot_username: string;
      bot_token_configured: boolean;
    };
    instagram: {
      name: string;
      username: string;
      account_id: string;
      account_type: string;
      token_configured: boolean;
    };
    integrations: Array<{
      service_name: string;
      status: string;
      last_sync_at?: string | null;
      error_message?: string;
      details?: Record<string, unknown>;
    }>;
  } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSettingsData(data);
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'general', label: 'General & Brand', icon: Building2 },
    { id: 'profile', label: 'Profile & Theme', icon: UserCheck },
    { id: 'team', label: 'Team & Permissions', icon: Users },
    { id: 'channels', label: 'Communication Channels', icon: MessageSquare },
    { id: 'infrastructure', label: 'Infrastructure & Sync', icon: Server },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'audit', label: 'Audit Logs & Security', icon: FileText },
  ];

  return (
    <div className="min-h-full pb-16 bg-[#F4F2EC] dark:bg-[#0E1318]">
      <TopNavbar
        title="Settings & System Governance"
        subtitle="Manage business configuration, team access control, integrations, and immutable audit logs."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* TAB NAVIGATION STRIP */}
        <div className="flex overflow-x-auto no-scrollbar rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-1.5 shadow-xs dark:bg-[#151C24] dark:border-[#263342] gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#202B35] text-[#FCFBF8] shadow-xs dark:bg-[#FCFBF8] dark:text-[#202B35]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#F4F2EC]/60 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-[#1A232D]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#7D8F82] dark:text-[#7D8F82]' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT AREA */}
        {isLoading || !settingsData ? (
          <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-12 text-center shadow-xs dark:bg-[#151C24] dark:border-[#263342]">
            <Loader2 className="h-6 w-6 animate-spin text-stone-500 mx-auto" />
            <p className="text-xs text-stone-500 mt-2">Loading system configuration...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'general' && (
              <GeneralBrandSettings
                initialGeneral={settingsData.general}
                initialBrand={settingsData.brand}
              />
            )}

            {activeTab === 'profile' && <AdminProfileTheme />}

            {activeTab === 'team' && <TeamPermissionsSettings />}

            {activeTab === 'channels' && (
              <ChannelConfigurations
                initialWhatsAppPhone={settingsData.whatsapp_phone}
                initialTelegram={settingsData.telegram}
                initialInstagram={settingsData.instagram}
              />
            )}

            {activeTab === 'infrastructure' && (
              <InfrastructureIntegrations integrations={settingsData.integrations} />
            )}

            {activeTab === 'notifications' && (
              <NotificationsSettings initialNotifications={settingsData.notifications} />
            )}

            {activeTab === 'audit' && <AuditLogsSecurity />}
          </div>
        )}
      </div>
    </div>
  );
}
