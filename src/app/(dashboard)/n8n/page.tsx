'use client';

import React, { useState, Suspense, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Workflow,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import type { AdminWorkflow } from '@/lib/types/dashboard';
import {
  formatDateTime,
  formatRelativeTime,
} from '@/lib/utils';

export default function N8nWorkflowsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#7A756D]">Loading n8n Workflows...</div>}>
      <N8nWorkflowsContent />
    </Suspense>
  );
}

function N8nWorkflowsContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter');

  const { workflows: fallbackWorkflows } = useDashboardStore();

  const [liveWorkflows, setLiveWorkflows] = useState<AdminWorkflow[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'loading' | 'connected' | 'missing_credentials' | 'auth_error' | 'network_error'
  >('loading');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, success: 0, failed: 0 });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter || 'all');
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);

  const n8nBaseUrl = process.env.NEXT_PUBLIC_N8N_BASE_URL || 'https://n8n.thebusinesswork.com';

  const fetchN8nWorkflows = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsSyncing(true);
    }
    try {
      const res = await fetch('/api/n8n/workflows', { cache: 'no-store' });
      if (!res.ok) {
        setConnectionStatus('network_error');
        setStatusMessage(`Server responded with HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setConnectionStatus(data.status || (data.connected ? 'connected' : 'network_error'));
      setStatusMessage(data.message || '');
      setLastSyncedAt(data.last_synced_at || null);
      if (data.stats) setStats(data.stats);
      if (Array.isArray(data.workflows)) {
        setLiveWorkflows(data.workflows);
        if (data.workflows.length > 0) {
          setExpandedWorkflowId((prev) => prev || data.workflows[0].id);
        }
      }
    } catch (err) {
      setConnectionStatus('network_error');
      setStatusMessage(err instanceof Error ? err.message : 'Network communication failed');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/n8n/workflows', { cache: 'no-store' });
        if (ignore) return;
        if (!res.ok) {
          setConnectionStatus('network_error');
          setStatusMessage(`Server responded with HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (ignore) return;
        setConnectionStatus(data.status || (data.connected ? 'connected' : 'network_error'));
        setStatusMessage(data.message || '');
        setLastSyncedAt(data.last_synced_at || null);
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.workflows)) {
          setLiveWorkflows(data.workflows);
          if (data.workflows.length > 0) {
            setExpandedWorkflowId((prev) => prev || data.workflows[0].id);
          }
        }
      } catch (err) {
        if (ignore) return;
        setConnectionStatus('network_error');
        setStatusMessage(err instanceof Error ? err.message : 'Network communication failed');
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const activeWorkflowList = liveWorkflows.length > 0 ? liveWorkflows : fallbackWorkflows;

  const filteredWorkflows = activeWorkflowList.filter((wf) => {
    const matchesSearch =
      wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.workflow_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return wf.is_active;
    if (statusFilter === 'inactive') return !wf.is_active;
    if (statusFilter === 'failed') return wf.last_execution_status === 'error';
    return true;
  });

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="n8n Workflow Monitoring"
        subtitle="Live telemetry for self-hosted n8n workflows running on your VPS. Inspect node errors and execution logs."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Connection Banner */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                  Self-Hosted n8n Instance
                </h3>

                {connectionStatus === 'loading' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[10px] font-semibold text-stone-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-pulse" />
                    CHECKING...
                  </span>
                )}

                {connectionStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    CONNECTED ({stats.total} Workflows · {stats.active} Active)
                  </span>
                )}

                {connectionStatus === 'missing_credentials' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    API KEY REQUIRED
                  </span>
                )}

                {connectionStatus === 'auth_error' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-rose-800">
                    <ShieldAlert className="h-3 w-3 text-rose-600" />
                    AUTHENTICATION ERROR (401)
                  </span>
                )}

                {connectionStatus === 'network_error' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-rose-800">
                    DISCONNECTED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-mono mt-0.5">
                <span>{n8nBaseUrl}</span>
                {lastSyncedAt && (
                  <>
                    <span>•</span>
                    <span className="text-[11px] text-stone-400">
                      Synced {formatRelativeTime(lastSyncedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => void fetchN8nWorkflows()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <Workflow className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <a
              href={n8nBaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-100 transition-all shadow-2xs"
            >
              <span>Open Console</span>
              <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
            </a>
          </div>
        </div>

        {/* Informative Guidance Banner if credentials are missing or invalid */}
        {connectionStatus === 'missing_credentials' && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 shadow-xs text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>n8n REST API Credentials Not Yet Configured in Environment</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              To securely display real live workflows and execution records from your self-hosted n8n instance, configure the Public REST API key in your server environment (<code className="px-1.5 py-0.5 rounded bg-amber-200/60 font-mono font-bold text-amber-950">.env.local</code>):
            </p>
            <div className="rounded-xl border border-amber-200 bg-white/90 p-3 font-mono text-[11px] text-stone-800 space-y-1">
              <div>N8N_API_BASE_URL=https://n8n.thebusinesswork.com</div>
              <div>N8N_API_KEY=your_n8n_api_key_from_settings</div>
            </div>
            <p className="text-[11px] text-amber-700">
              Generate an API key in your n8n web console under <strong>Settings → n8n API → Create an API key</strong>.
            </p>
          </div>
        )}

        {connectionStatus === 'auth_error' && (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-5 shadow-xs text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-rose-900">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <span>n8n REST API Authentication Failed (HTTP 401 Unauthorized)</span>
            </div>
            <p className="text-rose-800 leading-relaxed">
              {statusMessage || 'The configured N8N_API_KEY was rejected by n8n. Please verify that the API key is active and has not expired or been rotated.'}
            </p>
            <p className="text-[11px] text-rose-700">
              Verify your key under <strong>Settings → n8n API</strong> on your self-hosted instance: <code className="font-mono">{n8nBaseUrl}</code>.
            </p>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search workflows by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/60 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-stone-100/80 border border-stone-200/60">
            {(['all', 'active', 'inactive', 'failed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  statusFilter === filter
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Cards */}
        <div className="space-y-4">
          {filteredWorkflows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 mb-3">
                <Workflow className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-stone-900">No n8n workflows found</h4>
              <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No workflows match the selected filter criteria.'
                  : 'Automations will appear here once connected to your self-hosted n8n instance.'}
              </p>
            </div>
          ) : (
            filteredWorkflows.map((wf) => {
            const isExpanded = expandedWorkflowId === wf.id;
            const isHealthy = wf.last_execution_status === 'success';

            return (
              <div
                key={wf.id}
                className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs transition-shadow"
              >
                {/* Workflow Summary Header */}
                <div
                  onClick={() => setExpandedWorkflowId(isExpanded ? null : wf.id)}
                  className="cursor-pointer p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${
                        isHealthy
                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                          : 'bg-rose-50 border-rose-200/80 text-rose-700'
                      }`}
                    >
                      {isHealthy ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-sm text-stone-900">
                          {wf.name}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            wf.is_active
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}
                        >
                          {wf.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500 font-mono">
                        <span>ID: {wf.workflow_id}</span>
                        <span>•</span>
                        <span>Last execution: {formatRelativeTime(wf.last_execution_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side stats */}
                  <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-1 text-center">
                        <span className="block text-[10px] text-stone-500 font-medium">Success</span>
                        <strong className="text-emerald-700 font-mono">{wf.success_count}</strong>
                      </div>
                      <div className="rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-1 text-center">
                        <span className="block text-[10px] text-stone-500 font-medium">Failures</span>
                        <strong className="text-rose-700 font-mono">{wf.failure_count}</strong>
                      </div>
                    </div>

                    <div className="text-stone-400">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Execution History & Failed Nodes */}
                {isExpanded && (
                  <div className="border-t border-stone-100 bg-stone-50/70 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                        Recent Execution Runs & Failure Analysis
                      </h5>
                      <span className="text-[11px] text-stone-400">
                        Showing latest runs logged from n8n
                      </span>
                    </div>

                    <div className="space-y-3">
                      {!wf.recent_executions || wf.recent_executions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-6 text-center text-xs text-stone-500">
                          No recent executions logged for this workflow.
                        </div>
                      ) : (
                        wf.recent_executions.map((exec) => (
                        <div
                          key={exec.id}
                          className={`rounded-2xl border p-4 text-xs transition-colors shadow-2xs ${
                            exec.status === 'error'
                              ? 'border-rose-200 bg-rose-50/70 text-rose-950'
                              : 'border-stone-200/80 bg-white text-stone-900'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  exec.status === 'error'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {exec.status}
                              </span>
                              <span className="font-mono text-xs font-bold text-stone-800">
                                Execution #{exec.execution_id}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-stone-500 font-mono">
                              <span>Started: {formatDateTime(exec.started_at)}</span>
                              {exec.duration_ms && (
                                <span>Duration: {exec.duration_ms}ms</span>
                              )}
                            </div>
                          </div>

                          {/* Error block if failure */}
                          {exec.status === 'error' && (
                            <div className="mt-2 rounded-xl border border-rose-200/90 bg-rose-100/60 p-3.5 space-y-1.5">
                              <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                                <span>Failed Node: <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-rose-200/60 text-rose-950 font-bold">{exec.failed_node_name || 'Workflow Error'}</code></span>
                              </div>
                              <p className="font-mono text-[11px] text-rose-950 whitespace-pre-wrap leading-relaxed">
                                {exec.error_message}
                              </p>
                            </div>
                          )}

                          {/* Deep Link to self-hosted n8n instance */}
                          <div className="mt-3 flex items-center justify-end">
                            <a
                              href={`${n8nBaseUrl}/workflow/${wf.workflow_id}/executions/${exec.execution_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-800 hover:text-stone-950 transition-colors"
                            >
                              <span>Open this execution in n8n</span>
                              <ExternalLink className="h-3 w-3 text-stone-400" />
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
}
