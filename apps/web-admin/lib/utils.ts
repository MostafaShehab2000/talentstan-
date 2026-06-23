import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', ...opts }).format(new Date(date));
}

export function formatCurrency(amount: number | null | undefined, currency = 'EGP') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(amount);
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    inactive: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-700',
    completed: 'bg-emerald-100 text-emerald-800',
    not_started: 'bg-gray-100 text-gray-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}

export function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
