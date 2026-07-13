import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import { MOCK_ORGS } from '@/data/mock';
import type { Organization, MemberType, DuesRates } from '@/types';

let mockOrgs: Organization[] = [...MOCK_ORGS];

function genInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50) || 'org';
}

function docToOrg(id: string, d: Record<string, unknown>): Organization {
  return {
    id,
    slug: d.slug as string | undefined,
    name: d.name as string,
    type: d.type as Organization['type'],
    createdAt: d.createdAt as string,
    currency: d.currency as string,
    logoInitials: d.logoInitials as string,
    tagline: d.tagline as string | undefined,
    logoUrl: d.logoUrl as string | undefined,
    inviteCode: d.inviteCode as string | undefined,
    createdBy: d.createdBy as string | undefined,
    allowedMemberTypes: d.allowedMemberTypes as MemberType[] | undefined,
    duesRates: d.duesRateIndividual != null
      ? { individual: d.duesRateIndividual as number, organization: d.duesRateOrganization as number }
      : undefined,
  };
}

export async function listAllOrgsForUser(
  userId: string,
): Promise<{ active: Organization[]; pending: Organization[] }> {
  if (USE_MOCK_DATA) return { active: mockOrgs, pending: [] };
  if (!db) return { active: [], pending: [] };

  const snap = await getDocs(
    query(collection(db, 'memberships'), where('userId', '==', userId))
  );
  if (snap.empty) return { active: [], pending: [] };

  const activeIds: string[] = [];
  const pendingIds: string[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const orgId = data.orgId as string;
    if (data.status === 'active') activeIds.push(orgId);
    else if (data.status === 'pending') pendingIds.push(orgId);
  }

  const allIds = [...new Set([...activeIds, ...pendingIds])];
  if (allIds.length === 0) return { active: [], pending: [] };

  const orgMap = new Map<string, Organization>();
  await Promise.all(
    allIds.map(async (orgId) => {
      const orgSnap = await getDoc(doc(db!, 'organizations', orgId));
      if (orgSnap.exists()) {
        orgMap.set(orgSnap.id, docToOrg(orgSnap.id, orgSnap.data() as Record<string, unknown>));
      }
    })
  );

  const toOrgs = (ids: string[]) =>
    [...new Set(ids)].map((id) => orgMap.get(id)).filter(Boolean) as Organization[];

  return { active: toOrgs(activeIds), pending: toOrgs(pendingIds) };
}

export async function listOrganizationsForUser(userId: string): Promise<Organization[]> {
  return (await listAllOrgsForUser(userId)).active;
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) return mockOrgs.find((o) => o.id === orgId) ?? null;
  if (!db) return null;

  const snap = await getDoc(doc(db, 'organizations', orgId));
  if (!snap.exists()) return null;
  return docToOrg(snap.id, snap.data() as Record<string, unknown>);
}

export async function createOrganization(
  org: Omit<Organization, 'id' | 'createdAt'>,
  userId: string,
  userName: string,
  userEmail: string,
): Promise<Organization> {
  const inviteCode = genInviteCode();
  const slug = slugify(org.name);
  const newOrg: Organization = {
    ...org,
    id: 'org_' + Math.random().toString(36).slice(2, 8),
    slug,
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
    slug,
    inviteCode,
    createdBy: userId,
    createdAt: new Date().toISOString().slice(0, 10),
    createdAtTs: serverTimestamp(),
  });

  await setDoc(doc(db, 'memberships', `${ref.id}_${userId}`), {
    orgId: ref.id,
    userId,
    name: userName,
    email: userEmail,
    role: 'owner',
    status: 'active',
    joined: new Date().toISOString().slice(0, 10),
    duesPaid: false,
    memberType: 'individual',
  });

  return { ...newOrg, id: ref.id, slug };
}

export async function updateOrgSettings(
  orgId: string,
  settings: { allowedMemberTypes?: MemberType[]; duesRates?: DuesRates; tagline?: string; logoUrl?: string },
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockOrgs = mockOrgs.map((o) =>
      o.id === orgId ? { ...o, ...settings } : o
    );
    return;
  }
  if (!db) return;

  const updates: Record<string, unknown> = {};
  if (settings.allowedMemberTypes !== undefined) {
    updates.allowedMemberTypes = settings.allowedMemberTypes;
  }
  if (settings.duesRates !== undefined) {
    updates.duesRateIndividual = settings.duesRates.individual;
    updates.duesRateOrganization = settings.duesRates.organization;
  }
  if (settings.tagline !== undefined) {
    updates.tagline = settings.tagline;
  }
  if (settings.logoUrl !== undefined) {
    updates.logoUrl = settings.logoUrl;
  }
  await updateDoc(doc(db, 'organizations', orgId), updates);
}

export async function getOrgByInviteCode(code: string): Promise<Organization | null> {
  if (USE_MOCK_DATA) return null;
  if (!db) return null;

  const snap = await getDocs(
    query(collection(db, 'organizations'), where('inviteCode', '==', code.toUpperCase()))
  );
  if (snap.empty) return null;
  return docToOrg(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  if (USE_MOCK_DATA) return mockOrgs.find((o) => o.slug === slug) ?? null;
  if (!db) return null;

  const snap = await getDocs(
    query(collection(db, 'organizations'), where('slug', '==', slug))
  );
  if (snap.empty) return null;
  return docToOrg(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

export async function joinOrganization(
  orgId: string,
  userId: string,
  name: string,
  email: string,
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId) || !db) return;

  const existing = await getDoc(doc(db, 'memberships', `${orgId}_${userId}`));
  if (existing.exists()) return;

  await setDoc(doc(db, 'memberships', `${orgId}_${userId}`), {
    orgId,
    userId,
    name,
    email,
    role: 'member',
    status: 'pending',
    joined: new Date().toISOString().slice(0, 10),
    duesPaid: false,
    memberType: 'individual',
  });
}

export async function deleteOrganization(orgId: string): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockOrgs = mockOrgs.filter((o) => o.id !== orgId);
    return;
  }
  if (!db) return;

  // Delete org first (while caller's membership still exists for rule check),
  // then clean up memberships.
  await deleteDoc(doc(db, 'organizations', orgId));

  const memberSnap = await getDocs(
    query(collection(db, 'memberships'), where('orgId', '==', orgId))
  );
  await Promise.all(memberSnap.docs.map((d) => deleteDoc(d.ref)));
}

export async function listOrganizations(): Promise<Organization[]> {
  return mockOrgs;
}

export { createOrganization as createOrg };
