import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizationBilling, PENDING_CHECKOUT_STORAGE_KEY, PENDING_METADATA_STORAGE_KEY } from '@/services/billing';
import { patchOrganizationMetadata } from '@/services/organizations';
import { describeApiError } from '@/lib/scribbApi';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

interface Props {
  // Lets the parent's org list refresh once the backend confirms activation.
  // Must be awaited before navigating in — otherwise OrgShell resolves the
  // :slug route against the parent's stale (pre-refresh) org list and falls
  // back to the user's first workspace instead of the one just activated.
  onActivated: () => Promise<void>;
}

export function PaymentSuccess({ onActivated }: Props) {
  const navigate = useNavigate();
  const [state, setState] = useState<'polling' | 'timedOut' | 'error' | 'missingOrg'>('polling');
  const [error, setError] = useState('');
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const orgId = sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!orgId) {
      setState('missingOrg');
      return;
    }

    const startedAt = Date.now();

    async function poll() {
      if (cancelledRef.current) return;
      try {
        const result = await getOrganizationBilling(orgId!);
        if (result.organization.organizationStatus === 'active') {
          sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);

          // The owner membership now exists (created by the webhook), so the
          // org-details/cooperative-config/migration metadata stashed at
          // onboarding time can finally be applied. Best-effort — a failure here
          // shouldn't block entry into an otherwise-active workspace.
          const rawMetadata = sessionStorage.getItem(PENDING_METADATA_STORAGE_KEY);
          if (rawMetadata) {
            sessionStorage.removeItem(PENDING_METADATA_STORAGE_KEY);
            try {
              await patchOrganizationMetadata(orgId!, JSON.parse(rawMetadata));
            } catch {
              // non-fatal — metadata is supplementary, not required for access
            }
          }

          await onActivated();
          // Route by id — always unique and matched first by resolveOrgFromSlugParam,
          // so this can't collide with another of the user's orgs' slugs.
          navigate(`/${orgId}`, { replace: true });
          return;
        }
      } catch (e) {
        if (!cancelledRef.current) {
          setError(describeApiError(e));
          setState('error');
        }
        return;
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        if (!cancelledRef.current) setState('timedOut');
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retry() {
    setState('polling');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[var(--bone)]">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-stone-200 p-8 text-center">
          {state === 'polling' && (
            <>
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-7 h-7 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl mb-2">Activating your workspace</h2>
              <p className="text-stone-500 text-sm">
                Payment received. We're activating your Scribb workspace.
              </p>
            </>
          )}

          {state === 'timedOut' && (
            <>
              <h2 className="font-display text-2xl mb-2">Still confirming</h2>
              <p className="text-stone-500 text-sm mb-6">
                Stripe is still confirming your subscription. Your workspace will become
                available as soon as confirmation is complete.
              </p>
              <button
                onClick={retry}
                className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800"
              >
                Check again
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <h2 className="font-display text-2xl mb-2">Couldn't check status</h2>
              <p className="text-red-700 text-sm mb-6">{error}</p>
              <button
                onClick={retry}
                className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800"
              >
                Try again
              </button>
            </>
          )}

          {state === 'missingOrg' && (
            <>
              <h2 className="font-display text-2xl mb-2">Nothing to activate here</h2>
              <p className="text-stone-500 text-sm mb-6">
                We couldn't find a pending checkout for this browser session.
              </p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800"
              >
                Return to Scribb
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
