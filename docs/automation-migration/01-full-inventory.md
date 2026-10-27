# THE BUSINESS WORK — AUTOMATION AUDIT INVENTORY (PHASE 1)
**Document:** Complete Full-Stack Automation & Route Inventory  
**Date:** October 27, 2026  
**Auditor:** Principal Full-Stack Engineer, Next.js Architect & Production Reliability Specialist  
**Status:** COMPLETE & VERIFIED  

---

## 1. INVENTORY OVERVIEW

The audit inspected all 44 routes, libraries, database tables, background agents, and environment configurations in `TBW_dashboard_new`.
The system connects three external communication channels:
1. **Meta WhatsApp Cloud API** (Inbound webhooks, outbound manual chat, session tracking, inactivity timeouts, admin alerts).
2. **Meta Instagram Graph API** (Inbound DMs, comment webhooks, comment-to-DM automation, public comment replies, reel sync).
3. **Self-Hosted n8n Instance** (`https://n8n.thebusinesswork.com`) (Workflow monitoring, telemetry ingestion, lead & appointment sync).

---

## 2. API ROUTE INVENTORY (31 ROUTES)

| Route Path | Method(s) | Primary Purpose | Callers / Consumers | Data Read/Write | Outgoing Messages | Initial Classification |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: |
| `/api/whatsapp/webhook` | GET, POST | Meta WhatsApp Webhook challenge & incoming event ingestion (DMs, status receipts) | Meta Cloud API | Reads/Writes `admin_contacts`, `admin_conversations`, `admin_messages` | No | **KEEP** |
| `/api/instagram/webhook` | GET, POST | Meta Instagram Webhook challenge & incoming DM / comment ingestion | Meta Graph API | Reads/Writes `admin_contacts`, `admin_conversations`, `admin_messages`, `admin_comment_automations` | No | **KEEP** |
| `/api/n8n/webhook` | POST | Central n8n router for incoming message, comment, session, and status receipts | Live n8n workflows (`VBrjbhPeDypXt12q`) | Reads/Writes `admin_contacts`, `admin_conversations`, `admin_messages`, `admin_comment_automations` | Indirect | **DEFER** |
| `/api/webhook/n8n/message` | POST | Alias proxy to `/api/n8n/webhook` | n8n workflow nodes | Same as `/api/n8n/webhook` | Indirect | **DEFER** |
| `/api/webhook/n8n/event` | POST | Alias proxy to `/api/n8n/webhook` | n8n workflow nodes | Same as `/api/n8n/webhook` | Indirect | **DEFER** |
| `/api/webhook/n8n/lead` | POST | Ingests captured leads into CRM | n8n lead capture nodes | Reads/Writes `admin_contacts`, `admin_leads` | No | **KEEP** |
| `/api/webhook/n8n/appointment` | POST | Ingests consultations into calendar schedule | n8n appointment nodes | Reads/Writes `admin_appointments` | No | **KEEP** |
| `/api/webhook/n8n/mode/[phone]` | GET | Human Takeover verification check | n8n bot logic before response | Reads `admin_contacts`, `admin_conversations` | No | **KEEP** |
| `/api/webhook/n8n/health` | GET, POST | Telemetry heartbeat from n8n | n8n monitoring nodes | Writes `admin_workflow_executions`, `admin_integration_status` | No | **REFACTOR** |
| `/api/webhook/n8n/error` | POST | Error execution alerts from n8n | n8n Error Trigger nodes | Writes `admin_workflow_executions`, `admin_integration_status` | No | **REFACTOR** |
| `/api/webhook/n8n/quotation/send-result` | POST | Ingests delivery receipts for quotations | n8n quotation worker | Writes `admin_audit_logs` | No | **KEEP** |
| `/api/instagram/comment-check` | POST | Contract A: Evaluates reel comments against rules | n8n comment workflows | Reads `instagram_reel_rules`, Writes `instagram_comment_intents` | No | **KEEP** |
| `/api/instagram/dm-context` | POST | Contract B: Resolves pending reel campaign for user | n8n DM workflows | Reads `instagram_customer_context`, `instagram_reel_rules` | No | **KEEP** |
| `/api/instagram/record-event` | POST | Ingests execution receipts (private reply sent, etc.) | n8n execution confirmation | Writes `instagram_comment_intents` | No | **KEEP** |
| `/api/instagram/send-public-reply` | POST | Executes public comment reply via Meta API | n8n comment workflows | Calls Meta Graph API, Writes `admin_audit_logs` | Yes (Public Comment) | **KEEP** |
| `/api/instagram/reels` | GET, POST, DELETE | CRUD operations on Reel automation rules | `/automations/instagram-reels` page | Reads/Writes `instagram_reel_rules` | No | **KEEP** |
| `/api/instagram/reels/sync` | GET, POST | Syncs reels from Meta Graph API | `/automations/instagram-reels` page | Reads/Writes `admin_synced_reels_cache` | No | **KEEP** |
| `/api/instagram/reels/resolve-link` | POST | Resolves pasted reel link to numeric media ID | `/automations/instagram-reels` page | Calls Meta Graph API | No | **KEEP** |
| `/api/instagram/settings` | GET, POST | Manages WhatsApp business phone number in settings | Dashboard UI | Reads/Writes `admin_settings` | No | **KEEP** |
| `/api/instagram/analytics` | GET | Aggregates reel comment/DM automation analytics | `/automations/instagram-reels` page | Reads `instagram_comment_intents`, `instagram_reel_rules` | No | **KEEP** |
| `/api/whatsapp/activity` | GET | Telemetry on active WhatsApp sessions & metrics | `/whatsapp` activity tab | Reads `admin_contacts`, `admin_conversations`, `admin_appointments` | No | **KEEP** |
| `/api/whatsapp/contacts` | GET | Filtered & paginated WhatsApp contact list | `/whatsapp` contacts tab | Reads `admin_contacts`, `admin_conversations` | No | **REFACTOR** |
| `/api/whatsapp/contacts/[id]/delete` | POST | Safe contact CRM reset preserving Google appointments | `/whatsapp` contact delete button | Soft-deletes `admin_contacts`, resets sessions | No | **KEEP** |
| `/api/whatsapp/session-monitor` | GET, POST | Atomic session monitoring (3m follow-up & 20m expire) | Cron / VPS schedule | Calls PostgreSQL RPCs, sends follow-up via Meta API | Yes (Follow-up) | **KEEP** |
| `/api/whatsapp/admin-alert` | POST | Dispatches admin WhatsApp alert on new sessions | Internal / n8n | Calls Meta Cloud API, writes `admin_audit_logs` | Yes (Admin Alert) | **KEEP** |
| `/api/whatsapp/send` | POST | Manual reply & quotation delivery via WhatsApp | `/whatsapp` inbox, `/quotations` | Calls Meta Cloud API, updates `admin_conversations` | Yes (Customer WhatsApp) | **KEEP** |
| `/api/instagram/send` | POST | Manual reply & quotation delivery via Instagram Direct | `/instagram` inbox, `/quotations` | Calls Meta Graph API, updates `admin_conversations` | Yes (Customer IG DM) | **KEEP** |
| `/api/vps/health` | GET, POST | VPS resource telemetry (CPU, RAM, Disk, Containers) | VPS Python agent daemon, `/vps` page | Reads/Writes `admin_vps_metrics`, `admin_integration_status` | No | **KEEP** |
| `/api/n8n/workflows` | GET | Read-only proxy for n8n Public REST API | `/n8n` dashboard page | Proxies to `https://n8n.thebusinesswork.com` | No | **KEEP** |
| `/api/sync/google-sheets` | GET, POST | Master Google Sheets & Calendar sync worker | `dashboard-store.tsx` | Reads/Writes Google Sheets, Supabase | No | **KEEP** |
| `/api/appointments/create` | POST | Manual consultation booking from dashboard | `/appointments` page | Writes Google Calendar & `admin_appointments` | No | **KEEP** |

---

## 3. LIBRARIES & SERVICES INVENTORY

| File Path | Description / Responsibility | Dependents | Usage in Production | Initial Classification |
| :--- | :--- | :--- | :---: | :---: |
| `src/lib/instagram/multilingual-responses.ts` | 1,386 lines defining 24-service catalog, Gemini AI prompt, and category button builders for an experimental in-app IG bot. | 0 files in `src/` (orphaned). | Obsolete | **REMOVE** |
| `src/lib/instagram/reel-automation.ts` | Complete Reel-to-DM rule matching, intent reservations, 7-day expiry gates, wa.me URL generator, public comment reply dispatcher. | `/api/instagram/*`, `/automations/instagram-reels` | Active Production | **KEEP** |
| `src/lib/instagram/reel-sync-service.ts` | Connects to Meta Graph API to fetch live reels, thumbnails, captions, shortcodes, and caches them in Supabase. | `/api/instagram/reels/sync`, `/resolve-link` | Active Production | **KEEP** |
| `src/lib/instagram/reel-url-resolver.ts` | Normalizes pasted Instagram reel URLs and extracts shortcodes. | `reel-sync-service.ts` | Active Production | **KEEP** |
| `src/lib/whatsapp/session-manager.ts` | WhatsApp session tracking, normalization, IST formatting, safe contact deletion. | `/api/whatsapp/*`, `/api/n8n/webhook` | Active Production | **KEEP** |
| `src/lib/whatsapp/admin-alert.ts` | Meta WhatsApp Cloud API client for sending instant alerts to the business owner (`+91 8604600292`). | `/api/whatsapp/admin-alert`, `/api/n8n/webhook` | Active Production | **KEEP** |
| `src/lib/auth/webhook-auth.ts` | Verifies `N8N_WEBHOOK_SECRET` across incoming webhook endpoints with timing-safe checks. | All `/api/webhook/n8n/*` routes, `/api/n8n/webhook` | Active Production | **KEEP** |
| `src/lib/sheets/google-sheets-sync.ts` | Google Sheets API v4 and Google Calendar API v3 synchronization engine with service estimation. | `/api/sync/google-sheets`, `/api/appointments/create` | Active Production | **KEEP** |
| `src/lib/store/dashboard-store.tsx` | React Context store managing dashboard state, Realtime Supabase subscriptions, and optimistic updates. | Dashboard Layout & Pages | Active Production | **KEEP** |
| `src/lib/supabase/admin.ts` | Creates privileged Supabase client with `SUPABASE_SERVICE_ROLE_KEY` for server-side operations. | Server-side API routes | Active Production | **KEEP** |
| `src/lib/supabase/client.ts` | Creates browser Supabase client with publishable/anon key. | Browser components | Active Production | **KEEP** |
| `src/lib/supabase/server.ts` | Creates SSR Supabase client for Server Actions & Route Handlers using cookies. | Route handlers | Active Production | **KEEP** |
| `src/lib/types/dashboard.ts` | Core TypeScript interfaces for all Supabase tables, workflows, appointments, leads, quotations. | Repository-wide | Active Production | **KEEP** |

---

## 4. DASHBOARD UI PAGES INVENTORY

All 13 dashboard pages are verified active and essential to production operations:
1. `/` (`src/app/(dashboard)/page.tsx`): Executive overview, metrics, charts, quick links.
2. `/whatsapp` (`src/app/(dashboard)/whatsapp/page.tsx`): Full WhatsApp CRM & Inbox, customer details, message feed, human takeover toggle, contact deletion.
3. `/instagram` (`src/app/(dashboard)/instagram/page.tsx`): Full Instagram DM Inbox, customer profiles, message feed, human takeover toggle.
4. `/automations/instagram-reels` (`src/app/(dashboard)/automations/instagram-reels/page.tsx`): Full Reel campaign builder, thumbnail grid, sync, keyword matching, follow-gating, public reply editor.
5. `/leads` (`src/app/(dashboard)/leads/page.tsx`): Sales pipeline, stage filtering, lead details.
6. `/appointments` (`src/app/(dashboard)/appointments/page.tsx`): Consultation calendar, status badges, Google Calendar sync.
7. `/quotations` (`src/app/(dashboard)/quotations/page.tsx`): Proposal generator, line-item calculator, WhatsApp/IG PDF dispatch.
8. `/n8n` (`src/app/(dashboard)/n8n/page.tsx`): Live workflow monitor, execution history, VPS health status.
9. `/vps` (`src/app/(dashboard)/vps/page.tsx`): Host telemetry, CPU, RAM, Disk gauges, Docker container status.
10. `/settings` (`src/app/(dashboard)/settings/page.tsx`): Business contact configuration, webhook settings.
11. `/login` (`src/app/login/page.tsx`): Secure Supabase Auth with admin email allowlist check.
12. `/auth/reset-password` (`src/app/auth/reset-password/page.tsx`): Password recovery flow.
13. `/_not-found` (`src/app/not-found.tsx`): 404 error page.

All dashboard pages are preserved 100% intact without design alterations.
