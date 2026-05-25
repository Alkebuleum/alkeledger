import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { MOCK_ORGS } from '@/data/mock';
import type { Organization } from '@/types';

let mockOrgs: Organization[] = [...MOCK_ORGS];

function genInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function listOrganizationsForUser(userId: string): Promise<Organization[]> {
  if (USE_MOCK_DATA) return mockOrgs;
  if (!db) return [];

  const snap = await getDocs(
    query(collection(db, 'memberships'), where('userId', '==', userId))
  );
  if (snap.empty) return [];

  const orgIds = [...new Set(snap.docs.map((d) => d.data().orgId as string))];
  const orgs: Organization[] = [];

  await Promise.all(
    orgIds.map(async (orgId) => {
      const orgSnap = await getDoc(doc(db!, 'organizations', orgId));
      if (orgSnap.exists()) {
        const d = orgSnap.data();
        orgs.push({
          id: orgSnap.id,
          name: d.name,
          type: d.type,
          createdAt: d.createdAt,
          currency: d.currency,
          logoInitials: d.logoInitials,
          tagline: d.tagline,
          inviteCode: d.inviteCode,
          createdBy: d.createdBy,
        });
      }
    })
  );

  return orgs;
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  if (USE_MOCK_DATA) return mockOrgs.find((o) => o.id === orgId) ?? null;
  if (!db) return null;

  const snap = await getDoc(doc(db, 'organizations', orgId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name,
    type: d.type,
    createdAt: d.createdAt,
    currency: d.currency,
    logoInitials: d.logoInitials,
    tagline: d.tagline,
    inviteCode: d.inviteCode,
    createdBy: d.createdBy,
  };
}

export async function createOrganization(
  org: Omit<Organization, 'id' | 'createdAt'>,
  userId: string,
  userName: string,
  userEmail: string,
): Promise<Organization> {
  const inviteCode = genInviteCode();
  const newOrg: Organization = {
    ...org,
    id: 'org_' + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString().slice(0, 10),
    inviteCode,
    createdBy: userId,
  };

  if (USE_MOCK_DATA) {
    mockOrgs = [...mockOrgs, newOrg];
    return newOrg;
  }
  if (!db) return newOrg;

  const ref = await addDoc(collection(db, 'organizations'), {
    name: org.name,
    type: org.type,
    currency: org.currency,
    logoInitials: org.logoInitials,
    tagline: org.tagline ?? '',
    inviteCode,
    createdBy: userId,
    createdAt: new Date().toISOString().slice(0, 10),
    createdAtTs: serverTimestamp(),
  });

  // Owner membership record
  await setDoc(doc(db, 'memberships', `${ref.id}_${userId}`), {
    orgId: ref.id,
    userId,
    name: userName,
    email: userEmail,
    role: 'owner',
    status: 'active',
    joined: new Date().toISOString().slice(0, 10),
    duesPaid: false,
  });

  return { ...newOrg, id: ref.id };
}

export async function getOrgByInviteCode(code: string): Promise<Organization | null> {
  if (USE_MOCK_DATA) return null;
  if (!db) return null;

  const snap = await getDocs(
    query(collection(db, 'organizations'), where('inviteCode', '==', code.toUpperCase()))
  );
  if (snap.empty) return null;
  const orgSnap = snap.docs[0];
  const d = orgSnap.data();
  return {
    id: orgSnap.id,
    name: d.name,
    type: d.type,
    createdAt: d.createdAt,
    currency: d.currency,
    logoInitials: d.logoInitials,
    tagline: d.tagline,
    inviteCode: d.inviteCode,
  };
}

export async function joinOrganization(
  orgId: string,
  userId: string,
  name: string,
  email: string,
): Promise<void> {
  if (USE_MOCK_DATA || !db) return;

  const existing = await getDoc(doc(db, 'memberships', `${orgId}_${userId}`));
  if (existing.exists()) return; // already a member

  await setDoc(doc(db, 'memberships', `${orgId}_${userId}`), {
    orgId,
    userId,
    name,
    email,
    role: 'member',
    status: 'pending',
    joined: new Date().toISOString().slice(0, 10),
    duesPaid: false,
  });
}

// Legacy: keep listOrganizations for mock-only callers
export async function listOrganizations(): Promise<Organization[]> {
  return mockOrgs;
}

export { createOrganization as createOrg };
