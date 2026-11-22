# THE BUSINESS WORK — SQL MIGRATION ROLLBACK PLAN
**Emergency Reversion Procedures & Risk Mitigation Runbook**  
**Database:** Supabase PostgreSQL (`mkeostxsprhhknmznpke`)  
**Standard:** Zero Impact on Core Business Data (Contacts, Appointments, Leads Preserved)  
**Author:** Senior PostgreSQL DBA & Reliability Engineer  

---

## 1. ROLLBACK SAFETY GUARANTEES

Before any rollback is initiated, review these core safety guarantees:
1. **18 Core Tables Untouched:** All 18 existing tables (`admin_contacts`, `admin_conversations`, `admin_messages`, `admin_leads`, `admin_appointments`, etc.) will NOT be dropped or truncated.
2. **Reverse Sequence Execution:** Rollbacks must be executed in strict reverse chronological order (Phase 6 down to Phase 1) to respect foreign key constraints.
3. **Data Preservation:** Contact phone numbers, conversation histories, and Google Calendar event links remain fully intact even if session tracking tables are reverted.

---

## 2. REVERSE-ORDER ROLLBACK RUNBOOK

If any migration needs to be reverted, execute the corresponding block in the [Supabase SQL Editor](https://supabase.com/dashboard/project/mkeostxsprhhknmznpke/sql):

### Rollback Step 1: Revert Stored Functions (Migration `20261026_05`)
```sql
-- Step 1: Drop Stored Functions
DROP FUNCTION IF EXISTS public.claim_wa_follow_up_atomic(TEXT, INT);
DROP FUNCTION IF EXISTS public.expire_wa_sessions_atomic();
DROP FUNCTION IF EXISTS public.register_inbound_customer_message(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_bot_outgoing_dispatch(TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.trigger_human_takeover_atomic(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.can_send_appointment_reminder(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.record_appointment_reminder_atomic(TEXT, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT);
```

---

### Rollback Step 2: Revert Appointment Reminder Logs (Migration `20261026_04`)
```sql
-- Step 2: Drop Appointment Reminder Logs Table
DROP TABLE IF EXISTS public.appointment_reminder_logs CASCADE;
```

---

### Rollback Step 3: Revert Instagram DM Sessions (Migration `20261026_03`)
```sql
-- Step 3: Remove from Realtime Publication and Drop IG Session Tables
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.ig_sessions;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.ig_session_events;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
END $$;

DROP TABLE IF EXISTS public.ig_session_events CASCADE;
DROP TABLE IF EXISTS public.ig_sessions CASCADE;
```

---

### Rollback Step 4: Revert Idempotency Ledgers (Migration `20261026_02`)
```sql
-- Step 4: Drop Idempotency Tables
DROP TABLE IF EXISTS public.outgoing_message_idempotency CASCADE;
DROP TABLE IF EXISTS public.webhook_idempotency_log CASCADE;
```

---

### Rollback Step 5: Revert WhatsApp Enhancements (Migration `20261026_01`)
```sql
-- Step 5: Remove additive columns and constraints from wa_* tables
ALTER TABLE public.wa_admin_notifications 
    DROP CONSTRAINT IF EXISTS uq_wa_admin_notifications_session_type;

ALTER TABLE public.wa_sessions 
    DROP CONSTRAINT IF EXISTS chk_wa_sessions_follow_up_status,
    DROP COLUMN IF EXISTS customer_phone,
    DROP COLUMN IF EXISTS follow_up_status,
    DROP COLUMN IF EXISTS last_customer_activity_at;

ALTER TABLE public.wa_contacts 
    DROP COLUMN IF EXISTS preferred_language,
    DROP COLUMN IF EXISTS preferences,
    DROP COLUMN IF EXISTS is_blocked,
    DROP COLUMN IF EXISTS total_sessions_count;
```

---

### Rollback Step 6: Revert Baseline WhatsApp Tables (Migration `20261025`)
```sql
-- Step 6: Remove Realtime Publication and Drop wa_* Tables
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.wa_contacts;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.wa_sessions;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.wa_admin_notifications;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.wa_session_events;
    EXCEPTION WHEN undefined_object THEN NULL;
    END;
END $$;

DROP TABLE IF EXISTS public.wa_session_events CASCADE;
DROP TABLE IF EXISTS public.wa_admin_notifications CASCADE;
DROP TABLE IF EXISTS public.wa_sessions CASCADE;
DROP TABLE IF EXISTS public.wa_contacts CASCADE;
```

---

### Rollback Step 7: Revert Instagram Synced Reels Cache (Migration `20261023`)
```sql
-- Step 7: Drop instagram_synced_reels table
DROP TABLE IF EXISTS public.instagram_synced_reels CASCADE;
```

---

## 3. APPLICATION FALLBACK BEHAVIOR DURING ROLLBACK

If the database is rolled back to the pre-migration baseline (18 tables):
- **Dashboard Fallback:** Next.js automatically engages `inMemorySessions`, `inMemoryContacts`, and `inMemoryNotifications` located in `src/lib/whatsapp/session-manager.ts`. The UI remains fully functional.
- **n8n Webhooks:** n8n webhooks continue to log directly into `admin_contacts`, `admin_conversations`, and `admin_messages`.
- **Zero Customer Interruption:** Customers can continue messaging via WhatsApp and Instagram without receiving 500 error responses.
