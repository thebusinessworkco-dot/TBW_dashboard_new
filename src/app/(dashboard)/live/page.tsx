'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Radio,
  MessageSquare,
  Users,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { formatRelativeTime } from '@/lib/utils';

export default function LiveOperationsPage() {
  const router = useRouter();
  const {
    conversations,
    vpsMetrics,
    realtimeStatus,
    refreshData,
    toggleManualTakeover,
  } = useDashboardStore();

  const [channelFilter, setChannelFilter] = useState('all');

  const filteredConversations = conversations.filter((c) => {
    if (channelFilter === 'all') return true;
    if (channelFilter === 'takeover') return c.manual_takeover;
    if (channelFilter === 'automated') return !c.manual_takeover;
    return c.platform === channelFilter;
  });

  const takeoverCount = conversations.filter((c) => c.manual_takeover).length;
  const automatedCount = conversations.filter((c) => !c.manual_takeover).length;

  return (
    <div className="flex flex-col min-h-full pb-16">
      <TopNavbar
        title="Live Operations"
        subtitle="Real-time multi-channel conversational stream and incoming event dispatcher"
        breadcrumbs={[
          { label: 'Command Center', href: '/' },
          { label: 'Live Operations' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <PageHeader
          title="Live Operations Center"
          subtitle="Real-time event dispatcher monitoring customer sessions, human agent interventions, and webhook payloads"
          category="Command Center"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshData()}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Sync Channels
            </Button>
          }
        />

        {/* TOP STATUS METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566573] uppercase dark:text-[#94A4B4]">
                Websocket Engine
              </span>
              <Badge variant="sage" showDot>
                {realtimeStatus}
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-[#202B35] dark:text-[#FCFBF8]">
              Supabase RT
            </div>
            <p className="mt-1 text-[11px] text-[#566573] dark:text-[#94A4B4]">
              Zero-latency postgres_changes events
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566573] uppercase dark:text-[#94A4B4]">
                Active AI Sessions
              </span>
              <Badge variant="sage" showDot>
                Autopilot
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-[#202B35] dark:text-[#FCFBF8]">
              {automatedCount} Chats
            </div>
            <p className="mt-1 text-[11px] text-[#566573] dark:text-[#94A4B4]">
              n8n AI agent answering autonomously
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566573] uppercase dark:text-[#94A4B4]">
                Human Takeovers
              </span>
              <Badge variant={takeoverCount > 0 ? 'warning' : 'neutral'} showDot>
                {takeoverCount} Active
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-[#202B35] dark:text-[#FCFBF8]">
              {takeoverCount} Handled
            </div>
            <p className="mt-1 text-[11px] text-[#566573] dark:text-[#94A4B4]">
              Automation paused for human replies
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#566573] uppercase dark:text-[#94A4B4]">
                VPS System Load
              </span>
              <Badge
                variant={vpsMetrics.status === 'healthy' ? 'sage' : 'warning'}
                showDot
              >
                {vpsMetrics.status}
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-extrabold font-mono text-[#202B35] dark:text-[#FCFBF8]">
              {vpsMetrics.cpu_percent}% CPU
            </div>
            <p className="mt-1 text-[11px] text-[#566573] dark:text-[#94A4B4]">
              RAM: {vpsMetrics.ram_percent}% · Disk: {vpsMetrics.disk_percent}%
            </p>
          </Card>
        </div>

        {/* CHANNEL & TRIAGE TABS */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Tabs
            items={[
              { id: 'all', label: 'All Live Streams', count: conversations.length },
              {
                id: 'whatsapp',
                label: 'WhatsApp',
                count: conversations.filter((c) => c.platform === 'whatsapp').length,
              },
              {
                id: 'instagram',
                label: 'Instagram',
                count: conversations.filter((c) => c.platform === 'instagram').length,
              },
              { id: 'takeover', label: 'Human Takeover', count: takeoverCount },
              { id: 'automated', label: 'AI Handling', count: automatedCount },
            ]}
            activeId={channelFilter}
            onChange={setChannelFilter}
          />
        </div>

        {/* LIVE CONVERSATION STREAM TABLE */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Realtime Multi-Channel Event Stream</CardTitle>
                <CardDescription>
                  Showing {filteredConversations.length} live operational streams
                </CardDescription>
              </div>
              <Badge variant="sage" showDot>
                Active Polling &amp; Websockets
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#DDD9D0]/60 dark:divide-[#232D3B]/60">
              {filteredConversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
                  No active streams match the selected operational filter.
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F4F2EC]/40 transition dark:hover:bg-[#1B232D]/40"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECE9E1] text-[#202B35] font-bold text-xs shrink-0 dark:bg-[#1E2734] dark:text-[#FCFBF8]">
                        {conv.platform === 'whatsapp' ? 'WA' : 'IG'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#202B35] dark:text-[#FCFBF8]">
                            {conv.contact?.name || 'Customer'}
                          </span>
                          <span className="text-xs font-mono text-[#566573] dark:text-[#94A4B4]">
                            {conv.contact?.phone || conv.contact?.instagram_username || ''}
                          </span>
                          <Badge
                            variant={conv.manual_takeover ? 'warning' : 'sage'}
                            size="sm"
                          >
                            {conv.manual_takeover ? 'Agent Takeover' : 'Autopilot AI'}
                          </Badge>
                          {conv.unread_count > 0 && (
                            <Badge variant="destructive" size="sm">
                              {conv.unread_count} Unread
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#566573] line-clamp-1 dark:text-[#94A4B4]">
                          {conv.last_message || 'Awaiting interaction'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                      <span className="text-[11px] font-mono text-[#566573] mr-2 dark:text-[#94A4B4]">
                        {conv.last_message_at
                          ? formatRelativeTime(conv.last_message_at)
                          : 'Active'}
                      </span>

                      <Button
                        variant={conv.manual_takeover ? 'secondary' : 'tertiary'}
                        size="xs"
                        onClick={() => toggleManualTakeover(conv.id)}
                      >
                        {conv.manual_takeover ? 'Resume AI' : 'Take Over'}
                      </Button>

                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => router.push(`/whatsapp?id=${conv.id}`)}
                        rightIcon={<ArrowRight className="h-3 w-3" />}
                      >
                        Open Chat
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
