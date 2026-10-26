import { createAdminClient } from '../supabase/admin';

export interface WaContactRecord {
  id: string;
  normalized_phone: string;
  customer_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CustomerClassification = 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER';
export type SessionStatus =
  | 'ACTIVE'
  | 'AWAITING_LANGUAGE'
  | 'AWAITING_REPLY'
  | 'HUMAN_TAKEOVER'
  | 'EXPIRED'
  | 'CLOSED';

export interface WaSessionRecord {
  id: string;
  contact_id: string | null;
  session_id: string;
  status: SessionStatus;
  customer_classification: CustomerClassification;
  selected_language: 'English' | 'Hindi' | 'Hinglish' | 'Marathi' | string | null;
  started_at: string;
  last_customer_message_at: string;
  last_bot_message_at: string | null;
  expires_at: string;
  follow_up_due_at: string | null;
  follow_up_sent_at: string | null;
  awaiting_customer: boolean;
  human_takeover_active: boolean;
  closed_at: string | null;
  close_reason: string | null;
  version: number;
  initial_question?: string | null;
}

export interface WaAdminNotificationRecord {
  id: string;
  session_id: string;
  customer_classification: CustomerClassification;
  notification_type: 'SESSION_START' | 'RETURNING_SESSION';
  recipient_phone: string;
  meta_message_id: string | null;
  status: 'queued' | 'submitted' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | 'template_pending';
  attempts: number;
  last_error_code: string | null;
  message_body: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

export interface WaSessionEventRecord {
  id: string;
  session_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Normalizes any phone number into raw country code + national digits (e.g. 918604600292)
 */
export function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  return digits;
}

/**
 * Format IST Date and Time
 */
export function formatIST(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date) + ' IST';
}

const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const FOLLOW_UP_DELAY_MS = 3 * 60 * 1000; // 3 minutes
const ADMIN_PHONE = '918604600292';
const BUSINESS_PHONE = '917972020292';

/**
 * In-memory fallback cache when Supabase database tables wa_* are not yet physically migrated
 */
const inMemorySessions: Map<string, WaSessionRecord> = new Map();
const inMemoryContacts: Map<string, WaContactRecord> = new Map();
const inMemoryNotifications: Map<string, WaAdminNotificationRecord> = new Map();
const inMemoryEvents: WaSessionEventRecord[] = [];

/**
 * Check if the contact is deleted in database or memory
 */
export async function isContactDeleted(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const adminSupabase = createAdminClient();

  if (adminSupabase) {
    // 1. Check wa_contacts if exists
    try {
      const { data, error } = await adminSupabase
        .from('wa_contacts')
        .select('deleted_at')
        .eq('normalized_phone', normalized)
        .maybeSingle();

      if (!error && data) {
        return data.deleted_at !== null;
      }
    } catch {
      // wa_contacts table not ready, check admin_contacts
    }

    // 2. Check admin_contacts
    try {
      const { data } = await adminSupabase
        .from('admin_contacts')
        .select('id, notes')
        .or(`phone.eq.${normalized},phone.eq.+${normalized}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const contact = data[0];
        // If notes indicates soft-deleted
        if (contact.notes && contact.notes.includes('[DELETED_CONTACT]')) {
          return true;
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Fallback memory check
  const mem = inMemoryContacts.get(normalized);
  if (mem) {
    return mem.deleted_at !== null;
  }

  return false;
}

/**
 * Resolves or starts a session for an incoming message
 */
export async function resolveSessionForInbound(params: {
  phone: string;
  customerName?: string;
  messageText?: string;
  messageId?: string;
}): Promise<{
  session: WaSessionRecord;
  isNewSession: boolean;
  classification: CustomerClassification;
  requiresLanguageSelection: boolean;
  adminNotificationRequired: boolean;
}> {
  const normalized = normalizePhone(params.phone);
  const now = new Date();
  const nowIso = now.toISOString();
  const adminSupabase = createAdminClient();

  // 1. Database-First Persistent Atomic Session Resolution
  if (adminSupabase) {
    try {
      const { data: dbRows, error: dbErr } = await adminSupabase.rpc('register_inbound_customer_message', {
        p_phone: normalized,
        p_customer_name: params.customerName || null,
        p_message_text: params.messageText || null,
        p_wamid: params.messageId || null,
      });

      if (!dbErr && Array.isArray(dbRows) && dbRows.length > 0) {
        const row = dbRows[0];
        const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS).toISOString();

        const dbSession: WaSessionRecord = {
          id: row.session_id,
          contact_id: normalized,
          session_id: row.session_id,
          status: row.human_takeover_active
            ? 'HUMAN_TAKEOVER'
            : row.requires_language_selection
            ? 'AWAITING_LANGUAGE'
            : 'ACTIVE',
          customer_classification: row.customer_classification as CustomerClassification,
          selected_language: row.selected_language,
          started_at: nowIso,
          last_customer_message_at: nowIso,
          last_bot_message_at: null,
          expires_at: expiresAt,
          follow_up_due_at: null,
          follow_up_sent_at: null,
          awaiting_customer: false,
          human_takeover_active: Boolean(row.human_takeover_active),
          closed_at: null,
          close_reason: null,
          version: 1,
          initial_question: params.messageText || null,
        };

        inMemorySessions.set(normalized, dbSession);

        return {
          session: dbSession,
          isNewSession: Boolean(row.is_new_session),
          classification: row.customer_classification as CustomerClassification,
          requiresLanguageSelection: Boolean(row.requires_language_selection),
          adminNotificationRequired: Boolean(row.is_new_session && row.customer_classification === 'NEW_CUSTOMER'),
        };
      }
    } catch (dbErr) {
      console.error('[Session Manager DB Error in register_inbound]:', dbErr);
    }
  }

  // 1. Check if contact is deleted
  const deleted = await isContactDeleted(normalized);

  // 2. Determine Contact Existence
  let existingContact: WaContactRecord | null = null;

  if (!deleted) {
    // Check in-memory first
    if (inMemoryContacts.has(normalized)) {
      const c = inMemoryContacts.get(normalized)!;
      if (!c.deleted_at) existingContact = c;
    }

    // Check DB
    if (!existingContact && adminSupabase) {
      try {
        const { data: waC } = await adminSupabase
          .from('wa_contacts')
          .select('*')
          .eq('normalized_phone', normalized)
          .is('deleted_at', null)
          .maybeSingle();
        if (waC) existingContact = waC as WaContactRecord;
      } catch {
        // Fallback to admin_contacts
      }

      if (!existingContact) {
        try {
          const { data: admC } = await adminSupabase
            .from('admin_contacts')
            .select('id, name, phone, created_at, updated_at, notes')
            .or(`phone.eq.${normalized},phone.eq.+${normalized}`)
            .order('created_at', { ascending: true })
            .limit(1);

          if (admC && admC[0] && (!admC[0].notes || !admC[0].notes.includes('[DELETED_CONTACT]'))) {
            existingContact = {
              id: admC[0].id,
              normalized_phone: normalized,
              customer_name: admC[0].name,
              first_seen_at: admC[0].created_at,
              last_seen_at: admC[0].updated_at || admC[0].created_at,
              created_at: admC[0].created_at,
              updated_at: admC[0].updated_at || admC[0].created_at,
              deleted_at: null,
            };
          }
        } catch {
          // Ignore
        }
      }
    }
  }

  // Determine Customer Classification:
  // If contact was deleted OR does not exist -> NEW_CUSTOMER
  // If contact exists and not deleted -> RETURNING_CUSTOMER (when previous session expired)
  const classification: CustomerClassification = existingContact ? 'RETURNING_CUSTOMER' : 'NEW_CUSTOMER';

  // 3. Check for Active Session for this phone
  let activeSession: WaSessionRecord | null = inMemorySessions.get(normalized) || null;

  if (activeSession) {
    const lastMsgTime = new Date(activeSession.last_customer_message_at).getTime();
    const isExpired = now.getTime() - lastMsgTime > INACTIVITY_TIMEOUT_MS || activeSession.status === 'EXPIRED' || activeSession.status === 'CLOSED';

    if (isExpired) {
      // Mark previous session expired
      activeSession.status = 'EXPIRED';
      activeSession.closed_at = nowIso;
      activeSession.close_reason = 'closed_inactivity';
      await logSessionEvent(activeSession.session_id, 'session_expired', {
        reason: '20_minute_inactivity_timeout',
        phone: normalized,
      });
      activeSession = null;
    }
  }

  // If no active session, create a FRESH SESSION
  if (!activeSession) {
    const newSessionId = `wa_sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS).toISOString();

    // Create or update contact record
    if (!existingContact) {
      existingContact = {
        id: crypto.randomUUID?.() || `c_${Date.now()}`,
        normalized_phone: normalized,
        customer_name: params.customerName || null,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      };
      inMemoryContacts.set(normalized, existingContact);

      // Persist in DB
      if (adminSupabase) {
        try {
          await adminSupabase.from('wa_contacts').upsert({
            id: existingContact.id,
            normalized_phone: normalized,
            customer_name: params.customerName || null,
            first_seen_at: nowIso,
            last_seen_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso,
            deleted_at: null,
          });
        } catch {
          // Ignore if table not created yet
        }
      }
    } else {
      existingContact.last_seen_at = nowIso;
      existingContact.updated_at = nowIso;
      inMemoryContacts.set(normalized, existingContact);
    }

    const freshSession: WaSessionRecord = {
      id: crypto.randomUUID?.() || `s_${Date.now()}`,
      contact_id: existingContact.id,
      session_id: newSessionId,
      status: 'AWAITING_LANGUAGE',
      customer_classification: classification,
      selected_language: null,
      started_at: nowIso,
      last_customer_message_at: nowIso,
      last_bot_message_at: null,
      expires_at: expiresAt,
      follow_up_due_at: null,
      follow_up_sent_at: null,
      awaiting_customer: false,
      human_takeover_active: false,
      closed_at: null,
      close_reason: null,
      version: 1,
      initial_question: params.messageText || null,
    };

    inMemorySessions.set(normalized, freshSession);

    // Persist in DB
    if (adminSupabase) {
      try {
        await adminSupabase.from('wa_sessions').insert(freshSession);
      } catch {
        // Table not ready
      }
    }

    await logSessionEvent(newSessionId, 'session_started', {
      phone: normalized,
      classification,
      customer_name: params.customerName || null,
      first_message: params.messageText || null,
    });

    return {
      session: freshSession,
      isNewSession: true,
      classification,
      requiresLanguageSelection: true,
      adminNotificationRequired: true,
    };
  }

  // Active Session Exists: Extend 20-minute timer and reset 3-minute awaiting cycle
  activeSession.last_customer_message_at = nowIso;
  activeSession.expires_at = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS).toISOString();
  activeSession.awaiting_customer = false; // customer replied, cancel awaiting
  activeSession.follow_up_due_at = null;
  activeSession.version += 1;

  inMemorySessions.set(normalized, activeSession);

  // Update DB
  if (adminSupabase) {
    try {
      await adminSupabase
        .from('wa_sessions')
        .update({
          last_customer_message_at: nowIso,
          expires_at: activeSession.expires_at,
          awaiting_customer: false,
          follow_up_due_at: null,
          version: activeSession.version,
        })
        .eq('session_id', activeSession.session_id);
    } catch {
      // Ignore
    }
  }

  await logSessionEvent(activeSession.session_id, 'customer_replied', {
    phone: normalized,
    message: params.messageText || null,
  });

  return {
    session: activeSession,
    isNewSession: false,
    classification: activeSession.customer_classification,
    requiresLanguageSelection: activeSession.status === 'AWAITING_LANGUAGE',
    adminNotificationRequired: false,
  };
}

/**
 * Updates selected language for active session
 */
export async function setSessionLanguage(
  phone: string,
  language: 'English' | 'Hindi' | 'Hinglish' | 'Marathi' | string
): Promise<WaSessionRecord | null> {
  const normalized = normalizePhone(phone);
  const session = inMemorySessions.get(normalized);
  if (!session) return null;

  session.selected_language = language;
  session.status = 'ACTIVE';
  session.version += 1;

  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      await adminSupabase
        .from('wa_sessions')
        .update({
          selected_language: language,
          status: 'ACTIVE',
          version: session.version,
        })
        .eq('session_id', session.session_id);
    } catch {
      // Ignore
    }
  }

  await logSessionEvent(session.session_id, 'language_selected', {
    phone: normalized,
    language,
  });

  return session;
}

/**
 * Record bot reply and set 3-minute follow-up timer
 */
export async function recordBotMessage(
  phone: string,
  awaitingReply: boolean = true
): Promise<void> {
  const normalized = normalizePhone(phone);
  const session = inMemorySessions.get(normalized);
  if (!session) return;

  const now = new Date();
  session.last_bot_message_at = now.toISOString();

  if (awaitingReply && !session.human_takeover_active) {
    session.awaiting_customer = true;
    session.follow_up_due_at = new Date(now.getTime() + FOLLOW_UP_DELAY_MS).toISOString();
    session.follow_up_sent_at = null;
    session.status = 'AWAITING_REPLY';
  } else {
    session.awaiting_customer = false;
    session.follow_up_due_at = null;
  }

  session.version += 1;

  const adminSupabase = createAdminClient();
  if (adminSupabase && session?.session_id) {
    try {
      await adminSupabase.rpc('record_bot_outgoing_dispatch', {
        p_session_id: session.session_id,
        p_awaiting_reply: awaitingReply,
        p_idempotency_key: `out_bot_${session.session_id}_${Date.now()}`
      });
    } catch {
      try {
        await adminSupabase
          .from('wa_sessions')
          .update({
            last_bot_message_at: session.last_bot_message_at,
            awaiting_customer: session.awaiting_customer,
            follow_up_due_at: session.follow_up_due_at,
            status: session.status,
            version: session.version,
          })
          .eq('session_id', session.session_id);
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Delete Contact Action
 * Soft deletes contact, closes active session, cancels pending follow-ups.
 * Guaranteed to NOT touch or delete Google Calendar appointments or admin_appointments.
 */
export async function deleteContactSafely(
  phoneOrId: string,
  adminUserEmail: string = 'thebusinesswork.co@gmail.com'
): Promise<{
  success: boolean;
  contactId: string;
  normalizedPhone: string;
  confirmedAppointmentsCount: number;
}> {
  const normalized = normalizePhone(phoneOrId);
  const nowIso = new Date().toISOString();
  const adminSupabase = createAdminClient();

  // 1. Check verified appointments (Warning check)
  let apptCount = 0;
  if (adminSupabase) {
    try {
      const { data: appts } = await adminSupabase
        .from('admin_appointments')
        .select('id, status')
        .or(`contact_info.eq.${normalized},contact_info.eq.+${normalized}`)
        .eq('status', 'confirmed');
      apptCount = appts?.length || 0;
    } catch {
      apptCount = 0;
    }
  }

  // 2. Mark contact deleted in memory
  let contactRecord = inMemoryContacts.get(normalized);
  if (contactRecord) {
    contactRecord.deleted_at = nowIso;
  } else {
    contactRecord = {
      id: crypto.randomUUID?.() || `c_${Date.now()}`,
      normalized_phone: normalized,
      customer_name: null,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: nowIso,
    };
    inMemoryContacts.set(normalized, contactRecord);
  }

  // 3. Invalidate active session in memory
  const activeSession = inMemorySessions.get(normalized);
  if (activeSession) {
    activeSession.status = 'CLOSED';
    activeSession.closed_at = nowIso;
    activeSession.close_reason = 'contact_deleted';
    activeSession.awaiting_customer = false;
    activeSession.follow_up_due_at = null;
    await logSessionEvent(activeSession.session_id, 'contact_deleted', {
      phone: normalized,
      deleted_by: adminUserEmail,
      preserved_appointments_count: apptCount,
    });
    inMemorySessions.delete(normalized);
  }

  // 4. Update Database
  if (adminSupabase) {
    // A. Update wa_contacts if exists
    try {
      await adminSupabase
        .from('wa_contacts')
        .update({ deleted_at: nowIso, updated_at: nowIso })
        .eq('normalized_phone', normalized);
    } catch {
      // Ignore
    }

    // B. Soft-delete admin_contacts by tagging notes and updating updated_at
    try {
      const { data: contacts } = await adminSupabase
        .from('admin_contacts')
        .select('id, notes')
        .or(`phone.eq.${normalized},phone.eq.+${normalized}`);

      for (const c of contacts || []) {
        const updatedNotes = (c.notes || '') + `\n[DELETED_CONTACT] by ${adminUserEmail} at ${nowIso}`;
        await adminSupabase
          .from('admin_contacts')
          .update({ notes: updatedNotes.trim(), updated_at: nowIso })
          .eq('id', c.id);
      }
    } catch {
      // Ignore
    }

    // C. Close conversation in admin_conversations
    try {
      const { data: contacts } = await adminSupabase
        .from('admin_contacts')
        .select('id')
        .or(`phone.eq.${normalized},phone.eq.+${normalized}`);

      const contactIds = (contacts || []).map((c) => c.id);
      if (contactIds.length > 0) {
        await adminSupabase
          .from('admin_conversations')
          .update({
            status: 'closed',
            updated_at: nowIso,
          })
          .in('contact_id', contactIds);
      }
    } catch {
      // Ignore
    }
  }

  return {
    success: true,
    contactId: contactRecord.id,
    normalizedPhone: normalized,
    confirmedAppointmentsCount: apptCount,
  };
}

/**
 * Log session event for realtime dashboard feed
 */
export async function logSessionEvent(
  sessionId: string | null,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const event: WaSessionEventRecord = {
    id: crypto.randomUUID?.() || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    session_id: sessionId,
    event_type: eventType,
    metadata,
    created_at: new Date().toISOString(),
  };

  inMemoryEvents.unshift(event);
  if (inMemoryEvents.length > 200) inMemoryEvents.pop();

  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      await adminSupabase.from('wa_session_events').insert(event);
    } catch {
      // Fallback
    }
  }
}

/**
 * Helper to fetch in-memory sessions for live metrics
 */
export function getAllSessions(): WaSessionRecord[] {
  return Array.from(inMemorySessions.values());
}

/**
 * Helper to fetch in-memory contacts
 */
export function getAllContacts(): WaContactRecord[] {
  return Array.from(inMemoryContacts.values()).filter((c) => !c.deleted_at);
}

/**
 * Helper to fetch live events
 */
export function getRecentEvents(limit: number = 25): WaSessionEventRecord[] {
  return inMemoryEvents.slice(0, limit);
}
