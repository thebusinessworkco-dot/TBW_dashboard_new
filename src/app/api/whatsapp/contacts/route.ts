import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllContacts, getAllSessions } from '@/lib/whatsapp/session-manager';
import {
  extractSessionMetadata,
  extractContactTags,
  encodeContactTags,
} from '@/lib/whatsapp/session-identity';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const filterClass = searchParams.get('classification'); // 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER'
    const filterStatus = searchParams.get('status'); // 'ACTIVE' | 'EXPIRED'
    const filterLang = searchParams.get('language'); // 'English' | 'Hindi' | etc.

    const adminSupabase = createAdminClient();
    const contacts: Array<Record<string, unknown>> = [];

    if (adminSupabase) {
      try {
        const { data: dbContacts } = await adminSupabase
          .from('admin_contacts')
          .select('id, name, phone, created_at, updated_at, notes, company_name')
          .order('created_at', { ascending: false });

        const { data: convs } = await adminSupabase
          .from('admin_conversations')
          .select('id, contact_id, status, last_message, last_message_at, manual_takeover, automation_paused, internal_notes')
          .eq('platform', 'whatsapp');

        const { data: appts } = await adminSupabase
          .from('admin_appointments')
          .select('contact_info, status')
          .eq('status', 'confirmed');

        const activeApptPhones = new Set(
          (appts || []).map((a) => (a.contact_info || '').replace(/\D/g, ''))
        );

        const convMap = new Map((convs || []).map((c) => [c.contact_id, c]));
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        for (const c of dbContacts || []) {
          // Exclude soft-deleted contacts from active contact management
          if (c.notes && c.notes.includes('[DELETED_CONTACT]')) continue;

          const conv = convMap.get(c.id);
          const cleanPhone = (c.phone || '').replace(/\D/g, '');
          const isToday = new Date(c.created_at) >= todayStart;
          const classification = isToday ? 'NEW_CUSTOMER' : 'RETURNING_CUSTOMER';
          const sessionStatus = conv?.status === 'closed' ? 'EXPIRED' : 'ACTIVE';
          const language = 'English';

          // Apply filters
          if (filterClass && classification !== filterClass) continue;
          if (filterStatus && sessionStatus !== filterStatus) continue;
          if (filterLang && language !== filterLang) continue;

          if (query) {
            const nameMatch = (c.name || '').toLowerCase().includes(query);
            const phoneMatch = cleanPhone.includes(query);
            if (!nameMatch && !phoneMatch) continue;
          }

          const convMeta = extractSessionMetadata(conv);
          const sessionCustomerName = convMeta.session_customer_name || null;
          const tags = extractContactTags(c as any);

          contacts.push({
            id: c.id,
            name: c.name || `+${cleanPhone}`,
            session_customer_name: sessionCustomerName,
            phone: cleanPhone ? `+${cleanPhone}` : c.phone,
            normalized_phone: cleanPhone,
            company_name: c.company_name || '',
            notes: c.notes || '',
            tags,
            created_at: c.created_at,
            updated_at: c.updated_at,
            classification,
            session_status: sessionStatus,
            selected_language: language,
            conversation_id: conv?.id || null,
            last_message: conv?.last_message || null,
            last_message_at: conv?.last_message_at || c.updated_at,
            has_appointment: activeApptPhones.has(cleanPhone),
            human_takeover: Boolean(conv?.manual_takeover || conv?.automation_paused),
          });
        }
      } catch {
        // Fallback
      }
    }

    // Blend memory contacts if list is empty
    if (contacts.length === 0) {
      const memContacts = getAllContacts();
      const sessions = new Map(getAllSessions().map((s) => [s.contact_id, s]));

      for (const mc of memContacts) {
        const s = sessions.get(mc.id);
        const classification = s?.customer_classification || 'NEW_CUSTOMER';
        const sessionStatus = s?.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE';
        const language = s?.selected_language || 'English';

        if (filterClass && classification !== filterClass) continue;
        if (filterStatus && sessionStatus !== filterStatus) continue;
        if (filterLang && language !== filterLang) continue;

        if (query) {
          const nameMatch = (mc.customer_name || '').toLowerCase().includes(query);
          const phoneMatch = mc.normalized_phone.includes(query);
          if (!nameMatch && !phoneMatch) continue;
        }

        contacts.push({
          id: mc.id,
          name: mc.customer_name || `+${mc.normalized_phone}`,
          phone: `+${mc.normalized_phone}`,
          normalized_phone: mc.normalized_phone,
          created_at: mc.created_at,
          updated_at: mc.updated_at,
          classification,
          session_status: sessionStatus,
          selected_language: language,
          last_message: 'Started new conversation',
          last_message_at: mc.last_seen_at,
          has_appointment: false,
          human_takeover: s?.human_takeover_active || false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: contacts.length,
      contacts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching contacts';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { contactId, phone, name, company_name, notes, tags } = body;

    if (!contactId && !phone) {
      return NextResponse.json(
        { success: false, error: 'contactId or phone is required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { success: false, error: 'Database service unavailable' },
        { status: 503 }
      );
    }

    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
    const nowIso = new Date().toISOString();
    const updateData: Record<string, unknown> = { updated_at: nowIso };
    if (name !== undefined) updateData.name = String(name).trim();
    if (company_name !== undefined) updateData.company_name = String(company_name).trim();

    let finalNotes = notes !== undefined ? String(notes) : undefined;
    if (tags !== undefined && Array.isArray(tags)) {
      let baseNotes = finalNotes;
      if (baseNotes === undefined) {
        let getQuery = adminSupabase.from('admin_contacts').select('notes');
        if (contactId) getQuery = getQuery.eq('id', contactId);
        else getQuery = getQuery.or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`);
        const { data: existing } = await getQuery.maybeSingle();
        baseNotes = existing?.notes || '';
      }
      finalNotes = encodeContactTags(baseNotes, tags);
    }
    if (finalNotes !== undefined) {
      updateData.notes = finalNotes;
    }

    let query = adminSupabase.from('admin_contacts').update(updateData);
    if (contactId) {
      query = query.eq('id', contactId);
    } else {
      query = query.or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`);
    }

    const { data, error } = await query.select('id, name, phone, company_name, notes, updated_at').single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      contact: data,
      message: 'Contact updated successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update contact';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, company_name, notes, tags } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name and phone number are required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { success: false, error: 'Database service unavailable' },
        { status: 503 }
      );
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? `+${cleanPhone}` : `+91${cleanPhone}`;
    const nowIso = new Date().toISOString();

    // Check if contact already exists
    const { data: existing } = await adminSupabase
      .from('admin_contacts')
      .select('id, name, phone, company_name, notes')
      .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        contact: existing,
        message: 'Contact already exists with this phone number',
        isExisting: true,
      });
    }

    let finalNotes = (notes || '').trim();
    if (tags && Array.isArray(tags)) {
      finalNotes = encodeContactTags(finalNotes, tags);
    }

    const { data: newContact, error: createErr } = await adminSupabase
      .from('admin_contacts')
      .insert({
        name: String(name).trim(),
        phone: formattedPhone,
        company_name: company_name ? String(company_name).trim() : null,
        notes: finalNotes || 'Created via TBW Contact Directory',
        is_demo: false,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id, name, phone, company_name, notes, created_at, updated_at')
      .single();

    if (createErr || !newContact) {
      return NextResponse.json(
        { success: false, error: createErr?.message || 'Failed to insert contact' },
        { status: 500 }
      );
    }

    // Also initialize an initial conversation in admin_conversations
    await adminSupabase.from('admin_conversations').insert({
      contact_id: newContact.id,
      platform: 'whatsapp',
      status: 'open',
      last_message: 'Contact profile registered in TBW Directory',
      last_message_at: nowIso,
      unread_count: 0,
      manual_takeover: false,
      automation_paused: false,
      is_demo: false,
      created_at: nowIso,
      updated_at: nowIso,
    });

    return NextResponse.json({
      success: true,
      contact: newContact,
      message: 'Contact created successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create contact';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

