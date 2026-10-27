# TBW Dashboard — Development Integration & Workflow Synthesis Report

**Branch:** `chore/automation-cleanup-migration-prep`  
**Date:** October 28, 2026  
**Auditor & Integration Engineer:** Principal Full-Stack & n8n Specialist  
**Execution Environment:** Isolated Development Only (Strictly No Production Activation)  

---

## Executive Summary

All 11 development tasks specified in the user request have been implemented, verified, and tested on branch `chore/automation-cleanup-migration-prep`:

1. **Two New, Separately Named, Importable, INACTIVE Workflow JSON Exports Created:**
   - WhatsApp: `exports/TBW_FRESH_v3.1_Dashboard_Integrated.json` (54 nodes)
   - Instagram: `exports/TBW_IG_SIMPLE_v3.1_Dashboard_Integrated.json` (53 nodes)
2. **Dashboard Code Enhanced & Hardened:**
   - Added out-of-order WhatsApp status update protection in `/api/n8n/webhook` (guaranteeing `read` cannot be demoted to `delivered`).
   - Enhanced payload identifier aliases for seamless compatibility with n8n HTTP Request nodes.
   - Enforced strict production webhook secret verification (`N8N_API_KEY` rejected in production).
3. **Verification Metrics:**
   - **48/48 isolated tests passing** (`scratch/test_complete_integration_suite.ts`).
   - **TypeScript typecheck:** 0 errors (`npm run typecheck`).
   - **ESLint:** 0 errors (`npm run lint`).
   - **Next.js Turbopack build:** 0 errors across all 44 routes (`npm run build`).

---

## 1. Node-by-Node Changes Report

### A. WhatsApp Workflow (`TBW_FRESH_v3.1_Dashboard_Integrated.json`)
Base workflow: `TBW FRESH v3 - Error Monitor (IMPORT INACTIVE).json` (47 nodes) $\to$ Enhanced: 54 nodes (`active: false`).

| Node Name | Type | Position | Function & Connection Logic |
| :--- | :--- | :--- | :--- |
| **`04 - Parse Inbound`** *(Modified)* | `code` | `[224, 608]` | Updated to capture status receipts separately (`action: 'status_receipt'`) rather than dropping them, while preserving all existing customer message logic, deduplication (`mem.seen`), and session resets. Connects to `04_status - Is Status Receipt?`. |
| **`04_status - Is Status Receipt?`** *(New)* | `if` | `[336, 480]` | Evaluates `$json.action === 'status_receipt'`.<br>• **True (Status Receipt):** Routes to `04_status_sync - Sync Status to Dashboard`.<br>• **False (Customer Message):** Routes in parallel to `04a - Log Inbound to Dashboard` and `04b - Check Takeover Mode`. |
| **`04_status_sync - Sync Status to Dashboard`** *(New)* | `httpRequest` | `[560, 384]` | Calls `POST /api/n8n/webhook` with `event_type: 'whatsapp_status_update'`. Terminates cleanly without sending any customer message or touching the conversation dialog tree. |
| **`04a - Log Inbound to Dashboard`** *(New)* | `httpRequest` | `[560, 480]` | Calls `POST /api/n8n/webhook` with `event_type: 'incoming_whatsapp_message'`, phone, Meta message ID, content, and customer name. Runs with `continueOnFail: true`. Logs message to Supabase `admin_messages` without triggering replies. |
| **`04b - Check Takeover Mode`** *(New)* | `httpRequest` | `[560, 608]` | Calls `GET /api/webhook/n8n/mode/{{ $json.phone }}` with header `x-n8n-secret` to query real-time dashboard takeover state. |
| **`04c - Evaluate Takeover State`** *(New)* | `code` | `[784, 608]` | Evaluates takeover response:<br>• If `can_respond === false` or `mode === 'human'` or error: Sets `s.stage = 'human_wait'`, `s.promptAt = 0` (suppressing nudges), and returns `[]` (silencing bot replies).<br>• If takeover is OFF: Safely restores `s.stage = 'menu'` if previously in `human_wait`, and returns `[{ json: inbound }]` to proceed to `05 - Translations` and `08 - Main Menu`. |
| **`26c - Send Confirmed by Meta?`** *(New)* | `if` | `[5264, 448]` | Positioned after `26b - Record Customer Send Result`. Checks `$json.sendStatus === 'sent'`. |
| **`26d - Log Outbound to Dashboard`** *(New)* | `httpRequest` | `[5488, 384]` | Calls `POST /api/n8n/webhook` with `event_type: 'outgoing_whatsapp_message'`, provider message ID (`wamid`), and reply content. Connects to `06 - Owner Alert Exists?`. |

---

### B. Instagram Workflow (`TBW_IG_SIMPLE_v3.1_Dashboard_Integrated.json`)
Base workflow: `TBW IG SIMPLE v3 - EVENT SESSION TIMER (IMPORT INACTIVE).json` (48 nodes) $\to$ Enhanced: 53 nodes (`active: false`).

| Node Name | Type | Position | Function & Connection Logic |
| :--- | :--- | :--- | :--- |
| **`IG - Log Inbound DM to Dashboard`** *(New)* | `httpRequest` | `[2048, 1440]` | Connected from `IG - DM or Comment?` (True branch). Calls `POST /api/n8n/webhook` with `event_type: 'incoming_instagram_message'`, `sender_id` (IGSID), `username`, and `content`. Preserves VPS bridge logging. |
| **`IG - Check Dashboard DM Takeover`** *(New)* | `httpRequest` | `[2048, 1632]` | Connected from `IG - DM or Comment?` (True branch). Calls `POST /api/instagram/dm-context` to check Supabase `admin_conversations.manual_takeover`. |
| **`IG - Evaluate DM Takeover`** *(New)* | `code` | `[2272, 1632]` | Evaluates dashboard DM context:<br>• If `reply_allowed === false` or `mode === 'human'`: Sets `reply_allowed = false`, `mode = 'human'`.<br>• If automation allowed: Sets `reply_allowed = true`, `mode = 'ai'`. Connects to `IG - Bot Reply Allowed?`. |
| **`IG - Log Outbound DM to Dashboard`** *(New)* | `httpRequest` | `[3392, 1536]` | Connected from `IG - DM Send Result` when `accepted_by_provider === true`. Calls `POST /api/n8n/webhook` with `event_type: 'log_ai_reply'`, provider message ID, and content. |
| **`IG - Log Comment Reply to Dashboard`** *(New)* | `httpRequest` | `[3840, 2208]` | Connected from `IG - Comment Send Result`. Calls `POST /api/n8n/webhook` with `event_type: 'log_comment_reply'`, `comment_id`, `media_id`, and `status`. |

---

## 2. API Integration Contracts

### Contract 1: Inbound WhatsApp Message
- **Endpoint:** `POST https://dashboard.thebusinesswork.com/api/n8n/webhook`
- **Headers:** `Content-Type: application/json`, `x-n8n-api-key: <N8N_WEBHOOK_SECRET>`
- **Payload:**
  ```json
  {
    "event_type": "incoming_whatsapp_message",
    "phone": "918604600292",
    "external_message_id": "wamid.HBgM...",
    "content": "Hello bot",
    "message_type": "text",
    "customer_name": "Customer Name",
    "timestamp": "2026-10-28T00:00:00.000Z"
  }
  ```
- **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "conversation_id": "conv_uuid",
    "contact_id": "contact_uuid",
    "can_respond": true,
    "manual_takeover": false,
    "automation_paused": false
  }
  ```

### Contract 2: Outbound WhatsApp Message
- **Endpoint:** `POST https://dashboard.thebusinesswork.com/api/n8n/webhook`
- **Payload:**
  ```json
  {
    "event_type": "outgoing_whatsapp_message",
    "phone": "918604600292",
    "external_message_id": "wamid.HBgM...",
    "content": "Hi! Welcome to The Business Work.",
    "sender_type": "automation_ai",
    "sender_name": "TBW Assistant",
    "timestamp": "2026-10-28T00:00:00.000Z"
  }
  ```
- **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "action": "whatsapp_outgoing_logged",
    "conversation_id": "conv_uuid",
    "message_id": "msg_uuid"
  }
  ```

### Contract 3: WhatsApp Status Receipts (Out-of-Order Protected)
- **Endpoint:** `POST https://dashboard.thebusinesswork.com/api/n8n/webhook`
- **Payload:**
  ```json
  {
    "event_type": "whatsapp_status_update",
    "external_message_id": "wamid.HBgM...",
    "status": "delivered",
    "recipient_id": "918604600292",
    "timestamp": 1793117746
  }
  ```
- **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "action": "status_updated",
    "wamid": "wamid.HBgM...",
    "status": "delivered",
    "found": true
  }
  ```

### Contract 4: WhatsApp Human Takeover Mode Check
- **Endpoint:** `GET https://dashboard.thebusinesswork.com/api/webhook/n8n/mode/[phone]`
- **Headers:** `x-n8n-api-key: <N8N_WEBHOOK_SECRET>`
- **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "phone": "+918604600292",
    "data": {
      "mode": "ai",
      "can_respond": true,
      "manual_takeover": false,
      "automation_paused": false
    }
  }
  ```

### Contract 5: Instagram DM Context & Takeover Check
- **Endpoint:** `POST https://dashboard.thebusinesswork.com/api/instagram/dm-context`
- **Payload:**
  ```json
  {
    "ig_user_id": "17841400000000001",
    "username": "example_user",
    "text": "Interested in services",
    "event_id": "mid_12345"
  }
  ```
- **Response (HTTP 200):**
  ```json
  {
    "approved": true,
    "event_type": "dm",
    "ig_user_id": "17841400000000001",
    "mode": "ai",
    "reply_allowed": true,
    "whatsapp_url": "https://wa.me/917972020292..."
  }
  ```

---

## 3. Test Verification Suite Results

Execution command: `npx tsx --env-file=.env.local scratch/test_complete_integration_suite.ts`

```
================================================================
TBW COMPLETE DEVELOPMENT INTEGRATION & WORKFLOW VERIFICATION
================================================================

--- 1. WhatsApp Inbound Logging ---
  [PASS] WhatsApp inbound message logged with HTTP 200
  [PASS] WhatsApp inbound message acknowledged with success: true
  [PASS] Exposes can_respond flag to caller

--- 2. WhatsApp Outbound Logging ---
  [PASS] WhatsApp outbound message logged with HTTP 200
  [PASS] WhatsApp outbound message acknowledged with success: true
  [PASS] Action confirmed as whatsapp_outgoing_logged

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

--- 9. Webhook Authentication Hardening ---
  [PASS] Rejects invalid webhook key with HTTP 401 Unauthorized

--- 10. Fail-Closed Resilience on Missing Fields ---
  [PASS] Fails closed (approved: false) on missing comment fields
  [PASS] Rejects missing phone with HTTP 400
  [PASS] Enforces can_respond: false on missing phone

--- 11. Exported Workflow Files Validation ---
  [PASS] WhatsApp v3.1 export JSON exists in exports/
  [PASS] Instagram v3.1 export JSON exists in exports/
  [PASS] WhatsApp v3.1 export is strictly INACTIVE
  [PASS] Instagram v3.1 export is strictly INACTIVE
  [PASS] WhatsApp has 04a Inbound Logging node
  [PASS] WhatsApp has 04b Takeover Mode check node
  [PASS] WhatsApp has 04c Takeover State evaluation node
  [PASS] WhatsApp has 04_status Receipt detection node
  [PASS] WhatsApp has 04_status Sync node
  [PASS] WhatsApp has 26d Outbound Logging node
  [PASS] Instagram has Inbound DM logging node
  [PASS] Instagram has DM Takeover check node
  [PASS] Instagram has DM Takeover evaluation node
  [PASS] Instagram has Outbound DM logging node
  [PASS] Instagram has Comment Reply logging node

================================================================
TOTAL SUITE RESULTS: 48 passed, 0 failed
================================================================
```

---

## 4. Controlled Cutover Plan

When authorized by business leadership, execute cutover in this precise order:

1. **Step 1: Dashboard Deployment**
   - Merge `chore/automation-cleanup-migration-prep` to `main`.
   - Deploy to Vercel production.
   - Verify environment variable `N8N_WEBHOOK_SECRET` is set in Vercel.
2. **Step 2: Import Inactive Workflows into n8n**
   - In n8n UI, import `exports/TBW_FRESH_v3.1_Dashboard_Integrated.json`. Leave **INACTIVE**.
   - In n8n UI, import `exports/TBW_IG_SIMPLE_v3.1_Dashboard_Integrated.json`. Leave **INACTIVE**.
   - Verify credentials:
     - `TBW Dashboard API Auth WhatsApp` (`xhQiNoV6sd96wDLZ`)
     - `TBW WhatsApp System User` (`zQ6qZKUzn2qjjSlf`)
     - `Instagram Meta Send Token` (`7sIHDKGWFf4OToxy`)
     - `Header Auth account` (`MiDWVYhAWZsVRoDX`)
3. **Step 3: Deactivate Legacy Conflicting Automations**
   - Unpublish/Deactivate legacy monolithic workflow `VBrjbhPeDypXt12q` (terminating the legacy 1-minute `Trigger WhatsApp Session Monitor` cron).
   - Unregister legacy Instagram listeners: `tbw-ig-simple-v1-events`, `tbw-ig-simple-v2-events`, `tbw-v3-instagram-verified-events`.
4. **Step 4: Activate Replacement Workflows**
   - Activate `TBW FRESH v3.1 - Dashboard Integrated`.
   - Activate `TBW IG SIMPLE v3.1 - Dashboard Integrated`.
5. **Step 5: Smoke Testing with Test Accounts**
   - Send test WhatsApp message from authorized test number.
   - Verify incoming message appears in `/whatsapp` inbox.
   - Verify automated reply appears in `/whatsapp` inbox.
   - Toggle "Take Over" in `/whatsapp` inbox $\to$ send customer message $\to$ verify bot stays silent.
   - Send test Instagram DM from test account $\to$ verify incoming DM appears in `/instagram` inbox.

---

## 5. Rollback Instructions

If any unexpected anomaly occurs during cutover:

1. **Immediate Deactivation:**
   - In n8n UI, immediately switch `TBW FRESH v3.1` to **INACTIVE**.
   - In n8n UI, immediately switch `TBW IG SIMPLE v3.1` to **INACTIVE**.
2. **Reactivate Previous State:**
   - Reactivate previously active workflow `VBrjbhPeDypXt12q` if needed.
3. **Data Integrity:**
   - Existing customer contacts, conversations, and appointments in Supabase and Google Sheets remain 100% untouched and preserved.
