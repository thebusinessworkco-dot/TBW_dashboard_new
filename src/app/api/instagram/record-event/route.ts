import { NextResponse } from 'next/server';
import { recordInstagramAutomationEvent } from '@/lib/instagram/reel-automation';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

/**
 * CONTRACT: POST /api/instagram/record-event
 * Ingests execution receipts from n8n or direct webhook calls:
 * - 'private_reply_sent'
 * - 'public_reply_sent'
 * - 'follow_verified'
 * - 'dm_interaction'
 */
export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request, true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json();
    const result = await recordInstagramAutomationEvent(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Event recording failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
