'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { formatDateTime } from '@/lib/utils';

export default function VpsHealthPage() {
  const { vpsMetrics } = useDashboardStore();
  const [copiedCode, setCopiedCode] = useState(false);

  // Format uptime
  const formatUptime = (seconds: number) => {
    if (!seconds) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const getMetricColor = (percent: number) => {
    if (percent >= 85) return { bg: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-50 text-rose-800 border-rose-200' };
    if (percent >= 70) return { bg: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-800 border-amber-200' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  };

  const cpuColor = getMetricColor(vpsMetrics.cpu_percent);
  const ramColor = getMetricColor(vpsMetrics.ram_percent);
  const diskColor = getMetricColor(vpsMetrics.disk_percent);

  const sampleCronCommand = `curl -s -X POST https://dashboard.thebusinesswork.com/api/vps/health \\
  -H "Authorization: Bearer YOUR_VPS_METRICS_BEARER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"cpu_percent": 24.5, "ram_used_gb": 3.2, "ram_total_gb": 8.0, "ram_percent": 40.0, "disk_used_gb": 42.6, "disk_total_gb": 120.0, "disk_percent": 35.5, "uptime_seconds": 1843200, "n8n_status": "running", "n8n_response_time_ms": 48, "n8n_healthy": true}'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleCronCommand);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-full pb-16">
      <TopNavbar
        title="VPS & Infrastructure Health"
        subtitle="Monitor system load, memory, disk, and n8n background service latency."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Main Status Hero Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-2xs ${
                  vpsMetrics.status === 'healthy'
                    ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                    : vpsMetrics.status === 'warning'
                    ? 'bg-amber-50 border-amber-200/80 text-amber-700'
                    : vpsMetrics.status === 'not_connected'
                    ? 'bg-stone-100 border-stone-200 text-stone-600'
                    : 'bg-rose-50 border-rose-200/80 text-rose-700'
                }`}
              >
                <Server className="h-7 w-7" />
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-stone-900">
                    VPS Host: vps.thebusinesswork.com
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      vpsMetrics.status === 'healthy'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        : vpsMetrics.status === 'warning'
                        ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                        : vpsMetrics.status === 'not_connected'
                        ? 'bg-stone-100 text-stone-700 border-stone-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200/80'
                    }`}
                  >
                    {vpsMetrics.status === 'not_connected' ? 'Not Connected' : vpsMetrics.status}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Location: Mumbai, India (ap-south-1) · Uptime: <strong className="text-stone-800 font-mono">{formatUptime(vpsMetrics.uptime_seconds)}</strong> · Last check: {formatDateTime(vpsMetrics.last_checked_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-2.5 text-right">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                  n8n HTTP Latency
                </span>
                <span className="font-mono text-base font-bold text-stone-900">
                  {vpsMetrics.n8n_response_time_ms} ms
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Utilization Progress Gauges */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* CPU Gauge */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-stone-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  CPU Load
                </h3>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${cpuColor.badge}`}>
                {vpsMetrics.cpu_percent}%
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${cpuColor.bg}`}
                style={{ width: `${vpsMetrics.cpu_percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
              <span>4 vCPU Cores</span>
              <span>{vpsMetrics.cpu_percent >= 80 ? 'Heavy Load' : 'Normal Operating Load'}</span>
            </div>
          </div>

          {/* RAM Gauge */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-stone-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  RAM Memory
                </h3>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${ramColor.badge}`}>
                {vpsMetrics.ram_percent}%
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${ramColor.bg}`}
                style={{ width: `${vpsMetrics.ram_percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
              <span>Used: {vpsMetrics.ram_used_gb} GB</span>
              <span>Total: {vpsMetrics.ram_total_gb} GB</span>
            </div>
          </div>

          {/* Disk Gauge */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-stone-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  NVMe Storage
                </h3>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${diskColor.badge}`}>
                {vpsMetrics.disk_percent}%
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${diskColor.bg}`}
                style={{ width: `${vpsMetrics.disk_percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
              <span>Used: {vpsMetrics.disk_used_gb} GB</span>
              <span>Total: {vpsMetrics.disk_total_gb} GB</span>
            </div>
          </div>
        </div>

        {/* n8n Service Status & Recent Errors */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Service Health Card */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-2">
              Background Services Status
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/70">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-stone-900">n8n Automation Engine (Docker)</span>
                </div>
                <span className="font-bold text-emerald-700 capitalize font-mono text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  {vpsMetrics.n8n_status}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/70">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-stone-900">PostgreSQL Database (Local Port 5432)</span>
                </div>
                <span className="font-bold text-emerald-700 font-mono text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/70">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-stone-900">Caddy / Nginx Reverse Proxy (SSL)</span>
                </div>
                <span className="font-bold text-emerald-700 font-mono text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  HEALTHY
                </span>
              </div>
            </div>
          </div>

          {/* Service Logs & Alerts */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-2">
              Recent Service Events & System Alerts
            </h3>

            {vpsMetrics.recent_errors && vpsMetrics.recent_errors.length > 0 ? (
              <div className="space-y-2">
                {vpsMetrics.recent_errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 text-xs text-amber-950"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span className="font-mono text-[11px] leading-relaxed">{err}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-4 text-xs text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero system faults or memory limit warnings detected.</span>
              </div>
            )}
          </div>
        </div>

        {/* Lightweight Monitoring Agent Setup Instructions */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Terminal className="h-5 w-5 text-stone-700" />
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Lightweight VPS Monitoring Setup
                </h3>
                <p className="text-[11px] text-stone-500">Zero open ports, zero exposed secrets</p>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 transition-all self-start sm:self-auto cursor-pointer shadow-2xs"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-stone-500" />}
              <span>{copiedCode ? 'Copied to Clipboard' : 'Copy Heartbeat Script'}</span>
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            To feed live metrics from your VPS into this dashboard without opening ports or exposing SSH credentials, add a 5-minute cron job or systemd timer on your VPS to POST telemetry to <code className="font-mono bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded border border-stone-200/60">/api/vps/health</code>.
          </p>

          <pre className="overflow-x-auto rounded-xl bg-stone-900 p-4 font-mono text-[11px] text-stone-200 leading-relaxed shadow-inner">
            {sampleCronCommand}
          </pre>
        </div>
      </div>
    </div>
  );
}
