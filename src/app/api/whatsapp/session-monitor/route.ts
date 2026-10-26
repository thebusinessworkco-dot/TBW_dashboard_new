import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';
import {
  getAllSessions,
  formatIST,
  logSessionEvent,
} from '@/lib/whatsapp/session-manager';

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
  const token =
    process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN ||
    process.env.META_WA_ACCESS_TOKEN ||
    '';

  const actionsTaken: Array<{
    session_id: string;
    phone: string;
    action: '3m_follow_up_sent' | '20m_session_expired';
    language?: string;
  }> = [];

  try {
    // =========================================================================
    // 1. SUPABASE DATABASE ATOMIC PATH (Preferred Production Execution)
    // =========================================================================
    if (adminSupabase) {
      // A. Atomic 3-Minute Follow-Up Claim via FOR UPDATE SKIP LOCKED
      // Concurrency protected: multiple concurrent workers CANNOT claim the same session
      try {
        const { data: claimedRows, error: claimErr } = await adminSupabase
          .rpc('claim_wa_follow_up_atomic', { p_worker_id: 'session_monitor', p_batch_size: 20 });

        if (!claimErr && Array.isArray(claimedRows) && claimedRows.length > 0) {
          for (const item of claimedRows) {
            const lang = item.selected_language || 'English';
            const text = FOLLOW_UP_MESSAGES[lang] || FOLLOW_UP_MESSAGES.English;
            const phone = item.customer_phone;

            if (token && phone) {
              try {
                // Outbound Idempotency Check
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
                console.error(`[Session Monitor] Failed to dispatch follow-up to ${phone}:`, sendErr);
              }
            }

            actionsTaken.push({
              session_id: item.session_id,
              phone: phone || 'unknown',
              action: '3m_follow_up_sent',
              language: lang,
            });
          }
        }
      } catch (dbErr) {
        // Table or function not ready yet, continue to fallback
      }

      // B. Atomic 20-Minute Inactivity Session Expiration (Silent Close)
      try {
        const { data: expResult, error: expErr } = await adminSupabase.rpc('expire_wa_sessions_atomic');
        if (!expErr && expResult?.[0]?.expired_count > 0) {
          actionsTaken.push({
            session_id: 'batch_expired',
            phone: 'all',
            action: '20m_session_expired',
          });
        }
      } catch {
        // Fallback
      }

      if (actionsTaken.length > 0) {
        return NextResponse.json({
          success: true,
          mode: 'supabase_database_atomic',
          timestamp: formatIST(new Date()),
          actions_taken: actionsTaken,
        });
      }
    }

    // =========================================================================
    // 2. IN-MEMORY FALLBACK PATH (Active when DB tables are not yet applied)
    // =========================================================================
    const now = Date.now();
    const nowIso = new Date().toISOString();
    const sessions = getAllSessions();

    for (const session of sessions) {
      if (session.status === 'EXPIRED' || session.status === 'CLOSED') continue;
      if (session.human_takeover_active) continue;

      const lastCustomerTime = new Date(session.last_customer_message_at).getTime();
      const timeSinceCustomer = now - lastCustomerTime;

      // 1. Check 3-Minute Follow-Up (Sent exactly ONCE per session)
      if (
        session.awaiting_customer &&
        !session.follow_up_sent_at &&
        session.follow_up_due_at &&
        now >= new Date(session.follow_up_due_at).getTime() &&
        timeSinceCustomer < 20 * 60 * 1000
      ) {
        const lang = session.selected_language || (session.status === 'AWAITING_LANGUAGE' ? 'pending' : 'English');
        const text = FOLLOW_UP_MESSAGES[lang] || FOLLOW_UP_MESSAGES.English;
        const targetPhone = (session as unknown as { customer_phone?: string }).customer_phone || session.contact_id;

        if (token && targetPhone && targetPhone.length >= 10 && !targetPhone.includes('-')) {
          try {
            await fetch(`https://graph.facebook.com/v21.0/${SENDER_PHONE_ID}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: targetPhone,
                type: 'text',
                text: { preview_url: false, body: text },
              }),
            });
          } catch {
            // Non-blocking
          }
        }

        session.follow_up_sent_at = nowIso;
        session.awaiting_customer = false; // exactly one follow-up per session
        session.version += 1;

        await logSessionEvent(session.session_id, 'follow_up_sent', {
          language: lang,
          phone: targetPhone,
        });

        actionsTaken.push({
          session_id: session.session_id,
          phone: targetPhone || 'unknown',
          action: '3m_follow_up_sent',
          language: lang,
        });
      }

      // 2. Check 20-Minute Inactivity Expiration (Silent Close: Rule 9)
      if (timeSinceCustomer >= 20 * 60 * 1000) {
        session.status = 'EXPIRED';
        session.closed_at = nowIso;
        session.close_reason = 'closed_inactivity';
        session.awaiting_customer = false;
        session.version += 1;

        await logSessionEvent(session.session_id, 'session_expired', {
          phone: session.contact_id,
          reason: '20_minute_inactivity_timeout',
          last_message_at: session.last_customer_message_at,
        });

        actionsTaken.push({
          session_id: session.session_id,
          phone: session.contact_id || 'unknown',
          action: '20m_session_expired',
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'in_memory_fallback',
      timestamp: formatIST(new Date()),
      active_sessions_checked: sessions.length,
      actions_taken: actionsTaken,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session monitor error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
