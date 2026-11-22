'use client';

import React, { useMemo } from 'react';
import {
  X,
  MessageSquare,
  Bot,
  User,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  ExternalLink,
  Calendar,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminConversation, AdminMessage, MessageStatus } from '@/lib/types/dashboard';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import {
  extractSessionMetadata,
  getConversationHistoryDisplayName,
} from '@/lib/whatsapp/session-identity';

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === 'read') {
    return (
      <span title="Read">
        <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span title="Delivered">
        <CheckCheck className="h-3.5 w-3.5 text-[#DDD9D0]" />
      </span>
    );
  }
  if (status === 'sent') {
    return (
      <span title="Sent">
        <Check className="h-3.5 w-3.5 text-[#7D8F82]" />
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span title="Failed">
        <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
      </span>
    );
  }
  return (
    <span title="Queued">
      <Clock className="h-3.5 w-3.5 text-[#7D8F82]" />
    </span>
  );
}

export function SessionMessageInspectorModal({
  isOpen,
  onClose,
  conversation,
  messages = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  conversation: AdminConversation | null;
  messages?: AdminMessage[];
}) {
  const convId = conversation?.id;
  const sessionMessages = useMemo(() => {
    if (!convId) return [];
    return (messages || []).filter((m) => m.conversation_id === convId);
  }, [messages, convId]);

  if (!conversation) return null;

  const meta = extractSessionMetadata(conversation);
  const sessionDisplayName = getConversationHistoryDisplayName(conversation);
  const isHistorical = conversation.status === 'completed' || Boolean(meta.closed_at);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Session Transcript — ${sessionDisplayName}`}
      description={`Session ID: ${conversation.id} · Channel: ${conversation.platform.toUpperCase()} · Status: ${conversation.status}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Session Metadata Banner */}
        <div className="p-3.5 rounded-xl border border-[#DDD9D0] bg-[#F4F2EC]/60 flex flex-wrap items-center justify-between gap-3 text-xs dark:border-[#232D3B] dark:bg-[#141A22]">
          <div className="flex items-center gap-2">
            <Badge variant={isHistorical ? 'neutral' : 'sage'} size="sm">
              {isHistorical ? 'Historical (Read-Only)' : 'Active Session'}
            </Badge>
            <Badge variant="navy" size="sm">
              Session #{meta.session_number || 1}
            </Badge>
            <span className="text-[#566573] dark:text-[#94A4B4]">
              Lang: <strong>{meta.selected_language || 'English'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-[#566573] dark:text-[#94A4B4]">
            <span>Started: {formatDateTime(conversation.created_at)}</span>
            {meta.closed_at && (
              <span>· Closed: {formatDateTime(meta.closed_at)}</span>
            )}
          </div>
        </div>

        {/* Isolated Message Transcript */}
        <div className="h-96 overflow-y-auto p-4 rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] space-y-3 dark:border-[#232D3B] dark:bg-[#0D1217]">
          {sessionMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#566573] dark:text-[#94A4B4]">
              <MessageSquare className="h-8 w-8 text-[#7D8F82] mb-2 opacity-50" />
              <p className="font-semibold">No messages recorded in this session</p>
              <p className="text-[11px] mt-0.5">
                Session was created or ended before message transmission.
              </p>
            </div>
          ) : (
            sessionMessages.map((msg) => {
              const isCustomer = msg.sender_type === 'customer';
              const isAgent = msg.sender_type === 'human_agent';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-[#566573] mb-1 px-1 dark:text-[#94A4B4]">
                    {isCustomer ? (
                      <>
                        <User className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-purple-900 dark:text-purple-300">
                          {meta.session_customer_name || conversation.contact?.name || 'Customer'}
                        </span>
                      </>
                    ) : isAgent ? (
                      <>
                        <ShieldCheck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span className="font-bold text-amber-800 dark:text-amber-300">
                          Human Operator
                        </span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-3 w-3 text-[#7D8F82]" />
                        <span className="font-bold text-[#202B35] dark:text-[#FCFBF8]">
                          TBW AI Autopilot
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                      isCustomer
                        ? 'bg-white border border-[#DDD9D0] text-[#202B35] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#FCFBF8]'
                        : isAgent
                        ? 'bg-amber-600 text-white'
                        : 'bg-[#202B35] text-[#FCFBF8] dark:bg-[#2A3744]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                      <MessageStatusIcon status={msg.status} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
          <div className="text-[11px] text-[#566573] dark:text-[#94A4B4]">
            Total Messages: <strong>{sessionMessages.length}</strong> · Read-only historical audit
          </div>

          <div className="flex items-center gap-2">
            {!isHistorical && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.location.href = `/whatsapp?id=${conversation.id}`;
                }}
                rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Open in Live Inbox
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close Inspector
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
