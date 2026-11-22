'use client';

import React, { useMemo } from 'react';
import {
  Sparkles,
  MessageSquare,
  Users,
  Calendar,
  TrendingUp,
  Workflow,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
} from 'lucide-react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import { SimpleBarChart, SparklineAreaChart } from '@/components/ui/analytics-charts';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export default function AnalyticsPage() {
  const {
    conversations,
    leads,
    appointments,
    workflows,
    timeFilter,
    setTimeFilter,
  } = useDashboardStore();

  // Dynamic calculations based on active time filter
  const multiplier = timeFilter === 'today' ? 1 : timeFilter === '7d' ? 7 : 30;

  const totalInboundEst = Math.max(conversations.length * multiplier * 2, 85);
  const totalOutboundEst = Math.max(Math.round(totalInboundEst * 0.92), 78);
  const automatedResolutionRate = '78.4%';
  const avgResponseTime = '1.4s';

  // Weekly conversation activity data
  const activityData = useMemo(() => {
    if (timeFilter === 'today') {
      return [
        { label: '09:00', value: 8, secondaryValue: 6 },
        { label: '11:00', value: 14, secondaryValue: 12 },
        { label: '13:00', value: 18, secondaryValue: 16 },
        { label: '15:00', value: 24, secondaryValue: 20 },
        { label: '17:00', value: 28, secondaryValue: 25 },
        { label: '19:00', value: 16, secondaryValue: 14 },
      ];
    }
    if (timeFilter === '7d') {
      return [
        { label: 'Mon', value: 22, secondaryValue: 18 },
        { label: 'Tue', value: 34, secondaryValue: 29 },
        { label: 'Wed', value: 45, secondaryValue: 38 },
        { label: 'Thu', value: 38, secondaryValue: 32 },
        { label: 'Fri', value: 52, secondaryValue: 46 },
        { label: 'Sat', value: 60, secondaryValue: 54 },
        { label: 'Sun', value: 48, secondaryValue: 42 },
      ];
    }
    return [
      { label: 'W1', value: 140, secondaryValue: 125 },
      { label: 'W2', value: 190, secondaryValue: 172 },
      { label: 'W3', value: 240, secondaryValue: 215 },
      { label: 'W4', value: 280, secondaryValue: 255 },
    ];
  }, [timeFilter]);

  // Lead growth sparkline data
  const leadSparkline = useMemo(() => [12, 18, 25, 22, 35, 42, 50], []);
  const bookingSparkline = useMemo(() => [4, 6, 8, 7, 12, 15, 18], []);

  // Execution stats
  const totalExecutions = workflows.reduce(
    (acc, w) => acc + (w.success_count || 0) + (w.failure_count || 0),
    858
  );
  const successfulExecutions = workflows.reduce(
    (acc, w) => acc + (w.success_count || 0),
    842
  );
  const failureCount = Math.max(totalExecutions - successfulExecutions, 16);
  const executionSuccessRate = ((successfulExecutions / totalExecutions) * 100).toFixed(1);

  return (
    <div className="flex flex-col min-h-full pb-16">
      <TopNavbar
        title="Analytics & Reports"
        subtitle="Performance intelligence across WhatsApp, Instagram, and Sales conversion funnels"
        breadcrumbs={[
          { label: 'Command Center', href: '/' },
          { label: 'Analytics & Reports' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <PageHeader
          title="Performance Intelligence & Analytics"
          subtitle="Cross-platform metrics tracking customer acquisition, response latencies, and conversion efficiency"
          category="Command Center"
          actions={
            <div className="flex items-center rounded-xl border border-[#DDD9D0] bg-[#ECE9E1]/80 p-0.5 text-xs shadow-2xs dark:border-[#232D3B] dark:bg-[#151C24]">
              {(['today', '7d', '30d'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeFilter(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer uppercase ${
                    timeFilter === t
                      ? 'bg-[#202B35] text-[#FCFBF8] shadow-xs dark:bg-[#FCFBF8] dark:text-[#202B35]'
                      : 'text-[#566573] hover:text-[#202B35] hover:bg-[#DDD9D0]/50 dark:text-[#94A4B4] dark:hover:text-[#FCFBF8] dark:hover:bg-[#1B232D]'
                  }`}
                >
                  {t === 'today' ? 'Today' : t === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          }
        />

        {/* TOP LEVEL METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Inbound Customer Volume"
            value={totalInboundEst}
            change="+18.4%"
            trend="up"
            timeframe={`in selected ${timeFilter}`}
            icon={<MessageSquare className="h-4 w-4" />}
          />

          <KpiCard
            title="Outbound Dispatches"
            value={totalOutboundEst}
            change="+16.2%"
            trend="up"
            timeframe="Meta Graph API delivery"
            icon={<TrendingUp className="h-4 w-4" />}
          />

          <KpiCard
            title="Automation Autopilot"
            value={automatedResolutionRate}
            change="+2.5%"
            trend="up"
            timeframe="Resolved without human aid"
            icon={<ShieldCheck className="h-4 w-4" />}
          />

          <KpiCard
            title="Workflow Success Rate"
            value={`${executionSuccessRate}%`}
            change={`${totalExecutions} total runs`}
            trend="up"
            timeframe="n8n execution reliability"
            icon={<Workflow className="h-4 w-4" />}
          />
        </div>

        {/* DETAILED CHARTS: CONVERSATION VOLUME & CHANNEL MIX */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inbound vs Outbound Message Volume</CardTitle>
                  <CardDescription>
                    Comparing incoming customer inquiries against automated &amp; agent replies
                  </CardDescription>
                </div>
                <Badge variant="sage">Timezone: Asia/Kolkata (IST)</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={activityData}
                primaryLabel="Inbound Messages"
                secondaryLabel="Outbound Responses"
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Channel Acquisition Ratio</CardTitle>
              <CardDescription>Breakdown by messaging platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#202B35] dark:text-[#FCFBF8]">Meta WhatsApp Cloud</span>
                    <span className="font-mono text-[#566573] dark:text-[#94A4B4]">82.4%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#ECE9E1] overflow-hidden dark:bg-[#1E2734]">
                    <div className="h-full bg-[#7D8F82] rounded-full" style={{ width: '82.4%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#202B35] dark:text-[#FCFBF8]">Instagram DMs &amp; Reels</span>
                    <span className="font-mono text-[#566573] dark:text-[#94A4B4]">17.6%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#ECE9E1] overflow-hidden dark:bg-[#1E2734]">
                    <div className="h-full bg-[#E1306C] rounded-full" style={{ width: '17.6%' }} />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#DDD9D0]/60 space-y-2.5 text-xs dark:border-[#232D3B]/60">
                  <div className="flex justify-between">
                    <span className="text-[#566573] dark:text-[#94A4B4]">Median Response Latency:</span>
                    <span className="font-mono font-bold text-[#4A5D4F] dark:text-[#A8BBAE]">{avgResponseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#566573] dark:text-[#94A4B4]">Active Sales Leads:</span>
                    <span className="font-mono font-bold text-[#202B35] dark:text-[#FCFBF8]">{leads.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#566573] dark:text-[#94A4B4]">Booked Consultations:</span>
                    <span className="font-mono font-bold text-[#202B35] dark:text-[#FCFBF8]">{appointments.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* WORKFLOW RELIABILITY & PIPELINE TRENDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>New Leads Growth Trend</CardTitle>
              <CardDescription>Cumulative lead capture velocity across WhatsApp and Instagram</CardDescription>
            </CardHeader>
            <CardContent>
              <SparklineAreaChart data={leadSparkline} height={140} />
              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
                <span className="text-[#566573] dark:text-[#94A4B4]">Weekly Growth Velocity</span>
                <span className="font-bold font-mono text-[#4A5D4F] dark:text-[#A8BBAE]">+34% Growth</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appointment Booking Volume</CardTitle>
              <CardDescription>Consultations scheduled in Google Calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <SparklineAreaChart data={bookingSparkline} height={140} />
              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[#DDD9D0]/60 dark:border-[#232D3B]/60">
                <span className="text-[#566573] dark:text-[#94A4B4]">Calendar Slots Filled</span>
                <span className="font-bold font-mono text-[#4A5D4F] dark:text-[#A8BBAE]">86% Capacity</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
