'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  Sparkles,
  MessageSquare,
  Send,
  Film,
  Users,
  Calendar,
  FileText,
  Workflow,
  Server,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
} from 'lucide-react';
import { InstagramIcon } from '@/components/ui/icons';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { Tooltip } from '@/components/ui/tooltip';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'sage' | 'amber' | 'rose' | 'neutral';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const {
    conversations,
    leads,
    appointments,
    vpsMetrics,
    mobileMenuOpen,
    setMobileMenuOpen,
    sidebarCollapsed,
    toggleSidebarCollapse,
  } = useDashboardStore();

  const isOpen = mobileOpen !== undefined ? mobileOpen : mobileMenuOpen;
  const handleClose = () => {
    onCloseMobile?.();
    setMobileMenuOpen(false);
  };

  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const pendingAppointments = appointments.filter((a) => a.status === 'pending').length;
  const newLeads = leads.filter((l) => l.status === 'new').length;

  const sections: NavSection[] = [
    {
      title: 'COMMAND CENTER',
      items: [
        { name: 'Executive Overview', href: '/', icon: LayoutDashboard },
        { name: 'Live Operations', href: '/live', icon: Zap, badge: 'Live', badgeVariant: 'sage' },
        { name: 'Analytics & Reports', href: '/analytics', icon: Sparkles },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        {
          name: 'WhatsApp Inbox',
          href: '/whatsapp',
          icon: MessageSquare,
          badge: unreadCount > 0 ? unreadCount : undefined,
          badgeVariant: 'sage',
        },
        {
          name: 'Telegram Alerts',
          href: '/telegram',
          icon: Send,
          badge: 'Online',
          badgeVariant: 'sage',
        },
        { name: 'Instagram Control', href: '/instagram', icon: InstagramIcon },
        {
          name: 'Instagram Reels',
          href: '/automations/instagram-reels',
          icon: Film,
          badge: 'V4',
          badgeVariant: 'sage',
        },
        { name: 'Contact Directory', href: '/contacts', icon: Users },
        { name: 'Conversation History', href: '/conversations', icon: MessageSquare },
      ],
    },
    {
      title: 'SALES & BUSINESS',
      items: [
        {
          name: 'Leads CRM',
          href: '/leads',
          icon: Users,
          badge: newLeads > 0 ? newLeads : undefined,
          badgeVariant: 'neutral',
        },
        {
          name: 'Bookings & Calendar',
          href: '/appointments',
          icon: Calendar,
          badge: pendingAppointments > 0 ? pendingAppointments : undefined,
          badgeVariant: 'amber',
        },
        { name: 'Quotation Studio', href: '/quotations', icon: FileText },
        { name: 'Customer Profiles', href: '/customers', icon: Users },
      ],
    },
    {
      title: 'AUTOMATION & INFRA',
      items: [
        { name: 'n8n Engine', href: '/n8n', icon: Workflow, badge: 'v5.5', badgeVariant: 'neutral' },
        { name: 'Workflow Executions', href: '/n8n/executions', icon: Workflow },
        {
          name: 'VPS Infrastructure',
          href: '/vps',
          icon: Server,
          badge:
            vpsMetrics.status === 'healthy'
              ? '99.9%'
              : vpsMetrics.status === 'warning'
              ? 'Warn'
              : vpsMetrics.status === 'not_connected'
              ? 'Off'
              : 'Alert',
          badgeVariant:
            vpsMetrics.status === 'healthy'
              ? 'sage'
              : vpsMetrics.status === 'warning'
              ? 'amber'
              : vpsMetrics.status === 'not_connected'
              ? 'neutral'
              : 'rose',
        },
        { name: 'Integrations & Health', href: '/integrations', icon: Radio },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { name: 'Settings', href: '/settings', icon: Settings },
        { name: 'Team & Permissions', href: '/team', icon: Users },
        { name: 'Security & Audit Logs', href: '/security', icon: Shield },
      ],
    },
  ];

  const getBadgeClasses = (variant: NavItem['badgeVariant'], isActive: boolean) => {
    if (isActive) {
      return 'bg-[#FCFBF8] text-[#202B35] font-bold shadow-2xs dark:bg-[#141A22] dark:text-[#FCFBF8]';
    }
    switch (variant) {
      case 'sage':
        return 'bg-[#7D8F82]/20 text-[#4A5D4F] border border-[#7D8F82]/40 font-bold dark:bg-[#7D8F82]/30 dark:text-[#A8BBAE]';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border border-amber-300 font-bold dark:bg-amber-950/40 dark:text-amber-300';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border border-rose-300 font-bold dark:bg-rose-950/40 dark:text-rose-300';
      default:
        return 'bg-[#ECE9E1] text-[#566573] border border-[#DDD9D0] font-medium dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#94A4B4]';
    }
  };

  const isCollapsed = sidebarCollapsed;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-[#202B35]/60 backdrop-blur-xs transition-opacity lg:hidden dark:bg-black/80"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[#DDD9D0] bg-[#FCFBF8] transition-all duration-200 ease-in-out lg:static lg:h-full lg:translate-x-0 shrink-0 dark:border-[#232D3B] dark:bg-[#141A22] ${
          isOpen ? 'translate-x-0 w-68 shadow-2xl' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-68'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#DDD9D0] px-4 bg-white dark:border-[#232D3B] dark:bg-[#151C24] shrink-0">
          <Link
            href="/"
            onClick={handleClose}
            className={`flex items-center gap-3 group min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}
          >
            <div className="relative flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-[#202B35] text-[#FCFBF8] shadow-xs group-hover:scale-102 transition-transform shrink-0 dark:bg-[#FCFBF8] dark:text-[#202B35]">
              <span className="font-extrabold text-xs tracking-wider font-mono">TBW</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#7D8F82] ring-2 ring-white dark:ring-[#141A22]" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-black text-sm text-[#202B35] tracking-tight truncate leading-tight dark:text-[#FCFBF8]">
                  The Business Work
                </span>
                <span className="text-[10px] text-[#7D8F82] font-semibold tracking-wider uppercase truncate">
                  We Make Business Simpler
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-[#566573] hover:bg-[#F4F2EC] hover:text-[#202B35] lg:hidden cursor-pointer dark:text-[#94A4B4] dark:hover:bg-[#1B232D]"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#7D8F82] dark:text-[#6D8092]">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                const navLinkContent = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleClose}
                    className={`group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isCollapsed
                        ? 'h-10 w-10 justify-center mx-auto'
                        : 'px-3 py-2 justify-between'
                    } ${
                      isActive
                        ? 'bg-[#202B35] text-[#FCFBF8] shadow-xs dark:bg-[#FCFBF8] dark:text-[#202B35]'
                        : 'text-[#566573] hover:bg-[#F4F2EC] hover:text-[#202B35] dark:text-[#94A4B4] dark:hover:bg-[#1B232D] dark:hover:text-[#FCFBF8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isActive
                            ? 'text-[#FCFBF8] dark:text-[#202B35]'
                            : 'text-[#7D8F82] group-hover:text-[#202B35] dark:text-[#8FA395] dark:group-hover:text-[#FCFBF8]'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-md font-mono shrink-0 ${getBadgeClasses(
                          item.badgeVariant,
                          isActive
                        )}`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed dot badge indicator */}
                    {isCollapsed && item.badge !== undefined && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#7D8F82] ring-1 ring-white dark:ring-[#141A22]" />
                    )}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href} content={item.name} position="right">
                      {navLinkContent}
                    </Tooltip>
                  );
                }

                return navLinkContent;
              })}
            </div>
          ))}
        </div>

        {/* Desktop Collapse / Expand Toggle Footer */}
        <div className="hidden lg:flex items-center justify-between border-t border-[#DDD9D0] p-3 bg-white dark:border-[#232D3B] dark:bg-[#151C24] shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-[11px] text-[#566573] dark:text-[#94A4B4]">
              <span className="h-2 w-2 rounded-full bg-[#7D8F82]" />
              <span className="font-semibold">TBW Engine Live</span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] text-[#566573] hover:bg-[#F4F2EC] hover:text-[#202B35] transition cursor-pointer dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#94A4B4] dark:hover:bg-[#1B232D] ${
              isCollapsed ? 'mx-auto' : ''
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
