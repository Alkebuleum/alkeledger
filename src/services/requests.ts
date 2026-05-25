import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { MOCK_REQUESTS } from '@/data/mock';
import type { MemberRequest } from '@/types';

let mockRequests = [...MOCK_REQUESTS];

export async function listRequests(orgId: string): Promise<MemberRequest[]> {
  if (USE_MOCK_DATA) return mockRequests.filter((r) => r.orgId === orgId);
  if (!db) return [];

  const snap = await getDocs(
    query(
      collection(db, 'organizations', orgId, 'requests'),
      orderBy('createdAt', 'desc'),
    )
  );

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      orgId,
      from: data.from as string,
      fromId: data.fromId as string | undefined,
      subject: data.subject as string,
      message: data.message as string | undefined,
      status: (data.status as 'open' | 'closed') ?? 'open',
      date: data.date as string,
      response: data.response as string | undefined,
      closedBy: data.closedBy as string | undefined,
      closedAt: data.closedAt as string | undefined,
    };
  });
}

export async function submitRequest(
  orgId: string,
  data: { from: string; fromId?: string; subject: string; message?: string },
): Promise<MemberRequest> {
  const date = new Date().toISOString().slice(0, 10);
  const req: MemberRequest = {
    id: 'r_' + Math.random().toString(36).slice(2, 8),
    orgId,
    from: data.from,
    fromId: data.fromId,
    subject: data.subject,
    message: data.message,
    status: 'open',
    date,
  };

  if (USE_MOCK_DATA) {
    mockRequests = [req, ...mockRequests];
    return req;
  }
  if (!db) return req;

  const ref = await addDoc(collection(db, 'organizations', orgId, 'requests'), {
    from: data.from,
    fromId: data.fromId ?? null,
    subject: data.subject,
    message: data.message ?? '',
    status: 'open',
    date,
    createdAt: serverTimestamp(),
  });

  return { ...req, id: ref.id };
}

export async function closeRequest(
  orgId: string,
  requestId: string,
  closedBy: string,
  response?: string,
): Promise<void> {
  const closedAt = new Date().toISOString();

  if (USE_MOCK_DATA) {
    mockRequests = mockRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'closed', closedBy, closedAt, response } : r
    );
    return;
  }
  if (!db) return;

  await updateDoc(doc(db, 'organizations', orgId, 'requests', requestId), {
    status: 'closed',
    closedBy,
    closedAt,
    response: response ?? '',
  });
}
