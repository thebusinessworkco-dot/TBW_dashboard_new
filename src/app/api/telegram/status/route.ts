import { NextResponse } from 'next/server';
import {
  getTelegramConfig,
  getTelegramAlertHistory,
} from '@/lib/telegram/telegram-service';

export async function GET() {
  try {
    const config = await getTelegramConfig();
    const history = await getTelegramAlertHistory();

    return NextResponse.json({
      success: true,
      config: {
        bot_username: config.bot_username,
        chat_id: config.chat_id,
        admin_name: config.admin_name,
        status: config.status,
        notify_customer_chat: config.notify_customer_chat,
        notify_new_leads: config.notify_new_leads,
        notify_appointments: config.notify_appointments,
        notify_human_support: config.notify_human_support,
        updated_at: config.updated_at,
        is_connected: Boolean(config.chat_id && config.status === 'connected'),
      },
      history,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch telegram status';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

