/**
 * Firestore-specific types and converters.
 *
 * Firestore stores dates as Timestamp objects; our domain layer uses ISO strings.
 * These converters handle the translation at the boundary so the rest of the app
 * never has to think about Timestamps.
 */

import { Timestamp, type FirestoreDataConverter, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { LedgerEntry, Organization } from '@/types';

const toISO = (v: unknown): string => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Timestamp) return v.toDate().toISOString().slice(0, 10);
  return '';
};

const toTimestamp = (v: unknown): Timestamp | undefined => {
  if (!v) return undefined;
  if (typeof v === 'string') return Timestamp.fromDate(new Date(v));
  if (v instanceof Date) return Timestamp.fromDate(v);
  return undefined;
};

export const organizationConverter: FirestoreDataConverter<Organization> = {
  toFirestore: (org) => {
    const ts = toTimestamp(org.createdAt);
    return { ...org, ...(ts ? { createdAt: ts } : {}) };
  },
  fromFirestore: (snap: QueryDocumentSnapshot) => {
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      type: data.type,
      createdAt: toISO(data.createdAt),
      currency: data.currency,
      logoInitials: data.logoInitials,
      tagline: data.tagline,
    } as Organization;
  },
};

export const ledgerEntryConverter: FirestoreDataConverter<LedgerEntry> = {
  toFirestore: (entry) => {
    const out: Record<string, unknown> = { ...entry };
    const created = toTimestamp(entry.createdAt);
    const approved = toTimestamp(entry.approvedAt);
    if (created) out.createdAt = created;
    if (approved) out.approvedAt = approved;
    delete out.id;
    return out;
  },
  fromFirestore: (snap: QueryDocumentSnapshot) => {
    const data = snap.data();
    return {
      id: snap.id,
      orgId: data.orgId,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      category: data.category,
      description: data.description,
      projectId: data.projectId,
      memberId: data.memberId,
      receiptUrl: data.receiptUrl,
      status: data.status,
      createdBy: data.createdBy,
      approvedBy: data.approvedBy,
      createdAt: toISO(data.createdAt),
      approvedAt: data.approvedAt ? toISO(data.approvedAt) : undefined,
      hash: data.hash,
      anchorStatus: data.anchorStatus,
      txHash: data.txHash,
    } as LedgerEntry;
  },
};
