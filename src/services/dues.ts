import {
  collection, doc, addDoc, getDocs, updateDoc,
  query, orderBy, Timestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import type { DuesPeriod } from '@/types';

let mockPeriods: DuesPeriod[] = [];

function col(orgId: string) {
  return collection(db!, `organizations/${orgId}/duesPeriods`);
}

function toDoc(id: string, d: Record<string, unknown>): DuesPeriod {
  return {
    id,
    orgId: d.orgId as string,
    name: d.name as string,
    type: d.type as DuesPeriod['type'],
    amountIndividual: (d.amountIndividual as number) ?? 0,
    amountOrganization: (d.amountOrganization as number) ?? 0,
    periodStart: (d.periodStart as string | null) ?? undefined,
    periodEnd: (d.periodEnd as string | null) ?? undefined,
    deadline: d.deadline as string,
    status: d.status as DuesPeriod['status'],
    createdBy: d.createdBy as string,
    createdAt: d.createdAt instanceof Timestamp
      ? (d.createdAt as Timestamp).toDate().toISOString().slice(0, 10)
      : (d.createdAt as string),
  };
}

export async function listDuesPeriods(orgId: string): Promise<DuesPeriod[]> {
  if (USE_MOCK_DATA) return mockPeriods.filter((p) => p.orgId === orgId);
  if (!db) return [];
  const snap = await getDocs(query(col(orgId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => toDoc(d.id, d.data() as Record<string, unknown>));
}

export async function createDuesPeriod(
  orgId: string,
  data: Omit<DuesPeriod, 'id' | 'orgId' | 'createdAt'>,
): Promise<DuesPeriod> {
  const period: DuesPeriod = {
    ...data,
    id: 'dp_' + Math.random().toString(36).slice(2, 7),
    orgId,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  if (USE_MOCK_DATA) {
    mockPeriods = [period, ...mockPeriods];
    return period;
  }
  if (!db) return period;

  const ref = await addDoc(col(orgId), {
    orgId,
    name: data.name,
    type: data.type,
    amountIndividual: data.amountIndividual,
    amountOrganization: data.amountOrganization,
    periodStart: data.periodStart ?? null,
    periodEnd: data.periodEnd ?? null,
    deadline: data.deadline,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: Timestamp.now(),
  });
  return { ...period, id: ref.id };
}

export async function updateDuesPeriod(
  orgId: string,
  periodId: string,
  updates: Partial<Pick<DuesPeriod, 'name' | 'type' | 'amountIndividual' | 'amountOrganization' | 'periodStart' | 'periodEnd' | 'deadline' | 'status'>>,
): Promise<void> {
  if (USE_MOCK_DATA) {
    mockPeriods = mockPeriods.map((p) => p.id === periodId ? { ...p, ...updates } : p);
    return;
  }
  if (!db) return;
  await updateDoc(doc(db, `organizations/${orgId}/duesPeriods/${periodId}`), updates as Record<string, unknown>);
}
