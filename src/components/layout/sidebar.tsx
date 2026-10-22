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
  Sparkles,
} from 'lucide-react';
import { InstagramIcon as Instagram } from '@/components/ui/icons';
import { useDashboardStore } from '@/lib/store/dashboard-store';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'emerald' | 'amber' | 'rose' | 'neutral';
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen?: boolean; onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { conversations, leads, appointments, vpsMetrics } = useDashboardStore();

  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const pendingAppointments = appointments.filter((a) => a.status === 'pending').length;
  const newLeads = leads.filter((l) => l.status === 'new').length;

  const sections: NavSection[] = [
    {
      items: [
        {
          name: 'Overview',
          href: '/',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Inbox & Channels',
      items: [
        {
          name: 'WhatsApp Inbox',
          href: '/whatsapp',
          icon: MessageSquare,
          badge: unreadCount > 0 ? unreadCount : undefined,
          badgeVariant: 'emerald',
        },
        {
          name: 'Instagram Control',
          href: '/instagram',
          icon: Instagram,
        },
      ],
    },
    {
      title: 'Pipeline & Sales',
      items: [
        {
          name: 'Leads (Google Sheets)',
          href: '/leads',
          icon: Users,
          badge: newLeads > 0 ? newLeads : undefined,
          badgeVariant: 'neutral',
        },
        {
          name: 'Appointments',
          href: '/appointments',
          icon: Calendar,
          badge: pendingAppointments > 0 ? pendingAppointments : undefined,
          badgeVariant: 'amber',
        },
        {
          name: 'Quotation Builder',
          href: '/quotations',
          icon: FileText,
        },
      ],
    },
    {
      title: 'System & Automation',
      items: [
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
          badgeVariant: vpsMetrics.status === 'healthy' ? 'emerald' : 'rose',
        },
        {
          name: 'Settings & Status',
          href: '/settings',
          icon: Settings,
        },
      ],
    },
  ];

  const getBadgeClasses = (variant: NavItem['badgeVariant'], isActive: boolean) => {
    if (isActive) {
      return 'bg-white/20 text-white border-transparent';
    }
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[#E6E1D7] bg-[#FAF8F5] transition-transform duration-200 ease-in-out lg:static lg:h-full lg:translate-x-0 shrink-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-17 items-center justify-between border-b border-[#E6E1D7] px-5 bg-[#FAF8F5]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-xs ring-1 ring-white/10 group-hover:scale-102 transition-transform">
              <span className="font-bold text-xs tracking-wider font-mono">TBW</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-tight text-stone-900 uppercase font-mono">
                  The Business Work
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                <span>Admin Control</span>
                <span className="text-stone-300">•</span>
                <span className="rounded bg-stone-200/70 px-1 py-0.2 font-mono text-[9px] text-stone-700">v2.4</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Grouped Navigation */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold tracking-wider uppercase text-stone-400">
                  {section.title}
                </div>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-600 hover:bg-[#EFECE4] hover:text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-700'
                        }`}
                      />
                      <span className="tracking-tight">{item.name}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${getBadgeClasses(
                          item.badgeVariant,
                          isActive
                        )}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* External Links Section */}
          <div className="pt-2 space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-stone-400">
              Live Assets
            </div>

            <a
              href="https://www.thebusinesswork.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs text-stone-500 hover:bg-[#EFECE4] hover:text-stone-900 transition-colors"
            >
              <span className="truncate">thebusinesswork.com</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-stone-400" />
            </a>

            <a
              href="https://wa.me/917972020292"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs text-stone-500 hover:bg-[#EFECE4] hover:text-stone-900 transition-colors"
            >
              <span className="truncate">+91 79720 20292</span>
              <ExternalLink className="h-3 w-3 shrink-0 text-stone-400" />
            </a>
          </div>
        </div>

        {/* Administrator Footer */}
        <div className="border-t border-[#E6E1D7] p-3.5 bg-[#F5F2EA]/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 shadow-2xs">
                AR
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold text-stone-900">
                  Aman Rajbhar
                </span>
                <span className="truncate text-[10px] text-stone-500 font-mono">
                  thebusinesswork.co@gmail.com
                </span>
              </div>
            </div>

            <Link
              href="/login"
              title="Logout session"
              className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-[#EFECE4] rounded-lg transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-stone-200/60 pt-2 text-[10px] text-stone-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Admin Verified</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-stone-400">
              <Sparkles className="h-2.5 w-2.5 text-amber-500" />
              <span>TBW OS</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

