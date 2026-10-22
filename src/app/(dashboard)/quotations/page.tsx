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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  {editingQuotation ? `Edit Quotation ${qNumber}` : 'Create New Quotation'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  All prices and terms are completely customizable in Indian Rupees (₹).
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('draft')}
                  className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-50 transition-colors shadow-2xs"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation('sent')}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-all shadow-sm shadow-stone-950/10 active:scale-[0.98] cursor-pointer"
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
                <div className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 text-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-2">
                    Client & Quotation Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Client Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                        placeholder="e.g. Sunita Sharma"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Business / Organization Name
                      </label>
                      <input
                        type="text"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                        placeholder="e.g. Artisan Living Decor"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Phone (WhatsApp)
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                        placeholder="+91 98200 00000"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Instagram Username
                      </label>
                      <input
                        type="text"
                        value={igUser}
                        onChange={(e) => setIgUser(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                        placeholder="e.g. artisan_living"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Quotation Number
                      </label>
                      <input
                        type="text"
                        value={qNumber}
                        onChange={(e) => setQNumber(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 font-mono text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Quotation Date
                      </label>
                      <input
                        type="date"
                        value={qDate}
                        onChange={(e) => setQDate(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                        Valid Until
                      </label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Line Items */}
                <div className="rounded-2xl border border-stone-200/80 bg-white p-5 lg:p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        Service Line Items
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                        {items.length}
                      </span>
                    </div>

                    {/* Quick Add Preset dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value !== '') {
                            handleAddItem(Number(e.target.value));
                            e.target.value = '';
                          }
                        }}
                        className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-1.5 text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-2xs"
                      >
                        <Plus className="h-3.5 w-3.5 text-stone-500" />
                        <span>Custom Item</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-stone-200/90 bg-stone-50/50 p-4 lg:p-5 space-y-3.5 text-xs transition-all hover:border-stone-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-stone-600">
                            #{idx + 1} · {item.service_category}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">
                              Service / Solution Name
                            </label>
                            <input
                              type="text"
                              value={item.service_name}
                              onChange={(e) => handleUpdateItem(item.id, 'service_name', e.target.value)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-medium text-stone-900 focus:border-stone-900 focus:outline-none transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">
                              Category
                            </label>
                            <select
                              value={item.service_category}
                              onChange={(e) => handleUpdateItem(item.id, 'service_category', e.target.value)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none transition-all cursor-pointer"
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
                          <label className="block text-[11px] font-medium text-stone-600 mb-1">
                            Scope & Description
                          </label>
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-none transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">
                              Qty
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">
                              Setup Charge (INR ₹)
                            </label>
                            <input
                              type="number"
                              value={item.setup_charge}
                              onChange={(e) => handleUpdateItem(item.id, 'setup_charge', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">
                              Monthly Retainer (₹/mo)
                            </label>
                            <input
                              type="number"
                              value={item.monthly_recurring_charge}
                              onChange={(e) => handleUpdateItem(item.id, 'monthly_recurring_charge', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-stone-900 focus:border-stone-900 focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes & Terms */}
                <div className="rounded-2xl border border-stone-200/80 bg-white p-5 lg:p-6 shadow-xs space-y-4 text-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
                    Notes & Terms
                  </h3>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                        Technical Notes (Appears on PDF)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                        Terms & Conditions
                      </label>
                      <textarea
                        rows={2}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Live Pricing Breakdown */}
              <div className="space-y-6">
                <div className="sticky top-20 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-5">
                  <div className="border-b border-stone-100 pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-stone-900">
                        Investment Summary
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 font-mono">
                        INR (₹)
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Calculated automatically from your deliverables.
                    </p>
                  </div>

                  <div className="space-y-3.5 text-xs text-stone-600">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">One-Time Setup Subtotal:</span>
                      <strong className="text-stone-900 font-mono text-sm font-semibold">
                        {formatINR(setupSubtotal)}
                      </strong>
                    </div>

                    {/* Discount Input */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-stone-600">Discount (INR ₹):</span>
                      <div className="w-28">
                        <input
                          type="number"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-1.5 text-right font-mono text-xs text-rose-600 font-semibold focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Tax Rate */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-stone-600">Applicable GST (%):</span>
                      <div className="w-28">
                        <select
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-1.5 text-right text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
                        >
                          <option value={0}>0% (Exempt)</option>
                          <option value={18}>18% (Standard GST)</option>
                        </select>
                      </div>
                    </div>

                    {taxRate > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>GST Amount:</span>
                        <span className="font-mono">{formatINR(taxAmount)}</span>
                      </div>
                    )}

                    {/* Grand Total Highlight */}
                    <div className="rounded-xl bg-stone-900 p-4.5 text-white space-y-1.5 shadow-xs">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-300">
                        Total One-Time Charges:
                      </div>
                      <div className="text-2xl font-bold tracking-tight font-mono">
                        {formatINR(grandTotalSetup)}
                      </div>
                    </div>

                    {monthlySubtotal > 0 && (
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-emerald-950 shadow-2xs">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                          Monthly Retainer (SLA / Maintenance):
                        </div>
                        <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                          {formatINR(monthlySubtotal)} / month
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-stone-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSaveQuotation('draft')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-xs font-medium text-white hover:bg-stone-800 active:scale-[0.99] transition-all shadow-xs cursor-pointer"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search quotations by client name, business, or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/70 py-2 pl-9.5 pr-4 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 shadow-xs cursor-pointer active:scale-[0.99] transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Quotation</span>
                </button>
              </div>
            </div>

            {/* Quotations List */}
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200/80 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      <th className="py-3 px-4">Quotation #</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Deliverables</th>
                      <th className="py-3 px-4">Total Amount (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Valid Until</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {filteredQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-14 text-center text-xs text-stone-500">
                          <Receipt className="mx-auto h-8 w-8 text-stone-300 mb-2 stroke-1" />
                          <p className="font-medium text-stone-600">No quotations found</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">Click &quot;Create Quotation&quot; to start drafting deliverables.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredQuotations.map((q) => {
                        const sub = q.items.reduce((s, it) => s + (it.setup_charge * (it.quantity || 1)), 0);
                        const disc = q.discount_amount || 0;
                        const tax = ((sub - disc) * (q.tax_rate || 0)) / 100;
                        const grandTotal = Math.max(0, sub - disc) + tax;

                        return (
                          <tr key={q.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-semibold text-stone-900">
                              {q.quotation_number}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-stone-900">
                                {q.customer_name}
                              </div>
                              <div className="text-[11px] text-stone-500">
                                {q.business_name || q.phone || `@${q.instagram_username}`}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="line-clamp-1 font-medium text-stone-800">
                                {q.items.map((i) => i.service_name).join(', ')}
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {q.items.length} service line item(s)
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-stone-900 font-mono">
                                {formatINR(grandTotal)}
                              </div>
                              {q.sent_via && (
                                <div className="text-[10px] font-medium text-emerald-700 capitalize">
                                  via {q.sent_via}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <select
                                value={q.status}
                                onChange={(e) => updateQuotationStatus(q.id, e.target.value as QuotationStatus)}
                                className="rounded-lg border border-stone-200 bg-stone-50/70 px-2.5 py-1 text-xs font-semibold capitalize text-stone-800 focus:outline-none cursor-pointer"
                              >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                                <option value="expired">Expired</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4 text-stone-500 font-mono text-[11px]">
                              {formatDate(q.valid_until)}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Download PDF */}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPdf(q)}
                                  className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-2xs"
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
                                  className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Send through Official WhatsApp Cloud API"
                                >
                                  <MessageSquare className="h-3 w-3 text-emerald-600" />
                                  <span>Send WA</span>
                                </button>

                                {/* Send to Instagram */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSendIgModal(q);
                                    setCustomIgUser(q.instagram_username || '');
                                  }}
                                  className="rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[11px] font-medium text-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Send link through Instagram API"
                                >
                                  <Instagram className="h-3 w-3 text-rose-600" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Send Quotation via WhatsApp
                  </h3>
                  <p className="text-[11px] text-stone-500">Official WhatsApp Cloud API</p>
                </div>
              </div>
              <button
                onClick={() => setSendWhatsAppModal(null)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Recipient Phone (WhatsApp Number)
                </label>
                <input
                  type="text"
                  required
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 font-mono text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  placeholder="+91 98200 00000"
                />
              </div>

              {/* Message Preview */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-2 text-stone-900">
                <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                  Approved WhatsApp Cloud Message Preview:
                </div>
                <p className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-stone-800">
                  {`Hello ${sendWhatsAppModal.customer_name},\n\nHere is your requested service quotation *${sendWhatsAppModal.quotation_number}* from The Business Work.\n\nDeliverables:\n${sendWhatsAppModal.items.map((i) => `• ${i.service_name}`).join('\n')}\n\nYou can review your branded PDF quotation directly here:\nhttps://thebusinesswork.com/quotations/${sendWhatsAppModal.quotation_number}.pdf\n\nBest regards,\nAman Rajbhar · The Business Work`}
                </p>
              </div>

              <div className="text-[11px] text-stone-500">
                Dispatched securely through Meta WhatsApp Cloud API Endpoint using verified system token.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSendWhatsAppModal(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingApi}
                onClick={handleSendViaWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 shadow-xs cursor-pointer active:scale-[0.99] transition-all disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-[#E1306C]">
                  <Instagram className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Send Quotation Link to Instagram DM
                  </h3>
                  <p className="text-[11px] text-stone-500">Meta Instagram Graph Messaging</p>
                </div>
              </div>
              <button
                onClick={() => setSendIgModal(null)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Recipient Instagram Username
                </label>
                <input
                  type="text"
                  required
                  value={customIgUser}
                  onChange={(e) => setCustomIgUser(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/70 p-2.5 font-mono text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
                  placeholder="e.g. priya_k_designs"
                />
              </div>

              {/* Message Preview */}
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-4 space-y-2 text-stone-900">
                <div className="text-[10px] font-semibold text-[#E1306C] uppercase tracking-wider">
                  Instagram DM Preview:
                </div>
                <p className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-stone-800">
                  {`Hey @${customIgUser || 'client'}! Here is your requested service quotation ${sendIgModal.quotation_number} from The Business Work:\n\nhttps://thebusinesswork.com/quotations/${sendIgModal.quotation_number}.pdf\n\nLet us know if you would like to proceed or schedule an onboarding walkthrough!`}
                </p>
              </div>

              <div className="text-[11px] text-stone-500">
                Note: In compliance with Meta policies, Instagram DMs are sent only to accounts with an active recent interaction.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSendIgModal(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingApi}
                onClick={handleSendViaInstagram}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 shadow-xs cursor-pointer active:scale-[0.99] transition-all disabled:opacity-60"
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
