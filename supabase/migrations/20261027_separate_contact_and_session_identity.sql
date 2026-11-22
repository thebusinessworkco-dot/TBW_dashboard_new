-- ==============================================================================
-- TBW PART 05: SEPARATION OF CONTACT IDENTITY AND CONVERSATION SESSIONS
-- Migration: 20261027_separate_contact_and_session_identity.sql
-- 
-- 1. Persistent Customer Contact:
--    - custom_name: Admin-defined custom display name (Aman Rajbhar, Client Mumbai, etc.)
--    - tags: Array of text tags for admin categorization
--    - last_activity_at: Timestamp of latest activity across any session
--
-- 2. Individual Conversation Session:
--    - session_customer_name: Customer-provided name collected during session onboarding
--    - session_number: Sequential session counter for this contact (1, 2, 3...)
--    - selected_language: Language selected by customer for this session
--    - closed_at: Timestamp when session ended (timeout, manual close, or completed)
--    - session_data: JSONB storage for session context, flow state, and history
-- ==============================================================================

-- 1. Add permanent identity columns to admin_contacts
ALTER TABLE public.admin_contacts
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

COMMENT ON COLUMN public.admin_contacts.custom_name IS 'Admin-defined persistent custom display name. NEVER overwritten by customer onboarding.';
COMMENT ON COLUMN public.admin_contacts.tags IS 'Categorization tags assigned by admin.';

-- 2. Add session-specific columns to admin_conversations
ALTER TABLE public.admin_conversations
  ADD COLUMN IF NOT EXISTS session_customer_name TEXT,
  ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS selected_language TEXT DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.admin_conversations.session_customer_name IS 'Customer name collected during this specific session onboarding.';
COMMENT ON COLUMN public.admin_conversations.session_number IS 'Sequential session index for this contact.';
COMMENT ON COLUMN public.admin_conversations.closed_at IS 'Timestamp when the conversation session expired or was closed.';

-- 3. Add index for session ordering and lookups
CREATE INDEX IF NOT EXISTS idx_admin_conversations_contact_sessions 
  ON public.admin_conversations(contact_id, platform, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_conversations_status_active 
  ON public.admin_conversations(contact_id, status) 
  WHERE status IN ('open', 'waiting_for_customer', 'needs_attention');
