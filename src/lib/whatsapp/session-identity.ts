import type { AdminContact, AdminConversation } from '../types/dashboard';

export interface SessionMetadata {
  session_customer_name?: string | null;
  session_number?: number;
  selected_language?: string;
  closed_at?: string | null;
  close_reason?: string | null;
  customer_classification?: 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER';
  [key: string]: unknown;
}

const META_PREFIX = '[SESSION_META:';
const META_SUFFIX = ']';
export const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Extracts session metadata from conversation.
 * Checks conversation.session_customer_name / session_data first, then parses internal_notes fallback.
 */
export function extractSessionMetadata(conversation?: Partial<AdminConversation> | null): SessionMetadata {
  if (!conversation) return {};

  const meta: SessionMetadata = {};

  // Direct column values if present
  if (conversation.session_customer_name) {
    meta.session_customer_name = conversation.session_customer_name;
  }
  if (typeof conversation.session_number === 'number') {
    meta.session_number = conversation.session_number;
  }
  if (conversation.selected_language) {
    meta.selected_language = conversation.selected_language;
  }
  if (conversation.closed_at) {
    meta.closed_at = conversation.closed_at;
  }

  // Parse session_data if present
  if (conversation.session_data && typeof conversation.session_data === 'object') {
    Object.assign(meta, conversation.session_data);
    if (!meta.session_customer_name && (conversation.session_data as Record<string, unknown>).session_customer_name) {
      meta.session_customer_name = String((conversation.session_data as Record<string, unknown>).session_customer_name);
    }
  }

  // Parse internal_notes fallback tag: [SESSION_META:{...}]
  if (conversation.internal_notes && conversation.internal_notes.includes(META_PREFIX)) {
    try {
      const startIdx = conversation.internal_notes.indexOf(META_PREFIX) + META_PREFIX.length;
      const endIdx = conversation.internal_notes.indexOf(META_SUFFIX, startIdx);
      if (endIdx > startIdx) {
        const jsonStr = conversation.internal_notes.slice(startIdx, endIdx);
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object') {
          if (!meta.session_customer_name && parsed.session_customer_name) {
            meta.session_customer_name = parsed.session_customer_name;
          }
          if (meta.session_number === undefined && parsed.session_number !== undefined) {
            meta.session_number = parsed.session_number;
          }
          if (!meta.selected_language && parsed.selected_language) {
            meta.selected_language = parsed.selected_language;
          }
          if (!meta.closed_at && parsed.closed_at) {
            meta.closed_at = parsed.closed_at;
          }
        }
      }
    } catch {
      // Ignore JSON parse error in notes
    }
  }

  return meta;
}

/**
 * Encodes metadata into internal_notes while preserving any user notes
 */
export function encodeSessionNotes(existingNotes: string | undefined | null, meta: SessionMetadata): string {
  let cleanNotes = (existingNotes || '').trim();
  const startIdx = cleanNotes.indexOf(META_PREFIX);
  if (startIdx !== -1) {
    const endIdx = cleanNotes.indexOf(META_SUFFIX, startIdx);
    if (endIdx !== -1) {
      cleanNotes = (cleanNotes.slice(0, startIdx) + cleanNotes.slice(endIdx + META_SUFFIX.length)).trim();
    }
  }

  const metaString = `${META_PREFIX}${JSON.stringify(meta)}${META_SUFFIX}`;
  return cleanNotes ? `${cleanNotes}\n${metaString}` : metaString;
}

/**
 * Checks if a conversation session is expired (>20 minutes of inactivity) or closed
 */
export function isSessionExpired(conversation: Partial<AdminConversation>): boolean {
  if (conversation.status === 'completed' || conversation.status === 'failed') {
    return true;
  }
  if (conversation.closed_at) {
    return true;
  }

  const lastActivityTime = conversation.last_message_at
    ? new Date(conversation.last_message_at).getTime()
    : conversation.updated_at
    ? new Date(conversation.updated_at).getTime()
    : conversation.created_at
    ? new Date(conversation.created_at).getTime()
    : 0;

  if (!lastActivityTime) return false;
  return Date.now() - lastActivityTime > INACTIVITY_TIMEOUT_MS;
}

/**
 * Extracts tags from contact record or notes.
 * Checks contact.tags first, then parses notes fallback [TAGS: tag1, tag2].
 */
export function extractContactTags(contact?: Partial<AdminContact> | null): string[] {
  if (!contact) return [];
  if (Array.isArray(contact.tags) && contact.tags.length > 0) {
    return contact.tags;
  }
  const notes = contact.notes || '';
  const match = notes.match(/\[TAGS:\s*([^\]]+)\]/i);
  if (match && match[1]) {
    return match[1]
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Encodes tags into contact notes string while preserving existing text.
 */
export function encodeContactTags(existingNotes: string | null | undefined, tags: string[]): string {
  const clean = (existingNotes || '').replace(/\[TAGS:\s*[^\]]+\]/gi, '').trim();
  const cleanTags = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  if (cleanTags.length === 0) return clean;
  const tagStr = `[TAGS: ${cleanTags.join(', ')}]`;
  return clean ? `${clean}\n${tagStr}` : tagStr;
}

/**
 * 1. WhatsApp Live Inbox Name Priority:
 * Primary: Current session's customer name
 * Secondary: Admin custom contact name (if different)
 * Fallback: Phone number
 */
export function getWhatsAppInboxDisplayName(conversation?: Partial<AdminConversation> | null): {
  primaryName: string;
  secondaryName?: string;
  isCustomAdminName: boolean;
} {
  if (!conversation) {
    return { primaryName: 'Unknown Contact', isCustomAdminName: false };
  }

  const meta = extractSessionMetadata(conversation);
  const sessionName = meta.session_customer_name?.trim();
  const contact = conversation.contact;
  const adminCustomName = (contact?.custom_name || contact?.name || '').trim();
  const phone = (contact?.phone || '').trim();
  const fallback = phone || 'Unknown';

  const hasAdminCustomName = Boolean(adminCustomName && !adminCustomName.startsWith('+') && adminCustomName !== phone);

  if (sessionName) {
    // Primary is session customer name
    if (hasAdminCustomName && adminCustomName !== sessionName) {
      return {
        primaryName: sessionName,
        secondaryName: adminCustomName,
        isCustomAdminName: true,
      };
    }
    return {
      primaryName: sessionName,
      isCustomAdminName: false,
    };
  }

  if (hasAdminCustomName) {
    return {
      primaryName: adminCustomName,
      isCustomAdminName: true,
    };
  }

  return {
    primaryName: fallback,
    isCustomAdminName: false,
  };
}

/**
 * 2. Contact Directory Name Priority:
 * Primary: Admin custom contact name
 * Secondary: Latest session customer name
 * Fallback: Phone number
 */
export function getContactDirectoryDisplayName(
  contact?: Partial<AdminContact> | null,
  latestConversation?: Partial<AdminConversation> | null
): {
  primaryName: string;
  secondaryName?: string;
  phone: string;
} {
  const adminCustomName = (contact?.custom_name || contact?.name || '').trim();
  const phone = (contact?.phone || '').trim();
  const meta = extractSessionMetadata(latestConversation);
  const sessionName = meta.session_customer_name?.trim();
  const fallback = phone || 'Unnamed Contact';

  const hasAdminCustomName = Boolean(adminCustomName && !adminCustomName.startsWith('+') && adminCustomName !== phone);

  if (hasAdminCustomName) {
    return {
      primaryName: adminCustomName,
      secondaryName: sessionName && sessionName !== adminCustomName ? sessionName : undefined,
      phone,
    };
  }

  if (sessionName) {
    return {
      primaryName: sessionName,
      phone,
    };
  }

  return {
    primaryName: fallback,
    phone,
  };
}

/**
 * 3. Conversation History Name Priority:
 * Always show the customer name as it was captured during that specific session.
 */
export function getConversationHistoryDisplayName(conversation?: Partial<AdminConversation> | null): string {
  if (!conversation) return 'Unknown Session';
  const meta = extractSessionMetadata(conversation);
  if (meta.session_customer_name?.trim()) {
    return meta.session_customer_name.trim();
  }
  const contactName = conversation.contact?.custom_name || conversation.contact?.name;
  if (contactName && !contactName.startsWith('+')) {
    return contactName.trim();
  }
  return conversation.contact?.phone || 'Conversation Session';
}

/**
 * 4. Customer Profile Sidebar Identity Separation:
 * Clearly separates:
 * - Admin Custom Name (editable by admin)
 * - Current Session Name (read-only, from current session)
 * - Previous Session Names (history list)
 */
export function getCustomerProfileSidebarNames(
  conversation?: Partial<AdminConversation> | null,
  allContactConversations: Partial<AdminConversation>[] = []
): {
  adminCustomName: string;
  currentSessionName: string | null;
  currentSessionNumber: number;
  currentSessionLanguage: string;
  previousSessions: Array<{
    id: string;
    sessionNumber: number;
    sessionCustomerName: string | null;
    createdAt: string;
    closedAt: string | null;
    status: string;
    language: string;
  }>;
} {
  const currentMeta = extractSessionMetadata(conversation);
  const contact = conversation?.contact;
  const adminCustomName = (contact?.custom_name || contact?.name || '').trim();
  const currentSessionName = currentMeta.session_customer_name || null;
  const currentSessionNumber = currentMeta.session_number || 1;
  const currentSessionLanguage = currentMeta.selected_language || 'English';

  const sortedConvs = [...allContactConversations].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const previousSessions = sortedConvs
    .filter((c) => c.id !== conversation?.id)
    .map((c, idx) => {
      const meta = extractSessionMetadata(c);
      return {
        id: c.id || `sess_${idx}`,
        sessionNumber: meta.session_number || sortedConvs.length - idx - 1,
        sessionCustomerName: meta.session_customer_name || null,
        createdAt: c.created_at || new Date().toISOString(),
        closedAt: c.closed_at || meta.closed_at || null,
        status: c.status || 'completed',
        language: meta.selected_language || 'English',
      };
    });

  return {
    adminCustomName,
    currentSessionName,
    currentSessionNumber,
    currentSessionLanguage,
    previousSessions,
  };
}
