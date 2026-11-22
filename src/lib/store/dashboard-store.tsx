'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminConversation,
  AdminMessage,
  AdminContact,
  AdminLead,
  AdminAppointment,
  AdminQuotation,
  AdminCommentAutomation,
  AdminWorkflow,
  AdminVpsMetrics,
  AdminIntegrationStatus,
  ConversationStatus,
  LeadStatus,
  AppointmentStatus,
  QuotationStatus,
} from '../types/dashboard';
import { createClient } from '../supabase/client';

interface DashboardStoreContextType {
  // Data
  conversations: AdminConversation[];
  messages: Record<string, AdminMessage[]>;
  commentAutomations: AdminCommentAutomation[];
  leads: AdminLead[];
  appointments: AdminAppointment[];
  quotations: AdminQuotation[];
  workflows: AdminWorkflow[];
  vpsMetrics: AdminVpsMetrics;
  integrationStatuses: AdminIntegrationStatus[];
  hasDemoData: boolean;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  fetchConversationMessages: (conversationId: string) => Promise<void>;
  realtimeStatus: 'connected' | 'connecting' | 'fallback_polling' | 'disconnected';
  timeFilter: 'today' | '7d' | '30d';
  setTimeFilter: (filter: 'today' | '7d' | '30d') => void;

  // Actions
  updateConversationStatus: (id: string, status: ConversationStatus) => void;
  toggleAutomationPaused: (id: string, explicitVal?: boolean) => void;
  toggleManualTakeover: (id: string, explicitTakeover?: boolean) => void;
  updateInternalNotes: (id: string, notes: string) => void;
  updateContactName: (contactId: string, name: string) => Promise<boolean>;
  createContact: (data: {
    name: string;
    phone: string;
    company_name?: string;
    notes?: string;
    tags?: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  updateContact: (
    contactId: string,
    data: {
      name?: string;
      company_name?: string;
      notes?: string;
      tags?: string[];
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteContact: (
    contactId: string,
    phone: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  bulkAddTags: (contactIds: string[], tag: string) => Promise<{ success: boolean; count: number }>;
  bulkDeleteContacts: (
    contactsToDelete: Array<{ id: string; phone: string }>
  ) => Promise<{ success: boolean; count: number }>;
  syncAllMessages: () => Promise<{ success: boolean; count: number }>;
  sendMessage: (
    conversationId: string,
    content: string,
    senderType?: 'human_agent' | 'automation_rule'
  ) => Promise<{ success: boolean; error?: string }>;
  
  // Leads
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  updateLead: (id: string, updates: Partial<AdminLead>) => Promise<{ success: boolean; error?: string }>;
  addLead: (lead: Omit<AdminLead, 'id' | 'created_at' | 'updated_at'>) => void;
  linkLeadToContact: (leadId: string, contactId?: string) => Promise<{ success: boolean; contactId?: string; error?: string }>;

  // Google Sheets Sync
  syncGoogleSheets: () => Promise<boolean>;
  isSyncingSheets: boolean;
  lastSheetsSyncAt: string | null;

  // Appointments
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointment: (id: string, updates: Partial<AdminAppointment>) => Promise<{ success: boolean; error?: string }>;
  addAppointment: (appointment: Omit<AdminAppointment, 'id' | 'created_at'>) => void;
  cancelAppointment: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;

  // Quotations
  saveQuotation: (quotation: AdminQuotation) => Promise<{ success: boolean; error?: string }>;
  updateQuotationStatus: (id: string, status: QuotationStatus, sentVia?: 'whatsapp' | 'instagram') => void;
  deleteQuotation: (id: string) => Promise<{ success: boolean; error?: string }>;
  duplicateQuotation: (id: string) => Promise<{ success: boolean; newId?: string; error?: string }>;

  // Comment Automations
  toggleReelAutomation: (id: string) => void;
  updateReelAutomation: (id: string, keyword: string, message: string) => void;

  // Mobile Navigation Drawer State
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  // Sidebar Desktop Collapsed State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapse: () => void;

  // Theme State
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;

  // Demo Data Management (Disabled in Production)
  removeDemoData: () => void;
}

const DashboardStoreContext = createContext<DashboardStoreContextType | null>(null);

const DEFAULT_VPS_METRICS: AdminVpsMetrics = {
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

const DEFAULT_INTEGRATION_STATUSES: AdminIntegrationStatus[] = [
  {
    service_name: 'supabase',
    status: 'connected',
    last_sync_at: new Date().toISOString(),
    details: { note: 'Primary PostgreSQL & Auth engine connected' },
  },
  {
    service_name: 'whatsapp',
    status: 'disconnected',
    details: { note: 'Awaiting Cloud API tokens' },
  },
  {
    service_name: 'instagram',
    status: 'disconnected',
    details: { note: 'Awaiting Graph API tokens' },
  },
  {
    service_name: 'n8n',
    status: 'disconnected',
    details: { note: 'Awaiting VPS webhook integration' },
  },
  {
    service_name: 'google_sheets',
    status: 'disconnected',
    details: { note: 'Awaiting Google Service Account credentials' },
  },
  {
    service_name: 'vps',
    status: 'disconnected',
    details: { note: 'Awaiting VPS agent telemetry' },
  },
];

/**
 * Deterministically sorts WhatsApp and Instagram messages:
 * 1. Primary: Event timestamp with millisecond precision
 * 2. Secondary (tie-breaker for identical timestamps): Customer message precedes automation/bot reply
 * 3. Tertiary: Stable unique message ID
 */
export function sortMessagesDeterministic(messages: AdminMessage[]): AdminMessage[] {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    // Tie-breaker: customer messages always precede replies at the exact same timestamp
    if (a.sender_type === 'customer' && b.sender_type !== 'customer') return -1;
    if (a.sender_type !== 'customer' && b.sender_type === 'customer') return 1;
    // Tie-breaker 2: stable ID comparison
    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Deduplicate and sort messages deterministically:
 * 1. Discards temporary optimistic messages (id starts with 'msg-' or 'temp-') when a matching confirmed
 *    message with identical external_message_id or identical (sender_type, content, timestamp ±60s) exists.
 * 2. Deduplicates by unique database ID and external_message_id (e.g. Meta wamid).
 * 3. Sorts chronologically with tie-breakers (customer messages precede replies at exact same millisecond).
 */
export function deduplicateAndSortMessages(messages: AdminMessage[]): AdminMessage[] {
  if (!messages || messages.length === 0) return [];

  const result: AdminMessage[] = [];
  const seenIds = new Set<string>();
  const seenExternalIds = new Set<string>();

  // Find all confirmed messages (real DB records)
  const confirmed = messages.filter(
    (m) => !m.id.startsWith('msg-') && !m.id.startsWith('temp-')
  );
  const confirmedExternalIds = new Set(
    confirmed.map((c) => c.external_message_id).filter(Boolean) as string[]
  );

  for (const m of messages) {
    const isTemp = m.id.startsWith('msg-') || m.id.startsWith('temp-');

    if (isTemp) {
      // 1. If this temp message has an external_message_id already confirmed in DB, skip temp
      if (m.external_message_id && confirmedExternalIds.has(m.external_message_id)) {
        continue;
      }
      // 2. If a confirmed message with same conversation, sender_type, and content exists within 60s, skip temp
      const hasConfirmedMatch = confirmed.some((c) => {
        if (c.conversation_id !== m.conversation_id) return false;
        if (c.sender_type !== m.sender_type) return false;
        if ((c.content || '').trim() !== (m.content || '').trim()) return false;
        const timeDiff = Math.abs(
          new Date(c.created_at).getTime() - new Date(m.created_at).getTime()
        );
        return timeDiff < 60000;
      });
      if (hasConfirmedMatch) {
        continue;
      }
    }

    if (seenIds.has(m.id)) {
      continue;
    }

    if (m.external_message_id && seenExternalIds.has(m.external_message_id)) {
      continue;
    }

    seenIds.add(m.id);
    if (m.external_message_id) {
      seenExternalIds.add(m.external_message_id);
    }
    result.push(m);
  }

  return sortMessagesDeterministic(result);
}

export function DashboardStoreProvider({ children }: { children: React.ReactNode }) {
  // Pure Supabase state: initialized strictly empty without any mock/demo records
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, AdminMessage[]>>({});
  const [commentAutomations, setCommentAutomations] = useState<AdminCommentAutomation[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [quotations, setQuotations] = useState<AdminQuotation[]>([]);
  const [workflows, setWorkflows] = useState<AdminWorkflow[]>([]);
  const [vpsMetrics, setVpsMetrics] = useState<AdminVpsMetrics>(DEFAULT_VPS_METRICS);
  const [integrationStatuses, setIntegrationStatuses] = useState<AdminIntegrationStatus[]>(DEFAULT_INTEGRATION_STATUSES);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'fallback_polling' | 'disconnected'>('connecting');
  const [timeFilter, setTimeFilter] = useState<'today' | '7d' | '30d'>('7d');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem('tbw_sidebar_collapsed');
      if (savedCollapsed === 'true') {
        setSidebarCollapsedState(true);
      }
    } catch {}
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem('tbw_sidebar_collapsed', String(collapsed));
    } catch {}
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tbw_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Theme management (Light / Dark / System)
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('light');

  const applyThemeToDOM = useCallback((t: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const isDark =
      t === 'dark' ||
      (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tbw_theme') as 'light' | 'dark' | 'system' | null;
      const initial = saved || 'light';
      setThemeState(initial);
      applyThemeToDOM(initial);
    } catch {}

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      try {
        const current = localStorage.getItem('tbw_theme');
        if (current === 'system') {
          applyThemeToDOM('system');
        }
      } catch {}
    };
    media.addEventListener('change', handleMediaChange);
    return () => media.removeEventListener('change', handleMediaChange);
  }, [applyThemeToDOM]);

  const setTheme = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      setThemeState(newTheme);
      try {
        localStorage.setItem('tbw_theme', newTheme);
      } catch {}
      applyThemeToDOM(newTheme);
    },
    [applyThemeToDOM]
  );

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const targetTheme = isCurrentlyDark ? 'light' : 'dark';
    setTheme(targetTheme);
  }, [setTheme]);

  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  // Google Sheets synchronization states and trigger
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [lastSheetsSyncAt, setLastSheetsSyncAt] = useState<string | null>(null);

  const syncGoogleSheets = useCallback(async (): Promise<boolean> => {
    setIsSyncingSheets(true);
    try {
      const res = await fetch('/api/sync/google-sheets', { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setLastSheetsSyncAt(data.syncedAt || new Date().toISOString());
        const supabase = createClient();
        if (supabase) {
          const [freshLeadsRes, freshApptsRes] = await Promise.all([
            supabase.from('admin_leads').select('*').order('created_at', { ascending: false }),
            supabase.from('admin_appointments').select('*').order('appointment_date', { ascending: true }),
          ]);
          if (freshLeadsRes.data) setLeads(freshLeadsRes.data as AdminLead[]);
          if (freshApptsRes.data) setAppointments(freshApptsRes.data as AdminAppointment[]);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Google Sheets sync error:', err);
      return false;
    } finally {
      setIsSyncingSheets(false);
    }
  }, []);

  // Purge any legacy demo keys from localStorage and sessionStorage on mount
  useEffect(() => {
    const LEGACY_KEYS = [
      'tbw_admin_conversations',
      'tbw_admin_messages',
      'tbw_admin_automations',
      'tbw_admin_leads',
      'tbw_admin_appointments',
      'tbw_admin_quotations',
      'tbw_admin_workflows',
      'tbw_admin_vps',
      'tbw_admin_integrations',
    ];

    if (typeof window !== 'undefined') {
      LEGACY_KEYS.forEach((key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch {
          // ignore
        }
      });
    }
  }, []);

  // Fetch live records directly from Supabase (Single Source of Truth)
  const refreshData = useCallback(async () => {
    await Promise.resolve();
    const supabase = createClient();
    if (!supabase) return;

    try {
      setError(null);
      setIsLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setIsLoading(false);
        return;
      }

      // Query live tables in parallel
      const [
        convsRes,
        msgsRes,
        leadsRes,
        apptsRes,
        autosRes,
        quotsRes,
        wfsRes,
        vpsRes,
        statusRes,
      ] = await Promise.all([
        supabase
          .from('admin_conversations')
          .select('*, contact:admin_contacts(*)')
          .order('last_message_at', { ascending: false }),
        supabase
          .from('admin_messages')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('admin_leads')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('admin_appointments')
          .select('*')
          .order('appointment_date', { ascending: true }),
        supabase
          .from('admin_comment_automations')
          .select('*')
          .order('publish_date', { ascending: false }),
        supabase
          .from('admin_quotations')
          .select('*, items:admin_quotation_items(*)')
          .order('quotation_date', { ascending: false }),
        supabase
          .from('admin_workflow_executions')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(20),
        supabase
          .from('admin_vps_metrics')
          .select('*')
          .order('last_checked_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('admin_integration_status')
          .select('*'),
      ]);

      if (convsRes.error) {
        throw new Error(convsRes.error.message);
      }

      // Empty database tables map to empty arrays. Ensure each conversation has a guaranteed contact object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sanitizedConvs = ((convsRes.data || []) as any[]).map((c) => ({
        ...c,
        contact: c.contact || {
          id: c.contact_id || 'unknown',
          name: c.platform === 'whatsapp' ? 'WhatsApp Contact' : 'Instagram User',
          phone: c.platform === 'whatsapp' ? 'No phone' : undefined,
          created_at: c.created_at || new Date().toISOString(),
          is_demo: false,
        },
      }));
      setConversations(sanitizedConvs as unknown as AdminConversation[]);

      const grouped: Record<string, AdminMessage[]> = {};
      ((msgsRes.data || []) as AdminMessage[]).forEach((m) => {
        if (!grouped[m.conversation_id]) {
          grouped[m.conversation_id] = [];
        }
        grouped[m.conversation_id].push(m);
      });
      Object.keys(grouped).forEach((convId) => {
        grouped[convId] = deduplicateAndSortMessages(grouped[convId]);
      });
      setMessages(grouped);

      setLeads((leadsRes.data || []) as AdminLead[]);
      setAppointments((apptsRes.data || []) as AdminAppointment[]);
      setCommentAutomations((autosRes.data || []) as AdminCommentAutomation[]);
      setQuotations((quotsRes.data || []) as unknown as AdminQuotation[]);

      // If database contains 0 leads, immediately trigger automatic initial synchronization from Google Sheets
      if (!leadsRes.data || leadsRes.data.length === 0) {
        void fetch('/api/sync/google-sheets', { method: 'POST', cache: 'no-store' })
          .then((res) => res.json())
          .then((resData) => {
            if (resData.success) {
              setLastSheetsSyncAt(resData.syncedAt || new Date().toISOString());
              supabase
                .from('admin_leads')
                .select('*')
                .order('created_at', { ascending: false })
                .then(({ data: freshLeads }) => {
                  if (freshLeads) setLeads(freshLeads as AdminLead[]);
                });
              supabase
                .from('admin_appointments')
                .select('*')
                .order('appointment_date', { ascending: true })
                .then(({ data: freshAppts }) => {
                  if (freshAppts) setAppointments(freshAppts as AdminAppointment[]);
                });
            }
          })
          .catch(() => {});
      }

      if (wfsRes.data && wfsRes.data.length > 0) {
        const wfMap = new Map<string, AdminWorkflow>();
        wfsRes.data.forEach((exec) => {
          if (!wfMap.has(exec.workflow_id)) {
            wfMap.set(exec.workflow_id, {
              id: exec.workflow_id,
              workflow_id: exec.workflow_id,
              name: exec.workflow_name,
              is_active: exec.status !== 'error',
              last_execution_at: exec.started_at,
              last_execution_status: exec.status,
              success_count: exec.status === 'success' ? 1 : 0,
              failure_count: exec.status === 'error' ? 1 : 0,
              recent_executions: [exec],
            });
          } else {
            const existing = wfMap.get(exec.workflow_id)!;
            if (exec.status === 'success') existing.success_count++;
            if (exec.status === 'error') existing.failure_count++;
            existing.recent_executions.push(exec);
          }
        });
        setWorkflows(Array.from(wfMap.values()));
      } else {
        setWorkflows([]);
      }

      if (vpsRes.data) {
        setVpsMetrics(vpsRes.data as AdminVpsMetrics);
      } else {
        setVpsMetrics(DEFAULT_VPS_METRICS);
      }

      if (statusRes.data && statusRes.data.length > 0) {
        setIntegrationStatuses(statusRes.data as AdminIntegrationStatus[]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Database communication failed';
      console.error('Supabase query error:', message);
      setError(`Unable to connect to Supabase database: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Silent background sync that merges updates without full-page loaders or UI flicker
  const silentSync = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [convsRes, msgsRes, leadsRes, apptsRes] = await Promise.all([
        supabase
          .from('admin_conversations')
          .select('*, contact:admin_contacts(*)')
          .order('last_message_at', { ascending: false }),
        supabase
          .from('admin_messages')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('admin_leads')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('admin_appointments')
          .select('*')
          .order('appointment_date', { ascending: true }),
      ]);

      if (leadsRes.data) setLeads(leadsRes.data as AdminLead[]);
      if (apptsRes.data) setAppointments(apptsRes.data as AdminAppointment[]);

      if (convsRes.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sanitized = (convsRes.data as any[]).map((c) => ({
          ...c,
          contact: c.contact || {
            id: c.contact_id || 'unknown',
            name: c.platform === 'whatsapp' ? 'WhatsApp Contact' : 'Instagram User',
            phone: c.platform === 'whatsapp' ? 'No phone' : undefined,
            created_at: c.created_at || new Date().toISOString(),
            is_demo: false,
          },
        }));
        setConversations(sanitized as unknown as AdminConversation[]);
      }

      if (msgsRes.data) {
        const incomingGrouped: Record<string, AdminMessage[]> = {};
        (msgsRes.data as AdminMessage[]).forEach((m) => {
          if (!incomingGrouped[m.conversation_id]) incomingGrouped[m.conversation_id] = [];
          incomingGrouped[m.conversation_id].push(m);
        });

        setMessages((prev) => {
          const merged: Record<string, AdminMessage[]> = { ...prev };
          Object.entries(incomingGrouped).forEach(([cId, list]) => {
            const existing = merged[cId] || [];
            merged[cId] = deduplicateAndSortMessages([...list, ...existing]);
          });
          return merged;
        });
      }
    } catch {
      // Quiet background sync - non-blocking
    }
  }, []);

  // Targeted message fetch for active conversation ensuring immediate, non-truncated message list
  const fetchConversationMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data, error: msgErr } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgErr) {
        console.warn('Error fetching messages for conversation:', msgErr.message);
        return;
      }

      if (data) {
        setMessages((prev) => {
          const existing = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: deduplicateAndSortMessages([...(data as AdminMessage[]), ...existing]),
          };
        });
      }
    } catch (err) {
      console.warn('fetchConversationMessages error:', err);
    }
  }, []);

  // Initial load, multi-table Realtime subscriptions, and background sync fallback
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshData();

    // Setup authenticated Realtime subscriptions for admin_conversations, admin_messages, and admin_contacts
    const setupRealtime = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          // Explicitly pass session JWT to Realtime WebSocket so PostgreSQL evaluates RLS as authenticated
          await supabase.realtime.setAuth(session.access_token);
        }
      } catch (err) {
        console.warn('Realtime setAuth init warning:', err);
      }

      if (!isMounted) return;

      channel = supabase
        .channel('admin_realtime_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_conversations' },
          (payload) => {
            if (!isMounted) return;
            if (payload.eventType === 'INSERT') {
              const rawNew = payload.new as AdminConversation;
              // Fetch complete record with joined contact relation
              supabase
                .from('admin_conversations')
                .select('*, contact:admin_contacts(*)')
                .eq('id', rawNew.id)
                .maybeSingle()
                .then(({ data }) => {
                  if (!isMounted) return;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const fresh = data as any;
                  const safeConv: AdminConversation = {
                    ...(fresh || rawNew),
                    contact: fresh?.contact || {
                      id: rawNew.contact_id || 'unknown',
                      name: rawNew.platform === 'whatsapp' ? 'WhatsApp Contact' : 'Instagram User',
                      created_at: rawNew.created_at,
                      is_demo: false,
                    },
                  };
                  setConversations((prev) => [safeConv, ...prev.filter((c) => c.id !== safeConv.id)]);
                });
            } else if (payload.eventType === 'UPDATE') {
              const updatedConv = payload.new as AdminConversation;
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === updatedConv.id
                    ? {
                        ...c,
                        ...updatedConv,
                        // Preserve existing joined contact relation!
                        contact: c.contact || {
                          id: updatedConv.contact_id || 'unknown',
                          name: updatedConv.platform === 'whatsapp' ? 'WhatsApp Contact' : 'Instagram User',
                          created_at: updatedConv.created_at,
                          is_demo: false,
                        },
                      }
                    : c
                )
              );
            } else if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as { id?: string })?.id;
              if (oldId) {
                setConversations((prev) => prev.filter((c) => c.id !== oldId));
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_messages' },
          (payload) => {
            if (!isMounted) return;
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as AdminMessage;
              setMessages((prev) => {
                const convMsgs = prev[newMsg.conversation_id] || [];
                // Check if there is an in-flight optimistic message matching newMsg
                const optIndex = convMsgs.findIndex((m) => {
                  if (m.id === newMsg.id) return true;
                  if (newMsg.external_message_id && m.external_message_id === newMsg.external_message_id) return true;
                  const isTemp = m.id.startsWith('msg-') || m.id.startsWith('temp-');
                  if (
                    isTemp &&
                    m.sender_type === newMsg.sender_type &&
                    (m.content || '').trim() === (newMsg.content || '').trim()
                  ) {
                    const diff = Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime());
                    return diff < 60000;
                  }
                  return false;
                });

                let updated: AdminMessage[];
                if (optIndex !== -1) {
                  updated = [...convMsgs];
                  updated[optIndex] = newMsg;
                } else {
                  updated = [...convMsgs, newMsg];
                }

                return {
                  ...prev,
                  [newMsg.conversation_id]: deduplicateAndSortMessages(updated),
                };
              });

              // Immediately update the corresponding conversation's preview and timestamp
              setConversations((prev) => {
                const exists = prev.some((c) => c.id === newMsg.conversation_id);
                if (!exists) {
                  // Fetch the brand new conversation immediately so it appears at top of list
                  supabase
                    .from('admin_conversations')
                    .select('*, contact:admin_contacts(*)')
                    .eq('id', newMsg.conversation_id)
                    .maybeSingle()
                    .then(({ data }) => {
                      if (data && isMounted) {
                        setConversations((current) => [
                          data as unknown as AdminConversation,
                          ...current.filter((c) => c.id !== data.id),
                        ]);
                      }
                    });
                  return prev;
                }
                const updated = prev.map((c) =>
                  c.id === newMsg.conversation_id
                    ? {
                        ...c,
                        last_message: newMsg.content || c.last_message,
                        last_message_at: newMsg.created_at || new Date().toISOString(),
                        unread_count:
                          newMsg.sender_type === 'customer'
                            ? (c.unread_count || 0) + 1
                            : c.unread_count,
                      }
                    : c
                );
                // Float the conversation with the freshest message to the top
                return [...updated].sort((a, b) => {
                  const timeA = new Date(a.last_message_at || a.created_at || 0).getTime();
                  const timeB = new Date(b.last_message_at || b.created_at || 0).getTime();
                  return timeB - timeA;
                });
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as AdminMessage;
              setMessages((prev) => {
                const convMsgs = prev[updatedMsg.conversation_id] || [];
                return {
                  ...prev,
                  [updatedMsg.conversation_id]: sortMessagesDeterministic(
                    convMsgs.map((m) =>
                      m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
                    )
                  ),
                };
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_contacts' },
          (payload) => {
            if (!isMounted) return;
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const updatedContact = payload.new as AdminContact;
              setConversations((prev) =>
                prev.map((c) =>
                  c.contact_id === updatedContact.id
                    ? {
                        ...c,
                        contact: { ...c.contact, ...updatedContact },
                      }
                    : c
                )
              );
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_leads' },
          () => {
            if (!isMounted) return;
            supabase
              .from('admin_leads')
              .select('*')
              .order('created_at', { ascending: false })
              .then(({ data }) => {
                if (data && isMounted) setLeads(data as AdminLead[]);
              });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_appointments' },
          () => {
            if (!isMounted) return;
            supabase
              .from('admin_appointments')
              .select('*')
              .order('appointment_date', { ascending: true })
              .then(({ data }) => {
                if (data && isMounted) setAppointments(data as AdminAppointment[]);
              });
          }
        )
        .subscribe((status, err) => {
          if (!isMounted) return;
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('Realtime channel status warning:', status, err);
            setRealtimeStatus('fallback_polling');
          }
        });
    };

    void setupRealtime();

    // Listen for auth state changes (token refresh) to keep Realtime authenticated
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token && isMounted) {
        try {
          await supabase.realtime.setAuth(session.access_token);
        } catch {
          // ignore
        }
      }
    });

    // 3-second background polling fallback to ensure near real-time synchronization
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void silentSync();
      }
    }, 3000);

    // Reconnection and tab wake listeners
    const handleOnline = () => {
      setRealtimeStatus('connecting');
      void refreshData();
      void setupRealtime();
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void silentSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      authSub.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refreshData, silentSync]);

  // Production state has no demo records
  const hasDemoData = false;

  const updateConversationStatus = (id: string, status: ConversationStatus) => {
    const updated_at = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, updated_at } : c))
    );
    // Reliable server-side update with service role admin client
    fetch('/api/whatsapp/takeover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, status }),
    }).catch(() => {});

    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_conversations').update({ status, updated_at }).eq('id', id).then();
    }
  };

  const toggleAutomationPaused = (id: string, explicitVal?: boolean) => {
    const targetConv = conversations.find((c) => c.id === id);
    const nextVal = typeof explicitVal === 'boolean' ? explicitVal : (targetConv ? !targetConv.automation_paused : true);
    const updated_at = new Date().toISOString();

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            automation_paused: nextVal,
            updated_at,
          };
        }
        return c;
      })
    );
    // Reliable server-side update with service role admin client
    fetch('/api/whatsapp/takeover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: id, automationPaused: nextVal }),
    }).catch(() => {});

    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_conversations').update({ automation_paused: nextVal, updated_at }).eq('id', id).then();
    }
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: nextVal ? 'BOT_AUTOMATION_PAUSED' : 'BOT_AUTOMATION_RESUMED',
        targetEntity: 'CONVERSATION',
        targetId: id,
        metadata: { automation_paused: nextVal },
      }),
    }).catch(() => {});
  };

  const toggleManualTakeover = (id: string, explicitTakeover?: boolean) => {
    const targetConv = conversations.find((c) => c.id === id);
    const nextTakeover = typeof explicitTakeover === 'boolean' ? explicitTakeover : (targetConv ? !targetConv.manual_takeover : true);
    const updated_at = new Date().toISOString();

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            manual_takeover: nextTakeover,
            automation_paused: nextTakeover,
            updated_at,
          };
        }
        return c;
      })
    );

    // Reliable server-side update with service role admin client
    fetch('/api/whatsapp/takeover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: id,
        takeover: nextTakeover,
        automationPaused: nextTakeover,
      }),
    }).catch(() => {});

    const supabase = createClient();
    if (supabase) {
      supabase
        .from('admin_conversations')
        .update({
          manual_takeover: nextTakeover,
          automation_paused: nextTakeover,
          updated_at,
        })
        .eq('id', id)
        .then();
    }
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: nextTakeover ? 'MANUAL_TAKEOVER_ENABLED' : 'MANUAL_TAKEOVER_DISABLED',
        targetEntity: 'CONVERSATION',
        targetId: id,
        metadata: { manual_takeover: nextTakeover },
      }),
    }).catch(() => {});
  };

  const updateContactName = async (contactId: string, name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed || !contactId) return false;
    const updated_at = new Date().toISOString();

    setConversations((prev) =>
      prev.map((c) => {
        if (c.contact_id === contactId || c.contact?.id === contactId) {
          return {
            ...c,
            contact: {
              ...(c.contact || { id: contactId, created_at: updated_at, phone: '' }),
              name: trimmed,
              updated_at,
            },
            updated_at,
          };
        }
        return c;
      })
    );

    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, name: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CONTACT_UPDATE_NAME',
            targetEntity: 'CONTACT',
            targetId: contactId,
            metadata: { new_name: trimmed },
          }),
        }).catch(() => {});
      }
      return Boolean(data.success);
    } catch {
      return false;
    }
  };

  const createContact = async (data: {
    name: string;
    phone: string;
    company_name?: string;
    notes?: string;
    tags?: string[];
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await refreshData();
        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to create contact' };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  };

  const updateContact = async (
    contactId: string,
    data: {
      name?: string;
      company_name?: string;
      notes?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, ...data }),
      });
      const json = await res.json();
      if (json.success) {
        await refreshData();
        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to update contact' };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  };

  const deleteContact = async (
    contactId: string,
    phone: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch(`/api/whatsapp/contacts/${encodeURIComponent(contactId)}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (json.success) {
        setConversations((prev) =>
          prev.filter((c) => c.contact_id !== contactId && c.contact?.id !== contactId)
        );
        await refreshData();
        return { success: true, message: json.message };
      }
      return { success: false, error: json.error || 'Failed to delete contact' };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  };

  const bulkAddTags = async (contactIds: string[], tag: string): Promise<{ success: boolean; count: number }> => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || contactIds.length === 0) return { success: false, count: 0 };
    let successCount = 0;
    for (const cid of contactIds) {
      const conv = conversations.find((c) => c.contact_id === cid || c.contact?.id === cid);
      const existingTags = conv?.contact?.tags || [];
      if (!existingTags.includes(trimmedTag)) {
        const nextTags = [...existingTags, trimmedTag];
        const ok = await updateContact(cid, { tags: nextTags });
        if (ok.success) successCount++;
      }
    }
    await refreshData();
    return { success: true, count: successCount };
  };

  const bulkDeleteContacts = async (
    contactsToDelete: Array<{ id: string; phone: string }>
  ): Promise<{ success: boolean; count: number }> => {
    let count = 0;
    for (const c of contactsToDelete) {
      const ok = await deleteContact(c.id, c.phone);
      if (ok.success) count++;
    }
    return { success: true, count };
  };

  const syncAllMessages = async (): Promise<{ success: boolean; count: number }> => {
    await refreshData();
    const waConvs = conversations.filter((c) => c.platform === 'whatsapp');
    const promises = waConvs.map((c) => fetchConversationMessages(c.id));
    await Promise.allSettled(promises);
    return { success: true, count: waConvs.length };
  };

  const updateInternalNotes = (id: string, notes: string) => {
    const updated_at = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, internal_notes: notes, updated_at } : c))
    );
    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_conversations').update({ internal_notes: notes, updated_at }).eq('id', id).then();
    }
  };

  const sendMessage = async (
    conversationId: string,
    content: string,
    senderType: 'human_agent' | 'automation_rule' = 'human_agent'
  ): Promise<{ success: boolean; error?: string }> => {
    const targetConv = conversations.find((c) => c.id === conversationId);
    const nowIso = new Date().toISOString();

    const tempId = `msg-${Date.now()}`;
    const optimisticMessage: AdminMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_type: senderType,
      sender_name: senderType === 'human_agent' ? 'Aman Rajbhar (Manual Takeover)' : 'TBW Bot',
      content,
      created_at: nowIso,
      status: 'queued',
      is_demo: false,
    };

    // Optimistic UI update
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              last_message: content,
              last_message_at: nowIso,
              manual_takeover: true,
              automation_paused: true,
              updated_at: nowIso,
            }
          : c
      )
    );

    // If target is WhatsApp, dispatch via official Meta WhatsApp Cloud API endpoint
    if (targetConv?.platform === 'whatsapp') {
      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            content,
            senderType,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Update optimistic message status to failed
          setMessages((prev) => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map((m) =>
              m.id === tempId ? { ...m, status: 'failed' } : m
            ),
          }));

          return {
            success: false,
            error: data.error || 'Meta WhatsApp Cloud API failed to send message.',
          };
        }

        // Reconcile optimistic message with real messageId from Meta and real Supabase DB ID
        const realDbId = (data.id || data.data?.id || data.message?.id) as string | undefined;
        const realMetaId = (data.messageId || data.data?.external_message_id) as string | undefined;

        setMessages((prev) => {
          const convMsgs = prev[conversationId] || [];
          const alreadyHasReal = convMsgs.some(
            (m) =>
              (realDbId && m.id === realDbId) ||
              (realMetaId && m.external_message_id === realMetaId && m.id !== tempId)
          );

          let updated: AdminMessage[];
          if (alreadyHasReal) {
            updated = convMsgs.filter((m) => m.id !== tempId);
          } else {
            updated = convMsgs.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    id: realDbId || m.id,
                    status: 'sent',
                    external_message_id: realMetaId || m.external_message_id,
                  }
                : m
            );
          }
          return {
            ...prev,
            [conversationId]: deduplicateAndSortMessages(updated),
          };
        });

        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error';
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === tempId ? { ...m, status: 'failed' } : m
          ),
        }));
        return { success: false, error: message };
      }
    }

    // If target is Instagram, dispatch via official Meta Instagram Graph API endpoint
    if (targetConv?.platform === 'instagram') {
      try {
        const response = await fetch('/api/instagram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            content,
            senderType,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Update optimistic message status to failed
          setMessages((prev) => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map((m) =>
              m.id === tempId ? { ...m, status: 'failed' } : m
            ),
          }));

          return {
            success: false,
            error: data.error || 'Meta Instagram Graph API failed to send message.',
          };
        }

        // Reconcile optimistic message with real messageId from Meta and real Supabase DB ID
        const realDbId = (data.id || data.data?.id || data.message?.id) as string | undefined;
        const realMetaId = (data.messageId || data.data?.external_message_id) as string | undefined;

        setMessages((prev) => {
          const convMsgs = prev[conversationId] || [];
          const alreadyHasReal = convMsgs.some(
            (m) =>
              (realDbId && m.id === realDbId) ||
              (realMetaId && m.external_message_id === realMetaId && m.id !== tempId)
          );

          let updated: AdminMessage[];
          if (alreadyHasReal) {
            updated = convMsgs.filter((m) => m.id !== tempId);
          } else {
            updated = convMsgs.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    id: realDbId || m.id,
                    status: 'sent',
                    external_message_id: realMetaId || m.external_message_id,
                  }
                : m
            );
          }
          return {
            ...prev,
            [conversationId]: deduplicateAndSortMessages(updated),
          };
        });

        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error';
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === tempId ? { ...m, status: 'failed' } : m
          ),
        }));
        return { success: false, error: message };
      }
    }

    // Direct Supabase write for custom/internal channels
    const supabase = createClient();
    if (supabase) {
      await supabase.from('admin_messages').insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_name: optimisticMessage.sender_name,
        content,
        status: 'sent',
        is_demo: false,
      });

      await supabase
        .from('admin_conversations')
        .update({
          last_message: content,
          last_message_at: nowIso,
          manual_takeover: true,
          automation_paused: true,
          updated_at: nowIso,
        })
        .eq('id', conversationId);
    }

    return { success: true };
  };

  const updateLeadStatus = (id: string, status: LeadStatus) => {
    const updated_at = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status, updated_at } : l))
    );
    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_leads').update({ status, updated_at }).eq('id', id).then();
    }
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'LEAD_STATUS_UPDATE',
        targetEntity: 'LEAD',
        targetId: id,
        metadata: { status },
      }),
    }).catch(() => {});
  };

  const updateLead = async (id: string, updates: Partial<AdminLead>): Promise<{ success: boolean; error?: string }> => {
    const updated_at = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updated_at } : l))
    );
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('admin_leads').update({ ...updates, updated_at }).eq('id', id);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  };

  const linkLeadToContact = async (leadId: string, contactId?: string): Promise<{ success: boolean; contactId?: string; error?: string }> => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return { success: false, error: 'Lead not found' };

    let resolvedContactId = contactId;
    const supabase = createClient();

    if (!resolvedContactId && targetLead.contact_phone && supabase) {
      const normPhone = targetLead.contact_phone.trim();
      const { data: existingContact } = await supabase
        .from('admin_contacts')
        .select('id, name, phone')
        .eq('phone', normPhone)
        .maybeSingle();

      if (existingContact) {
        resolvedContactId = existingContact.id;
      } else {
        const { data: createdContact, error: createErr } = await supabase
          .from('admin_contacts')
          .insert({
            name: targetLead.contact_name,
            phone: normPhone,
            email: targetLead.contact_email,
            company_name: (targetLead.notes?.match(/Business:\s*([^|]+)/i)?.[1] || '').trim() || null,
            is_demo: false,
          })
          .select('id, name, phone')
          .single();

        if (!createErr && createdContact) {
          resolvedContactId = createdContact.id;
        }
      }
    }

    if (resolvedContactId) {
      await updateLead(leadId, { contact_id: resolvedContactId });
      return { success: true, contactId: resolvedContactId };
    }

    return { success: false, error: 'Could not resolve or create contact for lead' };
  };

  const addLead = (newLeadData: Omit<AdminLead, 'id' | 'created_at' | 'updated_at'>) => {
    const nowIso = new Date().toISOString();
    const newLead: AdminLead = {
      ...newLeadData,
      id: `lead-${Date.now()}`,
      created_at: nowIso,
      updated_at: nowIso,
      is_demo: false,
    };
    setLeads((prev) => [newLead, ...prev]);

    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_leads').insert({
        ...newLeadData,
        is_demo: false,
      }).then();
    }
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_appointments').update({ status }).eq('id', id).then();
    }
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'APPOINTMENT_STATUS_UPDATE',
        targetEntity: 'APPOINTMENT',
        targetId: id,
        metadata: { status },
      }),
    }).catch(() => {});
  };

  const updateAppointment = async (id: string, updates: Partial<AdminAppointment>): Promise<{ success: boolean; error?: string }> => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('admin_appointments').update(updates).eq('id', id);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  };

  const cancelAppointment = async (id: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    const targetAppt = appointments.find((a) => a.id === id);
    const updatedNotes = reason ? `${targetAppt?.notes || ''} [Cancelled: ${reason}]`.trim() : targetAppt?.notes;
    return await updateAppointment(id, { status: 'cancelled', notes: updatedNotes });
  };

  const addAppointment = (newApptData: Omit<AdminAppointment, 'id' | 'created_at'>) => {
    const nowIso = new Date().toISOString();
    const newAppt: AdminAppointment = {
      ...newApptData,
      id: `appt-${Date.now()}`,
      created_at: nowIso,
      is_demo: false,
    };
    setAppointments((prev) => [newAppt, ...prev]);

    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_appointments').insert({
        ...newApptData,
        is_demo: false,
      }).then();
    }
  };

  const saveQuotation = async (quotation: AdminQuotation): Promise<{ success: boolean; error?: string }> => {
    const updated_at = new Date().toISOString();
    setQuotations((prev) => {
      const exists = prev.some((q) => q.id === quotation.id);
      if (exists) {
        return prev.map((q) => (q.id === quotation.id ? { ...quotation, updated_at } : q));
      }
      return [quotation, ...prev];
    });

    const supabase = createClient();
    if (supabase) {
      const { items, ...quotationRecord } = quotation;
      const { error: quoteErr } = await supabase
        .from('admin_quotations')
        .upsert({
          ...quotationRecord,
          is_demo: false,
          updated_at,
        });

      if (quoteErr) return { success: false, error: quoteErr.message };

      if (items && items.length > 0) {
        await supabase.from('admin_quotation_items').delete().eq('quotation_id', quotation.id);
        const { error: itemsErr } = await supabase
          .from('admin_quotation_items')
          .insert(
            items.map((it) => ({
              id: it.id && !it.id.startsWith('item-') ? it.id : undefined,
              quotation_id: quotation.id,
              service_category: it.service_category,
              service_name: it.service_name,
              description: it.description,
              quantity: it.quantity || 1,
              setup_charge: it.setup_charge || 0,
              monthly_recurring_charge: it.monthly_recurring_charge || 0,
              is_demo: false,
            }))
          );
        if (itemsErr) return { success: false, error: itemsErr.message };
      }
    }
    return { success: true };
  };

  const deleteQuotation = async (id: string): Promise<{ success: boolean; error?: string }> => {
    setQuotations((prev) => prev.filter((q) => q.id !== id));
    const supabase = createClient();
    if (supabase) {
      await supabase.from('admin_quotation_items').delete().eq('quotation_id', id);
      const { error } = await supabase.from('admin_quotations').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  };

  const duplicateQuotation = async (id: string): Promise<{ success: boolean; newId?: string; error?: string }> => {
    const existing = quotations.find((q) => q.id === id);
    if (!existing) return { success: false, error: 'Quotation not found' };

    const newId = `quot-${Date.now()}`;
    const newNumber = `TBW-2026-${(100 + quotations.length + 1).toString().padStart(4, '0')}`;
    const nowIso = new Date().toISOString();
    const cloned: AdminQuotation = {
      ...existing,
      id: newId,
      quotation_number: newNumber,
      status: 'draft',
      quotation_date: nowIso.split('T')[0],
      items: existing.items.map((it, idx) => ({ ...it, id: `item-${Date.now()}-${idx}` })),
      created_at: nowIso,
      updated_at: nowIso,
    };
    const res = await saveQuotation(cloned);
    return { ...res, newId };
  };

  const updateQuotationStatus = (
    id: string,
    status: QuotationStatus,
    sentVia?: 'whatsapp' | 'instagram'
  ) => {
    const updated_at = new Date().toISOString();
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status,
              ...(sentVia ? { sent_via: sentVia, sent_at: updated_at } : {}),
              updated_at,
            }
          : q
      )
    );
    const supabase = createClient();
    if (supabase) {
      supabase
        .from('admin_quotations')
        .update({
          status,
          ...(sentVia ? { sent_via: sentVia, sent_at: updated_at } : {}),
          updated_at,
        })
        .eq('id', id)
        .then();
    }
  };

  const toggleReelAutomation = (id: string) => {
    let nextVal = false;
    setCommentAutomations((prev) =>
      prev.map((ra) => {
        if (ra.id === id) {
          nextVal = !ra.is_enabled;
          return { ...ra, is_enabled: nextVal };
        }
        return ra;
      })
    );
    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_comment_automations').update({ is_enabled: nextVal }).eq('id', id).then();
    }
  };

  const updateReelAutomation = (id: string, trigger_keyword: string, automatic_dm_message: string) => {
    setCommentAutomations((prev) =>
      prev.map((ra) =>
        ra.id === id ? { ...ra, trigger_keyword, automatic_dm_message } : ra
      )
    );
    const supabase = createClient();
    if (supabase) {
      supabase
        .from('admin_comment_automations')
        .update({ trigger_keyword, automatic_dm_message })
        .eq('id', id)
        .then();
    }
  };

  // Safe no-op in production mode
  const removeDemoData = () => {
    // Zero demo data in production mode
  };

  return (
    <DashboardStoreContext.Provider
      value={{
        conversations,
        messages,
        commentAutomations,
        leads,
        appointments,
        quotations,
        workflows,
        vpsMetrics,
        integrationStatuses,
        hasDemoData,
        isLoading,
        error,
        refreshData,
        fetchConversationMessages,
        realtimeStatus,
        timeFilter,
        setTimeFilter,
        updateConversationStatus,
        toggleAutomationPaused,
        toggleManualTakeover,
        updateInternalNotes,
        updateContactName,
        createContact,
        updateContact,
        deleteContact,
        bulkAddTags,
        bulkDeleteContacts,
        syncAllMessages,
        sendMessage,
        updateLeadStatus,
        updateLead,
        addLead,
        linkLeadToContact,
        syncGoogleSheets,
        isSyncingSheets,
        lastSheetsSyncAt,
        updateAppointmentStatus,
        updateAppointment,
        addAppointment,
        cancelAppointment,
        saveQuotation,
        updateQuotationStatus,
        deleteQuotation,
        duplicateQuotation,
        toggleReelAutomation,
        updateReelAutomation,
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebarCollapse,
        theme,
        setTheme,
        toggleTheme,
        removeDemoData,
      }}
    >
      {children}
    </DashboardStoreContext.Provider>
  );
}

export function useDashboardStore() {
  const context = useContext(DashboardStoreContext);
  if (!context) {
    throw new Error('useDashboardStore must be used within a DashboardStoreProvider');
  }
  return context;
}
