import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    // 1. Mandatory Header Authentication (Fails closed if secret is missing or mismatched)
    const expectedSecret = process.env.N8N_API_KEY || process.env.N8N_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server misconfiguration: N8N_WEBHOOK_SECRET is not configured on the server.',
          data: { mode: 'human', can_respond: false },
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    const customKey = request.headers.get('x-n8n-api-key') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== expectedSecret && customKey !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized n8n caller',
          data: { mode: 'human', can_respond: false },
        },
        { status: 401 }
      );
    }

    const { phone: rawPhone } = await params;
    const cleanPhone = String(rawPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing phone parameter in path',
          data: { mode: 'human', can_respond: false },
        },
        { status: 400 }
      );
    }

    const formattedPhone = '+' + cleanPhone;
    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase client unavailable',
          data: { mode: 'human', can_respond: false },
        },
        { status: 503 }
      );
    }

    const tenDigit = cleanPhone.slice(-10);
    const with91 = '91' + tenDigit;
    const formattedWith91 = '+91' + tenDigit;

    // 2. Query contact by normalized phone
    const { data: contacts } = await adminSupabase
      .from('admin_contacts')
      .select('id')
      .or(
        `phone.eq.${cleanPhone},phone.eq.${formattedPhone},phone.eq.${with91},phone.eq.${formattedWith91},phone.ilike.%${tenDigit}`
      )
      .order('created_at', { ascending: true })
      .limit(1);

    const contact = contacts?.[0] || null;

    if (!contact) {
      // New contact: No takeover active yet, AI automation permitted
      return NextResponse.json({
        success: true,
        phone: formattedPhone,
        exists: false,
        data: {
          mode: 'ai',
          can_respond: true,
          manual_takeover: false,
          automation_paused: false,
        },
        notice: 'New contact: default AI mode enabled.',
      });
    }

    // 3. Query conversation for takeover or paused state
    const { data: conv, error: convErr } = await adminSupabase
      .from('admin_conversations')
      .select('id, manual_takeover, automation_paused, status')
      .eq('contact_id', contact.id)
      .eq('platform', 'whatsapp')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (convErr) {
      // Fail closed on database error: human mode
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed - fail-closed active',
          data: { mode: 'human', can_respond: false },
        },
        { status: 500 }
      );
    }

    const isTakeover = Boolean(conv?.manual_takeover || conv?.automation_paused);

    return NextResponse.json({
      success: true,
      phone: formattedPhone,
      conversation_id: conv?.id || null,
      data: {
        mode: isTakeover ? 'human' : 'ai',
        can_respond: !isTakeover,
        manual_takeover: Boolean(conv?.manual_takeover),
        automation_paused: Boolean(conv?.automation_paused),
      },
      notice: isTakeover
        ? 'Human takeover or paused state active. Automated replies suppressed.'
        : 'AI mode active. Automated replies permitted.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Mode check failed';
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: { mode: 'human', can_respond: false },
      },
      { status: 500 }
    );
  }
}
