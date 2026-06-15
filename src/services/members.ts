import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { USE_MOCK_DATA, db, app } from '@/lib/firebase';
import { MOCK_MEMBERS } from '@/data/mock';
import type { Member, MemberStatus } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function membershipId(orgId: string, userId: string) {
  return `${orgId}_${userId}`;
}

function docToMember(d: Record<string, unknown>, id: string): Member {
  return {
    id,
    orgId: d.orgId as string,
    name: d.name as string,
    email: d.email as string,
    role: (d.role as string) ?? 'member',
    status: (d.status as MemberStatus) ?? 'active',
    joined: (d.joined as string) ?? '',
    duesPaid: (d.duesPaid as boolean) ?? false,
    phone: d.phone as string | undefined,
    memberType: (d.memberType as Member['memberType']) ?? 'individual',
    orgName: d.orgName as string | undefined,
    orgTitle: d.orgTitle as string | undefined,
  };
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function listMembers(orgId: string): Promise<Member[]> {
  if (USE_MOCK_DATA) return MOCK_MEMBERS.filter((m) => m.orgId === orgId);
  if (!db) return [];

  const snap = await getDocs(
    query(collection(db, 'memberships'), where('orgId', '==', orgId))
  );
  return snap.docs.map((d) => docToMember(d.data() as Record<string, unknown>, d.data().userId as string));
}

export async function getMember(orgId: string, userId: string): Promise<Member | null> {
  if (USE_MOCK_DATA) return MOCK_MEMBERS.find((m) => m.id === userId && m.orgId === orgId) ?? null;
  if (!db) return null;

  const snap = await getDoc(doc(db, 'memberships', membershipId(orgId, userId)));
  if (!snap.exists()) return null;
  return docToMember(snap.data() as Record<string, unknown>, userId);
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: string,
): Promise<void> {
  if (USE_MOCK_DATA || !db) return;

  // Last-admin guard
  if (role !== 'owner' && role !== 'admin') {
    const currentSnap = await getDoc(doc(db, 'memberships', membershipId(orgId, userId)));
    if (currentSnap.exists()) {
      const current = currentSnap.data() as Record<string, unknown>;
      if (current.role === 'owner' || current.role === 'admin') {
        const adminSnap = await getDocs(
          query(
            collection(db, 'memberships'),
            where('orgId', '==', orgId),
            where('role', 'in', ['owner', 'admin']),
          )
        );
        if (adminSnap.size <= 1) throw new Error('Cannot remove the last admin.');
      }
    }
  }

  await updateDoc(doc(db, 'memberships', membershipId(orgId, userId)), { role });
}

export async function updateMemberStatus(
  orgId: string,
  userId: string,
  status: MemberStatus,
): Promise<void> {
  if (USE_MOCK_DATA || !db) return;
  await updateDoc(doc(db, 'memberships', membershipId(orgId, userId)), { status });
}

export async function setDuesPaid(
  orgId: string,
  userId: string,
  duesPaid: boolean,
): Promise<void> {
  if (USE_MOCK_DATA || !db) return;
  await updateDoc(doc(db, 'memberships', membershipId(orgId, userId)), { duesPaid });
}

export async function resetAllDuesPaid(orgId: string): Promise<void> {
  if (USE_MOCK_DATA || !db) return;
  const snap = await getDocs(
    query(collection(db, 'memberships'), where('orgId', '==', orgId), where('status', '==', 'active'))
  );
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { duesPaid: false })));
}

export async function updateMemberInfo(
  orgId: string,
  userId: string,
  info: { memberType?: Member['memberType']; orgName?: string; orgTitle?: string },
): Promise<void> {
  if (USE_MOCK_DATA || !db) return;
  await updateDoc(doc(db, 'memberships', membershipId(orgId, userId)), info);
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  if (USE_MOCK_DATA || !db) return;

  const snap = await getDoc(doc(db, 'memberships', membershipId(orgId, userId)));
  if (!snap.exists()) return;

  const data = snap.data() as Record<string, unknown>;
  if (data.role === 'owner' || data.role === 'admin') {
    const adminSnap = await getDocs(
      query(
        collection(db, 'memberships'),
        where('orgId', '==', orgId),
        where('role', 'in', ['owner', 'admin']),
      )
    );
    if (adminSnap.size <= 1) throw new Error('Cannot remove the last admin.');
  }

  await deleteDoc(doc(db, 'memberships', membershipId(orgId, userId)));
}

// ── Invite ────────────────────────────────────────────────────────────────────

export interface InviteResult {
  sent: number;
  skipped: string[];
  errors: string[];
}

export async function inviteMembers(
  orgId: string,
  orgName: string,
  inviteCode: string,
  invites: { name: string; email: string; memberType?: Member['memberType']; orgName?: string; orgTitle?: string }[],
): Promise<InviteResult> {
  const result: InviteResult = { sent: 0, skipped: [], errors: [] };

  for (const invite of invites) {
    const email = invite.email.trim().toLowerCase();
    const name = invite.name.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.errors.push(`Invalid email: ${invite.email}`);
      continue;
    }

    if (!USE_MOCK_DATA && db) {
      const existing = await getDocs(
        query(collection(db, 'memberships'), where('orgId', '==', orgId), where('email', '==', email))
      );
      if (!existing.empty) { result.skipped.push(email); continue; }

      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      await setDoc(doc(db, 'invites', token), {
        email,
        orgId,
        name,
        memberType: invite.memberType ?? 'individual',
        orgName: invite.orgName ?? null,
        orgTitle: invite.orgTitle ?? null,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        createdAt: serverTimestamp(),
      });

      await sendInviteEmail(email, name, orgName, orgId, inviteCode, token);
      result.sent++;
      continue;
    }

    await sendInviteEmail(email, name, orgName, orgId, inviteCode, null);
    result.sent++;
  }

  return result;
}

async function sendInviteEmail(
  email: string,
  name: string,
  orgName: string,
  orgId: string,
  inviteCode: string,
  token: string | null,
): Promise<void> {
  if (USE_MOCK_DATA || !app) {
    const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;
    const joinLink = token ? `${appUrl}/join/${inviteCode}?t=${token}` : `${appUrl}/join/${inviteCode}`;
    console.log(`[DEV INVITE] ${name} <${email}> → ${joinLink}`);
    return;
  }
  await httpsCallable(getFunctions(app), 'sendInviteEmail')({
    email, name, orgName, orgId, inviteCode, token,
  });
}

export interface PendingInvite {
  token: string;
  email: string;
  name: string;
  orgId: string;
  expiresAt: number;
  createdAt: number;
}

export async function listPendingInvites(orgId: string): Promise<PendingInvite[]> {
  if (USE_MOCK_DATA || !db) return [];

  const snap = await getDocs(
    query(
      collection(db, 'invites'),
      where('orgId', '==', orgId),
      where('expiresAt', '>', Date.now()),
    )
  );
  return snap.docs.map((d) => ({
    token: d.id,
    ...(d.data() as Omit<PendingInvite, 'token'>),
  }));
}

export async function revokeInvite(token: string): Promise<void> {
  if (USE_MOCK_DATA || !db) return;
  await deleteDoc(doc(db, 'invites', token));
}

export async function inviteMember(orgId: string, email: string, name: string): Promise<void> {
  void orgId; void email; void name; // legacy stub
}
