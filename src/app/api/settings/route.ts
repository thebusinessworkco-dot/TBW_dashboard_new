import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit';


const DEFAULT_GENERAL = {
  company_name: 'The Business Work',
  tagline: 'We Make Business Simpler.',
  support_email: 'thebusinesswork.co@gmail.com',
  support_phone: '+91 79720 20292',
  website_url: 'https://www.thebusinesswork.com',
  timezone: 'Asia/Kolkata (UTC+05:30)',
  business_hours: 'Monday – Saturday: 09:30 AM – 07:30 PM IST',
  address: 'Boisar, Maharashtra, India – 401501',
};

const DEFAULT_BRAND = {
  brand_name: 'The Business Work',
  tagline: 'We Make Business Simpler.',
  primary_color: '#202B35',
  accent_sage: '#7D8F82',
  neutral_ivory: '#F4F2EC',
  stone_border: '#DDD9D0',
  card_white: '#FCFBF8',
  logo_url: '/logo.png',
  favicon_url: '/favicon.ico',
};

const DEFAULT_NOTIFICATIONS = {
  suppressed_testing_numbers: ['917821840347', '918604600292', '917972020292'],
  enable_telegram_alerts: true,
  enable_whatsapp_admin_alerts: true,
  alert_on_new_lead: true,
  alert_on_appointment: true,
  alert_on_human_takeover: true,
  alert_on_workflow_failure: true,
  alert_on_vps_high_load: true,
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        general: DEFAULT_GENERAL,
        brand: DEFAULT_BRAND,
        notifications: DEFAULT_NOTIFICATIONS,
        whatsapp_phone: '917972020292',
      });
    }

    const { data: rows } = await supabase.from('admin_settings').select('key, value');
    const settingsMap: Record<string, unknown> = {};
    if (rows) {
      for (const r of rows) {
        settingsMap[r.key] = r.value;
      }
    }

    const general = (settingsMap['general_settings'] as typeof DEFAULT_GENERAL) || DEFAULT_GENERAL;
    const brand = (settingsMap['brand_settings'] as typeof DEFAULT_BRAND) || DEFAULT_BRAND;
    const notifications = (settingsMap['notification_settings'] as typeof DEFAULT_NOTIFICATIONS) || DEFAULT_NOTIFICATIONS;
    
    // WhatsApp phone
    const waValue = settingsMap['whatsapp_business_phone'] as { phone?: string } | undefined;
    const whatsappPhone = waValue?.phone || '917972020292';

    // Telegram config (with secret token redacted)
    const tgValue = settingsMap['telegram_alert_config'] as Record<string, unknown> | undefined;
    const telegram = tgValue
      ? {
          status: tgValue.status || 'connected',
          chat_id: tgValue.chat_id || '9025733921',
          bot_username: tgValue.bot_username || 'TBW_Admin_Alerts_Bot',
          bot_token_configured: Boolean(tgValue.bot_token),
        }
      : {
          status: 'connected',
          chat_id: '9025733921',
          bot_username: 'TBW_Admin_Alerts_Bot',
          bot_token_configured: true,
        };

    // Instagram config (with access token redacted)
    const igValue = settingsMap['instagram_meta_config'] as Record<string, unknown> | undefined;
    const instagram = igValue
      ? {
          name: igValue.name || 'The Business Work',
          username: igValue.username || 'thebusinesswork.co',
          account_id: igValue.account_id || '17841434357046300',
          account_type: igValue.account_type || 'BUSINESS',
          token_configured: Boolean(igValue.access_token),
        }
      : {
          name: 'The Business Work',
          username: 'thebusinesswork.co',
          account_id: '17841434357046300',
          account_type: 'BUSINESS',
          token_configured: true,
        };

    // Integration status overview
    const { data: integrationStatuses } = await supabase.from('admin_integration_status').select('*');

    return NextResponse.json({
      success: true,
      general,
      brand,
      notifications,
      whatsapp_phone: whatsappPhone,
      telegram,
      instagram,
      integrations: integrationStatuses || [],
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error reading settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database client not available' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json(
        { success: false, error: 'section and data are required' },
        { status: 400 }
      );
    }

    let key = '';
    if (section === 'general') key = 'general_settings';
    else if (section === 'brand') key = 'brand_settings';
    else if (section === 'notifications') key = 'notification_settings';
    else if (section === 'whatsapp') {
      key = 'whatsapp_business_phone';
      // validate format
      const digitsOnly = String(data.phone || '').replace(/\D/g, '');
      const { error: upsertErr } = await supabase.from('admin_settings').upsert({
        key,
        value: { phone: digitsOnly, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      });
      if (upsertErr) throw upsertErr;

      await recordAuditLog({
        action: 'SETTINGS_UPDATE',
        targetEntity: 'WHATSAPP_PHONE',
        targetId: digitsOnly,
        metadata: { updated_phone: digitsOnly },
      });

      return NextResponse.json({ success: true, message: 'WhatsApp Business Number updated successfully' });
    } else {
      key = `${section}_settings`;
    }

    const { error } = await supabase.from('admin_settings').upsert({
      key,
      value: { ...data, updated_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    await recordAuditLog({
      action: 'SETTINGS_UPDATE',
      targetEntity: key.toUpperCase(),
      metadata: { section, keys_modified: Object.keys(data) },
    });

    return NextResponse.json({ success: true, message: `${section} settings saved successfully` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error saving settings' },
      { status: 500 }
    );
  }
}
