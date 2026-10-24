import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { estimateLeadValue } from '@/lib/sheets/google-sheets-sync';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const customSecret = request.headers.get('x-tbw-webhook-secret') || request.headers.get('x-n8n-api-key') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

    const expectedSecret = process.env.N8N_WEBHOOK_SECRET || process.env.N8N_API_KEY;
    if (expectedSecret && bearer !== expectedSecret && customSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const rawPhone = String(payload.phone_number || payload.phone || payload.wa_id || '').replace(/\D/g, '');
    const phone = rawPhone.length >= 10 ? (rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`) : null;
    const name = String(payload.name || payload.contact_name || (phone ? `Lead +${phone.slice(-10)}` : 'Inbound Lead')).slice(0, 100);
    const rawSource = String(payload.source || payload.channel || 'whatsapp').toLowerCase();
    const source = rawSource.includes('insta') ? 'instagram' : (rawSource.includes('web') ? 'website' : 'whatsapp');
    const service = String(payload.service || (payload.purpose ? payload.purpose.split(':')[0] : 'AI Agents & Chatbots')).trim();
    const estVal = estimateLeadValue(service);

    const notesParts: string[] = [];
    if (payload.business) notesParts.push(`Business: ${payload.business}`);
    if (payload.purpose) notesParts.push(`Purpose: ${payload.purpose}`);
    if (payload.notes) notesParts.push(payload.notes);
    const notes = notesParts.length > 0 ? notesParts.join(' | ') : undefined;

    if (adminSupabase && (phone || payload.name || payload.instagram_username)) {
      try {
        let contactId: string | undefined = undefined;

        if (phone) {
          const { data: contact } = await adminSupabase.from('admin_contacts').upsert(
            {
              name,
              phone,
              instagram_username: payload.instagram_username || undefined,
              company_name: payload.business || undefined,
              is_demo: false,
              updated_at: nowIso,
            },
            { onConflict: 'phone' }
          ).select('id').maybeSingle();

          if (contact) contactId = contact.id;
        }

        // Insert or update admin_leads
        const sheetRowId = payload.google_sheet_row_id || payload.row_id || `LIVE_${source.toUpperCase()}_${phone ? phone.slice(-10) : Date.now().toString().slice(-6)}`;

        const { data: existingLead } = await adminSupabase
          .from('admin_leads')
          .select('id')
          .eq('google_sheet_row_id', sheetRowId)
          .maybeSingle();

        if (existingLead) {
          await adminSupabase.from('admin_leads').update({
            contact_name: name,
            contact_phone: phone,
            service_interest: service,
            estimated_value: estVal,
            notes,
            contact_id: contactId,
            updated_at: nowIso,
          }).eq('id', existingLead.id);
        } else {
          await adminSupabase.from('admin_leads').insert({
            contact_name: name,
            contact_phone: phone,
            contact_email: payload.email || undefined,
            instagram_username: payload.instagram_username || undefined,
            source,
            service_interest: service,
            status: 'new',
            estimated_value: estVal,
            notes,
            google_sheet_row_id: sheetRowId,
            contact_id: contactId,
            created_at: nowIso,
            updated_at: nowIso,
            is_demo: false,
          });
        }
      } catch {
        // Non-blocking lead upsert
      }
    }

    return NextResponse.json({ success: true, processed: true, timestamp: nowIso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lead capture failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
