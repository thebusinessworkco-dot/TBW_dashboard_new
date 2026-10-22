-- ==============================================================================
-- THE BUSINESS WORK ADMIN DASHBOARD
-- Migration: 20261022_add_whatsapp_phone_unique_index.sql
-- Description: Adds a partial unique index on admin_contacts(phone) WHERE phone IS NOT NULL.
-- Guarantees that duplicate contacts cannot be created concurrently for the same phone number.
--
-- COMPATIBILITY: 100% compatible with Instagram contacts (which have phone IS NULL).
-- Partial index only enforces uniqueness when phone IS NOT NULL.
--
-- SAFETY AUDIT:
-- - Zero destructive operations (no DROP TABLE, no DROP COLUMN, no TRUNCATE, no DELETE).
-- - Fully additive and idempotent (guarded by IF NOT EXISTS).
-- - Preflight confirmed 0 duplicate phone numbers exist in the database.
-- ==============================================================================

-- 1. Create partial unique index on phone for non-null phone numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_contacts_phone_unique
ON public.admin_contacts (phone)
WHERE phone IS NOT NULL;

-- 2. Documentation comment
COMMENT ON INDEX public.idx_admin_contacts_phone_unique IS
'Enforces uniqueness of normalized phone numbers among contacts while permitting multiple NULL phone numbers for social-only contacts (e.g. Instagram).';
