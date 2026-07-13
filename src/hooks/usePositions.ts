/**
 * Positions hook. Fetch + local-mutation pattern, matching useLedger.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  listPositions, createPosition as svcCreate,
  updatePosition as svcUpdate, deletePosition as svcDelete,
} from '@/services/positions';
import type { Position } from '@/types';

export function usePositions(orgId: string | null) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!orgId) {
      setPositions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listPositions(orgId).then((list) => {
      setPositions(list);
      setLoading(false);
    });
  }, [orgId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const createPosition = useCallback(
    async (data: Omit<Position, 'id' | 'orgId' | 'issuedAt'>) => {
      if (!orgId) return;
      await svcCreate(orgId, data);
      refresh();
    },
    [orgId, refresh]
  );

  const updatePosition = useCallback(
    async (positionId: string, data: Partial<Pick<Position, 'units' | 'contributionNote' | 'status'>>) => {
      if (!orgId) return;
      await svcUpdate(orgId, positionId, data);
      refresh();
    },
    [orgId, refresh]
  );

  const deletePosition = useCallback(
    async (positionId: string) => {
      if (!orgId) return;
      await svcDelete(orgId, positionId);
      refresh();
    },
    [orgId, refresh]
  );

  return { positions, loading, createPosition, updatePosition, deletePosition, refresh };
}
