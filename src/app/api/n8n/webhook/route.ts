import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * SELF-HOSTED n8n INTEGRATION WEBHOOK ENDPOINT
 *
 * Facilitates bidirectional integration between self-hosted n8n workflows and Supabase:
 * 1. 'check_takeover': n8n queries if human takeover is active before running AI
 * 2. 'log_ai_reply': n8n logs an automated AI or rule-based reply into Supabase
 * 3. 'workflow_execution': n8n logs execution telemetry and failure diagnosis
 */
export async function POST(request: Request) {
  try {
    // Authenticate n8n request if secret configured
    const expectedSecret = process.env.N8N_API_KEY || process.env.N8N_WEBHOOK_SECRET;
    if (expectedSecret) {
      const authHeader = request.headers.get('authorization') || '';
      const customKey = request.headers.get('x-n8n-api-key') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');

      if (token !== expectedSecret && customKey !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized n8n caller' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const eventType = payload.event_type || 'workflow_execution';
    const adminSupabase = createAdminClient();

    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 503 }
      );
    }

    // ========================================================================
    // 1. CHECK HUMAN TAKEOVER STATUS (n8n pre-execution check)
    // ========================================================================
    if (eventType === 'check_takeover') {
      const { conversation_id, phone } = payload;

      let query = adminSupabase.from('admin_conversations').select('id, manual_takeover, automation_paused, status');

      if (conversation_id) {
        query = query.eq('id', conversation_id);
      } else if (phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const { data: contact } = await adminSupabase
          .from('admin_contacts')
          .select('id')
          .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`)
          .maybeSingle();

        if (contact) {
          query = query.eq('contact_id', contact.id);
        } else {
          return NextResponse.json({
            success: true,
            exists: false,
            manual_takeover: false,
            automation_paused: false,
            can_respond: true,
          });
        }
      }

      const { data: conv } = await query.maybeSingle();

      const isTakeover = Boolean(conv?.manual_takeover || conv?.automation_paused);

      return NextResponse.json({
        success: true,
        conversation_id: conv?.id,
        manual_takeover: Boolean(conv?.manual_takeover),
        automation_paused: Boolean(conv?.automation_paused),
        can_respond: !isTakeover,
        notice: isTakeover
          ? 'Human admin has active takeover. Do not dispatch automated replies.'
          : 'Automation permitted.',
      });
    }

    // ========================================================================
    // 2. LOG AUTOMATION AI REPLY (Sent by n8n workflow)
    // ========================================================================
    if (eventType === 'log_ai_reply' || eventType === 'incoming_message') {
      const {
        conversation_id,
        content,
        sender_type = 'automation_ai',
        sender_name = 'TBW AI Assistant',
        external_message_id,
      } = payload;

      if (!conversation_id || !content) {
        return NextResponse.json(
          { error: 'conversation_id and content are required' },
          { status: 400 }
        );
      }

      // Check for deduplication
      if (external_message_id) {
        const { data: existing } = await adminSupabase
          .from('admin_messages')
          .select('id')
          .eq('external_message_id', external_message_id)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ success: true, deduplicated: true });
        }
      }

      const nowIso = new Date().toISOString();

      await adminSupabase.from('admin_messages').insert({
        conversation_id,
        sender_type: sender_type === 'human_agent' ? 'human_agent' : 'automation_ai',
        sender_name,
        content,
        status: 'sent',
        external_message_id: external_message_id || null,
        is_demo: false,
        created_at: nowIso,
      });

      await adminSupabase
        .from('admin_conversations')
        .update({
          last_message: content,
          last_message_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', conversation_id);

      return NextResponse.json({
        success: true,
        action: 'ai_reply_logged',
        conversation_id,
      });
    }

    // ========================================================================
    // 3. LOG WORKFLOW EXECUTION TELEMETRY
    // ========================================================================
    if (eventType === 'workflow_execution') {
      const {
        workflow_id,
        workflow_name,
        status,
        execution_id,
        error_message,
        failed_node_name,
        duration_ms,
      } = payload;

      if (workflow_id && execution_id) {
        await adminSupabase.from('admin_workflow_executions').insert({
          workflow_id,
          workflow_name: workflow_name || 'n8n Automation',
          execution_id: String(execution_id),
          status: status === 'error' ? 'error' : status === 'running' ? 'running' : 'success',
          error_message: error_message || null,
          failed_node_name: failed_node_name || null,
          duration_ms: Number(duration_ms) || null,
          is_demo: false,
          started_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        action: 'execution_logged',
        execution_id,
      });
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook parsing error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
