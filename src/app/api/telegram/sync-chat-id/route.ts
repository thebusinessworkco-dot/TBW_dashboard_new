import { NextResponse } from 'next/server';
import {
  syncChatIdFromUpdates,
  updateTelegramConfig,
} from '@/lib/telegram/telegram-service';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const manualChatId = body.chat_id;

    if (manualChatId) {
      const updated = await updateTelegramConfig({
        chat_id: String(manualChatId).trim(),
        status: 'connected',
        admin_name: body.admin_name || 'Admin',
      });
      return NextResponse.json({
        success: true,
        message: 'Chat ID updated manually',
        config: updated,
      });
    }

    const result = await syncChatIdFromUpdates();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
