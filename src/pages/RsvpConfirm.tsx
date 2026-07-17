import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { Brand } from '@/components/Brand';
import type { RsvpStatus } from '@/types';

interface RsvpResult {
  success: boolean;
  status: RsvpStatus;
  memberName: string;
  eventTitle: string;
  eventStartDate: string;
  orgSlug: string;
}

const STATUS_META: Record<RsvpStatus, { label: string; color: string }> = {
  attending: { label: 'Attending',  color: 'text-emerald-700' },
  maybe:     { label: 'Maybe',      color: 'text-amber-600'   },
  declining: { label: 'Declining',  color: 'text-stone-500'   },
};

export function RsvpConfirm() {
  const { orgId, eventId } = useParams<{ orgId: string; eventId: string }>();
  const [searchParams]     = useSearchParams();

  const memberId = searchParams.get('m') ?? '';
  const token    = searchParams.get('t') ?? '';
  const status   = (searchParams.get('s') ?? '') as RsvpStatus;

  const [state,  setState]  = useState<'loading' | 'success' | 'error'>('loading');
  const [result, setResult] = useState<RsvpResult | null>(null);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!orgId || !eventId || !memberId || !token) {
      setError('This RSVP link is incomplete or invalid.');
      setState('error');
      return;
    }
    if (!['attending', 'maybe', 'declining'].includes(status)) {
      setError('Invalid RSVP status in this link.');
      setState('error');
      return;
    }
    if (!app) {
      setError('App is not configured.');
      setState('error');
      return;
    }

    httpsCallable<unknown, RsvpResult>(getFunctions(app), 'handleEmailRsvp')({
      orgId, eventId, memberId, token, status,
    })
      .then((res) => { setResult(res.data); setState('success'); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not record your RSVP. The link may have expired.');
        setState('error');
      });
  }, []);

  const meta = result ? STATUS_META[result.status] : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[var(--bone)]">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Brand />
        </div>

        <div className="bg-white border border-stone-200 p-8">

          {state === 'loading' && (
            <p className="text-center text-stone-500 font-editorial italic py-4">
              Recording your RSVP…
            </p>
          )}

          {state === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-xl text-red-500">✕</div>
              <h2 className="font-display text-2xl mb-2">RSVP failed</h2>
              <p className="text-stone-500 text-sm">{error}</p>
              <a href="/" className="block mt-6 text-sm text-stone-500 hover:text-stone-900 underline">
                Go to Scribb
              </a>
            </div>
          )}

          {state === 'success' && result && meta && (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-xl text-emerald-600">✓</div>
              <h2 className="font-display text-2xl mb-2">RSVP recorded</h2>
              <p className="text-stone-600 text-sm mb-1">
                You're marked as{' '}
                <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
              </p>
              <p className="text-stone-800 font-medium text-sm mb-6">
                {result.eventTitle}
              </p>

              {/* Change response */}
              <div className="border-t border-stone-100 pt-5">
                <p className="text-xs text-stone-400 mb-3">Change your response:</p>
                <div className="flex gap-2 justify-center">
                  {(['attending', 'maybe', 'declining'] as RsvpStatus[])
                    .filter((s) => s !== result.status)
                    .map((s) => (
                      <a
                        key={s}
                        href={`/rsvp/${orgId}/${eventId}?m=${encodeURIComponent(memberId)}&t=${token}&s=${s}`}
                        className="px-3 py-1.5 text-xs border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900 rounded-md transition-colors"
                      >
                        {STATUS_META[s].label}
                      </a>
                    ))}
                </div>
              </div>

              <a
                href={result.orgSlug ? `/${result.orgSlug}/calendar?openEvent=${eventId}` : '/'}
                className="block mt-5 text-sm text-stone-500 hover:text-stone-900 underline"
              >
                View event in Scribb →
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
