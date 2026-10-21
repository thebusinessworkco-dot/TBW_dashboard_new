# The Business Work — n8n Integration Guide

This guide details how to connect your existing self-hosted n8n instance to the new **The Business Work Admin Dashboard** safely, without breaking any running production workflows.

---

## 1. Safety Principles
- **No Destructive Overwrites**: Your existing WhatsApp and appointment workflows continue running independently.
- **Safe Additional Logging**: We add non-blocking branch nodes in n8n that log incoming and outgoing messages to Supabase or the Dashboard webhook.
- **Manual Takeover Protection**: When manual takeover is flagged in the dashboard (`manual_takeover: true`), the n8n WhatsApp flow checks this flag before triggering automated replies. If active, it skips the automated message, leaving the conversation exclusively to you.

---

## 2. Inbound WhatsApp Message Logging Workflow

In your existing WhatsApp Webhook workflow in n8n:

### Step A: Check Manual Takeover Flag
Before your bot generates an AI or rule-based reply, query Supabase:
```sql
SELECT manual_takeover, automation_paused 
FROM public.admin_conversations 
WHERE contact_id = (SELECT id FROM public.admin_contacts WHERE phone = '{{ $json.phone }}')
LIMIT 1;
```
If `manual_takeover == true` or `automation_paused == true`:
- Route execution to **Stop and Do Nothing** (bot remains silent).
- The human administrator will reply directly from the dashboard.

### Step B: Safe Asynchronous Logging
Use an n8n **HTTP Request** or **Supabase** node to upsert the conversation and insert the message:
- Table: `public.admin_conversations`
- Table: `public.admin_messages`
  - `sender_type`: `'customer'` for incoming, or `'automation_rule'` / `'automation_ai'` for bot replies.
  - `external_message_id`: Meta message ID (`wamid.xxx`) to avoid duplicates.

---

## 3. Instagram Comment-to-DM Reel Automation

When a user comments on an Instagram Reel:

1. **Meta Webhook Node**: Captures Instagram `comments` event.
2. **Supabase Lookup**: Check if automation is enabled for this reel:
   ```sql
   SELECT is_enabled, trigger_keyword, automatic_dm_message
   FROM public.admin_comment_automations
   WHERE reel_media_id = '{{ $json.media_id }}';
   ```
3. **Keyword Match**:
   - Compare `comment_text.toUpperCase().includes(trigger_keyword)`.
4. **Meta Graph API Private Reply**:
   - Call `POST https://graph.facebook.com/v21.0/{{ $json.comment_id }}/private_replies` with `message: automatic_dm_message`.
5. **Update Stats**: Increment `successful_replies_count` or log `last_error` in `admin_comment_automations`.

---

## 4. Telemetry & Error Logging (Catch All Failures)

In your n8n workflows, configure the **Error Trigger** node:
1. Create a dedicated workflow named **"TBW - Global Error Handler"**.
2. Trigger: **Error Trigger** node.
3. Action: **HTTP Request Node**:
   - Method: `POST`
   - URL: `https://dashboard.thebusinesswork.com/api/n8n/webhook`
   - Body:
     ```json
     {
       "event_type": "workflow_execution",
       "workflow_id": "{{ $json.workflow.id }}",
       "workflow_name": "{{ $json.workflow.name }}",
       "status": "error",
       "execution_id": "{{ $json.execution.id }}",
       "started_at": "{{ $json.execution.startedAt }}",
       "error_message": "{{ $json.execution.error.message }}",
       "failed_node_name": "{{ $json.execution.lastNodeExecuted }}"
     }
     ```

This guarantees every single failure is instantly surfaced on your Admin Dashboard with the exact failed node name and one-click deep link to n8n!
