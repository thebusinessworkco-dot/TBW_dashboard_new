'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Eye,
  Edit2,
  Copy,
  Calendar,
  Building2,
  Phone,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { TopNavbar } from '@/components/layout/top-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QuotationPreviewModal } from '@/components/quotations/quotation-preview-modal';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import {
  formatINR,
  formatDate,
  getQuotationStatusBadge,
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

function QuotationsContent() {
  const searchParams = useSearchParams();
  const {
    quotations,
    saveQuotation,
    updateQuotationStatus,
    deleteQuotation,
    duplicateQuotation,
  } = useDashboardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<AdminQuotation | null>(null);

  // Modals
  const [previewQuotation, setPreviewQuotation] = useState<AdminQuotation | null>(null);
  const [deleteTargetQuotation, setDeleteTargetQuotation] = useState<AdminQuotation | null>(null);
  const [sendWhatsAppModal, setSendWhatsAppModal] = useState<AdminQuotation | null>(null);
  const [sendIgModal, setSendIgModal] = useState<AdminQuotation | null>(null);
  const [customPhone, setCustomPhone] = useState('');
  const [customIgUser, setCustomIgUser] = useState('');
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);
  const [isSendingApi, setIsSendingApi] = useState(false);

  // Form State
  const [qNumber, setQNumber] = useState('');
  const [custName, setCustName] = useState('');
  const [bizName, setBizName] = useState('');
  const [phone, setPhone] = useState('');
  const [igUser, setIgUser] = useState('');
  const [qDate, setQDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<QuotationLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState('Includes setup on self-hosted n8n VPS and official Meta WhatsApp Cloud API.');
  const [terms, setTerms] = useState('50% advance before project commencement, 50% upon deployment handover. Official Meta API message fees billed directly by Meta.');

  // Initialize or handle query params
  useEffect(() => {
    const isNew = searchParams?.get('new') === 'true';
    const leadName = searchParams?.get('leadName');
    const leadPhone = searchParams?.get('phone');
    const business = searchParams?.get('business');

    const todayStr = new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);
    const validUntilStr = expiry.toISOString().split('T')[0];

    if (isNew || leadName) {
      setIsCreating(true);
      setEditingQuotation(null);
      setQNumber(`TBW-2026-${(100 + quotations.length + 1).toString().padStart(4, '0')}`);
      setCustName(leadName || '');
      setBizName(business || '');
      setPhone(leadPhone || '');
      setQDate(todayStr);
      setValidUntil(validUntilStr);
      setItems([
        {
          id: `item-${Date.now()}`,
          service_category: SERVICE_PRESETS[0].category,
          service_name: SERVICE_PRESETS[0].name,
          description: SERVICE_PRESETS[0].description,
          quantity: 1,
          setup_charge: SERVICE_PRESETS[0].setup,
          monthly_recurring_charge: SERVICE_PRESETS[0].monthly,
        },
      ]);
    }
  }, [searchParams, quotations.length]);

  // Pricing calculations
  const setupSubtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.setup_charge) || 0) * (Number(item.quantity) || 1), 0);
  }, [items]);

  const monthlySubtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.monthly_recurring_charge) || 0) * (Number(item.quantity) || 1), 0);
  }, [items]);

  const taxableSetup = Math.max(0, setupSubtotal - Number(discountAmount));
  const taxAmount = (taxableSetup * Number(taxRate)) / 100;
  const grandTotalSetup = taxableSetup + taxAmount;

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const qLower = searchQuery.toLowerCase().trim();
      const numMatch = q.quotation_number.toLowerCase().includes(qLower);
      const nameMatch = q.customer_name.toLowerCase().includes(qLower);
      const bizMatch = q.business_name && q.business_name.toLowerCase().includes(qLower);

      const matchesSearch = !qLower || numMatch || nameMatch || bizMatch;
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  // KPI calculations
  const totalCount = quotations.length;
  const acceptedQuotations = quotations.filter((q) => q.status === 'accepted');
  const acceptedValue = acceptedQuotations.reduce((acc, q) => {
    const totalSetup = (q.items || []).reduce((s, it) => s + (it.setup_charge || 0) * (it.quantity || 1), 0);
    return acc + totalSetup;
  }, 0);
  const totalPipelineValue = quotations.reduce((acc, q) => {
    const totalSetup = (q.items || []).reduce((s, it) => s + (it.setup_charge || 0) * (it.quantity || 1), 0);
    return acc + totalSetup;
  }, 0);
  const pendingCount = quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length;

  const handleStartNew = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);
    const validUntilStr = expiry.toISOString().split('T')[0];

    setEditingQuotation(null);
    setQNumber(`TBW-2026-${(100 + quotations.length + 1).toString().padStart(4, '0')}`);
    setCustName('');
    setBizName('');
    setPhone('');
    setIgUser('');
    setQDate(todayStr);
    setValidUntil(validUntilStr);
    setDiscountAmount(0);
    setTaxRate(18);
    setItems([
      {
        id: `item-${Date.now()}`,
        service_category: SERVICE_PRESETS[0].category,
        service_name: SERVICE_PRESETS[0].name,
        description: SERVICE_PRESETS[0].description,
        quantity: 1,
        setup_charge: SERVICE_PRESETS[0].setup,
        monthly_recurring_charge: SERVICE_PRESETS[0].monthly,
      },
    ]);
    setIsCreating(true);
  };

  const handleStartEdit = (quotation: AdminQuotation) => {
    setEditingQuotation(quotation);
    setQNumber(quotation.quotation_number);
    setCustName(quotation.customer_name);
    setBizName(quotation.business_name || '');
    setPhone(quotation.phone || '');
    setIgUser(quotation.instagram_username || '');
    setQDate(quotation.quotation_date);
    setValidUntil(quotation.valid_until);
    setItems(quotation.items || []);
    setDiscountAmount(quotation.discount_amount || 0);
    setTaxRate(quotation.tax_rate ?? 18);
    setNotes(quotation.notes || '');
    setTerms(quotation.terms_and_conditions || '');
    setIsCreating(true);
  };

  const handleAddItemFromPreset = (presetIndex = 0) => {
    const preset = SERVICE_PRESETS[presetIndex];
    const newItem: QuotationLineItem = {
      id: `item-${Date.now()}-${items.length}`,
      service_category: preset.category,
      service_name: preset.name,
      description: preset.description,
      quantity: 1,
      setup_charge: preset.setup,
      monthly_recurring_charge: preset.monthly,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleAddCustomItem = () => {
    const newItem: QuotationLineItem = {
      id: `item-${Date.now()}-${items.length}`,
      service_category: 'Custom Automation Solutions',
      service_name: 'Custom Tailored Automation Architecture',
      description: 'Bespoke automation workflow designed around specific business operational requirements.',
      quantity: 1,
      setup_charge: 25000,
      monthly_recurring_charge: 2000,
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

  const handleSaveQuotation = async (status: QuotationStatus = 'draft') => {
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

    await saveQuotation(newQuotation);
    setIsCreating(false);
    setEditingQuotation(null);
    setSendSuccessNotice(`Quotation ${newQuotation.quotation_number} saved successfully`);
    setTimeout(() => setSendSuccessNotice(null), 3000);
  };

  const handleDuplicate = async (quotation: AdminQuotation) => {
    const res = await duplicateQuotation(quotation.id);
    if (res.success) {
      setSendSuccessNotice(`Quotation duplicated as new draft.`);
      setTimeout(() => setSendSuccessNotice(null), 3000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetQuotation) return;
    await deleteQuotation(deleteTargetQuotation.id);
    setDeleteTargetQuotation(null);
    setSendSuccessNotice('Quotation deleted successfully');
    setTimeout(() => setSendSuccessNotice(null), 3000);
  };

  const handleDownloadPdf = (quotation: AdminQuotation) => {
    try {
      const pdf = generateQuotationPdf(quotation);
      pdf.save(`Quotation_${quotation.quotation_number}_TheBusinessWork.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  const handleSendViaWhatsApp = async () => {
    if (!sendWhatsAppModal) return;
    setIsSendingApi(true);

    const recipient = customPhone || sendWhatsAppModal.phone || '+91 98201 12345';

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
    setSendSuccessNotice(`Quotation ${sendWhatsAppModal.quotation_number} sent to ${recipient} via WhatsApp.`);
    setTimeout(() => setSendSuccessNotice(null), 4000);
  };

  const handleSendViaInstagram = async () => {
    if (!sendIgModal) return;
    setIsSendingApi(true);

    const recipient = customIgUser || sendIgModal.instagram_username || 'client_account';

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
    setSendSuccessNotice(`Quotation link for ${sendIgModal.quotation_number} sent to @${recipient} via Instagram.`);
    setTimeout(() => setSendSuccessNotice(null), 4000);
  };

  return (
    <div className="min-h-full pb-16 bg-[#F4F2EC]">
      <TopNavbar
        title="Quotation Studio"
        subtitle="Create, customize, preview, and dispatch official TBW pricing proposals."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {sendSuccessNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{sendSuccessNotice}</span>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Total Quotations</span>
            <div className="text-xl font-bold font-mono text-[#202B35] mt-1">{totalCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Total Proposed Value</span>
            <div className="text-lg font-bold font-mono text-[#202B35] mt-1 truncate" title={formatINR(totalPipelineValue)}>
              {formatINR(totalPipelineValue)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Accepted Value</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1 truncate" title={formatINR(acceptedValue)}>
              {formatINR(acceptedValue)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#DDD9D0] shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7D8F82] tracking-wider">Pending Proposals</span>
            <div className="text-xl font-bold font-mono text-amber-700 mt-1">{pendingCount}</div>
          </div>
        </div>

        {/* CREATE / EDIT QUOTATION WORKSPACE */}
        {isCreating ? (
          <div className="rounded-2xl border border-[#DDD9D0] bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#202B35]">
                  {editingQuotation ? `Edit Quotation: ${editingQuotation.quotation_number}` : 'Create New Service Quotation'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure client coordinates, service deliverables, setup fees, and recurring maintenance
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingQuotation(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveQuotation('draft')}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSaveQuotation('sent')}
                >
                  Save & Finalize
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form Fields */}
              <div className="lg:col-span-2 space-y-6">
                {/* Client & Metadata Box */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Client & Proposal Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                        Client / Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="e.g. Rajesh Singhal"
                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                        Business / Company Name
                      </label>
                      <input
                        type="text"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        placeholder="e.g. Singhal Logistics"
                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                        Phone (WhatsApp)
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                        Instagram Handle
                      </label>
                      <input
                        type="text"
                        value={igUser}
                        onChange={(e) => setIgUser(e.target.value.replace(/^@/, ''))}
                        placeholder="username"
                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                        Quotation Number
                      </label>
                      <input
                        type="text"
                        value={qNumber}
                        onChange={(e) => setQNumber(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                        Valid Until (Expiry)
                      </label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none font-mono cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Line Items Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                      Deliverable Line Items ({items.length})
                    </h4>

                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          const idx = parseInt(e.target.value, 10);
                          if (!isNaN(idx)) handleAddItemFromPreset(idx);
                        }}
                        defaultValue=""
                        className="text-xs rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-stone-700 cursor-pointer"
                      >
                        <option value="" disabled>+ Add from Presets</option>
                        {SERVICE_PRESETS.map((p, idx) => (
                          <option key={idx} value={idx}>
                            {p.name.slice(0, 32)}...
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomItem}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Add Custom
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] uppercase font-bold text-stone-600 bg-stone-200/80 px-2 py-0.5 rounded-md">
                            Item #{index + 1}
                          </span>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                              Service / Solution Title
                            </label>
                            <input
                              type="text"
                              value={item.service_name}
                              onChange={(e) => handleUpdateItem(item.id, 'service_name', e.target.value)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                              Category
                            </label>
                            <input
                              type="text"
                              value={item.service_category}
                              onChange={(e) => handleUpdateItem(item.id, 'service_category', e.target.value)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                            Description / Scope of Work
                          </label>
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity || 1}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                              Setup Charge (INR)
                            </label>
                            <input
                              type="number"
                              value={item.setup_charge}
                              onChange={(e) => handleUpdateItem(item.id, 'setup_charge', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                              Monthly Recurring (INR)
                            </label>
                            <input
                              type="number"
                              value={item.monthly_recurring_charge}
                              onChange={(e) => handleUpdateItem(item.id, 'monthly_recurring_charge', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-900 focus:border-[#202B35] focus:outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scope Notes & Terms */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                      Scope Notes & Deliverable Details
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                      Payment Terms & Handover Conditions
                    </label>
                    <textarea
                      rows={2}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 focus:border-[#202B35] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Calculation Summary Card */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#DDD9D0] bg-stone-50/80 p-5 space-y-4 sticky top-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 border-b border-stone-200 pb-2">
                    Pricing & Tax Breakdown
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Setup Subtotal ({items.length} items):</span>
                      <span className="font-mono font-semibold text-stone-900">{formatINR(setupSubtotal)}</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-stone-600 mb-1">
                        <span>Discount (INR):</span>
                        <span className="font-mono text-emerald-700">- {formatINR(discountAmount)}</span>
                      </div>
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs font-mono text-stone-900 focus:border-[#202B35] focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 flex justify-between text-stone-600">
                      <span>Taxable Setup Value:</span>
                      <span className="font-mono font-semibold text-stone-900">{formatINR(taxableSetup)}</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-stone-600 mb-1">
                        <span>GST Tax Rate (%):</span>
                        <span className="font-mono font-semibold text-stone-900">{taxRate}%</span>
                      </div>
                      <select
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-stone-200 bg-white p-2 text-xs font-mono text-stone-900 focus:border-[#202B35] focus:outline-none"
                      >
                        <option value={18}>18% GST (Standard Services)</option>
                        <option value={0}>0% Tax (Exempt / Export)</option>
                        <option value={12}>12% GST</option>
                      </select>
                    </div>

                    <div className="flex justify-between text-stone-600">
                      <span>GST Amount:</span>
                      <span className="font-mono font-semibold text-stone-900">{formatINR(taxAmount)}</span>
                    </div>

                    <div className="pt-3 border-t border-stone-200 flex justify-between text-sm font-bold text-[#202B35]">
                      <span>Grand Total Setup:</span>
                      <span className="font-mono">{formatINR(grandTotalSetup)}</span>
                    </div>

                    {monthlySubtotal > 0 && (
                      <div className="p-3 rounded-xl bg-white border border-stone-200/80 flex justify-between text-xs font-bold text-stone-800 mt-3 shadow-2xs">
                        <span>Monthly Recurring:</span>
                        <span className="font-mono text-emerald-700">{formatINR(monthlySubtotal)}/mo</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSaveQuotation('sent')}
                    >
                      Save & Complete Quotation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const previewObj: AdminQuotation = {
                          id: editingQuotation ? editingQuotation.id : 'preview-temp',
                          quotation_number: qNumber,
                          customer_name: custName.trim() || 'Valued Client',
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
                          status: 'draft',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        };
                        setPreviewQuotation(previewObj);
                      }}
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                    >
                      Preview Invoice PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* QUOTATION LISTING & DASHBOARD TABLE */
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#DDD9D0] bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search by quotation number, client name, business..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[#DDD9D0] bg-stone-50/60 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#202B35] focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone-500 font-medium">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-xl border border-[#DDD9D0] bg-stone-50/60 px-3 py-1.5 text-xs font-medium text-stone-800 focus:border-[#202B35] focus:bg-white focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="all">All Statuses ({quotations.length})</option>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleStartNew}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    New Quotation
                  </Button>
                </div>
              </div>
            </div>

            {/* Quotations Table */}
            <div className="overflow-hidden rounded-2xl border border-[#DDD9D0] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200/70 bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      <th className="py-3 px-4">Quotation No</th>
                      <th className="py-3 px-4">Customer & Business</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Valid Until</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Setup Total (INR)</th>
                      <th className="py-3 px-4">Monthly Recurring</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {filteredQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-xs text-stone-500">
                          <Receipt className="h-8 w-8 mx-auto text-stone-300 mb-2" />
                          <p className="font-medium text-stone-700">No quotations found</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Click &quot;New Quotation&quot; above to draft a commercial proposal.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredQuotations.map((quotation) => {
                        const statusBadge = getQuotationStatusBadge(quotation.status);
                        const qItems = quotation.items || [];
                        const qSetupTotal = qItems.reduce((acc, it) => acc + (it.setup_charge || 0) * (it.quantity || 1), 0);
                        const qTaxable = Math.max(0, qSetupTotal - (quotation.discount_amount || 0));
                        const qTax = (qTaxable * (quotation.tax_rate ?? 18)) / 100;
                        const grandSetup = qTaxable + qTax;
                        const grandMonthly = qItems.reduce((acc, it) => acc + (it.monthly_recurring_charge || 0) * (it.quantity || 1), 0);

                        return (
                          <tr key={quotation.id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                              {quotation.quotation_number}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-stone-900">{quotation.customer_name}</div>
                              <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                                {quotation.business_name && (
                                  <span className="font-medium text-stone-700">{quotation.business_name}</span>
                                )}
                                {quotation.phone && (
                                  <span className="font-mono text-stone-400">· {quotation.phone}</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-medium text-stone-700 whitespace-nowrap">
                              {formatDate(quotation.quotation_date)}
                            </td>

                            <td className="py-3.5 px-4 font-medium text-stone-500 whitespace-nowrap">
                              {formatDate(quotation.valid_until)}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono text-[10px]">
                                {qItems.length} items
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                              {formatINR(grandSetup)}
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {grandMonthly > 0 ? `${formatINR(grandMonthly)}/mo` : '—'}
                            </td>

                            <td className="py-3.5 px-4">
                              <select
                                value={quotation.status}
                                onChange={(e) => updateQuotationStatus(quotation.id, e.target.value as QuotationStatus)}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} focus:outline-none cursor-pointer transition-all`}
                              >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                                <option value="expired">Expired</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setPreviewQuotation(quotation)}
                                  title="Preview Quotation"
                                  className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDownloadPdf(quotation)}
                                  title="Download PDF"
                                  className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setSendWhatsAppModal(quotation);
                                    setCustomPhone(quotation.phone || '');
                                  }}
                                  title="Send via WhatsApp"
                                  className="rounded-lg border border-stone-200 p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => handleStartEdit(quotation)}
                                  title="Edit Quotation"
                                  className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDuplicate(quotation)}
                                  title="Duplicate Quotation"
                                  className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => setDeleteTargetQuotation(quotation)}
                                  title="Delete Quotation"
                                  className="rounded-lg border border-stone-200 p-1.5 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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

      {/* QUOTATION PREVIEW MODAL */}
      <QuotationPreviewModal
        quotation={previewQuotation}
        isOpen={!!previewQuotation}
        onClose={() => setPreviewQuotation(null)}
        onSendWhatsApp={(q) => {
          setSendWhatsAppModal(q);
          setCustomPhone(q.phone || '');
        }}
      />

      {/* WHATSAPP SEND MODAL */}
      {sendWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  Send Quotation via WhatsApp Cloud API
                </h3>
              </div>
              <button
                onClick={() => setSendWhatsAppModal(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-stone-600">
                Dispatches quotation <strong>{sendWhatsAppModal.quotation_number}</strong> to client directly via official Meta WhatsApp Cloud API.
              </p>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 text-xs text-stone-900 font-mono focus:border-stone-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-[11px] space-y-1">
                <div>Client: <strong>{sendWhatsAppModal.customer_name}</strong></div>
                <div>Amount: <strong>{formatINR(grandTotalSetup)}</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSendWhatsAppModal(null)}
                disabled={isSendingApi}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSendViaWhatsApp}
                isLoading={isSendingApi}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                Send via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE QUOTATION CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTargetQuotation}
        onClose={() => setDeleteTargetQuotation(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Service Quotation"
        description={`Are you sure you want to delete quotation ${deleteTargetQuotation?.quotation_number} for ${deleteTargetQuotation?.customer_name}? This action removes the saved quote and its deliverables.`}
        confirmLabel="Yes, Delete Quotation"
        isDestructive={true}
      />
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-500">Loading Quotation Studio...</div>}>
      <QuotationsContent />
    </Suspense>
  );
}
