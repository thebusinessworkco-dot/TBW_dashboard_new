import { NextResponse } from 'next/server';
import { POST as handleN8nWebhook } from '@/app/api/n8n/webhook/route';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const customSecret = request.headers.get('x-tbw-webhook-secret') || request.headers.get('x-n8n-api-key') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

    const expectedSecret = process.env.N8N_WEBHOOK_SECRET || process.env.N8N_API_KEY;
    if (expectedSecret && bearer !== expectedSecret && customSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    if (!payload.event_type) {
      payload.event_type = 'workflow_execution';
    }

    const modifiedReq = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(payload),
    });

    return await handleN8nWebhook(modifiedReq);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Event processing failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
