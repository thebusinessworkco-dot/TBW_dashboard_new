'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  MessageSquare,
  Globe,
  FileSpreadsheet,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatINR,
  formatDateTime,
  getLeadStatusBadge,
} from '@/lib/utils';
import { LeadSource, LeadStatus } from '@/lib/types/dashboard';

export default function LeadsPage() {
  const router = useRouter();
  const {
    leads,
    updateLeadStatus,
    addLead,
    syncGoogleSheets,
    isSyncingSheets,
    lastSheetsSyncAt,
  } = useDashboardStore();

  const [activeTab, setActiveTab] = useState<'all' | LeadSource>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);

  // New lead form state
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadIg, setLeadIg] = useState('');
  const [leadSource, setLeadSource] = useState<LeadSource>('whatsapp');
  const [leadService, setLeadService] = useState('AI Agents & Chatbots');
  const [leadEstValue, setLeadEstValue] = useState('30000');
  const [leadNotes, setLeadNotes] = useState('');

  const servicesList = [
    'AI Agents & Chatbots',
    'CRM & Sales Automation',
    'Business Workflow Automation',
    'WhatsApp & Social Automation',
    'Custom Automation Solutions',
  ];

  const filteredLeads = leads.filter((lead) => {
    const matchesTab = activeTab === 'all' || lead.source === activeTab;
    const q = searchQuery.toLowerCase().trim();

    const nameMatch = (lead.contact_name || '').toLowerCase().includes(q);
    const phoneMatch = (lead.contact_phone || '').includes(q);
    const emailMatch = (lead.contact_email || '').toLowerCase().includes(q);
    const igMatch = (lead.instagram_username || '').toLowerCase().includes(q);
    const serviceMatch = (lead.service_interest || '').toLowerCase().includes(q);
    const notesMatch = (lead.notes || '').toLowerCase().includes(q);

    const matchesSearch =
      !q || nameMatch || phoneMatch || emailMatch || igMatch || serviceMatch || notesMatch;

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesTab && matchesSearch && matchesStatus;
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) return;

    addLead({
      contact_name: leadName.trim(),
      contact_phone: leadPhone.trim() || undefined,
      contact_email: leadEmail.trim() || undefined,
      instagram_username: leadIg.trim() || undefined,
      source: leadSource,
      service_interest: leadService,
      status: 'new',
      estimated_value: parseFloat(leadEstValue) || 0,
      notes: leadNotes.trim() || undefined,
      google_sheet_row_id: `G_SHEET_MANUAL_${Date.now().toString().slice(-4)}`,
    });

    setLeadName('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadIg('');
    setLeadNotes('');
    setNewLeadModalOpen(false);
  };

  const websiteLeadsCount = leads.filter((l) => l.source === 'website').length;
  const whatsappLeadsCount = leads.filter((l) => l.source === 'whatsapp').length;
  const instagramLeadsCount = leads.filter((l) => l.source === 'instagram').length;

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Leads Pipeline"
        subtitle="Real-time multi-channel pipeline synchronized with Google Sheets master workbook via n8n automation."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Google Sheets Sync Architecture Banner */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                    Connected Master Google Spreadsheet
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync Active
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Synchronizing worksheets: <strong className="text-stone-700">Leads (Website)</strong> · <strong className="text-stone-700">WhatsApp Leads</strong> · <strong className="text-stone-700">Appointments</strong>
                  {lastSheetsSyncAt && (
                    <span className="ml-2 text-stone-400 font-mono text-[11px]">
                      (Last synced: {formatDateTime(lastSheetsSyncAt)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={() => void syncGoogleSheets()}
                disabled={isSyncingSheets}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Fetch latest rows directly from master Google Spreadsheet"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-emerald-700 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                <span>{isSyncingSheets ? 'Syncing with Sheets...' : 'Sync Google Sheets'}</span>
              </button>

              <span className="text-[11px] font-mono text-stone-700 bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-xl font-medium shadow-2xs">
                {leads.length} Total Synced Leads
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection & Search / Filter Controls */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 border border-stone-200/60">
              <button
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Leads <span className="ml-1 text-[11px] text-stone-400">({leads.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('website')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'website'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Globe className="h-3.5 w-3.5 text-stone-500" />
                <span>Website</span>
                <span className="text-[11px] text-stone-400">({websiteLeadsCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'whatsapp'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp</span>
                <span className="text-[11px] text-stone-400">({whatsappLeadsCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('instagram')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'instagram'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Instagram className="h-3.5 w-3.5 text-rose-500" />
                <span>Instagram</span>
                <span className="text-[11px] text-stone-400">({instagramLeadsCount})</span>
              </button>
            </div>

            <button
              onClick={() => setNewLeadModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm shadow-stone-950/10 cursor-pointer self-start sm:self-auto transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Lead</span>
            </button>
          </div>

          {/* Search bar & status filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name, phone, email, handle, service, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500 font-medium">Status Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-1.5 text-xs font-medium text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
              >
                <option value="all">All Statuses ({leads.length})</option>
                <option value="new">New ({leads.filter((l) => l.status === 'new').length})</option>
                <option value="contacted">Contacted ({leads.filter((l) => l.status === 'contacted').length})</option>
                <option value="qualified">Qualified ({leads.filter((l) => l.status === 'qualified').length})</option>
                <option value="converted">Converted ({leads.filter((l) => l.status === 'converted').length})</option>
                <option value="lost">Lost ({leads.filter((l) => l.status === 'lost').length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200/70 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Lead Contact</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Service & Requirements</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Est. Value (INR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Google Sheet ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-xs text-stone-500">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-2">
                        <Search className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-stone-700">No leads found</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {leads.length === 0
                          ? 'Click "Sync Google Sheets" above to synchronize historical records.'
                          : 'Try clearing your search query or selecting a different status filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const statusBadge = getLeadStatusBadge(lead.status);

                    return (
                      <tr key={lead.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700 font-semibold text-xs border border-stone-200/60">
                              {(lead.contact_name || 'L').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-stone-900">
                                {lead.contact_name || 'Lead'}
                              </div>
                              <div className="text-[11px] text-stone-500 font-mono">
                                {lead.contact_phone || (lead.instagram_username ? `@${lead.instagram_username}` : (lead.contact_email || 'No contact info'))}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-stone-100/80 border border-stone-200/60 text-stone-800 capitalize">
                            {lead.source === 'whatsapp' && <MessageSquare className="h-3 w-3 text-emerald-600" />}
                            {lead.source === 'instagram' && <Instagram className="h-3 w-3 text-rose-500" />}
                            {lead.source === 'website' && <Globe className="h-3 w-3 text-stone-600" />}
                            <span>{lead.source}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-stone-800">{lead.service_interest}</div>
                          {lead.notes && (
                            <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5 font-normal" title={lead.notes}>
                              {lead.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-stone-600 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-stone-400" />
                            <span>{formatDateTime(lead.created_at)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-stone-900 font-mono whitespace-nowrap">
                          {lead.estimated_value ? formatINR(lead.estimated_value) : '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} focus:outline-none cursor-pointer transition-all`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-[10px] text-stone-600 bg-stone-100/80 border border-stone-200/60 px-2 py-0.5 rounded-md">
                            {lead.google_sheet_row_id || 'Auto-Syncing'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.source === 'whatsapp' && (
                              <button
                                onClick={() => router.push('/whatsapp')}
                                title="Open WhatsApp Chat"
                                className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                              </button>
                            )}

                            {lead.source === 'instagram' && (
                              <button
                                onClick={() => router.push('/instagram')}
                                title="Open Instagram DM"
                                className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                              >
                                <Instagram className="h-3.5 w-3.5 text-rose-500" />
                              </button>
                            )}

                            <button
                              onClick={() => router.push('/quotations')}
                              title="Create Quotation for Lead"
                              className="rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-stone-800 transition-all shadow-xs cursor-pointer"
                            >
                              Quote ₹
                            </button>
                          </div>
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

      {/* ADD LEAD MODAL */}
      {newLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Add New Inbound Lead
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">Captures lead details and syncs to pipeline</p>
              </div>
              <button
                onClick={() => setNewLeadModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Full Name / Contact *
                </label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  placeholder="e.g. Ramesh Sharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Channel Source
                  </label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="website">Website</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    placeholder="+91 98200 00000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    placeholder="client@company.com"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={leadIg}
                    onChange={(e) => setLeadIg(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Service Interest
                  </label>
                  <select
                    value={leadService}
                    onChange={(e) => setLeadService(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  >
                    {servicesList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Est. Value (INR)
                  </label>
                  <input
                    type="number"
                    value={leadEstValue}
                    onChange={(e) => setLeadEstValue(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 font-mono focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Notes & Inquiries
                </label>
                <textarea
                  rows={2}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Business context, requirements, questions..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setNewLeadModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-all shadow-xs cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
