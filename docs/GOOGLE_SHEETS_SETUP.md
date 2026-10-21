# The Business Work — Google Sheets Architecture Guide

This document specifies the exact structure for integrating the admin dashboard with your existing master Google Spreadsheet without creating unnecessary spreadsheets or altering historical rows.

---

## 1. Master Spreadsheet Organization

Keep your existing Google Spreadsheet intact. The workbook contains exactly **4 worksheets/tabs**:

| Tab Name | Status | Purpose |
| :--- | :--- | :--- |
| **Website Leads** | **Existing** | Retains all historical website inquiries |
| **WhatsApp Leads** | **Existing** | Retains all WhatsApp captured contacts |
| **Instagram Leads** | **NEW** | Exactly ONE new tab added for Instagram Reel & DM leads |
| **Appointments** | **Existing** | Unified appointments tab for both WhatsApp & Instagram bookings |

> [!IMPORTANT]
> Do NOT create a separate spreadsheet for Instagram appointments. They must be saved in your **existing Appointments worksheet** using the `Source` column (`WhatsApp` or `Instagram`).

---

## 2. Tab Column Schemas

### Tab A: `Website Leads` (Existing)
*Keep all existing headers and formulas intact.*

### Tab B: `WhatsApp Leads` (Existing)
*Keep all existing headers and formulas intact.*

### Tab C: `Instagram Leads` (NEW Tab)
Create one new tab named `Instagram Leads` with the following clean headers:

| Col | Header | Description |
| :--- | :--- | :--- |
| A | `Timestamp` | Date & Time of capture (e.g. `2026-10-21 07:12:00`) |
| B | `Instagram Handle` | Username (e.g. `@priya_k_designs`) |
| C | `Full Name` | Contact full name |
| D | `Phone Number` | Phone number if collected |
| E | `Email Address` | Email address if collected |
| F | `Service Interest` | e.g. `AI Agents & Chatbots`, `CRM & Sales Automation` |
| G | `Lead Status` | `New`, `Contacted`, `Qualified`, `Converted`, `Lost` |
| H | `Reel Media ID` | Reel ID if triggered by Comment-to-DM |
| I | `Row ID` | Unique ID for synchronization (e.g. `G_SHEET_ROW_IG_01`) |

---

### Tab D: `Appointments` (Existing — Unified)
Ensure the following columns exist:

| Col | Header | Format / Example |
| :--- | :--- | :--- |
| A | `Booking Date` | `YYYY-MM-DD` |
| B | `Time Slot` | `11:00 AM` |
| C | `Customer Name` | Client Name |
| D | `Contact Info` | Phone number or Instagram username |
| E | `Source` | **`WhatsApp`** or **`Instagram`** |
| F | `Service Requested` | Deliverable or consultation topic |
| G | `Status` | `Pending`, `Confirmed`, `Completed`, `Cancelled` |
| H | `Google Calendar ID` | Calendar event ID for two-way synchronization |
| I | `Notes` | Client requirements or meeting link |

---

## 3. Safe Synchronization Flow via n8n

1. When a lead or booking is created via WhatsApp or Instagram, n8n writes to the appropriate tab in this spreadsheet.
2. The Google Sheet row ID is stored in Supabase `admin_leads.google_sheet_row_id` or `admin_appointments.google_calendar_event_id` to guarantee deduplication.
