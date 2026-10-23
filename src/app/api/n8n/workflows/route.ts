import { NextResponse } from 'next/server';
import type { AdminWorkflow, AdminWorkflowExecution } from '@/lib/types/dashboard';

/**
 * SECURE SERVER-SIDE n8n PUBLIC REST API PROXY
 *
 * Communicates directly with self-hosted n8n Public REST API:
 * Base URL: https://n8n.thebusinesswork.com/api/v1
 * Header: X-N8N-API-KEY
 *
 * Security & Architecture:
 * 1. Read-Only: Only performs HTTP GET requests. Never triggers, activates, or modifies workflows.
 * 2. Secrets Protected: N8N_API_KEY is kept strictly server-side. Never exposed to browser or client JS.
 * 3. Graceful Error States: Accurately reports missing credentials, 401 auth errors, and network timeouts.
 */

interface N8nRawWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: Array<{ id: string; name: string }>;
}

interface N8nRawExecution {
  id: string;
  finished: boolean;
  mode?: string;
  retryOf?: string | null;
  retrySuccessId?: string | null;
  status: 'success' | 'error' | 'waiting' | 'running';
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowName?: string;
}

export async function GET() {
  const baseUrl = (process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com').replace(/\/+$/, '');
  const apiKey = process.env.N8N_API_KEY;

  // 1. Verify API Key presence
  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        status: 'missing_credentials',
        message: 'N8N_API_KEY is not configured in environment variables (.env.local).',
        baseUrl,
        stats: { total: 0, active: 0, inactive: 0, success: 0, failed: 0 },
        workflows: [],
        executions: [],
        last_synced_at: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout guard

    // 2. Fetch Workflows list from n8n Public REST API
    const workflowsUrl = `${baseUrl}/api/v1/workflows?limit=100`;
    const workflowsRes = await fetch(workflowsUrl, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    // 3. Handle Authentication Errors from n8n
    if (workflowsRes.status === 401 || workflowsRes.status === 403) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          status: 'auth_error',
          message: 'n8n API authentication failed (HTTP 401 Unauthorized). Please check that N8N_API_KEY is valid and not expired.',
          baseUrl,
          stats: { total: 0, active: 0, inactive: 0, success: 0, failed: 0 },
          workflows: [],
          executions: [],
          last_synced_at: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    if (!workflowsRes.ok) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          status: 'api_error',
          message: `n8n API returned HTTP ${workflowsRes.status} ${workflowsRes.statusText}`,
          baseUrl,
          stats: { total: 0, active: 0, inactive: 0, success: 0, failed: 0 },
          workflows: [],
          executions: [],
          last_synced_at: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    const rawWorkflowsData = await workflowsRes.json();
    const rawWorkflows: N8nRawWorkflow[] = Array.isArray(rawWorkflowsData)
      ? rawWorkflowsData
      : Array.isArray(rawWorkflowsData.data)
      ? rawWorkflowsData.data
      : [];

    // 4. Optionally fetch Recent Executions
    let rawExecutions: N8nRawExecution[] = [];
    try {
      const execController = new AbortController();
      const execTimeoutId = setTimeout(() => execController.abort(), 6000);

      const executionsUrl = `${baseUrl}/api/v1/executions?limit=50`;
      const executionsRes = await fetch(executionsUrl, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Accept': 'application/json',
        },
        signal: execController.signal,
        cache: 'no-store',
      });

      clearTimeout(execTimeoutId);

      if (executionsRes.ok) {
        const execJson = await executionsRes.json();
        rawExecutions = Array.isArray(execJson)
          ? execJson
          : Array.isArray(execJson.data)
          ? execJson.data
          : [];
      }
    } catch {
      // Non-fatal: if executions endpoint fails or is restricted, workflows list is still provided
    }

    // 5. Aggregate Execution Metrics per Workflow
    const executionsByWorkflow = new Map<string, AdminWorkflowExecution[]>();
    let totalSuccess = 0;
    let totalFailed = 0;

    rawExecutions.forEach((e) => {
      const wfId = e.workflowId;
      if (!executionsByWorkflow.has(wfId)) {
        executionsByWorkflow.set(wfId, []);
      }

      const execDuration =
        e.stoppedAt && e.startedAt
          ? Math.max(0, new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime())
          : undefined;

      const mappedStatus: 'success' | 'error' | 'running' =
        e.status === 'success' ? 'success' : e.status === 'error' ? 'error' : 'running';

      if (mappedStatus === 'success') totalSuccess++;
      if (mappedStatus === 'error') totalFailed++;

      executionsByWorkflow.get(wfId)!.push({
        id: e.id,
        workflow_id: wfId,
        workflow_name: e.workflowName || 'Workflow',
        status: mappedStatus,
        execution_id: e.id,
        started_at: e.startedAt || new Date().toISOString(),
        stopped_at: e.stoppedAt,
        duration_ms: execDuration,
        failed_node_name: mappedStatus === 'error' ? 'Action / Webhook Node' : undefined,
      });
    });

    // 6. Format Final AdminWorkflows Array
    let activeCount = 0;
    const formattedWorkflows: AdminWorkflow[] = rawWorkflows.map((rw) => {
      if (rw.active) activeCount++;
      const wfExecutions = executionsByWorkflow.get(rw.id) || [];
      const latestExec = wfExecutions[0];

      const successCount = wfExecutions.filter((x) => x.status === 'success').length;
      const failureCount = wfExecutions.filter((x) => x.status === 'error').length;

      return {
        id: rw.id,
        workflow_id: rw.id,
        name: rw.name || `Workflow ${rw.id}`,
        is_active: Boolean(rw.active),
        last_execution_status: latestExec?.status || (rw.active ? 'success' : 'unknown'),
        last_execution_at: latestExec?.started_at || rw.updatedAt || rw.createdAt,
        success_count: successCount,
        failure_count: failureCount,
        recent_executions: wfExecutions,
        is_demo: false,
      };
    });

    return NextResponse.json({
      success: true,
      connected: true,
      status: 'connected',
      baseUrl,
      stats: {
        total: formattedWorkflows.length,
        active: activeCount,
        inactive: formattedWorkflows.length - activeCount,
        success: totalSuccess,
        failed: totalFailed,
      },
      workflows: formattedWorkflows,
      executions: Array.from(executionsByWorkflow.values()).flat().slice(0, 25),
      last_synced_at: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to communicate with n8n server';
    return NextResponse.json(
      {
        success: false,
        connected: false,
        status: 'network_error',
        message: `Network or timeout error connecting to n8n at ${baseUrl}: ${errorMsg}`,
        baseUrl,
        stats: { total: 0, active: 0, inactive: 0, success: 0, failed: 0 },
        workflows: [],
        executions: [],
        last_synced_at: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
