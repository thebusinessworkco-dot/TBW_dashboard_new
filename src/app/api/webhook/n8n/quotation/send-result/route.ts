import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    if (adminSupabase && payload.quotation_id) {
      try {
        await adminSupabase.from('admin_audit_logs').insert({
          action: 'quotation_send_result',
          details: {
            quotation_id: payload.quotation_id,
            channel: payload.channel || 'whatsapp',
            phone_number: payload.phone_number,
            accepted_by_provider: payload.accepted_by_provider,
            provider_message_id: payload.provider_message_id,
            error: payload.error,
          },
          created_at: nowIso,
        });
      } catch {
        // Non-blocking telemetry
      }
    }

    return NextResponse.json({ success: true, processed: true, timestamp: nowIso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Quotation send result logging failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
