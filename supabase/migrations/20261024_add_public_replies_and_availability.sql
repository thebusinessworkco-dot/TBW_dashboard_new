-- Migration: Add Public Comment Replies and Availability Status
-- Safe Additive Migration for The Business Work Instagram Reels Automation

-- 1. Add Public Comment Reply and Availability tracking columns to instagram_reel_rules
ALTER TABLE instagram_reel_rules
  ADD COLUMN IF NOT EXISTS auto_comment_reply_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_comment_reply_text TEXT DEFAULT 'Thanks! 👋 Check your DM for the details.',
  ADD COLUMN IF NOT EXISTS auto_comment_reply_variations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS public_replies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS rule_status_reason TEXT;

-- 2. Add Public Reply tracking to instagram_comment_intents
ALTER TABLE instagram_comment_intents
  ADD COLUMN IF NOT EXISTS public_reply_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS public_reply_text TEXT,
  ADD COLUMN IF NOT EXISTS public_reply_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_comment_id TEXT;

-- 3. Add Follow Status tracking to instagram_customer_context
ALTER TABLE instagram_customer_context
  ADD COLUMN IF NOT EXISTS follow_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS follow_verified_at TIMESTAMPTZ;

-- 4. Create Indexes for rapid lookup and deduplication
CREATE INDEX IF NOT EXISTS idx_reels_availability ON instagram_reel_rules (is_available, is_enabled);
CREATE INDEX IF NOT EXISTS idx_comment_public_reply ON instagram_comment_intents (comment_id, public_reply_status);
CREATE INDEX IF NOT EXISTS idx_customer_follow_status ON instagram_customer_context (ig_user_id, follow_status);
