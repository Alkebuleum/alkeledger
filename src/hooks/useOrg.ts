import { useCallback, useEffect, useState } from 'react';
import {
  listAllOrgsForUser, joinOrganization,
  getOrgByInviteCode, deleteOrganization, updateOrgSettings, patchOrganizationMetadata,
} from '@/services/organizations';
import {
  createOrganizationViaApi, PENDING_METADATA_STORAGE_KEY,
  type CreateOrganizationResponse, type BillingInterval,
} from '@/services/billing';
import { hasDemoAccess } from '@/lib/demo';
import { MOCK_ORGS } from '@/data/mock';
import type { AuthUser } from './useAuth';
import type { Organization, MemberType, DuesRates, MigrationRequest, OrgType } from '@/types';

export interface OnboardingInput {
  name: string;
  type: OrgType;
  currency: string;
  tagline?: string;
  selectedPlan: 'free' | 'standard';
  billingInterval: BillingInterval;
  migrationRequested: boolean;
  idempotencyKey: string;
  // Operational metadata the API has no slot for — patched onto the org doc
  // (via organizations.ts#patchOrganizationMetadata) right after creation.
  logoInitials?: string;
  country?: string;
  region?: string;
  website?: string;
  estimatedMembers?: number;
  primaryAdminName?: string;
  primaryAdminEmail?: string;
  cooperativeConfig?: Organization['cooperativeConfig'];
  migrationRequest?: MigrationRequest;
}

export function useOrgs(user: AuthUser | null) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [pendingOrgs, setPendingOrgs] = useState<Organization[]>([]);
  const [pendingPaymentOrgs, setPendingPaymentOrgs] = useState<Organization[]>([]);
  // Track which uid's orgs are currently loaded. null = not yet loaded.
  const [loadedForUid, setLoadedForUid] = useState<string | null>(null);

  const fetchOrgs = useCallback((uid: string, email: string | undefined) => {
    return listAllOrgsForUser(uid)
      .then(({ active, pending, pendingPayment }) => {
        setOrgs(hasDemoAccess(email) ? [...active, ...MOCK_ORGS] : active);
        setPendingOrgs(pending);
        setPendingPaymentOrgs(pendingPayment);
        setLoadedForUid(uid);
      })
      .catch(() => {
        setOrgs(hasDemoAccess(email) ? [...MOCK_ORGS] : []);
        setPendingOrgs([]);
        setPendingPaymentOrgs([]);
        setLoadedForUid(uid);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setPendingOrgs([]);
      setPendingPaymentOrgs([]);
      setLoadedForUid(null);
      return;
    }
    fetchOrgs(user.uid, user.email);
  }, [user?.uid]);

  // loading is true whenever a non-null user's orgs haven't been fetched yet.
  // This derived value has no race window: if user.uid !== loadedForUid,
  // we're still loading — even before the effect fires after a render.
  const loading = user != null && loadedForUid !== user.uid;

  const addOrg = async (input: OnboardingInput): Promise<CreateOrganizationResponse> => {
    if (!user) throw new Error('Not authenticated');

    const response = await createOrganizationViaApi({
      name: input.name,
      type: input.type,
      currency: input.currency,
      tagline: input.tagline,
      selectedPlan: input.selectedPlan,
      billingInterval: input.billingInterval,
      migrationRequested: input.migrationRequested,
      idempotencyKey: input.idempotencyKey,
    });

    const metadata = {
      logoInitials: input.logoInitials,
      country: input.country,
      region: input.region,
      website: input.website,
      estimatedMembers: input.estimatedMembers,
      primaryAdminName: input.primaryAdminName,
      primaryAdminEmail: input.primaryAdminEmail,
      cooperativeConfig: input.cooperativeConfig,
      migrationRequest: input.migrationRequest,
    };

    if (response.checkout) {
      // Paid org: the backend doesn't create the owner membership until the Stripe
      // webhook confirms payment, so a metadata write here would be rejected by
      // Firestore rules (no membership yet). Stash it — PaymentSuccess applies it
      // once activation is confirmed.
      sessionStorage.setItem(PENDING_METADATA_STORAGE_KEY, JSON.stringify(metadata));
    } else {
      // Free plan (or an idempotent retry that resolved without a new Checkout) —
      // the org and its owner membership already exist, so this write is safe.
      await patchOrganizationMetadata(response.organization.id, metadata);
      await fetchOrgs(user.uid, user.email);
    }

    return response;
  };

  const joinOrg = async (inviteCode: string, nameOverride?: string): Promise<Organization> => {
    if (!user) throw new Error('Not authenticated');
    const org = await getOrgByInviteCode(inviteCode);
    if (!org) throw new Error('Invalid invite code');
    const name = nameOverride ?? user.displayName ?? '';
    await joinOrganization(org.id, user.uid, name, user.email);
    // Membership is created with status:'pending' — add to pending, not active.
    // Adding to active would incorrectly route the user into the workspace.
    setPendingOrgs((prev) => [...prev, org]);
    return org;
  };

  const removeOrg = async (orgId: string): Promise<void> => {
    await deleteOrganization(orgId);
    setOrgs((prev) => prev.filter((o) => o.id !== orgId));
    setPendingPaymentOrgs((prev) => prev.filter((o) => o.id !== orgId));
  };

  const saveOrgSettings = async (
    orgId: string,
    settings: { allowedMemberTypes?: MemberType[]; duesRates?: DuesRates; tagline?: string; logoUrl?: string },
  ): Promise<void> => {
    await updateOrgSettings(orgId, settings);
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, ...settings } : o))
    );
  };

  const refreshOrgs = (): Promise<void> => (user ? fetchOrgs(user.uid, user.email) : Promise.resolve());

  return { orgs, pendingOrgs, pendingPaymentOrgs, addOrg, joinOrg, removeOrg, saveOrgSettings, loading, refreshOrgs };
}
