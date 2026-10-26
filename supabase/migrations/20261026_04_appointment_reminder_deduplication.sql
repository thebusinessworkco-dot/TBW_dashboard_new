-- ==============================================================================
-- THE BUSINESS WORK — APPOINTMENT REMINDER DEDUPLICATION LEDGER
-- Migration: 20261026_04_appointment_reminder_deduplication.sql
-- Description:
-- 1. Creates public.appointment_reminder_logs to permanently eliminate the 1-minute reminder loop
-- 2. Enforces unique constraint on (calendar_event_id, reminder_type)
-- 3. Enables Row Level Security and indexing for high-frequency queries
--
-- BUSINESS PROBLEM SOLVED:
-- In n8n workflow VBrjbhPeDypXt12q, node "Every Minute - Appointment Reminders" fires every 60s.
-- If Google Calendar description updates lag or fail, reminders loop infinitely.
-- This database table enforces strict, durable deduplication at the database layer.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.appointment_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_event_id TEXT NOT NULL,
    appointment_id UUID REFERENCES public.admin_appointments(id) ON DELETE SET NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT DEFAULT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30M_BEFORE', '24H_BEFORE', 'DAY_OF')),
    scheduled_start TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    provider_message_id TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_appointment_reminder UNIQUE (calendar_event_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_appt_reminders_event_type 
    ON public.appointment_reminder_logs (calendar_event_id, reminder_type);

CREATE INDEX IF NOT EXISTS idx_appt_reminders_phone 
    ON public.appointment_reminder_logs (customer_phone, dispatched_at DESC);

CREATE INDEX IF NOT EXISTS idx_appt_reminders_status 
    ON public.appointment_reminder_logs (status);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.appointment_reminder_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_reminder_logs_admin_policy ON public.appointment_reminder_logs;

CREATE POLICY appointment_reminder_logs_admin_policy ON public.appointment_reminder_logs
    FOR ALL TO authenticated
    USING (public.is_authorized_admin())
    WITH CHECK (public.is_authorized_admin());

GRANT ALL ON public.appointment_reminder_logs TO service_role, authenticated;
