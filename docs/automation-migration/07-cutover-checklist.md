# THE BUSINESS WORK — PRODUCTION CUTOVER CHECKLIST (PHASE 10-D)
**Document:** Future Safe Migration & Deployment Execution Guide  
**Date:** October 27, 2026  
**Auditor & Architect:** Principal Full-Stack Engineer, Next.js Architect & Production Reliability Specialist  
**Status:** READY FOR FUTURE STAGED EXECUTION (DO NOT EXECUTE YET)  

---

## 1. PRE-CUTOVER PREREQUISITES (CURRENT STAGE)

- [x] Full dashboard audit completed across all 44 routes and pages.
- [x] Checkpoint backup directory established at `backups/pre-cleanup-checkpoint-20261027/`.
- [x] Dedicated branch created: `chore/automation-cleanup-migration-prep`.
- [x] Baseline commit recorded: `5eee569f574c4ce699f3c412c150d336baffbcb1`.
- [x] Proven obsolete code (`multilingual-responses.ts`) safely eliminated.
- [x] Hardcoded legacy workflow IDs (`VBrjbhPeDypXt12q`, `v4_*`) cleanly replaced.
- [x] Baseline ESLint errors fixed (from 3 errors to 0 errors).
- [x] `npm run typecheck` validated (0 errors).
- [x] `npm run build` validated (44 routes compiled).
- [x] Supabase schemas and customer data 100% preserved.
- [x] Live n8n workflows and Meta webhooks left untouched.
- [ ] **STOP POINT:** Await user upload of the two new workflow JSON exports:
  - WhatsApp: `DgY7Ej8wSSLkOmXx`
  - Instagram: `sDg5l37cgp7KY6df`

---

## 2. STAGE 1: WORKFLOW INSPECTION & CONTRACT FREEZE

When the user uploads the two workflow JSON exports, execute the following:
- [ ] Parse `DgY7Ej8wSSLkOmXx.json` and map all node names, triggers, credentials, and parameters.
- [ ] Parse `sDg5l37cgp7KY6df.json` and map all node names, triggers, credentials, and parameters.
- [ ] Identify the exact HTTP Request nodes that communicate with Next.js/Supabase.
- [ ] Confirm the authentication header schema (`X-N8N-API-KEY` vs Bearer token).
- [ ] Verify that workflow event bodies match the documented endpoints:
  - `/api/webhook/n8n/mode/[phone]` (Takeover verification)
  - `/api/webhook/n8n/lead` (Lead registration)
  - `/api/webhook/n8n/appointment` (Appointment booking)
  - `/api/instagram/comment-check` (Contract A)
  - `/api/instagram/dm-context` (Contract B)
  - `/api/instagram/send-public-reply` (Public comment)
  - `/api/instagram/record-event` (Execution receipts)
- [ ] Freeze the API contracts between Next.js and n8n in written documentation.

---

## 3. STAGE 2: DEVELOPMENT BRANCH INTEGRATION & UNIT VALIDATION

- [ ] Connect the verified endpoints on the `chore/automation-cleanup-migration-prep` branch.
- [ ] Validate comment deduplication with a mock payload (ensuring an identical `comment_id` never produces two private replies).
- [ ] Validate DM deduplication with a mock payload (ensuring an identical `mid` is never recorded twice).
- [ ] Validate human takeover locking (ensuring when `manual_takeover = true`, automated replies are suppressed).
- [ ] Validate lead upsert idempotency (ensuring repeated submissions update the same record rather than creating duplicates).
- [ ] Validate appointment date & time IST formatting.
- [ ] Run full project validation: `npm run typecheck`, `npm run lint`, `npm run build`.

---

## 4. STAGE 3: NON-PRODUCTION INTEGRATION TESTING

- [ ] Test WhatsApp automation using a single dedicated internal test phone number (e.g. admin test number).
- [ ] Confirm natural language greeting, multilingual menu selection, and takeover toggle response.
- [ ] Test Instagram automation using a designated test reel comment from an internal test Instagram account.
- [ ] Confirm private reply DM delivery and optional public comment reply.
- [ ] Confirm WhatsApp CTA link prefill navigation.
- [ ] Confirm Realtime Supabase updates appear immediately in the `/whatsapp` and `/instagram` dashboard inboxes without page refresh.

---

## 5. STAGE 4: CUTOVER APPROVAL & PRODUCTION ROLLOUT

- [ ] Confirm rollback readiness: verify baseline commit and backup files are accessible.
- [ ] Present test execution report to business owner and obtain **explicit written authorization** to switch over.
- [ ] Deactivate legacy n8n workflow (`VBrjbhPeDypXt12q`).
- [ ] Activate new WhatsApp workflow (`DgY7Ej8wSSLkOmXx`).
- [ ] Activate new Instagram workflow (`sDg5l37cgp7KY6df`).
- [ ] Merge `chore/automation-cleanup-migration-prep` to `main`.
- [ ] Deploy updated dashboard to Vercel production.
- [ ] Verify live system health in `/n8n` and `/vps` pages.
- [ ] Monitor error logs in `admin_workflow_executions` for 60 minutes.
- [ ] Decommission deferred legacy routes (`/api/n8n/webhook`) only after 72 hours of stable operation.
