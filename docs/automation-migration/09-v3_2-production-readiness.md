# TBW v3.2 — Production Readiness & Critical Fixes Report

**Branch:** `chore/automation-cleanup-migration-prep`  
**Date:** October 28, 2026  
**Auditor & Lead Integration Engineer:** Principal Full-Stack & n8n Specialist  
**Target:** Safe Inactive Integration Workflows for The Business Work  
**Deployment Status:** FROZEN (Development & Validation Only)

---

## Executive Summary

Following an independent architectural review, all 10 identified integration problems in the v3.1 workflows have been resolved in **TBW v3.2**:

1. **WhatsApp Fail-Closed Human Takeover:** Node `04c - Evaluate Takeover State` strictly enforces explicit authorization (`can_respond: true`, `mode: 'ai'`, `manual_takeover !== true`, `automation_paused !== true`). Any missing field, 401/404/500 HTTP status, or network failure fails closed, immediately suppressing automated conversational replies.
2. **Customer-Initiated Handover Protection:** When a customer selects "Talk to Human", `s.human_requested = true` is set and preserved. The session remains in `human_wait` even if the dashboard's `manual_takeover` flag is OFF, preventing accidental return to bot dialogs.
3. **Timer & DNS Retry Safety:** Nudges and retries are suppressed if customer requested human handover or takeover is active. Successfully accepted timer nudges and DNS retries are logged to the dashboard with their real provider message IDs (`wamid`), with zero duplicate sends.
4. **Instagram Fail-Closed DM Takeover:** Node `IG - Evaluate DM Takeover` strictly requires explicit authorization (`approved: true`, `reply_allowed: true`, `mode: 'ai'`). Any error or missing field suppresses automated DMs while keeping inbound DM logging active.
5. **Instagram Nudge Suppression During Takeover:** Added `IG - Check Nudge Takeover` and `IG - Nudge Allowed?` immediately before `IG - Send One Nudge`. If manual takeover is active when the 3-minute timer fires, the nudge is dropped.
6. **Real Outgoing DM Recording:** Node `IG - Log Outbound DM to Dashboard` logs the actual text content from `igPayload.message.text` or `igPayload.message.attachment.payload.text`, extracts button CTA metadata ("Chat on WhatsApp"), and logs the actual Meta `provider_message_id`. Clean button design is preserved without long URLs in customer chat text.
7. **Complete Message Status Synchronization:** Handled out-of-order status receipts in `/api/n8n/webhook`, preventing `read` messages from being downgraded to `delivered` or `sent`.
8. **Exact Authentication Header Verification:** Tested and verified support for `x-n8n-secret`, `x-n8n-api-key`, and `Authorization: Bearer <secret>`.
9. **Protection of Live Workflow IDs & State:** Generated new unique workflow IDs for both exports (`31f28b21-49b9-4a94-9e3d-8d8a57ba8d01` and `48e69b22-8321-4f34-b912-7dc28ba17ef2`), with `active: false`, guaranteeing that importing them into n8n will never overwrite existing live workflows.
10. **Preservation of Core Logic:** Zero changes to appointment booking, Google Sheets schemas, Google Calendar events, languages (EN, HI, Hinglish, MR), services, or Next.js UI.
11. **Comprehensive Verification:** 66/66 tests passed (`scratch/test_complete_integration_suite.ts`). Next.js Turbopack build, TypeScript check, and ESLint all passed with 0 errors.

---

## 1. Export Deliverables

- **WhatsApp v3.2:** [TBW_FRESH_v3.2_Dashboard_Integrated.json](file:///c:/Users/amanr/Downloads/dashborad/exports/TBW_FRESH_v3.2_Dashboard_Integrated.json)
  - Workflow Name: `TBW FRESH v3.2 - Dashboard Integrated (IMPORT INACTIVE)`
  - Total Nodes: 56
  - Unique ID: `31f28b21-49b9-4a94-9e3d-8d8a57ba8d01`
  - Active: `false`
- **Instagram v3.2:** [TBW_IG_SIMPLE_v3.2_Dashboard_Integrated.json](file:///c:/Users/amanr/Downloads/dashborad/exports/TBW_IG_SIMPLE_v3.2_Dashboard_Integrated.json)
  - Workflow Name: `TBW IG SIMPLE v3.2 - Dashboard Integrated (IMPORT INACTIVE)`
  - Total Nodes: 55
  - Unique ID: `48e69b22-8321-4f34-b912-7dc28ba17ef2`
  - Active: `false`

---

## 2. Node Changes Breakdown

### WhatsApp Workflow Changes
- **`04 - Parse Inbound` (Modified):** Intercepts `raw.statuses` / `v.statuses` and routes as `action: 'status_receipt'` rather than dropping them. Flags `s.human_requested = true` when customer selects human support.
- **`04_status - Is Status Receipt?` (New IF Node):** Evaluates `$json.action === 'status_receipt'`. Routes receipts to dashboard sync and drops them from bot flow.
- **`04_status_sync - Sync Status to Dashboard` (New HTTP Node):** Posts status receipts to `/api/n8n/webhook` with `x-n8n-secret`.
- **`04a - Log Inbound to Dashboard` (New HTTP Node):** Logs customer messages with phone, `messageId`, text, and name to `/api/n8n/webhook`.
- **`04b - Check Takeover Mode` (New HTTP Node):** Queries `GET /api/webhook/n8n/mode/{{ $json.phone }}`.
- **`04c - Evaluate Takeover State` (New Code Node):** Strict fail-closed takeover logic; preserves `s.human_requested` even when dashboard flag is OFF.
- **`26c - Send Confirmed by Meta?` (New IF Node):** Checks `$json.sendStatus === 'sent'`.
- **`26d - Log Outbound to Dashboard` (New HTTP Node):** Logs confirmed bot replies with `wamid` and exact message text.
- **`29b - Log Timer Outbound to Dashboard` (New HTTP Node):** Logs timer nudges and timeouts upon Meta confirmation.
- **`32b - Log DNS Retry to Dashboard` (New HTTP Node):** Logs successful DNS retries upon Meta confirmation.

### Instagram Workflow Changes
- **`IG - Log Inbound DM to Dashboard` (New HTTP Node):** Branches from `IG - DM or Comment?` to log incoming DMs to `/api/n8n/webhook`.
- **`IG - Check Dashboard DM Takeover` (New HTTP Node):** Calls `POST /api/instagram/dm-context`.
- **`IG - Evaluate DM Takeover` (New Code Node):** Strict fail-closed check (`approved: true`, `reply_allowed: true`, `mode: 'ai'`).
- **`IG - Check Nudge Takeover` (New HTTP Node):** Calls `POST /api/instagram/dm-context` before sending any 3-minute nudge.
- **`IG - Nudge Allowed?` (New IF Node):** Drops nudge if takeover is active or mode is human.
- **`IG - Log Outbound DM to Dashboard` (New HTTP Node):** Records actual message text from `igPayload` and CTA button metadata.
- **`IG - Log Comment Reply to Dashboard` (New HTTP Node):** Records comment private replies via `/api/n8n/webhook`.

---

## 3. Test Suite Verification (66/66 Passed)

```
================================================================
TBW COMPLETE DEVELOPMENT INTEGRATION & WORKFLOW VERIFICATION v3.2
================================================================

--- 1. WhatsApp Inbound Logging ---
  [PASS] WhatsApp inbound message logged with HTTP 200
  [PASS] WhatsApp inbound message acknowledged with success: true
  [PASS] Exposes can_respond flag to caller

--- 2. WhatsApp Outbound Logging (Normal, Timer, DNS Retry) ---
  [PASS] Normal bot reply logged with HTTP 200
  [PASS] Action confirmed as whatsapp_outgoing_logged
  [PASS] Timer nudge logged with HTTP 200
  [PASS] DNS retry logged with HTTP 200 without duplicates

--- 3. WhatsApp Status Receipts & Out-of-Order Safety ---
  [PASS] Status "delivered" accepted with HTTP 200
  [PASS] Status receipt mapped as "delivered"
  [PASS] Status "read" accepted with HTTP 200
  [PASS] Status receipt mapped as "read"
  [PASS] Out-of-order receipt returns HTTP 200
  [PASS] Out-of-order status safely ignored, read state preserved

--- 4. Instagram Inbound DM Synchronization ---
  [PASS] Instagram inbound DM logged with HTTP 200
  [PASS] Instagram inbound DM success: true
  [PASS] Conversation ID resolved

--- 5. Instagram Outbound DM Synchronization ---
  [PASS] Instagram outbound DM logged with HTTP 200
  [PASS] Instagram outbound DM success: true

--- 6. Instagram Reel Comments & Independent Public Reply ---
  [PASS] Comment check returns boolean approved
  [PASS] Top-level public_reply_enabled boolean exists
  [PASS] Comment reply logged to dashboard with HTTP 200
  [PASS] Action confirmed as comment_reply_logged

--- 7. Human Takeover Mode ON and OFF ---
  [PASS] WhatsApp Mode endpoint responds HTTP 200
  [PASS] Mode returns valid "ai" or "human" state
  [PASS] Mode exposes explicit boolean can_respond flag
  [PASS] Instagram DM context returns reply_allowed flag
  [PASS] Instagram mode returns "ai" or "human"

--- 8. Duplicate Meta Events Protection ---
  [PASS] First event processed successfully
  [PASS] Duplicate delivery returns HTTP 200
  [PASS] Duplicate delivery flagged with deduplicated: true

--- 9. Exact Authentication Headers Verification ---
  [PASS] x-n8n-secret header accepted with HTTP 200
  [PASS] x-n8n-api-key header accepted with HTTP 200
  [PASS] Authorization Bearer header accepted with HTTP 200
  [PASS] Invalid secret returns HTTP 401 Unauthorized

--- 10. Fail-Closed Resilience on Corrupt / Missing Fields ---
  [PASS] Fails closed (approved: false) on empty comment check
  [PASS] Rejects missing phone with HTTP 400
  [PASS] Enforces can_respond: false on missing phone

--- 11. Exported Workflow Files Validation (TBW v3.2) ---
  [PASS] WhatsApp v3.2 export JSON exists
  [PASS] Instagram v3.2 export JSON exists
  [PASS] WhatsApp v3.2 uses safe new workflow ID (prevents overwrite)
  [PASS] Instagram v3.2 uses safe new workflow ID (prevents overwrite)
  [PASS] WhatsApp v3.2 is strictly INACTIVE
  [PASS] Instagram v3.2 is strictly INACTIVE
  [PASS] WhatsApp has 04_status Receipt detection
  [PASS] WhatsApp has 04_status Sync node
  [PASS] WhatsApp has 04a Inbound Logging node
  [PASS] WhatsApp has 04b Takeover Mode check node
  [PASS] WhatsApp has 04c Takeover State evaluation node
  [PASS] WhatsApp has 26d Outbound Logging node
  [PASS] WhatsApp has 29b Timer Outbound Logging node
  [PASS] WhatsApp has 32b DNS Retry Logging node
  [PASS] Instagram has Inbound DM logging node
  [PASS] Instagram has DM Takeover check node
  [PASS] Instagram has DM Takeover evaluation node
  [PASS] Instagram has Nudge Takeover check node
  [PASS] Instagram has Nudge Allowed IF node
  [PASS] Instagram has Outbound DM logging node
  [PASS] Instagram has Comment Reply logging node

--- 12. Strict Fail-Closed Takeover Simulation & Nudge Suppression ---
  [PASS] WhatsApp 04c suppresses bot reply on missing data object (fail closed)
  [PASS] WhatsApp 04c suppresses bot reply on API error (fail closed)
  [PASS] WhatsApp 04c preserves customer-initiated handover even if dashboard takeover is false
  [PASS] WhatsApp 04c allows bot reply only when explicitly authorized
  [PASS] Instagram DM takeover suppresses bot reply on approved: false
  [PASS] Instagram DM takeover suppresses bot reply on dashboard error
  [PASS] Instagram DM takeover suppresses bot reply when mode is human
  [PASS] Instagram DM takeover allows bot reply only on explicit two-way approval

================================================================
TOTAL SUITE RESULTS: 66 passed, 0 failed
================================================================
```

---

## 4. Controlled Cutover & Rollback Instructions

### Cutover Plan
1. **Dashboard Deploy:** Merge `chore/automation-cleanup-migration-prep` into `main` and deploy to Vercel. Ensure `N8N_WEBHOOK_SECRET` is set.
2. **Workflow Import:** Import `exports/TBW_FRESH_v3.2_Dashboard_Integrated.json` and `exports/TBW_IG_SIMPLE_v3.2_Dashboard_Integrated.json`. Due to new unique IDs, they will import as separate, inactive workflows without touching existing workflows.
3. **Deactivate Legacy Conflicting Automations:** Unpublish legacy monolithic workflow `VBrjbhPeDypXt12q` (terminating the legacy 1-minute `Trigger WhatsApp Session Monitor` cron) and legacy IG listeners.
4. **Activate Replacement Workflows:** Activate TBW FRESH v3.2 and TBW IG SIMPLE v3.2.
5. **Production Smoke Test:** Test with authorized personal numbers; verify bidirectional chat, status receipts, and takeover toggle.

### Rollback Plan
1. In n8n UI, immediately switch `TBW FRESH v3.2` and `TBW IG SIMPLE v3.2` to **INACTIVE**.
2. Reactivate previous workflow `VBrjbhPeDypXt12q`.
3. Customer data, Google Sheets appointments, and Supabase conversation history remain 100% intact and unaffected.
