'use client';

import React from 'react';
import {
  X,
  Download,
  Send,
  MessageSquare,
  Copy,
  Printer,
  Calendar,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminQuotation } from '@/lib/types/dashboard';
import { formatINR, formatDate } from '@/lib/utils';
import { generateQuotationPdf } from '@/lib/pdf-generator';

interface QuotationPreviewModalProps {
  quotation: AdminQuotation | null;
  isOpen: boolean;
  onClose: () => void;
  onSendWhatsApp?: (q: AdminQuotation) => void;
}

export function QuotationPreviewModal({
  quotation,
  isOpen,
  onClose,
  onSendWhatsApp,
}: QuotationPreviewModalProps) {
  if (!quotation) return null;

  const items = quotation.items || [];
  const setupSubtotal = items.reduce(
    (acc, item) => acc + (item.setup_charge || 0) * (item.quantity || 1),
    0
  );
  const monthlySubtotal = items.reduce(
    (acc, item) => acc + (item.monthly_recurring_charge || 0) * (item.quantity || 1),
    0
  );
  const taxableSetup = Math.max(0, setupSubtotal - (quotation.discount_amount || 0));
  const taxRate = quotation.tax_rate ?? 18;
  const taxAmount = (taxableSetup * taxRate) / 100;
  const grandTotalSetup = taxableSetup + taxAmount;

  const handleDownloadPdf = () => {
    try {
      const doc = generateQuotationPdf(quotation);
      doc.save(`${quotation.quotation_number}_${quotation.customer_name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quotation Preview — ${quotation.quotation_number}`}
      description="Official Service Quotation prepared for client review and dispatch"
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-3.5 w-3.5" />}
            >
              Print
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Preview
            </Button>
            {onSendWhatsApp && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onClose();
                  onSendWhatsApp(quotation);
                }}
                leftIcon={<MessageSquare className="h-3.5 w-3.5 text-emerald-400" />}
              >
                Send via WhatsApp
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Printable Invoice Sheet */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 space-y-6 text-stone-800 shadow-sm print:p-0 print:border-none print:shadow-none">
        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="text-xl font-bold font-mono tracking-tight text-[#202B35]">
              THE BUSINESS WORK
            </div>
            <div className="text-xs text-[#7D8F82] font-medium mt-0.5">
              We Make Business Simpler · thebusinesswork.com
            </div>
            <div className="text-[11px] text-stone-500 mt-1">
              thebusinesswork.co@gmail.com · +91 79720 20292 · Boisar, Maharashtra
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs uppercase font-bold tracking-wider text-stone-400">
              SERVICE QUOTATION
            </div>
            <div className="text-lg font-bold font-mono text-[#202B35] mt-0.5">
              {quotation.quotation_number}
            </div>
            <div className="text-xs text-stone-600 mt-1">
              Date: <span className="font-semibold">{formatDate(quotation.quotation_date)}</span>
            </div>
            <div className="text-xs text-stone-600">
              Valid Until: <span className="font-semibold">{formatDate(quotation.valid_until)}</span>
            </div>
          </div>
        </div>

        {/* Bill To Details */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
            PREPARED FOR CLIENT:
          </div>
          <div className="text-base font-bold text-stone-900 mt-1">
            {quotation.customer_name}
          </div>
          <div className="text-xs text-stone-600 mt-0.5 flex flex-wrap items-center gap-2">
            {quotation.business_name && (
              <span className="font-medium text-stone-800">{quotation.business_name}</span>
            )}
            {quotation.phone && (
              <span className="font-mono text-stone-500">· Phone: {quotation.phone}</span>
            )}
            {quotation.instagram_username && (
              <span className="font-mono text-stone-500">· Instagram: @{quotation.instagram_username}</span>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-900 text-white text-[11px] font-semibold">
                <th className="py-2.5 px-4">Service & Deliverable</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-4 text-right">Setup Charge (INR)</th>
                <th className="py-2.5 px-4 text-right">Monthly Recurring</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50">
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-bold text-stone-900">{item.service_name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{item.description}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium">{item.quantity || 1}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                    {formatINR((item.setup_charge || 0) * (item.quantity || 1))}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                    {item.monthly_recurring_charge > 0
                      ? `${formatINR((item.monthly_recurring_charge || 0) * (item.quantity || 1))}/mo`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing Summary */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
          <div className="space-y-3 flex-1 text-xs text-stone-600">
            {quotation.notes && (
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Scope Notes:</span>
                <p className="mt-0.5 text-stone-700 leading-relaxed">{quotation.notes}</p>
              </div>
            )}
            {quotation.terms_and_conditions && (
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Payment Terms:</span>
                <p className="mt-0.5 text-stone-700 leading-relaxed">{quotation.terms_and_conditions}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Setup Subtotal:</span>
              <span className="font-mono font-semibold text-stone-900">{formatINR(setupSubtotal)}</span>
            </div>

            {quotation.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount Applied:</span>
                <span className="font-mono">- {formatINR(quotation.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-600">
              <span>Taxable Setup:</span>
              <span className="font-mono font-semibold text-stone-900">{formatINR(taxableSetup)}</span>
            </div>

            <div className="flex justify-between text-stone-600">
              <span>GST ({taxRate}%):</span>
              <span className="font-mono font-semibold text-stone-900">{formatINR(taxAmount)}</span>
            </div>

            <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-[#202B35]">
              <span>Final Setup Total:</span>
              <span className="font-mono">{formatINR(grandTotalSetup)}</span>
            </div>

            {monthlySubtotal > 0 && (
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex justify-between text-xs font-semibold text-stone-800 mt-2">
                <span>Monthly Recurring:</span>
                <span className="font-mono text-emerald-700">{formatINR(monthlySubtotal)}/mo</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
