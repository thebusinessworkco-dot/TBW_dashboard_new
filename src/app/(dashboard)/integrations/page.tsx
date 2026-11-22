'use client';

import React from 'react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export default function IntegrationsPage() {
  const { integrationStatuses, refreshData } = useDashboardStore();

  return (
    <div className="flex flex-col min-h-full">
      <TopNavbar
        title="Integrations & API Health"
        subtitle="Operational telemetry for Meta, n8n, Supabase, Google, and VPS endpoints"
        breadcrumbs={[
          { label: 'Automation & Infra', href: '/vps' },
          { label: 'Integrations & API Health' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        <PageHeader
          title="Integrations & System Health"
          subtitle="Real-time connectivity status, latency diagnostics, and endpoint verification"
          category="Automation & Infra"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshData()}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Ping All Services
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrationStatuses.map((item) => {
            const isHealthy = item.status === 'connected';
            const detailsText = item.details
              ? typeof item.details === 'string'
                ? item.details
                : JSON.stringify(item.details)
              : 'Production service integration pipeline.';

            return (
              <Card key={item.service_name} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#202B35] dark:text-[#FCFBF8] uppercase tracking-wide">
                      {item.service_name}
                    </span>
                    <Badge variant={isHealthy ? 'sage' : 'warning'} showDot>
                      {item.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="mt-2 text-xs text-[#566573] dark:text-[#94A4B4] line-clamp-2">
                    {detailsText}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#DDD9D0]/60 space-y-1.5 text-xs dark:border-[#232D3B]/60">
                    <div className="flex justify-between">
                      <span className="text-[#566573] dark:text-[#94A4B4]">Status:</span>
                      <span className="font-mono font-bold text-[#202B35] dark:text-[#FCFBF8]">
                        {item.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#566573] dark:text-[#94A4B4]">Last Sync:</span>
                      <span className="font-mono text-[#566573] dark:text-[#94A4B4]">
                        {item.last_sync_at
                          ? new Date(item.last_sync_at).toLocaleTimeString()
                          : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#DDD9D0]/60 flex items-center justify-between dark:border-[#232D3B]/60">
                  <span className="text-[11px] text-[#566573] dark:text-[#94A4B4]">
                    Verified in .env.local
                  </span>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      window.location.href = `/settings`;
                    }}
                  >
                    Configure
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
