'use client';

import React, { useState, useMemo } from 'react';
import { TopNavbar } from '@/components/layout/top-navbar';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Users, Building2, Phone, Calendar, ArrowRight, ShieldCheck, ExternalLink, MessageSquare, Tag } from 'lucide-react';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { AdminContact } from '@/lib/types/dashboard';
import { CustomerProfileDrawer } from '@/components/contacts/customer-profile-drawer';
import { extractContactTags } from '@/lib/whatsapp/session-identity';

export default function CustomerProfilesPage() {
  const { leads, conversations } = useDashboardStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeProfileContact, setActiveProfileContact] = useState<AdminContact | null>(null);

  // Group contacts from conversations
  const contacts = useMemo(() => {
    const map = new Map<string, AdminContact>();
    conversations.forEach((c) => {
      if (c.contact) {
        map.set(c.contact.id, c.contact);
      }
    });
    return Array.from(map.values());
  }, [conversations]);

  const filteredContacts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = (c.custom_name || c.name || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const company = (c.company_name || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || company.includes(q);
    });
  }, [contacts, searchTerm]);

  return (
    <div className="flex flex-col min-h-full">
      <TopNavbar
        title="Customer Profiles"
        subtitle="Customer 360 viewer tracking lifecycle status, interactions, and lifetime value"
        breadcrumbs={[
          { label: 'Sales & Business', href: '/leads' },
          { label: 'Customer Profiles' },
        ]}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        <PageHeader
          title="Customer 360 Profiles"
          subtitle="Unified views consolidating WhatsApp sessions, CRM leads, quotation history, and booked consultations"
          category="Sales & Business"
          actions={
            <div className="flex items-center gap-2">
              <div className="w-64">
                <SearchInput
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  placeholder="Search profiles..."
                  size="sm"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.location.href = '/contacts';
                }}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Go to Directory
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-[#566573] dark:text-[#94A4B4]">
              No customer profiles found matching your search.
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const tags = extractContactTags(contact);
              const contactConvs = conversations.filter(
                (cv) => cv.contact_id === contact.id || cv.contact?.id === contact.id
              );
              const latestConv = contactConvs[0];

              return (
                <Card key={contact.id} className="p-5 flex flex-col justify-between hover:border-[#7D8F82] transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#202B35] text-[#FCFBF8] font-bold text-sm font-mono dark:bg-[#FCFBF8] dark:text-[#202B35]">
                        {(contact.custom_name || contact.name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <Badge variant="sage" size="sm">
                        {contactConvs.length} Session(s)
                      </Badge>
                    </div>

                    <div className="mt-3">
                      <h3 className="font-extrabold text-base text-[#202B35] truncate dark:text-[#FCFBF8]">
                        {contact.custom_name || contact.name || 'Customer'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#566573] mt-0.5 font-mono dark:text-[#94A4B4]">
                        <Phone className="h-3 w-3 text-[#7D8F82]" />
                        <span>{contact.phone || 'No phone'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#DDD9D0]/60 space-y-2 text-xs dark:border-[#232D3B]/60">
                      <div className="flex justify-between">
                        <span className="text-[#566573] dark:text-[#94A4B4]">Company:</span>
                        <span className="font-semibold text-[#202B35] dark:text-[#FCFBF8]">
                          {contact.company_name || 'Individual Client'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#566573] dark:text-[#94A4B4]">Registered:</span>
                        <span className="font-mono text-[#566573] dark:text-[#94A4B4]">
                          {new Date(contact.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {tags.map((t) => (
                            <Badge key={t} variant="neutral" size="sm">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#DDD9D0]/60 flex items-center justify-between dark:border-[#232D3B]/60">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => setActiveProfileContact(contact)}
                      leftIcon={<Users className="h-3 w-3" />}
                    >
                      Customer 360
                    </Button>
                    {latestConv && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          window.location.href = `/whatsapp?id=${latestConv.id}`;
                        }}
                        rightIcon={<ExternalLink className="h-3 w-3" />}
                      >
                        Live Chat
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Slide-over Profile Drawer */}
      <CustomerProfileDrawer
        isOpen={Boolean(activeProfileContact)}
        onClose={() => setActiveProfileContact(null)}
        contact={activeProfileContact}
      />
    </div>
  );
}
