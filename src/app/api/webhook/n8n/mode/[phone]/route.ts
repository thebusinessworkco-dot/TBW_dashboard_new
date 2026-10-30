import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    // 1. Mandatory Header Authentication (N8N_WEBHOOK_SECRET exclusively)
    const auth = verifyIncomingN8nWebhook(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.reason || 'Unauthorized n8n caller',
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

    // 2. Ultra-fast single join query (250ms vs 1100ms sequential queries)
    const { data: contacts, error: contactErr } = await adminSupabase
      .from('admin_contacts')
      .select('id, name, company_name, admin_conversations(id, manual_takeover, automation_paused, status, internal_notes, platform)')
      .or(
        `phone.eq.${cleanPhone},phone.eq.${formattedPhone},phone.eq.${with91},phone.eq.${formattedWith91}`
      )
      .limit(1);

    if (contactErr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed - fail-closed active',
          data: { mode: 'human', can_respond: false },
        },
        { status: 500 }
      );
    }

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

    // 3. Resolve WhatsApp conversation from joined relation
    const convList = (contact.admin_conversations as Array<{
      id: string;
      manual_takeover?: boolean;
      automation_paused?: boolean;
      status?: string;
      internal_notes?: string;
      platform?: string;
    }>) || [];
    const conv = convList.find((c) => c.platform === 'whatsapp') || convList[0] || null;

    const isTakeover = Boolean(conv?.manual_takeover || conv?.automation_paused);

    let parsedState: Record<string, unknown> | null = null;
    try {
      if (conv?.internal_notes && conv.internal_notes.startsWith('{')) {
        parsedState = JSON.parse(conv.internal_notes);
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      phone: formattedPhone,
      conversation_id: conv?.id || null,
      data: {
        mode: isTakeover ? 'human' : 'ai',
        can_respond: !isTakeover,
        manual_takeover: Boolean(conv?.manual_takeover),
        automation_paused: Boolean(conv?.automation_paused),
        contact: {
          name: contact?.name || null,
          company_name: contact?.company_name || null,
        },
        state: parsedState,
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
