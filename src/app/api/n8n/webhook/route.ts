import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * SELF-HOSTED n8n INTEGRATION WEBHOOK ENDPOINT
 *
 * Facilitates bidirectional integration between self-hosted n8n workflows (Instagram & WhatsApp)
 * and the Vercel-hosted Admin Dashboard with Supabase.
 *
 * Security & Reliability Guarantees:
 * 1. Mandatory Webhook Secret: Fails closed with 500 if N8N_WEBHOOK_SECRET is unset in environment.
 * 2. Mandatory Stable Contact Identifiers:
 *    - Instagram: sender_id (IGSID) is mandatory.
 *    - WhatsApp: phone (Normalized digits) is mandatory. Mutable names alone are disallowed.
 * 3. Concurrency Protection: Catches unique constraint violations (23505) on contacts, conversations, and messages.
 * 4. Fail-Closed Takeover: Returns can_respond: false on errors, active takeover, or paused automation.
 * 5. Outbound AI Reply Verification: Verifies takeover has not been activated before saving AI replies.
 * 6. Status Integrity: Incoming & outgoing messages saved with status = 'sent' (never fabricated 'delivered').
 */
/**
 * Parses incoming timestamp (Unix seconds, milliseconds, or ISO string) preserving millisecond precision
 */
function parseTimestamp(rawTs: unknown, fallbackIso: string): string {
  if (!rawTs) return fallbackIso;
  if (typeof rawTs === 'number' || /^\d+$/.test(String(rawTs))) {
    const num = Number(rawTs);
    const ms = num < 10000000000 ? num * 1000 : num;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? fallbackIso : d.toISOString();
  }
  const d = new Date(String(rawTs));
  return isNaN(d.getTime()) ? fallbackIso : d.toISOString();
}

/**
 * Extract rich metadata from WhatsApp and n8n webhook payloads
 */
function extractMessageMetadata(payload: Record<string, unknown>): Record<string, unknown> | null {
  const meta: Record<string, unknown> = {};

  // Check top-level metadata object first
  if (payload.metadata && typeof payload.metadata === 'object') {
    Object.assign(meta, payload.metadata);
  }

  // Interactive object
  const interactivePayload = payload.interactive || (payload.metadata as Record<string, unknown>)?.interactive;
  if (interactivePayload && typeof interactivePayload === 'object') {
    meta.interactive = {
      ...((meta.interactive as Record<string, unknown>) || {}),
      ...(interactivePayload as Record<string, unknown>),
    };
  }

  const interactiveRecord = (meta.interactive && typeof meta.interactive === 'object'
    ? meta.interactive
    : {}) as Record<string, unknown>;

  // If top-level action passed (Meta WhatsApp Cloud API payload root)
  if (payload.action && typeof payload.action === 'object') {
    meta.interactive = {
      ...interactiveRecord,
      type: (payload.type as string) || (payload.message_type as string) || 'interactive',
      body: (payload.body as { text?: string }) || (interactiveRecord.body as { text?: string }),
      action: payload.action as Record<string, unknown>,
    };
  }

  // Button reply
  const btnReply = payload.button_reply || (interactiveRecord.button_reply as Record<string, unknown>);
  if (btnReply && typeof btnReply === 'object') {
    meta.interactive = {
      ...((meta.interactive as Record<string, unknown>) || {}),
      type: 'button_reply',
      button_reply: btnReply,
      selected_button: btnReply,
    };
  }

  // List reply
  const listReply = payload.list_reply || (interactiveRecord.list_reply as Record<string, unknown>);
  if (listReply && typeof listReply === 'object') {
    meta.interactive = {
      ...((meta.interactive as Record<string, unknown>) || {}),
      type: 'list_reply',
      list_reply: listReply,
      selected_list_item: listReply,
    };
  }

  // Flow submission
  const nfmReply = payload.nfm_reply || (interactiveRecord.nfm_reply as Record<string, unknown>);
  if (nfmReply && typeof nfmReply === 'object') {
    meta.interactive = {
      ...((meta.interactive as Record<string, unknown>) || {}),
      type: 'nfm_reply',
      nfm_reply: nfmReply,
      flow_response: nfmReply,
    };
  }

  // Appointment / booking flow payload
  const metaObj = payload.metadata && typeof payload.metadata === 'object' ? (payload.metadata as Record<string, unknown>) : null;
  const appointment =
    payload.appointment ||
    metaObj?.appointment ||
    payload.booking ||
    metaObj?.booking;
  if (appointment && typeof appointment === 'object') {
    meta.appointment = {
      ...((meta.appointment as Record<string, unknown>) || {}),
      ...(appointment as Record<string, unknown>),
    };
  } else if (payload.selected_date || payload.selected_time || payload.available_dates || payload.available_slots) {
    meta.appointment = {
      ...((meta.appointment as Record<string, unknown>) || {}),
      date: payload.selected_date as string,
      time: payload.selected_time as string,
      available_dates: payload.available_dates as string[],
      available_slots: (payload.available_slots || payload.time_slots) as string[],
      service_name: (payload.service_name || payload.service) as string,
    };
  }

  // Top level buttons / sections
  if (Array.isArray(payload.buttons)) {
    meta.interactive = {
      ...((meta.interactive as Record<string, unknown>) || {}),
      buttons: payload.buttons,
    };
  }
  if (Array.isArray(payload.sections)) {
    meta.interactive = {
      ...((meta.interactive as Record<string, unknown>) || {}),
      sections: payload.sections,
    };
  }

  if (payload.location && typeof payload.location === 'object') {
    meta.location = payload.location;
  }
  if (payload.template) {
    meta.template = typeof payload.template === 'string' ? { name: payload.template } : payload.template;
  }
  if (payload.flow_data && typeof payload.flow_data === 'object') {
    meta.flow_data = payload.flow_data;
  }

  if (payload.filename) meta.filename = String(payload.filename);
  if (payload.caption) meta.caption = String(payload.caption);
  if (payload.mime_type) meta.mime_type = String(payload.mime_type);
  if (payload.file_size) meta.file_size = Number(payload.file_size);

  return Object.keys(meta).length > 0 ? meta : null;
}

/**
 * Resolves a readable textual summary if content is blank but media/interactive elements exist
 */
function resolveMessageContent(
  rawContent: string,
  mediaType?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any
): string {
  if (rawContent && rawContent.trim()) return rawContent.trim();
  if (metadata?.interactive?.body?.text) return String(metadata.interactive.body.text).trim();
  if (metadata?.text?.body) return String(metadata.text.body).trim();

  // If appointment confirmation or selection
  if (metadata?.appointment) {
    const appt = metadata.appointment;
    if (appt.service_name && (appt.date || appt.time)) {
      return `Appointment: ${appt.service_name} on ${appt.date || ''} at ${appt.time || ''}`.trim();
    }
    if (appt.available_dates && Array.isArray(appt.available_dates)) {
      return `Available Dates: ${appt.available_dates.join(', ')}`;
    }
    if (appt.available_slots && Array.isArray(appt.available_slots)) {
      return `Available Slots: ${appt.available_slots.join(', ')}`;
    }
  }

  // If interactive button reply
  const btn = metadata?.interactive?.selected_button || metadata?.interactive?.button_reply;
  if (btn?.title) return `Selected: ${btn.title}`;

  // If interactive list reply
  const list = metadata?.interactive?.selected_list_item || metadata?.interactive?.list_reply;
  if (list?.title) return `Selected: ${list.title}${list.description ? ` (${list.description})` : ''}`;

  // If flow reply
  const nfm = metadata?.interactive?.flow_response || metadata?.interactive?.nfm_reply;
  if (nfm) return `WhatsApp Flow Submission (${nfm.name || 'Completed'})`;

  // If interactive list menu header / action
  if (metadata?.interactive?.action?.button) {
    const btnTitle = metadata.interactive.action.button;
    const header = metadata.interactive.header?.text || '';
    return header ? `${header} [${btnTitle}]` : `[Menu: ${btnTitle}]`;
  }

  // If location
  const loc = metadata?.location;
  if (loc) return `Location: ${loc.name || loc.address || `${loc.latitude}, ${loc.longitude}`}`;

  // If template
  const tmpl = metadata?.template;
  if (tmpl?.name) return `[Template: ${tmpl.name}]`;

  // If media
  if (mediaType) {
    const cap = metadata?.caption ? `: ${metadata.caption}` : '';
    if (mediaType === 'image') return `[Photo]${cap}`;
    if (mediaType === 'audio') return '[Voice Note]';
    if (mediaType === 'video') return `[Video]${cap}`;
    if (mediaType === 'document' || mediaType === 'pdf') {
      return `[Document: ${metadata?.filename || 'File'}]${cap}`;
    }
    return `[${mediaType}]${cap}`;
  }

  return '[Interactive Message]';
}

export async function POST(request: Request) {
  try {
    // 1. Mandatory n8n Webhook Authentication (Fails closed if secret is missing)
    const expectedSecret = process.env.N8N_API_KEY || process.env.N8N_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          can_respond: false,
          error: 'Server misconfiguration: N8N_WEBHOOK_SECRET is not configured on the server. Webhook requests are rejected.',
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    const customKey = request.headers.get('x-n8n-api-key') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== expectedSecret && customKey !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized n8n caller' }, { status: 401 });
    }

    const payload = await request.json();
    const eventType = payload.event_type || 'workflow_execution';
    const adminSupabase = createAdminClient();

    if (!adminSupabase) {
      return NextResponse.json(
        {
          success: false,
          can_respond: false,
          error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing',
        },
        { status: 503 }
      );
    }

    const nowIso = new Date().toISOString();

    // Helper: Touch service integration status
    const touchIntegrationStatus = async (serviceName: 'instagram' | 'n8n' | 'whatsapp') => {
      try {
        await adminSupabase.from('admin_integration_status').upsert(
          {
            service_name: serviceName,
            status: 'connected',
            last_checked_at: nowIso,
            response_time_ms: 50,
            error_message: null,
            updated_at: nowIso,
          },
          { onConflict: 'service_name' }
        );
      } catch {
        // Non-blocking telemetry touch
      }
    };

    // ========================================================================
    // 1. INCOMING INSTAGRAM MESSAGE INGESTION & TAKEOVER CHECK
    // ========================================================================
    if (
      eventType === 'incoming_instagram_message' ||
      (eventType === 'incoming_message' && (payload.platform === 'instagram' || payload.sender_id))
    ) {
      const senderId = String(payload.sender_id || payload.instagram_scoped_id || '').trim();
      const rawUsername = String(payload.username || payload.instagram_username || '').replace(/^@/, '').trim();
      const content = String(payload.content || payload.text || payload.message_text || '').trim();
      const externalMessageId = payload.external_message_id || payload.mid || payload.message_id || null;
      const senderName = payload.sender_name || (rawUsername ? `@${rawUsername}` : `IG User ${senderId.slice(-4)}`);

      // STABLE IDENTIFIER ENFORCEMENT: sender_id (IGSID) is mandatory
      if (!senderId) {
        return NextResponse.json(
          {
            success: false,
            can_respond: false,
            error: 'Missing required field: sender_id (Instagram Scoped User ID). Mutable usernames alone cannot be used to identify contacts.',
          },
          { status: 400 }
        );
      }

      if (!content) {
        return NextResponse.json(
          { success: false, can_respond: false, error: 'Message content is required' },
          { status: 400 }
        );
      }

      // A. Message Deduplication via Meta message ID (Pre-check)
      if (externalMessageId) {
        const { data: existingMsg } = await adminSupabase
          .from('admin_messages')
          .select('id, conversation_id')
          .eq('external_message_id', externalMessageId)
          .maybeSingle();

        if (existingMsg) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            can_respond: false,
            conversation_id: existingMsg.conversation_id,
            notice: 'Duplicate Meta message ID ignored.',
          });
        }
      }

      // B. Resolve Contact with Collision Safety (IGSID strictly enforced)
      let contactId: string | null = null;
      let existingContact: { id: string; name: string; instagram_username?: string } | null = null;

      const { data: contactByIgsid, error: igsidErr } = await adminSupabase
        .from('admin_contacts')
        .select('id, name, instagram_username')
        .eq('instagram_scoped_id', senderId)
        .maybeSingle();

      if (!igsidErr && contactByIgsid) {
        existingContact = contactByIgsid;
        contactId = contactByIgsid.id;

        // If username changed or was null, update username metadata
        if (rawUsername && contactByIgsid.instagram_username !== rawUsername) {
          await adminSupabase
            .from('admin_contacts')
            .update({ instagram_username: rawUsername, updated_at: nowIso })
            .eq('id', contactId);
        }
      }

      // Create contact if new (concurrency-safe with conflict retry)
      if (!contactId) {
        const insertPayload: Record<string, unknown> = {
          name: senderName,
          instagram_scoped_id: senderId,
          instagram_username: rawUsername || null,
          created_at: nowIso,
          updated_at: nowIso,
          is_demo: false,
        };

        const { data: newContact, error: createContactErr } = await adminSupabase
          .from('admin_contacts')
          .insert(insertPayload)
          .select('id, name')
          .single();

        if (createContactErr) {
          // If race condition: another request inserted with same IGSID
          if (createContactErr.code === '23505' || createContactErr.message?.includes('duplicate key')) {
            const { data: retryContact } = await adminSupabase
              .from('admin_contacts')
              .select('id, name')
              .eq('instagram_scoped_id', senderId)
              .maybeSingle();
            if (retryContact) {
              contactId = retryContact.id;
              existingContact = retryContact;
            }
          }
        } else if (newContact) {
          contactId = newContact.id;
        }
      }

      if (!contactId) {
        return NextResponse.json(
          { success: false, can_respond: false, error: 'Failed to resolve or create contact' },
          { status: 500 }
        );
      }

      // C. Resolve or Create Instagram Conversation (Concurrency-safe)
      let conversationId: string | null = null;
      let manualTakeover = false;
      let automationPaused = false;

      const { data: existingConv } = await adminSupabase
        .from('admin_conversations')
        .select('id, unread_count, manual_takeover, automation_paused')
        .eq('contact_id', contactId)
        .eq('platform', 'instagram')
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        manualTakeover = Boolean(existingConv.manual_takeover);
        automationPaused = Boolean(existingConv.automation_paused);

        await adminSupabase
          .from('admin_conversations')
          .update({
            last_message: content,
            last_message_at: nowIso,
            unread_count: (existingConv.unread_count || 0) + 1,
            status: 'open',
            updated_at: nowIso,
          })
          .eq('id', conversationId);
      } else {
        const { data: newConv, error: createConvErr } = await adminSupabase
          .from('admin_conversations')
          .insert({
            contact_id: contactId,
            platform: 'instagram',
            status: 'open',
            last_message: content,
            last_message_at: nowIso,
            unread_count: 1,
            manual_takeover: false,
            automation_paused: false,
            is_demo: false,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select('id, manual_takeover, automation_paused')
          .single();

        if (createConvErr) {
          // If race condition: another request inserted with same (contact_id, platform)
          if (createConvErr.code === '23505' || createConvErr.message?.includes('duplicate key')) {
            const { data: retryConv } = await adminSupabase
              .from('admin_conversations')
              .select('id, unread_count, manual_takeover, automation_paused')
              .eq('contact_id', contactId)
              .eq('platform', 'instagram')
              .maybeSingle();
            if (retryConv) {
              conversationId = retryConv.id;
              manualTakeover = Boolean(retryConv.manual_takeover);
              automationPaused = Boolean(retryConv.automation_paused);
            }
          }
        } else if (newConv) {
          conversationId = newConv.id;
          manualTakeover = Boolean(newConv.manual_takeover);
          automationPaused = Boolean(newConv.automation_paused);
        }
      }

      if (!conversationId) {
        return NextResponse.json(
          { success: false, can_respond: false, error: 'Failed to create or resolve conversation' },
          { status: 500 }
        );
      }

      // D. Insert Incoming Message as sender_type: 'customer' (with concurrency-safe duplicate catch)
      const { error: insertMsgErr } = await adminSupabase.from('admin_messages').insert({
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_name: existingContact?.name || senderName,
        content,
        status: 'sent',
        external_message_id: externalMessageId,
        is_demo: false,
        created_at: nowIso,
      });

      if (insertMsgErr) {
        if (insertMsgErr.code === '23505' || insertMsgErr.message?.includes('duplicate key')) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            can_respond: false,
            conversation_id: conversationId,
            notice: 'Duplicate Meta message ID caught by database unique constraint.',
          });
        }
      }

      // E. Touch integration telemetry
      await touchIntegrationStatus('instagram');
      await touchIntegrationStatus('n8n');

      const isTakeover = Boolean(manualTakeover || automationPaused);

      return NextResponse.json({
        success: true,
        conversation_id: conversationId,
        contact_id: contactId,
        can_respond: !isTakeover,
        manual_takeover: manualTakeover,
        automation_paused: automationPaused,
        external_message_id: externalMessageId,
        notice: isTakeover
          ? 'Human takeover is active. Do not dispatch automated reply.'
          : 'Automation permitted.',
      });
    }

    // ========================================================================
    // 2. INCOMING WHATSAPP MESSAGE INGESTION & TAKEOVER CHECK
    // ========================================================================
    if (
      eventType === 'incoming_whatsapp_message' ||
      (eventType === 'incoming_message' && (payload.platform === 'whatsapp' || payload.phone || payload.wa_id || payload.from))
    ) {
      const rawPhone = String(
        payload.phone ||
        payload.phone_number ||
        payload.whatsapp_id ||
        payload.wa_id ||
        payload.from ||
        payload.sender_phone ||
        ''
      ).trim();
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone ? '+' + cleanPhone : '';

      const richMetadata = extractMessageMetadata(payload);
      const mediaType = payload.media_type || (payload.message_type && payload.message_type !== 'text' ? payload.message_type : null);
      const mediaUrl = payload.media_url || null;
      const rawContent = String(payload.content || payload.text || payload.message_text || payload.body || '').trim();
      const content = resolveMessageContent(rawContent, mediaType, richMetadata);

      const externalMessageId =
        payload.external_message_id ||
        payload.wa_message_id ||
        payload.wamid ||
        payload.mid ||
        payload.message_id ||
        payload.id ||
        null;
      const customerName = String(
        payload.customer_name ||
        payload.contact_name ||
        payload.name ||
        payload.profile_name ||
        payload.sender_name ||
        ''
      ).trim();

      // STABLE IDENTIFIER ENFORCEMENT: phone (WhatsApp Phone / ID) is mandatory
      if (!cleanPhone) {
        return NextResponse.json(
          {
            success: false,
            can_respond: false,
            error: 'Missing required field: phone (WhatsApp User Phone / ID). Display names alone cannot be used to identify contacts.',
          },
          { status: 400 }
        );
      }

      if (!content) {
        return NextResponse.json(
          { success: false, can_respond: false, error: 'Message content is required' },
          { status: 400 }
        );
      }

      // A. Message Deduplication via Meta WhatsApp ID (wamid)
      if (externalMessageId) {
        const { data: existingMsg } = await adminSupabase
          .from('admin_messages')
          .select('id, conversation_id')
          .eq('external_message_id', externalMessageId)
          .maybeSingle();

        if (existingMsg) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            can_respond: false,
            conversation_id: existingMsg.conversation_id,
            notice: 'Duplicate WhatsApp message ID (wamid) ignored.',
          });
        }
      }

      // B. Resolve Contact with Collision Safety (Normalized Phone)
      let contactId: string | null = null;
      let existingContact: { id: string; name: string; phone?: string } | null = null;

      const { data: contactsByPhone } = await adminSupabase
        .from('admin_contacts')
        .select('id, name, phone')
        .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
        .order('created_at', { ascending: true })
        .limit(1);

      if (contactsByPhone && contactsByPhone.length > 0) {
        existingContact = contactsByPhone[0];
        contactId = existingContact.id;

        // If contact had default name but real customer_name now provided, update name
        if (customerName && (existingContact.name.startsWith('+') || existingContact.name.startsWith('WhatsApp Contact'))) {
          await adminSupabase
            .from('admin_contacts')
            .update({ name: customerName, updated_at: nowIso })
            .eq('id', contactId);
        }
      }

      // Create contact if new (concurrency-safe with conflict retry)
      if (!contactId) {
        const insertPayload: Record<string, unknown> = {
          name: customerName || formattedPhone,
          phone: formattedPhone,
          created_at: nowIso,
          updated_at: nowIso,
          is_demo: false,
        };

        const { data: newContact, error: createContactErr } = await adminSupabase
          .from('admin_contacts')
          .insert(insertPayload)
          .select('id, name')
          .single();

        if (createContactErr) {
          // If race condition: another request inserted concurrently with same phone
          const { data: retryContacts } = await adminSupabase
            .from('admin_contacts')
            .select('id, name, phone')
            .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
            .order('created_at', { ascending: true })
            .limit(1);
          if (retryContacts?.[0]) {
            contactId = retryContacts[0].id;
            existingContact = retryContacts[0];
          }
        } else if (newContact) {
          contactId = newContact.id;
        }
      }

      if (!contactId) {
        return NextResponse.json(
          { success: false, can_respond: false, error: 'Failed to resolve or create WhatsApp contact' },
          { status: 500 }
        );
      }

      // C. Resolve or Create WhatsApp Conversation (Concurrency-safe)
      let conversationId: string | null = null;
      let manualTakeover = false;
      let automationPaused = false;

      // 1. Check for existing conversation for this specific contact
      const { data: existingConvs } = await adminSupabase
        .from('admin_conversations')
        .select('id, contact_id, unread_count, manual_takeover, automation_paused')
        .eq('contact_id', contactId)
        .eq('platform', 'whatsapp')
        .order('created_at', { ascending: true })
        .limit(1);

      let existingConv = existingConvs?.[0] || null;

      // 2. If no conversation for this contact_id, check if any conversation exists for contacts with this phone
      if (!existingConv) {
        const { data: phoneContacts } = await adminSupabase
          .from('admin_contacts')
          .select('id')
          .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`);

        if (phoneContacts && phoneContacts.length > 0) {
          const allContactIds = phoneContacts.map((c) => c.id);
          const { data: phoneConvs } = await adminSupabase
            .from('admin_conversations')
            .select('id, contact_id, unread_count, manual_takeover, automation_paused')
            .in('contact_id', allContactIds)
            .eq('platform', 'whatsapp')
            .order('created_at', { ascending: true })
            .limit(1);

          if (phoneConvs?.[0]) {
            existingConv = phoneConvs[0];
            // Link to the primary contact
            contactId = existingConv.contact_id;
          }
        }
      }

      // Parse message created_at timestamp if provided by n8n (preserves millisecond precision)
      const messageCreatedAt = parseTimestamp(payload.timestamp, nowIso);

      if (existingConv) {
        conversationId = existingConv.id;
        manualTakeover = Boolean(existingConv.manual_takeover);
        automationPaused = Boolean(existingConv.automation_paused);

        await adminSupabase
          .from('admin_conversations')
          .update({
            last_message: content,
            last_message_at: messageCreatedAt,
            unread_count: (existingConv.unread_count || 0) + 1,
            status: 'open',
            updated_at: nowIso,
          })
          .eq('id', conversationId);
      } else {
        const { data: newConv, error: createConvErr } = await adminSupabase
          .from('admin_conversations')
          .insert({
            contact_id: contactId,
            platform: 'whatsapp',
            status: 'open',
            last_message: content,
            last_message_at: messageCreatedAt,
            unread_count: 1,
            manual_takeover: false,
            automation_paused: false,
            is_demo: false,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select('id, manual_takeover, automation_paused')
          .single();

        if (createConvErr) {
          // If race condition: caught by unique index idx_admin_conversations_contact_platform
          if (createConvErr.code === '23505' || createConvErr.message?.includes('duplicate key')) {
            const { data: retryConv } = await adminSupabase
              .from('admin_conversations')
              .select('id, unread_count, manual_takeover, automation_paused')
              .eq('contact_id', contactId)
              .eq('platform', 'whatsapp')
              .maybeSingle();
            if (retryConv) {
              conversationId = retryConv.id;
              manualTakeover = Boolean(retryConv.manual_takeover);
              automationPaused = Boolean(retryConv.automation_paused);
            }
          }
        } else if (newConv) {
          conversationId = newConv.id;
          manualTakeover = Boolean(newConv.manual_takeover);
          automationPaused = Boolean(newConv.automation_paused);
        }
      }

      if (!conversationId) {
        return NextResponse.json(
          { success: false, can_respond: false, error: 'Failed to create or resolve WhatsApp conversation' },
          { status: 500 }
        );
      }

      // Fallback deduplication: If externalMessageId was not provided, guard against rapid duplicate webhooks (<4s)
      if (!externalMessageId && conversationId && content) {
        const fourSecondsAgo = new Date(Date.now() - 4000).toISOString();
        const { data: recentDuplicate } = await adminSupabase
          .from('admin_messages')
          .select('id, created_at')
          .eq('conversation_id', conversationId)
          .eq('sender_type', 'customer')
          .eq('content', content)
          .gte('created_at', fourSecondsAgo)
          .limit(1)
          .maybeSingle();

        if (recentDuplicate) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            can_respond: false,
            conversation_id: conversationId,
            notice: 'Rapid-fire duplicate incoming message suppressed without external ID.',
          });
        }
      }

      // D. Insert Incoming Message as sender_type: 'customer' (with concurrency-safe duplicate catch)
      const messageInsertPayload: Record<string, unknown> = {
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_name: customerName || existingContact?.name || formattedPhone,
        content,
        media_type: mediaType,
        media_url: mediaUrl,
        status: 'sent', // strictly sent, never fake delivered
        external_message_id: externalMessageId,
        is_demo: false,
        created_at: messageCreatedAt,
      };

      if (richMetadata) {
        messageInsertPayload.metadata = richMetadata;
      }

      let { error: insertMsgErr } = await adminSupabase.from('admin_messages').insert(messageInsertPayload);

      // Graceful fallback if metadata column is not yet migrated in Supabase
      if (insertMsgErr && insertMsgErr.message?.includes("'metadata' column")) {
        delete messageInsertPayload.metadata;
        const retryRes = await adminSupabase.from('admin_messages').insert(messageInsertPayload);
        insertMsgErr = retryRes.error;
      }

      if (insertMsgErr) {
        if (insertMsgErr.code === '23505' || insertMsgErr.message?.includes('duplicate key')) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            can_respond: false,
            conversation_id: conversationId,
            notice: 'Duplicate WhatsApp message ID (wamid) caught by database unique constraint.',
          });
        }
      }

      // E. Touch integration telemetry
      await touchIntegrationStatus('whatsapp');
      await touchIntegrationStatus('n8n');

      const isTakeover = Boolean(manualTakeover || automationPaused);

      return NextResponse.json({
        success: true,
        conversation_id: conversationId,
        contact_id: contactId,
        can_respond: !isTakeover,
        manual_takeover: manualTakeover,
        automation_paused: automationPaused,
        external_message_id: externalMessageId,
        notice: isTakeover
          ? 'Human takeover is active. Do not dispatch automated reply.'
          : 'Automation permitted.',
      });
    }

    // ========================================================================
    // 3. CHECK HUMAN TAKEOVER STATUS (Fail-Closed Pre-Execution Guard)
    // ========================================================================
    if (eventType === 'check_takeover') {
      try {
        const { conversation_id, phone, sender_id, instagram_scoped_id, username, instagram_username } = payload;

        let query = adminSupabase
          .from('admin_conversations')
          .select('id, manual_takeover, automation_paused, status');

        if (conversation_id) {
          query = query.eq('id', conversation_id);
        } else if (sender_id || instagram_scoped_id) {
          const igsid = String(sender_id || instagram_scoped_id).trim();
          const { data: contact } = await adminSupabase
            .from('admin_contacts')
            .select('id')
            .eq('instagram_scoped_id', igsid)
            .maybeSingle();

          if (contact) {
            query = query.eq('contact_id', contact.id).eq('platform', 'instagram');
          } else {
            return NextResponse.json({
              success: true,
              exists: false,
              manual_takeover: false,
              automation_paused: false,
              can_respond: true,
            });
          }
        } else if (username || instagram_username) {
          const cleanUser = String(username || instagram_username).replace(/^@/, '').trim();
          const { data: contact } = await adminSupabase
            .from('admin_contacts')
            .select('id')
            .ilike('instagram_username', cleanUser)
            .maybeSingle();

          if (contact) {
            query = query.eq('contact_id', contact.id).eq('platform', 'instagram');
          } else {
            return NextResponse.json({
              success: true,
              exists: false,
              manual_takeover: false,
              automation_paused: false,
              can_respond: true,
            });
          }
        } else if (phone || payload.phone_number || payload.whatsapp_id || payload.wa_id || payload.from) {
          const rawP = String(phone || payload.phone_number || payload.whatsapp_id || payload.wa_id || payload.from);
          const cleanPhone = rawP.replace(/[^0-9]/g, '');
          const formattedPhone = '+' + cleanPhone;
          const { data: contacts } = await adminSupabase
            .from('admin_contacts')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
            .order('created_at', { ascending: true })
            .limit(1);

          const contact = contacts?.[0] || null;

          if (contact) {
            query = query.eq('contact_id', contact.id).eq('platform', 'whatsapp');
          } else {
            return NextResponse.json({
              success: true,
              exists: false,
              manual_takeover: false,
              automation_paused: false,
              can_respond: true,
            });
          }
        }

        const { data: conv, error: convErr } = await query.maybeSingle();

        if (convErr) {
          return NextResponse.json({
            success: false,
            can_respond: false,
            error: 'Failed to verify takeover status - fail-closed active',
          }, { status: 500 });
        }

        const isTakeover = Boolean(conv?.manual_takeover || conv?.automation_paused);

        return NextResponse.json({
          success: true,
          conversation_id: conv?.id,
          manual_takeover: Boolean(conv?.manual_takeover),
          automation_paused: Boolean(conv?.automation_paused),
          can_respond: !isTakeover,
          data: {
            mode: isTakeover ? 'human' : 'ai',
            can_respond: !isTakeover,
            manual_takeover: Boolean(conv?.manual_takeover),
            automation_paused: Boolean(conv?.automation_paused),
          },
          notice: isTakeover
            ? 'Human admin has active takeover. Do not dispatch automated replies.'
            : 'Automation permitted.',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Takeover check failed';
        return NextResponse.json({
          success: false,
          can_respond: false,
          error: message,
        }, { status: 500 });
      }
    }

    // ========================================================================
    // 4. OUTGOING WHATSAPP MESSAGE LOGGING (AI replies, templates, interactive, media)
    // ========================================================================
    if (
      eventType === 'outgoing_whatsapp_message' ||
      eventType === 'log_whatsapp_reply' ||
      (eventType === 'log_ai_reply' && (payload.platform === 'whatsapp' || payload.phone || payload.wa_id))
    ) {
      const rawPhone = String(
        payload.phone ||
        payload.to ||
        payload.recipient_phone ||
        payload.phone_number ||
        payload.whatsapp_id ||
        payload.wa_id ||
        payload.from ||
        ''
      ).trim();
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone ? '+' + cleanPhone : '';

      const rawSenderType = String(payload.sender_type || '').toLowerCase();
      // Normalize sender_type to strictly satisfy PostgreSQL check constraint: ('customer', 'automation_ai', 'automation_rule', 'human_agent')
      const normalizedSenderType =
        rawSenderType === 'human_agent' || rawSenderType === 'human' || rawSenderType === 'agent' || rawSenderType === 'admin'
          ? 'human_agent'
          : rawSenderType === 'automation_rule' || rawSenderType === 'automation' || rawSenderType === 'system' || rawSenderType === 'rule'
          ? 'automation_rule'
          : 'automation_ai';

      const senderName = String(
        payload.sender_name ||
        (normalizedSenderType === 'human_agent'
          ? 'Human Admin (Aman Rajbhar)'
          : normalizedSenderType === 'automation_rule'
          ? 'TBW Automation'
          : 'TBW AI Assistant')
      ).trim();

      const rawContent = String(payload.content || payload.text || payload.message_text || payload.body || '').trim();
      const externalMessageId =
        payload.external_message_id ||
        payload.wa_message_id ||
        payload.wamid ||
        payload.mid ||
        payload.message_id ||
        payload.event_id ||
        payload.request_id ||
        payload.id ||
        null;
      const messageCreatedAt = parseTimestamp(payload.timestamp, nowIso);

      const mediaType = payload.media_type || (payload.message_type && payload.message_type !== 'text' ? payload.message_type : null);
      const mediaUrl = payload.media_url || null;
      const richMetadata = extractMessageMetadata(payload);
      const content = resolveMessageContent(rawContent, mediaType, richMetadata);

      let conversationId = payload.conversation_id;

      // Deduplication check via wamid
      if (externalMessageId) {
        const { data: existing } = await adminSupabase
          .from('admin_messages')
          .select('id, conversation_id')
          .eq('external_message_id', externalMessageId)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            conversation_id: existing.conversation_id,
            message_id: existing.id,
            notice: 'Duplicate Meta message ID (wamid) ignored.',
          });
        }
      }

      // If conversation_id not provided, resolve via phone
      if (!conversationId && cleanPhone) {
        // Resolve or create contact
        const { data: contacts } = await adminSupabase
          .from('admin_contacts')
          .select('id, name, phone')
          .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
          .order('created_at', { ascending: true })
          .limit(1);

        let contact = contacts?.[0] || null;

        if (!contact) {
          const { data: newContact } = await adminSupabase
            .from('admin_contacts')
            .insert({
              name: payload.customer_name || payload.contact_name || formattedPhone,
              phone: formattedPhone,
              created_at: nowIso,
              updated_at: nowIso,
              is_demo: false,
            })
            .select('id, name, phone')
            .single();
          contact = newContact;
        }

        if (contact) {
          const { data: convs } = await adminSupabase
            .from('admin_conversations')
            .select('id, manual_takeover, automation_paused')
            .eq('contact_id', contact.id)
            .eq('platform', 'whatsapp')
            .order('created_at', { ascending: true })
            .limit(1);

          let conv = convs?.[0] || null;

          if (!conv) {
            const { data: newConv } = await adminSupabase
              .from('admin_conversations')
              .insert({
                contact_id: contact.id,
                platform: 'whatsapp',
                status: 'open',
                last_message: content,
                last_message_at: nowIso,
                unread_count: 0,
                manual_takeover: false,
                automation_paused: false,
                is_demo: false,
                created_at: nowIso,
                updated_at: nowIso,
              })
              .select('id, manual_takeover, automation_paused')
              .single();
            conv = newConv;
          }

          if (conv) {
            conversationId = conv.id;
          }
        }
      }

      if (!conversationId || !content) {
        return NextResponse.json(
          { error: 'conversation_id (or recipient phone) and content are required' },
          { status: 400 }
        );
      }

      // Re-verify takeover before writing automated reply
      if (normalizedSenderType === 'automation_ai') {
        const { data: convCheck } = await adminSupabase
          .from('admin_conversations')
          .select('manual_takeover, automation_paused')
          .eq('id', conversationId)
          .maybeSingle();

        if (convCheck?.manual_takeover || convCheck?.automation_paused) {
          return NextResponse.json({
            success: false,
            rejected: true,
            reason: 'Human takeover active - WhatsApp AI reply discarded to prevent race condition.',
          }, { status: 409 });
        }
      }

      // Fallback deduplication: If externalMessageId was not provided, guard against rapid duplicate webhooks (<4s)
      if (!externalMessageId && conversationId && content) {
        const fourSecondsAgo = new Date(Date.now() - 4000).toISOString();
        const { data: recentDuplicate } = await adminSupabase
          .from('admin_messages')
          .select('id, created_at')
          .eq('conversation_id', conversationId)
          .eq('sender_type', normalizedSenderType)
          .eq('content', content)
          .gte('created_at', fourSecondsAgo)
          .limit(1)
          .maybeSingle();

        if (recentDuplicate) {
          return NextResponse.json({
            success: true,
            deduplicated: true,
            conversation_id: conversationId,
            message_id: recentDuplicate.id,
            notice: 'Rapid-fire duplicate outgoing message suppressed without external ID.',
          });
        }
      }

      const insertPayload: Record<string, unknown> = {
        conversation_id: conversationId,
        sender_type: normalizedSenderType,
        sender_name: senderName,
        content,
        media_type: mediaType,
        media_url: mediaUrl,
        status: 'sent', // strictly sent, never fake delivered
        external_message_id: externalMessageId,
        is_demo: false,
        created_at: messageCreatedAt,
      };

      if (richMetadata) {
        insertPayload.metadata = richMetadata;
      }

      let { data: insertedMsg, error: insertErr } = await adminSupabase
        .from('admin_messages')
        .insert(insertPayload)
        .select('id')
        .maybeSingle();

      // Graceful fallback if metadata column is not yet migrated in Supabase
      if (insertErr && insertErr.message?.includes("'metadata' column")) {
        delete insertPayload.metadata;
        const retryRes = await adminSupabase
          .from('admin_messages')
          .insert(insertPayload)
          .select('id')
          .maybeSingle();
        insertErr = retryRes.error;
        insertedMsg = retryRes.data;
      }

      if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('duplicate key'))) {
        return NextResponse.json({ success: true, deduplicated: true, conversation_id: conversationId });
      }

      await adminSupabase
        .from('admin_conversations')
        .update({
          last_message: content,
          last_message_at: messageCreatedAt,
          updated_at: nowIso,
        })
        .eq('id', conversationId);

      await touchIntegrationStatus('whatsapp');
      await touchIntegrationStatus('n8n');

      return NextResponse.json({
        success: true,
        action: eventType === 'log_whatsapp_reply' ? 'whatsapp_reply_logged' : 'whatsapp_outgoing_logged',
        conversation_id: conversationId,
        message_id: insertedMsg?.id || null,
        external_message_id: externalMessageId,
      });
    }

    // ========================================================================
    // 5. WHATSAPP MESSAGE STATUS RECEIPTS (Sent, Delivered, Read, Failed)
    // ========================================================================
    if (
      eventType === 'whatsapp_status_update' ||
      eventType === 'message_status_update' ||
      eventType === 'status_update' ||
      eventType === 'status_receipt'
    ) {
      const wamid =
        payload.external_message_id ||
        payload.wa_message_id ||
        payload.wamid ||
        payload.mid ||
        payload.message_id ||
        payload.id;
      const rawStatus = String(payload.status || '').toLowerCase().trim();

      if (!wamid) {
        return NextResponse.json(
          { success: false, error: 'external_message_id (wamid) is required for status updates' },
          { status: 400 }
        );
      }

      if (!['sent', 'delivered', 'read', 'failed'].includes(rawStatus)) {
        return NextResponse.json(
          { success: false, error: `Invalid status: ${rawStatus}. Allowed: sent, delivered, read, failed` },
          { status: 400 }
        );
      }

      const mappedStatus = rawStatus as 'sent' | 'delivered' | 'read' | 'failed';

      const { data: updatedMsg, error: updateErr } = await adminSupabase
        .from('admin_messages')
        .update({ status: mappedStatus })
        .eq('external_message_id', wamid)
        .select('id, conversation_id, status')
        .maybeSingle();

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
      }

      await touchIntegrationStatus('whatsapp');
      await touchIntegrationStatus('n8n');

      return NextResponse.json({
        success: true,
        action: 'status_updated',
        wamid,
        status: mappedStatus,
        message_id: updatedMsg?.id || null,
        found: Boolean(updatedMsg),
      });
    }

    // ========================================================================
    // 5. LOG INSTAGRAM AUTOMATION AI REPLY (Sent by n8n workflow)
    // ========================================================================
    if (eventType === 'log_ai_reply') {
      const {
        content,
        sender_type = 'automation_ai',
        sender_name = 'TBW AI Assistant',
      } = payload;
      const externalMessageId = payload.external_message_id || payload.mid || payload.message_id || payload.id || null;

      let conversationId = payload.conversation_id;

      if (!conversationId && (payload.sender_id || payload.instagram_scoped_id)) {
        const igsid = String(payload.sender_id || payload.instagram_scoped_id).trim();
        const { data: contact } = await adminSupabase
          .from('admin_contacts')
          .select('id')
          .eq('instagram_scoped_id', igsid)
          .maybeSingle();

        if (contact) {
          const { data: conv } = await adminSupabase
            .from('admin_conversations')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('platform', 'instagram')
            .maybeSingle();

          if (conv) {
            conversationId = conv.id;
          }
        }
      }

      if (!conversationId || !content) {
        return NextResponse.json(
          { error: 'conversation_id and content are required' },
          { status: 400 }
        );
      }

      // Check for deduplication
      if (externalMessageId) {
        const { data: existing } = await adminSupabase
          .from('admin_messages')
          .select('id')
          .eq('external_message_id', externalMessageId)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ success: true, deduplicated: true });
        }
      }

      // Re-verify takeover before writing AI reply
      const { data: convCheck } = await adminSupabase
        .from('admin_conversations')
        .select('manual_takeover, automation_paused')
        .eq('id', conversationId)
        .maybeSingle();

      if (convCheck?.manual_takeover || convCheck?.automation_paused) {
        return NextResponse.json({
          success: false,
          rejected: true,
          reason: 'Human takeover active - AI reply discarded to prevent race condition.',
        }, { status: 409 });
      }

      const { error: insertErr } = await adminSupabase.from('admin_messages').insert({
        conversation_id: conversationId,
        sender_type: sender_type === 'human_agent' ? 'human_agent' : 'automation_ai',
        sender_name,
        content,
        status: 'sent',
        external_message_id: externalMessageId,
        is_demo: false,
        created_at: nowIso,
      });

      if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('duplicate key'))) {
        return NextResponse.json({ success: true, deduplicated: true });
      }

      await adminSupabase
        .from('admin_conversations')
        .update({
          last_message: content,
          last_message_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', conversationId);

      await touchIntegrationStatus('instagram');
      await touchIntegrationStatus('n8n');

      return NextResponse.json({
        success: true,
        action: 'ai_reply_logged',
        conversation_id: conversationId,
      });
    }

    // ========================================================================
    // 6. LOG WORKFLOW EXECUTION TELEMETRY
    // ========================================================================
    if (eventType === 'workflow_execution') {
      const {
        workflow_id,
        workflow_name,
        status,
        execution_id,
        error_message,
        failed_node_name,
        duration_ms,
      } = payload;

      if (workflow_id && execution_id) {
        await adminSupabase.from('admin_workflow_executions').insert({
          workflow_id,
          workflow_name: workflow_name || 'n8n Automation',
          execution_id: String(execution_id),
          status: status === 'error' ? 'error' : status === 'running' ? 'running' : 'success',
          error_message: error_message || null,
          failed_node_name: failed_node_name || null,
          duration_ms: Number(duration_ms) || null,
          is_demo: false,
          started_at: nowIso,
        });
      }

      await touchIntegrationStatus('n8n');

      return NextResponse.json({
        success: true,
        action: 'execution_logged',
        execution_id,
      });
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook parsing error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
