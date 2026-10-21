import jsPDF from 'jspdf';
import { AdminQuotation } from './types/dashboard';

export function generateQuotationPdf(quotation: AdminQuotation): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // 1. Top Brand Accent Line (Rich ink black)
  doc.setFillColor(20, 20, 19);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Company Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 19);
  doc.text('THE BUSINESS WORK', 16, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 95, 87);
  doc.text('We Make Business Simpler · thebusinesswork.com', 16, y + 5);
  doc.text('thebusinesswork.co@gmail.com · +91 79720 20292 · Boisar, Maharashtra', 16, y + 9);

  // Document Title (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 19);
  doc.text('SERVICE QUOTATION', pageWidth - 16, y, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 110, 95);
  doc.text(`NO: ${quotation.quotation_number}`, pageWidth - 16, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Date: ${quotation.quotation_date}`, pageWidth - 16, y + 9.5, { align: 'right' });
  doc.text(`Valid Until: ${quotation.valid_until}`, pageWidth - 16, y + 14, { align: 'right' });

  y += 20;

  // Subtle separator rule
  doc.setDrawColor(226, 221, 211);
  doc.setLineWidth(0.4);
  doc.line(16, y, pageWidth - 16, y);

  y += 8;

  // 3. Bill To Box
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(16, y, pageWidth - 32, 22, 2, 2, 'F');
  doc.rect(16, y, pageWidth - 32, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 95);
  doc.text('PREPARED FOR CLIENT:', 20, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 19);
  doc.text(quotation.customer_name, 20, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(85, 80, 71);
  const clientSub = [
    quotation.business_name,
    quotation.phone ? `Phone: ${quotation.phone}` : null,
    quotation.instagram_username ? `Instagram: @${quotation.instagram_username}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
  doc.text(clientSub || 'Direct Client Account', 20, y + 17);

  y += 28;

  // 4. Line Items Table Header
  doc.setFillColor(20, 20, 19);
  doc.rect(16, y, pageWidth - 32, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('SERVICE / DELIVERABLE', 20, y + 5);
  doc.text('SETUP CHARGE (INR)', pageWidth - 70, y + 5, { align: 'right' });
  doc.text('MONTHLY RECURRING', pageWidth - 20, y + 5, { align: 'right' });

  y += 7.5;

  let oneTimeSubtotal = 0;
  let recurringSubtotal = 0;

  // Line items
  quotation.items.forEach((item, index) => {
    const itemSetupTotal = item.setup_charge * (item.quantity || 1);
    const itemMonthlyTotal = item.monthly_recurring_charge * (item.quantity || 1);
    oneTimeSubtotal += itemSetupTotal;
    recurringSubtotal += itemMonthlyTotal;

    const rowBg = index % 2 === 0 ? 255 : 252;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(16, y, pageWidth - 32, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 19);
    doc.text(item.service_name, 20, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 95, 87);
    const splitDesc = doc.splitTextToSize(item.description, 100);
    doc.text(splitDesc[0] || '', 20, y + 9.5);
    if (splitDesc[1]) doc.text(splitDesc[1], 20, y + 13.5);

    // Setup Fee
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 19);
    doc.text(`INR ${itemSetupTotal.toLocaleString('en-IN')}`, pageWidth - 70, y + 7, { align: 'right' });

    // Recurring Fee
    doc.text(
      itemMonthlyTotal > 0 ? `INR ${itemMonthlyTotal.toLocaleString('en-IN')}/mo` : 'Included',
      pageWidth - 20,
      y + 7,
      { align: 'right' }
    );

    // subtle line below
    doc.setDrawColor(235, 230, 220);
    doc.line(16, y + 16, pageWidth - 16, y + 16);

    y += 16;
  });

  y += 6;

  // 5. Calculations / Totals Summary
  const discount = quotation.discount_amount || 0;
  const taxableOneTime = Math.max(0, oneTimeSubtotal - discount);
  const taxRate = quotation.tax_rate || 0;
  const taxAmount = (taxableOneTime * taxRate) / 100;
  const grandTotalOneTime = taxableOneTime + taxAmount;

  const totalsBoxX = pageWidth - 90;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(85, 80, 71);

  doc.text('One-Time Setup Subtotal:', totalsBoxX, y);
  doc.text(`INR ${oneTimeSubtotal.toLocaleString('en-IN')}`, pageWidth - 20, y, { align: 'right' });
  y += 5;

  if (discount > 0) {
    doc.text('Less Special Discount:', totalsBoxX, y);
    doc.setTextColor(180, 40, 40);
    doc.text(`- INR ${discount.toLocaleString('en-IN')}`, pageWidth - 20, y, { align: 'right' });
    doc.setTextColor(85, 80, 71);
    y += 5;
  }

  if (taxRate > 0) {
    doc.text(`Applicable GST (${taxRate}%):`, totalsBoxX, y);
    doc.text(`INR ${taxAmount.toLocaleString('en-IN')}`, pageWidth - 20, y, { align: 'right' });
    y += 5;
  }

  // Grand Total Highlight
  doc.setFillColor(20, 20, 19);
  doc.roundedRect(totalsBoxX - 4, y, pageWidth - totalsBoxX - 12, 10, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL SETUP CHARGES:', totalsBoxX, y + 6.5);
  doc.text(`INR ${grandTotalOneTime.toLocaleString('en-IN')}`, pageWidth - 20, y + 6.5, { align: 'right' });

  y += 15;

  if (recurringSubtotal > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 19);
    doc.text(`MONTHLY RECURRING RETAINER: INR ${recurringSubtotal.toLocaleString('en-IN')} / month`, totalsBoxX, y);
    y += 8;
  }

  // 6. Notes & Terms
  y = Math.max(y, 195);
  doc.setDrawColor(226, 221, 211);
  doc.line(16, y, pageWidth - 16, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 95);
  doc.text('TERMS & NOTES:', 16, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(85, 80, 71);
  const notesText = quotation.notes || 'Includes official Meta WhatsApp API integration and n8n workflow deployment.';
  const termsText = quotation.terms_and_conditions || 'Payment terms: 50% mobilization advance, 50% upon deployment handover. Meta API message charges billed directly by Meta.';

  const splitNotes = doc.splitTextToSize(`Notes: ${notesText}`, pageWidth - 32);
  doc.text(splitNotes, 16, y);
  y += splitNotes.length * 3.8;

  const splitTerms = doc.splitTextToSize(`Terms: ${termsText}`, pageWidth - 32);
  doc.text(splitTerms, 16, y);

  // 7. Founder Signature Sign-off
  const footerY = 265;
  doc.setDrawColor(226, 221, 211);
  doc.line(16, footerY, pageWidth - 16, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 19);
  doc.text('Aman Rajbhar', 16, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 95, 87);
  doc.text('Founder & Principal Automation Architect · The Business Work', 16, footerY + 10);
  doc.text('thebusinesswork.com · +91 79720 20292', 16, footerY + 14);

  // Right sign-off status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 95);
  doc.text(`STATUS: ${quotation.status.toUpperCase()}`, pageWidth - 16, footerY + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Official Digital Document', pageWidth - 16, footerY + 10, { align: 'right' });

  return doc;
}
