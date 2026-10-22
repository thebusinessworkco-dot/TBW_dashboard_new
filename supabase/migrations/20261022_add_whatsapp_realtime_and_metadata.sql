-- ==============================================================================
-- THE BUSINESS WORK ADMIN DASHBOARD
-- Migration: 20261022_add_whatsapp_realtime_and_metadata.sql
-- Description:
-- 1. Adds metadata JSONB column to admin_messages for rich WhatsApp messages
--    (buttons, lists, flows, templates, locations, media details).
-- 2. Configures Supabase Realtime publication (supabase_realtime) for WhatsApp tables
--    (admin_conversations, admin_messages, admin_contacts).
-- 3. Sets REPLICA IDENTITY FULL so updates and deletes broadcast complete row payloads.
--
-- SAFETY AUDIT:
-- - Zero destructive operations (no DROP, no TRUNCATE, no DELETE).
-- - Fully additive and idempotent (IF NOT EXISTS & DO block exception handling).
-- - 100% backward compatible with existing queries and RLS policies.
-- ==============================================================================

-- 1. Add metadata JSONB column to admin_messages if not exists
ALTER TABLE public.admin_messages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.admin_messages.metadata IS
'Stores rich WhatsApp metadata: interactive buttons, list selections, flow responses, template parameters, location coordinates, media details, or error payloads.';

-- 2. Add partial index on metadata for fast search if querying by specific metadata properties
CREATE INDEX IF NOT EXISTS idx_admin_messages_metadata
ON public.admin_messages USING gin (metadata)
WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb;

-- 3. Idempotently add WhatsApp tables to supabase_realtime publication
DO $$
BEGIN
    -- admin_conversations
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_conversations;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, safe to continue
    END;

    -- admin_messages
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, safe to continue
    END;

    -- admin_contacts
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_contacts;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, safe to continue
    END;
END $$;

-- 4. Set REPLICA IDENTITY FULL so Realtime updates and deletes broadcast all columns
ALTER TABLE public.admin_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.admin_messages REPLICA IDENTITY FULL;
ALTER TABLE public.admin_contacts REPLICA IDENTITY FULL;

-- ==============================================================================
-- VERIFICATION QUERIES (Run after executing migration)
-- ==============================================================================
-- Query 1: Verify metadata column exists on admin_messages:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'admin_messages' AND column_name = 'metadata';
--
-- Query 2: Verify Realtime publication includes WhatsApp tables:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' 
-- AND tablename IN ('admin_conversations', 'admin_messages', 'admin_contacts');
-- ==============================================================================
