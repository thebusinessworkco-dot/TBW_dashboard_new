import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAllSessions,
  getAllContacts,
  getRecentEvents,
  formatIST,
} from '@/lib/whatsapp/session-manager';
import { getAllAdminNotifications } from '@/lib/whatsapp/admin-alert';

export async function GET() {
  try {
    const adminSupabase = createAdminClient();
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Fetch live database data if available, fallback to memory
    let contactsList: Array<{
      id: string;
      name: string;
      phone: string;
      created_at: string;
      updated_at: string;
      deleted_at?: string | null;
      classification?: string;
      selected_language?: string | null;
      session_status?: string;
      last_message_at?: string;
      last_message?: string;
      has_appointment?: boolean;
    }> = [];

    let totalActiveContacts = 0;
    let newCustomersToday = 0;
    let returningCustomersToday = 0;
    let activeSessionsCount = 0;
    let waitingForCustomerCount = 0;
    let followUpsSentCount = 0;
    let expiredSessionsCount = 0;
    let humanTakeoverCount = 0;
    let adminAlertsSentCount = 0;
    let adminAlertsFailedCount = 0;

    if (adminSupabase) {
      // Query contacts
      try {
        const { data: contacts } = await adminSupabase
          .from('admin_contacts')
          .select('id, name, phone, created_at, updated_at, notes')
          .order('created_at', { ascending: false });

        const { data: convs } = await adminSupabase
          .from('admin_conversations')
          .select('id, contact_id, status, last_message, last_message_at, manual_takeover, automation_paused, unread_count')
          .eq('platform', 'whatsapp');

        const { data: appts } = await adminSupabase
          .from('admin_appointments')
          .select('contact_info, status')
          .eq('status', 'confirmed');

        const activeApptPhones = new Set(
          (appts || []).map((a) => (a.contact_info || '').replace(/\D/g, ''))
        );

        const convsByContact = new Map((convs || []).map((c) => [c.contact_id, c]));

        for (const c of contacts || []) {
          const isDeleted = c.notes && c.notes.includes('[DELETED_CONTACT]');
          if (isDeleted) continue; // Skip deleted contacts from active customer list

          totalActiveContacts++;
          const createdDate = new Date(c.created_at);
          const isToday = createdDate >= todayStart;

          const conv = convsByContact.get(c.id);
          const cleanPhone = (c.phone || '').replace(/\D/g, '');
          const hasAppt = activeApptPhones.has(cleanPhone);

          const isTakeover = Boolean(conv?.manual_takeover || conv?.automation_paused);
          if (isTakeover) humanTakeoverCount++;

          const sessionStatus = conv?.status === 'closed' ? 'EXPIRED' : 'ACTIVE';
          if (sessionStatus === 'ACTIVE') activeSessionsCount++;
          else expiredSessionsCount++;

          if (isToday) {
            newCustomersToday++;
          } else {
            returningCustomersToday++;
          }

          contactsList.push({
            id: c.id,
            name: c.name || `+${cleanPhone}`,
            phone: cleanPhone ? `+${cleanPhone}` : c.phone,
            created_at: c.created_at,
            updated_at: c.updated_at,
            classification: isToday ? 'NEW_CUSTOMER' : 'RETURNING_CUSTOMER',
            selected_language: 'English',
            session_status: sessionStatus,
            last_message_at: conv?.last_message_at || c.updated_at,
            last_message: conv?.last_message || 'Welcome to The Business Work',
            has_appointment: hasAppt,
          });
        }
      } catch {
        // Fallback to memory
      }
    }

    // Blend in memory sessions and contacts
    const memorySessions = getAllSessions();
    const memoryContacts = getAllContacts();
    const memoryAlerts = getAllAdminNotifications();

    for (const s of memorySessions) {
      if (s.status === 'ACTIVE' || s.status === 'AWAITING_LANGUAGE' || s.status === 'AWAITING_REPLY') {
        activeSessionsCount = Math.max(activeSessionsCount, memorySessions.length);
      }
      if (s.awaiting_customer) waitingForCustomerCount++;
      if (s.follow_up_sent_at) followUpsSentCount++;
      if (s.status === 'EXPIRED') expiredSessionsCount++;
      if (s.human_takeover_active) humanTakeoverCount++;
    }

    for (const a of memoryAlerts) {
      if (a.status === 'accepted' || a.status === 'sent' || a.status === 'delivered') {
        adminAlertsSentCount++;
      } else if (a.status === 'failed' || a.status === 'template_pending') {
        adminAlertsFailedCount++;
      }
    }

    // If contacts list was empty, populate from memory contacts
    if (contactsList.length === 0 && memoryContacts.length > 0) {
      totalActiveContacts = memoryContacts.length;
      contactsList = memoryContacts.map((c) => ({
        id: c.id,
        name: c.customer_name || `+${c.normalized_phone}`,
        phone: `+${c.normalized_phone}`,
        created_at: c.created_at,
        updated_at: c.updated_at,
        classification: 'NEW_CUSTOMER',
        selected_language: 'English',
        session_status: 'ACTIVE',
        last_message_at: c.last_seen_at,
        last_message: 'Started new conversation',
        has_appointment: false,
      }));
    }

    const events = getRecentEvents(25);

    return NextResponse.json({
      success: true,
      timestamp: formatIST(now),
      metrics: {
        totalActiveContacts,
        newCustomersToday,
        returningCustomersToday,
        activeSessions: activeSessionsCount,
        waitingForCustomer: waitingForCustomerCount,
        followUpsSent: followUpsSentCount,
        expiredSessions: expiredSessionsCount,
        humanTakeoverActive: humanTakeoverCount,
        adminAlertsSent: adminAlertsSentCount,
        adminAlertFailures: adminAlertsFailedCount,
        conversationsToday: newCustomersToday + returningCustomersToday,
      },
      contacts: contactsList,
      events,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch activity';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
