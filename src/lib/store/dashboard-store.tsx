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
  const [integrationStatuses] = useState<AdminIntegrationStatus[]>(DEMO_INTEGRATION_STATUS);
  const [timeFilter, setTimeFilter] = useState<'today' | '7d' | '30d'>('7d');

  // Sync to localStorage
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
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c))
    );
  };

  const toggleAutomationPaused = (id: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              automation_paused: !c.automation_paused,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const toggleManualTakeover = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextTakeover = !c.manual_takeover;
          return {
            ...c,
            manual_takeover: nextTakeover,
            // When manual takeover is active, automation should automatically pause
            automation_paused: nextTakeover ? true : c.automation_paused,
            updated_at: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  };

  const updateInternalNotes = (id: string, notes: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, internal_notes: notes, updated_at: new Date().toISOString() } : c))
    );
  };

  const sendMessage = async (
    conversationId: string,
    content: string,
    senderType: 'human_agent' | 'automation_rule' = 'human_agent'
  ) => {
    const newMessage: AdminMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_type: senderType,
      sender_name: senderType === 'human_agent' ? 'Aman Rajbhar (Manual Takeover)' : 'TBW Bot',
      content,
      created_at: new Date().toISOString(),
      status: 'sent',
      is_demo: false, // manual messages by admin are real actions
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
              last_message_at: new Date().toISOString(),
              manual_takeover: true,
              automation_paused: true,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const updateLeadStatus = (id: string, status: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status, updated_at: new Date().toISOString() } : l))
    );
  };

  const addLead = (newLeadData: Omit<AdminLead, 'id' | 'created_at' | 'updated_at'>) => {
    const newLead: AdminLead = {
      ...newLeadData,
      id: `lead-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_demo: false,
    };
    setLeads((prev) => [newLead, ...prev]);
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  const addAppointment = (newApptData: Omit<AdminAppointment, 'id' | 'created_at'>) => {
    const newAppt: AdminAppointment = {
      ...newApptData,
      id: `appt-${Date.now()}`,
      created_at: new Date().toISOString(),
      is_demo: false,
    };
    setAppointments((prev) => [newAppt, ...prev]);
  };

  const saveQuotation = (quotation: AdminQuotation) => {
    setQuotations((prev) => {
      const exists = prev.some((q) => q.id === quotation.id);
      if (exists) {
        return prev.map((q) => (q.id === quotation.id ? { ...quotation, updated_at: new Date().toISOString() } : q));
      }
      return [quotation, ...prev];
    });
  };

  const updateQuotationStatus = (
    id: string,
    status: QuotationStatus,
    sentVia?: 'whatsapp' | 'instagram'
  ) => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status,
              ...(sentVia ? { sent_via: sentVia, sent_at: new Date().toISOString() } : {}),
              updated_at: new Date().toISOString(),
            }
          : q
      )
    );
  };

  const toggleReelAutomation = (id: string) => {
    setCommentAutomations((prev) =>
      prev.map((ra) => (ra.id === id ? { ...ra, is_enabled: !ra.is_enabled } : ra))
    );
  };

  const updateReelAutomation = (id: string, trigger_keyword: string, automatic_dm_message: string) => {
    setCommentAutomations((prev) =>
      prev.map((ra) =>
        ra.id === id ? { ...ra, trigger_keyword, automatic_dm_message } : ra
      )
    );
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
