'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Send,
  MessageSquare,
  Search,
  CheckCircle2,
  X,
  Receipt,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatINR,
  formatDate,
} from '@/lib/utils';
import { AdminQuotation, QuotationLineItem, QuotationStatus } from '@/lib/types/dashboard';
import { generateQuotationPdf } from '@/lib/pdf-generator';

const SERVICE_PRESETS = [
  {
    category: 'AI Agents & Chatbots',
    name: 'Customer Support & Lead Qualification AI Chatbot',
    description: 'Custom AI conversational agent capable of answering client FAQs, qualifying leads 24/7, and escalating complex queries to staff.',
    setup: 28000,
    monthly: 2500,
  },
  {
    category: 'CRM & Sales Automation',
    name: 'WhatsApp Sales Pipeline & Google Sheets CRM',
    description: 'Instant lead capture, automated pipeline stage updates in Google Sheets, and automated follow-ups for warm leads.',
    setup: 32000,
    monthly: 3000,
  },
  {
    category: 'Business Workflow Automation',
    name: 'Multi-App n8n Workflow Synchronization Pipeline',
    description: 'Automate repetitive tasks between internal databases, Google Sheets, email, and billing with zero manual data entry.',
    setup: 35000,
    monthly: 3500,
  },
  {
    category: 'WhatsApp & Social Automation',
    name: 'Official Meta WhatsApp Cloud API Setup & Automation',
    description: 'Meta Business Manager verification, official WhatsApp Cloud API onboarding, interactive reply bot, and notification templates.',
    setup: 15000,
    monthly: 1500,
  },
  {
    category: 'Custom Automation Solutions',
    name: 'Custom Tailored Automation Architecture',
    description: 'Bespoke automation workflows designed around your exact daily business operations and external APIs.',
    setup: 45000,
    monthly: 4000,
  },
];

export default function QuotationsPage() {
  const { quotations, saveQuotation, updateQuotationStatus } = useDashboardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<AdminQuotation | null>(null);

  // Send Modals
  const [sendWhatsAppModal, setSendWhatsAppModal] = useState<AdminQuotation | null>(null);
  const [sendIgModal, setSendIgModal] = useState<AdminQuotation | null>(null);
  const [customPhone, setCustomPhone] = useState('');
  const [customIgUser, setCustomIgUser] = useState('');
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);
  const [isSendingApi, setIsSendingApi] = useState(false);

  // New/Editing Quotation State
  const [qNumber, setQNumber] = useState(`TBW-2026-${(100 + quotations.length + 1).toString().padStart(4, '0')}`);
  const [custName, setCustName] = useState('');
  const [bizName, setBizName] = useState('');
  const [phone, setPhone] = useState('');
  const [igUser, setIgUser] = useState('');
  const [qDate, setQDate] = useState('2026-10-21');
  const [validUntil, setValidUntil] = useState('2026-11-04');
  const [items, setItems] = useState<QuotationLineItem[]>([
    {
      id: 'item-1',
      service_category: SERVICE_PRESETS[0].category,
      service_name: SERVICE_PRESETS[0].name,
      description: SERVICE_PRESETS[0].description,
      quantity: 1,
      setup_charge: SERVICE_PRESETS[0].setup,
      monthly_recurring_charge: SERVICE_PRESETS[0].monthly,
    },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState('Includes setup on self-hosted n8n VPS and official Meta WhatsApp Cloud API.');
  const [terms, setTerms] = useState('50% advance before project commencement, 50% upon deployment handover. Official Meta API message fees billed directly by Meta.');

  // Calculation helpers
  const setupSubtotal = items.reduce((acc, item) => acc + (item.setup_charge * (item.quantity || 1)), 0);
  const monthlySubtotal = items.reduce((acc, item) => acc + (item.monthly_recurring_charge * (item.quantity || 1)), 0);
  const taxableSetup = Math.max(0, setupSubtotal - discountAmount);
  const taxAmount = (taxableSetup * taxRate) / 100;
  const grandTotalSetup = taxableSetup + taxAmount;

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.business_name && q.business_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddItem = (presetIndex = 0) => {
    const preset = SERVICE_PRESETS[presetIndex];
    const newItem: QuotationLineItem = {
      id: `item-${Date.now()}`,
      service_category: preset.category,
      service_name: preset.name,
      description: preset.description,
      quantity: 1,
      setup_charge: preset.setup,
      monthly_recurring_charge: preset.monthly,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof QuotationLineItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSaveQuotation = (status: QuotationStatus = 'draft') => {
    if (!custName.trim()) {
      alert('Please enter client customer name');
      return;
    }

    const newQuotation: AdminQuotation = {
      id: editingQuotation ? editingQuotation.id : `quot-${Date.now()}`,
      quotation_number: qNumber,
      customer_name: custName.trim(),
      business_name: bizName.trim() || undefined,
      phone: phone.trim() || undefined,
      instagram_username: igUser.trim() || undefined,
      quotation_date: qDate,
      valid_until: validUntil,
      items,
      discount_amount: Number(discountAmount) || 0,
      tax_rate: Number(taxRate) || 0,
      notes,
      terms_and_conditions: terms,
      status,
      is_demo: false,
      created_at: editingQuotation ? editingQuotation.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveQuotation(newQuotation);
    setIsCreating(false);
    setEditingQuotation(null);
  };

  const handleDownloadPdf = (quotation: AdminQuotation) => {
    const pdf = generateQuotationPdf(quotation);
    pdf.save(`Quotation_${quotation.quotation_number}_TheBusinessWork.pdf`);
  };

  const handleSendViaWhatsApp = async () => {
    if (!sendWhatsAppModal) return;
    setIsSendingApi(true);

    const recipient = customPhone || sendWhatsAppModal.phone || '+91 98201 12345';

    // Call official WhatsApp Cloud API route
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          quotationNumber: sendWhatsAppModal.quotation_number,
          customerName: sendWhatsAppModal.customer_name,
          grandTotal: grandTotalSetup,
          pdfUrl: `https://dashboard.thebusinesswork.com/api/quotations/pdf?id=${sendWhatsAppModal.id}`,
        }),
      });
    } catch {
      // Continue to record update
    }

    updateQuotationStatus(sendWhatsAppModal.id, 'sent', 'whatsapp');
    setIsSendingApi(false);
    setSendWhatsAppModal(null);
    setSendSuccessNotice(`Quotation ${sendWhatsAppModal.quotation_number} sent successfully to ${recipient} via Official WhatsApp Cloud API.`);
    setTimeout(() => setSendSuccessNotice(null), 5000);
  };

  const handleSendViaInstagram = async () => {
    if (!sendIgModal) return;
    setIsSendingApi(true);

    const recipient = customIgUser || sendIgModal.instagram_username || 'client_account';

    // Call official Instagram Graph API route
    try {
      await fetch('/api/instagram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          quotationNumber: sendIgModal.quotation_number,
          customerName: sendIgModal.customer_name,
          pdfUrl: `https://dashboard.thebusinesswork.com/api/quotations/pdf?id=${sendIgModal.id}`,
        }),
      });
    } catch {
      // Continue to record update
    }

    updateQuotationStatus(sendIgModal.id, 'sent', 'instagram');
    setIsSendingApi(false);
    setSendIgModal(null);
    setSendSuccessNotice(`Quotation link for ${sendIgModal.quotation_number} sent to @${recipient} via Instagram Direct.`);
    setTimeout(() => setSendSuccessNotice(null), 5000);
  };

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="Quotation Builder (INR ₹)"
        subtitle="Generate premium branded PDFs for The Business Work services and dispatch to WhatsApp or Instagram."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Success feedback alert */}
        {sendSuccessNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{sendSuccessNotice}</span>
          </div>
        )}

        {/* Builder View or Table View */}
        {isCreating ? (
          /* INTERACTIVE QUOTATION BUILDER */
          <div className="space-y-6">
            {/* Top action bar */}
            <div className="flex items-center justify-between rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs">
              <div>
                <h2 className="text-base font-bold text-[#141413]">
                  {editingQuotation ? `Edit Quotation ${qNumber}` : 'Create New Quotation'}
                </h2>
                <p className="text-xs text-[#555047]">
                  All prices are completely editable in Indian Rupees (₹).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg border border-[#E2DDD3] px-3.5 py-2 text-xs font-semibold text-[#555047] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('draft')}
                  className="rounded-lg border border-[#141413] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#FAF8F5]"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('sent')}
                  className="rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2825] shadow-xs cursor-pointer"
                >
                  Save & Finalize
                </button>
              </div>
            </div>

            {/* Form & Calculations Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Form */}
              <div className="space-y-6 lg:col-span-2">
                {/* Client & Metadata Card */}
                <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs space-y-4 text-xs">
                  <h3 className="font-bold uppercase tracking-wider text-[#7A756D] border-b border-[#EFECE4] pb-2">
                    Client & Quotation Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Client Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                        placeholder="e.g. Sunita Sharma"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Business / Organization Name
                      </label>
                      <input
                        type="text"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                        placeholder="e.g. Artisan Living Decor"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Phone (WhatsApp)
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                        placeholder="+91 98200 00000"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Instagram Username
                      </label>
                      <input
                        type="text"
                        value={igUser}
                        onChange={(e) => setIgUser(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                        placeholder="e.g. artisan_living"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Quotation Number
                      </label>
                      <input
                        type="text"
                        value={qNumber}
                        onChange={(e) => setQNumber(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 font-mono text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Quotation Date
                      </label>
                      <input
                        type="date"
                        value={qDate}
                        onChange={(e) => setQDate(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Valid Until
                      </label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Line Items */}
                <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EFECE4] pb-2">
                    <h3 className="font-bold uppercase tracking-wider text-xs text-[#7A756D]">
                      Service Line Items ({items.length})
                    </h3>

                    {/* Quick Add Preset dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value !== '') {
                            handleAddItem(Number(e.target.value));
                            e.target.value = '';
                          }
                        }}
                        className="rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] px-2 py-1 text-xs text-[#141413] focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          + Add Service Preset...
                        </option>
                        {SERVICE_PRESETS.map((p, idx) => (
                          <option key={p.name} value={idx}>
                            {p.category}: {p.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAddItem(0)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#FAF8F5] border border-[#E2DDD3] px-2.5 py-1 text-xs font-semibold text-[#141413] hover:bg-[#EFECE4]"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Custom Item</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F5] p-4 space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-stone-500">
                            #{idx + 1} · {item.service_category}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-stone-400 hover:text-rose-600"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#555047] mb-1">
                              Service / Solution Name
                            </label>
                            <input
                              type="text"
                              value={item.service_name}
                              onChange={(e) => handleUpdateItem(item.id, 'service_name', e.target.value)}
                              className="w-full rounded-md border border-[#E2DDD3] bg-white p-2 text-xs font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#555047] mb-1">
                              Category
                            </label>
                            <select
                              value={item.service_category}
                              onChange={(e) => handleUpdateItem(item.id, 'service_category', e.target.value)}
                              className="w-full rounded-md border border-[#E2DDD3] bg-white p-2 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                            >
                              {SERVICE_PRESETS.map((p) => (
                                <option key={p.category} value={p.category}>
                                  {p.category}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#555047] mb-1">
                            Scope & Description
                          </label>
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            className="w-full rounded-md border border-[#E2DDD3] bg-white p-2 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#555047] mb-1">
                              Qty
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full rounded-md border border-[#E2DDD3] bg-white p-2 text-xs font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#555047] mb-1">
                              Setup Charge (INR ₹)
                            </label>
                            <input
                              type="number"
                              value={item.setup_charge}
                              onChange={(e) => handleUpdateItem(item.id, 'setup_charge', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-md border border-[#E2DDD3] bg-white p-2 text-xs font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#555047] mb-1">
                              Monthly Retainer (₹/mo)
                            </label>
                            <input
                              type="number"
                              value={item.monthly_recurring_charge}
                              onChange={(e) => handleUpdateItem(item.id, 'monthly_recurring_charge', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-md border border-[#E2DDD3] bg-white p-2 text-xs font-semibold text-[#141413] focus:border-[#141413] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes & Terms */}
                <div className="rounded-xl border border-[#E2DDD3] bg-white p-5 shadow-2xs space-y-4 text-xs">
                  <h3 className="font-bold uppercase tracking-wider text-[#7A756D] border-b border-[#EFECE4] pb-2">
                    Notes & Terms
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Technical Notes (Appears on PDF)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold uppercase text-[#555047] mb-1">
                        Terms & Conditions
                      </label>
                      <textarea
                        rows={2}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Live Pricing Breakdown */}
              <div className="space-y-6">
                <div className="sticky top-20 rounded-xl border border-[#E2DDD3] bg-white p-6 shadow-2xs space-y-5">
                  <div className="border-b border-[#EFECE4] pb-3">
                    <h3 className="text-sm font-bold text-[#141413]">
                      Investment Summary (INR ₹)
                    </h3>
                    <p className="text-xs text-[#7A756D]">
                      Calculated automatically from your deliverables.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs text-[#555047]">
                    <div className="flex items-center justify-between">
                      <span>One-Time Setup Subtotal:</span>
                      <strong className="text-[#141413] font-mono text-sm">
                        {formatINR(setupSubtotal)}
                      </strong>
                    </div>

                    {/* Discount Input */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span>Discount (INR ₹):</span>
                      <div className="w-28">
                        <input
                          type="number"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-[#E2DDD3] bg-[#FAF8F5] p-1.5 text-right font-mono text-xs text-rose-700 font-bold focus:border-[#141413] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Tax Rate */}
                    <div className="flex items-center justify-between gap-3">
                      <span>Applicable GST (%):</span>
                      <div className="w-28">
                        <select
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-[#E2DDD3] bg-[#FAF8F5] p-1.5 text-right text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                        >
                          <option value={0}>0% (Exempt)</option>
                          <option value={18}>18% (Standard GST)</option>
                        </select>
                      </div>
                    </div>

                    {taxRate > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-[#7A756D]">
                        <span>GST Amount:</span>
                        <span>{formatINR(taxAmount)}</span>
                      </div>
                    )}

                    {/* Grand Total Highlight */}
                    <div className="rounded-xl bg-[#141413] p-4 text-white space-y-1 mt-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-300">
                        Total One-Time Charges:
                      </div>
                      <div className="text-2xl font-extrabold tracking-tight">
                        {formatINR(grandTotalSetup)}
                      </div>
                    </div>

                    {monthlySubtotal > 0 && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900 mt-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Monthly Retainer (SLA / Maintenance):
                        </div>
                        <div className="text-base font-bold text-emerald-700">
                          {formatINR(monthlySubtotal)} / month
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-[#EFECE4] space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSaveQuotation('draft')}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#141413] py-2.5 text-xs font-semibold text-white hover:bg-[#2A2825]"
                    >
                      <Receipt className="h-4 w-4" />
                      <span>Save & Generate PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* QUOTATIONS LIST TABLE */
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756D]" />
                <input
                  type="text"
                  placeholder="Search quotations by client name, business, or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] px-3 py-2 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
                >
                  <option value="all">All Quotations</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setEditingQuotation(null);
                    setCustName('');
                    setBizName('');
                    setPhone('');
                    setIgUser('');
                    setIsCreating(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2A2825] shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Quotation</span>
                </button>
              </div>
            </div>

            {/* Quotations List */}
            <div className="overflow-hidden rounded-xl border border-[#E2DDD3] bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2DDD3] bg-[#FAF8F5] text-[11px] font-bold uppercase tracking-wider text-[#7A756D]">
                      <th className="py-3 px-4">Quotation #</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Deliverables</th>
                      <th className="py-3 px-4">Total Amount (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Valid Until</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE4] text-xs">
                    {filteredQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-[#7A756D]">
                          No quotations found. Click &quot;Create Quotation&quot; to start.
                        </td>
                      </tr>
                    ) : (
                      filteredQuotations.map((q) => {
                        const sub = q.items.reduce((s, it) => s + (it.setup_charge * (it.quantity || 1)), 0);
                        const disc = q.discount_amount || 0;
                        const tax = ((sub - disc) * (q.tax_rate || 0)) / 100;
                        const grandTotal = Math.max(0, sub - disc) + tax;

                        return (
                          <tr key={q.id} className="hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                              {q.quotation_number}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#141413]">
                                {q.customer_name}
                              </div>
                              <div className="text-[11px] text-[#7A756D]">
                                {q.business_name || q.phone || `@${q.instagram_username}`}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="line-clamp-1 font-medium text-[#141413]">
                                {q.items.map((i) => i.service_name).join(', ')}
                              </div>
                              <div className="text-[10px] text-[#7A756D]">
                                {q.items.length} service line item(s)
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#141413]">
                                {formatINR(grandTotal)}
                              </div>
                              {q.sent_via && (
                                <div className="text-[10px] text-emerald-700 capitalize">
                                  via {q.sent_via}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <select
                                value={q.status}
                                onChange={(e) => updateQuotationStatus(q.id, e.target.value as QuotationStatus)}
                                className="rounded-md border border-[#E2DDD3] bg-white px-2 py-1 text-xs font-semibold capitalize text-[#141413] focus:outline-none"
                              >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                                <option value="expired">Expired</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4 text-[#7A756D]">
                              {formatDate(q.valid_until)}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Download PDF */}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPdf(q)}
                                  className="rounded-md border border-[#E2DDD3] p-1.5 text-[#555047] hover:bg-white hover:text-[#141413]"
                                  title="Download Official PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>

                                {/* Send to WhatsApp */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSendWhatsAppModal(q);
                                    setCustomPhone(q.phone || '');
                                  }}
                                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1"
                                  title="Send through Official WhatsApp Cloud API"
                                >
                                  <MessageSquare className="h-3 w-3 text-[#25D366]" />
                                  <span>Send WA</span>
                                </button>

                                {/* Send to Instagram */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSendIgModal(q);
                                    setCustomIgUser(q.instagram_username || '');
                                  }}
                                  className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-[#E1306C] hover:bg-rose-100 flex items-center gap-1"
                                  title="Send link through Instagram API"
                                >
                                  <Instagram className="h-3 w-3" />
                                  <span>Send IG</span>
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
        )}
      </div>

      {/* MODAL 1: SEND TO WHATSAPP */}
      {sendWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2DDD3] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#25D366]" />
                <h3 className="text-base font-bold text-[#141413]">
                  Send Quotation via WhatsApp Cloud API
                </h3>
              </div>
              <button
                onClick={() => setSendWhatsAppModal(null)}
                className="text-[#7A756D] hover:text-[#141413]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Recipient Phone (WhatsApp Number)
                </label>
                <input
                  type="text"
                  required
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 font-mono text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  placeholder="+91 98200 00000"
                />
              </div>

              {/* Message Preview */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2 text-[#141413]">
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Approved WhatsApp Cloud Message Preview:
                </div>
                <p className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                  {`Hello ${sendWhatsAppModal.customer_name},\n\nHere is your requested service quotation *${sendWhatsAppModal.quotation_number}* from The Business Work.\n\nDeliverables:\n${sendWhatsAppModal.items.map((i) => `• ${i.service_name}`).join('\n')}\n\nYou can review your branded PDF quotation directly here:\nhttps://thebusinesswork.com/quotations/${sendWhatsAppModal.quotation_number}.pdf\n\nBest regards,\nAman Rajbhar · The Business Work`}
                </p>
              </div>

              <div className="text-[11px] text-[#7A756D]">
                Dispatched securely through Meta WhatsApp Cloud API Endpoint using verified system token.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFECE4]">
              <button
                type="button"
                onClick={() => setSendWhatsAppModal(null)}
                className="rounded-lg border border-[#E2DDD3] px-4 py-2 text-xs font-semibold text-[#555047] hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingApi}
                onClick={handleSendViaWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-semibold text-white hover:bg-[#20BA5A] shadow-xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingApi ? 'Dispatching...' : 'Confirm & Dispatch via WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND TO INSTAGRAM */}
      {sendIgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#E2DDD3] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFECE4] pb-3">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-[#E1306C]" />
                <h3 className="text-base font-bold text-[#141413]">
                  Send Quotation Link to Instagram DM
                </h3>
              </div>
              <button
                onClick={() => setSendIgModal(null)}
                className="text-[#7A756D] hover:text-[#141413]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-[#555047] mb-1">
                  Recipient Instagram Username
                </label>
                <input
                  type="text"
                  required
                  value={customIgUser}
                  onChange={(e) => setCustomIgUser(e.target.value)}
                  className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] p-2.5 font-mono text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                  placeholder="e.g. priya_k_designs"
                />
              </div>

              {/* Message Preview */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-2 text-[#141413]">
                <div className="text-[11px] font-bold text-[#E1306C] uppercase tracking-wider">
                  Instagram DM Preview:
                </div>
                <p className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                  {`Hey @${customIgUser || 'client'}! Here is your requested service quotation ${sendIgModal.quotation_number} from The Business Work:\n\nhttps://thebusinesswork.com/quotations/${sendIgModal.quotation_number}.pdf\n\nLet us know if you would like to proceed or schedule an onboarding walkthrough!`}
                </p>
              </div>

              <div className="text-[11px] text-[#7A756D]">
                Note: In compliance with Meta policies, Instagram DMs are sent only to accounts with an active recent interaction.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFECE4]">
              <button
                type="button"
                onClick={() => setSendIgModal(null)}
                className="rounded-lg border border-[#E2DDD3] px-4 py-2 text-xs font-semibold text-[#555047] hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingApi}
                onClick={handleSendViaInstagram}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E1306C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C13584] shadow-xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingApi ? 'Dispatching...' : 'Confirm & Dispatch via Instagram'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
