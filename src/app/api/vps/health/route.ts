import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface TelemetryPayload {
  cpu_percent?: number;
  ram_used_gb?: number;
  ram_total_gb?: number;
  ram_percent?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  disk_avail_gb?: number;
  disk_percent?: number;
  uptime_seconds?: number;
  n8n_status?: string;
  n8n_response_time_ms?: number;
  n8n_healthy?: boolean;
  services?: Record<string, string>;
  recent_errors?: string[];
}

/**
 * POST /api/vps/health
 * Authenticated ingestion endpoint for the lightweight VPS telemetry collector.
 * Uses timing-safe Bearer token comparison.
 * Persists snapshots to Supabase admin_vps_metrics and admin_integration_status.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Enforce payload size boundary (< 10 KB)
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 10240) {
      return NextResponse.json(
        { success: false, error: 'Payload too large (maximum 10 KB)' },
        { status: 413 }
      );
    }

    // 2. Authenticate caller with timing-safe Bearer token
    const authHeader = request.headers.get('authorization') || '';
    const expectedToken = process.env.VPS_METRICS_BEARER_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration: VPS_METRICS_BEARER_TOKEN is not configured' },
        { status: 500 }
      );
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expectedToken);

    if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized VPS telemetry heartbeat' },
        { status: 401 }
      );
    }

    // 3. Parse and validate JSON payload
    const metrics: TelemetryPayload = await request.json().catch(() => null);
    if (!metrics || typeof metrics !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Malformed or invalid JSON telemetry body' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // 4. Sanitize and clamp values to 1 vCPU / 1 GB RAM / 10 GB Disk hardware specs
    const isCpuValid = metrics.cpu_percent !== null && metrics.cpu_percent !== undefined && !isNaN(Number(metrics.cpu_percent));
    const cpu_percent = isCpuValid ? Math.max(0, Math.min(100, Number(metrics.cpu_percent))) : -1;

    const isRamValid = metrics.ram_percent !== null && metrics.ram_percent !== undefined && !isNaN(Number(metrics.ram_percent));
    const ram_used_gb = metrics.ram_used_gb !== null && metrics.ram_used_gb !== undefined && !isNaN(Number(metrics.ram_used_gb))
      ? Math.max(0, Number(metrics.ram_used_gb))
      : -1;
    const ram_total_gb = metrics.ram_total_gb !== null && metrics.ram_total_gb !== undefined && !isNaN(Number(metrics.ram_total_gb))
      ? Math.max(0.1, Number(metrics.ram_total_gb))
      : 1.0;
    const ram_percent = isRamValid ? Math.max(0, Math.min(100, Number(metrics.ram_percent))) : -1;

    const isDiskValid = metrics.disk_percent !== null && metrics.disk_percent !== undefined && !isNaN(Number(metrics.disk_percent));
    const disk_used_gb = metrics.disk_used_gb !== null && metrics.disk_used_gb !== undefined && !isNaN(Number(metrics.disk_used_gb))
      ? Math.max(0, Number(metrics.disk_used_gb))
      : -1;
    const disk_total_gb = metrics.disk_total_gb !== null && metrics.disk_total_gb !== undefined && !isNaN(Number(metrics.disk_total_gb))
      ? Math.max(0.1, Number(metrics.disk_total_gb))
      : 10.0;
    const disk_avail_gb = metrics.disk_avail_gb !== null && metrics.disk_avail_gb !== undefined && !isNaN(Number(metrics.disk_avail_gb))
      ? Math.max(0, Number(metrics.disk_avail_gb))
      : (isDiskValid && disk_total_gb > 0 && disk_used_gb >= 0 ? Math.max(0, disk_total_gb - disk_used_gb) : -1);
    const disk_percent = isDiskValid ? Math.max(0, Math.min(100, Number(metrics.disk_percent))) : -1;

    const uptime_seconds = metrics.uptime_seconds !== null && metrics.uptime_seconds !== undefined && !isNaN(Number(metrics.uptime_seconds))
      ? Math.max(0, Math.floor(Number(metrics.uptime_seconds)))
      : -1;

    const n8n_status = String(metrics.n8n_status || 'unknown');
    const isLatencyValid = metrics.n8n_response_time_ms !== null && metrics.n8n_response_time_ms !== undefined && !isNaN(Number(metrics.n8n_response_time_ms));
    const n8n_response_time_ms = isLatencyValid ? Math.max(0, Math.floor(Number(metrics.n8n_response_time_ms))) : -1;
    const n8n_healthy = Boolean(metrics.n8n_healthy && n8n_status !== 'unhealthy' && n8n_status !== 'stopped');
    const recent_errors = Array.isArray(metrics.recent_errors)
      ? metrics.recent_errors.slice(0, 10).map((e) => String(e).slice(0, 300))
      : [];

    // Sanitize services map
    const services: Record<string, string> = {};
    if (metrics.services && typeof metrics.services === 'object') {
      const allowedServices = [
        'tbw-n8n-n8n-1',
        'tbw-n8n-caddy-1',
        'tbw-instagram-bridge-instagram-bridge-1',
        'tbw-dashboard-api',
        'tbw-instagram-event-api',
      ];
      for (const svc of allowedServices) {
        if (metrics.services[svc]) {
          services[svc] = String(metrics.services[svc]).slice(0, 50);
        }
      }
    }

    // Determine overall health status
    let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
    if (!n8n_healthy || disk_percent >= 92 || ram_percent >= 95 || cpu_percent >= 95 || n8n_status === 'unhealthy') {
      status = 'critical';
    } else if (disk_percent >= 80 || ram_percent >= 85 || cpu_percent >= 80 || Object.values(services).includes('degraded')) {
      status = 'warning';
    } else if (!isCpuValid && !isRamValid && !isDiskValid) {
      status = 'unknown';
    }

    const validatedSnapshot = {
      status,
      cpu_percent: cpu_percent < 0 ? -1 : Math.round(cpu_percent * 10) / 10,
      ram_used_gb: ram_used_gb < 0 ? -1 : Math.round(ram_used_gb * 100) / 100,
      ram_total_gb: Math.round(ram_total_gb * 10) / 10,
      ram_percent: ram_percent < 0 ? -1 : Math.round(ram_percent * 10) / 10,
      disk_used_gb: disk_used_gb < 0 ? -1 : Math.round(disk_used_gb * 100) / 100,
      disk_total_gb: Math.round(disk_total_gb * 10) / 10,
      disk_avail_gb: disk_avail_gb < 0 ? -1 : Math.round(disk_avail_gb * 100) / 100,
      disk_percent: disk_percent < 0 ? -1 : Math.round(disk_percent * 10) / 10,
      uptime_seconds,
      n8n_status: n8n_status as 'running' | 'restarting' | 'stopped' | 'unknown',
      n8n_response_time_ms,
      n8n_healthy,
      services,
      last_checked_at: nowIso,
      recent_errors,
      is_demo: false,
    };

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        { success: false, error: 'Database service unavailable' },
        { status: 503 }
      );
    }

    // 5. Insert telemetry snapshot into Supabase admin_vps_metrics
    let inserted = null;
    let insertResult = await adminSupabase
      .from('admin_vps_metrics')
      .insert(validatedSnapshot)
      .select('id')
      .maybeSingle();

    if (insertResult.error && insertResult.error.message.includes('Could not find')) {
      // Graceful fallback to existing base schema columns before user applies additive migration
      const baseSnapshot = {
        status: validatedSnapshot.status,
        cpu_percent: validatedSnapshot.cpu_percent,
        ram_used_gb: validatedSnapshot.ram_used_gb,
        ram_total_gb: validatedSnapshot.ram_total_gb,
        ram_percent: validatedSnapshot.ram_percent,
        disk_used_gb: validatedSnapshot.disk_used_gb,
        disk_total_gb: validatedSnapshot.disk_total_gb,
        disk_percent: validatedSnapshot.disk_percent,
        uptime_seconds: validatedSnapshot.uptime_seconds,
        n8n_status: validatedSnapshot.n8n_status,
        n8n_response_time_ms: validatedSnapshot.n8n_response_time_ms,
        n8n_healthy: validatedSnapshot.n8n_healthy,
        last_checked_at: validatedSnapshot.last_checked_at,
        recent_errors: validatedSnapshot.recent_errors,
        is_demo: validatedSnapshot.is_demo,
      };

      insertResult = await adminSupabase
        .from('admin_vps_metrics')
        .insert(baseSnapshot)
        .select('id')
        .single();
    }

    if (insertResult.error) {
      console.error('[VPS Monitor] Error inserting telemetry snapshot:', insertResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to persist telemetry to Supabase', details: insertResult.error.message },
        { status: 500 }
      );
    }

    inserted = insertResult.data;

    // 6. Update admin_integration_status for 'vps'
    try {
      await adminSupabase.from('admin_integration_status').upsert(
        {
          service_name: 'vps',
          status: status === 'critical' ? 'error' : 'connected',
          last_sync_at: nowIso,
          error_message: recent_errors.length > 0 ? recent_errors[0] : null,
          details: {
            ip: '222.167.207.127',
            provider: 'CloudOnFire',
            os: 'Ubuntu 24.04 LTS',
            cores: '1 vCPU',
            ram_total_gb: validatedSnapshot.ram_total_gb,
            disk_total_gb: validatedSnapshot.disk_total_gb,
            disk_avail_gb: validatedSnapshot.disk_avail_gb,
            disk_percent: validatedSnapshot.disk_percent,
            ram_percent: validatedSnapshot.ram_percent,
            cpu_percent: validatedSnapshot.cpu_percent,
            n8n_latency_ms: n8n_response_time_ms,
            uptime_seconds,
            services: validatedSnapshot.services,
          },
          updated_at: nowIso,
        },
        { onConflict: 'service_name' }
      );
    } catch (statusErr) {
      console.error('[VPS Monitor] Error updating integration status:', statusErr);
    }

    // 7. Retention: Safely prune records older than 30 days
    try {
      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      await adminSupabase
        .from('admin_vps_metrics')
        .delete()
        .lt('created_at', thirtyDaysAgoIso);
    } catch (pruneErr) {
      console.warn('[VPS Monitor] Retention prune warning:', pruneErr);
    }

    return NextResponse.json({
      success: true,
      id: inserted?.id,
      received_at: nowIso,
      status: validatedSnapshot.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown ingestion error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/vps/health
 * Secure dashboard query endpoint.
 * Requires authenticated admin session via cookies OR valid Bearer token.
 * Supports ?range=24h (default), 7d, 30d.
 */
export async function GET(request: NextRequest) {
  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return NextResponse.json(
      { success: false, error: 'Database service unavailable' },
      { status: 503 }
    );
  }

  // ==========================================================================
  // 1. ADMIN AUTHORIZATION CHECK
  // ==========================================================================
  let isAuthorizedAdmin = false;

  // Check Cookie Session
  try {
    const serverSupabase = await createServerSupabaseClient();
    if (serverSupabase) {
      const {
        data: { user },
      } = await serverSupabase.auth.getUser();

      if (user) {
        const { data: allowlist } = await adminSupabase
          .from('admin_user_allowlist')
          .select('user_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (allowlist) {
          isAuthorizedAdmin = true;
        }
      }
    }
  } catch {
    // Non-cookie environment
  }

  // Strictly require verified admin user from allowlist
  if (!isAuthorizedAdmin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  // ==========================================================================
  // 2. QUERY TIME-RANGE PARAMETER & CUTOFF
  // ==========================================================================
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get('range') || '24h').toLowerCase();

  let hours = 24;
  let limit = 288; // 288 5-minute slots in 24 hours

  if (range === '7d') {
    hours = 24 * 7;
    limit = 1000;
  } else if (range === '30d') {
    hours = 24 * 30;
    limit = 2000;
  }

  const cutoffIso = new Date(now - hours * 3600 * 1000).toISOString();

  // ==========================================================================
  // 3. QUERY SUPABASE FOR METRICS & RECENT HISTORY
  // ==========================================================================
  let currentMetrics = null;
  let history: Record<string, unknown>[] = [];

  try {
    const [latestRes, historyRes, statusRes] = await Promise.all([
      adminSupabase
        .from('admin_vps_metrics')
        .select('*')
        .order('last_checked_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from('admin_vps_metrics')
        .select('*')
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: true })
        .limit(limit),
      adminSupabase
        .from('admin_integration_status')
        .select('*')
        .eq('service_name', 'vps')
        .maybeSingle(),
    ]);

    currentMetrics = latestRes.data || null;
    history = historyRes.data || [];

    // Fallback if range query returned empty (e.g., initial setup)
    if (history.length === 0 && currentMetrics) {
      const { data: fallbackRows } = await adminSupabase
        .from('admin_vps_metrics')
        .select('*')
        .order('last_checked_at', { ascending: false })
        .limit(24);
      history = (fallbackRows || []).reverse();
    }

    // Populate services map from integration status details if column is empty
    if (currentMetrics && (!currentMetrics.services || Object.keys(currentMetrics.services).length === 0)) {
      if (statusRes.data?.details?.services) {
        currentMetrics.services = statusRes.data.details.services;
      }
    }

    // Normalize sentinel values (< 0) back to null for API callers
    type MetricRow = Record<string, unknown> & {
      cpu_percent?: number | null;
      ram_percent?: number | null;
      ram_used_gb?: number | null;
      disk_percent?: number | null;
      disk_used_gb?: number | null;
      disk_avail_gb?: number | null;
      uptime_seconds?: number | null;
      n8n_response_time_ms?: number | null;
      services?: Record<string, string>;
    };

    const normalizeMetrics = (row: MetricRow | null): MetricRow | null => {
      if (!row) return row;
      return {
        ...row,
        cpu_percent: typeof row.cpu_percent === 'number' && row.cpu_percent < 0 ? null : row.cpu_percent,
        ram_percent: typeof row.ram_percent === 'number' && row.ram_percent < 0 ? null : row.ram_percent,
        ram_used_gb: typeof row.ram_used_gb === 'number' && row.ram_used_gb < 0 ? null : row.ram_used_gb,
        disk_percent: typeof row.disk_percent === 'number' && row.disk_percent < 0 ? null : row.disk_percent,
        disk_used_gb: typeof row.disk_used_gb === 'number' && row.disk_used_gb < 0 ? null : row.disk_used_gb,
        disk_avail_gb: typeof row.disk_avail_gb === 'number' && row.disk_avail_gb < 0 ? null : row.disk_avail_gb,
        uptime_seconds: typeof row.uptime_seconds === 'number' && row.uptime_seconds < 0 ? null : row.uptime_seconds,
        n8n_response_time_ms: typeof row.n8n_response_time_ms === 'number' && row.n8n_response_time_ms < 0 ? null : row.n8n_response_time_ms,
      };
    };

    if (currentMetrics) {
      currentMetrics = normalizeMetrics(currentMetrics as MetricRow);
    }
    history = (history as MetricRow[]).map((r) => normalizeMetrics(r) as Record<string, unknown>);
  } catch (dbErr) {
    console.error('[VPS Monitor] Error querying Supabase metrics:', dbErr);
  }

  // ==========================================================================
  // 4. LIVE N8N HEALTH PROBE FROM DASHBOARD BACKEND
  // ==========================================================================
  let liveN8nHealthy = false;
  let liveN8nLatency = 0;
  try {
    const pingStart = Date.now();
    const pingRes = await fetch('https://n8n.thebusinesswork.com/healthz', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    liveN8nLatency = Date.now() - pingStart;
    liveN8nHealthy = pingRes.ok;
  } catch {
    liveN8nHealthy = false;
    liveN8nLatency = 0;
  }

  // ==========================================================================
  // 5. STALE DATA EVALUATION (Warning if > 15 minutes)
  // ==========================================================================
  let isConnected = false;
  let isStale = false;
  let staleMinutes = 0;

  if (currentMetrics && currentMetrics.last_checked_at) {
    isConnected = true;
    const lastCheckedMs = new Date(currentMetrics.last_checked_at).getTime();
    const diffMs = Math.max(0, now - lastCheckedMs);
    staleMinutes = Math.floor(diffMs / 60000);
    if (staleMinutes >= 15) {
      isStale = true;
    }
  }

  return NextResponse.json({
    success: true,
    is_connected: isConnected,
    is_stale: isStale,
    stale_minutes: staleMinutes,
    range,
    current: currentMetrics,
    history,
    live_n8n: {
      healthy: liveN8nHealthy,
      latency_ms: liveN8nLatency,
      url: 'https://n8n.thebusinesswork.com/healthz',
    },
    server: {
      host: 'vps.thebusinesswork.com',
      ip: '222.167.207.127',
      provider: 'CloudOnFire',
      os: 'Ubuntu 24.04 LTS',
      location: 'Mumbai, India',
      specs: {
        vcpu: 1,
        ram_gb: 1.0,
        disk_gb: 10.0,
      },
    },
  });
}
