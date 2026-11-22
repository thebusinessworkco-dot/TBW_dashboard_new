'use client';

import React from 'react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { TeamPermissionsSettings } from '@/components/settings/team-permissions-settings';

export default function TeamPage() {
  return (
    <div className="min-h-full pb-16 bg-[#F4F2EC] dark:bg-[#0E1318]">
      <TopNavbar
        title="Team Management & Access Control"
        subtitle="Manage authorized administrators, role assignments, and granular user permissions."
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'Team & Permissions' },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <TeamPermissionsSettings />
      </div>
    </div>
  );
}
