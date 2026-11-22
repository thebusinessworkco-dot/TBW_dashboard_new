import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, takeover, status, automationPaused } = body;

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 503 }
      );
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updated_at: nowIso,
    };

    if (typeof takeover === 'boolean') {
      updatePayload.manual_takeover = takeover;
      updatePayload.automation_paused = takeover ? true : (automationPaused ?? false);
    }

    if (typeof automationPaused === 'boolean') {
      updatePayload.automation_paused = automationPaused;
    }

    if (status) {
      updatePayload.status = status;
    }

    const { data, error } = await adminSupabase
      .from('admin_conversations')
      .update(updatePayload)
      .eq('id', conversationId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Takeover API Error]:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversation: data,
      manual_takeover: updatePayload.manual_takeover,
      automation_paused: updatePayload.automation_paused,
      status: updatePayload.status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
