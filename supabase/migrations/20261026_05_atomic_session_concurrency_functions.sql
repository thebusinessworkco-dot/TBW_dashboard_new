-- ==============================================================================
-- THE BUSINESS WORK — ATOMIC SESSION CONCURRENCY & WORKFLOW PROCEDURES
-- Migration: 20261026_05_atomic_session_concurrency_functions.sql
-- Description:
-- 1. claim_wa_follow_up_atomic: Concurrency-safe 3-minute follow-up claimer (SKIP LOCKED)
-- 2. expire_wa_sessions_atomic: Atomic 20-minute inactivity session expiry
-- 3. register_inbound_customer_message: Atomic inbound processor (dedup + contact + session)
-- 4. record_bot_outgoing_dispatch: Records bot replies without touching customer inactivity timers
-- 5. trigger_human_takeover_atomic: Atomic takeover with exactly one admin alert
-- 6. Appointment reminder check and record atomic helpers
--
-- BUSINESS RULES SATISFIED:
-- - Rule 5: Talk to Human creates exactly one human-request alert.
-- - Rule 6 & 7: After 3m, send one follow-up; never repeat within same session.
-- - Rule 8 & 9: After 20m total, expire session automatically without outbound spam.
-- - Rule 10 & 11: Customer identity and language preserved across expired sessions.
-- - Rule 12: Duplicate webhooks never create duplicate responses.
-- - Rule 14 & 15: Outgoing AI messages must not reset customer inactivity timers.
-- ==============================================================================

-- 1. ATOMIC 3-MINUTE FOLLOW-UP CLAIMER (Concurrency Protected via SKIP LOCKED)
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
            awaiting_customer = false, -- Enforces Rule 7: exactly one follow-up per session
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

-- 2. ATOMIC 20-MINUTE INACTIVITY SESSION EXPIRATION
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
        RETURNING s.id, s.session_id, s.customer_phone
    ),
    logged AS (
        INSERT INTO public.wa_session_events (session_id, event_type, metadata)
        SELECT u.session_id, 'session_expired', jsonb_build_object(
            'reason', '20_minute_inactivity_timeout',
            'phone', u.customer_phone
        )
        FROM updated u
    )
    SELECT COUNT(*)::INT INTO v_count FROM updated;

    RETURN QUERY SELECT v_count;
END;
$$;

-- 3. ATOMIC INBOUND CUSTOMER MESSAGE PROCESSOR
-- Handles Deduplication, Contact Resolution, Identity Preservation, and Session Creation/Extension
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
    -- 1. Normalize Phone (Digits only)
    v_norm_phone := regexp_replace(p_phone, '\D', '', 'g');
    IF length(v_norm_phone) = 10 THEN
        v_norm_phone := '91' || v_norm_phone;
    ELSIF length(v_norm_phone) = 11 AND left(v_norm_phone, 1) = '0' THEN
        v_norm_phone := '91' || substring(v_norm_phone from 2);
    END IF;

    -- 2. Webhook Deduplication Check (Rule 12)
    IF p_wamid IS NOT NULL AND length(trim(p_wamid)) > 0 THEN
        INSERT INTO public.webhook_idempotency_log (
            event_id, channel, event_type, sender_id, status, received_at
        ) VALUES (
            p_wamid, 'whatsapp', 'message', v_norm_phone, 'received', now()
        )
        ON CONFLICT (event_id) DO NOTHING;

        IF NOT FOUND THEN
            -- Duplicate webhook received: abort immediately
            RETURN QUERY SELECT true, false, NULL::TEXT, v_norm_phone, NULL::TEXT, NULL::TEXT, false, false;
            RETURN;
        END IF;
    END IF;

    -- 3. Contact Identification & Identity Preservation (Rule 11)
    SELECT id, customer_name, preferred_language, total_sessions_count, (deleted_at IS NOT NULL)
    INTO v_contact_id, v_contact_name, v_pref_lang, v_total_sessions, v_is_deleted
    FROM public.wa_contacts
    WHERE normalized_phone = v_norm_phone
    FOR UPDATE;

    IF v_contact_id IS NULL THEN
        -- Brand New Customer
        v_classification := 'NEW_CUSTOMER';
        INSERT INTO public.wa_contacts (
            normalized_phone, customer_name, preferred_language, first_seen_at, last_seen_at, total_sessions_count
        ) VALUES (
            v_norm_phone, p_customer_name, NULL, now(), now(), 1
        )
        RETURNING id, customer_name, preferred_language, total_sessions_count
        INTO v_contact_id, v_contact_name, v_pref_lang, v_total_sessions;
    ELSE
        -- Existing Customer Profile
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

    -- Case A: Active Session Found -> Extend 20-minute inactivity timer
    IF v_session.id IS NOT NULL THEN
        UPDATE public.wa_sessions s
        SET last_customer_message_at = now(),
            last_customer_activity_at = now(),
            expires_at = now() + INTERVAL '20 minutes', -- 20-minute extension on incoming message
            awaiting_customer = false, -- Customer responded
            follow_up_due_at = NULL,
            follow_up_status = 'cancelled',
            version = s.version + 1,
            updated_at = now()
        WHERE s.id = v_session.id;

        -- Log event
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

    -- Case B: No Active Session -> Start FRESH SESSION (Rule 10)
    -- If previous session existed, ensure marked expired
    UPDATE public.wa_sessions s
    SET status = 'EXPIRED',
        closed_at = now(),
        close_reason = 'closed_inactivity',
        updated_at = now()
    WHERE s.customer_phone = v_norm_phone AND s.status NOT IN ('EXPIRED', 'CLOSED');

    -- Generate readable, unique session ID
    v_new_session_id := 'wa_sess_' || floor(extract(epoch from now()))::TEXT || '_' || substr(md5(random()::text), 1, 6);

    -- Preserve language if already chosen in past (Rule 11)
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

    -- Update contact total sessions count
    UPDATE public.wa_contacts
    SET total_sessions_count = total_sessions_count + 1
    WHERE id = v_contact_id;

    -- Queue Admin Notification (Idempotent: Rule 5)
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

    -- Log start event
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

-- 4. ATOMIC OUTGOING BOT MESSAGE DISPATCH
-- Strictly preserves customer inactivity timer (Rule 14 & 15: Bot message does NOT reset 20m customer timer)
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

    -- Log Outgoing Idempotency if key provided
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

-- 5. ATOMIC HUMAN TAKEOVER TRIGGER (Rule 5: Exactly ONE admin notification)
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
    -- 1. Update Session State
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

    -- 2. Pause Automation on admin_conversations
    UPDATE public.admin_conversations c
    SET manual_takeover = true,
        automation_paused = true,
        updated_at = now()
    FROM public.admin_contacts ac
    WHERE c.contact_id = ac.id
      AND (ac.phone = v_phone OR ac.phone = '+' || v_phone);

    -- 3. Insert Exactly One Human Takeover Notification (Rule 5)
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

    -- 4. Log Event
    INSERT INTO public.wa_session_events (session_id, event_type, metadata)
    VALUES (p_session_id, 'human_takeover_activated', jsonb_build_object(
        'phone', v_phone,
        'requested_by', p_requested_by,
        'reason', p_reason
    ));

    RETURN QUERY SELECT true, v_notif_inserted;
END;
$$;

-- 6. APPOINTMENT REMINDER CONCURRENCY & DEDUPLICATION HELPERS
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

-- 7. ATOMIC INSTAGRAM 3-MINUTE FOLLOW-UP CLAIMER (Concurrency Protected via SKIP LOCKED)
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
            awaiting_customer = false, -- Enforces Rule 7: exactly one follow-up per session
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

-- 8. ATOMIC INSTAGRAM 20-MINUTE INACTIVITY SESSION EXPIRATION
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

-- RESTRICT EXECUTE STRICTLY TO service_role (Least-Privilege Security Standard)
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

