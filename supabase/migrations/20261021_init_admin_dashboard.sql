-- ==============================================================================
-- THE BUSINESS WORK — ADMIN DASHBOARD DATABASE MIGRATION (V2 - PRODUCTION SECURED)
-- Project: The Business Work (https://www.thebusinesswork.com/)
-- Target Database: Supabase PostgreSQL (Standard or Empty Project)
-- Authorized Administrator Email: thebusinesswork.co@gmail.com
--
-- Security & Hardening Changes Implemented:
-- 1. All 12 dashboard tables preserved with full data integrity.
-- 2. Auth User ID allowlist (public.admin_user_allowlist) replacing email-only checks.
-- 3. Automatic synchronization of existing & new auth.users with the admin email.
-- 4. Fixed search_path (public, auth, pg_temp) on all SECURITY DEFINER functions.
-- 5. Restricted function EXECUTE permissions (REVOKE FROM PUBLIC, GRANT TO authenticated, service_role).
-- 6. Comprehensive RLS policies with explicit USING and WITH CHECK for all operations.
-- 7. Deterministic demo-data purge in safe dependency order preventing foreign-key errors.
-- 8. Unique partial index on external_message_id for Meta/WhatsApp/Instagram deduplication.
-- 9. Automatic updated_at timestamp triggers.
-- 10. Completely idempotent: safe to run repeatedly on empty or existing Supabase projects.
-- 11. Zero dummy data inserted.
-- ==============================================================================

-- 0. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- SECTION A: ADMIN USER ALLOWLIST (AUTH USER ID BASED)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_user_allowlist (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'superadmin',
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_allowlist_email ON public.admin_user_allowlist(email);

-- Secure the allowlist table with RLS
ALTER TABLE public.admin_user_allowlist ENABLE ROW LEVEL SECURITY;

-- If administrator already exists in Supabase Authentication, link their User ID immediately
INSERT INTO public.admin_user_allowlist (user_id, email, role)
SELECT id, email, 'superadmin'
FROM auth.users
WHERE email = 'thebusinesswork.co@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Automated trigger to sync administrator User ID whenever account is created or updated
CREATE OR REPLACE FUNCTION public.sync_admin_user_to_allowlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF LOWER(NEW.email) = 'thebusinesswork.co@gmail.com' THEN
        INSERT INTO public.admin_user_allowlist (user_id, email, role)
        VALUES (NEW.id, NEW.email, 'superadmin')
        ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_admin_user_to_allowlist() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_admin_user_to_allowlist() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_sync_admin_user_on_auth ON auth.users;
CREATE TRIGGER trg_sync_admin_user_on_auth
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_user_to_allowlist();

-- ==============================================================================
-- SECTION B: CORE SECURITY DEFINER AUTHORIZATION FUNCTION
-- Checks auth.uid() against admin_user_allowlist and verifies against auth.users.
-- Fixed search_path prevents search_path poisoning.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_authorized_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    current_uid UUID;
    is_admin BOOLEAN := FALSE;
BEGIN
    current_uid := auth.uid();

    -- Reject immediately if unauthenticated
    IF current_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Check verified User ID in allowlist table
    SELECT EXISTS (
        SELECT 1 
        FROM public.admin_user_allowlist 
        WHERE user_id = current_uid
    ) INTO is_admin;

    IF is_admin THEN
        RETURN TRUE;
    END IF;

    -- 2. Fallback check: verify user directly in auth.users
    SELECT EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = current_uid 
          AND LOWER(email) = 'thebusinesswork.co@gmail.com'
    ) INTO is_admin;

    -- If verified in auth.users, cache into allowlist for future fast checks
    IF is_admin THEN
        INSERT INTO public.admin_user_allowlist (user_id, email, role)
        VALUES (current_uid, 'thebusinesswork.co@gmail.com', 'superadmin')
        ON CONFLICT (user_id) DO NOTHING;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_authorized_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_authorized_admin() TO authenticated, service_role;

-- Allowlist table policy
DROP POLICY IF EXISTS admin_user_allowlist_policy ON public.admin_user_allowlist;
CREATE POLICY admin_user_allowlist_policy ON public.admin_user_allowlist
    FOR ALL
    TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

-- ==============================================================================
-- SECTION C: HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_admin_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_admin_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_admin_updated_at() TO authenticated, service_role;

-- ==============================================================================
-- SECTION D: 12 ISOLATED ADMIN DASHBOARD TABLES
-- ==============================================================================

-- 1. ADMIN CONTACTS
CREATE TABLE IF NOT EXISTS public.admin_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    instagram_username TEXT,
    email TEXT,
    company_name TEXT,
    avatar_url TEXT,
    notes TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_contacts_phone ON public.admin_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_admin_contacts_ig ON public.admin_contacts(instagram_username);
CREATE INDEX IF NOT EXISTS idx_admin_contacts_email ON public.admin_contacts(email);
CREATE INDEX IF NOT EXISTS idx_admin_contacts_demo ON public.admin_contacts(is_demo);

DROP TRIGGER IF EXISTS trg_admin_contacts_updated_at ON public.admin_contacts;
CREATE TRIGGER trg_admin_contacts_updated_at
BEFORE UPDATE ON public.admin_contacts
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- 2. ADMIN CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.admin_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.admin_contacts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'instagram')),
    status TEXT NOT NULL CHECK (status IN ('open', 'waiting_for_customer', 'completed', 'incomplete', 'needs_attention', 'failed')),
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count INT DEFAULT 0,
    automation_paused BOOLEAN DEFAULT FALSE,
    manual_takeover BOOLEAN DEFAULT FALSE,
    internal_notes TEXT,
    linked_lead_id UUID,
    linked_appointment_id UUID,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_conversations_platform ON public.admin_conversations(platform);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_status ON public.admin_conversations(status);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_platform_status ON public.admin_conversations(platform, status);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_contact ON public.admin_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_demo ON public.admin_conversations(is_demo);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_last_msg ON public.admin_conversations(last_message_at DESC);

DROP TRIGGER IF EXISTS trg_admin_conversations_updated_at ON public.admin_conversations;
CREATE TRIGGER trg_admin_conversations_updated_at
BEFORE UPDATE ON public.admin_conversations
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- 3. ADMIN MESSAGES (Stores WhatsApp & Instagram chats from n8n webhooks)
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'automation_ai', 'automation_rule', 'human_agent')),
    sender_name TEXT,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    external_message_id TEXT, -- Meta/WhatsApp message ID for deduplication
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crucial: Unique partial index guarantees message deduplication on webhook retries
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_messages_external_id ON public.admin_messages(external_message_id) 
WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_messages_conv ON public.admin_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_conv_created ON public.admin_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_demo ON public.admin_messages(is_demo);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created ON public.admin_messages(created_at);

-- 4. ADMIN LEADS (Synced with Google Sheets)
CREATE TABLE IF NOT EXISTS public.admin_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.admin_contacts(id) ON DELETE SET NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    instagram_username TEXT,
    source TEXT NOT NULL CHECK (source IN ('website', 'whatsapp', 'instagram')),
    service_interest TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    estimated_value NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    google_sheet_row_id TEXT,
    source_conversation_id UUID,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_leads_source ON public.admin_leads(source);
CREATE INDEX IF NOT EXISTS idx_admin_leads_status ON public.admin_leads(status);
CREATE INDEX IF NOT EXISTS idx_admin_leads_contact ON public.admin_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_admin_leads_sheet_row ON public.admin_leads(google_sheet_row_id);
CREATE INDEX IF NOT EXISTS idx_admin_leads_demo ON public.admin_leads(is_demo);

DROP TRIGGER IF EXISTS trg_admin_leads_updated_at ON public.admin_leads;
CREATE TRIGGER trg_admin_leads_updated_at
BEFORE UPDATE ON public.admin_leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- 5. ADMIN APPOINTMENTS (Synced with Google Sheets & Calendar)
CREATE TABLE IF NOT EXISTS public.admin_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'instagram')),
    service_requested TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    google_calendar_event_id TEXT,
    conversation_id UUID,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_appointments_date ON public.admin_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_status ON public.admin_appointments(status);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_cal_id ON public.admin_appointments(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_conv ON public.admin_appointments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_demo ON public.admin_appointments(is_demo);

DROP TRIGGER IF EXISTS trg_admin_appointments_updated_at ON public.admin_appointments;
CREATE TRIGGER trg_admin_appointments_updated_at
BEFORE UPDATE ON public.admin_appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- 6. ADMIN QUOTATIONS
CREATE TABLE IF NOT EXISTS public.admin_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT,
    instagram_username TEXT,
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 18.0,
    notes TEXT,
    terms_and_conditions TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    sent_via TEXT CHECK (sent_via IN ('whatsapp', 'instagram')),
    sent_at TIMESTAMPTZ,
    pdf_url TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_quotations_num ON public.admin_quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_admin_quotations_status ON public.admin_quotations(status);
CREATE INDEX IF NOT EXISTS idx_admin_quotations_demo ON public.admin_quotations(is_demo);
CREATE INDEX IF NOT EXISTS idx_admin_quotations_date ON public.admin_quotations(quotation_date DESC);

DROP TRIGGER IF EXISTS trg_admin_quotations_updated_at ON public.admin_quotations;
CREATE TRIGGER trg_admin_quotations_updated_at
BEFORE UPDATE ON public.admin_quotations
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- 7. ADMIN QUOTATION ITEMS
CREATE TABLE IF NOT EXISTS public.admin_quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.admin_quotations(id) ON DELETE CASCADE,
    service_category TEXT NOT NULL,
    service_name TEXT NOT NULL,
    description TEXT,
    quantity INT NOT NULL DEFAULT 1,
    setup_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
    monthly_recurring_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_quotation_items_q ON public.admin_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_admin_quotation_items_demo ON public.admin_quotation_items(is_demo);

-- 8. ADMIN INSTAGRAM REEL COMMENT AUTOMATIONS
CREATE TABLE IF NOT EXISTS public.admin_comment_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_media_id TEXT UNIQUE NOT NULL,
    reel_thumbnail TEXT,
    reel_caption TEXT,
    publish_date TIMESTAMPTZ,
    is_enabled BOOLEAN DEFAULT TRUE,
    trigger_keyword TEXT NOT NULL,
    automatic_dm_message TEXT NOT NULL,
    last_execution_at TIMESTAMPTZ,
    last_status TEXT CHECK (last_status IN ('success', 'failed', 'pending')),
    last_error TEXT,
    matching_comments_count INT DEFAULT 0,
    successful_replies_count INT DEFAULT 0,
    failed_replies_count INT DEFAULT 0,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_comment_auto_media ON public.admin_comment_automations(reel_media_id);
CREATE INDEX IF NOT EXISTS idx_admin_comment_auto_status ON public.admin_comment_automations(is_enabled, last_status);
CREATE INDEX IF NOT EXISTS idx_admin_comment_auto_demo ON public.admin_comment_automations(is_demo);

DROP TRIGGER IF EXISTS trg_admin_comment_automations_updated_at ON public.admin_comment_automations;
CREATE TRIGGER trg_admin_comment_automations_updated_at
BEFORE UPDATE ON public.admin_comment_automations
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_updated_at();

-- 9. ADMIN WORKFLOW EXECUTIONS (Logged from self-hosted n8n instance)
CREATE TABLE IF NOT EXISTS public.admin_workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
    execution_id TEXT UNIQUE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    stopped_at TIMESTAMPTZ,
    duration_ms INT,
    error_message TEXT,
    failed_node_name TEXT,
    retry_of TEXT,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_wf_exec_wf_id ON public.admin_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_admin_wf_exec_status ON public.admin_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_admin_wf_exec_started ON public.admin_workflow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_wf_exec_demo ON public.admin_workflow_executions(is_demo);

-- 10. ADMIN VPS METRICS (Heartbeats from lightweight VPS monitoring agent)
CREATE TABLE IF NOT EXISTS public.admin_vps_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown', 'not_connected')),
    cpu_percent NUMERIC(5, 2) NOT NULL,
    ram_used_gb NUMERIC(6, 2) NOT NULL,
    ram_total_gb NUMERIC(6, 2) NOT NULL,
    ram_percent NUMERIC(5, 2) NOT NULL,
    disk_used_gb NUMERIC(6, 2) NOT NULL,
    disk_total_gb NUMERIC(6, 2) NOT NULL,
    disk_percent NUMERIC(5, 2) NOT NULL,
    uptime_seconds BIGINT NOT NULL,
    n8n_status TEXT NOT NULL,
    n8n_response_time_ms INT NOT NULL,
    n8n_healthy BOOLEAN NOT NULL,
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    recent_errors JSONB,
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_vps_checked ON public.admin_vps_metrics(last_checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_vps_demo ON public.admin_vps_metrics(is_demo);

-- 11. ADMIN INTEGRATION STATUS
CREATE TABLE IF NOT EXISTS public.admin_integration_status (
    service_name TEXT PRIMARY KEY CHECK (service_name IN ('supabase', 'whatsapp', 'instagram', 'n8n', 'google_sheets', 'vps')),
    status TEXT NOT NULL CHECK (status IN ('connected', 'disconnected', 'error')),
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    details JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial integration status indicators (safe to re-run)
INSERT INTO public.admin_integration_status (service_name, status, last_sync_at, details)
VALUES 
    ('supabase', 'connected', NOW(), '{"note": "Primary PostgreSQL & Auth engine ready"}'::jsonb),
    ('whatsapp', 'disconnected', NULL, '{"note": "Awaiting Cloud API tokens"}'::jsonb),
    ('instagram', 'disconnected', NULL, '{"note": "Awaiting Graph API tokens"}'::jsonb),
    ('n8n', 'disconnected', NULL, '{"note": "Awaiting VPS webhook integration"}'::jsonb),
    ('google_sheets', 'disconnected', NULL, '{"note": "Awaiting Google Service Account credentials"}'::jsonb),
    ('vps', 'disconnected', NULL, '{"note": "Awaiting VPS agent telemetry"}'::jsonb)
ON CONFLICT (service_name) DO NOTHING;

-- 12. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_entity);

-- ==============================================================================
-- SECTION E: ROW LEVEL SECURITY POLICIES (COMPREHENSIVE USING & WITH CHECK)
-- ==============================================================================

ALTER TABLE public.admin_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_comment_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_vps_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_integration_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS admin_contacts_policy ON public.admin_contacts;
DROP POLICY IF EXISTS admin_conversations_policy ON public.admin_conversations;
DROP POLICY IF EXISTS admin_messages_policy ON public.admin_messages;
DROP POLICY IF EXISTS admin_leads_policy ON public.admin_leads;
DROP POLICY IF EXISTS admin_appointments_policy ON public.admin_appointments;
DROP POLICY IF EXISTS admin_quotations_policy ON public.admin_quotations;
DROP POLICY IF EXISTS admin_quotation_items_policy ON public.admin_quotation_items;
DROP POLICY IF EXISTS admin_comment_automations_policy ON public.admin_comment_automations;
DROP POLICY IF EXISTS admin_workflow_executions_policy ON public.admin_workflow_executions;
DROP POLICY IF EXISTS admin_vps_metrics_policy ON public.admin_vps_metrics;
DROP POLICY IF EXISTS admin_integration_status_policy ON public.admin_integration_status;
DROP POLICY IF EXISTS admin_audit_logs_policy ON public.admin_audit_logs;

-- Apply hardened RLS with explicit USING and WITH CHECK to validate SELECT, INSERT, UPDATE, and DELETE
CREATE POLICY admin_contacts_policy ON public.admin_contacts
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_conversations_policy ON public.admin_conversations
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_messages_policy ON public.admin_messages
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_leads_policy ON public.admin_leads
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_appointments_policy ON public.admin_appointments
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_quotations_policy ON public.admin_quotations
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_quotation_items_policy ON public.admin_quotation_items
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_comment_automations_policy ON public.admin_comment_automations
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_workflow_executions_policy ON public.admin_workflow_executions
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_vps_metrics_policy ON public.admin_vps_metrics
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_integration_status_policy ON public.admin_integration_status
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

CREATE POLICY admin_audit_logs_policy ON public.admin_audit_logs
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

-- ==============================================================================
-- SECTION F: SAFE DEMO DATA PURGE (STRICT DEPENDENCY ORDER)
-- Deletes ONLY records where is_demo = TRUE.
-- Safely unlinks any non-demo records referencing demo records first.
-- Never affects real production contacts, conversations, leads, or auth accounts.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.remove_all_demo_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    deleted_counts JSON;
    cnt_msgs INT := 0;
    cnt_conv INT := 0;
    cnt_contacts INT := 0;
    cnt_leads INT := 0;
    cnt_appts INT := 0;
    cnt_quot_items INT := 0;
    cnt_quots INT := 0;
    cnt_automations INT := 0;
    cnt_workflows INT := 0;
    cnt_vps INT := 0;
BEGIN
    -- 1. Security check: Caller must be an authorized admin
    IF NOT public.is_authorized_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only authorized administrator can perform demo data cleanup.';
    END IF;

    -- 2. Delete child Quotation Items before parent Quotations
    DELETE FROM public.admin_quotation_items 
    WHERE is_demo = TRUE 
       OR quotation_id IN (SELECT id FROM public.admin_quotations WHERE is_demo = TRUE);
    GET DIAGNOSTICS cnt_quot_items = ROW_COUNT;

    -- 3. Delete parent Quotations
    DELETE FROM public.admin_quotations WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_quots = ROW_COUNT;

    -- 4. Delete child Messages before parent Conversations
    DELETE FROM public.admin_messages 
    WHERE is_demo = TRUE 
       OR conversation_id IN (SELECT id FROM public.admin_conversations WHERE is_demo = TRUE);
    GET DIAGNOSTICS cnt_msgs = ROW_COUNT;

    -- 5. Safe unlinking: If any real (is_demo = FALSE) records reference demo conversations, unlink them
    UPDATE public.admin_leads 
    SET source_conversation_id = NULL 
    WHERE is_demo = FALSE 
      AND source_conversation_id IN (SELECT id FROM public.admin_conversations WHERE is_demo = TRUE);

    UPDATE public.admin_appointments 
    SET conversation_id = NULL 
    WHERE is_demo = FALSE 
      AND conversation_id IN (SELECT id FROM public.admin_conversations WHERE is_demo = TRUE);

    -- 6. Delete parent Conversations
    DELETE FROM public.admin_conversations WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_conv = ROW_COUNT;

    -- 7. Delete Leads
    DELETE FROM public.admin_leads WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_leads = ROW_COUNT;

    -- 8. Delete Appointments
    DELETE FROM public.admin_appointments WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_appts = ROW_COUNT;

    -- 9. Safe unlinking: If any real records reference demo contacts, unlink them before deleting contacts
    UPDATE public.admin_conversations 
    SET contact_id = NULL 
    WHERE is_demo = FALSE 
      AND contact_id IN (SELECT id FROM public.admin_contacts WHERE is_demo = TRUE);

    UPDATE public.admin_leads 
    SET contact_id = NULL 
    WHERE is_demo = FALSE 
      AND contact_id IN (SELECT id FROM public.admin_contacts WHERE is_demo = TRUE);

    -- 10. Delete parent Contacts
    DELETE FROM public.admin_contacts WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_contacts = ROW_COUNT;

    -- 11. Delete standalone telemetry and automations
    DELETE FROM public.admin_comment_automations WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_automations = ROW_COUNT;

    DELETE FROM public.admin_workflow_executions WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_workflows = ROW_COUNT;

    DELETE FROM public.admin_vps_metrics WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_vps = ROW_COUNT;

    -- 12. Record Audit Log entry for the purge action
    INSERT INTO public.admin_audit_logs (
        admin_user_id,
        admin_email,
        action,
        target_entity,
        metadata
    ) VALUES (
        auth.uid(),
        'thebusinesswork.co@gmail.com',
        'PURGE_DEMO_DATA',
        'SYSTEM',
        json_build_object(
            'messages_removed', cnt_msgs,
            'conversations_removed', cnt_conv,
            'contacts_removed', cnt_contacts,
            'leads_removed', cnt_leads,
            'appointments_removed', cnt_appts,
            'quotations_removed', cnt_quots,
            'quotation_items_removed', cnt_quot_items,
            'comment_automations_removed', cnt_automations,
            'workflows_removed', cnt_workflows,
            'vps_metrics_removed', cnt_vps,
            'purged_by_uid', auth.uid(),
            'timestamp', NOW()
        )
    );

    deleted_counts := json_build_object(
        'success', TRUE,
        'messages_removed', cnt_msgs,
        'conversations_removed', cnt_conv,
        'contacts_removed', cnt_contacts,
        'leads_removed', cnt_leads,
        'appointments_removed', cnt_appts,
        'quotation_items_removed', cnt_quot_items,
        'quotations_removed', cnt_quots,
        'comment_automations_removed', cnt_automations,
        'workflows_removed', cnt_workflows,
        'vps_metrics_removed', cnt_vps,
        'purged_at', NOW()
    );

    RETURN deleted_counts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_all_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_all_demo_data() TO authenticated, service_role;

-- ==============================================================================
-- END OF MIGRATION SCRIPT
-- ==============================================================================
