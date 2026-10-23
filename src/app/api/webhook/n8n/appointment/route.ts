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

    if (adminSupabase && payload.appointment) {
      try {
        await adminSupabase.from('admin_appointments').insert({
          title: payload.appointment.title || 'Consultation via Automation',
          scheduled_time: payload.appointment.time || payload.appointment.scheduled_time || nowIso,
          status: 'confirmed',
          client_name: payload.appointment.client_name || payload.name || 'Client',
          client_phone: payload.appointment.client_phone || payload.phone || null,
          platform: 'whatsapp',
          is_demo: false,
          created_at: nowIso,
        });
      } catch {
        // Non-blocking appointment persistence
      }
    }

    return NextResponse.json({ success: true, processed: true, timestamp: nowIso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Appointment processing failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
