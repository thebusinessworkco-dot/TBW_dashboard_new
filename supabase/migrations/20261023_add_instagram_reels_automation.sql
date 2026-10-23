-- ==============================================================================
-- THE BUSINESS WORK — INSTAGRAM REEL COMMENT-TO-DM AUTOMATION SCHEMA (V4 PRO)
-- Durable Tables, Strict Reel Isolation, Idempotent Intents, and RLS Protection
-- ==============================================================================

-- 1. INSTAGRAM REEL RULES TABLE
CREATE TABLE IF NOT EXISTS public.instagram_reel_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id TEXT UNIQUE NOT NULL,
    permalink TEXT,
    thumbnail_url TEXT,
    title TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    trigger_mode TEXT DEFAULT 'any_comment' CHECK (trigger_mode IN ('any_comment', 'keywords')),
    keywords TEXT[] DEFAULT '{}',
    initial_dm_text TEXT NOT NULL DEFAULT 'Thanks for commenting on our Reel! 👋\nReply “Send Me Details” here and I’ll help you get the information! ✨',
    details_text TEXT NOT NULL DEFAULT 'Here are the details you requested! Explore our complete range of automation services or reach out for custom setup.',
    follow_required BOOLEAN DEFAULT TRUE,
    whatsapp_prefill_text TEXT DEFAULT 'Hi! I saw your Instagram Reel and would like more details.',
    comments_count INT DEFAULT 0,
    private_replies_count INT DEFAULT 0,
    dm_conversations_count INT DEFAULT 0,
    verified_follows_count INT DEFAULT 0,
    failed_sends_count INT DEFAULT 0,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSTAGRAM COMMENT INTENTS TABLE (Idempotent Private Reply Reservation)
CREATE TABLE IF NOT EXISTS public.instagram_comment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id TEXT UNIQUE NOT NULL,
    media_id TEXT NOT NULL,
    ig_user_id TEXT,
    username TEXT,
    rule_id UUID REFERENCES public.instagram_reel_rules(id) ON DELETE SET NULL,
    private_reply_state TEXT DEFAULT 'pending' CHECK (private_reply_state IN ('pending', 'sent', 'failed', 'consumed')),
    private_reply_provider_id TEXT,
    comment_text TEXT,
    error_message TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    source_attribution TEXT DEFAULT 'instagram_reel',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INSTAGRAM CUSTOMER CONTEXT TABLE (Scoped User Campaign Context)
CREATE TABLE IF NOT EXISTS public.instagram_customer_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ig_user_id TEXT UNIQUE NOT NULL,
    pending_media_id TEXT,
    pending_rule_id UUID REFERENCES public.instagram_reel_rules(id) ON DELETE SET NULL,
    last_inbound_at TIMESTAMPTZ DEFAULT NOW(),
    first_dm_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_at TIMESTAMPTZ DEFAULT NOW(),
    follow_status TEXT DEFAULT 'unknown' CHECK (follow_status IN ('follows', 'not_following', 'unknown')),
    context_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INSTAGRAM AUTOMATION EVENTS TABLE (Auditable Telemetry & Analytics)
CREATE TABLE IF NOT EXISTS public.instagram_automation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    media_id TEXT,
    rule_id UUID REFERENCES public.instagram_reel_rules(id) ON DELETE SET NULL,
    ig_user_id TEXT,
    username TEXT,
    comment_id TEXT,
    follow_status TEXT,
    provider_success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ADMIN SETTINGS TABLE (Persistent Key-Value Store for WhatsApp number, etc.)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR MAXIMUM QUERY EFFICIENCY & CONCURRENCY
CREATE INDEX IF NOT EXISTS idx_ig_reel_rules_media ON public.instagram_reel_rules(media_id);
CREATE INDEX IF NOT EXISTS idx_ig_reel_rules_enabled ON public.instagram_reel_rules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_ig_comment_intents_comment ON public.instagram_comment_intents(comment_id);
CREATE INDEX IF NOT EXISTS idx_ig_comment_intents_media ON public.instagram_comment_intents(media_id);
CREATE INDEX IF NOT EXISTS idx_ig_customer_context_user ON public.instagram_customer_context(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_customer_context_expires ON public.instagram_customer_context(context_expires_at);
CREATE INDEX IF NOT EXISTS idx_ig_auto_events_media ON public.instagram_automation_events(media_id);
CREATE INDEX IF NOT EXISTS idx_ig_auto_events_created ON public.instagram_automation_events(created_at DESC);

-- UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trg_ig_reel_rules_updated_at ON public.instagram_reel_rules;
CREATE TRIGGER trg_ig_reel_rules_updated_at
BEFORE UPDATE ON public.instagram_reel_rules
FOR EACH ROW EXECUTE FUNCTION public.handle_admin_updated_at();

DROP TRIGGER IF EXISTS trg_ig_comment_intents_updated_at ON public.instagram_comment_intents;
CREATE TRIGGER trg_ig_comment_intents_updated_at
BEFORE UPDATE ON public.instagram_comment_intents
FOR EACH ROW EXECUTE FUNCTION public.handle_admin_updated_at();

DROP TRIGGER IF EXISTS trg_ig_customer_context_updated_at ON public.instagram_customer_context;
CREATE TRIGGER trg_ig_customer_context_updated_at
BEFORE UPDATE ON public.instagram_customer_context
FOR EACH ROW EXECUTE FUNCTION public.handle_admin_updated_at();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.instagram_reel_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_customer_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_automation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ig_reel_rules_policy ON public.instagram_reel_rules;
CREATE POLICY ig_reel_rules_policy ON public.instagram_reel_rules
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS ig_comment_intents_policy ON public.instagram_comment_intents;
CREATE POLICY ig_comment_intents_policy ON public.instagram_comment_intents
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS ig_customer_context_policy ON public.instagram_customer_context;
CREATE POLICY ig_customer_context_policy ON public.instagram_customer_context
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS ig_automation_events_policy ON public.instagram_automation_events;
CREATE POLICY ig_automation_events_policy ON public.instagram_automation_events
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

DROP POLICY IF EXISTS admin_settings_policy ON public.admin_settings;
CREATE POLICY admin_settings_policy ON public.admin_settings
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());
