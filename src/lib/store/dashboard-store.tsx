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
  realtimeStatus: 'connected' | 'connecting' | 'fallback_polling' | 'disconnected';
  timeFilter: 'today' | '7d' | '30d';
  setTimeFilter: (filter: 'today' | '7d' | '30d') => void;

  // Actions
  updateConversationStatus: (id: string, status: ConversationStatus) => void;
  toggleAutomationPaused: (id: string) => void;
  toggleManualTakeover: (id: string) => void;
  updateInternalNotes: (id: string, notes: string) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    senderType?: 'human_agent' | 'automation_rule'
  ) => Promise<{ success: boolean; error?: string }>;
  
  // Leads
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addLead: (lead: Omit<AdminLead, 'id' | 'created_at' | 'updated_at'>) => void;

  // Appointments
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  addAppointment: (appointment: Omit<AdminAppointment, 'id' | 'created_at'>) => void;

  // Quotations
  saveQuotation: (quotation: AdminQuotation) => void;
  updateQuotationStatus: (id: string, status: QuotationStatus, sentVia?: 'whatsapp' | 'instagram') => void;

  // Comment Automations
  toggleReelAutomation: (id: string) => void;
  updateReelAutomation: (id: string, keyword: string, message: string) => void;

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
      setMessages(grouped);

      setLeads((leadsRes.data || []) as AdminLead[]);
      setAppointments((apptsRes.data || []) as AdminAppointment[]);
      setCommentAutomations((autosRes.data || []) as AdminCommentAutomation[]);
      setQuotations((quotsRes.data || []) as unknown as AdminQuotation[]);

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

      const [convsRes, msgsRes] = await Promise.all([
        supabase
          .from('admin_conversations')
          .select('*, contact:admin_contacts(*)')
          .order('last_message_at', { ascending: false }),
        supabase
          .from('admin_messages')
          .select('*')
          .order('created_at', { ascending: true }),
      ]);

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
            const map = new Map<string, AdminMessage>();
            existing.forEach((m) => map.set(m.id, m));
            list.forEach((m) => map.set(m.id, m));
            merged[cId] = Array.from(map.values()).sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          return merged;
        });
      }
    } catch {
      // Quiet background sync - non-blocking
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
                if (
                  convMsgs.some(
                    (m) =>
                      m.id === newMsg.id ||
                      (newMsg.external_message_id &&
                        m.external_message_id === newMsg.external_message_id)
                  )
                ) {
                  return prev;
                }
                return {
                  ...prev,
                  [newMsg.conversation_id]: [...convMsgs, newMsg],
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
                return prev.map((c) =>
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
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as AdminMessage;
              setMessages((prev) => {
                const convMsgs = prev[updatedMsg.conversation_id] || [];
                return {
                  ...prev,
                  [updatedMsg.conversation_id]: convMsgs.map((m) =>
                    m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
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

    // 10-second background polling fallback to ensure zero missed messages
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void silentSync();
      }
    }, 10000);

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
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      authSub.unsubscribe();
      window.removeEventListener('online', handleOnline);
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
    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_conversations').update({ status, updated_at }).eq('id', id).then();
    }
  };

  const toggleAutomationPaused = (id: string) => {
    let nextVal = false;
    const updated_at = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          nextVal = !c.automation_paused;
          return {
            ...c,
            automation_paused: nextVal,
            updated_at,
          };
        }
        return c;
      })
    );
    const supabase = createClient();
    if (supabase) {
      supabase.from('admin_conversations').update({ automation_paused: nextVal, updated_at }).eq('id', id).then();
    }
  };

  const toggleManualTakeover = (id: string) => {
    let nextTakeover = false;
    const updated_at = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          nextTakeover = !c.manual_takeover;
          return {
            ...c,
            manual_takeover: nextTakeover,
            automation_paused: nextTakeover ? true : c.automation_paused,
            updated_at,
          };
        }
        return c;
      })
    );
    const supabase = createClient();
    if (supabase) {
      supabase
        .from('admin_conversations')
        .update({
          manual_takeover: nextTakeover,
          automation_paused: nextTakeover ? true : undefined,
          updated_at,
        })
        .eq('id', id)
        .then();
    }
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

        // Update optimistic message with real messageId from Meta
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === tempId
              ? { ...m, status: 'sent', external_message_id: data.messageId }
              : m
          ),
        }));

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

        // Update optimistic message with real messageId from Meta
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === tempId
              ? { ...m, status: 'sent', external_message_id: data.messageId }
              : m
          ),
        }));

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

  const saveQuotation = (quotation: AdminQuotation) => {
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
      supabase
        .from('admin_quotations')
        .upsert({
          ...quotationRecord,
          is_demo: false,
          updated_at,
        })
        .then(() => {
          if (items && items.length > 0) {
            supabase
              .from('admin_quotation_items')
              .insert(
                items.map((it) => ({
                  quotation_id: quotation.id,
                  service_category: it.service_category,
                  service_name: it.service_name,
                  description: it.description,
                  quantity: it.quantity,
                  setup_charge: it.setup_charge,
                  monthly_recurring_charge: it.monthly_recurring_charge,
                  is_demo: false,
                }))
              )
              .then();
          }
        });
    }
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
        realtimeStatus,
        timeFilter,
        setTimeFilter,
        updateConversationStatus,
        toggleAutomationPaused,
        toggleManualTakeover,
        updateInternalNotes,
        sendMessage,
        updateLeadStatus,
        addLead,
        updateAppointmentStatus,
        addAppointment,
        saveQuotation,
        updateQuotationStatus,
        toggleReelAutomation,
        updateReelAutomation,
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
