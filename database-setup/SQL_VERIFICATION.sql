-- ==============================================================================
-- THE BUSINESS WORK — COMPREHENSIVE SQL VERIFICATION & HEALTH TEST SUITE
-- Script: database-setup/SQL_VERIFICATION.sql
-- Description:
-- Fully automated, non-destructive test suite validating tables, columns,
-- constraints, indexes, RLS security policies, stored functions, and Realtime publications.
--
-- RUN INSTRUCTION:
-- Execute this entire script in Supabase Dashboard SQL Editor after running migrations.
-- All tests must output 'PASS'. Any 'FAIL' indicates an incomplete migration.
-- ==============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting The Business Work Database Verification Suite...';
END $$;

WITH table_checks AS (
    SELECT 
        'Table Existence' AS test_category,
        t.expected_table AS object_name,
        CASE WHEN c.table_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
        CASE WHEN c.table_name IS NOT NULL 
            THEN 'Table exists in public schema' 
            ELSE 'CRITICAL: Table is missing from public schema!' 
        END AS details
    FROM (
        VALUES 
            ('admin_user_allowlist'),
            ('admin_contacts'),
            ('admin_conversations'),
            ('admin_messages'),
            ('admin_leads'),
            ('admin_appointments'),
            ('admin_quotations'),
            ('admin_quotation_items'),
            ('admin_comment_automations'),
            ('admin_workflow_executions'),
            ('admin_vps_metrics'),
            ('admin_integration_status'),
            ('admin_audit_logs'),
            ('instagram_reel_rules'),
            ('instagram_comment_intents'),
            ('instagram_customer_context'),
            ('instagram_automation_events'),
            ('instagram_synced_reels'),
            ('admin_settings'),
            ('wa_contacts'),
            ('wa_sessions'),
            ('wa_admin_notifications'),
            ('wa_session_events'),
            ('webhook_idempotency_log'),
            ('outgoing_message_idempotency'),
            ('ig_sessions'),
            ('ig_session_events'),
            ('appointment_reminder_logs')
    ) AS t(expected_table)
    LEFT JOIN information_schema.tables c 
        ON c.table_schema = 'public' AND c.table_name = t.expected_table
),
column_checks AS (
    SELECT 
        'Critical Column Existence' AS test_category,
        col.tbl || '.' || col.col AS object_name,
        CASE WHEN c.column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
        CASE WHEN c.column_name IS NOT NULL 
            THEN 'Column exists with data type: ' || c.data_type 
            ELSE 'CRITICAL: Required column missing!' 
        END AS details
    FROM (
        VALUES 
            ('wa_contacts', 'normalized_phone'),
            ('wa_contacts', 'preferred_language'),
            ('wa_contacts', 'total_sessions_count'),
            ('wa_sessions', 'session_id'),
            ('wa_sessions', 'customer_phone'),
            ('wa_sessions', 'follow_up_status'),
            ('wa_sessions', 'follow_up_due_at'),
            ('wa_sessions', 'follow_up_sent_at'),
            ('wa_sessions', 'expires_at'),
            ('wa_sessions', 'human_takeover_active'),
            ('wa_admin_notifications', 'session_id'),
            ('wa_admin_notifications', 'notification_type'),
            ('webhook_idempotency_log', 'event_id'),
            ('webhook_idempotency_log', 'channel'),
            ('outgoing_message_idempotency', 'idempotency_key'),
            ('ig_sessions', 'ig_user_id'),
            ('ig_sessions', 'inactivity_expires_at'),
            ('appointment_reminder_logs', 'calendar_event_id'),
            ('appointment_reminder_logs', 'reminder_type')
    ) AS col(tbl, col)
    LEFT JOIN information_schema.columns c 
        ON c.table_schema = 'public' AND c.table_name = col.tbl AND c.column_name = col.col
),
constraint_checks AS (
    SELECT 
        'Unique Constraint Verification' AS test_category,
        u.tbl || ' -> ' || u.constraint_name AS object_name,
        CASE WHEN tc.constraint_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
        CASE WHEN tc.constraint_name IS NOT NULL 
            THEN 'Unique / PK constraint is strictly enforced' 
            ELSE 'CRITICAL: Unique constraint is missing!' 
        END AS details
    FROM (
        VALUES 
            ('wa_contacts', 'wa_contacts_normalized_phone_key'),
            ('wa_sessions', 'wa_sessions_session_id_key'),
            ('wa_admin_notifications', 'uq_wa_admin_notifications_session_type'),
            ('appointment_reminder_logs', 'uq_appointment_reminder'),
            ('webhook_idempotency_log', 'webhook_idempotency_log_pkey'),
            ('outgoing_message_idempotency', 'outgoing_message_idempotency_pkey'),
            ('ig_sessions', 'ig_sessions_session_id_key')
    ) AS u(tbl, constraint_name)
    LEFT JOIN information_schema.table_constraints tc 
        ON tc.table_schema = 'public' AND tc.table_name = u.tbl AND tc.constraint_name = u.constraint_name
),
rls_checks AS (
    SELECT 
        'Row Level Security (RLS)' AS test_category,
        r.tbl AS object_name,
        CASE WHEN c.rowsecurity = true THEN 'PASS' ELSE 'FAIL' END AS status,
        CASE WHEN c.rowsecurity = true 
            THEN 'RLS is ENABLED on table' 
            ELSE 'CRITICAL SECURITY HAZARD: RLS is disabled!' 
        END AS details
    FROM (
        VALUES 
            ('wa_contacts'),
            ('wa_sessions'),
            ('wa_admin_notifications'),
            ('wa_session_events'),
            ('webhook_idempotency_log'),
            ('outgoing_message_idempotency'),
            ('ig_sessions'),
            ('ig_session_events'),
            ('appointment_reminder_logs')
    ) AS r(tbl)
    LEFT JOIN pg_tables c 
        ON c.schemaname = 'public' AND c.tablename = r.tbl
),
function_checks AS (
    SELECT 
        'Atomic Stored Functions' AS test_category,
        f.func_name AS object_name,
        CASE WHEN p.proname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
        CASE WHEN p.proname IS NOT NULL 
            THEN 'Stored function exists and is compiled' 
            ELSE 'CRITICAL: Required stored function is missing!' 
        END AS details
    FROM (
        VALUES 
            ('claim_wa_follow_up_atomic'),
            ('expire_wa_sessions_atomic'),
            ('register_inbound_customer_message'),
            ('record_bot_outgoing_dispatch'),
            ('trigger_human_takeover_atomic'),
            ('can_send_appointment_reminder'),
            ('record_appointment_reminder_atomic'),
            ('is_authorized_admin')
    ) AS f(func_name)
    LEFT JOIN pg_proc p 
        ON p.pronamespace = 'public'::regnamespace AND p.proname = f.func_name
),
realtime_checks AS (
    SELECT 
        'Realtime Publication' AS test_category,
        rt.tbl AS object_name,
        CASE WHEN pr.prrelid IS NOT NULL THEN 'PASS' ELSE 'WARNING' END AS status,
        CASE WHEN pr.prrelid IS NOT NULL 
            THEN 'Table is included in supabase_realtime publication' 
            ELSE 'Realtime not enabled on table (Dashboard live feeds will require manual reload)' 
        END AS details
    FROM (
        VALUES 
            ('wa_contacts'),
            ('wa_sessions'),
            ('wa_admin_notifications'),
            ('wa_session_events'),
            ('admin_messages'),
            ('admin_conversations')
    ) AS rt(tbl)
    LEFT JOIN pg_publication_rel pr 
        ON pr.prrelid = ('public.' || rt.tbl)::regclass
    LEFT JOIN pg_publication pub 
        ON pub.oid = pr.prpubid AND pub.pubname = 'supabase_realtime'
)
SELECT * FROM table_checks
UNION ALL
SELECT * FROM column_checks
UNION ALL
SELECT * FROM constraint_checks
UNION ALL
SELECT * FROM rls_checks
UNION ALL
SELECT * FROM function_checks
UNION ALL
SELECT * FROM realtime_checks
ORDER BY test_category, status DESC, object_name;
