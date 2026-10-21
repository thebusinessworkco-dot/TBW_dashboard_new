-- ==============================================================================
-- THE BUSINESS WORK ADMIN DASHBOARD
-- Migration: 20261022_add_instagram_scoped_id.sql
-- Description: Adds instagram_scoped_id to admin_contacts with a partial unique
-- index for collision-safe, high-performance lookup of Meta Instagram-Scoped
-- User IDs (IGSIDs). Enforces 1-to-1 conversation per contact per platform.
--
-- COMPATIBILITY: 100% compatible with existing WhatsApp records (nullable column,
-- partial index ignores NULLs).
--
-- SAFETY AUDIT:
-- - Zero destructive operations (no DROP TABLE, no DROP COLUMN, no TRUNCATE, no DELETE).
-- - Fully additive and idempotent (all statements guarded by IF NOT EXISTS).
-- - Compatible with existing WhatsApp phone records and multi-channel contacts.
-- ==============================================================================

-- 1. Add instagram_scoped_id column if not exists
ALTER TABLE public.admin_contacts
ADD COLUMN IF NOT EXISTS instagram_scoped_id TEXT;

-- 2. Partial unique index to enforce 1-to-1 IGSID mapping while allowing multiple NULLs (for WhatsApp-only contacts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_contacts_instagram_scoped_id
ON public.admin_contacts (instagram_scoped_id)
WHERE instagram_scoped_id IS NOT NULL;

-- 3. Secondary index on instagram_username for fast search and display
CREATE INDEX IF NOT EXISTS idx_admin_contacts_instagram_username
ON public.admin_contacts (instagram_username)
WHERE instagram_username IS NOT NULL;

-- 4. Partial unique index on admin_conversations to prevent concurrent race-condition duplicates per platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_conversations_contact_platform
ON public.admin_conversations (contact_id, platform)
WHERE contact_id IS NOT NULL;

-- 5. Documentation comments
COMMENT ON COLUMN public.admin_contacts.instagram_scoped_id IS
'Official Meta Instagram Scoped User ID (IGSID). Guaranteed unique per contact.';
