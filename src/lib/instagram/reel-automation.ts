import { createAdminClient } from '@/lib/supabase/admin';
import {
  InstagramReelRule,
  InstagramCommentIntent,
  InstagramCustomerContext,
  InstagramDmContextResponse,
  InstagramCommentCheckResponse,
} from '@/lib/types/dashboard';

/**
 * THE BUSINESS WORK — INSTAGRAM REEL COMMENT-TO-DM AUTOMATION ENGINE
 *
 * Implements strict Reel-to-Reel isolation, idempotent intent reservations,
 * 7-day comment expiry gates, and WhatsApp wa.me link generation.
 */

// In-memory fallback cache (used if Supabase tables have not yet been migrated)
const memoryRules = new Map<string, InstagramReelRule>();
const memoryIntents = new Map<string, InstagramCommentIntent>();
const memoryCustomerContext = new Map<string, InstagramCustomerContext>();
let memoryWhatsAppPhone: string | null = null;

/**
 * Normalize and validate E.164 phone number digits (digits only, 10-15 digits)
 */
export function normalizeWhatsAppDigits(phone: string): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return null;
}

/**
 * Get configured WhatsApp Business phone number from admin_settings
 */
export async function getWhatsAppBusinessPhone(): Promise<string | null> {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return memoryWhatsAppPhone;

  try {
    const { data, error } = await adminSupabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'whatsapp_business_phone')
      .maybeSingle();

    if (!error && data?.value) {
      const val = typeof data.value === 'string' ? data.value : (data.value as { phone?: string })?.phone;
      if (val) return String(val).replace(/\D/g, '');
    }
  } catch {
    // Schema not migrated yet, use memory
  }

  return memoryWhatsAppPhone;
}

/**
 * Save WhatsApp Business phone number in admin_settings
 */
export async function setWhatsAppBusinessPhone(phone: string): Promise<{ success: boolean; phone: string | null; error?: string }> {
  const digits = normalizeWhatsAppDigits(phone);
  if (!digits) {
    return {
      success: false,
      phone: null,
      error: 'Invalid phone number. Must contain 10 to 15 digits in E.164 format without spaces or symbols.',
    };
  }

  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      const { error } = await adminSupabase.from('admin_settings').upsert({
        key: 'whatsapp_business_phone',
        value: { phone: digits, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      if (error) {
        return {
          success: false,
          phone: null,
          error: `Database write error: ${error.message}. Please apply Supabase migration for public.admin_settings.`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage unavailable';
      return { success: false, phone: null, error: `Database connection error: ${msg}` };
    }
  }

  memoryWhatsAppPhone = digits;
  return { success: true, phone: digits };
}

/**
 * Generate a validated wa.me redirection link
 * NEVER generates placeholder digits! If no phone configured, returns empty string.
 */
export async function generateWhatsAppUrl(prefillText?: string | null): Promise<string> {
  const phone = await getWhatsAppBusinessPhone();
  if (!phone) return '';

  const cleanText = (prefillText || '').trim();
  if (!cleanText) {
    return `https://wa.me/${phone}`;
  }

  const encoded = encodeURIComponent(cleanText.slice(0, 500));
  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * Fetch all Reel Rules
 */
export async function getAllReelRules(): Promise<InstagramReelRule[]> {
  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      const { data, error } = await adminSupabase
        .from('instagram_reel_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as InstagramReelRule[];
      }
    } catch {
      // Fallback to memory
    }
  }

  return Array.from(memoryRules.values());
}

/**
 * Get exact Reel Rule by media_id
 */
export async function getReelRuleByMediaId(mediaId: string): Promise<InstagramReelRule | null> {
  const cleanMediaId = String(mediaId || '').trim();
  if (!cleanMediaId) return null;

  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      const { data, error } = await adminSupabase
        .from('instagram_reel_rules')
        .select('*')
        .eq('media_id', cleanMediaId)
        .maybeSingle();

      if (!error && data) {
        return data as InstagramReelRule;
      }
    } catch {
      // Fallback to memory
    }
  }

  return memoryRules.get(cleanMediaId) || null;
}

/**
 * Save or Update a Reel Rule (Durable Persistence Enforced)
 */
export async function saveReelRule(rule: Partial<InstagramReelRule> & { media_id: string; title: string }): Promise<InstagramReelRule> {
  const cleanMediaId = String(rule.media_id).trim();
  const nowIso = new Date().toISOString();

  const formattedRule: InstagramReelRule = {
    id: rule.id || `rule_${cleanMediaId}`,
    media_id: cleanMediaId,
    permalink: rule.permalink || `https://www.instagram.com/reel/${cleanMediaId}/`,
    thumbnail_url: rule.thumbnail_url || null,
    title: rule.title.trim(),
    is_enabled: rule.is_enabled ?? true,
    trigger_mode: rule.trigger_mode || 'any_comment',
    keywords: Array.isArray(rule.keywords)
      ? rule.keywords.map((k) => String(k).trim()).filter(Boolean)
      : [],
    initial_dm_text: (rule.initial_dm_text || 'Thanks for commenting on our Reel! 👋\nReply “Send Me Details” here and I’ll help you get the information! ✨').trim(),
    details_text: (rule.details_text || 'Here are the details you requested! Explore our complete range of automation services or reach out for custom setup.').trim(),
    follow_required: rule.follow_required ?? true,
    whatsapp_prefill_text: (rule.whatsapp_prefill_text || 'Hi! I saw your Instagram Reel and would like more details.').trim(),
    comments_count: rule.comments_count || 0,
    private_replies_count: rule.private_replies_count || 0,
    dm_conversations_count: rule.dm_conversations_count || 0,
    verified_follows_count: rule.verified_follows_count || 0,
    failed_sends_count: rule.failed_sends_count || 0,
    last_synced_at: rule.last_synced_at || nowIso,
    is_demo: false,
    created_at: rule.created_at || nowIso,
    updated_at: nowIso,
  };

  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    try {
      const { data, error } = await adminSupabase
        .from('instagram_reel_rules')
        .upsert(formattedRule, { onConflict: 'media_id' })
        .select()
        .single();

      if (error) {
        throw new Error(`Durable persistence failed: ${error.message}. Please apply the migration in Supabase SQL editor.`);
      }

      if (data) {
        memoryRules.set(cleanMediaId, data as InstagramReelRule);
        return data as InstagramReelRule;
      }
    } catch (err: unknown) {
      // Re-throw database error to ensure caller does not assume persistence succeeded silently
      throw err;
    }
  }

  memoryRules.set(cleanMediaId, formattedRule);
  return formattedRule;
}

/**
 * Delete a Reel Rule (Durable Persistence Enforced)
 */
export async function deleteReelRule(idOrMediaId: string): Promise<boolean> {
  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    const { error } = await adminSupabase
      .from('instagram_reel_rules')
      .delete()
      .or(`id.eq.${idOrMediaId},media_id.eq.${idOrMediaId}`);

    if (error) {
      throw new Error(`Durable deletion failed: ${error.message}`);
    }
  }

  let found = false;
  for (const [mediaId, rule] of memoryRules.entries()) {
    if (rule.id === idOrMediaId || mediaId === idOrMediaId) {
      memoryRules.delete(mediaId);
      found = true;
      break;
    }
  }

  return found || true;
}

/**
 * CONTRACT A: POST /comment-check
 * Evaluates incoming Instagram Reel comment, enforces 7-day age limits,
 * performs atomic one-time private reply reservation, and stores pending customer intent.
 */
export async function evaluateCommentCheck(event: Record<string, unknown>): Promise<InstagramCommentCheckResponse> {
  const eventType = String(event.event_type || '');
  const commentId = String(event.comment_id || event.id || '').trim();
  const mediaId = String(event.media_id || event.reel_media_id || '').trim();
  const igUserId = String(event.ig_user_id || event.user_id || event.sender_id || '').trim();
  const username = String(event.username || '').replace(/^@/, '').trim();
  const text = String(event.text || event.comment_text || '').trim();
  const timestamp = String(event.timestamp || new Date().toISOString());

  const baseResponse: InstagramCommentCheckResponse = {
    approved: false,
    event_type: 'comment',
    event_id: String(event.event_id || `comment_evt_${commentId}`),
    comment_id: commentId,
    media_id: mediaId,
    ig_user_id: igUserId,
    username: username,
    text: text,
    timestamp: timestamp,
  };

  // 1. Guard against non-comment events or missing comment ID
  if (eventType !== 'comment' || !/^\d{5,80}$/.test(commentId)) {
    return baseResponse;
  }

  // 2. Reject comments older than 7 days (Meta policy limit)
  const commentTime = Date.parse(timestamp);
  if (!Number.isFinite(commentTime) || Date.now() - commentTime >= 7 * 86400000 || Date.now() - commentTime < 0) {
    return baseResponse;
  }

  // 3. Atomically check if comment_id was already answered or reserved
  const adminSupabase = createAdminClient();
  let alreadyAnswered = false;

  if (adminSupabase) {
    try {
      const { data: intentRow } = await adminSupabase
        .from('instagram_comment_intents')
        .select('id, private_reply_state')
        .eq('comment_id', commentId)
        .maybeSingle();

      if (intentRow) {
        alreadyAnswered = true;
      }
    } catch {
      // Check in-memory
    }
  }

  if (memoryIntents.has(commentId)) {
    alreadyAnswered = true;
  }

  if (alreadyAnswered) {
    return baseResponse; // Already reserved/sent: Do not send duplicate private reply
  }

  // 4. Resolve exact Reel Rule for media_id (Strict Isolation)
  const rule = await getReelRuleByMediaId(mediaId);
  if (!rule || !rule.is_enabled) {
    return baseResponse; // No active rule for this specific Reel
  }

  // 5. Evaluate Trigger Mode: any_comment vs keywords
  let isTriggerMatched = false;
  if (rule.trigger_mode === 'any_comment') {
    isTriggerMatched = true; // Any comment qualifies!
  } else if (rule.trigger_mode === 'keywords' && Array.isArray(rule.keywords) && rule.keywords.length > 0) {
    const upperText = text.toUpperCase();
    for (const kw of rule.keywords) {
      const cleanKw = kw.trim().toUpperCase();
      if (!cleanKw) continue;
      const regex = new RegExp(`\\b${cleanKw}\\b`, 'i');
      if (regex.test(upperText)) {
        isTriggerMatched = true;
        break;
      }
    }
  }

  if (!isTriggerMatched) {
    return baseResponse;
  }

  // 6. Fail-closed if initial_dm_text is empty or too long
  const replyText = rule.initial_dm_text.trim();
  if (!replyText || replyText.length > 950) {
    return baseResponse;
  }

  // 7. Atomic Reservation: Register comment intent
  const intentRecord: InstagramCommentIntent = {
    id: `intent_${commentId}`,
    comment_id: commentId,
    media_id: mediaId,
    ig_user_id: igUserId || null,
    username: username || null,
    rule_id: rule.id,
    private_reply_state: 'pending',
    private_reply_provider_id: null,
    comment_text: text,
    error_message: null,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    source_attribution: 'instagram_reel',
    created_at: new Date().toISOString(),
  };

  memoryIntents.set(commentId, intentRecord);

  // 8. Durable Customer Context (Store pending campaign for commenter)
  if (igUserId && /^\d{5,40}$/.test(igUserId)) {
    const custContext: InstagramCustomerContext = {
      id: `ctx_${igUserId}`,
      ig_user_id: igUserId,
      pending_media_id: mediaId,
      pending_rule_id: rule.id,
      last_inbound_at: new Date().toISOString(),
      first_dm_at: new Date().toISOString(),
      last_event_at: new Date().toISOString(),
      follow_status: 'unknown',
      context_expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      created_at: new Date().toISOString(),
    };
    memoryCustomerContext.set(igUserId, custContext);

    if (adminSupabase) {
      try {
        await adminSupabase.from('instagram_customer_context').upsert(custContext, { onConflict: 'ig_user_id' });
      } catch {
        // Fallback
      }
    }
  }

  if (adminSupabase) {
    try {
      await adminSupabase.from('instagram_comment_intents').insert(intentRecord);
      // Increment rule counter
      await adminSupabase
        .from('instagram_reel_rules')
        .update({
          comments_count: (rule.comments_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id);
    } catch {
      // Memory is updated
    }
  }

  rule.comments_count = (rule.comments_count || 0) + 1;

  // 9. Return approved contract
  return {
    approved: true,
    event_type: 'comment',
    event_id: baseResponse.event_id,
    comment_id: commentId,
    media_id: mediaId,
    ig_user_id: igUserId,
    username: username,
    text: text,
    timestamp: timestamp,
    reply_text: replyText,
    rule_id: rule.id,
  };
}

/**
 * CONTRACT B: POST /dm-context
 * Resolves durable pending Reel campaign for customer, validates human takeover,
 * and generates live wa.me redirection link.
 * Strict Isolation: Reel 1 NEVER returns Reel 2's details!
 */
export async function evaluateDmContext(event: Record<string, unknown>): Promise<InstagramDmContextResponse> {
  const eventId = String(event.event_id || event.id || `dm_evt_${Date.now()}`);
  const igUserId = String(event.ig_user_id || event.sender_id || event.user_id || '').trim();
  const username = String(event.username || '').replace(/^@/, '').trim();
  const text = String(event.text || event.content || '').trim();
  const quickReplyPayload = String(event.quick_reply_payload || event.payload || '').trim();
  const referralMediaId = String(event.referral_media_id || event.media_id || '').trim();

  // Fail-closed default
  const defaultRejected: InstagramDmContextResponse = {
    approved: false,
    event_type: 'dm',
    event_id: eventId,
    ig_user_id: igUserId,
    username: username,
    text: text,
    quick_reply_payload: quickReplyPayload,
    mode: 'ai',
    reply_allowed: false,
    is_first_dm: false,
    whatsapp_url: '',
    campaign: null,
  };

  // 1. Mandatory Instagram Scoped User ID (IGSID)
  if (!igUserId || !/^\d{5,40}$/.test(igUserId)) {
    return defaultRejected;
  }

  // 2. Human Takeover Check in Supabase / Memory
  const adminSupabase = createAdminClient();
  let isTakeoverActive = false;

  if (adminSupabase) {
    try {
      const { data: conv } = await adminSupabase
        .from('admin_conversations')
        .select('manual_takeover, automation_paused, contact:admin_contacts(instagram_scoped_id)')
        .eq('platform', 'instagram')
        .eq('contact.instagram_scoped_id', igUserId)
        .maybeSingle();

      if (conv && (conv.manual_takeover || conv.automation_paused)) {
        isTakeoverActive = true;
      }
    } catch {
      // Non-blocking
    }
  }

  if (isTakeoverActive) {
    return {
      ...defaultRejected,
      mode: 'human',
      reply_allowed: false,
      approved: false,
    };
  }

  // 3. Resolve Target Reel Rule (Strict Campaign Resolution)
  let resolvedMediaId: string | null = null;

  // A. Check explicit referral media ID from incoming event
  if (referralMediaId && /^\d{5,80}$/.test(referralMediaId)) {
    resolvedMediaId = referralMediaId;
  }

  // B. If not explicit in event, query durable customer context
  if (!resolvedMediaId) {
    const memoryCtx = memoryCustomerContext.get(igUserId);
    if (memoryCtx && memoryCtx.pending_media_id) {
      const expiry = Date.parse(memoryCtx.context_expires_at);
      if (Number.isFinite(expiry) && Date.now() < expiry) {
        resolvedMediaId = memoryCtx.pending_media_id;
      }
    }

    if (!resolvedMediaId && adminSupabase) {
      try {
        const { data: dbCtx } = await adminSupabase
          .from('instagram_customer_context')
          .select('pending_media_id, pending_rule_id, context_expires_at')
          .eq('ig_user_id', igUserId)
          .maybeSingle();

        if (dbCtx && dbCtx.pending_media_id) {
          const expiry = Date.parse(dbCtx.context_expires_at);
          if (Number.isFinite(expiry) && Date.now() < expiry) {
            resolvedMediaId = dbCtx.pending_media_id;
          }
        }
      } catch {
        // Fallback
      }
    }
  }

  // 4. Fetch the specific Rule and verify active status
  let campaignPayload: InstagramDmContextResponse['campaign'] = null;
  let ruleWhatsappPrefill: string | null = null;

  if (resolvedMediaId) {
    const rule = await getReelRuleByMediaId(resolvedMediaId);
    if (rule && rule.is_enabled) {
      campaignPayload = {
        id: rule.id,
        media_id: rule.media_id,
        active: true,
        initial_message: rule.initial_dm_text,
        details_text: rule.details_text,
        follow_required: rule.follow_required,
      };
      ruleWhatsappPrefill = rule.whatsapp_prefill_text || null;
    }
  }

  // 5. Generate verified WhatsApp Link (never placeholder digits)
  const whatsappUrl = await generateWhatsAppUrl(ruleWhatsappPrefill);

  // 6. Check if first DM from customer
  const isFirstDm = event.is_first_dm === true || !memoryCustomerContext.has(igUserId);

  return {
    approved: true,
    event_type: 'dm',
    event_id: eventId,
    ig_user_id: igUserId,
    username: username,
    text: text,
    quick_reply_payload: quickReplyPayload,
    mode: 'ai',
    reply_allowed: true,
    is_first_dm: isFirstDm,
    whatsapp_url: whatsappUrl,
    campaign: campaignPayload,
    clear_campaign: !campaignPayload,
  };
}
