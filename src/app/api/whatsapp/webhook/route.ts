import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * META WHATSAPP CLOUD API WEBHOOK ENDPOINT
 *
 * 1. GET: Verification Request from Meta Developer Dashboard
 * 2. POST: Ingestion of incoming customer messages and delivery/read receipts
 */

/**
 * 1. Webhook Verification Handshake (Meta GET)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    console.log('[WhatsApp Webhook] Verification successful from Meta.');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[WhatsApp Webhook] Verification failed. Token mismatch or invalid mode.');
  return NextResponse.json(
    { error: 'Verification failed. Verify token mismatch.' },
    { status: 403 }
  );
}

/**
 * 2. Incoming Event Ingestion (Meta POST)
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Verify HMAC-SHA256 signature if App Secret is configured
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const signature = request.headers.get('x-hub-signature-256');

    if (appSecret && signature) {
      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        console.error('[WhatsApp Webhook] Invalid x-hub-signature-256 signature.');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored', reason: 'Not a WhatsApp Business event' }, { status: 200 });
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      console.error('[WhatsApp Webhook] SUPABASE_SERVICE_ROLE_KEY missing from environment.');
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 503 }
      );
    }

    // Process all entries in the batch
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value) continue;

        // ====================================================================
        // A. PROCESS INCOMING MESSAGES FROM CUSTOMERS
        // ====================================================================
        if (Array.isArray(value.messages) && value.messages.length > 0) {
          for (const message of value.messages) {
            const wamid = message.id; // e.g., wamid.HBgL...
            const senderPhone = (message.from || '').replace(/[^0-9]/g, '');
            const timestamp = message.timestamp
              ? new Date(Number(message.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            if (!wamid || !senderPhone) continue;

            // 1. Webhook Deduplication: Check if message ID was already ingested
            const { data: existingMsg } = await adminSupabase
              .from('admin_messages')
              .select('id')
              .eq('external_message_id', wamid)
              .maybeSingle();

            if (existingMsg) {
              console.log(`[WhatsApp Webhook] Deduplicated message ${wamid}. Skipping.`);
              continue;
            }

            // Extract text or media content
            let content = '';
            let mediaUrl: string | null = null;
            let mediaType: string | null = null;

            if (message.type === 'text') {
              content = message.text?.body || '';
            } else if (message.type === 'image') {
              content = message.image?.caption || '[Image received]';
              mediaType = 'image';
              mediaUrl = message.image?.id || null;
            } else if (message.type === 'document') {
              content = message.document?.filename || '[Document received]';
              mediaType = 'document';
              mediaUrl = message.document?.id || null;
            } else if (message.type === 'audio') {
              content = '[Voice Message received]';
              mediaType = 'audio';
            } else if (message.type === 'interactive') {
              const interactive = message.interactive;
              content =
                interactive?.button_reply?.title ||
                interactive?.list_reply?.title ||
                '[Interactive selection]';
            } else if (message.type === 'button') {
              content = message.button?.text || '[Button click]';
            } else {
              content = `[${message.type || 'Unknown'} message]`;
            }

            // Find contact profile name from payload
            const contactProfile = (value.contacts || []).find(
              (c: { wa_id?: string; profile?: { name?: string } }) => c.wa_id === senderPhone
            );
            const contactName = contactProfile?.profile?.name || `+${senderPhone}`;

            // 2. Resolve or Create Contact in admin_contacts
            let contactId: string | null = null;
            const { data: contactRow } = await adminSupabase
              .from('admin_contacts')
              .select('id, name')
              .or(`phone.eq.${senderPhone},phone.eq.+${senderPhone}`)
              .maybeSingle();

            if (contactRow) {
              contactId = contactRow.id;
            } else {
              const { data: newContact, error: contactInsertError } = await adminSupabase
                .from('admin_contacts')
                .insert({
                  name: contactName,
                  phone: `+${senderPhone}`,
                  notes: 'Created via WhatsApp Cloud API',
                  is_demo: false,
                })
                .select('id')
                .single();

              if (!contactInsertError && newContact) {
                contactId = newContact.id;
              }
            }

            if (!contactId) {
              console.error(`[WhatsApp Webhook] Failed to resolve contact for phone ${senderPhone}`);
              continue;
            }

            // 3. Resolve or Create Conversation in admin_conversations
            let conversationId: string | null = null;
            let isManualTakeover = false;
            let isAutomationPaused = false;

            const { data: convRow } = await adminSupabase
              .from('admin_conversations')
              .select('id, unread_count, manual_takeover, automation_paused, status')
              .eq('contact_id', contactId)
              .eq('platform', 'whatsapp')
              .maybeSingle();

            if (convRow) {
              conversationId = convRow.id;
              isManualTakeover = Boolean(convRow.manual_takeover);
              isAutomationPaused = Boolean(convRow.automation_paused);

              // Update existing conversation
              await adminSupabase
                .from('admin_conversations')
                .update({
                  last_message: content,
                  last_message_at: timestamp,
                  unread_count: (convRow.unread_count || 0) + 1,
                  status: convRow.status === 'completed' ? 'open' : convRow.status,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conversationId);
            } else {
              // Create new conversation
              const { data: newConv, error: convInsertError } = await adminSupabase
                .from('admin_conversations')
                .insert({
                  contact_id: contactId,
                  platform: 'whatsapp',
                  status: 'open',
                  last_message: content,
                  last_message_at: timestamp,
                  unread_count: 1,
                  manual_takeover: false,
                  automation_paused: false,
                  is_demo: false,
                })
                .select('id')
                .single();

              if (!convInsertError && newConv) {
                conversationId = newConv.id;
              }
            }

            if (!conversationId) {
              console.error(`[WhatsApp Webhook] Failed to resolve conversation for contact ${contactId}`);
              continue;
            }

            // 4. Insert message into admin_messages with Deduplication key
            const { error: msgInsertErr } = await adminSupabase
              .from('admin_messages')
              .insert({
                conversation_id: conversationId,
                sender_type: 'customer',
                sender_name: contactName,
                content,
                media_url: mediaUrl,
                media_type: mediaType,
                status: 'delivered',
                external_message_id: wamid,
                is_demo: false,
                created_at: timestamp,
              });

            if (msgInsertErr) {
              console.error('[WhatsApp Webhook] Message insert error:', msgInsertErr);
            }

            // 5. Human Takeover Check: Should n8n AI respond?
            if (isManualTakeover || isAutomationPaused) {
              console.log(
                `[WhatsApp Webhook] Human Takeover active on conv ${conversationId}. AI automation paused.`
              );
            } else {
              // Notify self-hosted n8n instance if trigger URL configured
              const n8nTriggerUrl = process.env.N8N_WHATSAPP_TRIGGER_URL;
              if (n8nTriggerUrl) {
                fetch(n8nTriggerUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(process.env.N8N_API_KEY ? { 'X-N8N-API-KEY': process.env.N8N_API_KEY } : {}),
                  },
                  body: JSON.stringify({
                    conversation_id: conversationId,
                    contact_id: contactId,
                    contact_name: contactName,
                    phone: senderPhone,
                    message_id: wamid,
                    content,
                    timestamp,
                  }),
                }).catch((err) => {
                  console.error('[WhatsApp Webhook] Failed to forward to n8n trigger URL:', err);
                });
              }
            }
          }
        }

        // ====================================================================
        // B. PROCESS DELIVERY AND READ STATUS RECEIPTS
        // ====================================================================
        if (Array.isArray(value.statuses) && value.statuses.length > 0) {
          for (const statusItem of value.statuses) {
            const statusWamid = statusItem.id;
            const rawStatus = statusItem.status; // 'sent' | 'delivered' | 'read' | 'failed'

            if (!statusWamid || !rawStatus) continue;

            const mappedStatus =
              rawStatus === 'read'
                ? 'read'
                : rawStatus === 'delivered'
                ? 'delivered'
                : rawStatus === 'sent'
                ? 'sent'
                : rawStatus === 'failed'
                ? 'failed'
                : 'sent';

            await adminSupabase
              .from('admin_messages')
              .update({ status: mappedStatus })
              .eq('external_message_id', statusWamid);
          }
        }
      }
    }

    // Always acknowledge receipt to Meta with 200 OK
    return NextResponse.json({ success: true, processed: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    console.error('[WhatsApp Webhook Error]:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
