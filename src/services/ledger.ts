import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { hashRecord, submitAnchor } from '@/lib/anchor';
import { MOCK_LEDGER } from '@/data/mock';
import { fmt } from '@/lib/format';
import type { LedgerEntry, LedgerStatus } from '@/types';

let ledger: LedgerEntry[] = [...MOCK_LEDGER];

function entriesCol(orgId: string) {
  return collection(db!, `organizations/${orgId}/ledgerEntries`);
}

function auditCol(orgId: string) {
  return collection(db!, `organizations/${orgId}/auditLogs`);
}

function toEntry(id: string, data: Record<string, unknown>): LedgerEntry {
  const base = data as unknown as LedgerEntry;
  return {
    ...base,
    id,
    createdAt: data.createdAt instanceof Timestamp
      ? (data.createdAt as Timestamp).toDate().toISOString().slice(0, 10)
      : (data.createdAt as string),
    approvedAt: data.approvedAt instanceof Timestamp
      ? (data.approvedAt as Timestamp).toDate().toISOString().slice(0, 10)
      : (data.approvedAt as string | undefined),
  };
}

export async function listEntries(orgId: string): Promise<LedgerEntry[]> {
  if (USE_MOCK_DATA) return ledger.filter((l) => l.orgId === orgId);

  const q = query(entriesCol(orgId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}

export function subscribeToEntries(
  orgId: string,
  callback: (entries: LedgerEntry[]) => void
): () => void {
  if (USE_MOCK_DATA) {
    callback(ledger.filter((l) => l.orgId === orgId));
    return () => {};
  }

  const q = query(entriesCol(orgId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => toEntry(d.id, d.data())))
  );
}

export async function createEntry(entry: LedgerEntry): Promise<LedgerEntry> {
  if (USE_MOCK_DATA) {
    ledger = [entry, ...ledger];
    return entry;
  }

  const { id: _id, ...data } = entry;
  const ref = await addDoc(entriesCol(entry.orgId), {
    ...data,
    createdAt: Timestamp.now(),
  });
  await addDoc(auditCol(entry.orgId), {
    at: new Date().toISOString(),
    who: entry.createdBy,
    action: `Created ${entry.type} entry (${fmt(entry.amount, entry.currency)})`,
  });
  return { ...entry, id: ref.id };
}

export async function updateEntryStatus(
  orgId: string,
  entryId: string,
  status: LedgerStatus,
  approver?: string
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    approvedBy: approver ?? null,
    approvedAt: Timestamp.now(),
  };

  if (status === 'approved') {
    const idx = ledger.findIndex((l) => l.id === entryId);
    if (USE_MOCK_DATA && idx >= 0) {
      const entry = ledger[idx];
      const updated: LedgerEntry = {
        ...entry,
        status,
        approvedBy: approver,
        approvedAt: new Date().toISOString().slice(0, 10),
      };
      updated.hash = await hashRecord(updated);
      updated.anchorStatus = 'ready';
      ledger = [...ledger.slice(0, idx), updated, ...ledger.slice(idx + 1)];
      return;
    }

    // For Firestore, fetch the doc and hash it with the new status applied
    const docForHash = await getDoc(doc(db!, `organizations/${orgId}/ledgerEntries/${entryId}`));
    const entryForHash = docForHash.exists()
      ? toEntry(docForHash.id, docForHash.data() as Record<string, unknown>)
      : { orgId, id: entryId } as LedgerEntry;
    const hash = await hashRecord({ ...entryForHash, status, approvedBy: approver });
    patch.hash = hash;
    patch.anchorStatus = 'ready';
  } else if (USE_MOCK_DATA) {
    const idx = ledger.findIndex((l) => l.id === entryId);
    if (idx >= 0) {
      ledger = [
        ...ledger.slice(0, idx),
        { ...ledger[idx], status, approvedBy: approver, approvedAt: new Date().toISOString().slice(0, 10) },
        ...ledger.slice(idx + 1),
      ];
    }
    return;
  }

  await updateDoc(doc(db!, `organizations/${orgId}/ledgerEntries/${entryId}`), patch);
}

export async function anchorEntry(orgId: string, entryId: string): Promise<void> {
  const idx = ledger.findIndex((l) => l.id === entryId);

  if (USE_MOCK_DATA) {
    if (idx < 0) return;
    const entry = ledger[idx];
    if (!entry.hash) throw new Error('Cannot anchor an entry without a hash. Approve it first.');
    const { txHash } = await submitAnchor(orgId, entryId, entry.hash);
    ledger = [
      ...ledger.slice(0, idx),
      { ...entry, anchorStatus: 'anchored', status: 'anchored', txHash },
      ...ledger.slice(idx + 1),
    ];
    return;
  }

  const entryRef = doc(db!, `organizations/${orgId}/ledgerEntries/${entryId}`);
  const entryDoc = await getDoc(entryRef);
  if (!entryDoc.exists()) return;

  const entry = toEntry(entryDoc.id, entryDoc.data() as Record<string, unknown>);
  if (!entry.hash) throw new Error('Cannot anchor an entry without a hash. Approve it first.');

  const { txHash } = await submitAnchor(orgId, entryId, entry.hash);

  await updateDoc(entryRef, {
    anchorStatus: 'anchored',
    status: 'anchored',
    txHash,
  });
  await addDoc(collection(db!, `organizations/${orgId}/anchors`), {
    entryId,
    hash: entry.hash,
    txHash,
    timestamp: new Date().toISOString(),
    status: 'anchored',
    verified: true,
  });
  await addDoc(auditCol(orgId), {
    at: new Date().toISOString(),
    who: entry.approvedBy ?? entry.createdBy,
    action: `Anchored ${entryId} to Alkebuleum (tx ${txHash.slice(0, 10)}…)`,
  });
}
