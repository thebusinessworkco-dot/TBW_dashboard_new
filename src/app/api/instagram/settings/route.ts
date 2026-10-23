import { NextResponse } from 'next/server';
import {
  getWhatsAppBusinessPhone,
  setWhatsAppBusinessPhone,
  generateWhatsAppUrl,
} from '@/lib/instagram/reel-automation';

/**
 * INSTAGRAM & WHATSAPP SETTINGS ENDPOINT: /api/instagram/settings
 * Manages the one-time WhatsApp business phone number (E.164, digits only).
 */
export async function GET() {
  try {
    const phone = await getWhatsAppBusinessPhone();
    const testUrl = await generateWhatsAppUrl('Test prefill message from The Business Work');

    return NextResponse.json({
      success: true,
      whatsapp_business_phone: phone,
      is_configured: Boolean(phone),
      test_url: testUrl,
    }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to get settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = body;

    const result = await setWhatsAppBusinessPhone(phone);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const testUrl = await generateWhatsAppUrl('Test verification');
    return NextResponse.json({
      success: true,
      whatsapp_business_phone: result.phone,
      test_url: testUrl,
    }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
