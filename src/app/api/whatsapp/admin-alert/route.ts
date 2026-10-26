import { NextResponse } from 'next/server';
import { sendAdminWhatsAppNotification } from '@/lib/whatsapp/admin-alert';
import { CustomerClassification } from '@/lib/whatsapp/session-manager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      classification = 'NEW_CUSTOMER',
      customerName,
      customerPhone,
      messagePreview,
      hasUpcomingAppointment,
      forceRetry = false,
    } = body;

    if (!customerPhone) {
      return NextResponse.json(
        { success: false, error: 'customerPhone is required' },
        { status: 400 }
      );
    }

    const sId = sessionId || `test_sess_${Date.now()}`;

    const result = await sendAdminWhatsAppNotification(
      {
        sessionId: sId,
        classification: classification as CustomerClassification,
        customerName,
        customerPhone,
        messagePreview,
        hasUpcomingAppointment,
      },
      forceRetry
    );

    return NextResponse.json({
      success: true,
      notification: result,
      recipient: result.recipient_phone,
      status: result.status,
      meta_message_id: result.meta_message_id,
      error_code: result.last_error_code,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to dispatch alert';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
