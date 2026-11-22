# The Business Work — Final predeployment safety review

**Decision: NO-GO — production deployment not approved or performed.**

**Date:** 26 October 2026
**Evidence:** User-uploaded V4 JSON (93 nodes), n8n audit/inventory and Antigravity preflight reports. No live services were accessed or modified.

## Findings

| ID | Verification | Status | Key evidence |
|---|---|---|---|
| WF001 | Original workflow JSON parsing | PASS | Parsed 93 nodes and 73 connection keys. |
| WF002 | Persistent WhatsApp session | FAIL | Language code: uses $getWorkflowStaticData and mem.sessions, rather than durable session tables. |
| WF003 | Persistent Instagram DM session | FAIL | Instagram DM node uses $getWorkflowStaticData('global') and data.igProSessions. |
| WF004 | Language preserved on session expiry | FAIL | Language code lines 34–42: after 20-minute inactivity, newSession resets language to empty string. |
| WF005 | Persistent incoming message-ID dedup | FAIL | Language code line 39 checks only s.lastMsgId == msg.id; n8n staticData not durable. |
| WF006 | Requested menu order | FAIL | Language code lines 144–155 welcomes into intent menu with Appointment or Services; language is only requested after Services; no Talk to Human choice in that menu. |
| WF007 | One follow-up at 3 min | NOT VERIFIED | No identifiable three-minute inactivity scheduler/atomic DB follow-up path in uploaded JSON. |
| WF008 | Session closure after 20 min | PARTIAL | Language code uses 20-minute expiry, but reset happens on next customer message; no verified independent 20-minute session-closing scheduler in uploaded JSON. |
| WF009 | Appointment reminder dedup | FAIL | Prepare Due WhatsApp Template Reminders uses 9–11 min window; Send Approved WhatsApp 10-Minute Reminder precedes Mark Calendar Reminder as Sent; skip test relies on description REMINDER_STATUS=SENT. |
| WF010 | Original/live version equivalence | NOT VERIFIED | Uploaded V4 has 93 nodes but no Trigger WhatsApp Session Monitor node mentioned in external audit; old file has 10-minute reminders, audit describes 30-minute. |
| DB001 | Real PostgreSQL staging migration test | BLOCKED | All 7 migration SQL files absent from accessible current runtime; no staging Postgres endpoint or credentials provided. |
| DB002 | Actual backup restoration | BLOCKED | External report references local Windows JSON backup, but backup bytes and staging target are not available in current runtime. |
| DB003 | Live Supabase RLS and RPC permissions | BLOCKED | No authenticated live Supabase connection or SQL artifacts in the current runtime. |
| DB004 | End-to-end delivery idempotency | BLOCKED | No staging Meta mock/API execution logs or current code deployment available; one-time DB claims do not imply successful external delivery. |
| DB005 | SQL project reference | REPORTED NOT INDEPENDENTLY VERIFIED | External latest report identifies mkeostxsprhhknmznpke as production; this runtime has no database authorization to reconfirm. |

## Strict blockers before any production approval

1. Obtain and compare a fresh live export of workflow `VBrjbhPeDypXt12q` to this V4 file.
2. Obtain all 7 actual SQL migration files and restore-capable database backup; test against isolated real PostgreSQL staging database.
3. Verify RLS policies, effective grants, and SECURITY DEFINER procedure invocation as real `anon`, `authenticated`, and `service_role` roles.
4. Integrate SQL session and idempotency APIs with actual n8n and Next.js nodes; static schema alone cannot fix message duplication.
5. Run deterministic tests: message hello; language first; three menu choices; human takeover; 3-min one-time follow-up; customer at 2:59; customer at 3:00 concurrent race; 20-min silent close; first message after close; Meta retry; multiple workers; send timeout; reminder status-write failure; Instagram equivalents.
6. Confirm correct Supabase project from active deployment configuration (external report claims `mkeostxsprhhknmznpke`), then produce rollback rehearsal evidence.

## Production rollout after approval

- Backup, freeze message sends during cutover as needed, apply migrations in dependency order and confirm actual DDL.
- Deploy Next.js session API route and customer-phone recipient fix; patch n8n message routing, language persistence and one-time outbox.
- Verify no unexpected messages with staging/mocked Meta transport before gradual rollout.
- Retain both business workflows until cutover and measure errors, webhook duplicates, follow-up counts and provider send attempts.

## Migration order (per supplied Antigravity report)
1. `20261023_add_instagram_synced_reels_cache.sql`
2. `20261025_whatsapp_v6_session_management.sql`
3. `20261026_01_wa_session_enhancements_and_rls.sql`
4. `20261026_02_webhook_and_outgoing_idempotency.sql`
5. `20261026_03_instagram_dm_sessions.sql`
6. `20261026_04_appointment_reminder_deduplication.sql`
7. `20261026_05_atomic_session_concurrency_functions.sql`

**Important:** External audit says its JSON backup was parsed, but it does not document a complete `pg_restore` rehearsal. Claims of “mathematically impossible duplicate delivery” and “zero customer risk” are not proven. A DB exactly-once claim may prevent repeats while still losing a message if the process crashes before the provider send.

This report does not contain credentials or customer details.