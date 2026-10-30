import { NextResponse } from 'next/server';
import { sendTelegramAdminAlert } from '@/lib/telegram/telegram-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      text,
      phone,
      customerName,
      type = 'general',
      message, // alias for text
    } = body;

    const alertText = text || message;
    if (!alertText) {
      return NextResponse.json(
        { success: false, error: 'text or message is required' },
        { status: 400 }
      );
    }

    const result = await sendTelegramAdminAlert({
      title,
      text: alertText,
      phone,
      customerName,
      type,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Dispatch failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
