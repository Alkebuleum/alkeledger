import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
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
  invites: { name: string; email: string }[],
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
      // Skip if already a member
      const existing = await getDocs(
        query(collection(db, 'memberships'), where('orgId', '==', orgId), where('email', '==', email))
      );
      if (!existing.empty) { result.skipped.push(email); continue; }

      // Store invite token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      await setDoc(doc(db, 'invites', token), {
        email,
        orgId,
        name,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        createdAt: serverTimestamp(),
      });
    }

    await sendInviteEmail(email, name, orgName, inviteCode);
    result.sent++;
  }

  return result;
}

async function sendInviteEmail(
  email: string,
  name: string,
  orgName: string,
  inviteCode: string,
): Promise<void> {
  const brevoKey = import.meta.env.VITE_BREVO_API_KEY;
  const senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL;
  const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;

  if (!brevoKey || !senderEmail) {
    console.log(`[DEV INVITE] ${name} <${email}> → org code ${inviteCode}`);
    return;
  }

  const htmlContent = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 20px;background:#FAF8F4">
      <div style="background:#0E1015;border-radius:4px;padding:20px;text-align:center;margin-bottom:24px">
        <span style="color:#FAF8F4;font-size:22px;font-weight:700;letter-spacing:-.02em">AlkeLedger</span>
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#0E1015;margin:0 0 8px">Hi ${name || 'there'},</h1>
      <p style="color:#57534e;margin:0 0 24px;font-size:15px;line-height:1.6">
        You've been invited to join <strong>${orgName}</strong> on AlkeLedger — a ledger and accountability platform for organizations.
      </p>
      <a href="${appUrl}?invite=${inviteCode}" style="display:block;background:#0E1015;color:#FAF8F4;text-decoration:none;padding:14px;text-align:center;font-weight:600;font-size:16px;margin-bottom:24px">
        Open AlkeLedger →
      </a>
      <div style="background:white;border:1px solid #e7e5e4;padding:16px;text-align:center;margin-bottom:24px">
        <div style="font-size:11px;color:#78716c;margin-bottom:6px;text-transform:uppercase;letter-spacing:.1em">Workspace invite code</div>
        <span style="font-size:32px;font-weight:800;letter-spacing:.3em;color:#0E1015">${inviteCode}</span>
      </div>
      <p style="color:#a8a29e;font-size:12px;margin:0;text-align:center">Sign in, then enter this code to join ${orgName}.</p>
    </div>
  `;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'AlkeLedger', email: senderEmail },
      to: [{ email, name }],
      subject: `You're invited to join ${orgName} on AlkeLedger`,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Email delivery failed');
  }
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
