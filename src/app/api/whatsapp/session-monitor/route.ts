import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';
import { formatIST } from '@/lib/whatsapp/session-manager';

const SENDER_PHONE_ID = '1392092143987065';

const FOLLOW_UP_MESSAGES: Record<string, string> = {
  English: "Hey! 😊 Just checking if you're still there. Would you like to continue?",
  Hindi: "नमस्ते! 😊 क्या आप अभी बातचीत जारी रखना चाहेंगे?",
  Hinglish: "Hey! 😊 Aap abhi available ho? Hum baat aage continue karein?",
  Marathi: "नमस्कार! 😊 तुम्ही अजून उपलब्ध आहात का? आपण पुढे बोलूया?",
  pending: "Hey! 😊 Just a quick reminder to select your preferred language so we can assist you.",
};

function checkSessionMonitorAuth(request: Request): { authorized: boolean; reason?: string } {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (cronSecret && bearerToken && bearerToken === cronSecret) {
    return { authorized: true };
  }

  return verifyIncomingN8nWebhook(request, true);
}

export async function GET(request: Request) {
  const auth = checkSessionMonitorAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
  }
  return handleMonitoring();
}

export async function POST(request: Request) {
  const auth = checkSessionMonitorAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
  }
  return handleMonitoring();
}

async function handleMonitoring() {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return NextResponse.json(
      {
        success: false,
        mode: 'supabase_database_atomic',
        error: 'Database connection unavailable: SUPABASE_SERVICE_ROLE_KEY missing on server.',
      },
      { status: 500 }
    );
  }

  const token =
    process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN ||
    process.env.META_WA_ACCESS_TOKEN ||
    '';

  const actionsTaken: Array<{
    channel: 'whatsapp' | 'instagram';
    session_id: string;
    identifier: string;
    action: '3m_follow_up_sent' | '20m_session_expired';
    language?: string;
  }> = [];

  try {
    // =========================================================================
    // 1. WHATSAPP SESSIONS: ATOMIC CLAIM & FOLLOW-UP (SKIP LOCKED)
    // =========================================================================
    const { data: claimedWaRows, error: claimWaErr } = await adminSupabase
      .rpc('claim_wa_follow_up_atomic', { p_worker_id: 'session_monitor', p_batch_size: 20 });

    if (claimWaErr) {
      throw new Error(`claim_wa_follow_up_atomic failed: ${claimWaErr.message}`);
    }

    if (Array.isArray(claimedWaRows) && claimedWaRows.length > 0) {
      for (const item of claimedWaRows) {
        const lang = item.selected_language || 'English';
        const text = FOLLOW_UP_MESSAGES[lang] || FOLLOW_UP_MESSAGES.English;
        const phone = item.customer_phone;

        if (token && phone) {
          try {
            // Outbound Idempotency Check: Exactly ONE follow-up per session
            const idempKey = `out_wa_followup_${item.session_id}`;
            const { error: idempErr } = await adminSupabase
              .from('outgoing_message_idempotency')
              .insert({
                idempotency_key: idempKey,
                channel: 'whatsapp',
                recipient_id: phone,
                status: 'pending',
              });

            if (!idempErr) {
              const metaRes = await fetch(
                `https://graph.facebook.com/v21.0/${SENDER_PHONE_ID}/messages`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: phone,
                    type: 'text',
                    text: { preview_url: false, body: text },
                  }),
                }
              );

              const metaJson = await metaRes.json().catch(() => ({}));
              const metaMsgId = metaJson?.messages?.[0]?.id || null;

              await adminSupabase
                .from('outgoing_message_idempotency')
                .update({
                  status: metaRes.ok ? 'sent' : 'failed',
                  provider_message_id: metaMsgId,
                  sent_at: new Date().toISOString(),
                })
                .eq('idempotency_key', idempKey);
            }
          } catch (sendErr) {
            console.error(`[Session Monitor] Failed to dispatch WhatsApp follow-up to ${phone}:`, sendErr);
          }
        }

        actionsTaken.push({
          channel: 'whatsapp',
          session_id: item.session_id,
          identifier: phone || 'unknown',
          action: '3m_follow_up_sent',
          language: lang,
        });
      }
    }

    // =========================================================================
    // 2. WHATSAPP SESSIONS: ATOMIC 20-MIN INACTIVITY EXPIRATION (SILENT CLOSE)
    // =========================================================================
    const { data: expWaResult, error: expWaErr } = await adminSupabase.rpc('expire_wa_sessions_atomic');
    if (expWaErr) {
      throw new Error(`expire_wa_sessions_atomic failed: ${expWaErr.message}`);
    }

    const expWaCount = expWaResult?.[0]?.expired_count || 0;
    if (expWaCount > 0) {
      actionsTaken.push({
        channel: 'whatsapp',
        session_id: 'batch_expired',
        identifier: `${expWaCount} sessions`,
        action: '20m_session_expired',
      });
    }

    // =========================================================================
    // 3. INSTAGRAM SESSIONS: ATOMIC CLAIM & 3-MIN FOLLOW-UP (SKIP LOCKED)
    // =========================================================================
    const { data: claimedIgRows, error: claimIgErr } = await adminSupabase
      .rpc('claim_ig_follow_up_atomic', { p_worker_id: 'session_monitor', p_batch_size: 20 });

    if (claimIgErr) {
      throw new Error(`claim_ig_follow_up_atomic failed: ${claimIgErr.message}`);
    }

    if (Array.isArray(claimedIgRows) && claimedIgRows.length > 0) {
      for (const igItem of claimedIgRows) {
        actionsTaken.push({
          channel: 'instagram',
          session_id: igItem.session_id,
          identifier: igItem.ig_user_id || igItem.username || 'unknown',
          action: '3m_follow_up_sent',
        });
      }
    }

    // =========================================================================
    // 4. INSTAGRAM SESSIONS: ATOMIC 20-MIN INACTIVITY EXPIRATION (SILENT CLOSE)
    // =========================================================================
    const { data: expIgResult, error: expIgErr } = await adminSupabase.rpc('expire_ig_sessions_atomic');
    if (expIgErr) {
      throw new Error(`expire_ig_sessions_atomic failed: ${expIgErr.message}`);
    }

    const expIgCount = expIgResult?.[0]?.expired_count || 0;
    if (expIgCount > 0) {
      actionsTaken.push({
        channel: 'instagram',
        session_id: 'batch_expired_ig',
        identifier: `${expIgCount} IG sessions`,
        action: '20m_session_expired',
      });
    }

    // =========================================================================
    // 5. ALWAYS RETURN POSTGRESQL ATOMIC STATUS (Zero RAM fallback)
    // =========================================================================
    return NextResponse.json({
      success: true,
      mode: 'supabase_database_atomic',
      timestamp: formatIST(new Date()),
      wa_follow_ups_claimed: claimedWaRows?.length || 0,
      wa_sessions_expired: expWaCount,
      ig_follow_ups_claimed: claimedIgRows?.length || 0,
      ig_sessions_expired: expIgCount,
      actions_taken: actionsTaken,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database session monitor failure';
    console.error('[Session Monitor Error]:', msg);
    return NextResponse.json(
      {
        success: false,
        mode: 'supabase_database_atomic',
        error: msg,
      },
      { status: 500 }
    );
  }
}
