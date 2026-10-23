import { NextResponse } from 'next/server';
import { recordInstagramAutomationEvent } from '@/lib/instagram/reel-automation';

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
    const authHeader = request.headers.get('authorization') || '';
    const customSecret = request.headers.get('x-tbw-webhook-secret') || request.headers.get('x-n8n-api-key') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

    const expectedSecret = process.env.N8N_WEBHOOK_SECRET || process.env.N8N_API_KEY;
    if (expectedSecret) {
      if (bearer !== expectedSecret && customSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized caller' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const result = await recordInstagramAutomationEvent(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Event recording failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
