import { useEffect, useState } from 'react';
import { getMember } from '@/services/members';
import { USE_MOCK_DATA } from '@/lib/firebase';
import type { Role } from '@/types';

export function useRole(orgId: string | null, userId?: string): Role {
  const [role, setRole] = useState<Role>(USE_MOCK_DATA ? 'owner' : 'viewer');

  useEffect(() => {
    if (USE_MOCK_DATA) { setRole('owner'); return; }
    if (!orgId || !userId) { setRole('viewer'); return; }

    getMember(orgId, userId).then((m) => {
      setRole((m?.role as Role) ?? 'viewer');
    });
  }, [orgId, userId]);

  return role;
}

export const can = {
  approve:   (role: Role) => ['owner', 'admin', 'treasurer', 'auditor'].includes(role),
  manage:    (role: Role) => ['owner', 'admin', 'treasurer', 'finance'].includes(role),
  invite:    (role: Role) => ['owner', 'admin'].includes(role),
  configure: (role: Role) => role === 'owner',
  announce:  (role: Role) => ['owner', 'admin'].includes(role),
};
