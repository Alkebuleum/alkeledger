import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import type { Benefit, BenefitRequest, BenefitRequestStatus } from '@/types';

let mockBenefits: Benefit[] = [];
let mockRequests: BenefitRequest[] = [];

function benefitsCol(orgId: string) {
  return collection(db!, 'organizations', orgId, 'benefits');
}
function requestsCol(orgId: string) {
  return collection(db!, 'organizations', orgId, 'benefitRequests');
}

function toDate(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString().slice(0, 10);
  return (v as string) ?? '';
}

// ─── Benefits ─────────────────────────────────────────────────────────────────

export async function listBenefits(orgId: string): Promise<Benefit[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockBenefits.filter((b) => b.orgId === orgId);
  if (!db) return [];
  const snap = await getDocs(query(benefitsCol(orgId), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orgId,
      name:           data.name as string,
      description:    data.description as string | undefined,
      maxAmount:      data.maxAmount as number | undefined,
      requiresAmount: (data.requiresAmount as boolean) ?? false,
      active:         (data.active as boolean) ?? true,
      createdBy:      data.createdBy as string,
      createdAt:      toDate(data.createdAt),
    };
  });
}

export async function createBenefit(
  orgId: string,
  data: Omit<Benefit, 'id' | 'orgId' | 'createdAt'>,
): Promise<Benefit> {
  const benefit: Benefit = {
    ...data,
    id: 'b_' + Math.random().toString(36).slice(2, 9),
    orgId,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) { mockBenefits = [...mockBenefits, benefit]; return benefit; }
  if (!db) return benefit;
  const ref = await addDoc(benefitsCol(orgId), { ...data, orgId, createdAt: serverTimestamp() });
  return { ...benefit, id: ref.id };
}

export async function updateBenefit(
  orgId: string,
  benefitId: string,
  data: Partial<Pick<Benefit, 'name' | 'description' | 'maxAmount' | 'requiresAmount' | 'active'>>,
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockBenefits = mockBenefits.map((b) => b.id === benefitId ? { ...b, ...data } : b);
    return;
  }
  if (!db) return;
  await updateDoc(doc(benefitsCol(orgId), benefitId), data as Record<string, unknown>);
}

export async function deleteBenefit(orgId: string, benefitId: string): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) { mockBenefits = mockBenefits.filter((b) => b.id !== benefitId); return; }
  if (!db) return;
  await deleteDoc(doc(benefitsCol(orgId), benefitId));
}

// ─── Benefit requests ─────────────────────────────────────────────────────────

export async function listBenefitRequests(orgId: string): Promise<BenefitRequest[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockRequests.filter((r) => r.orgId === orgId);
  if (!db) return [];
  const snap = await getDocs(query(requestsCol(orgId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orgId,
      benefitId:   data.benefitId as string,
      benefitName: data.benefitName as string,
      memberId:    data.memberId as string,
      memberName:  data.memberName as string,
      amount:      data.amount as number | undefined,
      justification: data.justification as string | undefined,
      status:      (data.status as BenefitRequestStatus) ?? 'pending',
      response:    data.response as string | undefined,
      closedBy:    data.closedBy as string | undefined,
      closedAt:    data.closedAt as string | undefined,
      createdAt:   toDate(data.createdAt),
    };
  });
}

export async function listMyBenefitRequests(orgId: string, userId: string): Promise<BenefitRequest[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockRequests.filter((r) => r.orgId === orgId && r.memberId === userId);
  if (!db) return [];
  const snap = await getDocs(
    query(requestsCol(orgId), where('memberId', '==', userId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orgId,
      benefitId:    data.benefitId as string,
      benefitName:  data.benefitName as string,
      memberId:     data.memberId as string,
      memberName:   data.memberName as string,
      amount:       data.amount as number | undefined,
      justification: data.justification as string | undefined,
      status:       (data.status as BenefitRequestStatus) ?? 'pending',
      response:     data.response as string | undefined,
      closedBy:     data.closedBy as string | undefined,
      closedAt:     data.closedAt as string | undefined,
      createdAt:    toDate(data.createdAt),
    };
  });
}

export async function submitBenefitRequest(
  orgId: string,
  data: { benefitId: string; benefitName: string; memberId: string; memberName: string; amount?: number; justification?: string },
): Promise<BenefitRequest> {
  const req: BenefitRequest = {
    ...data,
    id: 'br_' + Math.random().toString(36).slice(2, 9),
    orgId,
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 10),
  };
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) { mockRequests = [req, ...mockRequests]; return req; }
  if (!db) return req;
  const ref = await addDoc(requestsCol(orgId), {
    ...data,
    orgId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return { ...req, id: ref.id };
}

export async function markBenefitPaid(
  orgId: string,
  requestId: string,
  paidBy: string,
  paidAmount?: number,
): Promise<void> {
  const paidAt = new Date().toISOString();
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockRequests = mockRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'paid' as const, paidBy, paidAt, paidAmount } : r,
    );
    return;
  }
  if (!db) return;
  await updateDoc(doc(requestsCol(orgId), requestId), { status: 'paid', paidBy, paidAt, paidAmount: paidAmount ?? null });
}

export async function decideBenefitRequest(
  orgId: string,
  requestId: string,
  status: 'approved' | 'rejected',
  closedBy: string,
  response?: string,
): Promise<void> {
  const closedAt = new Date().toISOString();
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockRequests = mockRequests.map((r) =>
      r.id === requestId ? { ...r, status, closedBy, closedAt, response } : r,
    );
    return;
  }
  if (!db) return;
  await updateDoc(doc(requestsCol(orgId), requestId), {
    status,
    closedBy,
    closedAt,
    response: response ?? '',
  });
}
