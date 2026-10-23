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

    if (adminSupabase && (payload.phone || payload.name || payload.contact_id)) {
      try {
        const phone = String(payload.phone || payload.wa_id || '').replace(/\D/g, '');
        if (phone.length >= 10) {
          await adminSupabase.from('admin_contacts').upsert(
            {
              name: payload.name ? String(payload.name).slice(0, 100) : `Lead +${phone.slice(-10)}`,
              phone: '+' + phone,
              platform: payload.platform || 'whatsapp',
              tags: ['v4_lead', 'automated_capture'],
              last_active_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: 'phone' }
          );
        }
      } catch {
        // Non-blocking lead upsert
      }
    }

    return NextResponse.json({ success: true, processed: true, timestamp: nowIso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lead capture failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
