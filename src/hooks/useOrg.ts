import { useCallback, useEffect, useState } from 'react';
import {
  listAllOrgsForUser, createOrganization, joinOrganization,
  getOrgByInviteCode, deleteOrganization, updateOrgSettings,
} from '@/services/organizations';
import type { AuthUser } from './useAuth';
import type { Organization, MemberType, DuesRates } from '@/types';

export function useOrgs(user: AuthUser | null) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [pendingOrgs, setPendingOrgs] = useState<Organization[]>([]);
  // Track which uid's orgs are currently loaded. null = not yet loaded.
  const [loadedForUid, setLoadedForUid] = useState<string | null>(null);

  const fetchOrgs = useCallback((uid: string) => {
    listAllOrgsForUser(uid)
      .then(({ active, pending }) => {
        setOrgs(active);
        setPendingOrgs(pending);
        setLoadedForUid(uid);
      })
      .catch(() => {
        setOrgs([]);
        setPendingOrgs([]);
        setLoadedForUid(uid);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setPendingOrgs([]);
      setLoadedForUid(null);
      return;
    }
    fetchOrgs(user.uid);
  }, [user?.uid]);

  // loading is true whenever a non-null user's orgs haven't been fetched yet.
  // This derived value has no race window: if user.uid !== loadedForUid,
  // we're still loading — even before the effect fires after a render.
  const loading = user != null && loadedForUid !== user.uid;

  const addOrg = async (org: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization> => {
    if (!user) throw new Error('Not authenticated');
    const created = await createOrganization(org, user.uid, user.displayName, user.email);
    setOrgs((prev) => [...prev, created]);
    return created;
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
  };

  const saveOrgSettings = async (
    orgId: string,
    settings: { allowedMemberTypes?: MemberType[]; duesRates?: DuesRates },
  ): Promise<void> => {
    await updateOrgSettings(orgId, settings);
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, ...settings } : o))
    );
  };

  const refreshOrgs = () => { if (user) fetchOrgs(user.uid); };

  return { orgs, pendingOrgs, addOrg, joinOrg, removeOrg, saveOrgSettings, loading, refreshOrgs };
}
