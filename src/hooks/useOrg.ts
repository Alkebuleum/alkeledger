import { useEffect, useState } from 'react';
import {
  listOrganizationsForUser, createOrganization, joinOrganization,
  getOrgByInviteCode, deleteOrganization, updateOrgSettings,
} from '@/services/organizations';
import type { AuthUser } from './useAuth';
import type { Organization, MemberType, DuesRates } from '@/types';

export function useOrgs(user: AuthUser | null) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  // Track which uid's orgs are currently loaded. null = not yet loaded.
  const [loadedForUid, setLoadedForUid] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setLoadedForUid(null);
      return;
    }

    // Don't reset loadedForUid here — the derived `loading` below is already
    // true because user.uid !== loadedForUid. Avoid the extra re-render.
    listOrganizationsForUser(user.uid)
      .then((list) => {
        setOrgs(list);
        setLoadedForUid(user.uid);
      })
      .catch(() => {
        setOrgs([]);
        setLoadedForUid(user.uid);
      });
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

  const joinOrg = async (inviteCode: string): Promise<Organization> => {
    if (!user) throw new Error('Not authenticated');
    const org = await getOrgByInviteCode(inviteCode);
    if (!org) throw new Error('Invalid invite code');
    await joinOrganization(org.id, user.uid, user.displayName, user.email);
    setOrgs((prev) => [...prev, org]);
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

  return { orgs, addOrg, joinOrg, removeOrg, saveOrgSettings, loading };
}
