import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizationBilling, createCheckoutSession, PENDING_CHECKOUT_STORAGE_KEY } from '@/services/billing';
import { describeApiError } from '@/lib/scribbApi';

export function PaymentCancelled() {
  const navigate = useNavigate();
  const [orgId] = useState(() => sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY));
  const [orgName, setOrgName] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [migrationRequested, setMigrationRequested] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    getOrganizationBilling(orgId)
      .then((result) => {
        setOrgName(result.organization.name);
        if (result.billing.billingInterval === 'monthly' || result.billing.billingInterval === 'annual') {
          setBillingInterval(result.billing.billingInterval);
        }
        setMigrationRequested(result.billing.migrationRequested);
      })
      .catch(() => { /* best-effort context only */ });
  }, [orgId]);

  async function handleResume() {
    if (!orgId) return;
    setResuming(true);
    setError('');
    try {
      const session = await createCheckoutSession({ organizationId: orgId, billingInterval, migrationRequested });
      sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, orgId);
      window.location.assign(session.checkout.url);
    } catch (e) {
      setError(describeApiError(e));
      setResuming(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[var(--bone)]">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-stone-200 p-8 text-center">
          <h2 className="font-display text-2xl mb-2">Checkout was not completed</h2>
          <p className="text-stone-500 text-sm mb-1">
            {orgName ? `"${orgName}" has` : 'Your organization has'} not been activated on a paid plan.
          </p>
          <p className="text-stone-500 text-sm mb-6">
            You can return and complete payment, or start over with the Free plan.
          </p>

          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 text-left">{error}</div>
          )}

          {orgId && (
            <button
              onClick={handleResume}
              disabled={resuming}
              className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50 mb-3"
            >
              {resuming ? 'Preparing secure checkout…' : 'Resume paid setup'}
            </button>
          )}

          <button
            onClick={() => navigate('/setup')}
            className="w-full py-2.5 border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Return to plan selection
          </button>
        </div>
      </div>
    </div>
  );
}
