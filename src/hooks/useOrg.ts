import { useEffect, useState } from 'react';
import { listOrganizationsForUser, createOrganization, joinOrganization } from '@/services/organizations';
import type { AuthUser } from './useAuth';
import type { Organization } from '@/types';

export function useOrgs(user: AuthUser | null) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setCurrentOrgId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    listOrganizationsForUser(user.uid).then((list) => {
      setOrgs(list);
      const defaultOrg = list.find((o) => o.type === 'project') ?? list[0];
      setCurrentOrgId(defaultOrg?.id ?? null);
      setLoading(false);
    });
  }, [user?.uid]);

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;

  const addOrg = async (org: Omit<Organization, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const created = await createOrganization(org, user.uid, user.displayName, user.email);
    setOrgs((prev) => [...prev, created]);
    setCurrentOrgId(created.id);
    return created;
  };

  const joinOrg = async (inviteCode: string) => {
    if (!user) throw new Error('Not authenticated');
    const { getOrgByInviteCode } = await import('@/services/organizations');
    const org = await getOrgByInviteCode(inviteCode);
    if (!org) throw new Error('Invalid invite code');
    await joinOrganization(org.id, user.uid, user.displayName, user.email);
    // Org will appear as pending until admin approves
    setOrgs((prev) => [...prev, org]);
    setCurrentOrgId(org.id);
    return org;
  };

  return { orgs, currentOrg, currentOrgId, setCurrentOrgId, addOrg, joinOrg, loading };
}
