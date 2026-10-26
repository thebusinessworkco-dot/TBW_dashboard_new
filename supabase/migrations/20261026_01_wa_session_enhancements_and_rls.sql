-- ==============================================================================
-- THE BUSINESS WORK — WHATSAPP V6 SESSION ENHANCEMENTS & RLS HARDENING
-- Migration: 20261026_01_wa_session_enhancements_and_rls.sql
-- Description:
-- 1. Enhances wa_contacts with preferred_language, preferences, total_sessions_count
-- 2. Enhances wa_sessions with customer_phone, follow_up_status, last_customer_activity_at
-- 3. Enforces unique constraint on wa_admin_notifications(session_id, notification_type) for idempotency
-- 4. Implements Row Level Security (RLS) on all wa_* tables with admin authorization gates
-- 5. Attaches automated updated_at triggers for wa_contacts and wa_sessions
--
-- SAFETY AUDIT:
-- - 100% additive and idempotent (IF NOT EXISTS guards, safe DO blocks).
-- - Zero destructive operations (no DROP TABLE, no DROP COLUMN, no TRUNCATE, no DELETE).
-- - Compatible with existing Next.js Admin Dashboard and n8n production workflows.
-- ==============================================================================

-- 1. ENHANCE wa_contacts TABLE
DO $$
BEGIN
    -- Ensure table exists if this migration is run after 20261025
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wa_contacts') THEN
        ALTER TABLE public.wa_contacts
            ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS total_sessions_count INT NOT NULL DEFAULT 1;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wa_contacts_lang ON public.wa_contacts(preferred_language);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_blocked ON public.wa_contacts(is_blocked);

-- 2. ENHANCE wa_sessions TABLE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wa_sessions') THEN
        ALTER TABLE public.wa_sessions
            ADD COLUMN IF NOT EXISTS customer_phone TEXT,
            ADD COLUMN IF NOT EXISTS follow_up_status TEXT NOT NULL DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS last_customer_activity_at TIMESTAMPTZ DEFAULT now();

        -- Add check constraint for follow_up_status if not exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE table_schema = 'public' AND table_name = 'wa_sessions' AND constraint_name = 'chk_wa_sessions_follow_up_status'
        ) THEN
            ALTER TABLE public.wa_sessions 
                ADD CONSTRAINT chk_wa_sessions_follow_up_status 
                CHECK (follow_up_status IN ('pending', 'due', 'sent', 'cancelled', 'skipped'));
        END IF;
    END IF;
END $$;

-- Populate customer_phone from wa_contacts where null
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wa_sessions') THEN
        UPDATE public.wa_sessions s
        SET customer_phone = c.normalized_phone
        FROM public.wa_contacts c
        WHERE s.contact_id = c.id AND s.customer_phone IS NULL;
    END IF;
END $$;

-- High-performance composite indexes for 3-minute follow-up & 20-minute expiry polling
CREATE INDEX IF NOT EXISTS idx_wa_sessions_active_poll 
    ON public.wa_sessions (status, awaiting_customer, follow_up_due_at) 
    WHERE status IN ('ACTIVE', 'AWAITING_REPLY', 'AWAITING_LANGUAGE');

CREATE INDEX IF NOT EXISTS idx_wa_sessions_expiry_poll 
    ON public.wa_sessions (status, expires_at) 
    WHERE status NOT IN ('EXPIRED', 'CLOSED');

CREATE INDEX IF NOT EXISTS idx_wa_sessions_phone_status 
    ON public.wa_sessions (customer_phone, status);

-- 3. ENHANCE wa_admin_notifications TABLE WITH DEDUPLICATION UNIQUE CONSTRAINT
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wa_admin_notifications') THEN
        ALTER TABLE public.wa_admin_notifications
            ADD COLUMN IF NOT EXISTS notification_category TEXT DEFAULT 'whatsapp_bot';

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_schema = 'public' AND table_name = 'wa_admin_notifications' AND constraint_name = 'uq_wa_admin_notifications_session_type'
        ) THEN
            ALTER TABLE public.wa_admin_notifications
                ADD CONSTRAINT uq_wa_admin_notifications_session_type UNIQUE (session_id, notification_type);
        END IF;
    END IF;
END $$;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_session_events ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS wa_contacts_admin_policy ON public.wa_contacts;
DROP POLICY IF EXISTS wa_sessions_admin_policy ON public.wa_sessions;
DROP POLICY IF EXISTS wa_admin_notifications_admin_policy ON public.wa_admin_notifications;
DROP POLICY IF EXISTS wa_session_events_admin_policy ON public.wa_session_events;

-- Authenticated Authorized Admins have full access
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

-- Explicit Grants
GRANT ALL ON public.wa_contacts TO service_role, authenticated;
GRANT ALL ON public.wa_sessions TO service_role, authenticated;
GRANT ALL ON public.wa_admin_notifications TO service_role, authenticated;
GRANT ALL ON public.wa_session_events TO service_role, authenticated;

-- 5. AUTOMATED updated_at TRIGGERS
DROP TRIGGER IF EXISTS trg_wa_contacts_updated_at ON public.wa_contacts;
CREATE TRIGGER trg_wa_contacts_updated_at
BEFORE UPDATE ON public.wa_contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- Add updated_at to wa_sessions if not present
ALTER TABLE public.wa_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS trg_wa_sessions_updated_at ON public.wa_sessions;
CREATE TRIGGER trg_wa_sessions_updated_at
BEFORE UPDATE ON public.wa_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();
