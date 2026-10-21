-- ==============================================================================
-- THE BUSINESS WORK — ADMIN DASHBOARD DATABASE MIGRATION
-- Project: The Business Work (thebusinesswork.com)
-- Administrator: thebusinesswork.co@gmail.com
-- Purpose: Isolated admin control center tables for WhatsApp, Instagram,
--          Leads, Appointments, Quotations, n8n workflows, and VPS metrics.
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
CREATE INDEX IF NOT EXISTS idx_admin_contacts_demo ON public.admin_contacts(is_demo);

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
CREATE INDEX IF NOT EXISTS idx_admin_conversations_demo ON public.admin_conversations(is_demo);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_last_msg ON public.admin_conversations(last_message_at DESC);

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
    external_message_id TEXT, -- Meta message ID for idempotency & deduplication
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_conv ON public.admin_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_ext_id ON public.admin_messages(external_message_id);
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
CREATE INDEX IF NOT EXISTS idx_admin_leads_demo ON public.admin_leads(is_demo);

-- 5. ADMIN APPOINTMENTS
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_appointments_date ON public.admin_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_status ON public.admin_appointments(status);
CREATE INDEX IF NOT EXISTS idx_admin_appointments_demo ON public.admin_appointments(is_demo);

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

-- 7. ADMIN QUOTATION ITEMS
CREATE TABLE IF NOT EXISTS public.admin_quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES public.admin_quotations(id) ON DELETE CASCADE,
    service_category TEXT NOT NULL,
    service_name TEXT NOT NULL,
    description TEXT,
    quantity INT DEFAULT 1,
    setup_charge NUMERIC(12, 2) DEFAULT 0,
    monthly_recurring_charge NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_quotation_items_q ON public.admin_quotation_items(quotation_id);

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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_comment_auto_media ON public.admin_comment_automations(reel_media_id);

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
    is_demo BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_admin_wf_exec_wf_id ON public.admin_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_admin_wf_exec_status ON public.admin_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_admin_wf_exec_started ON public.admin_workflow_executions(started_at DESC);

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
    is_demo BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_admin_vps_checked ON public.admin_vps_metrics(last_checked_at DESC);

-- 11. ADMIN INTEGRATION STATUS
CREATE TABLE IF NOT EXISTS public.admin_integration_status (
    service_name TEXT PRIMARY KEY CHECK (service_name IN ('supabase', 'whatsapp', 'instagram', 'n8n', 'google_sheets', 'vps')),
    status TEXT NOT NULL CHECK (status IN ('connected', 'disconnected', 'error')),
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    details JSONB
);

-- 12. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Only the authorized administrator email 'thebusinesswork.co@gmail.com'
-- is permitted to query or modify admin tables.
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

-- Allowlist policy function
CREATE OR REPLACE FUNCTION public.is_authorized_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() ->> 'email') = 'thebusinesswork.co@gmail.com';
$$;

-- Apply allowlist access policy across all admin tables
CREATE POLICY admin_contacts_policy ON public.admin_contacts FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_conversations_policy ON public.admin_conversations FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_messages_policy ON public.admin_messages FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_leads_policy ON public.admin_leads FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_appointments_policy ON public.admin_appointments FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_quotations_policy ON public.admin_quotations FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_quotation_items_policy ON public.admin_quotation_items FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_comment_automations_policy ON public.admin_comment_automations FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_workflow_executions_policy ON public.admin_workflow_executions FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_vps_metrics_policy ON public.admin_vps_metrics FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_integration_status_policy ON public.admin_integration_status FOR ALL USING (public.is_authorized_admin());
CREATE POLICY admin_audit_logs_policy ON public.admin_audit_logs FOR ALL USING (public.is_authorized_admin());

-- ==============================================================================
-- SAFE DEMO PURGE FUNCTION (Settings: "Remove All Demo Data")
-- Deletes ONLY records where is_demo = TRUE.
-- Never touches production records, users, or external sheets.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.remove_all_demo_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_counts JSON;
    cnt_conv INT;
    cnt_leads INT;
    cnt_appts INT;
    cnt_quots INT;
    cnt_automations INT;
BEGIN
    IF NOT public.is_authorized_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only thebusinesswork.co@gmail.com can remove demo data';
    END IF;

    DELETE FROM public.admin_messages WHERE is_demo = TRUE;
    DELETE FROM public.admin_conversations WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_conv = ROW_COUNT;

    DELETE FROM public.admin_contacts WHERE is_demo = TRUE;
    
    DELETE FROM public.admin_leads WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_leads = ROW_COUNT;

    DELETE FROM public.admin_appointments WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_appts = ROW_COUNT;

    DELETE FROM public.admin_quotation_items WHERE quotation_id IN (SELECT id FROM public.admin_quotations WHERE is_demo = TRUE);
    DELETE FROM public.admin_quotations WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_quots = ROW_COUNT;

    DELETE FROM public.admin_comment_automations WHERE is_demo = TRUE;
    GET DIAGNOSTICS cnt_automations = ROW_COUNT;

    DELETE FROM public.admin_workflow_executions WHERE is_demo = TRUE;
    DELETE FROM public.admin_vps_metrics WHERE is_demo = TRUE;

    deleted_counts := json_build_object(
        'conversations_removed', cnt_conv,
        'leads_removed', cnt_leads,
        'appointments_removed', cnt_appts,
        'quotations_removed', cnt_quots,
        'comment_automations_removed', cnt_automations,
        'purged_at', NOW()
    );

    RETURN deleted_counts;
END;
$$;
