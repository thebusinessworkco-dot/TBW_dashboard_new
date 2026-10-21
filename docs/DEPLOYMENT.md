# The Business Work — Vercel Deployment Guide

This document outlines the deployment procedure for the **The Business Work Admin Dashboard** on Vercel.

---

## 1. Domain Separation
- **Public Website Domain**: `https://www.thebusinesswork.com/` (Untouched)
- **Admin Dashboard Deployment Domain**: `https://dashboard.thebusinesswork.com/` (or your chosen subdomain on Vercel)

---

## 2. Supabase Migration Setup (First Step)
Before pushing live traffic:
1. Open your Supabase Project Dashboard (`ap-south-1` Mumbai).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the entire contents of `supabase/migrations/20261021_init_admin_dashboard.sql` and click **Run**.
4. This creates isolated `admin_*` tables, indexes, and Row Level Security policies restricted exclusively to `thebusinesswork.co@gmail.com`.
5. Your existing public tables and auth accounts remain 100% untouched.

---

## 3. Deploying to Vercel

### Option A: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

### Option B: Via GitHub Repository
1. Push this new repository to your GitHub account:
   ```bash
   git add .
   git commit -m "feat: complete brand-new The Business Work admin dashboard"
   git branch -M main
   git remote add origin <your-git-repo-url>
   git push -u origin main
   ```
2. Log in to [vercel.com](https://vercel.com).
3. Click **Add New...** -> **Project**.
4. Select the repository and choose **Next.js**.

---

## 4. Environment Variables Checklist in Vercel

In Vercel Project Settings -> **Environment Variables**, add:

| Variable Name | Environment | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Production | `https://dashboard.thebusinesswork.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | All | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Server-side Supabase service key |
| `ADMIN_AUTHORIZED_EMAIL` | All | `thebusinesswork.co@gmail.com` |
| `WHATSAPP_CLOUD_API_ACCESS_TOKEN` | Production | System user access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Production | WhatsApp phone number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Production | Meta WABA ID |
| `INSTAGRAM_GRAPH_API_ACCESS_TOKEN` | Production | Long-lived page access token |
| `INSTAGRAM_ACCOUNT_ID` | Production | Instagram business account ID |
| `N8N_API_BASE_URL` | All | e.g. `https://n8n.thebusinesswork.com` |
| `N8N_API_KEY` | Production | n8n settings API key |
| `VPS_METRICS_BEARER_TOKEN` | Production | Custom secure token matching your VPS agent |

Click **Deploy**!
