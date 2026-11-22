-- ==============================================================================
-- THE BUSINESS WORK — PRODUCTION MASTER MIGRATION SUITE
-- Target: Supabase Project mkeostxsprhhknmznpke (PostgreSQL 15.8)
-- Includes All 7 Pending Migrations (Sequentially Verified on PostgreSQL 18/15):
--   1. 20261023_add_instagram_synced_reels_cache.sql
--   2. 20261025_whatsapp_v6_session_management.sql
--   3. 20261026_01_wa_session_enhancements_and_rls.sql
--   4. 20261026_02_webhook_and_outgoing_idempotency.sql
--   5. 20261026_03_instagram_dm_sessions.sql
--   6. 20261026_04_appointment_reminder_deduplication.sql
--   7. 20261026_05_atomic_session_concurrency_functions.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- MIGRATION 1: INSTAGRAM SYNCED REELS CACHE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_synced_reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id TEXT UNIQUE NOT NULL,
    caption TEXT,
    permalink TEXT NOT NULL,
    thumbnail_url TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'VIDEO',
    timestamp TIMESTAMPTZ NOT NULL,
    like_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    has_active_rule BOOLEAN DEFAULT FALSE,
    active_rule_id UUID REFERENCES public.instagram_reel_rules(id) ON DELETE SET NULL,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_synced_reels_timestamp ON public.instagram_synced_reels(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ig_synced_reels_active_rule ON public.instagram_synced_reels(has_active_rule);

ALTER TABLE public.instagram_synced_reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ig_synced_reels_policy ON public.instagram_synced_reels;
CREATE POLICY ig_synced_reels_policy ON public.instagram_synced_reels
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

GRANT ALL ON public.instagram_synced_reels TO service_role, authenticated;

-- ------------------------------------------------------------------------------
-- MIGRATION 2: WHATSAPP V6 BASELINE SESSION MANAGEMENT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_phone TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    business_name TEXT,
    selected_purpose TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_sessions_count INT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone ON public.wa_contacts (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_deleted ON public.wa_contacts (deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.wa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL UNIQUE,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'AWAITING_LANGUAGE', 'AWAITING_REPLY', 'HUMAN_TAKEOVER', 'EXPIRED', 'CLOSED')),
    customer_classification TEXT NOT NULL DEFAULT 'NEW_CUSTOMER' CHECK (customer_classification IN ('NEW_CUSTOMER', 'RETURNING_CUSTOMER')),
    selected_language TEXT DEFAULT NULL CHECK (selected_language IN ('English', 'Hindi', 'Hinglish', 'Marathi', 'pending') OR selected_language IS NULL),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_customer_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_customer_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_bot_message_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '20 minutes'),
    follow_up_due_at TIMESTAMPTZ DEFAULT NULL,
    follow_up_sent_at TIMESTAMPTZ DEFAULT NULL,
    follow_up_status TEXT DEFAULT NULL CHECK (follow_up_status IN ('pending', 'sent', 'cancelled', 'skipped') OR follow_up_status IS NULL),
    awaiting_customer BOOLEAN NOT NULL DEFAULT false,
    human_takeover_active BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMPTZ DEFAULT NULL,
    close_reason TEXT DEFAULT NULL,
    session_data JSONB DEFAULT '{}'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_sessions_contact ON public.wa_sessions (contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_status ON public.wa_sessions (status);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_session_id ON public.wa_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_inactivity ON public.wa_sessions (status, expires_at) WHERE status NOT IN ('EXPIRED', 'CLOSED');
CREATE INDEX IF NOT EXISTS idx_wa_sessions_follow_up ON public.wa_sessions (status, awaiting_customer, follow_up_due_at) WHERE follow_up_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS public.wa_admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    customer_classification TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    recipient_phone TEXT NOT NULL DEFAULT '918604600292',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    message_body TEXT NOT NULL,
    notification_category TEXT DEFAULT 'whatsapp_bot',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_admin_notif_status ON public.wa_admin_notifications (status);
CREATE INDEX IF NOT EXISTS idx_wa_admin_notif_session ON public.wa_admin_notifications (session_id);

CREATE TABLE IF NOT EXISTS public.wa_session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_session_events_session ON public.wa_session_events (session_id);
CREATE INDEX IF NOT EXISTS idx_wa_session_events_created ON public.wa_session_events (created_at DESC);

-- ------------------------------------------------------------------------------
-- MIGRATION 3: WHATSAPP ENHANCEMENTS, CONSTRAINTS & RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.wa_contacts 
    ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

ALTER TABLE public.wa_sessions 
    ADD COLUMN IF NOT EXISTS customer_phone TEXT;

DO $$
BEGIN
    UPDATE public.wa_sessions s
    SET customer_phone = c.normalized_phone
    FROM public.wa_contacts c
    WHERE s.contact_id = c.id AND s.customer_phone IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_wa_sessions_active_poll 
    ON public.wa_sessions (status, awaiting_customer, follow_up_due_at) 
    WHERE status IN ('ACTIVE', 'AWAITING_REPLY', 'AWAITING_LANGUAGE');

CREATE INDEX IF NOT EXISTS idx_wa_sessions_expiry_poll 
    ON public.wa_sessions (status, expires_at) 
    WHERE status NOT IN ('EXPIRED', 'CLOSED');

CREATE INDEX IF NOT EXISTS idx_wa_sessions_phone_status 
    ON public.wa_sessions (customer_phone, status);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'wa_admin_notifications' AND constraint_name = 'uq_wa_admin_notifications_session_type'
    ) THEN
        ALTER TABLE public.wa_admin_notifications
            ADD CONSTRAINT uq_wa_admin_notifications_session_type UNIQUE (session_id, notification_type);
    END IF;
END $$;

ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_session_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_contacts_admin_policy ON public.wa_contacts;
DROP POLICY IF EXISTS wa_sessions_admin_policy ON public.wa_sessions;
DROP POLICY IF EXISTS wa_admin_notifications_admin_policy ON public.wa_admin_notifications;
DROP POLICY IF EXISTS wa_session_events_admin_policy ON public.wa_session_events;

CREATE POLICY wa_contacts_admin_policy ON public.wa_contacts
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY wa_sessions_admin_policy ON public.wa_sessions
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY wa_admin_notifications_admin_policy ON public.wa_admin_notifications
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY wa_session_events_admin_policy ON public.wa_session_events
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

GRANT ALL ON public.wa_contacts TO service_role, authenticated;
GRANT ALL ON public.wa_sessions TO service_role, authenticated;
GRANT ALL ON public.wa_admin_notifications TO service_role, authenticated;
GRANT ALL ON public.wa_session_events TO service_role, authenticated;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_wa_contacts_updated_at ON public.wa_contacts;
CREATE TRIGGER trg_wa_contacts_updated_at
BEFORE UPDATE ON public.wa_contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

DROP TRIGGER IF EXISTS trg_wa_sessions_updated_at ON public.wa_sessions;
CREATE TRIGGER trg_wa_sessions_updated_at
BEFORE UPDATE ON public.wa_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- ------------------------------------------------------------------------------
-- MIGRATION 4: WEBHOOK & OUTGOING MESSAGE IDEMPOTENCY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_idempotency_log (
    event_id TEXT PRIMARY KEY,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
    event_type TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'ignored')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_idemp_channel_received 
    ON public.webhook_idempotency_log (channel, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_idemp_sender 
    ON public.webhook_idempotency_log (sender_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_idemp_retention 
    ON public.webhook_idempotency_log (received_at);

CREATE TABLE IF NOT EXISTS public.outgoing_message_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
    recipient_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_idemp_channel_sent 
    ON public.outgoing_message_idempotency (channel, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbox_idemp_recipient 
    ON public.outgoing_message_idempotency (recipient_id, sent_at DESC);

ALTER TABLE public.webhook_idempotency_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_message_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_idempotency_log_admin_policy ON public.webhook_idempotency_log;
DROP POLICY IF EXISTS outgoing_message_idempotency_admin_policy ON public.outgoing_message_idempotency;

CREATE POLICY webhook_idempotency_log_admin_policy ON public.webhook_idempotency_log
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY outgoing_message_idempotency_admin_policy ON public.outgoing_message_idempotency
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

GRANT ALL ON public.webhook_idempotency_log TO service_role, authenticated;
GRANT ALL ON public.outgoing_message_idempotency TO service_role, authenticated;

-- ------------------------------------------------------------------------------
-- MIGRATION 5: INSTAGRAM DM INDEPENDENT SESSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ig_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    ig_user_id TEXT NOT NULL,
    username TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'AWAITING_REPLY', 'HUMAN_TAKEOVER', 'EXPIRED', 'CLOSED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_inbound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_outbound_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    inactivity_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '20 minutes'),
    follow_up_due_at TIMESTAMPTZ DEFAULT NULL,
    follow_up_sent_at TIMESTAMPTZ DEFAULT NULL,
    awaiting_customer BOOLEAN NOT NULL DEFAULT false,
    human_takeover_active BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMPTZ DEFAULT NULL,
    close_reason TEXT DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_sessions_user_status 
    ON public.ig_sessions (ig_user_id, status);

CREATE INDEX IF NOT EXISTS idx_ig_sessions_session_id 
    ON public.ig_sessions (session_id);

CREATE INDEX IF NOT EXISTS idx_ig_sessions_inactivity 
    ON public.ig_sessions (status, inactivity_expires_at) 
    WHERE status NOT IN ('EXPIRED', 'CLOSED');

CREATE TABLE IF NOT EXISTS public.ig_session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    ig_user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_session_events_session 
    ON public.ig_session_events (session_id);

CREATE INDEX IF NOT EXISTS idx_ig_session_events_user 
    ON public.ig_session_events (ig_user_id, created_at DESC);

ALTER TABLE public.ig_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_session_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ig_sessions_admin_policy ON public.ig_sessions;
DROP POLICY IF EXISTS ig_session_events_admin_policy ON public.ig_session_events;

CREATE POLICY ig_sessions_admin_policy ON public.ig_sessions
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY ig_session_events_admin_policy ON public.ig_session_events
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

GRANT ALL ON public.ig_sessions TO service_role, authenticated;
GRANT ALL ON public.ig_session_events TO service_role, authenticated;

DROP TRIGGER IF EXISTS trg_ig_sessions_updated_at ON public.ig_sessions;
CREATE TRIGGER trg_ig_sessions_updated_at
BEFORE UPDATE ON public.ig_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- ------------------------------------------------------------------------------
-- MIGRATION 6: APPOINTMENT REMINDER DEDUPLICATION LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_event_id TEXT NOT NULL,
    appointment_id UUID REFERENCES public.admin_appointments(id) ON DELETE SET NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT DEFAULT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30M_BEFORE', '24H_BEFORE', 'DAY_OF')),
    scheduled_start TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    provider_message_id TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_appointment_reminder UNIQUE (calendar_event_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_appt_reminders_event_type 
    ON public.appointment_reminder_logs (calendar_event_id, reminder_type);

CREATE INDEX IF NOT EXISTS idx_appt_reminders_phone 
    ON public.appointment_reminder_logs (customer_phone, dispatched_at DESC);

CREATE INDEX IF NOT EXISTS idx_appt_reminders_status 
    ON public.appointment_reminder_logs (status);

ALTER TABLE public.appointment_reminder_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_reminder_logs_admin_policy ON public.appointment_reminder_logs;
CREATE POLICY appointment_reminder_logs_admin_policy ON public.appointment_reminder_logs
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

GRANT ALL ON public.appointment_reminder_logs TO service_role, authenticated;

-- ------------------------------------------------------------------------------
-- MIGRATION 7: ATOMIC CONCURRENCY & SESSION PROCEDURES
-- ------------------------------------------------------------------------------

-- WhatsApp 3-Minute Follow-up Claimer (SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_wa_follow_up_atomic(
    p_worker_id TEXT DEFAULT 'default_worker',
    p_batch_size INT DEFAULT 10
)
RETURNS TABLE (
    session_id TEXT,
    customer_phone TEXT,
    selected_language TEXT,
    customer_name TEXT,
    version INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT s.id, s.session_id, s.customer_phone, s.selected_language, c.customer_name, s.version
        FROM public.wa_sessions s
        LEFT JOIN public.wa_contacts c ON s.contact_id = c.id
        WHERE s.status IN ('ACTIVE', 'AWAITING_REPLY', 'AWAITING_LANGUAGE')
          AND s.awaiting_customer = true
          AND s.follow_up_sent_at IS NULL
          AND s.follow_up_due_at IS NOT NULL
          AND s.follow_up_due_at <= now()
          AND s.expires_at > now()
          AND s.human_takeover_active = false
        ORDER BY s.follow_up_due_at ASC
        LIMIT p_batch_size
        FOR UPDATE OF s SKIP LOCKED
    ),
    updated AS (
        UPDATE public.wa_sessions s
        SET follow_up_sent_at = now(),
            follow_up_status = 'sent',
            awaiting_customer = false,
            version = s.version + 1,
            updated_at = now()
        FROM claimed
        WHERE s.id = claimed.id
        RETURNING s.session_id, s.customer_phone, s.selected_language, s.version
    )
    SELECT u.session_id, u.customer_phone, u.selected_language, claimed.customer_name, u.version
    FROM updated u
    JOIN claimed ON u.session_id = claimed.session_id;
END;
$$;

-- WhatsApp 20-Minute Expiry
CREATE OR REPLACE FUNCTION public.expire_wa_sessions_atomic()
RETURNS TABLE (
    expired_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    WITH expired AS (
        SELECT s.id
        FROM public.wa_sessions s
        WHERE s.status NOT IN ('EXPIRED', 'CLOSED')
          AND s.expires_at <= now()
        FOR UPDATE SKIP LOCKED
    ),
    updated AS (
        UPDATE public.wa_sessions s
        SET status = 'EXPIRED',
            closed_at = now(),
            close_reason = 'closed_inactivity',
            awaiting_customer = false,
            follow_up_status = CASE WHEN s.follow_up_sent_at IS NULL THEN 'skipped' ELSE s.follow_up_status END,
            version = s.version + 1,
            updated_at = now()
        FROM expired
        WHERE s.id = expired.id
        RETURNING s.id
    )
    SELECT count(*)::INT INTO v_count FROM updated;

    RETURN QUERY SELECT v_count;
END;
$$;

-- Inbound Customer Message Processor (Language Persistence + Inactivity Reset)
CREATE OR REPLACE FUNCTION public.register_inbound_customer_message(
    p_phone TEXT,
    p_customer_name TEXT DEFAULT NULL,
    p_message_text TEXT DEFAULT NULL,
    p_wamid TEXT DEFAULT NULL
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    is_new_session BOOLEAN,
    session_id TEXT,
    customer_phone TEXT,
    customer_classification TEXT,
    selected_language TEXT,
    requires_language_selection BOOLEAN,
    human_takeover_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_norm_phone TEXT;
    v_contact_id UUID;
    v_contact_name TEXT;
    v_pref_lang TEXT;
    v_total_sessions INT;
    v_is_deleted BOOLEAN;
    v_session RECORD;
    v_new_session_id TEXT;
    v_classification TEXT;
    v_req_lang BOOLEAN := false;
BEGIN
    v_norm_phone := regexp_replace(p_phone, '\D', '', 'g');
    IF length(v_norm_phone) = 10 THEN
        v_norm_phone := '91' || v_norm_phone;
    ELSIF length(v_norm_phone) = 11 AND left(v_norm_phone, 1) = '0' THEN
        v_norm_phone := '91' || substring(v_norm_phone from 2);
    END IF;

    -- 2. Webhook Deduplication Check
    IF p_wamid IS NOT NULL AND length(trim(p_wamid)) > 0 THEN
        INSERT INTO public.webhook_idempotency_log (
            event_id, channel, event_type, sender_id, status, received_at
        ) VALUES (
            p_wamid, 'whatsapp', 'message', v_norm_phone, 'received', now()
        )
        ON CONFLICT (event_id) DO NOTHING;

        IF NOT FOUND THEN
            RETURN QUERY SELECT true, false, NULL::TEXT, v_norm_phone, NULL::TEXT, NULL::TEXT, false, false;
            RETURN;
        END IF;
    END IF;

    -- 3. Contact Identification & Identity Preservation
    SELECT id, customer_name, preferred_language, total_sessions_count, (deleted_at IS NOT NULL)
    INTO v_contact_id, v_contact_name, v_pref_lang, v_total_sessions, v_is_deleted
    FROM public.wa_contacts
    WHERE normalized_phone = v_norm_phone
    FOR UPDATE;

    IF v_contact_id IS NULL THEN
        v_classification := 'NEW_CUSTOMER';
        INSERT INTO public.wa_contacts (
            normalized_phone, customer_name, preferred_language, first_seen_at, last_seen_at, total_sessions_count
        ) VALUES (
            v_norm_phone, p_customer_name, NULL, now(), now(), 1
        )
        RETURNING id, customer_name, preferred_language, total_sessions_count
        INTO v_contact_id, v_contact_name, v_pref_lang, v_total_sessions;
    ELSE
        v_classification := 'RETURNING_CUSTOMER';
        UPDATE public.wa_contacts
        SET last_seen_at = now(),
            customer_name = COALESCE(p_customer_name, customer_name),
            updated_at = now()
        WHERE id = v_contact_id;
    END IF;

    -- 4. Check for Active Session
    SELECT s.* INTO v_session
    FROM public.wa_sessions s
    WHERE s.customer_phone = v_norm_phone
      AND s.status NOT IN ('EXPIRED', 'CLOSED')
      AND s.expires_at > now()
    ORDER BY s.started_at DESC
    LIMIT 1
    FOR UPDATE;

    -- Active Session Found -> Extend 20-minute inactivity timer
    IF v_session.id IS NOT NULL THEN
        UPDATE public.wa_sessions s
        SET last_customer_message_at = now(),
            last_customer_activity_at = now(),
            expires_at = now() + INTERVAL '20 minutes',
            awaiting_customer = false,
            follow_up_due_at = NULL,
            follow_up_status = 'cancelled',
            version = s.version + 1,
            updated_at = now()
        WHERE s.id = v_session.id;

        INSERT INTO public.wa_session_events (session_id, event_type, metadata)
        VALUES (v_session.session_id, 'customer_replied', jsonb_build_object(
            'phone', v_norm_phone,
            'message', p_message_text
        ));

        RETURN QUERY SELECT
            false,
            false,
            v_session.session_id,
            v_norm_phone,
            v_session.customer_classification,
            COALESCE(v_session.selected_language, v_pref_lang),
            (v_session.status = 'AWAITING_LANGUAGE'),
            v_session.human_takeover_active;
        RETURN;
    END IF;

    -- Case B: No Active Session -> Start FRESH SESSION
    UPDATE public.wa_sessions s
    SET status = 'EXPIRED',
        closed_at = now(),
        close_reason = 'closed_inactivity',
        updated_at = now()
    WHERE s.customer_phone = v_norm_phone AND s.status NOT IN ('EXPIRED', 'CLOSED');

    v_new_session_id := 'wa_sess_' || floor(extract(epoch from now()))::TEXT || '_' || substr(md5(random()::text), 1, 6);

    IF v_pref_lang IS NOT NULL AND v_pref_lang IN ('English', 'Hindi', 'Hinglish', 'Marathi') THEN
        v_req_lang := false;
    ELSE
        v_req_lang := true;
    END IF;

    INSERT INTO public.wa_sessions (
        contact_id,
        session_id,
        customer_phone,
        status,
        customer_classification,
        selected_language,
        started_at,
        last_customer_message_at,
        last_customer_activity_at,
        expires_at,
        awaiting_customer,
        human_takeover_active,
        version
    ) VALUES (
        v_contact_id,
        v_new_session_id,
        v_norm_phone,
        CASE WHEN v_req_lang THEN 'AWAITING_LANGUAGE' ELSE 'ACTIVE' END,
        v_classification,
        v_pref_lang,
        now(),
        now(),
        now(),
        now() + INTERVAL '20 minutes',
        false,
        false,
        1
    );

    UPDATE public.wa_contacts c
    SET total_sessions_count = c.total_sessions_count + 1
    WHERE c.id = v_contact_id;

    -- Queue Admin Notification (Idempotent)
    INSERT INTO public.wa_admin_notifications (
        session_id,
        customer_classification,
        notification_type,
        recipient_phone,
        status,
        message_body
    ) VALUES (
        v_new_session_id,
        v_classification,
        CASE WHEN v_classification = 'RETURNING_CUSTOMER' THEN 'RETURNING_SESSION' ELSE 'SESSION_START' END,
        '918604600292',
        'queued',
        'Session started by ' || COALESCE(v_contact_name, v_norm_phone)
    )
    ON CONFLICT ON CONSTRAINT uq_wa_admin_notifications_session_type DO NOTHING;

    INSERT INTO public.wa_session_events (session_id, event_type, metadata)
    VALUES (v_new_session_id, 'session_started', jsonb_build_object(
        'phone', v_norm_phone,
        'classification', v_classification,
        'preserved_language', v_pref_lang
    ));

    RETURN QUERY SELECT
        false,
        true,
        v_new_session_id,
        v_norm_phone,
        v_classification,
        v_pref_lang,
        v_req_lang,
        false;
END;
$$;

-- Atomic Outgoing Bot Message Dispatch
CREATE OR REPLACE FUNCTION public.record_bot_outgoing_dispatch(
    p_session_id TEXT,
    p_awaiting_reply BOOLEAN DEFAULT true,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.wa_sessions
    SET last_bot_message_at = now(),
        awaiting_customer = CASE 
            WHEN p_awaiting_reply AND NOT human_takeover_active THEN true 
            ELSE awaiting_customer 
        END,
        follow_up_due_at = CASE 
            WHEN p_awaiting_reply AND NOT human_takeover_active AND follow_up_sent_at IS NULL 
            THEN now() + INTERVAL '3 minutes' 
            ELSE follow_up_due_at 
        END,
        follow_up_status = CASE 
            WHEN p_awaiting_reply AND NOT human_takeover_active AND follow_up_sent_at IS NULL 
            THEN 'pending' 
            ELSE follow_up_status 
        END,
        status = CASE 
            WHEN p_awaiting_reply AND status != 'HUMAN_TAKEOVER' THEN 'AWAITING_REPLY' 
            ELSE status 
        END,
        version = version + 1,
        updated_at = now()
    WHERE session_id = p_session_id;

    IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
        INSERT INTO public.outgoing_message_idempotency (
            idempotency_key, channel, recipient_id, status, sent_at
        )
        SELECT p_idempotency_key, 'whatsapp', customer_phone, 'sent', now()
        FROM public.wa_sessions
        WHERE session_id = p_session_id
        ON CONFLICT (idempotency_key) DO UPDATE
            SET status = 'sent', sent_at = now();
    END IF;
END;
$$;

-- Human Takeover Procedure (Single Admin Alert to +91 8604600292)
CREATE OR REPLACE FUNCTION public.trigger_human_takeover_atomic(
    p_session_id TEXT,
    p_requested_by TEXT DEFAULT 'customer',
    p_reason TEXT DEFAULT 'Customer requested human assistance'
)
RETURNS TABLE (
    success BOOLEAN,
    notification_queued BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_phone TEXT;
    v_notif_inserted BOOLEAN := false;
BEGIN
    UPDATE public.wa_sessions
    SET human_takeover_active = true,
        status = 'HUMAN_TAKEOVER',
        awaiting_customer = false,
        follow_up_due_at = NULL,
        follow_up_status = 'cancelled',
        version = version + 1,
        updated_at = now()
    WHERE session_id = p_session_id
    RETURNING customer_phone INTO v_phone;

    IF v_phone IS NULL THEN
        RETURN QUERY SELECT false, false;
        RETURN;
    END IF;

    UPDATE public.admin_conversations c
    SET manual_takeover = true,
        automation_paused = true,
        updated_at = now()
    FROM public.admin_contacts ac
    WHERE c.contact_id = ac.id
      AND (ac.phone = v_phone OR ac.phone = '+' || v_phone);

    INSERT INTO public.wa_admin_notifications (
        session_id, customer_classification, notification_type, recipient_phone, status, message_body
    ) VALUES (
        p_session_id, 'RETURNING_CUSTOMER', 'HUMAN_TAKEOVER_REQUEST', '918604600292', 'queued',
        '🚨 Human Takeover Requested by ' || v_phone || '. Reason: ' || p_reason
    )
    ON CONFLICT ON CONSTRAINT uq_wa_admin_notifications_session_type DO NOTHING;

    IF FOUND THEN
        v_notif_inserted := true;
    END IF;

    INSERT INTO public.wa_session_events (session_id, event_type, metadata)
    VALUES (p_session_id, 'human_takeover_activated', jsonb_build_object(
        'phone', v_phone,
        'requested_by', p_requested_by,
        'reason', p_reason
    ));

    RETURN QUERY SELECT true, v_notif_inserted;
END;
$$;

-- Instagram 3-Minute Follow-up Claimer (SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_ig_follow_up_atomic(
    p_worker_id TEXT DEFAULT 'default_worker',
    p_batch_size INT DEFAULT 10
)
RETURNS TABLE (
    session_id TEXT,
    ig_user_id TEXT,
    username TEXT,
    version INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH claimed AS (
        SELECT s.id, s.session_id, s.ig_user_id, s.username, s.version
        FROM public.ig_sessions s
        WHERE s.status IN ('ACTIVE', 'AWAITING_REPLY')
          AND s.awaiting_customer = true
          AND s.follow_up_sent_at IS NULL
          AND s.follow_up_due_at IS NOT NULL
          AND s.follow_up_due_at <= now()
          AND s.inactivity_expires_at > now()
          AND s.human_takeover_active = false
        ORDER BY s.follow_up_due_at ASC
        LIMIT p_batch_size
        FOR UPDATE OF s SKIP LOCKED
    ),
    updated AS (
        UPDATE public.ig_sessions s
        SET follow_up_sent_at = now(),
            awaiting_customer = false,
            version = s.version + 1,
            updated_at = now()
        FROM claimed
        WHERE s.id = claimed.id
        RETURNING s.session_id, s.ig_user_id, s.username, s.version
    )
    SELECT u.session_id, u.ig_user_id, u.username, u.version
    FROM updated u;
END;
$$;

-- Instagram 20-Minute Inactivity Expiry
CREATE OR REPLACE FUNCTION public.expire_ig_sessions_atomic()
RETURNS TABLE (
    expired_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    WITH expired AS (
        SELECT s.id
        FROM public.ig_sessions s
        WHERE s.status NOT IN ('EXPIRED', 'CLOSED')
          AND s.inactivity_expires_at <= now()
        FOR UPDATE SKIP LOCKED
    ),
    updated AS (
        UPDATE public.ig_sessions s
        SET status = 'EXPIRED',
            closed_at = now(),
            close_reason = 'closed_inactivity',
            awaiting_customer = false,
            version = s.version + 1,
            updated_at = now()
        FROM expired
        WHERE s.id = expired.id
        RETURNING s.id
    )
    SELECT count(*)::INT INTO v_count FROM updated;

    RETURN QUERY SELECT v_count;
END;
$$;

-- Appointment Reminder Deduplication Helpers
CREATE OR REPLACE FUNCTION public.can_send_appointment_reminder(
    p_calendar_event_id TEXT,
    p_reminder_type TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT NOT EXISTS (
        SELECT 1 
        FROM public.appointment_reminder_logs 
        WHERE calendar_event_id = p_calendar_event_id 
          AND reminder_type = p_reminder_type
    );
$$;

CREATE OR REPLACE FUNCTION public.record_appointment_reminder_atomic(
    p_calendar_event_id TEXT,
    p_appointment_id UUID,
    p_customer_phone TEXT,
    p_customer_name TEXT,
    p_reminder_type TEXT,
    p_scheduled_start TIMESTAMPTZ,
    p_provider_msg_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.appointment_reminder_logs (
        calendar_event_id,
        appointment_id,
        customer_phone,
        customer_name,
        reminder_type,
        scheduled_start,
        dispatched_at,
        provider_message_id,
        status
    ) VALUES (
        p_calendar_event_id,
        p_appointment_id,
        p_customer_phone,
        p_customer_name,
        p_reminder_type,
        p_scheduled_start,
        now(),
        p_provider_msg_id,
        'sent'
    )
    ON CONFLICT (calendar_event_id, reminder_type) DO NOTHING;

    RETURN FOUND;
END;
$$;

-- Permissions (Strict Least-Privilege Standard: restricted to service_role only)
REVOKE EXECUTE ON FUNCTION public.claim_wa_follow_up_atomic(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_wa_sessions_atomic() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_ig_follow_up_atomic(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_ig_sessions_atomic() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.register_inbound_customer_message(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_bot_outgoing_dispatch(TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_human_takeover_atomic(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_send_appointment_reminder(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_appointment_reminder_atomic(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_wa_follow_up_atomic(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_wa_sessions_atomic() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ig_follow_up_atomic(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_ig_sessions_atomic() TO service_role;
GRANT EXECUTE ON FUNCTION public.register_inbound_customer_message(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_bot_outgoing_dispatch(TEXT, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_human_takeover_atomic(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_send_appointment_reminder(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_appointment_reminder_atomic(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

-- Realtime Publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_contacts;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_sessions;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_admin_notifications;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_session_events;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_sessions;
    EXCEPTION WHEN duplicate_object THEN END;
END $$;
