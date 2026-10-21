import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * META WHATSAPP CLOUD API — OUTGOING MESSAGE DISPATCH
 *
 * Supports:
 * 1. Live WhatsApp Inbox manual replies from Admin
 * 2. Quotation PDF delivery dispatch
 *
 * Enforces:
 * - Direct Meta WhatsApp Cloud API integration
 * - Automatic Human Takeover (pauses n8n automation for conversation)
 * - Persisting real external_message_id (wamid) in Supabase
 * - ZERO dummy or simulated data
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      conversationId,
      content,
      recipient,
      quotationNumber,
      customerName,
      pdfUrl,
      messageContent,
      senderType = 'human_agent',
    } = body;

    const token = process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Validate Meta Cloud API credentials in environment
    if (!token || !phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Meta WhatsApp Cloud API credentials are not configured. Please set WHATSAPP_CLOUD_API_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local',
        },
        { status: 503 }
      );
    }

    const adminSupabase = createAdminClient();

    // Determine target recipient phone number
    let cleanPhone = (recipient || '').replace(/[^0-9]/g, '');

    // If conversationId was provided instead of direct recipient phone, look up contact
    let resolvedConversationId: string | null = conversationId || null;

    if (!cleanPhone && conversationId && adminSupabase) {
      const { data: conv } = await adminSupabase
        .from('admin_conversations')
        .select('id, contact_id, contact:admin_contacts(phone)')
        .eq('id', conversationId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contactPhone = (conv as any)?.contact?.phone;
      if (contactPhone) {
        cleanPhone = contactPhone.replace(/[^0-9]/g, '');
      }
    } else if (!resolvedConversationId && cleanPhone && adminSupabase) {
      // Find matching contact and conversation for recipient phone
      const { data: contact } = await adminSupabase
        .from('admin_contacts')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone}`)
        .maybeSingle();

      if (contact) {
        const { data: conv } = await adminSupabase
          .from('admin_conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .eq('platform', 'whatsapp')
          .maybeSingle();

        if (conv) {
          resolvedConversationId = conv.id;
        }
      }
    }

    if (!cleanPhone) {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number could not be determined.' },
        { status: 400 }
      );
    }

    // Determine text message content
    const messageBody =
      content ||
      messageContent ||
      (quotationNumber
        ? `Hello ${customerName || 'Client'},\n\nYour requested service quotation *${quotationNumber}* from The Business Work is ready for review:\n\n${pdfUrl || 'https://thebusinesswork.com'}\n\nBest regards,\nAman Rajbhar · The Business Work`
        : '');

    if (!messageBody.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    // 1. Dispatch via Official Meta WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: messageBody,
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const metaErrorMsg =
        result.error?.message ||
        result.error?.error_user_msg ||
        'Meta WhatsApp Cloud API rejected the message.';
      const errorCode = result.error?.code;

      console.error('[WhatsApp Send API Error]:', result);

      return NextResponse.json(
        {
          success: false,
          error: metaErrorMsg,
          code: errorCode,
          details: result,
        },
        { status: response.status }
      );
    }

    const metaMessageId = result.messages?.[0]?.id; // e.g. wamid.HBgL...
    const nowIso = new Date().toISOString();

    // 2. Persist real outgoing message in Supabase
    if (adminSupabase && resolvedConversationId) {
      await adminSupabase.from('admin_messages').insert({
        conversation_id: resolvedConversationId,
        sender_type: senderType,
        sender_name:
          senderType === 'human_agent' ? 'Aman Rajbhar (Manual Takeover)' : 'TBW Bot',
        content: messageBody,
        status: 'sent',
        external_message_id: metaMessageId || null,
        is_demo: false,
        created_at: nowIso,
      });

      // 3. Activate Manual Takeover on conversation so n8n AI stops intervening
      await adminSupabase
        .from('admin_conversations')
        .update({
          last_message: messageBody,
          last_message_at: nowIso,
          manual_takeover: true,
          automation_paused: true,
          updated_at: nowIso,
        })
        .eq('id', resolvedConversationId);
    }

    return NextResponse.json({
      success: true,
      messageId: metaMessageId,
      status: 'sent',
      manualTakeoverActive: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[WhatsApp Send Error]:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
