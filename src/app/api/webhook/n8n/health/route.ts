import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    if (adminSupabase) {
      try {
        await adminSupabase.from('admin_integration_status').upsert(
          {
            service_name: 'n8n',
            status: 'connected',
            last_sync_at: nowIso,
            details: { note: 'Automation engine online', response_time_ms: 45 },
            error_message: null,
            updated_at: nowIso,
          },
          { onConflict: 'service_name' }
        );
      } catch {
        // Non-blocking telemetry touch
      }

      if (payload?.execution_id || payload?.workflow_id) {
        try {
          await adminSupabase.from('admin_workflow_executions').insert({
            workflow_id: String(payload.workflow_id || 'v4_monitor'),
            workflow_name: String(payload.workflow_name || 'V4 Health Monitor'),
            execution_id: String(payload.execution_id || Date.now()),
            status: 'success',
            duration_ms: Number(payload.duration_ms) || 50,
            is_demo: false,
            started_at: nowIso,
          });
        } catch {
          // Non-blocking telemetry
        }
      }
    }

    return NextResponse.json({ success: true, status: 'healthy', timestamp: nowIso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Health check error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'healthy', service: 'n8n-webhook-health' });
}
