import { NextResponse } from 'next/server';
import { sendTelegramAdminAlert, getTelegramConfig } from '@/lib/telegram/telegram-service';

export async function POST() {
  try {
    const config = await getTelegramConfig();

    if (!config.chat_id) {
      return NextResponse.json({
        success: false,
        error:
          'Telegram Chat ID not connected yet. Open @TBW_Admin_Alerts_Bot on Telegram and tap Start (/start), then click "Sync Telegram" in dashboard.',
      });
    }

    const testTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date());

    const result = await sendTelegramAdminAlert({
      title: '🚀 TBW Telegram Alerts Live Test',
      text: `Admin alert pipeline operational!\n\nThis confirms instant delivery with zero 24-hour window restrictions. Whenever a customer sends a message or books an appointment on WhatsApp, an alert will arrive here immediately.`,
      phone: '918604600292',
      customerName: 'Aman (Admin Test)',
      type: 'general',
    });

    return NextResponse.json({
      success: result.success,
      delivered_to: config.chat_id,
      timestamp: testTime,
      error: result.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Test failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
