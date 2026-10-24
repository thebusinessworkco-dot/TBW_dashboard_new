import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseDateToISO(dateStr) {
  if (!dateStr) return new Date().toISOString();
  // If already ISO format
  if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // If dd/MM/yyyy, hh:mm:ss a format (e.g. "22/10/2026, 11:45:11 PM")
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
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
    // Interpret as Asia/Kolkata (+05:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = Date.UTC(year, month, day, hour, min, sec) - istOffset;
    return new Date(utcTime).toISOString();
  }
  const fallback = new Date(dateStr);
  return !isNaN(fallback.getTime()) ? fallback.toISOString() : new Date().toISOString();
}

function getEstimatedValue(service) {
  const s = (service || '').toLowerCase();
  if (s.includes('agent') || s.includes('chatbot')) return 45000;
  if (s.includes('crm') || s.includes('sales')) return 35000;
  if (s.includes('workflow')) return 25000;
  if (s.includes('social') || s.includes('whatsapp')) return 20000;
  return 30000;
}

async function testSync() {
  console.log('Fetching master Google Sheets via n8n sync engine...');
  const res = await fetch('https://n8n.thebusinesswork.com/webhook/tbw-google-sheets-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'fetch' })
  });

  const data = await res.json();
  console.log('Sync fetched summary:', data.summary);

  const websiteLeads = data.websiteLeads || [];
  const whatsappLeads = data.whatsappLeads || [];
  const appointments = data.appointments || [];

  console.log(`Processing ${websiteLeads.length} website leads, ${whatsappLeads.length} WhatsApp leads, ${appointments.length} appointments...`);

  // 1. Process Website Leads
  for (const row of websiteLeads) {
    const sheetRowId = `G_SHEET_WEBSITE_${row._rowNumber}`;
    const name = row.name || 'Website Inquirer';
    const phone = row.phone ? String(row.phone).trim() : null;
    const email = row.email ? String(row.email).trim() : null;
    const service = row.service || 'Business Workflow Automation';
    const createdAt = parseDateToISO(row.receivedAt);
    const estVal = getEstimatedValue(service);
    const notesParts = [];
    if (row.business) notesParts.push(`Business: ${row.business}`);
    if (row.problem) notesParts.push(`Problem: ${row.problem}`);
    if (row.cta) notesParts.push(`CTA: ${row.cta}`);
    const notes = notesParts.join(' | ');

    // Check if lead already exists in admin_leads by google_sheet_row_id or email/phone
    const { data: existingLead } = await supabase
      .from('admin_leads')
      .select('id')
      .eq('google_sheet_row_id', sheetRowId)
      .maybeSingle();

    if (existingLead) {
      console.log(`Lead ${sheetRowId} already exists (${existingLead.id}), updating...`);
      await supabase.from('admin_leads').update({
        contact_name: name,
        contact_phone: phone,
        contact_email: email,
        service_interest: service,
        estimated_value: estVal,
        notes,
        updated_at: new Date().toISOString()
      }).eq('id', existingLead.id);
    } else {
      console.log(`Inserting new website lead ${sheetRowId} (${name})...`);
      const { data: inserted, error: insErr } = await supabase.from('admin_leads').insert({
        contact_name: name,
        contact_phone: phone,
        contact_email: email,
        source: 'website',
        service_interest: service,
        status: 'new',
        estimated_value: estVal,
        notes,
        google_sheet_row_id: sheetRowId,
        created_at: createdAt,
        updated_at: createdAt,
        is_demo: false
      }).select().single();
      if (insErr) console.error('Insert lead error:', insErr);
      else console.log('Inserted website lead ID:', inserted.id);
    }
  }

  // 2. Process WhatsApp Leads
  for (const row of whatsappLeads) {
    const sheetRowId = `G_SHEET_WA_${row._rowNumber}`;
    const name = row.name || 'WhatsApp Contact';
    const rawPhone = String(row.phone || '').replace(/\D/g, '');
    const phone = rawPhone ? `+${rawPhone}` : null;
    const purpose = row.purpose || '';
    const service = purpose.split(':')[0]?.trim() || 'AI Agents & Chatbots';
    const createdAt = parseDateToISO(row.receivedAt);
    const estVal = getEstimatedValue(service);
    const notesParts = [];
    if (row.business) notesParts.push(`Business: ${row.business}`);
    if (purpose) notesParts.push(`Purpose: ${purpose}`);
    if (row.language) notesParts.push(`Language: ${row.language}`);
    const notes = notesParts.join(' | ');

    const { data: existingLead } = await supabase
      .from('admin_leads')
      .select('id')
      .eq('google_sheet_row_id', sheetRowId)
      .maybeSingle();

    if (existingLead) {
      console.log(`WhatsApp lead ${sheetRowId} already exists (${existingLead.id}), updating...`);
      await supabase.from('admin_leads').update({
        contact_name: name,
        contact_phone: phone,
        service_interest: service,
        estimated_value: estVal,
        notes,
        updated_at: new Date().toISOString()
      }).eq('id', existingLead.id);
    } else {
      console.log(`Inserting new WhatsApp lead ${sheetRowId} (${name})...`);
      const { data: inserted, error: insErr } = await supabase.from('admin_leads').insert({
        contact_name: name,
        contact_phone: phone,
        source: 'whatsapp',
        service_interest: service,
        status: 'new',
        estimated_value: estVal,
        notes,
        google_sheet_row_id: sheetRowId,
        created_at: createdAt,
        updated_at: createdAt,
        is_demo: false
      }).select().single();
      if (insErr) console.error('Insert WA lead error:', insErr);
      else console.log('Inserted WhatsApp lead ID:', inserted.id);
    }
  }

  // 3. Process Appointments (if any exist)
  for (const row of appointments) {
    const calId = row.calendarEventId || `GCAL_ROW_${row._rowNumber}`;
    const name = row.name || 'Appointment Client';
    const phone = row.phone ? String(row.phone).trim() : '';
    const date = row.appointmentDate;
    const time = `${row.startTimeIST || ''} - ${row.endTimeIST || ''}`.trim() || '11:00 AM';
    const status = (row.bookingStatus && ['confirmed', 'completed', 'cancelled', 'pending'].includes(row.bookingStatus.toLowerCase())) ? row.bookingStatus.toLowerCase() : 'confirmed';
    const source = (row.source && row.source.toLowerCase().includes('instagram')) ? 'instagram' : 'whatsapp';
    const service = row.serviceRequested || 'Consultation';

    const { data: existingAppt } = await supabase
      .from('admin_appointments')
      .select('id')
      .eq('google_calendar_event_id', calId)
      .maybeSingle();

    if (existingAppt) {
      await supabase.from('admin_appointments').update({
        customer_name: name,
        contact_info: phone || name,
        appointment_date: date,
        appointment_time: time,
        status,
        service_requested: service,
        updated_at: new Date().toISOString()
      }).eq('id', existingAppt.id);
    } else {
      await supabase.from('admin_appointments').insert({
        customer_name: name,
        contact_info: phone || name,
        platform: source,
        service_requested: service,
        appointment_date: date,
        appointment_time: time,
        status,
        notes: row.calendarEventLink ? `Event link: ${row.calendarEventLink}` : null,
        google_calendar_event_id: calId,
        is_demo: false
      });
    }
  }

  console.log('\n--- VERIFYING SUPABASE STATE ---');
  const { data: allLeads } = await supabase.from('admin_leads').select('*').order('created_at', { ascending: false });
  console.log('Total admin_leads in Supabase now:', allLeads?.length);
  allLeads?.forEach(l => console.log(`- [${l.source.toUpperCase()}] ${l.contact_name} | ${l.contact_phone || l.contact_email} | ${l.service_interest} | ₹${l.estimated_value} | status: ${l.status}`));

  const { data: allAppts } = await supabase.from('admin_appointments').select('*');
  console.log('Total admin_appointments in Supabase now:', allAppts?.length);
}

testSync().catch(console.error);
