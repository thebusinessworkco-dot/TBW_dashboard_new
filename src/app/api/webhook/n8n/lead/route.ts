import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { estimateLeadValue } from '@/lib/sheets/google-sheets-sync';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const rawPhone = String(payload.phone_number || payload.phone || payload.wa_id || '').replace(/\D/g, '');
    const phone = rawPhone.length >= 10 ? (rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`) : null;
    const rawUsername = String(payload.username || payload.instagram_username || '').replace(/^@/, '').trim();
    const igUserId = String(payload.ig_user_id || payload.scoped_id || '').trim();
    const name = String(payload.name || payload.contact_name || (rawUsername ? `@${rawUsername}` : (phone ? `Lead +${phone.slice(-10)}` : 'Inbound Lead'))).slice(0, 100);
    const rawSource = String(payload.source || payload.channel || 'whatsapp').toLowerCase();
    const source = rawSource.includes('insta') ? 'instagram' : (rawSource.includes('web') ? 'website' : 'whatsapp');
    const service = String(payload.service || (payload.purpose ? payload.purpose.split(':')[0] : 'AI Agents & Chatbots')).trim();
    const estVal = estimateLeadValue(service);

    const notesParts: string[] = [];
    if (payload.category) notesParts.push(`Category: ${payload.category}`);
    if (payload.business) notesParts.push(`Business: ${payload.business}`);
    if (payload.purpose) notesParts.push(`Purpose: ${payload.purpose}`);
    if (payload.language) notesParts.push(`Language: ${payload.language}`);
    if (payload.notes) notesParts.push(payload.notes);
    const notes = notesParts.length > 0 ? notesParts.join(' | ') : undefined;

    if (adminSupabase && (phone || payload.name || rawUsername || igUserId)) {
      try {
        let contactId: string | undefined = undefined;

        if (phone) {
          const { data: contact } = await adminSupabase.from('admin_contacts').upsert(
            {
              name,
              phone,
              instagram_username: rawUsername || undefined,
              instagram_scoped_id: igUserId || undefined,
              company_name: payload.business || undefined,
              is_demo: false,
              updated_at: nowIso,
            },
            { onConflict: 'phone' }
          ).select('id').maybeSingle();

          if (contact) contactId = contact.id;
        } else if (igUserId) {
          const { data: contact } = await adminSupabase.from('admin_contacts').upsert(
            {
              name,
              instagram_username: rawUsername || undefined,
              instagram_scoped_id: igUserId,
              company_name: payload.business || undefined,
              is_demo: false,
              updated_at: nowIso,
            },
            { onConflict: 'instagram_scoped_id' }
          ).select('id').maybeSingle();

          if (contact) contactId = contact.id;
        }

        // Insert or update admin_leads
        const sheetRowId = payload.google_sheet_row_id || payload.row_id || payload.lead_id || `LIVE_${source.toUpperCase()}_${phone ? phone.slice(-10) : (igUserId ? igUserId.slice(-8) : Date.now().toString().slice(-6))}`;

        const { data: existingLead } = await adminSupabase
          .from('admin_leads')
          .select('id')
          .eq('google_sheet_row_id', sheetRowId)
          .maybeSingle();

        if (existingLead) {
          await adminSupabase.from('admin_leads').update({
            contact_name: name,
            contact_phone: phone,
            instagram_username: rawUsername || undefined,
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
            instagram_username: rawUsername || undefined,
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
