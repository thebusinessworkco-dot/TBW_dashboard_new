import { NextResponse } from 'next/server';
import {
  updateTelegramConfig,
  sendTelegramRawMessage,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_BOT_USERNAME,
} from '@/lib/telegram/telegram-service';

export async function POST(req: Request) {
  try {
    const update = await req.json();

    const msg = update?.message || update?.channel_post || update?.callback_query?.message;
    if (msg?.chat?.id) {
      const chatId = msg.chat.id;
      const firstName =
        msg.from?.first_name ||
        msg.chat?.first_name ||
        msg.from?.username ||
        'Admin';
      const text = msg.text || '';

      // Update chat_id in database
      await updateTelegramConfig({
        chat_id: chatId,
        admin_name: firstName,
        status: 'connected',
      });

      // Send greeting back to user on Telegram
      if (text.startsWith('/start') || text.toLowerCase() === 'start') {
        await sendTelegramRawMessage(
          chatId,
          `🎉 <b>The Business Work Admin Alerts Connected!</b>\n\nHello ${firstName}! Aapka Telegram account successfully link ho gaya hai.\n\nAb aapko saare WhatsApp customer messages, new leads, bookings, aur human support requests yahan turant milenge!\n\n<b>Chat ID:</b> <code>${chatId}</code>\n<b>Bot:</b> @${DEFAULT_TELEGRAM_BOT_USERNAME}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🖥️ Open Dashboard',
                    url: 'https://dashboard.thebusinesswork.com',
                  },
                ],
              ],
            },
          }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: false }, { status: 200 }); // Always 200 to prevent Telegram retry spam
  }
}

export async function GET() {
  return NextResponse.json({ status: 'TBW Telegram Webhook Active' });
}
