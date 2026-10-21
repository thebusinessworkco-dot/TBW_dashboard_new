import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const eventType = payload.event_type || 'workflow_execution';

    // Handle incoming chat message from n8n WhatsApp or Instagram workflow
    if (eventType === 'incoming_message') {
      return NextResponse.json({
        success: true,
        action: 'message_logged',
        conversation_id: payload.conversation_id,
      });
    }

    // Handle n8n execution telemetry log
    if (eventType === 'workflow_execution') {
      const { workflow_id, workflow_name, status, execution_id, error_message, failed_node_name } = payload;

      return NextResponse.json({
        success: true,
        action: 'execution_logged',
        execution_id,
        workflow_id,
        workflow_name,
        status,
        failed_node: failed_node_name,
        error: error_message,
      });
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook parsing error';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
