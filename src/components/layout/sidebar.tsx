'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  FileText,
  Workflow,
  Server,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { useDashboardStore } from '@/lib/store/dashboard-store';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen?: boolean; onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { conversations, leads, appointments, vpsMetrics } = useDashboardStore();

  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const pendingAppointments = appointments.filter((a) => a.status === 'pending').length;
  const newLeads = leads.filter((l) => l.status === 'new').length;

  const navItems: NavItem[] = [
    {
      name: 'Overview',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'WhatsApp Inbox',
      href: '/whatsapp',
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeColor: 'bg-[#25D366] text-white',
    },
    {
      name: 'Instagram Control',
      href: '/instagram',
      icon: Instagram,
    },
    {
      name: 'Leads (Google Sheets)',
      href: '/leads',
      icon: Users,
      badge: newLeads > 0 ? newLeads : undefined,
      badgeColor: 'bg-[#141413] text-white',
    },
    {
      name: 'Appointments',
      href: '/appointments',
      icon: Calendar,
      badge: pendingAppointments > 0 ? pendingAppointments : undefined,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      name: 'Quotation Builder',
      href: '/quotations',
      icon: FileText,
    },
    {
      name: 'n8n Workflows',
      href: '/n8n',
      icon: Workflow,
    },
    {
      name: 'VPS Health',
      href: '/vps',
      icon: Server,
      badge: vpsMetrics.status === 'healthy' ? 'OK' : 'Alert',
      badgeColor: vpsMetrics.status === 'healthy' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white',
    },
    {
      name: 'Settings & Status',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#E2DDD3] bg-[#FAF8F5] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center justify-between border-b border-[#E2DDD3] px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141413] text-white shadow-xs">
              <span className="font-bold text-sm tracking-wider">TBW</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#141413] uppercase font-mono">
                The Business Work
              </span>
              <span className="text-[11px] font-medium text-[#7A756D] uppercase tracking-wider">
                Admin Control Center
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-[#7A756D]">
            Operations & Control
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#141413] text-white shadow-xs'
                    : 'text-[#555047] hover:bg-[#EFECE4] hover:text-[#141413]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-[#7A756D] group-hover:text-[#141413]'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-[#7A756D]">
            External Quick Links
          </div>

          <a
            href="https://www.thebusinesswork.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#7A756D] hover:bg-[#EFECE4] hover:text-[#141413] transition-colors"
          >
            <span>Live Website</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <a
            href="https://wa.me/917972020292"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#7A756D] hover:bg-[#EFECE4] hover:text-[#141413] transition-colors"
          >
            <span>Business WhatsApp (+91 79720 20292)</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Administrator Footer */}
        <div className="border-t border-[#E2DDD3] p-4 bg-[#F5F2EA]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E2DDD3] text-[#141413] font-semibold text-xs border border-[#CDC7BA]">
                AR
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold text-[#141413]">
                  Aman Rajbhar
                </span>
                <span className="truncate text-[11px] text-[#7A756D]">
                  thebusinesswork.co@gmail.com
                </span>
              </div>
            </div>

            <Link
              href="/login"
              title="Logout"
              className="p-1.5 text-[#7A756D] hover:text-[#141413] hover:bg-[#EFECE4] rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#7A756D]">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Authorized Admin Active</span>
          </div>
        </div>
      </aside>
    </>
  );
}
