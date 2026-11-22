'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Search,
  ShieldCheck,
  LogOut,
  User,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { NotificationsPopover } from '@/components/ui/notifications-popover';
import { GlobalSearchModal } from '@/components/ui/global-search-modal';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function TopNavbar({
  title,
  subtitle,
  onOpenMobile,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  onOpenMobile?: () => void;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  const {
    timeFilter,
    setTimeFilter,
    integrationStatuses,
    vpsMetrics,
    setMobileMenuOpen,
    theme,
    toggleTheme,
    realtimeStatus,
  } = useDashboardStore();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleOpenMobile = onOpenMobile || (() => setMobileMenuOpen(true));
  const hasIssues =
    integrationStatuses.some((i) => i.status === 'error') || vpsMetrics.status === 'critical';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {}
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#DDD9D0] bg-[#FCFBF8]/90 px-3 sm:px-6 backdrop-blur-md shadow-2xs dark:border-[#232D3B] dark:bg-[#141A22]/90">
        {/* Left: Mobile Menu, Page Title & Breadcrumbs */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleOpenMobile}
            className="rounded-xl p-2 -ml-1 text-[#202B35] hover:bg-[#F4F2EC] hover:text-black lg:hidden cursor-pointer transition active:scale-95 shrink-0 border border-[#DDD9D0] bg-white dark:border-[#232D3B] dark:bg-[#151C24] dark:text-[#FCFBF8] dark:hover:bg-[#1B232D]"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <Breadcrumbs items={breadcrumbs} className="hidden sm:flex" />
            ) : null}
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-[#202B35] tracking-tight truncate dark:text-[#FCFBF8]">
                {title}
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-[#ECE9E1] px-2 py-0.5 text-[10px] font-bold text-[#566573] border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#94A4B4]">
                TBW Admin
              </span>
            </div>
            {subtitle && (
              <p className="hidden sm:block text-xs text-[#566573] truncate max-w-xl font-medium dark:text-[#94A4B4]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center/Right: Global Search, Quick Time Filter, Health & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Global Search Trigger Bar */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="hidden md:flex items-center gap-2.5 h-8.5 px-3 rounded-xl border border-[#DDD9D0] bg-white text-xs text-[#566573] hover:border-[#C7C1B5] hover:text-[#202B35] transition shadow-2xs cursor-pointer dark:border-[#232D3B] dark:bg-[#151C24] dark:text-[#94A4B4] dark:hover:border-[#2F3D4E] dark:hover:text-[#FCFBF8]"
          >
            <Search className="h-3.5 w-3.5 text-[#7D8F82]" />
            <span className="font-medium">Search modules...</span>
            <kbd className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-bold text-[#566573] bg-[#ECE9E1] rounded border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#94A4B4]">
              ⌘K
            </kbd>
          </button>

          {/* Mobile search icon button */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl border border-[#DDD9D0] bg-white text-[#566573] hover:bg-[#F4F2EC] hover:text-[#202B35] transition shadow-2xs cursor-pointer dark:border-[#232D3B] dark:bg-[#151C24] dark:text-[#94A4B4]"
            aria-label="Search"
          >
            <Search className="h-4 w-4 text-[#7D8F82]" />
          </button>

          {/* Time Filter Segmented Control */}
          <div className="hidden sm:flex items-center rounded-xl border border-[#DDD9D0] bg-[#ECE9E1]/80 p-0.5 text-xs shadow-2xs dark:border-[#232D3B] dark:bg-[#151C24]">
            {(['today', '7d', '30d'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeFilter(t)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer uppercase ${
                  timeFilter === t
                    ? 'bg-[#202B35] text-[#FCFBF8] shadow-xs dark:bg-[#FCFBF8] dark:text-[#202B35]'
                    : 'text-[#566573] hover:text-[#202B35] hover:bg-[#DDD9D0]/50 dark:text-[#94A4B4] dark:hover:text-[#FCFBF8] dark:hover:bg-[#1B232D]'
                }`}
              >
                {t === 'today' ? 'Today' : t}
              </button>
            ))}
          </div>

          {/* Live System Health Pulse Pill */}
          <div
            className={`hidden lg:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border text-[11px] font-semibold transition ${
              hasIssues
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
                : 'bg-[#7D8F82]/15 text-[#4A5D4F] border-[#7D8F82]/35 dark:bg-[#7D8F82]/25 dark:text-[#A8BBAE] dark:border-[#7D8F82]/40'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                hasIssues ? 'bg-amber-500 animate-pulse' : 'bg-[#5B6F60] dark:bg-[#A8BBAE]'
              }`}
            />
            <span>{hasIssues ? 'System Alert' : 'All Systems Live'}</span>
          </div>

          {/* Notifications Popover */}
          <NotificationsPopover />

          {/* Theme Switcher Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DDD9D0] bg-white text-[#202B35] hover:bg-[#F4F2EC] transition shadow-2xs cursor-pointer active:scale-95 dark:border-[#232D3B] dark:bg-[#151C24] dark:text-[#FCFBF8] dark:hover:bg-[#1B232D]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[#7D8F82]" />
            )}
          </button>

          {/* User / Admin Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 h-8.5 pl-2 pr-2.5 rounded-xl border border-[#DDD9D0] bg-white text-xs font-semibold text-[#202B35] hover:bg-[#F4F2EC] transition shadow-2xs cursor-pointer active:scale-95 dark:border-[#232D3B] dark:bg-[#151C24] dark:text-[#FCFBF8] dark:hover:bg-[#1B232D]"
              aria-label="User profile menu"
            >
              <div className="flex h-5.5 w-5.5 items-center justify-center rounded-lg bg-[#202B35] text-[11px] font-bold text-[#FCFBF8] dark:bg-[#FCFBF8] dark:text-[#202B35]">
                A
              </div>
              <span className="hidden sm:inline font-mono text-[11px]">Admin</span>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 z-50 w-60 rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 dark:border-[#232D3B] dark:bg-[#141A22]">
                <div className="p-2.5 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/70">
                  <div className="font-bold text-xs text-[#202B35] dark:text-[#FCFBF8]">
                    The Business Work Admin
                  </div>
                  <div className="text-[11px] text-[#566573] truncate mt-0.5 font-mono dark:text-[#94A4B4]">
                    thebusinesswork.co@gmail.com
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded bg-[#7D8F82]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#4A5D4F] dark:bg-[#7D8F82]/30 dark:text-[#A8BBAE]">
                    <ShieldCheck className="h-3 w-3" />
                    Super Admin
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      router.push('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#202B35] hover:bg-[#F4F2EC] transition cursor-pointer dark:text-[#FCFBF8] dark:hover:bg-[#1B232D]"
                  >
                    <User className="h-4 w-4 text-[#7D8F82]" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      router.push('/security');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#202B35] hover:bg-[#F4F2EC] transition cursor-pointer dark:text-[#FCFBF8] dark:hover:bg-[#1B232D]"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#7D8F82]" />
                    <span>Security &amp; Audit Logs</span>
                  </button>
                </div>

                <div className="border-t border-[#DDD9D0]/60 pt-1 dark:border-[#232D3B]/70">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50 transition cursor-pointer dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
}
