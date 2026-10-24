import { NextResponse } from 'next/server';
import { POST as handleN8nWebhook } from '@/app/api/n8n/webhook/route';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    if (!payload.event_type) {
      payload.event_type = 'workflow_execution';
    }

    const headers = new Headers(request.headers);
    if (process.env.N8N_WEBHOOK_SECRET) {
      headers.set('x-n8n-api-key', process.env.N8N_WEBHOOK_SECRET);
    }

    const modifiedReq = new Request(request.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return await handleN8nWebhook(modifiedReq);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Event processing failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
