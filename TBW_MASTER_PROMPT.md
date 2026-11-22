# MASTER PROMPT: THE BUSINESS WORK (TBW) COMPLETE UI REVAMP & TWO-TIER IDENTITY SYSTEM

> **Instructions for the AI / Engineering Team:**  
> Execute a complete, production-grade frontend redesign and architectural overhaul of **The Business Work (TBW) Operations & AI Command Center** (`We Make Business Simpler.`).  
> This is a full-system transformation across the entire dashboard and the WhatsApp Live Inbox, establishing a permanent separation between persistent customer contacts and per-session conversation identities.

---

## 1. CORE BRAND IDENTITY & DESIGN SYSTEM

Apply the official TBW design tokens across every layout, page, card, button, modal, and drawer:

- **Warm Ivory (`#F4F2EC`)**: Global page background and canvas.
- **Ink Navy (`#202B35`)**: Primary buttons, active states, high-contrast headers, and primary typography.
- **Muted Sage (`#7D8F82`)**: Success statuses, verified badges, active automation indicators, and subtle accents.
- **Stone (`#DDD9D0`)**: Clean borders, dividers, subtle input borders, and card outlines.
- **Off White (`#FCFBF8`)**: Card backgrounds, drawer panels, modal surfaces, and message bubbles.

### Visual & UX Standards:
- **Button & Control Visibility**: Every button must have clear tactile contrast, distinct hover/active states, visible borders (`border border-[#DDD9D0]`), and intuitive icon-plus-label alignment. No hidden or low-contrast ghost actions.
- **Typography & Layout**: Clean, structured information density. Generous padding (`p-4` to `p-6`), rounded corners (`rounded-xl` to `rounded-2xl`), and sharp typography.
- **Responsiveness**: Multi-panel layouts must gracefully collapse into slide-out drawers or clean tabbed views on smaller screens.

---

## 2. DECOUPLED TWO-TIER IDENTITY ARCHITECTURE (CRITICAL REQUIREMENT)

Never mix permanent customer contact identity with individual conversation sessions. Implement two completely independent data tiers:

### Tier A: Persistent Customer Contact (`contacts`)
- **Owner**: The Administrator.
- **Custom Display Name**: The admin can assign **ANY custom name** (e.g., *"Aman Rajbhar"*, *"Client Mumbai"*, *"Sharma Sir"*, *"Cafe Owner"*).
- **Persistence**: This custom name is permanent. **Incoming WhatsApp webhooks, n8n bots, or customer inputs must NEVER overwrite this name.**
- **Admin Control**: Admin can edit this display name at any moment via an inline pencil button, modal, or customer drawer.
- **Fields**: `id`, `custom_name`, `phone_number` (E.164 normalized), `tags`, `notes`, `created_at`, `updated_at`.

### Tier B: Ephemeral Conversation Session (`conversations`)
- **Owner**: The specific interaction/session.
- **Session-Declared Name**: The name provided by the user *during that specific conversation session* (e.g., bot asks "What's your name?" and user replies "Rohit").
- **Session-Specific**: If the same customer initiates a new conversation next month and gives a different name or context (e.g., "Rohit Sharma"), that session records its own session name.
- **Fields**: `id`, `contact_id`, `session_name`, `status` (`open`, `waiting`, `bot_active`, `human_takeover`, `completed`), `channel` (`whatsapp`, `instagram`, `telegram`), `started_at`, `closed_at`.

### Dual-Identity UI Display Rules:
1. **Chat Header & List**:
   - Primary Title: Show Admin's `custom_name` (fallback to `session_name`, then formatted phone number).
   - Context Pill / Subtitle: If `custom_name` and `session_name` differ, display a distinct badge: `Session: [session_name]`.
2. **Customer Information Sidebar**:
   - Provide an instant **"Edit Contact Name"** input with a quick save action.
   - Display a **"Current Session Name"** card showing the raw name captured in the active session.
   - Display full **"Past Sessions History"** showing previous session names and dates for this customer.

---

## 3. WHATSAPP LIVE INBOX COMPLETE REDESIGN

Redesign the WhatsApp workspace into a high-efficiency 4-panel command center:

### Panel 1: Filter & Channel Rail
- Quick switches: All Messages, Unread, Human Takeover Needed, Bot Active, Waiting for Reply, Closed.
- Channel selectors and quick search shortcuts.

### Panel 2: Live Conversation Stream
- **Item Cards**:
  - Primary line: Admin Custom Name with channel icon (`WhatsApp`).
  - Secondary line: Session Name badge (if different) + Phone number.
  - Preview line: Last message text snippet with status icons (sent, delivered, read) and relative timestamp (`2m ago`).
  - Status indicators: Unread message badge, Bot active pill (Sage), Human takeover pill (Navy/Amber).
  - Quick action on hover (Takeover, Archive, Mark as Read).

### Panel 3: Active Message Window
- **Header**:
  - Contact Name (with quick inline edit) + Phone number + Session badge.
  - Takeover Switch: One-click toggle between `AI Bot Active` and `Human Takeover`.
  - Action buttons: Quick Call, Template Message, Resolve Conversation.
- **Message Stream**:
  - Customer messages: Left-aligned Off White (`#FCFBF8`) bubbles with Stone border.
  - Agent / Bot messages: Right-aligned Ink Navy (`#202B35`) with white text or soft Navy tint.
  - Rich media renderers: Audio voice notes, PDF/document previews, image lightbox, interactive buttons.
- **Composer**:
  - Multi-line textarea with auto-expand.
  - Quick Canned Responses (`/` shortcut).
  - WhatsApp approved template picker.
  - Attachment button (Documents, Images).
  - Clear, prominent "Send" button with `Enter` / `Cmd+Enter` shortcuts.

### Panel 4: Customer Details & Context Sidebar (Collapsible)
- Permanent Contact Profile (Admin Custom Name editor, Phone, Email, Address, Tags).
- Active Session metadata (Session ID, Start Time, Bot Flow Name).
- Direct CRM Links: Associated Leads, Scheduled Appointments, Sent Quotations.
- Internal Admin Notes (auto-saving scratchpad for team notes).

---

## 4. WHOLE DASHBOARD REVAMP ACROSS ALL MODULES

Ensure the identical TBW design language and functionality is unified across all pages:

1. **Executive Overview (`/`)**:
   - Real-time KPI summary (Total Contacts, Active Chats, New Leads, Bookings, Active Workflows).
   - System Health Bar (Supabase, WhatsApp, n8n, Meta, VPS).
   - Live Activity Feed with direct click-throughs.

2. **Contact Directory (`/contacts`) & Customer Profile (`/contacts/[id]`)**:
   - Table and Card views with advanced search by Admin Name, Session Name, Phone, and Tag.
   - Contact detail drawer with full chronological timeline of all past conversation sessions.
   - Single-click name update and CSV export.

3. **Leads CRM (`/leads`)**:
   - Visual Kanban & Table views with real lead status progression.
   - Link leads directly to persistent contact profiles and chat threads.

4. **Appointments & Calendar (`/appointments`)**:
   - Interactive Month/Week/Day/Agenda views with IST timezone handling.
   - Direct appointment creation synced to customer phone and calendar.

5. **Quotation Studio (`/quotations`)**:
   - Interactive quote builder with preset items, GST computation, PDF preview, and direct WhatsApp sharing.

6. **Instagram DMs & Reels (`/instagram`, `/automations/instagram-reels`)**:
   - Dedicated Instagram DM inbox with Human Takeover controls.
   - Comment-to-DM trigger automation manager with follow-gate validation.

7. **Telegram Real-time Alerts (`/telegram`)**:
   - Live operational alert stream with severity filters (Critical, Warning, Success).

8. **n8n Automation Engine & VPS Infrastructure (`/n8n`, `/vps`, `/integrations`)**:
   - Live workflow directory with activate/deactivate toggles and execution logs.
   - Real VPS hardware telemetry (CPU, RAM, Disk, Uptime) with safe fallback to `"Unavailable"` when disconnected.
   - Unified error ledger with 1-click administrative acknowledgment.

---

## 5. TECHNICAL & ARCHITECTURAL CONSTRAINTS

- **Stack**: Next.js 14 App Router, TypeScript (strict mode, 0 errors on `npm run typecheck`), Tailwind CSS, Supabase PostgreSQL.
- **No Mock or Fabricated Data**: Always bind to real Supabase tables or API endpoints. If an integration is offline, render a clean `"Offline / Disconnected"` state.
- **Data Safety**:
  - Never allow an external webhook or automation payload to overwrite `contacts.custom_name`.
  - Always validate E.164 phone formats before indexing.
  - Keep all API keys (`N8N_API_KEY`, `VPS_BEARER_TOKEN`, Meta tokens) strictly on server-side endpoints.
