'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Check,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamMember, TeamRole } from '@/lib/types/dashboard';

export function TeamPermissionsSettings() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent' as TeamRole,
  });

  const loadTeam = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/team');
      const data = await res.json();
      if (data.success && data.members) {
        setMembers(data.members);
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load team members' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', member: formData }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Team member ${formData.name} added successfully.` });
        setIsAddModalOpen(false);
        setFormData({ name: '', email: '', phone: '', role: 'agent' });
        loadTeam();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to add member' });
      }
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error adding member' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', member: editingMember }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Updated ${editingMember.name}'s role and permissions.` });
        setEditingMember(null);
        loadTeam();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to update member' });
      }
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error updating member' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the team?`)) return;
    setStatusMsg(null);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', member: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: `Member ${name} removed.` });
        loadTeam();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to remove member' });
      }
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error removing member' });
    }
  };

  const roleBadgeStyle = (role: TeamRole) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      case 'admin':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      case 'manager':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'agent':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'observer':
        return 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700';
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* SECTION 4: TEAM MANAGEMENT */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD9D0]/60 pb-4 dark:border-[#263342]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#202B35] p-2 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Team Members & Administrators
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Manage authorized team access, assigned responsibilities, and operational status.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Team Member
          </Button>
        </div>

        {/* Member Table */}
        <div className="overflow-x-auto rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DDD9D0]/60 bg-[#F4F2EC]/60 text-stone-600 font-semibold uppercase tracking-wider text-[10px] dark:bg-[#121820] dark:border-[#263342] dark:text-stone-400">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0]/50 dark:divide-[#263342]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-stone-500">
                    Loading team directory...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-stone-500">
                    No team members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F4F2EC]/30 dark:hover:bg-[#141C24]">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#202B35] text-[#FCFBF8] font-bold text-xs">
                          {m.avatar || 'TB'}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 dark:text-stone-100">
                            {m.name}
                          </div>
                          <div className="font-mono text-[11px] text-stone-500">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${roleBadgeStyle(m.role)}`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-stone-600 dark:text-stone-400">
                      {m.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="capitalize">{m.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                      {new Date(m.added_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="tertiary"
                          size="xs"
                          iconOnly
                          onClick={() => setEditingMember(m)}
                          title="Edit Permissions"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
                        </Button>
                        {m.role !== 'superadmin' && (
                          <Button
                            variant="destructive"
                            size="xs"
                            iconOnly
                            onClick={() => handleRemoveMember(m.id, m.name)}
                            title="Remove Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: USER PERMISSIONS MATRIX */}
      <div className="rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] p-6 shadow-xs dark:bg-[#151C24] dark:border-[#263342] space-y-4">
        <div className="border-b border-[#DDD9D0]/60 pb-3 dark:border-[#263342]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#7D8F82]" />
            <h2 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
              Role-Based Access Control (RBAC) Matrix
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Principle of least privilege permissions mapped across roles.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#DDD9D0]/80 bg-white dark:bg-[#1A232D] dark:border-[#263342]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#DDD9D0]/60 bg-[#F4F2EC]/60 text-stone-600 font-semibold text-[10px] uppercase tracking-wider dark:bg-[#121820] dark:border-[#263342] dark:text-stone-400">
              <tr>
                <th className="px-4 py-3">Capability / Domain</th>
                <th className="px-3 py-3 text-center">Superadmin</th>
                <th className="px-3 py-3 text-center">Admin</th>
                <th className="px-3 py-3 text-center">Manager</th>
                <th className="px-3 py-3 text-center">Agent</th>
                <th className="px-3 py-3 text-center">Observer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0]/50 dark:divide-[#263342]">
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  Manage Customer Contacts & Custom Names
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  Live Chat Window & Human Takeover
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  Leads CRM & Stage Management
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  Appointments & Calendar Scheduling
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  Quotation Studio & PDF Generation
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  n8n Workflows & VPS Infrastructure
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  Global Settings, API Keys & Team Control
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                  Immutable Audit Logs Access
                </td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Check className="h-4 w-4 text-emerald-600 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
                <td className="px-3 py-3 text-center"><Minus className="h-4 w-4 text-stone-300 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#151C24] dark:border dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <h3 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Add Team Member
              </h3>
              <Button
                variant="tertiary"
                size="xs"
                iconOnly
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="rahul@thebusinesswork.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Assigned Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as TeamRole })}
                  className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
                >
                  <option value="admin">Admin (Operations & CRM)</option>
                  <option value="manager">Manager (Leads & Bookings)</option>
                  <option value="agent">Support Agent (Chats & Leads)</option>
                  <option value="observer">Observer (Read-Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Add Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#151C24] dark:border dark:border-[#263342] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <h3 className="text-sm font-bold text-[#202B35] dark:text-[#FCFBF8]">
                Edit Role & Permissions ({editingMember.name})
              </h3>
              <Button
                variant="tertiary"
                size="xs"
                iconOnly
                onClick={() => setEditingMember(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Role
                </label>
                <select
                  disabled={editingMember.role === 'superadmin'}
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as TeamRole })}
                  className="w-full text-xs rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-[#202B35] focus:outline-hidden focus:border-[#202B35] disabled:bg-stone-100 dark:bg-[#1A232D] dark:border-[#2A3746] dark:text-[#FCFBF8]"
                >
                  <option value="superadmin">Superadmin (Full Control)</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="agent">Support Agent</option>
                  <option value="observer">Observer (Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  Granular Permissions
                </label>
                <div className="space-y-2 border border-[#DDD9D0]/70 rounded-xl p-3 bg-stone-50/50 dark:bg-[#1A232D] dark:border-[#263342]">
                  {Object.entries(editingMember.permissions).map(([key, val]) => (
                    <label key={key} className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="capitalize text-stone-700 dark:text-stone-300">
                        {key.replace(/_/g, ' ').replace('can ', '')}
                      </span>
                      <input
                        type="checkbox"
                        disabled={editingMember.role === 'superadmin'}
                        checked={val}
                        onChange={(e) =>
                          setEditingMember({
                            ...editingMember,
                            permissions: {
                              ...editingMember.permissions,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-[#DDD9D0] text-[#202B35] focus:ring-[#202B35]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
