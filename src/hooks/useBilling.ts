import { useCallback, useEffect, useState } from 'react';
import { getOrganizationBilling, type OrganizationBillingResponse } from '@/services/billing';
import { describeApiError } from '@/lib/scribbApi';

export function useBilling(orgId: string | null) {
  const [billing, setBilling] = useState<OrganizationBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    getOrganizationBilling(orgId)
      .then(setBilling)
      .catch((e) => setError(describeApiError(e)))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { billing, loading, error, refetch };
}
