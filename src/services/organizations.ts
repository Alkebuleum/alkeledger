import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc,
  query, where,
} from 'firebase/firestore';
import { USE_MOCK_DATA, db } from '@/lib/firebase';
import { isDemoOrgId } from '@/lib/demo';
import { MOCK_ORGS } from '@/data/mock';
import type { Organization, MemberType, DuesRates, MigrationRequest, PlanCode } from '@/types';

let mockOrgs: Organization[] = [...MOCK_ORGS];

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
    // Existing orgs predate the billing schema — default them to the free/active state
    // they've always behaved as, rather than requiring a data migration.
    planCode: (d.planCode as PlanCode | undefined) ?? 'free',
    organizationStatus: (d.organizationStatus as Organization['organizationStatus']) ?? 'active',
    billingStatus: (d.billingStatus as Organization['billingStatus']) ?? 'not_required',
    stripeCustomerId: d.stripeCustomerId as string | undefined,
    stripeSubscriptionId: d.stripeSubscriptionId as string | undefined,
    stripeCheckoutSessionId: d.stripeCheckoutSessionId as string | undefined,
    stripePriceId: d.stripePriceId as string | undefined,
    subscriptionCurrentPeriodEnd: d.subscriptionCurrentPeriodEnd as string | undefined,
    cancelAtPeriodEnd: d.cancelAtPeriodEnd as boolean | undefined,
    migrationRequest: d.migrationRequest as MigrationRequest | undefined,
    trialEndsAt: d.trialEndsAt as string | undefined,
    country: d.country as string | undefined,
    region: d.region as string | undefined,
    website: d.website as string | undefined,
    estimatedMembers: d.estimatedMembers as number | undefined,
    primaryAdminName: d.primaryAdminName as string | undefined,
    primaryAdminEmail: d.primaryAdminEmail as string | undefined,
    cooperativeConfig: d.cooperativeConfig as Organization['cooperativeConfig'],
  };
}

export async function listAllOrgsForUser(
  userId: string,
): Promise<{ active: Organization[]; pending: Organization[]; pendingPayment: Organization[] }> {
  if (USE_MOCK_DATA) return { active: mockOrgs, pending: [], pendingPayment: [] };
  if (!db) return { active: [], pending: [], pendingPayment: [] };

  const snap = await getDocs(
    query(collection(db, 'memberships'), where('userId', '==', userId))
  );
  if (snap.empty) return { active: [], pending: [], pendingPayment: [] };

  const activeIds: string[] = [];
  const pendingIds: string[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const orgId = data.orgId as string;
    if (data.status === 'active') activeIds.push(orgId);
    else if (data.status === 'pending') pendingIds.push(orgId);
  }

  const allIds = [...new Set([...activeIds, ...pendingIds])];
  if (allIds.length === 0) return { active: [], pending: [], pendingPayment: [] };

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

  // A membership can be "active" while the org itself is still a draft/pending-payment
  // shell (paid plan awaiting Stripe Checkout) — those don't count as a usable workspace.
  const activeOrgs = toOrgs(activeIds);
  const active = activeOrgs.filter((o) => o.organizationStatus === 'active');
  const pendingPayment = activeOrgs.filter(
    (o) => o.organizationStatus === 'draft' || o.organizationStatus === 'pending_payment'
  );

  return { active, pending: toOrgs(pendingIds), pendingPayment };
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

// Organization creation itself now happens on the backend (POST /api/v1/organizations —
// see src/services/billing.ts) — it writes the org doc, owner membership, and billing
// state. This only attaches ordinary operational metadata the API has no slot for
// (org-details step, cooperative config, the rich migration questionnaire) onto the
// org the API just created. None of these are billing/status fields, so an owner-write
// is fine per firestore.rules.
export async function patchOrganizationMetadata(
  orgId: string,
  metadata: {
    logoInitials?: string;
    country?: string;
    region?: string;
    website?: string;
    estimatedMembers?: number;
    primaryAdminName?: string;
    primaryAdminEmail?: string;
    cooperativeConfig?: Organization['cooperativeConfig'];
    migrationRequest?: MigrationRequest;
  },
): Promise<void> {
  if (USE_MOCK_DATA || isDemoOrgId(orgId)) {
    mockOrgs = mockOrgs.map((o) => (o.id === orgId ? { ...o, ...metadata } : o));
    return;
  }
  if (!db) return;

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) return;

  await updateDoc(doc(db, 'organizations', orgId), updates);
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
