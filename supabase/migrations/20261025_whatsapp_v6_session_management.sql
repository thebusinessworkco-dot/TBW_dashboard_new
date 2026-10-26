-- ==============================================================================
-- THE BUSINESS WORK ADMIN DASHBOARD & WHATSAPP V6
-- Migration: 20261025_whatsapp_v6_session_management.sql
-- Description:
-- 1. Creates wa_contacts, wa_sessions, wa_admin_notifications, wa_session_events
-- 2. Adds additive columns to admin_contacts and admin_conversations for backward compatibility
-- 3. Enables Supabase Realtime publication on wa_* tables
-- 4. Creates unique & performance indexes for phone normalization and session queries
--
-- SAFETY AUDIT:
-- - 100% additive and idempotent (IF NOT EXISTS guards).
-- - Zero destructive operations (no DROP TABLE, no DROP COLUMN, no TRUNCATE, no DELETE).
-- - Preserves all appointments, Google Calendar event IDs, leads, and Instagram tables.
-- ==============================================================================

-- 1. WA Contacts Table
CREATE TABLE IF NOT EXISTS public.wa_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_phone TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_contacts_phone ON public.wa_contacts (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_deleted_at ON public.wa_contacts (deleted_at);

-- 2. WA Sessions Table
CREATE TABLE IF NOT EXISTS public.wa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, AWAITING_LANGUAGE, AWAITING_REPLY, HUMAN_TAKEOVER, EXPIRED, CLOSED
    customer_classification TEXT NOT NULL DEFAULT 'NEW_CUSTOMER', -- NEW_CUSTOMER, RETURNING_CUSTOMER
    selected_language TEXT DEFAULT NULL, -- English, Hindi, Hinglish, Marathi
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_customer_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_bot_message_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    follow_up_due_at TIMESTAMPTZ DEFAULT NULL,
    follow_up_sent_at TIMESTAMPTZ DEFAULT NULL,
    awaiting_customer BOOLEAN NOT NULL DEFAULT false,
    human_takeover_active BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMPTZ DEFAULT NULL,
    close_reason TEXT DEFAULT NULL,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_wa_sessions_session_id ON public.wa_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_contact_id ON public.wa_sessions (contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_status ON public.wa_sessions (status);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_expires_at ON public.wa_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_follow_up ON public.wa_sessions (follow_up_due_at, follow_up_sent_at);

-- 3. WA Admin Notifications Table
CREATE TABLE IF NOT EXISTS public.wa_admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    customer_classification TEXT NOT NULL DEFAULT 'NEW_CUSTOMER',
    notification_type TEXT NOT NULL DEFAULT 'SESSION_START',
    recipient_phone TEXT NOT NULL DEFAULT '918604600292',
    meta_message_id TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, submitted, accepted, sent, delivered, read, failed, template_pending
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error_code TEXT DEFAULT NULL,
    message_body TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    delivered_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_admin_notifications_session ON public.wa_admin_notifications (session_id);
CREATE INDEX IF NOT EXISTS idx_wa_admin_notifications_status ON public.wa_admin_notifications (status);

-- 4. WA Session Events Table
CREATE TABLE IF NOT EXISTS public.wa_session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_session_events_session ON public.wa_session_events (session_id);
CREATE INDEX IF NOT EXISTS idx_wa_session_events_type ON public.wa_session_events (event_type);

-- 5. Additive Columns to Existing Tables (admin_contacts and admin_conversations)
ALTER TABLE public.admin_contacts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.admin_conversations
ADD COLUMN IF NOT EXISTS session_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS customer_classification TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selected_language TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS follow_up_due_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS awaiting_customer BOOLEAN DEFAULT false;

-- 6. Realtime Publication configuration
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_contacts;
    EXCEPTION WHEN duplicate_object THEN
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_sessions;
    EXCEPTION WHEN duplicate_object THEN
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_admin_notifications;
    EXCEPTION WHEN duplicate_object THEN
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_session_events;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;
