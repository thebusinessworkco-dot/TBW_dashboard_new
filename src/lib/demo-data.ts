// ==============================================================================
// THE BUSINESS WORK — PRODUCTION DATA CONTRACTS
// Hardcoded demo/mock datasets have been permanently eliminated.
// Supabase is the single source of truth for all operational tables.
// ==============================================================================

import {
  AdminConversation,
  AdminMessage,
  AdminLead,
  AdminAppointment,
  AdminQuotation,
  AdminCommentAutomation,
  AdminWorkflow,
  AdminVpsMetrics,
  AdminIntegrationStatus,
} from './types/dashboard';

export const DEMO_CONVERSATIONS: AdminConversation[] = [];
export const DEMO_MESSAGES: Record<string, AdminMessage[]> = {};
export const DEMO_COMMENT_AUTOMATIONS: AdminCommentAutomation[] = [];
export const DEMO_LEADS: AdminLead[] = [];
export const DEMO_APPOINTMENTS: AdminAppointment[] = [];
export const DEMO_QUOTATIONS: AdminQuotation[] = [];
export const DEMO_WORKFLOWS: AdminWorkflow[] = [];

export const DEMO_VPS_METRICS: AdminVpsMetrics = {
  id: 'vps-unconnected',
  status: 'not_connected',
  cpu_percent: 0,
  ram_used_gb: 0,
  ram_total_gb: 0,
  ram_percent: 0,
  disk_used_gb: 0,
  disk_total_gb: 0,
  disk_percent: 0,
  uptime_seconds: 0,
  n8n_status: 'unknown',
  n8n_response_time_ms: 0,
  n8n_healthy: false,
  last_checked_at: new Date().toISOString(),
  is_demo: false,
};

export const DEMO_INTEGRATION_STATUS: AdminIntegrationStatus[] = [];
