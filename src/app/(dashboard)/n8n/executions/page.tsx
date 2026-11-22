'use client';

import React, { useState } from 'react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Workflow, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export default function WorkflowExecutionsPage() {
  const { workflows, refreshData } = useDashboardStore();

  return (
    <div className="flex flex-col min-h-full">
      <TopNavbar
        title="Workflow Executions"
        subtitle="Real-time audit log of n8n webhook and automation runs"
        breadcrumbs={[
          { label: 'Automation & Infra', href: '/n8n' },
          { label: 'Workflow Executions' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        <PageHeader
          title="Automated Workflow Executions"
          subtitle="Audit ledger of trigger events, execution durations, payload outputs, and error stacktraces"
          category="Automation & Infra"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refreshData()}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Refresh Log
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open('https://n8n.thebusinesswork.com', '_blank')}
                rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                Open n8n Instance
              </Button>
            </div>
          }
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Workflow Runs</CardTitle>
                <CardDescription>Live execution stream from n8n engine</CardDescription>
              </div>
              <Badge variant="sage" showDot>
                Engine Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Workflow ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Execution Mode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((wf) => (
                  <TableRow key={wf.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECE9E1] text-[#202B35] dark:bg-[#1E2734] dark:text-[#FCFBF8]">
                          <Workflow className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-[#202B35] dark:text-[#FCFBF8]">
                          {wf.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-[#566573] dark:text-[#94A4B4]">
                        {wf.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={wf.is_active ? 'sage' : 'neutral'} showDot>
                        {wf.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-[#566573] font-medium dark:text-[#94A4B4]">
                        Production Webhook
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => window.open(`https://n8n.thebusinesswork.com/workflow/${wf.id}`, '_blank')}
                        rightIcon={<ExternalLink className="h-3 w-3" />}
                      >
                        Inspect in n8n
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
