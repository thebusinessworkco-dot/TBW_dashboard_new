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
  custom_name?: string;
  phone?: string;
  instagram_username?: string;
  instagram_scoped_id?: string;
  email?: string;
  avatar_url?: string;
  company_name?: string;
  notes?: string;
  tags?: string[];
  last_activity_at?: string;
  created_at: string;
  updated_at?: string;
  is_demo?: boolean;
}

export interface AdminConversation {
  id: string;
  contact_id: string;
  contact: AdminContact;
  platform: ConversationPlatform;
  status: ConversationStatus;
  session_customer_name?: string;
  session_number?: number;
  selected_language?: string;
  closed_at?: string;
  session_data?: Record<string, unknown>;
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
  require_follow?: boolean;
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
  require_follow?: boolean;
  follow_instructions_text?: string | null;
  follow_button_label?: string | null;
  post_unlock_primary_action?: string | null;
  first_interactive_followup?: string | null;
  whatsapp_prefill_text?: string | null;
  auto_comment_reply_enabled?: boolean;
  auto_comment_reply_text?: string | null;
  auto_comment_reply_variations?: string[];
  public_replies_count?: number;
  is_available?: boolean;
  availability_status?: 'published' | 'deleted_or_unavailable';
  rule_status_reason?: string | null;
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

export interface InstagramSyncedReel {
  media_id: string;
  shortcode: string;
  caption: string;
  permalink: string;
  thumbnail_url?: string;
  media_url?: string;
  timestamp: string;
  media_type: 'VIDEO' | 'IMAGE' | 'CAROUSEL_ALBUM';
  media_product_type?: string;
  comments_count?: number;
  like_count?: number;
  views_count?: number;
  shares_count?: number;
  reach_count?: number;
  saves_count?: number;
  rule_id?: string | null;
  rule_enabled?: boolean;
  is_available?: boolean;
  availability_status?: 'published' | 'deleted_or_unavailable';
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
  public_reply_status?: 'none' | 'pending' | 'sent' | 'failed';
  public_reply_text?: string | null;
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
  require_follow?: boolean;
  follow_instructions_text?: string | null;
  follow_button_label?: string | null;
  first_interactive_followup?: string | null;
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
  is_following?: boolean;
  follow_status?: 'follows' | 'not_following' | 'unknown';
  already_verified?: boolean;
  campaign: InstagramCampaignPayload | null;
  clear_campaign?: boolean;
}

export interface InstagramCommentCheckResponse {
  approved: boolean;
  event_type?: 'comment';
  event_id?: string;
  comment_id: string;
  media_id: string;
  ig_user_id?: string;
  username?: string;
  text?: string;
  timestamp?: string;
  reply_text?: string;
  rule_id?: string;
  is_following?: boolean;
  follow_status?: 'follows' | 'not_following' | 'unknown';
  template?: Record<string, unknown> | null;
  quick_replies?: Array<{ content_type: string; title: string; payload?: string }> | null;
  public_reply_enabled?: boolean;
  public_reply_text?: string | null;
  public_reply?: {
    enabled: boolean;
    comment_id: string;
    text: string | null;
  };
  error?: string;
}
export interface InstagramAutomationAnalytics {
  connected_reels: number;
  active_reels: number;
  archived_reels: number;
  total_reels_discovered: number;
  active_rules_count: number;
  comments_ingested: number;
  real_comments_received: number;
  eligible_comments: number;
  private_replies_sent: number;
  private_replies_failed: number;
  duplicate_comments_ignored: number;
  comments_skipped: number;
  public_replies_sent: number;
  verified_follows: number;
  total_historical_verified_follows: number;
  test_events_count: number;
  verified_follow_rate?: string;
  total_likes?: number;
  total_views?: number;
  total_shares?: number;
  total_reach?: number;
  total_saves?: number;
  per_reel?: Record<string, {
    comments_count: number;
    private_replies_count: number;
    public_replies_count: number;
    verified_follows_count: number;
    like_count?: number;
    views_count?: number;
    shares_count?: number;
    reach_count?: number;
    saves_count?: number;
  }>;
}


export interface AdminAuditLog {
  id: string;
  admin_user_id?: string | null;
  admin_email: string;
  action: string;
  target_entity: string;
  target_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}

export type TeamRole = 'superadmin' | 'admin' | 'manager' | 'agent' | 'observer';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  avatar?: string;
  phone?: string;
  added_at: string;
  last_active_at?: string;
  status: 'active' | 'invited' | 'suspended';
  permissions: {
    can_manage_contacts: boolean;
    can_manage_chats: boolean;
    can_takeover_bot: boolean;
    can_manage_leads: boolean;
    can_manage_appointments: boolean;
    can_manage_quotations: boolean;
    can_manage_automations: boolean;
    can_manage_settings: boolean;
    can_view_audit_logs: boolean;
  };
}

export interface GeneralSettings {
  company_name: string;
  tagline: string;
  support_email: string;
  support_phone: string;
  website_url: string;
  timezone: string;
  business_hours: string;
  address: string;
}

export interface BrandSettings {
  brand_name: string;
  tagline: string;
  primary_color: string;
  accent_sage: string;
  neutral_ivory: string;
  logo_url?: string;
  favicon_url?: string;
}

export interface NotificationSettings {
  suppressed_testing_numbers: string[];
  enable_telegram_alerts: boolean;
  enable_whatsapp_admin_alerts: boolean;
  alert_on_new_lead: boolean;
  alert_on_appointment: boolean;
  alert_on_human_takeover: boolean;
  alert_on_workflow_failure: boolean;
  alert_on_vps_high_load: boolean;
}
