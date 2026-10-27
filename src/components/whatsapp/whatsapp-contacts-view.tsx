'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Trash2,
  AlertTriangle,
  Phone,
  Calendar,
  ShieldAlert,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  created_at: string;
  updated_at: string;
  classification: 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER';
  session_status: 'ACTIVE' | 'EXPIRED';
  selected_language: string;
  last_message: string | null;
  last_message_at: string;
  has_appointment: boolean;
  human_takeover: boolean;
}

export function WhatsAppContactsView({ onOpenChat }: { onOpenChat?: (phone: string) => void }) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Selected contact for details drawer
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ContactItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (classificationFilter !== 'all') params.set('classification', classificationFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (languageFilter !== 'all') params.set('language', languageFilter);

      const res = await fetch(`/api/whatsapp/contacts?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Fetch contacts error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, classificationFilter, statusFilter, languageFilter]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (classificationFilter !== 'all') params.set('classification', classificationFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (languageFilter !== 'all') params.set('language', languageFilter);

        const res = await fetch(`/api/whatsapp/contacts?${params.toString()}`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.success && active) {
          setContacts(data.contacts || []);
        }
      } catch (err) {
        console.error('Fetch contacts error:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [searchQuery, classificationFilter, statusFilter, languageFilter]);

  const handleDeleteConfirmed = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);

    try {
      const targetPhone = contactToDelete.normalized_phone || contactToDelete.phone;
      const res = await fetch(`/api/whatsapp/contacts/${encodeURIComponent(targetPhone)}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          admin_email: 'thebusinesswork.co@gmail.com',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDeleteSuccessNotice(
          `Contact ${contactToDelete.name} deleted. Any future message from this number will be treated strictly as NEW_CUSTOMER.`
        );
        // Remove from local state
        setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
        if (selectedContact?.id === contactToDelete.id) {
          setSelectedContact(null);
        }
        setIsDeleteModalOpen(false);
        setContactToDelete(null);
      } else {
        alert(data.error || 'Failed to delete contact');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error while deleting contact');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#FAF8F5]">
      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Customer Contact Management
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Search, filter, view details, and manage customer records with protected appointment safety.
            </p>
          </div>

          <button
            onClick={() => void fetchContacts()}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {deleteSuccessNotice && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{deleteSuccessNotice}</span>
            </div>
            <button
              onClick={() => setDeleteSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none transition"
              />
            </div>

            {/* Filter: Classification */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-stone-400 text-[11px] font-medium mr-1">Status:</span>
              {['all', 'NEW_CUSTOMER', 'RETURNING_CUSTOMER'].map((c) => (
                <button
                  key={c}
                  onClick={() => setClassificationFilter(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition cursor-pointer ${
                    classificationFilter === c
                      ? 'bg-stone-900 text-white font-medium'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {c === 'all' ? 'All' : c === 'NEW_CUSTOMER' ? 'New' : 'Returning'}
                </button>
              ))}
            </div>

            {/* Filter: Session Status */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-stone-400 text-[11px] font-medium mr-1">Session:</span>
              {['all', 'ACTIVE', 'EXPIRED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-stone-900 text-white font-medium'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>

            {/* Filter: Language */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-stone-400 text-[11px] font-medium mr-1">Language:</span>
              {['all', 'English', 'Hindi', 'Hinglish', 'Marathi'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguageFilter(l)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition cursor-pointer ${
                    languageFilter === l
                      ? 'bg-stone-900 text-white font-medium'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {l === 'all' ? 'All' : l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Customer Profile</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Classification</th>
                  <th className="px-3 py-3">Language</th>
                  <th className="px-3 py-3">Session</th>
                  <th className="px-3 py-3">First Contact</th>
                  <th className="px-3 py-3">Appointments</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-stone-400">
                      No contacts matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className={`hover:bg-stone-50/80 cursor-pointer transition ${
                        selectedContact?.id === c.id ? 'bg-[#F2EFE7]/70' : ''
                      }`}
                    >
                      {/* Customer Name */}
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-800 font-bold text-xs border border-emerald-500/20">
                            {(c.name || 'W')[0].toUpperCase()}
                          </div>
                          <span>{c.name}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-3 py-3 font-mono text-stone-600">{c.phone}</td>

                      {/* Classification Badge */}
                      <td className="px-3 py-3">
                        {c.classification === 'NEW_CUSTOMER' ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            NEW
                          </span>
                        ) : (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-300">
                            RETURNING
                          </span>
                        )}
                      </td>

                      {/* Language */}
                      <td className="px-3 py-3 text-stone-600">{c.selected_language || 'English'}</td>

                      {/* Session Status */}
                      <td className="px-3 py-3">
                        {c.session_status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Expired</span>
                        )}
                      </td>

                      {/* First Contact Date */}
                      <td className="px-3 py-3 text-stone-500 text-[11px]">
                        {formatDateTime(c.created_at)}
                      </td>

                      {/* Booking status */}
                      <td className="px-3 py-3">
                        {c.has_appointment ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            <Calendar className="h-3 w-3 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenChat?.(c.phone)}
                            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => {
                              setContactToDelete(c);
                              setIsDeleteModalOpen(true);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Drawer: Contact Details View */}
      {selectedContact && (
        <div className="w-80 lg:w-96 border-l border-stone-200 bg-white p-5 space-y-5 overflow-y-auto shrink-0 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900">Customer Details</h3>
            <button
              onClick={() => setSelectedContact(null)}
              className="text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Identity Card */}
            <div className="rounded-2xl border border-stone-200 bg-[#FAF8F5] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 text-sm">{selectedContact.name}</span>
                {selectedContact.classification === 'NEW_CUSTOMER' ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    NEW
                  </span>
                ) : (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-300">
                    RETURNING
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-stone-600 font-mono text-xs">
                <Phone className="h-3.5 w-3.5 text-stone-400" />
                <span>{selectedContact.phone}</span>
              </div>

              <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
                First seen: {formatDateTime(selectedContact.created_at)}
              </div>
            </div>

            {/* Session Info */}
            <div className="rounded-2xl border border-stone-200 p-4 space-y-2">
              <div className="flex items-center justify-between font-semibold text-stone-700">
                <span>Session Status</span>
                <span className="capitalize">{selectedContact.session_status.toLowerCase()}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Language Preference</span>
                <span className="font-semibold text-stone-900">{selectedContact.selected_language || 'English'}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Last Activity</span>
                <span>{formatRelativeTime(selectedContact.last_message_at)}</span>
              </div>
            </div>

            {/* Confirmed Appointment */}
            <div className="rounded-2xl border border-stone-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-700">Appointments</span>
                {selectedContact.has_appointment ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    Active Booking
                  </span>
                ) : (
                  <span className="text-stone-400 text-[10px]">No active bookings</span>
                )}
              </div>
              <p className="text-[11px] text-stone-500">
                Confirmed Google Calendar events remain protected and preserved even if contact is deleted.
              </p>
            </div>

            {/* Delete Contact Action */}
            <div className="pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setContactToDelete(selectedContact);
                  setIsDeleteModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Contact from Active System</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Confirmation Dialog */}
      {isDeleteModalOpen && contactToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Delete Contact?</h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong>{contactToDelete.name}</strong> ({contactToDelete.phone})?
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-700 space-y-1.5 leading-relaxed">
              <p>
                Their saved contact profile and conversation history will be removed from the active customer system.
              </p>
              <p className="font-semibold text-emerald-800">
                If they message again in the future, they will be treated strictly as a BRAND-NEW customer.
              </p>
            </div>

            {/* Safe Appointment Notice */}
            {contactToDelete.has_appointment && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                  <span>Confirmed Appointment Protection</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This contact has confirmed Google Calendar appointments. Deleting this contact will remove them from active CRM, but their confirmed appointments remain safely preserved in Google Calendar.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setContactToDelete(null);
                }}
                disabled={isDeleting}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Contact</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
