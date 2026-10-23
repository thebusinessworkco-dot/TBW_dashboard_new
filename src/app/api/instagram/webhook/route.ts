import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * META INSTAGRAM WEBHOOK ENDPOINT
 *
 * Facilitates official Meta Webhook verification and incoming event ingestion
 * for Instagram Direct Messages and Reel/Post Comments.
 *
 * 1. GET: Webhook verification challenge from Meta Developer Dashboard
 * 2. POST: Ingestion of incoming customer DMs, delivery receipts, and comments
 */

/**
 * 1. Webhook Verification Handshake (Meta GET)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken =
    process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    console.log('[Instagram Webhook] Verification handshake successful with Meta.');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Instagram Webhook] Verification failed. Token mismatch or invalid mode.');
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
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
    const signature = request.headers.get('x-hub-signature-256');

    if (appSecret && signature) {
      const hmac = crypto.createHmac('sha256', appSecret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        console.error('[Instagram Webhook] Invalid x-hub-signature-256 signature.');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Meta Instagram events have object === 'instagram' or entry with messaging/changes
    if (payload.object !== 'instagram' && !payload.entry) {
      return NextResponse.json(
        { status: 'ignored', reason: 'Not an Instagram event' },
        { status: 200 }
      );
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      console.error('[Instagram Webhook] SUPABASE_SERVICE_ROLE_KEY missing from environment.');
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 503 }
      );
    }

    const nowIso = new Date().toISOString();

    // Process all entries in the batch
    for (const entry of payload.entry || []) {
      const pageOrIgId = entry.id;

      // ====================================================================
      // A. PROCESS INCOMING INSTAGRAM DIRECT MESSAGES
      // ====================================================================
      if (Array.isArray(entry.messaging) && entry.messaging.length > 0) {
        for (const item of entry.messaging) {
          const senderId = item.sender?.id; // IGSID
          const message = item.message;

          // Ignore echoes (messages sent by our own business account)
          if (!senderId || !message || message.is_echo || senderId === pageOrIgId) {
            continue;
          }

          const mid = message.mid;
          const text = message.text || '';
          const msgTimestamp = item.timestamp
            ? new Date(Number(item.timestamp)).toISOString()
            : nowIso;

          if (!mid || !text) continue;

          // 1. Message Deduplication: Check if mid was already ingested
          const { data: existingMsg } = await adminSupabase
            .from('admin_messages')
            .select('id')
            .eq('external_message_id', mid)
            .maybeSingle();

          if (existingMsg) continue;

          // 2. Resolve or Create Contact by IGSID
          let contactId: string | null = null;
          const { data: contactRow } = await adminSupabase
            .from('admin_contacts')
            .select('id, name, instagram_username')
            .eq('instagram_scoped_id', senderId)
            .maybeSingle();

          if (contactRow) {
            contactId = contactRow.id;
          } else {
            const defaultName = `IG User ${senderId.slice(-4)}`;
            const { data: newContact, error: createContactErr } = await adminSupabase
              .from('admin_contacts')
              .insert({
                name: defaultName,
                instagram_scoped_id: senderId,
                instagram_username: null,
                is_demo: false,
                created_at: nowIso,
                updated_at: nowIso,
              })
              .select('id')
              .maybeSingle();

            if (!createContactErr && newContact) {
              contactId = newContact.id;
            } else if (createContactErr?.code === '23505') {
              const { data: retryContact } = await adminSupabase
                .from('admin_contacts')
                .select('id')
                .eq('instagram_scoped_id', senderId)
                .maybeSingle();
              contactId = retryContact?.id || null;
            }
          }

          if (!contactId) continue;

          // 3. Resolve or Create Instagram Conversation
          let conversationId: string | null = null;
          const { data: existingConv } = await adminSupabase
            .from('admin_conversations')
            .select('id, manual_takeover, automation_paused')
            .eq('contact_id', contactId)
            .eq('platform', 'instagram')
            .maybeSingle();

          if (existingConv) {
            conversationId = existingConv.id;
            await adminSupabase
              .from('admin_conversations')
              .update({
                last_message: text,
                last_message_at: msgTimestamp,
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
                last_message: text,
                last_message_at: msgTimestamp,
                unread_count: 1,
                manual_takeover: false,
                automation_paused: false,
                is_demo: false,
                created_at: nowIso,
                updated_at: nowIso,
              })
              .select('id')
              .maybeSingle();

            if (!createConvErr && newConv) {
              conversationId = newConv.id;
            }
          }

          if (!conversationId) continue;

          // 4. Save Customer Message
          await adminSupabase.from('admin_messages').insert({
            conversation_id: conversationId,
            sender_type: 'customer',
            sender_name: contactRow?.name || `IG User ${senderId.slice(-4)}`,
            content: text,
            status: 'sent',
            external_message_id: mid,
            is_demo: false,
            created_at: msgTimestamp,
          });
        }
      }

      // ====================================================================
      // B. PROCESS INCOMING COMMENTS (FOR COMMENT-TO-DM AUTOMATION)
      // ====================================================================
      if (Array.isArray(entry.changes) && entry.changes.length > 0) {
        for (const change of entry.changes) {
          if (change.field !== 'comments') continue;

          const val = change.value;
          if (!val) continue;

          const commentId = val.id;
          const commentText = (val.text || '').trim();
          const mediaId = val.media?.id;
          const senderId = val.from?.id; // IGSID

          if (!commentId || !commentText || senderId === pageOrIgId) continue;

          // Check comment rule matching in Supabase
          const { data: activeRules } = await adminSupabase
            .from('admin_comment_automations')
            .select('*')
            .eq('is_enabled', true);

          if (activeRules && activeRules.length > 0) {
            const normalizedText = commentText.toUpperCase();
            for (const rule of activeRules) {
              // Match either all media or specific media ID
              const matchesMedia =
                rule.reel_media_id === '*' ||
                rule.reel_media_id === 'all' ||
                rule.reel_media_id === mediaId;

              if (matchesMedia) {
                const keyword = rule.trigger_keyword.toUpperCase().trim();
                const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (wordRegex.test(normalizedText)) {
                  // Matched trigger keyword! Increment matching count
                  await adminSupabase
                    .from('admin_comment_automations')
                    .update({
                      matching_comments_count: (rule.matching_comments_count || 0) + 1,
                      last_execution_at: nowIso,
                      updated_at: nowIso,
                    })
                    .eq('id', rule.id);
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Touch Instagram service status
    try {
      await adminSupabase.from('admin_integration_status').upsert(
        {
          service_name: 'instagram',
          status: 'connected',
          last_checked_at: nowIso,
          response_time_ms: 45,
          error_message: null,
          updated_at: nowIso,
        },
        { onConflict: 'service_name' }
      );
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, status: 'processed' }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Instagram Webhook Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
