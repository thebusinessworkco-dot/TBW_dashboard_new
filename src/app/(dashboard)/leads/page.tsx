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
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatINR,
  getLeadStatusBadge,
} from '@/lib/utils';
import { LeadSource, LeadStatus } from '@/lib/types/dashboard';

export default function LeadsPage() {
  const router = useRouter();
  const { leads, updateLeadStatus, addLead } = useDashboardStore();

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
    const matchesSearch =
      lead.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.contact_phone && lead.contact_phone.includes(searchQuery)) ||
      (lead.contact_email && lead.contact_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.instagram_username && lead.instagram_username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.service_interest.toLowerCase().includes(searchQuery.toLowerCase());

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
      google_sheet_row_id: `G_SHEET_ROW_${Date.now().toString().slice(-4)}`,
    });

    setLeadName('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadIg('');
    setLeadNotes('');
    setNewLeadModalOpen(false);
  };

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Leads Pipeline (Google Sheets Synced)"
        subtitle="Track leads captured from Website, WhatsApp, and the new Instagram Leads worksheet."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Google Sheets Sync Architecture Banner */}
        <div className="rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141413]">
                  Connected Master Google Spreadsheet
                </h3>
                <p className="text-xs text-[#555047]">
                  Tabs: <strong>Website Leads</strong> (Existing) · <strong>WhatsApp Leads</strong> (Existing) · <strong>Instagram Leads</strong> (New Tab)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active via n8n
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection & Search / Filter Controls */}
        <div className="flex flex-col gap-4 rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFECE4] pb-4">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  activeTab === 'all'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#555047] hover:bg-[#EFECE4]'
                }`}
              >
                All Leads ({leads.length})
              </button>
              <button
                onClick={() => setActiveTab('website')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  activeTab === 'website'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#555047] hover:bg-[#EFECE4]'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Website Leads</span>
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  activeTab === 'whatsapp'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#555047] hover:bg-[#EFECE4]'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                <span>WhatsApp Leads</span>
              </button>
              <button
                onClick={() => setActiveTab('instagram')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  activeTab === 'instagram'
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#555047] hover:bg-[#EFECE4]'
                }`}
              >
                <Instagram className="h-3.5 w-3.5 text-[#E1306C]" />
                <span>Instagram Leads</span>
              </button>
            </div>

            <button
              onClick={() => setNewLeadModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2A2825] shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lead</span>
            </button>
          </div>

          {/* Search bar & status filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756D]" />
              <input
                type="text"
                placeholder="Search leads by name, phone, email, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#7A756D]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-hidden rounded-xl border border-[#E2DDD3] bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2DDD3] bg-[#FAF8F5] text-[11px] font-bold uppercase tracking-wider text-[#7A756D]">
                  <th className="py-3 px-4">Lead Contact</th>
                  <th className="py-3 px-4">Source Channel</th>
                  <th className="py-3 px-4">Service Interest</th>
                  <th className="py-3 px-4">Est. Value (INR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Google Sheet ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE4] text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#7A756D]">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const statusBadge = getLeadStatusBadge(lead.status);

                    return (
                      <tr key={lead.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#141413]">
                            {lead.contact_name}
                          </div>
                          <div className="text-[11px] text-[#7A756D]">
                            {lead.contact_phone || (lead.instagram_username ? `@${lead.instagram_username}` : lead.contact_email)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-[#FAF8F5] border border-[#E2DDD3] text-[#141413] capitalize">
                            {lead.source === 'whatsapp' && <MessageSquare className="h-3 w-3 text-[#25D366]" />}
                            {lead.source === 'instagram' && <Instagram className="h-3 w-3 text-[#E1306C]" />}
                            {lead.source === 'website' && <Globe className="h-3 w-3 text-[#141413]" />}
                            <span>{lead.source}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#141413]">
                          {lead.service_interest}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-[#141413]">
                          {lead.estimated_value ? formatINR(lead.estimated_value) : '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                            className={`rounded-md px-2 py-1 text-xs font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} focus:outline-none`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#7A756D]">
                          {lead.google_sheet_row_id || 'Auto-Syncing'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {lead.source === 'whatsapp' && (
                              <button
                                onClick={() => router.push('/whatsapp')}
                                title="Open WhatsApp Chat"
                                className="rounded-md border border-[#E2DDD3] p-1.5 text-[#555047] hover:bg-white hover:text-[#141413]"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                              </button>
                            )}

                            {lead.source === 'instagram' && (
                              <button
                                onClick={() => router.push('/instagram')}
                                title="Open Instagram DM"
                                className="rounded-md border border-[#E2DDD3] p-1.5 text-[#555047] hover:bg-white hover:text-[#141413]"
                              >
                                <Instagram className="h-3.5 w-3.5 text-[#E1306C]" />
                              </button>
                            )}

                            <button
                              onClick={() => router.push('/quotations')}
                              title="Create Quotation for Lead"
                              className="rounded-md bg-[#141413] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#2A2825]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#E2DDD3] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#141413]">
                Add New Lead (Syncs with Google Sheets)
              </h3>
              <button
                onClick={() => setNewLeadModalOpen(false)}
                className="text-[#7A756D] hover:text-[#141413]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Contact Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  placeholder="e.g. Ramesh Patel"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                    placeholder="+91 98200 00000"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={leadIg}
                    onChange={(e) => setLeadIg(e.target.value)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                    placeholder="e.g. business_user"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Lead Source Channel *
                  </label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  >
                    <option value="whatsapp">WhatsApp Leads Tab</option>
                    <option value="instagram">Instagram Leads Tab (New)</option>
                    <option value="website">Website Leads Tab</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-[#555047] mb-1">
                    Estimated Deal Value (INR ₹)
                  </label>
                  <input
                    type="number"
                    value={leadEstValue}
                    onChange={(e) => setLeadEstValue(e.target.value)}
                    className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Service Category Interest
                </label>
                <select
                  value={leadService}
                  onChange={(e) => setLeadService(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                >
                  {servicesList.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Notes & Requirements
                </label>
                <textarea
                  rows={3}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Specific automations needed, budget notes, etc."
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFECE4]">
                <button
                  type="button"
                  onClick={() => setNewLeadModalOpen(false)}
                  className="rounded-lg border border-[#E2DDD3] px-4 py-2 font-semibold text-[#555047] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#141413] px-4 py-2 font-semibold text-white hover:bg-[#2A2825]"
                >
                  Save & Append to Google Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
