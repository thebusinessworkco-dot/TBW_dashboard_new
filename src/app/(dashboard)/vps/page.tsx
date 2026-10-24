'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ShieldCheck,
  Globe,
  Layers,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { formatDateTime } from '@/lib/utils';

interface HistoryPoint {
  id: string;
  cpu_percent: number | null;
  ram_percent: number | null;
  disk_percent: number | null;
  disk_avail_gb?: number | null;
  disk_used_gb?: number | null;
  disk_total_gb?: number | null;
  n8n_response_time_ms: number | null;
  services?: Record<string, string>;
  last_checked_at: string;
  created_at: string;
}

interface VpsApiResponse {
  success: boolean;
  is_connected: boolean;
  is_stale: boolean;
  stale_minutes: number;
  range: string;
  current: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown' | 'not_connected';
    cpu_percent: number | null;
    ram_used_gb: number | null;
    ram_total_gb: number;
    ram_percent: number | null;
    disk_used_gb: number | null;
    disk_total_gb: number;
    disk_avail_gb?: number | null;
    disk_percent: number | null;
    uptime_seconds: number | null;
    n8n_status: string;
    n8n_response_time_ms: number | null;
    n8n_healthy: boolean;
    services?: Record<string, string>;
    last_checked_at: string;
    recent_errors?: string[];
  } | null;
  history: HistoryPoint[];
  live_n8n: {
    healthy: boolean;
    latency_ms: number;
    url: string;
  };
  server: {
    host: string;
    ip: string;
    provider: string;
    os: string;
    location: string;
    specs: {
      vcpu: number;
      ram_gb: number;
      disk_gb: number;
    };
  };
}

export default function VpsHealthPage() {
  const [copiedCron, setCopiedCron] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [chartMetric, setChartMetric] = useState<'cpu' | 'ram' | 'disk'>('disk');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiData, setApiData] = useState<VpsApiResponse | null>(null);

  // Initial load and auto-polling effect without cascading setState in render phase
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/vps/health?range=${timeRange}`, { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data: VpsApiResponse = await res.json();
          setApiData(data);
        }
      } catch (e) {
        if (isMounted) {
          console.error('Failed to fetch VPS telemetry:', e);
        }
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [timeRange]);

  // Explicit user-triggered refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/vps/health?range=${timeRange}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VpsApiResponse = await res.json();
        setApiData(data);
      }
    } catch (e) {
      console.error('Failed to refresh VPS telemetry:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format uptime into human-readable string
  const formatUptime = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined || seconds < 0) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  // Color thresholds
  const getMetricColor = (percent?: number | null, warningThreshold = 80, criticalThreshold = 90) => {
    if (percent === null || percent === undefined) {
      return { bg: 'bg-stone-300', text: 'text-stone-500', badge: 'bg-stone-50 text-stone-600 border-stone-200' };
    }
    if (percent >= criticalThreshold) {
      return { bg: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-50 text-rose-800 border-rose-200' };
    }
    if (percent >= warningThreshold) {
      return { bg: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };

  const copyText = (text: string, type: 'cron' | 'env') => {
    navigator.clipboard.writeText(text);
    if (type === 'cron') {
      setCopiedCron(true);
      setTimeout(() => setCopiedCron(false), 2000);
    } else {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  const isConnected = apiData?.is_connected ?? false;
  const isStale = apiData?.is_stale ?? false;
  const staleMinutes = apiData?.stale_minutes ?? 0;
  const current = apiData?.current;

  const currentCpu = current?.cpu_percent ?? null;
  const currentRamPercent = current?.ram_percent ?? null;
  const currentRamUsed = current?.ram_used_gb ?? null;
  const currentRamTotal = current?.ram_total_gb ?? 1.0;

  const currentDiskPercent = current?.disk_percent ?? null;
  const currentDiskUsed = current?.disk_used_gb ?? null;
  const currentDiskTotal = current?.disk_total_gb ?? 10.0;
  const currentDiskAvail = current?.disk_avail_gb ?? (currentDiskUsed !== null ? Math.max(0, currentDiskTotal - currentDiskUsed) : null);

  const uptimeSeconds = current?.uptime_seconds ?? null;
  const lastCheckedAt = current?.last_checked_at ?? '';
  const liveLatency = apiData?.live_n8n?.latency_ms ?? 0;
  const liveN8nOk = apiData?.live_n8n?.healthy ?? false;

  const cpuColor = getMetricColor(currentCpu, 80, 92);
  const ramColor = getMetricColor(currentRamPercent, 85, 95);
  const diskColor = getMetricColor(currentDiskPercent, 80, 92);

  const historyPoints = apiData?.history || [];

  // Services list mapping
  const servicesMap = current?.services || {};

  const getServiceBadge = (state?: string) => {
    const s = (state || '').toLowerCase();
    if (s === 'running' || s === 'active' || s === 'healthy') {
      return { label: 'HEALTHY', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (s === 'degraded') {
      return { label: 'DEGRADED', badge: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (s === 'unhealthy') {
      return { label: 'UNHEALTHY', badge: 'bg-rose-50 text-rose-800 border-rose-200' };
    }
    if (s === 'stopped' || s === 'inactive') {
      return { label: 'STOPPED', badge: 'bg-rose-50 text-rose-800 border-rose-200' };
    }
    return { label: 'UNKNOWN', badge: 'bg-stone-100 text-stone-600 border-stone-200' };
  };

  const crontabCommand = `(sudo crontab -l 2>/dev/null | grep -v 'tbw-vps-monitor.sh'; echo "*/5 * * * * /usr/local/bin/tbw-vps-monitor.sh >/dev/null 2>&1") | sudo crontab -`;
  const envFileSnippet = `VPS_METRICS_BEARER_TOKEN="<your_secure_bearer_token>"`;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      <TopNavbar title="VPS Infrastructure & Automation Health" />

      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Warning Alert if Telemetry is Stale */}
        {isConnected && isStale && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Telemetry Stale — Last Heartbeat {staleMinutes} Minutes Ago
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  The dashboard has not received an outbound telemetry push from the VPS in over 15 minutes.
                  Please verify that the 5-minute cron job is active on the server.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION A: VPS Overview Hero Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-2xs ${
                  !isConnected
                    ? 'bg-stone-100 border-stone-200 text-stone-600'
                    : isStale
                    ? 'bg-amber-50 border-amber-200/80 text-amber-700'
                    : currentDiskPercent !== null && currentDiskPercent >= 85
                    ? 'bg-amber-50 border-amber-200/80 text-amber-700'
                    : 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                }`}
              >
                <Server className="h-7 w-7" />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold text-stone-900">
                    Host: 222.167.207.127
                  </h2>
                  <span className="font-mono text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                    vps.thebusinesswork.com
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      !isConnected
                        ? 'bg-stone-100 text-stone-700 border-stone-200'
                        : isStale
                        ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                        : currentDiskPercent !== null && currentDiskPercent >= 85
                        ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    }`}
                  >
                    {!isConnected
                      ? 'Awaiting Agent'
                      : isStale
                      ? `Telemetry Stale (${staleMinutes}m ago)`
                      : currentDiskPercent !== null && currentDiskPercent >= 85
                      ? `Storage Warning (${currentDiskPercent}%)`
                      : 'Production Online'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span>
                    Provider: <strong className="text-stone-800 font-medium">CloudOnFire</strong>
                  </span>
                  <span>·</span>
                  <span>
                    OS: <strong className="text-stone-800 font-medium">Ubuntu 24.04 LTS</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Hardware Specs: <strong className="text-stone-800 font-mono">1 vCPU · 1 GB RAM · 10 GB Disk</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Uptime: <strong className="text-stone-800 font-mono">{formatUptime(uptimeSeconds)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Live latency & Refresh Controls */}
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-2 text-right">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  n8n HTTPS Ping
                </span>
                <span className="font-mono text-sm font-bold text-stone-900 flex items-center justify-end gap-1.5 mt-0.5">
                  <span className={`h-2 w-2 rounded-full ${liveN8nOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {liveLatency > 0 ? `${liveLatency} ms` : 'Offline'}
                </span>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-stone-500' : 'text-stone-600'}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Checking...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION B: Performance Gauges (1 vCPU, 1 GB RAM, 10 GB Disk) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* 1. CPU Gauge */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-stone-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  CPU Utilization
                </h3>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${cpuColor.badge}`}>
                {isConnected && currentCpu !== null ? `${currentCpu}%` : '—'}
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${cpuColor.bg}`}
                style={{ width: `${currentCpu !== null ? Math.min(100, Math.max(currentCpu, 2)) : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
              <span>Hardware: 1 vCPU</span>
              <span>{isConnected ? (currentCpu !== null ? (currentCpu >= 80 ? 'High Load' : 'Nominal') : 'Unavailable') : 'Awaiting data'}</span>
            </div>
          </div>

          {/* 2. RAM Gauge (1.0 GB Total) */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-stone-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  RAM Allocation (1 GB)
                </h3>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${ramColor.badge}`}>
                {isConnected && currentRamPercent !== null ? `${currentRamPercent}%` : '—'}
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${ramColor.bg}`}
                style={{ width: `${currentRamPercent !== null ? Math.min(100, Math.max(currentRamPercent, 2)) : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
              <span>Used: {isConnected && currentRamUsed !== null ? `${currentRamUsed} GB` : '—'}</span>
              <span>Total: {currentRamTotal} GB</span>
            </div>
          </div>

          {/* 3. NVMe Root Storage Gauge */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-stone-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  NVMe Root Storage (10 GB)
                </h3>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${diskColor.badge}`}>
                {isConnected && currentDiskPercent !== null ? `${currentDiskPercent}%` : '—'}
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${diskColor.bg}`}
                style={{ width: `${currentDiskPercent !== null ? Math.min(100, Math.max(currentDiskPercent, 2)) : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
              <span>Used: {isConnected && currentDiskUsed !== null ? `${currentDiskUsed} GB` : '—'}</span>
              <span>Available: {isConnected && currentDiskAvail !== null ? `${currentDiskAvail} GB` : '—'}</span>
            </div>
          </div>
        </div>

        {/* SECTION C: Historical Trend Visualization (Backed by Supabase) */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-stone-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Resource Utilization Trend (Supabase Telemetry Store)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Time Range Tabs */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                {(['24h', '7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      timeRange === r ? 'bg-white shadow-2xs text-stone-900 font-bold' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {r === '24h' ? '24 Hours' : r === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>

              {/* Metric Type Tabs */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setChartMetric('disk')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMetric === 'disk' ? 'bg-white shadow-2xs text-stone-900 font-bold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Disk %
                </button>
                <button
                  onClick={() => setChartMetric('ram')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMetric === 'ram' ? 'bg-white shadow-2xs text-stone-900 font-bold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  RAM %
                </button>
                <button
                  onClick={() => setChartMetric('cpu')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMetric === 'cpu' ? 'bg-white shadow-2xs text-stone-900 font-bold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  CPU %
                </button>
              </div>
            </div>
          </div>

          {/* SVG Sparkline Graph */}
          <div className="pt-2">
            {historyPoints.length === 0 ? (
              <div className="h-28 w-full flex items-center justify-center bg-stone-50/50 rounded-xl border border-stone-100 text-xs text-stone-400 font-mono">
                Awaiting telemetry heartbeats from VPS agent...
              </div>
            ) : (
              <div className="h-28 w-full flex items-end gap-1 sm:gap-2 px-2 bg-stone-50/50 rounded-xl border border-stone-100 py-3">
                {historyPoints.map((pt, idx) => {
                  const rawVal = chartMetric === 'disk' ? pt.disk_percent : chartMetric === 'ram' ? pt.ram_percent : pt.cpu_percent;
                  const isValPresent = rawVal !== null && rawVal !== undefined;
                  const val = isValPresent ? rawVal : 0;
                  const barHeight = isValPresent ? Math.max(8, Math.min(100, val)) : 4;
                  const barColor = !isValPresent
                    ? 'bg-stone-200'
                    : chartMetric === 'disk'
                    ? val >= 85 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500'
                    : val >= 80 ? 'bg-rose-500' : 'bg-stone-700';

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className={`w-full rounded-xs transition-all duration-300 ${barColor}`}
                        style={{ height: `${barHeight}%` }}
                      />
                      <div className="absolute -top-8 bg-stone-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xs">
                        {isValPresent ? `${val}%` : 'Unavailable'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono mt-2 px-1">
              <span>Oldest ({timeRange})</span>
              <span>Total Snapshots: {historyPoints.length}</span>
              <span>Latest ({lastCheckedAt ? formatDateTime(lastCheckedAt) : '—'})</span>
            </div>
          </div>
        </div>

        {/* SECTION D: Production Services Status Grid (5 Verified Workloads) */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Globe className="h-4 w-4 text-stone-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Verified Production Services & Container Status
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            {/* 1. tbw-n8n-n8n-1 */}
            {(() => {
              const b = getServiceBadge(servicesMap['tbw-n8n-n8n-1'] || current?.n8n_status);
              return (
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">n8n Automation</span>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${b.badge}`}>
                      {b.label}
                    </span>
                  </div>
                  <p className="text-stone-500 text-[11px] font-mono">tbw-n8n-n8n-1</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-600 pt-1 border-t border-stone-200/60">
                    <span>Latency</span>
                    <span>{liveLatency > 0 ? `${liveLatency} ms` : '—'}</span>
                  </div>
                </div>
              );
            })()}

            {/* 2. tbw-n8n-caddy-1 */}
            {(() => {
              const b = getServiceBadge(servicesMap['tbw-n8n-caddy-1']);
              return (
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">Caddy Reverse Proxy</span>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${b.badge}`}>
                      {b.label}
                    </span>
                  </div>
                  <p className="text-stone-500 text-[11px] font-mono">tbw-n8n-caddy-1</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-600 pt-1 border-t border-stone-200/60">
                    <span>Ports</span>
                    <span>80 / 443 (TLS)</span>
                  </div>
                </div>
              );
            })()}

            {/* 3. tbw-instagram-bridge-instagram-bridge-1 */}
            {(() => {
              const b = getServiceBadge(servicesMap['tbw-instagram-bridge-instagram-bridge-1']);
              return (
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">Instagram Bridge</span>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${b.badge}`}>
                      {b.label}
                    </span>
                  </div>
                  <p className="text-stone-500 text-[11px] font-mono truncate">tbw-instagram-bridge</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-600 pt-1 border-t border-stone-200/60">
                    <span>Type</span>
                    <span>Docker Bridge</span>
                  </div>
                </div>
              );
            })()}

            {/* 4. tbw-dashboard-api */}
            {(() => {
              const b = getServiceBadge(servicesMap['tbw-dashboard-api']);
              return (
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">Dashboard API</span>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${b.badge}`}>
                      {b.label}
                    </span>
                  </div>
                  <p className="text-stone-500 text-[11px] font-mono">tbw-dashboard-api</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-600 pt-1 border-t border-stone-200/60">
                    <span>Manager</span>
                    <span>systemd</span>
                  </div>
                </div>
              );
            })()}

            {/* 5. tbw-instagram-event-api */}
            {(() => {
              const b = getServiceBadge(servicesMap['tbw-instagram-event-api']);
              return (
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">Event API</span>
                    <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${b.badge}`}>
                      {b.label}
                    </span>
                  </div>
                  <p className="text-stone-500 text-[11px] font-mono">tbw-instagram-event-api</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-600 pt-1 border-t border-stone-200/60">
                    <span>Port</span>
                    <span>3002</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SECTION E: Measured Storage Status & Database Isolation Policy */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Measured Root Partition Status */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <HardDrive className="h-4 w-4 text-stone-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Live Filesystem Measurements (df -k /)
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Live capacity values measured on the CloudOnFire root ext4 partition:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span className="text-stone-700 font-medium">Total Filesystem Capacity</span>
                <span className="font-mono text-stone-900 font-bold">{isConnected ? `${currentDiskTotal} GB` : '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span className="text-stone-700 font-medium">Current Space Used</span>
                <span className="font-mono text-stone-900 font-bold">{isConnected && currentDiskUsed !== null ? `${currentDiskUsed} GB` : '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span className="text-stone-700 font-medium">Available Free Space</span>
                <span className="font-mono text-stone-900 font-bold">{isConnected && currentDiskAvail !== null ? `${currentDiskAvail} GB` : '—'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span className="text-stone-700 font-medium">Utilization Percentage</span>
                <span className="font-mono text-stone-900 font-bold">{isConnected && currentDiskPercent !== null ? `${currentDiskPercent}%` : '—'}</span>
              </div>
            </div>

            <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-[11px] text-stone-700 leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-stone-900">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Zero Monitoring Disk Footprint:
              </p>
              <p>
                All persistent telemetry is saved directly in Supabase. The VPS monitoring agent maintains zero local log files, zero queues, and zero SQLite databases on the host.
              </p>
            </div>
          </div>

          {/* Database Isolation & Security Architecture */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Database Isolation & Production Protection
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">n8n SQLite Database Protected</h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    The internal n8n SQLite database (~537 MB) is 100% untouched. No monitoring scripts read, write, or vacuum n8n application storage.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">Supabase Persistent Store</h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Snapshots are securely persisted to <code className="font-mono">admin_vps_metrics</code> in Supabase with automatic 30-day bounded retention.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">Protected Admin API</h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Querying infrastructure telemetry requires an authenticated admin session validated against <code className="font-mono">admin_user_allowlist</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION F: Production Installation Reference */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Terminal className="h-5 w-5 text-stone-700" />
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  VPS Monitoring Agent Configuration Guide
                </h3>
                <p className="text-[11px] text-stone-500">CloudOnFire Ubuntu 24.04 LTS (Zero hardcoded secrets in scripts)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyText(envFileSnippet, 'env')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 transition-all cursor-pointer shadow-2xs"
              >
                {copiedEnv ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-stone-500" />}
                <span>{copiedEnv ? 'Copied Env' : 'Copy Env Snippet'}</span>
              </button>
              <button
                onClick={() => copyText(crontabCommand, 'cron')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 transition-all cursor-pointer shadow-2xs"
              >
                {copiedCron ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clock className="h-3.5 w-3.5 text-stone-500" />}
                <span>{copiedCron ? 'Copied Cron' : 'Copy Cron'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
            <p>
              1. Store your monitoring secret on the VPS in root-restricted file <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">/etc/tbw-monitor.env</code>:
            </p>
            <pre className="rounded-lg bg-stone-100 p-3 font-mono text-[11px] text-stone-800">
              {`sudo sh -c 'echo "VPS_METRICS_BEARER_TOKEN=\\"YOUR_SECRET_HERE\\"" > /etc/tbw-monitor.env'`}
              {'\n'}
              {`sudo chmod 600 /etc/tbw-monitor.env`}
            </pre>

            <p>
              2. Deploy the collector to <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">/usr/local/bin/tbw-vps-monitor.sh</code> and schedule with cron:
            </p>
            <pre className="rounded-lg bg-stone-100 p-3 font-mono text-[11px] text-stone-800">
              {`sudo chmod +x /usr/local/bin/tbw-vps-monitor.sh`}
              {'\n'}
              {`(sudo crontab -l 2>/dev/null | grep -v 'tbw-vps-monitor.sh'; echo "*/5 * * * * /usr/local/bin/tbw-vps-monitor.sh >/dev/null 2>&1") | sudo crontab -`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
