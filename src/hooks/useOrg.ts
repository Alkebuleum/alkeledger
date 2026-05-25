import { useEffect, useState } from 'react';
import { listOrganizationsForUser, createOrganization, joinOrganization, getOrgByInviteCode, deleteOrganization, updateOrgSettings } from '@/services/organizations';
import type { MemberType, DuesRates } from '@/types';
import type { AuthUser } from './useAuth';
import type { Organization } from '@/types';

export function useOrgs(user: AuthUser | null) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listOrganizationsForUser(user.uid).then((list) => {
      setOrgs(list);
      setLoading(false);
    });
  }, [user?.uid]);

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
