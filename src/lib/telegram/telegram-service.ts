import { createAdminClient } from '../supabase/admin';

export const DEFAULT_TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || '9108406918:AAGXPoeN0OF9dk3cSoptoRIO9ZP6ILnhqgg';
export const DEFAULT_TELEGRAM_BOT_USERNAME = 'TBW_Admin_Alerts_Bot';

export interface TelegramAlertConfig {
  bot_token: string;
  bot_username: string;
  chat_id: string | number | null;
  admin_name: string | null;
  status: 'pending_start' | 'connected' | 'disabled';
  notify_customer_chat: boolean;
  notify_new_leads: boolean;
  notify_appointments: boolean;
  notify_human_support: boolean;
  updated_at: string;
}

export interface TelegramAlertLog {
  id: string;
  title: string;
  text: string;
  phone?: string;
  customer_name?: string;
  type: string;
  status: 'sent' | 'failed' | 'queued';
  error?: string | null;
  sent_at: string;
}

export interface SendAlertParams {
  title?: string;
  text: string;
  phone?: string;
  customerName?: string;
  type?: 'new_customer' | 'returning_customer' | 'lead' | 'appointment' | 'human_support' | 'general';
}

/**
 * Fetch current Telegram configuration from Supabase admin_settings
 */
export async function getTelegramConfig(): Promise<TelegramAlertConfig> {
  const sb = createAdminClient();
  const defaultConfig: TelegramAlertConfig = {
    bot_token: DEFAULT_TELEGRAM_BOT_TOKEN,
    bot_username: DEFAULT_TELEGRAM_BOT_USERNAME,
    chat_id: null,
    admin_name: null,
    status: 'pending_start',
    notify_customer_chat: true,
    notify_new_leads: true,
    notify_appointments: true,
    notify_human_support: true,
    updated_at: new Date().toISOString(),
  };

  if (!sb) return defaultConfig;

  try {
    const { data } = await sb
      .from('admin_settings')
      .select('value')
      .eq('key', 'telegram_alert_config')
      .single();

    if (data?.value) {
      return {
        ...defaultConfig,
        ...data.value,
        bot_token: data.value.bot_token || DEFAULT_TELEGRAM_BOT_TOKEN,
        bot_username: data.value.bot_username || DEFAULT_TELEGRAM_BOT_USERNAME,
      };
    }
  } catch (err) {
    console.error('Failed to read telegram config:', err);
  }

  return defaultConfig;
}

/**
 * Update Telegram configuration in Supabase admin_settings
 */
export async function updateTelegramConfig(
  patch: Partial<TelegramAlertConfig>
): Promise<TelegramAlertConfig> {
  const current = await getTelegramConfig();
  const updated: TelegramAlertConfig = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const sb = createAdminClient();
  if (sb) {
    await sb.from('admin_settings').upsert({
      key: 'telegram_alert_config',
      value: updated,
      updated_at: updated.updated_at,
    });
  }

  return updated;
}

/**
 * Appends an alert to the recent history in admin_settings
 */
export async function recordTelegramAlertLog(log: TelegramAlertLog) {
  const sb = createAdminClient();
  if (!sb) return;

  try {
    const { data } = await sb
      .from('admin_settings')
      .select('value')
      .eq('key', 'telegram_alert_history')
      .single();

    const history: TelegramAlertLog[] = Array.isArray(data?.value) ? data.value : [];
    history.unshift(log);
    const trimmed = history.slice(0, 50);

    await sb.from('admin_settings').upsert({
      key: 'telegram_alert_history',
      value: trimmed,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to save alert history:', e);
  }
}

/**
 * Retrieves recent Telegram alert logs
 */
export async function getTelegramAlertHistory(): Promise<TelegramAlertLog[]> {
  const sb = createAdminClient();
  if (!sb) return [];

  try {
    const { data } = await sb
      .from('admin_settings')
      .select('value')
      .eq('key', 'telegram_alert_history')
      .single();

    return Array.isArray(data?.value) ? data.value : [];
  } catch {
    return [];
  }
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendTelegramRawMessage(
  chatId: string | number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: Record<string, unknown>;
    token?: string;
  }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const token = options?.token || DEFAULT_TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
    };

    if (options?.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      return { success: false, error: json.description || `HTTP ${res.status}` };
    }

    return { success: true, data: json.result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: msg };
  }
}

/**
 * Dispatches an automated admin alert to the configured Telegram chat
 */
export async function sendTelegramAdminAlert(params: SendAlertParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const config = await getTelegramConfig();

  if (!config.chat_id) {
    const log: TelegramAlertLog = {
      id: `tg_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: params.title || 'Admin Alert',
      text: params.text,
      phone: params.phone,
      customer_name: params.customerName,
      type: params.type || 'general',
      status: 'queued',
      error: 'Admin Telegram Chat ID not yet connected. Click Start on @TBW_Admin_Alerts_Bot.',
      sent_at: new Date().toISOString(),
    };
    await recordTelegramAlertLog(log);
    return { success: false, error: 'Telegram Chat ID not connected' };
  }

  const cleanPhone = (params.phone || '').replace(/\D/g, '');
  const phoneFormatted = cleanPhone ? `+${cleanPhone}` : 'N/A';
  const name = (params.customerName || '').trim() || 'Visitor';

  let icon = '🔔';
  if (params.type === 'new_customer') icon = '🔔';
  else if (params.type === 'returning_customer') icon = '🔄';
  else if (params.type === 'appointment') icon = '📅';
  else if (params.type === 'lead') icon = '🎯';
  else if (params.type === 'human_support') icon = '🚨';

  const titleHeader = params.title || `${icon} The Business Work Alert`;

  const timeIST = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());

  // Escape HTML characters in body text
  const safeText = params.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const safeName = name
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `<b>${titleHeader}</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 <b>Customer:</b> ${safeName}\n📱 <b>Phone:</b> <code>${phoneFormatted}</code>\n⏰ <b>Time:</b> ${timeIST}\n\n💬 <b>Details:</b>\n${safeText}`;

  // Build inline keyboard action buttons
  const buttons: Array<Array<{ text: string; url: string }>> = [];

  const row1: Array<{ text: string; url: string }> = [];
  if (cleanPhone) {
    row1.push({ text: '📞 Call Customer', url: `tel:+${cleanPhone}` });
    row1.push({ text: '💬 WhatsApp Chat', url: `https://wa.me/${cleanPhone}` });
  }
  if (row1.length > 0) buttons.push(row1);

  buttons.push([
    {
      text: '🖥️ Open in Dashboard',
      url: 'https://dashboard.thebusinesswork.com/whatsapp',
    },
  ]);

  const sendRes = await sendTelegramRawMessage(config.chat_id, html, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: buttons },
    token: config.bot_token,
  });

  const log: TelegramAlertLog = {
    id: `tg_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: titleHeader,
    text: params.text,
    phone: params.phone,
    customer_name: params.customerName,
    type: params.type || 'general',
    status: sendRes.success ? 'sent' : 'failed',
    error: sendRes.error || null,
    sent_at: new Date().toISOString(),
  };

  await recordTelegramAlertLog(log);

  return sendRes;
}

/**
 * Checks getUpdates on Telegram to automatically capture chat_id if user clicked /start
 */
export async function syncChatIdFromUpdates(): Promise<{
  success: boolean;
  chatId?: string | number;
  user?: string;
  error?: string;
}> {
  const config = await getTelegramConfig();
  const token = config.bot_token || DEFAULT_TELEGRAM_BOT_TOKEN;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      method: 'GET',
    });
    const json = await res.json();

    if (!json.ok) {
      return { success: false, error: json.description || 'Failed to fetch updates' };
    }

    const updates = json.result || [];
    if (updates.length === 0) {
      return {
        success: false,
        error:
          'No messages found yet. Please open @TBW_Admin_Alerts_Bot on Telegram and tap Start (/start), then try again.',
      };
    }

    // Get the most recent user update
    for (let i = updates.length - 1; i >= 0; i--) {
      const msg = updates[i].message || updates[i].channel_post || updates[i].callback_query?.message;
      if (msg?.chat?.id) {
        const chatId = msg.chat.id;
        const name =
          msg.from?.first_name ||
          msg.chat.first_name ||
          msg.chat.title ||
          msg.from?.username ||
          'Admin';

        // Update config in DB
        await updateTelegramConfig({
          chat_id: chatId,
          admin_name: name,
          status: 'connected',
        });

        // Send confirmation message to Telegram
        await sendTelegramRawMessage(
          chatId,
          `🎉 <b>The Business Work Admin Alerts Connected!</b>\n\nHello ${name}! Aapka Telegram account successfully link ho gaya hai.\n\nAb aapko saare WhatsApp customer messages, new leads, bookings, aur human support requests yahan turant milenge!\n\n<b>Chat ID:</b> <code>${chatId}</code>\n<b>Bot:</b> @${config.bot_username}`,
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
            token,
          }
        );

        return { success: true, chatId, user: name };
      }
    }

    return {
      success: false,
      error: 'Could not find a valid chat_id in updates. Please message @TBW_Admin_Alerts_Bot and retry.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return { success: false, error: msg };
  }
}
