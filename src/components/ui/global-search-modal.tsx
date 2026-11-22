import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  FileText,
  Workflow,
  Server,
  Settings,
  Shield,
  Film,
  Send,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { InstagramIcon } from './icons';

interface SearchRoute {
  title: string;
  category: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const SEARCHABLE_ROUTES: SearchRoute[] = [
  { title: 'Executive Overview', category: 'Command Center', href: '/', icon: LayoutDashboard, description: 'Live KPI metrics, active streams, and revenue signals' },
  { title: 'Live Operations', category: 'Command Center', href: '/live', icon: Zap, description: 'Real-time telemetry and active conversational streams' },
  { title: 'Analytics & Reports', category: 'Command Center', href: '/analytics', icon: Sparkles, description: 'Aggregated conversion rates and channel response metrics' },
  { title: 'WhatsApp Inbox', category: 'Communication', href: '/whatsapp', icon: MessageSquare, description: 'Live WhatsApp chat desk and human takeover control' },
  { title: 'Telegram Alerts', category: 'Communication', href: '/telegram', icon: Send, description: 'System notification broadcasts and ops alerts' },
  { title: 'Instagram Control', category: 'Communication', href: '/instagram', icon: InstagramIcon, description: 'Instagram DM threads and customer context' },
  { title: 'Instagram Reels', category: 'Communication', href: '/automations/instagram-reels', icon: Film, description: 'Reel comment automation and auto-DM templates' },
  { title: 'Contact Directory', category: 'Communication', href: '/contacts', icon: Users, description: 'Master directory of all synchronized phone and IG contacts' },
  { title: 'Conversation History', category: 'Communication', href: '/conversations', icon: MessageSquare, description: 'Searchable cross-platform message history' },
  { title: 'Leads CRM', category: 'Sales & Business', href: '/leads', icon: Users, description: 'Two-way synced Google Sheets lead board' },
  { title: 'Bookings & Calendar', category: 'Sales & Business', href: '/appointments', icon: Calendar, description: 'Google Calendar consultations and client schedule' },
  { title: 'Quotation Studio', category: 'Sales & Business', href: '/quotations', icon: FileText, description: 'Interactive quotation generator & PDF engine' },
  { title: 'Customer Profiles', category: 'Sales & Business', href: '/customers', icon: Users, description: 'Customer 360 viewer and transaction history' },
  { title: 'n8n Engine', category: 'Automation & Infra', href: '/n8n', icon: Workflow, description: 'Self-hosted n8n workflows and activation toggles' },
  { title: 'Workflow Executions', category: 'Automation & Infra', href: '/n8n/executions', icon: Workflow, description: 'Audit trail of recent n8n workflow runs' },
  { title: 'VPS Infrastructure', category: 'Automation & Infra', href: '/vps', icon: Server, description: 'Server metrics (CPU, RAM, Disk, Docker)' },
  { title: 'Integrations & API Health', category: 'Automation & Infra', href: '/integrations', icon: Zap, description: 'Status of Meta, n8n, Supabase, Google APIs' },
  { title: 'Settings', category: 'Administration', href: '/settings', icon: Settings, description: 'System configuration and integration credentials' },
  { title: 'Team & Permissions', category: 'Administration', href: '/team', icon: Users, description: 'Authorized administrators and role access' },
  { title: 'Security & Audit Logs', category: 'Administration', href: '/security', icon: Shield, description: 'Access control allowlist and operational audit logs' },
];

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const filteredRoutes = SEARCHABLE_ROUTES.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.category.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      } else if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredRoutes.length));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredRoutes.length) % Math.max(1, filteredRoutes.length));
        } else if (e.key === 'Enter' && filteredRoutes[selectedIndex]) {
          e.preventDefault();
          router.push(filteredRoutes[selectedIndex].href);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredRoutes, selectedIndex, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#202B35]/60 backdrop-blur-xs transition-opacity dark:bg-black/80"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 dark:border-[#232D3B] dark:bg-[#141A22]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-[#DDD9D0] bg-white dark:border-[#232D3B] dark:bg-[#151C24]">
          <Search className="h-5 w-5 text-[#7D8F82] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search TBW command center, modules, or tools..."
            className="w-full h-13 px-3 bg-transparent text-sm text-[#202B35] placeholder:text-[#566573]/60 focus:outline-none dark:text-[#FCFBF8] dark:placeholder:text-[#566573]"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold text-[#566573] bg-[#ECE9E1] rounded border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#94A4B4]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#DDD9D0]/30 dark:divide-[#232D3B]/40">
          {filteredRoutes.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
              No modules found matching &ldquo;<span className="font-semibold text-[#202B35] dark:text-[#FCFBF8]">{query}</span>&rdquo;
            </div>
          ) : (
            filteredRoutes.map((route, idx) => {
              const isSelected = idx === selectedIndex;
              const IconComp = route.icon;
              return (
                <button
                  key={route.href}
                  type="button"
                  onClick={() => {
                    router.push(route.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#202B35] text-[#FCFBF8] dark:bg-[#FCFBF8] dark:text-[#202B35]'
                      : 'hover:bg-[#F4F2EC] text-[#202B35] dark:text-[#FCFBF8] dark:hover:bg-[#1B232D]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white dark:bg-black/10 dark:text-black'
                          : 'bg-[#ECE9E1] text-[#7D8F82] dark:bg-[#1E2734] dark:text-[#A8BBAE]'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate">
                          {route.title}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded-md ${
                            isSelected
                              ? 'bg-white/20 text-white dark:bg-black/15 dark:text-black'
                              : 'bg-[#ECE9E1] text-[#566573] dark:bg-[#1E2734] dark:text-[#94A4B4]'
                          }`}
                        >
                          {route.category}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isSelected
                            ? 'text-white/80 dark:text-black/80'
                            : 'text-[#566573] dark:text-[#94A4B4]'
                        }`}
                      >
                        {route.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isSelected
                        ? 'translate-x-0.5 text-white dark:text-black'
                        : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#DDD9D0] bg-[#F4F2EC]/60 text-[11px] text-[#566573] dark:border-[#232D3B] dark:bg-[#10161E]/60 dark:text-[#94A4B4]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>The Business Work OS</span>
        </div>
      </div>
    </div>
  );
}
