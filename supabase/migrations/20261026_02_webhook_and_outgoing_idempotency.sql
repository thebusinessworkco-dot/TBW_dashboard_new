-- ==============================================================================
-- THE BUSINESS WORK — WEBHOOK & OUTGOING MESSAGE IDEMPOTENCY LEDGER
-- Migration: 20261026_02_webhook_and_outgoing_idempotency.sql
-- Description:
-- 1. Creates public.webhook_idempotency_log for Meta WhatsApp and Instagram webhook deduplication
-- 2. Creates public.outgoing_message_idempotency for preventing duplicate outbound dispatches
-- 3. Adds high-throughput lookup indexes and RLS protection
--
-- BUSINESS RULES SATISFIED:
-- - Rule 12: Duplicate webhook events must never create duplicate responses.
-- - Rule 14: Follow-up timers must only react to genuine incoming customer activity.
-- ==============================================================================

-- 1. WEBHOOK IDEMPOTENCY LOG (Incoming Webhook Gate)
CREATE TABLE IF NOT EXISTS public.webhook_idempotency_log (
    event_id TEXT PRIMARY KEY, -- Meta wamid (WhatsApp) or mid/comment_id (Instagram)
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
    event_type TEXT NOT NULL, -- message, interactive_button, read_receipt, delivery_receipt, comment
    sender_id TEXT NOT NULL, -- E.164 phone or Instagram Scoped ID (IGSID)
    payload_hash TEXT,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed', 'duplicate')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    response_payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_idemp_channel_received 
    ON public.webhook_idempotency_log (channel, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_idemp_sender 
    ON public.webhook_idempotency_log (sender_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_idemp_status 
    ON public.webhook_idempotency_log (status) 
    WHERE status IN ('received', 'processing');

-- 2. OUTGOING MESSAGE IDEMPOTENCY (Outbound Dispatch Exit Gate)
CREATE TABLE IF NOT EXISTS public.outgoing_message_idempotency (
    idempotency_key TEXT PRIMARY KEY, -- e.g. out_wa_<session_id>_<action>_<hash>
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram')),
    recipient_id TEXT NOT NULL, -- E.164 phone or Instagram IGSID
    provider_message_id TEXT, -- Meta Cloud API returned message id (wamid.xxx)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_out_msg_idemp_recipient 
    ON public.outgoing_message_idempotency (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_out_msg_idemp_provider_id 
    ON public.outgoing_message_idempotency (provider_message_id) 
    WHERE provider_message_id IS NOT NULL;

-- 3. ROW LEVEL SECURITY (RLS)
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
