import { NextResponse } from 'next/server';
import { POST as handleN8nWebhook } from '@/app/api/n8n/webhook/route';

export async function POST(request: Request) {
  try {
    // Clone request and ensure event_type is set to 'incoming_whatsapp_message'
    const payload = await request.json();
    if (!payload.event_type) {
      payload.event_type = 'incoming_whatsapp_message';
    }

    const modifiedReq = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(payload),
    });

    return await handleN8nWebhook(modifiedReq);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process message';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
