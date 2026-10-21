'use client';

import React, { useState, Suspense } from 'react';
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

  const { workflows } = useDashboardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter || 'all');
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(workflows[1]?.id || workflows[0]?.id || null);

  const n8nBaseUrl = process.env.NEXT_PUBLIC_N8N_BASE_URL || 'https://n8n.thebusinesswork.com';

  const filteredWorkflows = workflows.filter((wf) => {
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
        <div className="rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
              <Workflow className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141413]">
                  Self-Hosted n8n Instance
                </h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-[#555047] font-mono mt-0.5">
                {n8nBaseUrl}
              </p>
            </div>
          </div>

          <a
            href={n8nBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] px-3.5 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#EFECE4] transition-colors"
          >
            <span>Open n8n Web Console</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#E2DDD3] bg-white p-4 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7A756D]" />
            <input
              type="text"
              placeholder="Search workflows by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#E2DDD3] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#141413] focus:border-[#141413] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
            {(['all', 'active', 'inactive', 'failed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                  statusFilter === filter
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'border border-[#E2DDD3] bg-white text-[#555047] hover:bg-[#FAF8F5]'
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
            <div className="rounded-xl border border-dashed border-[#E2DDD3] bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF8F5] text-[#7A756D] mb-3">
                <Workflow className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-[#141413]">No n8n workflows found</h4>
              <p className="mt-1 text-xs text-[#7A756D] max-w-sm mx-auto">
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
                className="overflow-hidden rounded-xl border border-[#E2DDD3] bg-white shadow-2xs transition-shadow"
              >
                {/* Workflow Summary Header */}
                <div
                  onClick={() => setExpandedWorkflowId(isExpanded ? null : wf.id)}
                  className="cursor-pointer p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5]/60 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isHealthy
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
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
                        <h4 className="font-bold text-sm text-[#141413]">
                          {wf.name}
                        </h4>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            wf.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {wf.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#7A756D] font-mono">
                        <span>ID: {wf.workflow_id}</span>
                        <span>•</span>
                        <span>Last execution: {formatRelativeTime(wf.last_execution_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side stats */}
                  <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="rounded-md bg-[#FAF8F5] border border-[#E2DDD3] px-2.5 py-1 text-center">
                        <span className="block text-[10px] text-[#7A756D]">Success</span>
                        <strong className="text-emerald-700">{wf.success_count}</strong>
                      </div>
                      <div className="rounded-md bg-[#FAF8F5] border border-[#E2DDD3] px-2.5 py-1 text-center">
                        <span className="block text-[10px] text-[#7A756D]">Failures</span>
                        <strong className="text-rose-700">{wf.failure_count}</strong>
                      </div>
                    </div>

                    <div className="text-[#7A756D]">
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
                  <div className="border-t border-[#EFECE4] bg-[#FAF8F5]/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#7A756D]">
                        Recent Execution Runs & Failure Analysis
                      </h5>
                      <span className="text-[11px] text-[#7A756D]">
                        Showing latest runs logged from n8n
                      </span>
                    </div>

                    <div className="space-y-3">
                      {!wf.recent_executions || wf.recent_executions.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#E2DDD3] bg-white p-6 text-center text-xs text-[#7A756D]">
                          No recent executions logged for this workflow.
                        </div>
                      ) : (
                        wf.recent_executions.map((exec) => (
                        <div
                          key={exec.id}
                          className={`rounded-xl border p-4 text-xs transition-colors ${
                            exec.status === 'error'
                              ? 'border-rose-200 bg-rose-50/60 text-rose-900'
                              : 'border-[#E2DDD3] bg-white text-[#141413]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  exec.status === 'error'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                {exec.status}
                              </span>
                              <span className="font-mono text-xs font-bold">
                                Execution #{exec.execution_id}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-[#7A756D]">
                              <span>Started: {formatDateTime(exec.started_at)}</span>
                              {exec.duration_ms && (
                                <span>Duration: {exec.duration_ms}ms</span>
                              )}
                            </div>
                          </div>

                          {/* Error block if failure */}
                          {exec.status === 'error' && (
                            <div className="mt-2 rounded-lg border border-rose-200 bg-rose-100/70 p-3 space-y-1.5">
                              <div className="font-bold text-rose-900 flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                                <span>Failed Node: <code className="font-mono">{exec.failed_node_name || 'Workflow Error'}</code></span>
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
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141413] hover:underline"
                            >
                              <span>Open this execution in n8n</span>
                              <ExternalLink className="h-3 w-3" />
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
