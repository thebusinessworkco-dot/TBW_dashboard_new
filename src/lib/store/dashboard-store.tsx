'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  ConversationStatus,
  LeadStatus,
  AppointmentStatus,
  QuotationStatus,
} from '../types/dashboard';
import {
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  DEMO_COMMENT_AUTOMATIONS,
  DEMO_LEADS,
  DEMO_APPOINTMENTS,
  DEMO_QUOTATIONS,
  DEMO_WORKFLOWS,
  DEMO_VPS_METRICS,
  DEMO_INTEGRATION_STATUS,
} from '../demo-data';
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
  timeFilter: 'today' | '7d' | '30d';
  setTimeFilter: (filter: 'today' | '7d' | '30d') => void;

  // Actions
  updateConversationStatus: (id: string, status: ConversationStatus) => void;
  toggleAutomationPaused: (id: string) => void;
  toggleManualTakeover: (id: string) => void;
  updateInternalNotes: (id: string, notes: string) => void;
  sendMessage: (conversationId: string, content: string, senderType?: 'human_agent' | 'automation_rule') => Promise<void>;
  
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

  // Demo Data Management
  removeDemoData: () => void;
}

const DashboardStoreContext = createContext<DashboardStoreContextType | null>(null);

const STORAGE_KEYS = {
  CONVERSATIONS: 'tbw_admin_conversations',
  MESSAGES: 'tbw_admin_messages',
  AUTOMATIONS: 'tbw_admin_automations',
  LEADS: 'tbw_admin_leads',
  APPOINTMENTS: 'tbw_admin_appointments',
  QUOTATIONS: 'tbw_admin_quotations',
  WORKFLOWS: 'tbw_admin_workflows',
  VPS: 'tbw_admin_vps',
  INTEGRATIONS: 'tbw_admin_integrations',
};

export function DashboardStoreProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<AdminConversation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return DEMO_CONVERSATIONS;
  });

  const [messages, setMessages] = useState<Record<string, AdminMessage[]>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return DEMO_MESSAGES;
  });

  const [commentAutomations, setCommentAutomations] = useState<AdminCommentAutomation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return DEMO_COMMENT_AUTOMATIONS;
  });

  const [leads, setLeads] = useState<AdminLead[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.LEADS);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return DEMO_LEADS;
  });

  const [appointments, setAppointments] = useState<AdminAppointment[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return DEMO_APPOINTMENTS;
  });

  const [quotations, setQuotations] = useState<AdminQuotation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return DEMO_QUOTATIONS;
  });

  const [workflows, setWorkflows] = useState<AdminWorkflow[]>(DEMO_WORKFLOWS);
  const [vpsMetrics, setVpsMetrics] = useState<AdminVpsMetrics>(DEMO_VPS_METRICS);
  const [integrationStatuses, setIntegrationStatuses] = useState<AdminIntegrationStatus[]>(DEMO_INTEGRATION_STATUS);
  const [timeFilter, setTimeFilter] = useState<'today' | '7d' | '30d'>('7d');

  // Supabase live database sync & Authenticated Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let isMounted = true;

    async function syncSupabaseData() {
      try {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user || !isMounted) return;

        // 1. Fetch conversations
        const { data: liveConvs, error: convErr } = await supabase!
          .from('admin_conversations')
          .select('*, contact:admin_contacts(*)')
          .order('last_message_at', { ascending: false });

        if (!convErr && liveConvs && isMounted && liveConvs.length > 0) {
          setConversations(liveConvs as unknown as AdminConversation[]);
        }

        // 2. Fetch messages
        const { data: liveMsgs, error: msgErr } = await supabase!
          .from('admin_messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (!msgErr && liveMsgs && isMounted && liveMsgs.length > 0) {
          const grouped: Record<string, AdminMessage[]> = {};
          (liveMsgs as AdminMessage[]).forEach((m) => {
            if (!grouped[m.conversation_id]) {
              grouped[m.conversation_id] = [];
            }
            grouped[m.conversation_id].push(m);
          });
          setMessages(grouped);
        }

        // 3. Fetch leads
        const { data: liveLeads, error: leadErr } = await supabase!
          .from('admin_leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (!leadErr && liveLeads && isMounted && liveLeads.length > 0) {
          setLeads(liveLeads as AdminLead[]);
        }

        // 4. Fetch appointments
        const { data: liveAppts, error: apptErr } = await supabase!
          .from('admin_appointments')
          .select('*')
          .order('appointment_date', { ascending: true });

        if (!apptErr && liveAppts && isMounted && liveAppts.length > 0) {
          setAppointments(liveAppts as AdminAppointment[]);
        }

        // 5. Fetch comment automations
        const { data: liveAutos, error: autoErr } = await supabase!
          .from('admin_comment_automations')
          .select('*')
          .order('publish_date', { ascending: false });

        if (!autoErr && liveAutos && isMounted && liveAutos.length > 0) {
          setCommentAutomations(liveAutos as AdminCommentAutomation[]);
        }

        // 6. Fetch quotations
        const { data: liveQuots, error: quotErr } = await supabase!
          .from('admin_quotations')
          .select('*, items:admin_quotation_items(*)')
          .order('quotation_date', { ascending: false });

        if (!quotErr && liveQuots && isMounted && liveQuots.length > 0) {
          setQuotations(liveQuots as unknown as AdminQuotation[]);
        }

        // 7. Fetch integration status
        const { data: liveStatus, error: statusErr } = await supabase!
          .from('admin_integration_status')
          .select('*');

        if (!statusErr && liveStatus && isMounted && liveStatus.length > 0) {
          setIntegrationStatuses(liveStatus as AdminIntegrationStatus[]);
        }
      } catch (err) {
        console.warn('Supabase data synchronization notice:', err);
      }
    }

    syncSupabaseData();

    // Authenticated Realtime subscriptions for admin_conversations and admin_messages
    const channel = supabase
      .channel('admin_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_conversations' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as AdminConversation;
            setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as AdminConversation;
            setConversations((prev) =>
              prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c))
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
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime channel warning:', err);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync to localStorage as local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
      localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(commentAutomations));
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
      localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(quotations));
    } catch {
      // Ignore quota exceeded
    }
  }, [conversations, messages, commentAutomations, leads, appointments, quotations]);

  const hasDemoData =
    conversations.some((c) => c.is_demo) ||
    leads.some((l) => l.is_demo) ||
    appointments.some((a) => a.is_demo) ||
    quotations.some((q) => q.is_demo) ||
    commentAutomations.some((ca) => ca.is_demo);

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
  ) => {
    const nowIso = new Date().toISOString();
    const newMessage: AdminMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_type: senderType,
      sender_name: senderType === 'human_agent' ? 'Aman Rajbhar (Manual Takeover)' : 'TBW Bot',
      content,
      created_at: nowIso,
      status: 'sent',
      is_demo: false,
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage],
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

    const supabase = createClient();
    if (supabase) {
      await supabase.from('admin_messages').insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_name: newMessage.sender_name,
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

  const removeDemoData = () => {
    // PRESERVES ALL REAL RECORDS, ONLY PURGES is_demo === true
    setConversations((prev) => prev.filter((c) => !c.is_demo));
    
    setMessages((prev) => {
      const cleaned: Record<string, AdminMessage[]> = {};
      Object.entries(prev).forEach(([convId, msgs]) => {
        const nonDemo = msgs.filter((m) => !m.is_demo);
        if (nonDemo.length > 0) {
          cleaned[convId] = nonDemo;
        }
      });
      return cleaned;
    });

    setCommentAutomations((prev) => prev.filter((ra) => !ra.is_demo));
    setLeads((prev) => prev.filter((l) => !l.is_demo));
    setAppointments((prev) => prev.filter((a) => !a.is_demo));
    setQuotations((prev) => prev.filter((q) => !q.is_demo));
    setWorkflows((prev) => prev.filter((w) => !w.is_demo));

    // Reset VPS snapshot to uninitialized/not connected if it was only demo
    if (vpsMetrics.is_demo) {
      setVpsMetrics({
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
      });
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      localStorage.removeItem(STORAGE_KEYS.AUTOMATIONS);
      localStorage.removeItem(STORAGE_KEYS.LEADS);
      localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
      localStorage.removeItem(STORAGE_KEYS.QUOTATIONS);
    } catch {
      // ignore
    }

    // Call Supabase RPC to purge server-side demo rows
    const supabase = createClient();
    if (supabase) {
      supabase.rpc('remove_all_demo_data').then();
    }
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
