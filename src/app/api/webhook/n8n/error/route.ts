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

    if (adminSupabase) {
      try {
        await adminSupabase.from('admin_workflow_executions').insert({
          workflow_id: String(payload.workflow_id || 'v4_error_monitor'),
          workflow_name: String(payload.workflow_name || 'V4 Error Alert'),
          execution_id: String(payload.execution_id || Date.now()),
          status: 'error',
          error_message: String(payload.error || payload.error_message || payload.message || 'Unknown error'),
          failed_node_name: payload.failed_node_name ? String(payload.failed_node_name) : null,
          duration_ms: Number(payload.duration_ms) || null,
          is_demo: false,
          started_at: nowIso,
        });
      } catch {
        // Non-blocking telemetry
      }

      try {
        await adminSupabase.from('admin_integration_status').upsert(
          {
            service_name: 'n8n',
            status: 'warning',
            last_checked_at: nowIso,
            error_message: String(payload.error || payload.message || 'Workflow warning logged').slice(0, 255),
            updated_at: nowIso,
          },
          { onConflict: 'service_name' }
        );
      } catch {
        // Non-blocking telemetry
      }
    }

    return NextResponse.json({ success: true, logged: true, timestamp: nowIso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error log failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
