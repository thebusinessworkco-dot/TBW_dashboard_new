import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ConversationStatus, LeadStatus, AppointmentStatus, WorkflowStatus } from './types/dashboard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getConversationStatusBadge(status: ConversationStatus) {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'waiting_for_customer':
      return {
        label: 'Waiting for Customer',
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'incomplete':
      return {
        label: 'Incomplete',
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'needs_attention':
      return {
        label: 'Needs Attention',
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
      };
    case 'failed':
      return {
        label: 'Failed',
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      };
    default:
      return {
        label: status,
        bg: 'bg-neutral-50',
        text: 'text-neutral-700',
        border: 'border-neutral-200',
        dot: 'bg-neutral-400',
      };
  }
}

export function getLeadStatusBadge(status: LeadStatus) {
  switch (status) {
    case 'new':
      return { label: 'New', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'contacted':
      return { label: 'Contacted', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'qualified':
      return { label: 'Qualified', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'converted':
      return { label: 'Converted', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'lost':
      return { label: 'Lost', bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200' };
    default:
      return { label: status, bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' };
  }
}

export function getAppointmentStatusBadge(status: AppointmentStatus) {
  switch (status) {
    case 'pending':
      return { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'confirmed':
      return { label: 'Confirmed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'completed':
      return { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    default:
      return { label: status, bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' };
  }
}

export function getWorkflowStatusBadge(status: WorkflowStatus) {
  switch (status) {
    case 'active':
      return { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'inactive':
      return { label: 'Inactive', bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200' };
    case 'running':
      return { label: 'Running', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    case 'failed':
      return { label: 'Failed', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    default:
      return { label: 'Unknown', bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200' };
  }
}
