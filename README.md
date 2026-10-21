# THE BUSINESS WORK — ADMIN CONTROL CENTER

> **Unified command center for WhatsApp automation, Instagram automation, leads pipeline, appointments, quotations, n8n workflows, and VPS infrastructure.**

Built from scratch as an independent production application for **[The Business Work](https://www.thebusinesswork.com/)**.

---

## 🌟 Key Architecture & Capabilities

1. **Brand Identity & Aesthetic**
   - Matching The Business Work design language (`#FAF7E8` / `#F8F7F3` stone canvas, `#141413` deep ink black, Lucide icons, clean SaaS borders, and responsive desktop/mobile navigation).
2. **Login & Security**
   - Authorized Administrator: `thebusinesswork.co@gmail.com`.
   - Protected routes, session validation, password visibility toggle, forgot password flow, reset password callback screen, and server-side allowlisting.
3. **Overview Command Center**
   - 10 real-time summary cards: Total Chats, Completed, Incomplete, WhatsApp, Instagram, Leads, Appointments, Active Automations, Failed Automations, VPS Status.
   - Time filters: Today, Last 7 Days, Last 30 Days.
   - Interactive metric navigation into filtered sub-sections.
4. **WhatsApp Automation Inbox**
   - 3-panel layout: Conversation list, full message history, and lead/contact drawer.
   - Tags indicating message origin: AI Bot, Predefined Rule, or Human Agent (Aman Rajbhar).
   - Manual takeover and pause/resume automation toggles.
   - Internal customer notes with instant saving.
5. **Instagram Control Center**
   - **Tab A — Instagram DMs**: Full stored chat history, automated reply status, manual takeover.
   - **Tab B — Comment-to-DM Manager**: Real Reel cards, trigger keywords (e.g. `AUTOMATION`, `CRM`, `DEMO`), reply messages, and execution failure diagnostics.
6. **Leads Section (Google Sheets Synced)**
   - All Leads, Website Leads, WhatsApp Leads, and **Instagram Leads (New Tab)**.
   - Preserves existing Google Sheets data structure while adding one dedicated Instagram Leads worksheet.
7. **Appointments Section**
   - Unified calendar for WhatsApp and Instagram bookings.
   - Statuses: Pending, Confirmed, Completed, Cancelled.
   - Synchronized with Google Sheets and Google Calendar.
8. **Quotation Builder (INR ₹)**
   - Branded digital quotation system featuring The Business Work service packages:
     - AI Agents & Chatbots
     - CRM & Sales Automation
     - Business Workflow Automation
     - WhatsApp & Social Automation
     - Custom Automation Solutions
   - Dynamic line items, editable pricing, setup fees, monthly retainers, discounts, and 18% GST.
   - Generates official high-resolution PDF using `jsPDF`.
   - Modals to dispatch quotation links directly via official WhatsApp Cloud API and Instagram Messaging API.
9. **n8n Workflow Monitoring**
   - Telemetry for self-hosted n8n instance on VPS.
   - Failed node diagnostics, execution logs, and direct deep links into n8n.
10. **VPS Health Monitoring**
    - Live gauges for CPU load, RAM memory, and NVMe disk storage.
    - Docker n8n service latency and health check alerts.
    - Zero secrets exposed; lightweight cron agent script included.
11. **Isolated Database & Safe Demo Purge**
    - Migration SQL with isolated `admin_*` tables, indexes, and RLS policies.
    - "Remove All Demo Data" button in Settings and database function `remove_all_demo_data()` that purges only records where `is_demo = true`.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

- Authorized Admin Login: `thebusinesswork.co@gmail.com`

---

## 🛠️ Verification & Build Commands

```bash
# Run TypeScript compilation and production build
npm run build

# Run linting
npm run lint
```

---

## 📂 Project Directory Structure

```text
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard shell with sidebar & demo banner
│   │   │   ├── page.tsx           # Main Overview (10 summary cards & live feeds)
│   │   │   ├── whatsapp/page.tsx  # WhatsApp 3-panel automation inbox
│   │   │   ├── instagram/page.tsx # Tab A: DMs · Tab B: Comment-to-DM Manager
│   │   │   ├── leads/page.tsx      # Google Sheets leads pipeline
│   │   │   ├── appointments/page.tsx # Unified bookings management
│   │   │   ├── quotations/page.tsx # Quotation builder & PDF generator
│   │   │   ├── n8n/page.tsx       # n8n workflow telemetry & failure inspector
│   │   │   ├── vps/page.tsx       # VPS CPU, RAM, disk gauges & latency
│   │   │   └── settings/page.tsx  # Integrations & safe demo data removal
│   │   ├── login/page.tsx         # Secure admin login & password reset modal
│   │   ├── auth/reset-password/   # Change password screen
│   │   ├── api/                   # API routes (WhatsApp, Instagram, VPS, n8n)
│   │   ├── globals.css            # Brand colors, typography & print styles
│   │   └── layout.tsx             # Root layout & Store Provider
│   ├── components/
│   │   ├── layout/                # Sidebar, TopNavbar, DemoBanner
│   ├── lib/
│   │   ├── store/dashboard-store.tsx # Reactive client store & Supabase sync
│   │   ├── types/dashboard.ts     # TypeScript data models
│   │   ├── demo-data.ts           # Isolated sample demo records
│   │   ├── pdf-generator.ts       # High-grade jsPDF quotation builder
│   │   ├── supabase/              # Browser and server Supabase clients
│   │   └── utils.ts               # Formatting and status badge helpers
├── supabase/
│   └── migrations/
│       └── 20261021_init_admin_dashboard.sql # Isolated admin_* database schema
├── docs/
│   ├── N8N_INTEGRATION_GUIDE.md   # n8n workflows & safe logging setup
│   ├── GOOGLE_SHEETS_SETUP.md     # Google Sheets tabs & column schemas
│   └── DEPLOYMENT.md              # Vercel deployment step-by-step
├── scripts/
│   ├── vps_monitor_agent.sh       # Bash VPS telemetry cron script
│   └── vps_monitor_agent.py       # Python standard-library telemetry agent
└── .env.example                   # Environment configuration template
```

---

## 🔒 Security & Privacy
- Zero client-side exposure of Supabase service role keys, n8n tokens, or Meta Graph API credentials.
- All admin tables enforce strict Row Level Security (RLS) policies scoped to `thebusinesswork.co@gmail.com`.
- Production data is completely isolated from preview demo records.
