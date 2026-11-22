# THE BUSINESS WORK — SQL DATABASE SETUP GUIDE
**Production Migration & Deployment Runbook for Supabase PostgreSQL**  
**Database Architecture Classification:** Production Reliability Standard  
**Target Project:** `mkeostxsprhhknmznpke` (Supabase Managed PostgreSQL 15.8)  
**Region:** `ap-southeast-1` | **Author:** Senior PostgreSQL DBA & Automation Architect  

---

## 1. EXECUTIVE SUMMARY & ENVIRONMENT CONTEXT

This runbook guides the safe, zero-downtime execution of database migrations for **The Business Work** automation system. The architecture connects:
- **Next.js Admin Dashboard** (`dashboard.thebusinesswork.com`)
- **Self-Hosted n8n Engine** (`n8n.thebusinesswork.com`)
- **Meta WhatsApp Cloud API** (Phone ID: `1392092143987065`, Number: `+91 7972020292`)
- **Admin Alert Line** (`+91 8604600292`)
- **Instagram DM & Reels Engine** (`@thebusinesswork`)
- **Google Sheets & Primary Calendar**

### Database State Baseline:
- **Active Live Tables:** 18 tables verified operational in Supabase.
- **Unmigrated / Pending Tables:** 7 tables (`instagram_synced_reels`, `wa_contacts`, `wa_sessions`, `wa_admin_notifications`, `wa_session_events`, `webhook_idempotency_log`, `outgoing_message_idempotency`, `ig_sessions`, `ig_session_events`, `appointment_reminder_logs`).
- **Safety Standard:** 100% additive, non-blocking, idempotent migrations. No tables, columns, or data are dropped or truncated.

---

## 2. OFFICIAL SUPABASE SQL EDITOR ACCESS

All migrations must be executed via the official Supabase Dashboard SQL Editor:
- **Project Reference:** `mkeostxsprhhknmznpke`
- **Supabase Project URL:** [https://supabase.com/dashboard/project/mkeostxsprhhknmznpke](https://supabase.com/dashboard/project/mkeostxsprhhknmznpke)
- **Direct SQL Editor URL:** [https://supabase.com/dashboard/project/mkeostxsprhhknmznpke/sql](https://supabase.com/dashboard/project/mkeostxsprhhknmznpke/sql)
- **Pooler Connection String:** `ep-mute-star-a1s9p43m.ap-southeast-1.pooler.supabase.com:5432/postgres`

---

## 3. COMPLETE MIGRATION INVENTORY & STATUS

| Sequence | Migration Filename | Scope / Purpose | Status |
| :---: | :--- | :--- | :---: |
| **01** | `20261021_init_admin_dashboard.sql` | Core 12 isolated admin tables, auth allowlist, RLS policies | **ALREADY APPLIED** |
| **02** | `20261022_add_instagram_scoped_id.sql` | `instagram_scoped_id` column on `admin_contacts` | **ALREADY APPLIED** |
| **03** | `20261022_add_whatsapp_phone_unique_index.sql` | Phone deduplication index on `admin_contacts` | **ALREADY APPLIED** |
| **04** | `20261022_add_whatsapp_realtime_and_metadata.sql` | Realtime publication & message metadata | **ALREADY APPLIED** |
| **05** | `20261023_add_instagram_reels_automation.sql` | Reel rules, comment intents, customer context, admin settings | **ALREADY APPLIED** |
| **06** | `20261023_add_instagram_synced_reels_cache.sql` | Synced Instagram reels discovery cache | **PENDING EXECUTION** |
| **07** | `20261024_add_public_replies_and_availability.sql` | Public reply templates & booking slots | **ALREADY APPLIED** |
| **08** | `20261025_whatsapp_v6_session_management.sql` | Baseline `wa_contacts`, `wa_sessions`, `wa_admin_notifications`, `wa_session_events` | **PENDING EXECUTION** |
| **09** | `20261026_01_wa_session_enhancements_and_rls.sql` | `preferred_language` on contacts, phone on sessions, deduplication unique constraints, RLS | **PENDING EXECUTION** |
| **10** | `20261026_02_webhook_and_outgoing_idempotency.sql` | `webhook_idempotency_log` and `outgoing_message_idempotency` for WhatsApp & IG | **PENDING EXECUTION** |
| **11** | `20261026_03_instagram_dm_sessions.sql` | `ig_sessions` & `ig_session_events` for independent IG session lifecycle | **PENDING EXECUTION** |
| **12** | `20261026_04_appointment_reminder_deduplication.sql` | `appointment_reminder_logs` eliminating 1-minute infinite reminder loops | **PENDING EXECUTION** |
| **13** | `20261026_05_atomic_session_concurrency_functions.sql` | Atomic stored procedures (`SKIP LOCKED`, inbound handler, 3m claimer, 20m expiry) | **PENDING EXECUTION** |

---

## 4. STEP-BY-STEP DEPLOYMENT RUNBOOK

### Pre-Deployment Verification
Before executing SQL, open [Supabase SQL Editor](https://supabase.com/dashboard/project/mkeostxsprhhknmznpke/sql) and run:
```sql
SELECT current_database(), current_user, version();
```
Confirm the output shows PostgreSQL 15.x on the correct database.

---

### Phase 1: Instagram Cache & WhatsApp Baseline Migration
Open a new query tab in Supabase SQL Editor:
1. Paste contents of [`supabase/migrations/20261023_add_instagram_synced_reels_cache.sql`](file:///c:/Users/amanr/Downloads/dashborad/supabase/migrations/20261023_add_instagram_synced_reels_cache.sql).
2. Click **Run** (or `Ctrl+Enter`). Verify `Success. No rows returned`.
3. Paste contents of [`supabase/migrations/20261025_whatsapp_v6_session_management.sql`](file:///c:/Users/amanr/Downloads/dashborad/supabase/migrations/20261025_whatsapp_v6_session_management.sql).
4. Click **Run**. Verify `Success. No rows returned`.

---

### Phase 2: WhatsApp Session Enhancements & Security Hardening
1. Paste contents of [`supabase/migrations/20261026_01_wa_session_enhancements_and_rls.sql`](file:///c:/Users/amanr/Downloads/dashborad/supabase/migrations/20261026_01_wa_session_enhancements_and_rls.sql).
2. Click **Run**.
3. Confirms:
   - `preferred_language` added to `wa_contacts`.
   - `customer_phone` and `follow_up_status` added to `wa_sessions`.
   - Unique constraint `uq_wa_admin_notifications_session_type` enforced.
   - Row Level Security active on all 4 `wa_*` tables.

---

### Phase 3: Idempotency & Webhook Deduplication
1. Paste contents of [`supabase/migrations/20261026_02_webhook_and_outgoing_idempotency.sql`](file:///c:/Users/amanr/Downloads/dashborad/supabase/migrations/20261026_02_webhook_and_outgoing_idempotency.sql).
2. Click **Run**.
3. Confirms:
   - `webhook_idempotency_log` ready to absorb Meta retry storms.
   - `outgoing_message_idempotency` ready to gate dispatch workers.

---

### Phase 4: Instagram DM Independent Sessions
1. Paste contents of [`supabase/migrations/20261026_03_instagram_dm_sessions.sql`](file:///c:/Users/amanr/Downloads/dashborad/supabase/migrations/20261026_03_instagram_dm_sessions.sql).
2. Click **Run**.
3. Confirms:
   - `ig_sessions` and `ig_session_events` created with independent timers and RLS.

---

### Phase 5: Appointment Reminder Loop Fix
1. Paste contents of [`supabase/migrations/20261026_04_appointment_reminder_deduplication.sql`](file:///c:/Users/amanr/Downloads/dashborad/supabase/migrations/20261026_04_appointment_reminder_deduplication.sql).
2. Click **Run**.
3. Confirms:
   - `appointment_reminder_logs` active with `(calendar_event_id, reminder_type)` uniqueness.

---

### Phase 6: Atomic PostgreSQL Concurrency Functions
1. Paste contents of [`supabase/migrations/20261026_05_atomic_session_concurrency_functions.sql`](file:///c:/Users/amanr/Downloads/dashborad/supabase/migrations/20261026_05_atomic_session_concurrency_functions.sql).
2. Click **Run**.
3. Confirms:
   - `claim_wa_follow_up_atomic` (Uses `FOR UPDATE SKIP LOCKED` for zero follow-up collision).
   - `expire_wa_sessions_atomic` (Atomically closes expired sessions).
   - `register_inbound_customer_message` (Atomic identity, session, and deduplication pipeline).
   - `record_bot_outgoing_dispatch` (Bot messages strictly forbidden from resetting customer timers).
   - `trigger_human_takeover_atomic` (Exactly one alert dispatch).

---

## 5. POST-DEPLOYMENT VERIFICATION

Execute the comprehensive automated verification suite:
- File: [`database-setup/SQL_VERIFICATION.sql`](file:///c:/Users/amanr/Downloads/dashborad/database-setup/SQL_VERIFICATION.sql)
- Paste in Supabase SQL Editor and click **Run**.
- Ensure all tests return `STATUS: PASS`.
