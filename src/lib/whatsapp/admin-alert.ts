import { createAdminClient } from '../supabase/admin';
import { sendTelegramAdminAlert } from '../telegram/telegram-service';
import {
  CustomerClassification,
  WaAdminNotificationRecord,
  formatIST,
  logSessionEvent,
} from './session-manager';

const ADMIN_RECIPIENT = '918604600292';
const BUSINESS_SENDER_ID = '1392092143987065';
const BUSINESS_SENDER_PHONE = '+91 7972020292';

const dispatchedAlertsBySession = new Map<string, WaAdminNotificationRecord>();

export interface AdminAlertPayload {
  sessionId: string;
  classification: CustomerClassification;
  customerName?: string | null;
  customerPhone: string;
  messagePreview?: string | null;
  hasUpcomingAppointment?: boolean;
}

/**
 * Builds the standard English admin alert text
 */
export function buildAdminAlertText(data: AdminAlertPayload): string {
  const timeFormatted = formatIST(new Date());
  const name = (data.customerName || '').trim() || 'Not provided';
  const phoneFormatted = data.customerPhone.startsWith('+')
    ? data.customerPhone
    : `+${data.customerPhone}`;
  const preview = (data.messagePreview || '').trim() || 'Started a new conversation';

  if (data.classification === 'RETURNING_CUSTOMER') {
    let body = `🔄 Returning Customer Alert — The Business Work\n\nAn existing customer has started a new WhatsApp conversation.\n\nCustomer: ${name}\nPhone: ${phoneFormatted}\nStatus: RETURNING CUSTOMER\nPrevious Session: Expired\nNew Session: Started\nTime: ${timeFormatted}\nMessage: ${preview}`;

    if (data.hasUpcomingAppointment) {
      body += `\nUpcoming Appointment: Confirmed booking verified on calendar.`;
    }

    body += `\nDashboard: https://dashboard.thebusinesswork.com`;
    return body;
  }

  // Brand-new customer
  return `🔔 New Customer Alert — The Business Work\n\nA new customer has just started a WhatsApp conversation.\n\nCustomer: ${name}\nPhone: ${phoneFormatted}\nStatus: NEW CUSTOMER\nSession: New\nTime: ${timeFormatted}\nFirst Message: ${preview}\nDashboard: https://dashboard.thebusinesswork.com`;
}

/**
 * Dispatches the official WhatsApp Admin Alert to 918604600292
 */
export async function sendAdminWhatsAppNotification(
  payload: AdminAlertPayload,
  forceRetry: boolean = false
): Promise<WaAdminNotificationRecord> {
  const adminSupabase = createAdminClient();

  // 1. Idempotency Check (1 alert per new session)
  if (!forceRetry && dispatchedAlertsBySession.has(payload.sessionId)) {
    return dispatchedAlertsBySession.get(payload.sessionId)!;
  }

  const alertBody = buildAdminAlertText(payload);
  const nowIso = new Date().toISOString();

  const record: WaAdminNotificationRecord = {
    id: crypto.randomUUID?.() || `notif_${Date.now()}`,
    session_id: payload.sessionId,
    customer_classification: payload.classification,
    notification_type: payload.classification === 'RETURNING_CUSTOMER' ? 'RETURNING_SESSION' : 'SESSION_START',
    recipient_phone: ADMIN_RECIPIENT,
    meta_message_id: null,
    status: 'queued',
    attempts: 1,
    last_error_code: null,
    message_body: alertBody,
    created_at: nowIso,
    sent_at: null,
    delivered_at: null,
  };

  // 2. Fetch Meta Cloud API Token
  const token =
    process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN ||
    process.env.META_WA_ACCESS_TOKEN ||
    '';

  // 3. Dispatch via Official Meta WhatsApp Cloud API endpoint
  if (token) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${BUSINESS_SENDER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: ADMIN_RECIPIENT,
            type: 'text',
            text: {
              preview_url: true,
              body: alertBody,
            },
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.messages?.[0]?.id) {
        record.status = 'accepted';
        record.meta_message_id = result.messages[0].id;
        record.sent_at = new Date().toISOString();
      } else {
        const errorCode = String(result.error?.code || response.status);
        record.last_error_code = errorCode;

        // Code 131047: Re-engagement message / 24-hr window expired
        if (errorCode === '131047' || result.error?.message?.includes('24 hours')) {
          record.status = 'template_pending';
        } else {
          record.status = 'failed';
        }
      }
    } catch (err: unknown) {
      record.status = 'failed';
      record.last_error_code = err instanceof Error ? err.message : 'Network error';
    }
  } else {
    // If no direct token in dashboard env, route through n8n outbox webhook or mark queued
    record.status = 'queued';
    record.last_error_code = 'N8N_DISPATCH_FALLBACK';
  }

  // Dispatch parallel alert via Telegram Bot (bypasses Meta 24-hr restriction)
  try {
    sendTelegramAdminAlert({
      title: payload.classification === 'RETURNING_CUSTOMER' ? '🔄 Returning Customer Alert' : '🔔 New Customer Alert',
      text: alertBody,
      phone: payload.customerPhone,
      customerName: payload.customerName || undefined,
      type: payload.classification === 'RETURNING_CUSTOMER' ? 'returning_customer' : 'new_customer',
    }).catch(err => console.error('Telegram background alert error:', err));
  } catch (tgErr) {
    console.error('Failed to dispatch telegram admin alert:', tgErr);
  }

  dispatchedAlertsBySession.set(payload.sessionId, record);

  // 4. Persist in Database
  if (adminSupabase) {
    try {
      await adminSupabase.from('wa_admin_notifications').insert(record);
    } catch {
      // Table fallback
    }
  }

  await logSessionEvent(payload.sessionId, 'admin_notification_attempted', {
    recipient: ADMIN_RECIPIENT,
    status: record.status,
    classification: payload.classification,
    meta_message_id: record.meta_message_id,
    error: record.last_error_code,
  });

  return record;
}

/**
 * Returns all logged notifications
 */
export function getAllAdminNotifications(): WaAdminNotificationRecord[] {
  return Array.from(dispatchedAlertsBySession.values());
}
