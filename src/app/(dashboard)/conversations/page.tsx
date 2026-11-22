'use client';

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Calendar,
  ExternalLink,
  User,
  Filter,
  Search,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Languages,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { AdminConversation } from '@/lib/types/dashboard';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  extractSessionMetadata,
  getConversationHistoryDisplayName,
} from '@/lib/whatsapp/session-identity';
import { SessionMessageInspectorModal } from '@/components/conversations/session-message-inspector-modal';

export default function ConversationHistoryPage() {
  const { conversations, messages, fetchConversationMessages } = useDashboardStore();

  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inspector modal state
  const [inspectingConv, setInspectingConv] = useState<AdminConversation | null>(null);

  // Filter & search
  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return conversations.filter((c) => {
      // Channel
      if (channelFilter !== 'all' && c.platform !== channelFilter) return false;

      // Status
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      // Search
      if (q) {
        const meta = extractSessionMetadata(c);
        const sessionName = (meta.session_customer_name || '').toLowerCase();
        const contactName = (c.contact?.name || '').toLowerCase();
        const phone = (c.contact?.phone || '').toLowerCase();
        const msg = (c.last_message || '').toLowerCase();
        const id = c.id.toLowerCase();

        const match =
          sessionName.includes(q) ||
          contactName.includes(q) ||
          phone.includes(q) ||
          msg.includes(q) ||
          id.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [conversations, channelFilter, statusFilter, searchQuery]);

  // Sort chronologically (latest first)
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.created_at).getTime();
      const timeB = new Date(b.last_message_at || b.created_at).getTime();
      return timeB - timeA;
    });
  }, [filteredConversations]);

  // Pagination
  const totalItems = sortedConversations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedConversations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedConversations.slice(start, start + pageSize);
  }, [sortedConversations, page, pageSize]);

  const handleInspect = async (conv: AdminConversation) => {
    if (!messages[conv.id]) {
      await fetchConversationMessages(conv.id);
    }
    setInspectingConv(conv);
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopNavbar
        title="Conversation History"
        subtitle="Chronological historical transcripts, session identification, and isolated message ledgers"
        breadcrumbs={[
          { label: 'Communication', href: '/whatsapp' },
          { label: 'Conversation History' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        <PageHeader
          title="Conversation Archives &amp; Ledgers"
          subtitle="Audit-compliant session histories displaying customer self-identified names, isolated transcripts, and status lifecycles"
          category="Communication"
          actions={
            <div className="w-72">
              <SearchInput
                value={searchQuery}
                onValueChange={(val) => {
                  setSearchQuery(val);
                  setPage(1);
                }}
                placeholder="Search by session ID, name, phone, message..."
                size="sm"
              />
            </div>
          }
        />

        {/* Filters Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
          <Tabs
            items={[
              { id: 'all', label: `All Channels (${conversations.length})` },
              {
                id: 'whatsapp',
                label: `WhatsApp (${conversations.filter((c) => c.platform === 'whatsapp').length})`,
              },
              {
                id: 'instagram',
                label: `Instagram (${conversations.filter((c) => c.platform === 'instagram').length})`,
              },
            ]}
            activeId={channelFilter}
            onChange={(tab) => {
              setChannelFilter(tab);
              setPage(1);
            }}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#566573] dark:text-[#94A4B4]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-[#DDD9D0] bg-white text-xs text-[#202B35] focus:outline-hidden focus:ring-1 focus:ring-[#7D8F82] dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8]"
            >
              <option value="all">All Session Statuses</option>
              <option value="open">Open / In Progress</option>
              <option value="waiting_for_customer">Waiting for Customer</option>
              <option value="completed">Completed / Closed</option>
              <option value="needs_attention">Needs Attention</option>
            </select>
          </div>
        </div>

        {/* Chronological Session List */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Archived Chat Sessions</CardTitle>
                <CardDescription>
                  Showing {paginatedConversations.length} of {totalItems} filtered sessions
                </CardDescription>
              </div>
              <Badge variant="sage" size="sm">
                Isolated Sessions
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-[#DDD9D0]/60 dark:divide-[#232D3B]/60">
              {paginatedConversations.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
                  No conversation sessions match your filter criteria.
                </div>
              ) : (
                paginatedConversations.map((conv) => {
                  const meta = extractSessionMetadata(conv);
                  const sessionName = getConversationHistoryDisplayName(conv);
                  const convMessages = messages[conv.id] || [];
                  const isHistorical = conv.status === 'completed' || Boolean(meta.closed_at);

                  return (
                    <div
                      key={conv.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F4F2EC]/40 transition dark:hover:bg-[#1B232D]/30"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Channel Badge */}
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#202B35] text-[#FCFBF8] font-bold text-xs font-mono shrink-0 dark:bg-[#FCFBF8] dark:text-[#202B35]">
                          {conv.platform === 'whatsapp' ? 'WA' : 'IG'}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#202B35] dark:text-[#FCFBF8]">
                              {sessionName}
                            </span>
                            <Badge variant="navy" size="sm">
                              Session #{meta.session_number || 1}
                            </Badge>
                            <Badge variant={conv.status === 'completed' ? 'neutral' : 'sage'} size="sm">
                              {conv.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono text-[#566573] dark:text-[#94A4B4]">
                            <span>{conv.contact?.phone || 'No phone'}</span>
                            <span>·</span>
                            <span>ID: {conv.id.slice(0, 8)}...</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Languages className="h-3 w-3 text-[#7D8F82]" />
                              <span>{meta.selected_language || 'English'}</span>
                            </span>
                          </div>

                          <p className="text-xs text-[#566573] line-clamp-1 max-w-xl dark:text-[#94A4B4]">
                            {conv.last_message || 'Session active'}
                          </p>
                        </div>
                      </div>

                      {/* Right Details & Action Buttons */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        <div className="text-right text-xs">
                          <span className="font-mono text-[#566573] block dark:text-[#94A4B4]">
                            {conv.last_message_at ? formatRelativeTime(conv.last_message_at) : 'Active'}
                          </span>
                          <span className="text-[10px] text-[#7D8F82] font-mono block dark:text-[#6D8092]">
                            {convMessages.length > 0
                              ? `${convMessages.length} msgs`
                              : conv.last_message
                              ? 'Active thread'
                              : '0 msgs'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleInspect(conv)}
                            rightIcon={<MessageSquare className="h-3 w-3" />}
                          >
                            Inspect Transcript
                          </Button>

                          {!isHistorical && (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => {
                                window.location.href = `/whatsapp?id=${conv.id}`;
                              }}
                              rightIcon={<ExternalLink className="h-3 w-3" />}
                            >
                              Live Chat
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagination Bar */}
        <div className="p-4 rounded-xl border border-[#DDD9D0] bg-white flex flex-wrap items-center justify-between gap-3 text-xs dark:border-[#232D3B] dark:bg-[#141A22]">
          <div className="flex items-center gap-2 text-[#566573] dark:text-[#94A4B4]">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, totalItems)} to{' '}
              {Math.min(page * pageSize, totalItems)} of {totalItems} sessions
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
            >
              Previous
            </Button>

            <span className="px-2 font-mono font-bold text-[#202B35] dark:text-[#FCFBF8]">
              {page} / {totalPages}
            </span>

            <Button
              variant="secondary"
              size="xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Historical Session Message Inspector Modal */}
      {inspectingConv && (
        <SessionMessageInspectorModal
          isOpen={Boolean(inspectingConv)}
          onClose={() => setInspectingConv(null)}
          conversation={inspectingConv}
          messages={messages[inspectingConv.id] || []}
        />
      )}
    </div>
  );
}
