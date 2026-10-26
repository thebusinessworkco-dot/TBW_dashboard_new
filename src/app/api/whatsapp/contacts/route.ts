import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllContacts, getAllSessions } from '@/lib/whatsapp/session-manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const filterClass = searchParams.get('classification'); // 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER'
    const filterStatus = searchParams.get('status'); // 'ACTIVE' | 'EXPIRED'
    const filterLang = searchParams.get('language'); // 'English' | 'Hindi' | etc.

    const adminSupabase = createAdminClient();
    let contacts: Array<Record<string, unknown>> = [];

    if (adminSupabase) {
      try {
        const { data: dbContacts } = await adminSupabase
          .from('admin_contacts')
          .select('id, name, phone, created_at, updated_at, notes, company_name')
          .order('created_at', { ascending: false });

        const { data: convs } = await adminSupabase
          .from('admin_conversations')
          .select('id, contact_id, status, last_message, last_message_at, manual_takeover, automation_paused')
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

          contacts.push({
            id: c.id,
            name: c.name || `+${cleanPhone}`,
            phone: cleanPhone ? `+${cleanPhone}` : c.phone,
            normalized_phone: cleanPhone,
            created_at: c.created_at,
            updated_at: c.updated_at,
            classification,
            session_status: sessionStatus,
            selected_language: language,
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
