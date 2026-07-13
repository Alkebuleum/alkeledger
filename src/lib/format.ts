/**
 * Display formatting and shared style maps.
 */

import type { LedgerEntry, RecordType } from '@/types';

export const RECORD_TYPES: RecordType[] = ['decision', 'transaction', 'credential', 'document'];

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  decision: 'Decisions',
  transaction: 'Transactions',
  credential: 'Credentials',
  document: 'Documents',
};

/** Legacy entries predate the `recordType` field — every one of them is a financial transaction. */
export const recordTypeOf = (entry: LedgerEntry): RecordType => entry.recordType ?? 'transaction';

export const fmt = (n: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);

export const fmtShort = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

export const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

/**
 * Shared status pill style map. Keys cover LedgerStatus, AnchorStatus,
 * MemberStatus, ProjectStatus, and RequestStatus.
 */
export const statusStyles: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-700 ring-stone-200',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
  anchored: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  suspended: 'bg-rose-50 text-rose-800 ring-rose-200',
  expired: 'bg-stone-100 text-stone-700 ring-stone-200',
  not_anchored: 'bg-stone-100 text-stone-600 ring-stone-200',
  ready: 'bg-amber-50 text-amber-800 ring-amber-200',
  failed: 'bg-rose-50 text-rose-800 ring-rose-200',
  open: 'bg-amber-50 text-amber-800 ring-amber-200',
  closed: 'bg-stone-100 text-stone-700 ring-stone-200',
  complete: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  planning: 'bg-sky-50 text-sky-800 ring-sky-200',
  paused: 'bg-stone-100 text-stone-700 ring-stone-200',
};
