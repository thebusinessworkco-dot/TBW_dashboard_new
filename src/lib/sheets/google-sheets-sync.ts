import { createAdminClient } from '@/lib/supabase/admin';

export interface SyncResult {
  success: boolean;
  websiteCount: number;
  whatsappCount: number;
  appointmentCount: number;
  totalLeads: number;
  error?: string;
  syncedAt: string;
}

export interface RawWebsiteLead {
  _rowNumber: number;
  receivedAt?: string;
  name?: string;
  business?: string;
  email?: string;
  phone?: string | number;
  service?: string;
  problem?: string;
  consent?: string | boolean;
  source?: string;
  page?: string;
  cta?: string;
}

export interface RawWhatsAppLead {
  _rowNumber: number;
  receivedAt?: string;
  phone?: string | number;
  name?: string;
  business?: string;
  purpose?: string;
  language?: string;
  source?: string;
}

export interface RawAppointment {
  _rowNumber: number;
  bookedAtIST?: string;
  phone?: string | number;
  name?: string;
  appointmentDate?: string;
  startTimeIST?: string;
  endTimeIST?: string;
  durationMinutes?: string | number;
  timezone?: string;
  bookingStatus?: string;
  calendarEventId?: string;
  calendarEventLink?: string;
  reminderDueAtIST?: string;
  source?: string;
}

export interface AppointmentInput {
  customerName: string;
  phone: string;
  service: string;
  appointmentDate: string; // YYYY-MM-DD
  startTimeIST: string;    // e.g. "11:00 AM"
  endTimeIST: string;      // e.g. "11:30 AM"
  startTimeISO: string;
  endTimeISO: string;
  durationMinutes?: number;
  source?: 'whatsapp' | 'instagram' | 'dashboard';
  notes?: string;
}

/**
 * Robustly parses varied date formats (ISO, dd/MM/yyyy, hh:mm:ss a) to standard ISO string.
 * Assumes non-timezone dates are in Asia/Kolkata (+05:30).
 */
export function parseDateToISO(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return new Date().toISOString();
  const trimmed = dateStr.trim();

  // If already standard ISO
  if (trimmed.includes('T') || trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Format: dd/MM/yyyy, hh:mm:ss a (e.g. "22/10/2026, 11:45:11 PM")
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    let hour = parseInt(m[4], 10);
    const min = parseInt(m[5], 10);
    const sec = parseInt(m[6], 10);
    const ampm = (m[7] || '').toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    // Convert Asia/Kolkata (+05:30) to UTC
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const utcTime = Date.UTC(year, month, day, hour, min, sec) - istOffsetMs;
    return new Date(utcTime).toISOString();
  }

  const fallback = new Date(trimmed);
  return !isNaN(fallback.getTime()) ? fallback.toISOString() : new Date().toISOString();
}

/**
 * Estimates lead monetary value in INR based on service interest
 */
export function estimateLeadValue(service?: string): number {
  const s = (service || '').toLowerCase();
  if (s.includes('agent') || s.includes('chatbot')) return 45000;
  if (s.includes('crm') || s.includes('sales')) return 35000;
  if (s.includes('workflow')) return 25000;
  if (s.includes('social') || s.includes('whatsapp') || s.includes('instagram')) return 20000;
  return 30000;
}

/**
 * Synchronizes the master Google Spreadsheet (Website Leads, WhatsApp Leads, Appointments)
 * into Supabase admin_leads, admin_contacts, and admin_appointments with deduplication.
 */
export async function syncMasterGoogleSheets(): Promise<SyncResult> {
  const n8nBase = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
  const secret = process.env.N8N_WEBHOOK_SECRET || process.env.N8N_API_KEY || '';

  try {
    const res = await fetch(`${n8nBase}/webhook/tbw-google-sheets-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
        'x-tbw-webhook-secret': secret,
      },
      body: JSON.stringify({ action: 'fetch' }),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`n8n sync engine returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const websiteLeads = (data.websiteLeads || []) as RawWebsiteLead[];
    const whatsappLeads = (data.whatsappLeads || []) as RawWhatsAppLead[];
    const appointments = (data.appointments || []) as RawAppointment[];

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      throw new Error('Supabase admin client unavailable');
    }

    const nowIso = new Date().toISOString();

    // 1. Synchronize Website Leads
    for (const row of websiteLeads) {
      const sheetRowId = `G_SHEET_WEBSITE_${row._rowNumber}`;
      const name = (row.name || 'Website Inquirer').trim();
      const rawPhone = row.phone ? String(row.phone).replace(/\D/g, '') : '';
      const phone = rawPhone.length >= 10 ? (rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`) : (row.phone ? String(row.phone).trim() : null);
      const email = row.email ? String(row.email).trim().toLowerCase() : null;
      const service = row.service?.trim() || 'CRM & Sales Automation';
      const createdAt = parseDateToISO(row.receivedAt);
      const estVal = estimateLeadValue(service);

      const notesArr: string[] = [];
      if (row.business?.trim()) notesArr.push(`Business: ${row.business.trim()}`);
      if (row.problem?.trim()) notesArr.push(`Problem: ${row.problem.trim()}`);
      if (row.page?.trim()) notesArr.push(`Page: ${row.page.trim()}`);
      if (row.cta?.trim()) notesArr.push(`CTA: ${row.cta.trim()}`);
      const notes = notesArr.length > 0 ? notesArr.join(' | ') : undefined;

      // Contact upsert if phone exists
      let contactId: string | null = null;
      if (phone && phone.length >= 10) {
        try {
          const { data: contact } = await adminSupabase
            .from('admin_contacts')
            .upsert(
              {
                name,
                phone,
                email,
                company_name: row.business || null,
                is_demo: false,
                updated_at: nowIso,
              },
              { onConflict: 'phone' }
            )
            .select('id')
            .maybeSingle();
          if (contact) contactId = contact.id;
        } catch {
          // ignore contact linking error
        }
      }

      // Check existing lead
      const { data: existing } = await adminSupabase
        .from('admin_leads')
        .select('id')
        .eq('google_sheet_row_id', sheetRowId)
        .maybeSingle();

      if (existing) {
        await adminSupabase
          .from('admin_leads')
          .update({
            contact_name: name,
            contact_phone: phone,
            contact_email: email,
            service_interest: service,
            estimated_value: estVal,
            notes,
            contact_id: contactId || undefined,
            updated_at: nowIso,
          })
          .eq('id', existing.id);
      } else {
        await adminSupabase.from('admin_leads').insert({
          contact_name: name,
          contact_phone: phone,
          contact_email: email,
          source: 'website',
          service_interest: service,
          status: 'new',
          estimated_value: estVal,
          notes,
          google_sheet_row_id: sheetRowId,
          contact_id: contactId || undefined,
          created_at: createdAt,
          updated_at: createdAt,
          is_demo: false,
        });
      }
    }

    // 2. Synchronize WhatsApp Leads
    for (const row of whatsappLeads) {
      const sheetRowId = `G_SHEET_WA_${row._rowNumber}`;
      const name = (row.name || 'WhatsApp Contact').trim();
      const rawPhone = String(row.phone || '').replace(/\D/g, '');
      const phone = rawPhone.length >= 10 ? (rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`) : (row.phone ? String(row.phone).trim() : null);
      const purpose = (row.purpose || '').trim();
      const service = purpose.split(':')[0]?.trim() || 'AI Agents & Chatbots';
      const createdAt = parseDateToISO(row.receivedAt);
      const estVal = estimateLeadValue(service);

      const notesArr: string[] = [];
      if (row.business?.trim()) notesArr.push(`Business: ${row.business.trim()}`);
      if (purpose) notesArr.push(`Purpose: ${purpose}`);
      if (row.language?.trim()) notesArr.push(`Language: ${row.language.trim()}`);
      const notes = notesArr.length > 0 ? notesArr.join(' | ') : undefined;

      let contactId: string | null = null;
      if (phone && phone.length >= 10) {
        try {
          const { data: contact } = await adminSupabase
            .from('admin_contacts')
            .upsert(
              {
                name,
                phone,
                company_name: row.business || null,
                is_demo: false,
                updated_at: nowIso,
              },
              { onConflict: 'phone' }
            )
            .select('id')
            .maybeSingle();
          if (contact) contactId = contact.id;
        } catch {
          // ignore
        }
      }

      const { data: existing } = await adminSupabase
        .from('admin_leads')
        .select('id')
        .eq('google_sheet_row_id', sheetRowId)
        .maybeSingle();

      if (existing) {
        await adminSupabase
          .from('admin_leads')
          .update({
            contact_name: name,
            contact_phone: phone,
            service_interest: service,
            estimated_value: estVal,
            notes,
            contact_id: contactId || undefined,
            updated_at: nowIso,
          })
          .eq('id', existing.id);
      } else {
        await adminSupabase.from('admin_leads').insert({
          contact_name: name,
          contact_phone: phone,
          source: 'whatsapp',
          service_interest: service,
          status: 'new',
          estimated_value: estVal,
          notes,
          google_sheet_row_id: sheetRowId,
          contact_id: contactId || undefined,
          created_at: createdAt,
          updated_at: createdAt,
          is_demo: false,
        });
      }
    }

    // 3. Synchronize Appointments
    for (const row of appointments) {
      const calId = row.calendarEventId?.trim() || `GCAL_ROW_${row._rowNumber}`;
      const name = (row.name || 'Appointment Client').trim();
      const phone = row.phone ? String(row.phone).trim() : name;
      const date = row.appointmentDate?.trim() || new Date().toISOString().split('T')[0];
      const time = `${row.startTimeIST || ''} - ${row.endTimeIST || ''}`.trim() || '11:00 AM';
      const rawStatus = (row.bookingStatus || 'confirmed').toLowerCase();
      const status = ['confirmed', 'completed', 'cancelled', 'pending'].includes(rawStatus) ? rawStatus : 'confirmed';
      const source = (row.source && row.source.toLowerCase().includes('instagram')) ? 'instagram' : 'whatsapp';
      const service = 'Consultation';

      const { data: existingAppt } = await adminSupabase
        .from('admin_appointments')
        .select('id')
        .eq('google_calendar_event_id', calId)
        .maybeSingle();

      if (existingAppt) {
        await adminSupabase
          .from('admin_appointments')
          .update({
            customer_name: name,
            contact_info: phone,
            platform: source,
            service_requested: service,
            appointment_date: date,
            appointment_time: time,
            status,
            notes: row.calendarEventLink ? `Google Calendar Link: ${row.calendarEventLink}` : null,
            updated_at: nowIso,
          })
          .eq('id', existingAppt.id);
      } else {
        await adminSupabase.from('admin_appointments').insert({
          customer_name: name,
          contact_info: phone,
          platform: source,
          service_requested: service,
          appointment_date: date,
          appointment_time: time,
          status,
          notes: row.calendarEventLink ? `Google Calendar Link: ${row.calendarEventLink}` : null,
          google_calendar_event_id: calId,
          created_at: nowIso,
          updated_at: nowIso,
          is_demo: false,
        });
      }
    }

    return {
      success: true,
      websiteCount: websiteLeads.length,
      whatsappCount: whatsappLeads.length,
      appointmentCount: appointments.length,
      totalLeads: websiteLeads.length + whatsappLeads.length,
      syncedAt: nowIso,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown Google Sheets sync error';
    return {
      success: false,
      websiteCount: 0,
      whatsappCount: 0,
      appointmentCount: 0,
      totalLeads: 0,
      error: errorMsg,
      syncedAt: new Date().toISOString(),
    };
  }
}

/**
 * Creates an appointment in Google Calendar and appends to the Appointments sheet,
 * then persists the confirmed record in Supabase admin_appointments.
 */
export async function createAppointmentInGoogleSheetsAndCalendar(
  input: AppointmentInput
): Promise<{ success: boolean; calendarEventId?: string; calendarEventLink?: string; error?: string }> {
  const n8nBase = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
  const secret = process.env.N8N_WEBHOOK_SECRET || process.env.N8N_API_KEY || '';

  try {
    const res = await fetch(`${n8nBase}/webhook/tbw-google-sheets-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
        'x-tbw-webhook-secret': secret,
      },
      body: JSON.stringify({
        action: 'create_appointment',
        appointment: {
          customerName: input.customerName,
          phone: input.phone,
          service: input.service,
          appointmentDate: input.appointmentDate,
          startTimeIST: input.startTimeIST,
          endTimeIST: input.endTimeIST,
          startTimeISO: input.startTimeISO,
          endTimeISO: input.endTimeISO,
          durationMinutes: input.durationMinutes || 30,
          source: input.source || 'Dashboard',
          notes: input.notes || '',
        },
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`n8n booking engine returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const calendarEventId = data.calendarEventId || `GCAL_${Date.now()}`;
    const calendarEventLink = data.calendarEventLink || '';

    // Insert into Supabase admin_appointments
    const adminSupabase = createAdminClient();
    if (adminSupabase) {
      const nowIso = new Date().toISOString();
      await adminSupabase.from('admin_appointments').insert({
        customer_name: input.customerName,
        contact_info: input.phone,
        platform: input.source === 'instagram' ? 'instagram' : 'whatsapp',
        service_requested: input.service,
        appointment_date: input.appointmentDate,
        appointment_time: `${input.startTimeIST} - ${input.endTimeIST}`,
        status: 'confirmed',
        notes: calendarEventLink ? `Google Calendar: ${calendarEventLink}` : (input.notes || null),
        google_calendar_event_id: calendarEventId,
        created_at: nowIso,
        updated_at: nowIso,
        is_demo: false,
      });
    }

    return {
      success: true,
      calendarEventId,
      calendarEventLink,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to book appointment';
    return {
      success: false,
      error: errorMsg,
    };
  }
}
