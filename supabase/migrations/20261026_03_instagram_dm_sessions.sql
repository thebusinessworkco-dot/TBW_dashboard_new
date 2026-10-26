-- ==============================================================================
-- THE BUSINESS WORK — INSTAGRAM DM INDEPENDENT SESSION MANAGEMENT
-- Migration: 20261026_03_instagram_dm_sessions.sql
-- Description:
-- 1. Creates public.ig_sessions for independent Instagram DM session lifecycle
-- 2. Creates public.ig_session_events for Instagram conversational telemetry
-- 3. Enables Realtime publication and RLS security
--
-- BUSINESS RULES SATISFIED:
-- - Rule 13: WhatsApp and Instagram must maintain independent sessions.
-- - Rule 8: 20-minute inactivity session expiry for Instagram chats.
-- - Rule 14 & 15: Outgoing AI messages must not reset customer inactivity timers.
-- ==============================================================================

-- 1. INSTAGRAM SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.ig_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    ig_user_id TEXT NOT NULL, -- Instagram Scoped ID (IGSID)
    username TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'AWAITING_REPLY', 'HUMAN_TAKEOVER', 'EXPIRED', 'CLOSED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_inbound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_outbound_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'), -- Meta 24-hr messaging window
    inactivity_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '20 minutes'), -- Inactivity window
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

-- 2. INSTAGRAM SESSION EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.ig_session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    ig_user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- dm_received, ai_replied, follow_up_sent, session_expired, human_takeover
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_session_events_session 
    ON public.ig_session_events (session_id);

CREATE INDEX IF NOT EXISTS idx_ig_session_events_user 
    ON public.ig_session_events (ig_user_id, created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS)
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

-- 4. UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_ig_sessions_updated_at ON public.ig_sessions;
CREATE TRIGGER trg_ig_sessions_updated_at
BEFORE UPDATE ON public.ig_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- 5. REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_sessions;
    EXCEPTION WHEN duplicate_object THEN
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ig_session_events;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;
