# THE BUSINESS WORK — INTEGRATION MAPPING (PHASE 10-B)
**Document:** End-to-End System Integration, Verified Node-Level Contracts & Production Readiness  
**Date:** October 27, 2026  
**Auditor:** Principal Full-Stack Engineer, Next.js Architect & n8n Specialist  
**Status:** FULLY MAPPED & CONTRACT-VERIFIED  

---

## 1. WORKFLOW EXPORT INVENTORY & ARCHITECTURAL SUMMARY

The two replacement n8n production workflows and the reference contract were inspected in depth:

| Workflow File | Workflow Name | Workflow ID | Node Count | Trigger Architecture | Outbound Destinations |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `TBW FRESH v3 - Error Monitor (IMPORT INACTIVE).json` | TBW FRESH v3 - WhatsApp Router & Monitor | `DgY7Ej8wSSLkOmXx` | 47 | • `01 - Meta WhatsApp Incoming` (`whatsAppTrigger`)<br>• `02 - Every Minute Session Check` (`scheduleTrigger`)<br>• `Error Trigger` (`errorTrigger`) | • Meta WhatsApp Cloud API (`v26.0/1392092143987065/messages`)<br>• Google Spreadsheet (`WhatsApp Leads`, `Appointments`)<br>• Google Calendar<br>• Dashboard: `POST /api/webhook/n8n/error` |
| `TBW IG SIMPLE v3 - EVENT SESSION TIMER (IMPORT INACTIVE).json` | TBW IG SIMPLE v3 - Instagram Router & Event Timer | `sDg5l37cgp7KY6df` | 48 | • `IG - Bridge Webhook (v3)` (`tbw-ig-simple-v3`)<br>• `IG TIMER - Incoming Request` (`tbw-ig-simple-v3-timer`) | • VPS Bridge (`172.18.0.1:3002/register` & `/log`)<br>• Meta Instagram Graph API (`v26.0/me/messages` & `/{comment_id}/replies`)<br>• Dashboard: `POST /api/instagram/comment-check`<br>• Dashboard: `POST /api/webhook/n8n/lead` |
| `TBW_IG_DASHBOARD_COMMENT_CHECK_CONTRACT.json` | Reference Contract Only | N/A | N/A | Reference API specification for Reel-to-DM comment evaluation | Contract definition for `POST /api/instagram/comment-check` |

> [!IMPORTANT]
> **No Separate Workflows:** As verified by node inspection, `TBW IG SIMPLE v3 - EVENT SESSION TIMER` contains BOTH the main Instagram automation AND the internal event-driven session timer within a single 48-node workflow. Similarly, `TBW FRESH v3 - Error Monitor` contains the WhatsApp router, schedule checker, and error monitor within 47 nodes.

---

## 2. VERIFIED DASHBOARD HTTP CONTRACTS

### Contract 1: `POST /api/instagram/comment-check`

**Caller Node in n8n:** `IG - Dashboard Reel Rule` (`n8n-nodes-base.httpRequest`, Version 4.2)  
**Credential:** `TBW Dashboard API Auth WhatsApp` (`httpHeaderAuth`, ID `xhQiNoV6sd96wDLZ`)  
**Consumer Node in n8n:** `IG - Unify Dashboard Rule` (`n8n-nodes-base.code`)  

#### Verified Request Payload (from n8n):
```json
{
  "event_type": "comment",
  "event_id": "comment:17931177460661234",
  "comment_id": "17931177460661234",
  "media_id": "18042918239012345",
  "text": "INTERESTED",
  "username": "example_commenter",
  "timestamp": 1793117746066,
  "ig_user_id": "178414000123456",
  "channel": "instagram",
  "source": "Instagram"
}
```

#### Verified Approved Response (from Dashboard):
```json
{
  "approved": true,
  "event_type": "comment",
  "event_id": "comment:17931177460661234",
  "comment_id": "17931177460661234",
  "media_id": "18042918239012345",
  "ig_user_id": "178414000123456",
  "username": "example_commenter",
  "text": "INTERESTED",
  "timestamp": "2026-10-27T18:00:00.000Z",
  "reply_text": "Thank you for commenting! Reply Hi to explore our services.",
  "rule_id": "7b8f9a2e-4c1d-4e3f-9a1b-2c3d4e5f6a7b",
  "public_reply_enabled": true,
  "public_reply_text": "Thanks for your comment! 😊",
  "public_reply": {
    "enabled": true,
    "comment_id": "17931177460661234",
    "text": "Thanks for your comment! 😊"
  }
}
```

#### Verified Not-Approved Response (from Dashboard):
```json
{
  "approved": false,
  "event_type": "comment",
  "comment_id": "17931177460661234",
  "media_id": "18042918239012345",
  "public_reply_enabled": false,
  "public_reply_text": null
}
```

#### Critical Fixes Implemented:
1. **Top-Level `public_reply_enabled` & `public_reply_text`:** Added to `evaluateCommentCheck` and `InstagramCommentCheckResponse`. Previously, these were nested only inside `public_reply: { enabled, text }`. Because `IG - Unify Dashboard Rule` in n8n reads `r.public_reply_enabled` at the top level, public comment replies would have been silently disabled. Both top-level and nested fields are now provided simultaneously for 100% backward compatibility.
2. **Meta Numeric Timestamp Normalization:** Fixed `Date.parse(timestamp)` returning `NaN` for numeric timestamps (e.g. `1793117746066`), which previously caused comments with raw timestamps to fail age validation.
3. **Synthetic Test Mode Support:** Allowed synthetic IDs (e.g. `YOUR_COMMENT_ID`, `example_commenter`) to pass atomic deduplication without throwing formatting errors.

---

### Contract 2: `POST /api/webhook/n8n/lead`

**Caller Node in n8n:** `IG - Dashboard Lead Event` (`n8n-nodes-base.httpRequest`, Version 4.2)  
**Credential:** `TBW Dashboard API Auth WhatsApp` (`httpHeaderAuth`)  
**Preceding Node:** `IG - Prepare Lead + Owner Alert` (`n8n-nodes-base.code`)  

#### Verified Request Payload (from n8n):
```json
{
  "event_type": "lead_upsert",
  "channel": "instagram",
  "source": "Instagram",
  "lead_id": "ig_123_45|ai|AI Agents & Chatbots",
  "ig_user_id": "178414000123456",
  "username": "example_buyer",
  "category": "AI Agents & Chatbots",
  "service": "AI Agents & Chatbots",
  "language": "en",
  "created_at": "2026-10-27T18:00:00.000Z",
  "adminAlertPayload": {
    "messaging_product": "whatsapp",
    "to": "918604600292",
    "type": "text",
    "text": { "preview_url": false, "body": "..." }
  }
}
```

#### Verified Response (from Dashboard):
```json
{
  "success": true,
  "processed": true,
  "timestamp": "2026-10-27T18:00:00.000Z"
}
```

#### Fixes Implemented:
1. Supported `payload.username` in addition to `payload.instagram_username`.
2. Supported `payload.ig_user_id` to upsert `admin_contacts` by `instagram_scoped_id` even if phone number is not yet collected.
3. Supported `payload.lead_id` as the primary deduplication key in `admin_leads.google_sheet_row_id`.

---

### Contract 3: `POST /api/webhook/n8n/error`

**Caller Nodes in n8n:**
- `POST Error to Existing Dashboard` (`n8n-nodes-base.httpRequest`, following `Error Trigger`)
- `07e - Report Owner Alert Error` (`n8n-nodes-base.httpRequest`, following `07d - Format Owner Alert Error`)
**Credential:** `TBW Dashboard API Auth WhatsApp` (`httpHeaderAuth`)  

#### Verified Request Payload (from n8n):
```json
{
  "event_type": "workflow_error",
  "workflow_id": "DgY7Ej8wSSLkOmXx",
  "workflow_name": "TBW FRESH - WhatsApp Router",
  "execution_id": "12345",
  "error_node": "07 - Send Owner Alert",
  "error_message": "Meta Graph API 500: (#131030) Message failed to send",
  "observed_at": "2026-10-27T18:00:00.000Z"
}
```

#### Verified Response (from Dashboard):
```json
{
  "success": true,
  "logged": true,
  "timestamp": "2026-10-27T18:00:00.000Z"
}
```

#### Fixes Implemented:
1. Supported `payload.error_node` mapped into `admin_workflow_executions.failed_node_name` (previously expected `payload.failed_node_name`).
2. Supported `payload.error_message` mapped into `admin_integration_status.error_message`.

---

## 3. SUPABASE DATABASE DEPENDENCY MAPPING

| Supabase Table | Direct n8n Access? | Access Mechanism | Purpose |
| :--- | :---: | :--- | :--- |
| `admin_conversations` | **NO** | Dashboard API (`/api/whatsapp/...`, `/api/instagram/...`) | Tracks conversation state, unread count, `manual_takeover`, `automation_paused` |
| `admin_contacts` | **NO** | Dashboard API (`/api/webhook/n8n/lead`, `/api/whatsapp/contacts`) | Manages contact records, phone deduplication, `instagram_scoped_id` |
| `admin_leads` | **NO** | Dashboard API (`/api/webhook/n8n/lead`) | Sales pipeline lead tracking with value estimation |
| `admin_workflow_executions` | **NO** | Dashboard API (`/api/webhook/n8n/error`) | Logs n8n execution errors, failed node names, timestamps |
| `admin_integration_status` | **NO** | Dashboard API (`/api/webhook/n8n/error`, `/health`) | In-app health status indicators (`n8n`, `whatsapp`, `instagram`) |
| `instagram_reel_rules` | **NO** | Dashboard API (`/api/instagram/comment-check`, `/reels`) | Active Reel comment rules, trigger modes, keywords, private replies |
| `instagram_comment_intents`| **NO** | Dashboard API (`/api/instagram/comment-check`) | Atomic comment deduplication, 24-hour rate limit checks, pending campaigns |

> [!NOTE]
> **Complete Decoupling Achieved:** Neither workflow directly connects to Postgres or Supabase. All database reads, atomic deduplications, and state mutations are safely mediated by the Next.js API layer.

---

## 4. INCOMPATIBILITIES & RECOMMENDATIONS FOR FUTURE WORKFLOW ACTIVATION

1. **WhatsApp Inactivity Check vs Dashboard Session Engine:**
   - In `DgY7Ej8wSSLkOmXx`, node `02 - Every Minute Session Check` checks in-memory `mem.sessions` via workflow static data.
   - It no longer calls the legacy `/api/whatsapp/session-monitor` route (which previously generated 1,440 error executions/day).
   - *Recommendation:* Keep `/api/whatsapp/session-monitor` deployed on the dashboard for internal monitoring, but do not configure n8n to call it since `DgY7Ej8wSSLkOmXx` handles its own nudges internally.

2. **WhatsApp Lead Ingestion:**
   - In `DgY7Ej8wSSLkOmXx`, node `15 - Save WhatsApp Lead` writes directly to Google Spreadsheet `1ic0Dt2UTJ0n2eL_J0BnugEFny8vNCXG1qGf2RGZzHtA` (`WhatsApp Leads` tab).
   - In Next.js dashboard, `src/app/api/sync/google-sheets/route.ts` already syncs this exact sheet into Supabase `admin_leads`!
   - *Recommendation:* Maintain the Google Sheets sync pipeline. Optionally, if instant dashboard visibility is desired without waiting for sheet sync, an HTTP Request node calling `POST /api/webhook/n8n/lead` can be added to the WhatsApp workflow in a later iteration.

3. **Instagram Comment Test Switch:**
   - Node `IG - Test Reel Rule (OFF by default)` in `sDg5l37cgp7KY6df` is set to `enabled: false`.
   - When importing the workflow into n8n production, verify that this test rule remains `enabled: false` so that all comment checks pass through to `IG - Dashboard Reel Rule`.
