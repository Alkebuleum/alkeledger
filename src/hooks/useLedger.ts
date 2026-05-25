/**
 * Ledger hook. Subscribes to live ledger updates for the current org.
 * In mock mode, falls back to a manual fetch + local mutation pattern.
 */

import { useEffect, useState, useCallback } from 'react';
import { listEntries, createEntry as svcCreate, updateEntryStatus, anchorEntry } from '@/services/ledger';
import type { LedgerEntry, LedgerStatus } from '@/types';

export function useLedger(orgId: string | null) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0); // bump to force re-fetch in mock mode

  useEffect(() => {
    if (!orgId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listEntries(orgId).then((list) => {
      setEntries(list);
      setLoading(false);
    });

    // 🔌 FIREBASE (replace the above with subscribeToEntries for real-time):
    // const unsub = subscribeToEntries(orgId, (list) => {
    //   setEntries(list);
    //   setLoading(false);
    // });
    // return () => unsub();
  }, [orgId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const createEntry = useCallback(
    async (entry: LedgerEntry) => {
      await svcCreate(entry);
      refresh();
    },
    [refresh]
  );

  const setStatus = useCallback(
    async (entryId: string, status: LedgerStatus, approver?: string) => {
      if (!orgId) return;
      await updateEntryStatus(orgId, entryId, status, approver);
      refresh();
    },
    [orgId, refresh]
  );

  const anchor = useCallback(
    async (entryId: string) => {
      if (!orgId) return;
      await anchorEntry(orgId, entryId);
      refresh();
    },
    [orgId, refresh]
  );

  return { entries, loading, createEntry, setStatus, anchor, refresh };
}
