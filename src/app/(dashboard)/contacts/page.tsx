'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Tag,
  CheckSquare,
  Square,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { AdminContact, AdminConversation } from '@/lib/types/dashboard';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  extractContactTags,
  extractSessionMetadata,
  getContactDirectoryDisplayName,
} from '@/lib/whatsapp/session-identity';
import { CustomerProfileDrawer } from '@/components/contacts/customer-profile-drawer';
import {
  CreateContactModal,
  EditContactModal,
  DeleteContactSafeguardModal,
  BulkAddTagModal,
} from '@/components/contacts/contact-modals';

export default function ContactDirectoryPage() {
  const {
    conversations,
    createContact,
    updateContact,
    deleteContact,
    bulkAddTags,
    bulkDeleteContacts,
    refreshData,
    isLoading,
  } = useDashboardStore();

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'telegram'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'today' | '7d'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortField, setSortField] = useState<'activity' | 'name' | 'created' | 'conversations'>('activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection state for bulk operations
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  // Drawer & Modals state
  const [activeProfileContact, setActiveProfileContact] = useState<AdminContact | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<AdminContact | null>(null);
  const [deletingContact, setDeletingContact] = useState<AdminContact | null>(null);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 1. Extract Unique Contacts and pair with conversations
  const contactDirectoryItems = useMemo(() => {
    const contactMap = new Map<
      string,
      {
        contact: AdminContact;
        conversations: AdminConversation[];
        latestConv: AdminConversation | null;
        totalConvs: number;
        tags: string[];
        latestSessionName: string | null;
        lastActivityTime: number;
        createdTime: number;
        isActive: boolean;
      }
    >();

    // Index from conversations
    for (const conv of conversations) {
      if (!conv.contact) continue;
      const c = conv.contact;
      const key = c.id || c.phone || 'unknown';

      if (!contactMap.has(key)) {
        contactMap.set(key, {
          contact: c,
          conversations: [],
          latestConv: null,
          totalConvs: 0,
          tags: extractContactTags(c),
          latestSessionName: null,
          lastActivityTime: 0,
          createdTime: new Date(c.created_at || 0).getTime(),
          isActive: false,
        });
      }

      const item = contactMap.get(key)!;
      item.conversations.push(conv);
      item.totalConvs += 1;

      const convTime = new Date(conv.last_message_at || conv.created_at).getTime();
      if (convTime > item.lastActivityTime) {
        item.lastActivityTime = convTime;
        item.latestConv = conv;
        const meta = extractSessionMetadata(conv);
        item.latestSessionName = meta.session_customer_name || null;
      }

      if (conv.status === 'open' || conv.status === 'waiting_for_customer') {
        item.isActive = true;
      }
    }

    return Array.from(contactMap.values());
  }, [conversations]);

  // Dynamic Tags collection
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    contactDirectoryItems.forEach((it) => {
      it.tags.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [contactDirectoryItems]);

  const [currentTime, setCurrentTime] = useState<number>(0);
  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  // 2. Advanced Search & Filtering
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const now = currentTime || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    return contactDirectoryItems.filter((item) => {
      const c = item.contact;
      const customName = (c.custom_name || c.name || '').toLowerCase();
      const sessionName = (item.latestSessionName || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const company = (c.company_name || '').toLowerCase();
      const channel = (item.latestConv?.platform || 'whatsapp').toLowerCase();
      const sessionIds = item.conversations.map((cv) => cv.id.toLowerCase());

      // Search match
      if (term) {
        const matchesTerm =
          customName.includes(term) ||
          sessionName.includes(term) ||
          phone.includes(term) ||
          company.includes(term) ||
          channel.includes(term) ||
          sessionIds.some((sid) => sid.includes(term));

        if (!matchesTerm) return false;
      }

      // Channel filter
      if (channelFilter !== 'all' && channel !== channelFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;

      // Activity filter
      if (activityFilter === 'today' && now - item.lastActivityTime > oneDay) return false;
      if (activityFilter === '7d' && now - item.lastActivityTime > sevenDays) return false;

      // Tag filter
      if (selectedTag !== 'all' && !item.tags.includes(selectedTag)) {
        return false;
      }

      return true;
    });
  }, [contactDirectoryItems, searchTerm, channelFilter, statusFilter, activityFilter, selectedTag]);

  // 3. Sorting
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'activity') {
        comparison = b.lastActivityTime - a.lastActivityTime;
      } else if (sortField === 'created') {
        comparison = b.createdTime - a.createdTime;
      } else if (sortField === 'name') {
        const nameA = a.contact.custom_name || a.contact.name || '';
        const nameB = b.contact.custom_name || b.contact.name || '';
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'conversations') {
        comparison = b.totalConvs - a.totalConvs;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortOrder]);

  // 4. Pagination
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedContactIds.size === paginatedItems.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(paginatedItems.map((it) => it.contact.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // CSV Export Functionality
  const handleExportCSV = (exportSelectedOnly = false) => {
    const listToExport = exportSelectedOnly
      ? sortedItems.filter((it) => selectedContactIds.has(it.contact.id))
      : sortedItems;

    if (listToExport.length === 0) {
      showToast('No contact records to export.');
      return;
    }

    const headers = [
      'Contact ID',
      'Admin Custom Name',
      'Latest Session Customer Name',
      'Phone Number',
      'Channel',
      'Company Name',
      'Tags',
      'Total Conversations',
      'Latest Conversation Status',
      'Created Date',
      'Last Activity',
    ];

    const rows = listToExport.map((it) => {
      const c = it.contact;
      return [
        `"${c.id}"`,
        `"${(c.custom_name || c.name || '').replace(/"/g, '""')}"`,
        `"${(it.latestSessionName || '').replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        `"${it.latestConv?.platform || 'whatsapp'}"`,
        `"${(c.company_name || '').replace(/"/g, '""')}"`,
        `"${it.tags.join('; ')}"`,
        it.totalConvs,
        `"${it.latestConv?.status || 'open'}"`,
        `"${c.created_at || ''}"`,
        `"${it.latestConv?.last_message_at || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TBW_Contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${listToExport.length} contact profile(s) to CSV.`);
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopNavbar
        title="Contact Directory"
        subtitle="Customer identity registry with persistent admin naming, session tracking, and business linking"
        breadcrumbs={[
          { label: 'Communication', href: '/whatsapp' },
          { label: 'Contact Directory' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#202B35] text-[#FCFBF8] px-4 py-2.5 shadow-xl text-xs flex items-center gap-2 border border-[#7D8F82]/40 dark:bg-[#FCFBF8] dark:text-[#202B35]">
            <CheckCircle2 className="h-4 w-4 text-[#7D8F82]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Page Header with Action Buttons */}
        <PageHeader
          title="Customer Contact Directory"
          subtitle="Unified customer identity registry preserving permanent admin designations alongside session self-identifications"
          category="Communication"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportCSV(false)}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Export CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Create Contact
              </Button>
            </div>
          }
        />

        {/* Advanced Search & Filtering Bar */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="col-span-1 md:col-span-2">
              <SearchInput
                value={searchTerm}
                onValueChange={(val) => {
                  setSearchTerm(val);
                  setPage(1);
                }}
                placeholder="Search by custom name, session name, phone, session ID..."
                size="sm"
              />
            </div>

            {/* Channel Filter */}
            <div>
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value as any);
                  setPage(1);
                }}
                className="w-full h-8 px-2.5 rounded-lg border border-[#DDD9D0] bg-white text-xs text-[#202B35] focus:outline-hidden focus:ring-1 focus:ring-[#7D8F82] dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8]"
              >
                <option value="all">All Channels (WhatsApp, IG, Telegram)</option>
                <option value="whatsapp">WhatsApp Cloud API</option>
                <option value="instagram">Instagram Direct</option>
                <option value="telegram">Telegram Alerts</option>
              </select>
            </div>

            {/* Activity Recency Filter */}
            <div>
              <select
                value={activityFilter}
                onChange={(e) => {
                  setActivityFilter(e.target.value as any);
                  setPage(1);
                }}
                className="w-full h-8 px-2.5 rounded-lg border border-[#DDD9D0] bg-white text-xs text-[#202B35] focus:outline-hidden focus:ring-1 focus:ring-[#7D8F82] dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8]"
              >
                <option value="all">All Activity Times</option>
                <option value="today">Active Today</option>
                <option value="7d">Active Last 7 Days</option>
              </select>
            </div>
          </div>

          {/* Secondary Controls: Tags, Sorting & View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60 text-xs">
            {/* Tags Pills Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[#566573] mr-1 dark:text-[#94A4B4]">Tags:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTag('all');
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  selectedTag === 'all'
                    ? 'bg-[#202B35] text-[#FCFBF8] dark:bg-[#FCFBF8] dark:text-[#202B35]'
                    : 'bg-[#ECE9E1] text-[#566573] hover:text-[#202B35] dark:bg-[#1E2734] dark:text-[#94A4B4]'
                }`}
              >
                All
              </button>
              {allAvailableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTag(tag);
                    setPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                    selectedTag === tag
                      ? 'bg-[#202B35] text-[#FCFBF8] dark:bg-[#FCFBF8] dark:text-[#202B35]'
                      : 'bg-[#ECE9E1] text-[#566573] hover:text-[#202B35] dark:bg-[#1E2734] dark:text-[#94A4B4]'
                  }`}
                >
                  <Tag className="h-2.5 w-2.5" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>

            {/* Right: Sorting & View Mode Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Sort selector */}
              <div className="flex items-center gap-1 bg-[#F4F2EC] p-1 rounded-lg border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848]">
                <ArrowUpDown className="h-3 w-3 text-[#7D8F82] ml-1" />
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  className="bg-transparent text-xs text-[#202B35] focus:outline-hidden dark:text-[#FCFBF8] pr-2"
                >
                  <option value="activity">Last Active</option>
                  <option value="name">Name</option>
                  <option value="created">Created Date</option>
                  <option value="conversations">Total Sessions</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded text-[#566573] hover:text-[#202B35] dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]"
                >
                  {sortOrder}
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-[#F4F2EC] p-0.5 rounded-lg border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848]">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white shadow-2xs text-[#202B35] dark:bg-[#10161E] dark:text-[#FCFBF8]'
                      : 'text-[#7D8F82] hover:text-[#202B35] dark:hover:text-[#FCFBF8]'
                  }`}
                  title="Table View"
                >
                  <ListIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'card'
                      ? 'bg-white shadow-2xs text-[#202B35] dark:bg-[#10161E] dark:text-[#FCFBF8]'
                      : 'text-[#7D8F82] hover:text-[#202B35] dark:hover:text-[#FCFBF8]'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Bulk Actions Floating Bar */}
        {selectedContactIds.size > 0 && (
          <div className="p-3 rounded-xl bg-[#202B35] text-[#FCFBF8] flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in duration-200 dark:bg-[#141A22] dark:border dark:border-[#232D3B]">
            <div className="flex items-center gap-2">
              <span className="font-bold bg-[#7D8F82]/30 px-2.5 py-1 rounded-lg">
                {selectedContactIds.size} Contact(s) Selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedContactIds(new Set())}
                className="text-xs text-[#DDD9D0] hover:text-white underline cursor-pointer"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setIsBulkTagModalOpen(true)}
                leftIcon={<Tag className="h-3 w-3" />}
              >
                Add Tag
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => handleExportCSV(true)}
                leftIcon={<Download className="h-3 w-3" />}
              >
                Export Selected
              </Button>
              <Button
                variant="destructive"
                size="xs"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                leftIcon={<Trash2 className="h-3 w-3" />}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Main Contact List: Table View OR Card View */}
        {viewMode === 'table' ? (
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="w-10">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="cursor-pointer text-[#7D8F82] hover:text-[#202B35] dark:hover:text-[#FCFBF8]"
                    >
                      {selectedContactIds.size > 0 && selectedContactIds.size === paginatedItems.length ? (
                        <CheckSquare className="h-4 w-4 text-[#202B35] dark:text-[#FCFBF8]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Customer Profile &amp; Names</TableHead>
                  <TableHead>Channel &amp; Number</TableHead>
                  <TableHead>Tags &amp; Labels</TableHead>
                  <TableHead>Sessions &amp; Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow hover={false}>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
                      No contacts found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => {
                    const c = item.contact;
                    const isSelected = selectedContactIds.has(c.id);
                    const nameInfo = getContactDirectoryDisplayName(c, item.latestConv);

                    return (
                      <TableRow key={c.id} className={isSelected ? 'bg-[#ECE9E1]/50 dark:bg-[#1E2734]/50' : ''}>
                        {/* Checkbox */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectOne(c.id)}
                            className="cursor-pointer text-[#7D8F82] hover:text-[#202B35] dark:hover:text-[#FCFBF8]"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-[#202B35] dark:text-[#FCFBF8]" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>

                        {/* Customer Profile & Names */}
                        <TableCell>
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => setActiveProfileContact(c)}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#202B35] text-[#FCFBF8] font-bold text-xs font-mono shrink-0 dark:bg-[#FCFBF8] dark:text-[#202B35] group-hover:ring-2 group-hover:ring-[#7D8F82]">
                              {(nameInfo.primaryName || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-[#202B35] block dark:text-[#FCFBF8] group-hover:text-[#7D8F82]">
                                  {nameInfo.primaryName}
                                </span>
                                {nameInfo.secondaryName && (
                                  <span
                                    className="text-[10px] text-[#7D8F82] bg-[#ECE9E1] px-1.5 py-0.5 rounded-md font-medium dark:bg-[#1E2734] dark:text-[#94A4B4]"
                                    title={`Latest Session Name: ${nameInfo.secondaryName}`}
                                  >
                                    Session: {nameInfo.secondaryName}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#566573] dark:text-[#94A4B4]">
                                {c.company_name || 'Individual Client'}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Channel & Number */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#202B35] dark:text-[#FCFBF8]">
                              <Phone className="h-3 w-3 text-[#7D8F82]" />
                              <span>{c.phone || 'No phone'}</span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D8F82] dark:text-[#94A4B4]">
                              {item.latestConv?.platform || 'whatsapp'} cloud api
                            </span>
                          </div>
                        </TableCell>

                        {/* Tags */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {item.tags.length === 0 ? (
                              <span className="text-[11px] text-[#566573] italic dark:text-[#94A4B4]">No tags</span>
                            ) : (
                              item.tags.map((t) => (
                                <Badge key={t} variant="neutral" size="sm">
                                  {t}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>

                        {/* Sessions & Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={item.isActive ? 'sage' : 'neutral'} size="sm">
                                {item.latestConv?.status || 'Open'}
                              </Badge>
                              <span className="text-xs font-semibold text-[#566573] dark:text-[#94A4B4]">
                                {item.totalConvs} {item.totalConvs === 1 ? 'session' : 'sessions'}
                              </span>
                            </div>
                            {item.latestConv?.last_message && (
                              <p className="text-[11px] text-[#566573] line-clamp-1 max-w-xs dark:text-[#94A4B4]">
                                {item.latestConv.last_message}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Last Activity */}
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <span className="font-mono text-[#566573] block dark:text-[#94A4B4]">
                              {item.lastActivityTime ? formatRelativeTime(new Date(item.lastActivityTime).toISOString()) : 'Active'}
                            </span>
                            <span className="text-[10px] text-[#7D8F82] block dark:text-[#6D8092]">
                              Registered: {new Date(c.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>

                        {/* Action Buttons */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => setActiveProfileContact(c)}
                            >
                              Profile
                            </Button>
                            {item.latestConv && (
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => {
                                  window.location.href = `/whatsapp?id=${item.latestConv?.id}`;
                                }}
                                title="Open Live WhatsApp Inbox"
                              >
                                Chat
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="xs"
                              iconOnly
                              onClick={() => setEditingContact(c)}
                              title="Edit Contact"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              iconOnly
                              onClick={() => setDeletingContact(c)}
                              title="Delete Contact"
                            >
                              <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* CARD GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedItems.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
                No customer contacts matching your criteria.
              </div>
            ) : (
              paginatedItems.map((item) => {
                const c = item.contact;
                const isSelected = selectedContactIds.has(c.id);
                const nameInfo = getContactDirectoryDisplayName(c, item.latestConv);

                return (
                  <Card
                    key={c.id}
                    className={`p-5 flex flex-col justify-between hover:border-[#7D8F82] transition ${
                      isSelected ? 'ring-2 ring-[#202B35] dark:ring-[#FCFBF8]' : ''
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex items-center gap-3 min-w-0 cursor-pointer"
                          onClick={() => setActiveProfileContact(c)}
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#202B35] text-[#FCFBF8] font-bold text-sm font-mono shrink-0 dark:bg-[#FCFBF8] dark:text-[#202B35]">
                            {(nameInfo.primaryName || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-sm sm:text-base text-[#202B35] truncate dark:text-[#FCFBF8]">
                              {nameInfo.primaryName}
                            </h3>
                            {nameInfo.secondaryName && (
                              <span className="text-[11px] text-[#7D8F82] font-medium block truncate dark:text-[#94A4B4]">
                                Session: {nameInfo.secondaryName}
                              </span>
                            )}
                          </div>
                        </div>

                        <Badge variant={item.isActive ? 'sage' : 'neutral'} size="sm">
                          {item.latestConv?.status || 'Open'}
                        </Badge>
                      </div>

                      {/* Phone & Details */}
                      <div className="mt-4 pt-3 border-t border-[#DDD9D0]/60 space-y-2 text-xs dark:border-[#232D3B]/60">
                        <div className="flex items-center gap-1.5 font-mono text-[#566573] dark:text-[#94A4B4]">
                          <Phone className="h-3.5 w-3.5 text-[#7D8F82]" />
                          <span>{c.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#566573] dark:text-[#94A4B4]">
                          <Building2 className="h-3.5 w-3.5 text-[#7D8F82]" />
                          <span>{c.company_name || 'Individual Client'}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.tags.length === 0 ? (
                          <span className="text-[11px] text-[#566573] italic dark:text-[#94A4B4]">No tags</span>
                        ) : (
                          item.tags.map((t) => (
                            <Badge key={t} variant="neutral" size="sm">
                              {t}
                            </Badge>
                          ))
                        )}
                      </div>

                      {/* Last Message Preview */}
                      {item.latestConv?.last_message && (
                        <div className="mt-3 p-2.5 rounded-xl bg-[#F4F2EC]/60 border border-[#DDD9D0]/60 text-[11px] text-[#566573] line-clamp-2 dark:bg-[#151C24] dark:border-[#232D3B] dark:text-[#94A4B4]">
                          {item.latestConv.last_message}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 pt-3 border-t border-[#DDD9D0]/60 flex items-center justify-between dark:border-[#232D3B]/60">
                      <span className="text-[11px] text-[#566573] font-mono dark:text-[#94A4B4]">
                        {item.totalConvs} Session(s)
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setActiveProfileContact(c)}
                        >
                          Profile
                        </Button>
                        {item.latestConv && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              window.location.href = `/whatsapp?id=${item.latestConv?.id}`;
                            }}
                          >
                            Chat
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="xs"
                          iconOnly
                          onClick={() => setEditingContact(c)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          iconOnly
                          onClick={() => setDeletingContact(c)}
                        >
                          <Trash2 className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 rounded-xl border border-[#DDD9D0] bg-white flex flex-wrap items-center justify-between gap-3 text-xs dark:border-[#232D3B] dark:bg-[#141A22]">
          <div className="flex items-center gap-2 text-[#566573] dark:text-[#94A4B4]">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, totalItems)} to{' '}
              {Math.min(page * pageSize, totalItems)} of {totalItems} contacts
            </span>
            <span>·</span>
            <span>Page size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-transparent font-bold border border-[#DDD9D0] rounded-md px-1.5 py-0.5 focus:outline-hidden dark:border-[#232D3B]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
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

      {/* Customer 360 Profile Slide-Over Drawer */}
      <CustomerProfileDrawer
        isOpen={Boolean(activeProfileContact)}
        onClose={() => setActiveProfileContact(null)}
        contact={activeProfileContact}
        onEditContact={(c) => setEditingContact(c)}
        onDeleteContact={(c) => setDeletingContact(c)}
      />

      {/* Create Contact Modal */}
      <CreateContactModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data) => {
          const res = await createContact(data);
          if (res.success) {
            showToast('Customer contact created successfully.');
            return true;
          }
          return false;
        }}
      />

      {/* Edit Contact Modal */}
      <EditContactModal
        isOpen={Boolean(editingContact)}
        onClose={() => setEditingContact(null)}
        contact={editingContact}
        onSubmit={async (cid, data) => {
          const res = await updateContact(cid, data);
          if (res.success) {
            showToast('Contact profile updated permanently.');
            if (activeProfileContact?.id === cid) {
              setActiveProfileContact((prev) => (prev ? { ...prev, ...data } : null));
            }
            return true;
          }
          return false;
        }}
      />

      {/* Delete Safeguard Modal */}
      <DeleteContactSafeguardModal
        isOpen={Boolean(deletingContact)}
        onClose={() => setDeletingContact(null)}
        contact={deletingContact}
        onConfirm={async (cid, phone) => {
          const res = await deleteContact(cid, phone);
          if (res.success) {
            showToast(res.message || 'Contact deleted with safeguards preserved.');
            if (activeProfileContact?.id === cid) {
              setActiveProfileContact(null);
            }
            return true;
          }
          return false;
        }}
      />

      {/* Bulk Add Tag Modal */}
      <BulkAddTagModal
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        selectedCount={selectedContactIds.size}
        onConfirm={async (tag) => {
          const res = await bulkAddTags(Array.from(selectedContactIds), tag);
          if (res.success) {
            showToast(`Added tag "${tag}" to ${res.count} contact(s).`);
            setSelectedContactIds(new Set());
            return true;
          }
          return false;
        }}
      />

      {/* Bulk Delete Confirm Modal */}
      {isBulkDeleteModalOpen && (
        <DeleteContactSafeguardModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          contact={{
            id: 'bulk_selected',
            name: `${selectedContactIds.size} Selected Contacts`,
            created_at: new Date().toISOString(),
          }}
          onConfirm={async () => {
            const list = sortedItems
              .filter((it) => selectedContactIds.has(it.contact.id))
              .map((it) => ({ id: it.contact.id, phone: it.contact.phone || '' }));
            const res = await bulkDeleteContacts(list);
            showToast(`Safely deleted ${res.count} contact(s). Confirmed bookings preserved.`);
            setSelectedContactIds(new Set());
            setIsBulkDeleteModalOpen(false);
            return true;
          }}
        />
      )}
    </div>
  );
}
