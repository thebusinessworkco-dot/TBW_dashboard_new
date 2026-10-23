export type ConversationPlatform = 'whatsapp' | 'instagram';

export type ConversationStatus =
  | 'open'
  | 'waiting_for_customer'
  | 'completed'
  | 'incomplete'
  | 'needs_attention'
  | 'failed';

export type SenderType = 'customer' | 'automation_ai' | 'automation_rule' | 'human_agent';

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppListSection {
  title?: string;
  rows: WhatsAppListRow[];
}

export interface WhatsAppMetaActionButton {
  type?: string;
  reply?: WhatsAppButton;
  id?: string;
  title?: string;
  text?: string;
  url?: string;
  phone_number?: string;
}

export interface WhatsAppMetaAction {
  button?: string;
  buttons?: WhatsAppMetaActionButton[];
  sections?: WhatsAppListSection[];
  [key: string]: unknown;
}

export interface WhatsAppInteractivePayload {
  type?: 'button' | 'list' | 'flow' | 'button_reply' | 'list_reply' | 'nfm_reply' | 'quick_reply' | string;
  body?: { text?: string };
  action?: WhatsAppMetaAction;
  buttons?: WhatsAppButton[];
  selected_button?: WhatsAppButton;
  selected_list_item?: WhatsAppListRow;
  button_reply?: WhatsAppButton;
  list_reply?: WhatsAppListRow;
  sections?: WhatsAppListSection[];
  flow_name?: string;
  flow_token?: string;
  flow_response?: Record<string, unknown> | string;
  [key: string]: unknown;
}

export interface WhatsAppLocationPayload {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppTemplatePayload {
  name: string;
  language?: string;
  category?: string;
  components?: Array<Record<string, unknown>>;
  parameters?: Record<string, string>;
}

export interface WhatsAppAppointmentPayload {
  service_name?: string;
  date?: string;
  time?: string;
  slot?: string;
  status?: string;
  available_dates?: string[];
  available_slots?: string[];
  customer_name?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface MessageMetadata {
  interactive?: WhatsAppInteractivePayload;
  location?: WhatsAppLocationPayload;
  template?: WhatsAppTemplatePayload;
  appointment?: WhatsAppAppointmentPayload;
  flow_data?: Record<string, unknown>;
  filename?: string;
  caption?: string;
  mime_type?: string;
  file_size?: number;
  error_code?: string | number;
  error_message?: string;
  raw_payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AdminMessage {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_name?: string;
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  status: MessageStatus;
  external_message_id?: string;
  metadata?: MessageMetadata;
  is_demo?: boolean;
}

export interface AdminContact {
  id: string;
  name: string;
  phone?: string;
  instagram_username?: string;
  instagram_scoped_id?: string;
  email?: string;
  avatar_url?: string;
  company_name?: string;
  created_at: string;
  is_demo?: boolean;
}

export interface AdminConversation {
  id: string;
  contact_id: string;
  contact: AdminContact;
  platform: ConversationPlatform;
  status: ConversationStatus;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  automation_paused: boolean;
  manual_takeover: boolean;
  internal_notes?: string;
  linked_lead_id?: string;
  linked_appointment_id?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export type LeadSource = 'website' | 'whatsapp' | 'instagram';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface AdminLead {
  id: string;
  contact_id?: string;
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  instagram_username?: string;
  source: LeadSource;
  service_interest: string;
  status: LeadStatus;
  estimated_value?: number;
  notes?: string;
  google_sheet_row_id?: string;
  source_conversation_id?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface AdminAppointment {
  id: string;
  customer_name: string;
  contact_info: string; // phone or instagram username
  platform: 'whatsapp' | 'instagram';
  service_requested: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  status: AppointmentStatus;
  notes?: string;
  google_calendar_event_id?: string;
  conversation_id?: string;
  is_demo?: boolean;
  created_at: string;
}

export interface QuotationLineItem {
  id: string;
  service_category: string;
  service_name: string;
  description: string;
  quantity: number;
  setup_charge: number;
  monthly_recurring_charge: number;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface AdminQuotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  business_name?: string;
  phone?: string;
  instagram_username?: string;
  quotation_date: string;
  valid_until: string;
  items: QuotationLineItem[];
  discount_amount: number;
  discount_percentage?: number;
  tax_rate: number; // e.g. 18 for 18% GST
  notes?: string;
  terms_and_conditions?: string;
  status: QuotationStatus;
  sent_via?: 'whatsapp' | 'instagram';
  sent_at?: string;
  pdf_url?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCommentAutomation {
  id: string;
  reel_media_id: string;
  reel_thumbnail: string;
  reel_caption: string;
  publish_date: string;
  is_enabled: boolean;
  trigger_keyword: string;
  automatic_dm_message: string;
  last_execution_at?: string;
  last_status?: 'success' | 'failed' | 'pending';
  last_error?: string;
  matching_comments_count: number;
  successful_replies_count: number;
  failed_replies_count: number;
  is_demo?: boolean;
  created_at: string;
}

export type WorkflowStatus = 'active' | 'inactive' | 'running' | 'failed' | 'unknown';

export interface AdminWorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: 'success' | 'error' | 'running';
  execution_id: string;
  started_at: string;
  stopped_at?: string;
  duration_ms?: number;
  error_message?: string;
  failed_node_name?: string;
  retry_of?: string;
  is_demo?: boolean;
}

export interface AdminWorkflow {
  id: string;
  workflow_id: string;
  name: string;
  is_active: boolean;
  last_execution_status: 'success' | 'error' | 'running' | 'unknown';
  last_execution_at?: string;
  success_count: number;
  failure_count: number;
  recent_executions: AdminWorkflowExecution[];
  is_demo?: boolean;
}

export interface AdminVpsMetrics {
  id: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown' | 'not_connected';
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_percent: number;
  uptime_seconds: number;
  n8n_status: 'running' | 'restarting' | 'stopped' | 'unknown';
  n8n_response_time_ms: number;
  n8n_healthy: boolean;
  last_checked_at: string;
  recent_errors?: string[];
  is_demo?: boolean;
}

export interface AdminIntegrationStatus {
  service_name: 'supabase' | 'whatsapp' | 'instagram' | 'n8n' | 'google_sheets' | 'vps';
  status: 'connected' | 'disconnected' | 'error';
  last_sync_at?: string | null;
  error_message?: string;
  details?: Record<string, unknown>;
}

export type ReelTriggerMode = 'any_comment' | 'keywords';

export interface InstagramReelRule {
  id: string;
  media_id: string;
  permalink?: string | null;
  thumbnail_url?: string | null;
  title: string;
  is_enabled: boolean;
  trigger_mode: ReelTriggerMode;
  keywords: string[];
  initial_dm_text: string;
  details_text: string;
  follow_required: boolean;
  whatsapp_prefill_text?: string | null;
  comments_count: number;
  private_replies_count: number;
  dm_conversations_count: number;
  verified_follows_count: number;
  failed_sends_count: number;
  last_synced_at?: string | null;
  is_demo?: boolean;
  created_at: string;
  updated_at?: string;
}

export type PrivateReplyState = 'pending' | 'sent' | 'failed' | 'consumed';

export interface InstagramCommentIntent {
  id: string;
  comment_id: string;
  media_id: string;
  ig_user_id?: string | null;
  username?: string | null;
  rule_id?: string | null;
  private_reply_state: PrivateReplyState;
  private_reply_provider_id?: string | null;
  comment_text?: string | null;
  error_message?: string | null;
  expires_at: string;
  source_attribution: string;
  created_at: string;
  updated_at?: string;
}

export interface InstagramCustomerContext {
  id: string;
  ig_user_id: string;
  pending_media_id?: string | null;
  pending_rule_id?: string | null;
  last_inbound_at: string;
  first_dm_at: string;
  last_event_at: string;
  follow_status: 'follows' | 'not_following' | 'unknown';
  context_expires_at: string;
  created_at: string;
  updated_at?: string;
}

export interface InstagramAutomationEvent {
  id: string;
  event_type: string;
  media_id?: string | null;
  rule_id?: string | null;
  ig_user_id?: string | null;
  username?: string | null;
  comment_id?: string | null;
  follow_status?: string | null;
  provider_success: boolean;
  error_message?: string | null;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface InstagramCampaignPayload {
  id: string;
  media_id: string;
  active: boolean;
  initial_message: string;
  details_text: string;
  follow_required: boolean;
}

export interface InstagramDmContextResponse {
  approved: boolean;
  event_type: 'dm';
  event_id: string;
  ig_user_id: string;
  username: string;
  text: string;
  quick_reply_payload?: string;
  mode: 'ai' | 'human';
  reply_allowed: boolean;
  is_first_dm: boolean;
  whatsapp_url: string;
  campaign: InstagramCampaignPayload | null;
  clear_campaign?: boolean;
}

export interface InstagramCommentCheckResponse {
  approved: boolean;
  event_type: 'comment';
  event_id?: string;
  comment_id: string;
  media_id: string;
  ig_user_id?: string;
  username?: string;
  text?: string;
  timestamp?: string;
  reply_text?: string;
  rule_id?: string;
}

