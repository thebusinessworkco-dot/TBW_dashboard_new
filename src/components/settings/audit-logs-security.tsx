'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  Lock,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAuditLog } from '@/lib/types/dashboard';

export function AuditLogsSecurity() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        action: actionFilter,
        search,
      });
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionBadge = (action: string) => {
    if (action.includes('SETTINGS')) {
      return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
    if (action.includes('CONTACT') || action.includes('NAME')) {
      return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    }
    if (action.includes('TAKEOVER') || action.includes('BOT')) {
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
    if (action.includes('LEAD') || action.includes('APPOINTMENT')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    }
    return 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700';
  };

  return (
    <div className="space-y-6">
      {/* SECTION 15 & 16: AUDIT LOGS & SECURITY */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#202B35] p-2 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Administrative Audit Logs & Governance
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Immutable activity trail tracking contact modifications, takeover actions, and settings updates.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Logs
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by actor, action or target..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DDD9D0] bg-white text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-stone-500" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-1.5 text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
            >
              <option value="ALL">All Actions ({total})</option>
              <option value="SETTINGS_UPDATE">Settings Updates</option>
              <option value="CONTACT_UPDATE_NAME">Contact Name Changes</option>
              <option value="MANUAL_TAKEOVER_TOGGLE">Takeover Toggles</option>
              <option value="TEAM_MEMBER_ADD">Team Additions</option>
              <option value="PURGE_DEMO_DATA">System Maintenance</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DDD9D0]/60 bg-[#F4F2EC]/60 text-stone-600 font-semibold uppercase tracking-wider text-[10px] dark:bg-[#121820] dark:border-[#263342] dark:text-stone-400">
              <tr>
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Target Identifier</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0]/50 dark:divide-[#263342]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-stone-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-stone-500">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4F2EC]/30 dark:hover:bg-[#141C24]">
                    <td className="px-4 py-3 font-mono text-[11px] text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900 dark:text-stone-100">
                      {log.admin_email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${actionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-700 dark:text-stone-300">
                      {log.target_entity}
                    </td>
                    <td className="px-4 py-3 font-mono text-stone-500 text-[11px] truncate max-w-xs">
                      {log.target_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="tertiary"
                        size="xs"
                        onClick={() => setSelectedLog(log)}
                        leftIcon={<Eye className="h-3 w-3" />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2">
          <div>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total logs)
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* METADATA INSPECT MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#151C24] dark:border dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#202B35] dark:text-white" />
                <h3 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                  Audit Log Details
                </h3>
              </div>
              <Button
                variant="tertiary"
                size="xs"
                iconOnly
                onClick={() => setSelectedLog(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-stone-50 dark:bg-[#1A232D]">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Action</span>
                  <strong className="text-stone-800 dark:text-stone-200">{selectedLog.action}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Target Entity</span>
                  <strong className="text-stone-800 dark:text-stone-200">{selectedLog.target_entity}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Actor</span>
                  <span className="font-mono text-stone-800 dark:text-stone-200">{selectedLog.admin_email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">IP Address</span>
                  <span className="font-mono text-stone-800 dark:text-stone-200">{selectedLog.ip_address || 'Internal Server'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block mb-1">
                  Metadata Payload (Sanitized - Zero Secrets)
                </span>
                <pre className="p-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
