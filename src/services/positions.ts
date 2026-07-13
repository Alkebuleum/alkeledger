import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import { MOCK_POSITIONS } from '@/data/mock';
import type { Position, PositionStatus } from '@/types';

let mockPositions: Position[] = [...MOCK_POSITIONS];

function positionsCol(orgId: string) {
  return collection(db!, 'organizations', orgId, 'positions');
}

function toDate(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString().slice(0, 10);
  return (v as string) ?? '';
}

function toPosition(id: string, orgId: string, data: Record<string, unknown>): Position {
  return {
    id,
    orgId,
    memberId: data.memberId as string,
    memberName: data.memberName as string,
    units: (data.units as number) ?? 0,
    contributionNote: data.contributionNote as string | undefined,
    status: (data.status as PositionStatus) ?? 'active',
    issuedBy: data.issuedBy as string,
    issuedAt: toDate(data.issuedAt),
  };
}

export async function listPositions(orgId: string): Promise<Position[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockPositions.filter((p) => p.orgId === orgId);
  if (!db) return [];
  const snap = await getDocs(query(positionsCol(orgId), orderBy('issuedAt', 'desc')));
  return snap.docs.map((d) => toPosition(d.id, orgId, d.data()));
}

export async function createPosition(
  orgId: string,
  data: Omit<Position, 'id' | 'orgId' | 'issuedAt'>,
): Promise<Position> {
  const position: Position = {
    ...data,
    id: 'pos_' + Math.random().toString(36).slice(2, 9),
    orgId,
    issuedAt: new Date().toISOString().slice(0, 10),
  };
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) { mockPositions = [position, ...mockPositions]; return position; }
  if (!db) return position;
  const ref = await addDoc(positionsCol(orgId), { ...data, orgId, issuedAt: serverTimestamp() });
  return { ...position, id: ref.id };
}

export async function updatePosition(
  orgId: string,
  positionId: string,
  data: Partial<Pick<Position, 'units' | 'contributionNote' | 'status'>>,
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockPositions = mockPositions.map((p) => p.id === positionId ? { ...p, ...data } : p);
    return;
  }
  if (!db) return;
  await updateDoc(doc(positionsCol(orgId), positionId), data as Record<string, unknown>);
}

export async function deletePosition(orgId: string, positionId: string): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) { mockPositions = mockPositions.filter((p) => p.id !== positionId); return; }
  if (!db) return;
  await deleteDoc(doc(positionsCol(orgId), positionId));
}
