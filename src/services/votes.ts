import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  orderBy, query, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { USE_MOCK_DATA, db, app } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import { MOCK_POLLS } from '@/data/mock';
import type { Poll, PollVote } from '@/types';

let mockPolls = [...MOCK_POLLS];

function pollsCol(orgId: string) {
  return collection(db!, 'organizations', orgId, 'polls');
}

function toPoll(id: string, data: Record<string, unknown>): Poll {
  return {
    ...(data as unknown as Poll),
    id,
    createdAt: data.createdAt instanceof Timestamp
      ? (data.createdAt as Timestamp).toDate().toISOString().slice(0, 10)
      : (data.createdAt as string ?? ''),
  };
}

export async function listPolls(orgId: string): Promise<Poll[]> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockPolls.filter((p) => p.orgId === orgId);
  if (!db) return [];
  const snap = await getDocs(query(pollsCol(orgId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => toPoll(d.id, d.data()));
}

export async function createPoll(
  orgId: string,
  data: Omit<Poll, 'id' | 'orgId' | 'createdAt' | 'votes'>,
): Promise<Poll> {
  const poll: Poll = {
    ...data,
    id: 'pol_' + Math.random().toString(36).slice(2, 9),
    orgId,
    createdAt: new Date().toISOString().slice(0, 10),
    votes: {},
  };
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) { mockPolls = [poll, ...mockPolls]; return poll; }
  if (!db) return poll;
  const ref = await addDoc(pollsCol(orgId), {
    ...data,
    orgId,
    votes: {},
    createdAt: serverTimestamp(),
  });
  return { ...poll, id: ref.id };
}

export async function updatePoll(
  orgId: string,
  pollId: string,
  data: Partial<Pick<Poll,
    'title' | 'description' | 'options' | 'status' | 'deadline' | 'voteType' |
    'proposalCategory' | 'requestedBudget' | 'fundingSource' | 'timelineNote'
  >>,
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockPolls = mockPolls.map((p) => p.id === pollId ? { ...p, ...data } : p);
    return;
  }
  if (!db) return;
  await updateDoc(doc(pollsCol(orgId), pollId), data as Record<string, unknown>);
}

export async function deletePoll(orgId: string, pollId: string): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) { mockPolls = mockPolls.filter((p) => p.id !== pollId); return; }
  if (!db) return;
  await deleteDoc(doc(pollsCol(orgId), pollId));
}

export async function castVote(
  orgId: string,
  pollId: string,
  userId: string,
  voterName: string,
  optionIds: string[],
): Promise<void> {
  const vote: PollVote = { optionIds, votedAt: new Date().toISOString(), voterName };
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockPolls = mockPolls.map((p) =>
      p.id === pollId ? { ...p, votes: { ...p.votes, [userId]: vote } } : p,
    );
    return;
  }
  if (!db) return;
  await updateDoc(doc(pollsCol(orgId), pollId), { [`votes.${userId}`]: vote });
}

export async function notifyPollMembers(
  orgId: string,
  pollId: string,
  poll: Pick<Poll, 'title' | 'description'>,
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId) || !app) return;
  await httpsCallable(getFunctions(app), 'notifyPollCreated')({ orgId, pollId, poll });
}
