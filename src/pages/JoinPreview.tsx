import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Mail } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from '@/lib/firebase';
import type { AuthUser } from '@/hooks/useAuth';
import type { Organization } from '@/types';

type View = 'loading' | 'preview' | 'signin' | 'joining' | 'collect-name' | 'pending-submitted' | 'error';
type OtpStep = 'email' | 'code';

interface OrgPreview {
  orgId: string;
  orgName: string;
  orgType: string;
  orgTagline: string;
  orgLogoUrl: string;
  inviteCode: string;
  memberCount: number;
  inviteeName: string | null;
  inviteeEmail: string | null;
}

interface RedeemResult {
  customToken: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
}

interface Props {
  user: AuthUser | null;
  orgs: Organization[];
  onRequestOtp: (email: string) => Promise<void>;
  onVerifyOtp: (email: string, code: string) => Promise<void>;
  onSignInWithToken: (customToken: string) => Promise<void>;
  onJoinWithCode: (code: string, name?: string) => Promise<Organization>;
}

export function JoinPreview({ user, orgs, onRequestOtp, onVerifyOtp, onSignInWithToken, onJoinWithCode }: Props) {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('t');

  const [view, setView]               = useState<View>('loading');
  const [orgPreview, setOrgPreview]   = useState<OrgPreview | null>(null);
  const [pendingCode, setPendingCode] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [email, setEmail]             = useState('');
  const [digits, setDigits]           = useState(['', '', '', '', '', '']);
  const [otpStep, setOtpStep]         = useState<OtpStep>('email');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Case 1 helper: check if the user already belongs to this org (by invite code or org id).
  function findExistingMembership(orgId?: string) {
    if (!user || orgs.length === 0) return null;
    if (orgId) return orgs.find((o) => o.id === orgId) ?? null;
    const upper = code?.toUpperCase() ?? '';
    return orgs.find((o) => (o.inviteCode ?? '').toUpperCase() === upper) ?? null;
  }

  // When user is authenticated: handle pending join items OR Case 1 redirect.
  useEffect(() => {
    if (!user) return;

    // Pending items set just before sign-in (OTP or token flow)
    const pendingSlug = sessionStorage.getItem('pendingOrgSlug');
    if (pendingSlug) {
      sessionStorage.removeItem('pendingOrgSlug');
      navigate(`/${pendingSlug}`, { replace: true });
      return;
    }

    const storedCode = sessionStorage.getItem('pendingJoinCode');
    if (storedCode) {
      sessionStorage.removeItem('pendingJoinCode');
      if (!user.displayName) {
        // New user — collect name before creating the membership
        setPendingCode(storedCode);
        setView('collect-name');
        return;
      }
      setView('joining');
      onJoinWithCode(storedCode)
        .then(() => setView('pending-submitted'))
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Could not join workspace. Try again.');
          setView('preview');
        });
      return;
    }

    // Case 1: orgs already loaded — if they're already a member, redirect immediately.
    const existing = findExistingMembership();
    if (existing) {
      navigate(`/${existing.slug ?? existing.id}`, { replace: true });
    }
  }, [user?.uid]);

  // Fetch org preview info from Cloud Function (works for unauthenticated users).
  useEffect(() => {
    if (!code || !app) { setView('error'); return; }

    const fn = httpsCallable<{ code: string; token?: string }, OrgPreview>(
      getFunctions(app), 'getOrgPreviewByCode'
    );
    fn({ code: code.toUpperCase(), token: token ?? undefined })
      .then((res) => {
        // Case 1 (slow path): orgs may now be loaded — check again with the orgId we just got.
        if (user) {
          const existing = findExistingMembership(res.data.orgId);
          if (existing) {
            navigate(`/${existing.slug ?? existing.id}`, { replace: true });
            return;
          }
        }
        setOrgPreview(res.data);
        setView((prev) => prev === 'loading' ? 'preview' : prev);
      })
      .catch(() => setView('error'));
  }, [code]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleJoinAuthenticated() {
    if (!orgPreview) return;
    setLoading(true);
    setError('');
    try {
      await onJoinWithCode(orgPreview.inviteCode);
      setView('pending-submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Try again.');
      setLoading(false);
    }
  }

  async function handleSubmitName(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserName.trim() || !pendingCode) return;
    setLoading(true);
    setError('');
    try {
      const name = newUserName.trim();
      // Update Firebase Auth profile and Firestore user doc so the name persists
      if (auth?.currentUser) await updateProfile(auth.currentUser, { displayName: name });
      if (db && user) await setDoc(doc(db, 'users', user.uid), { name }, { merge: true });
      await onJoinWithCode(pendingCode, name);
      setView('pending-submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Try again.');
      setLoading(false);
    }
  }

  async function handleAcceptInvite() {
    if (!token || !orgPreview) return;
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable<{ token: string; name: string }, RedeemResult>(
        getFunctions(app!), 'redeemInvite'
      );
      const name = user?.displayName?.trim() ?? '';
      const result = await fn({ token, name });
      // Save destination before sign-in so the re-mounted component can navigate.
      sessionStorage.setItem('pendingOrgSlug', result.data.orgSlug);
      await onSignInWithToken(result.data.customToken);
      // Component unmounts here as App transitions to authenticated routes.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invitation. Try again.');
      sessionStorage.removeItem('pendingOrgSlug');
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onRequestOtp(email.trim());
      setOtpStep('code');
      setTimeout(() => boxRefs.current[0]?.focus(), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code. Try again.');
    }
    setLoading(false);
  }

  async function handleOtpVerify(otp: string) {
    setLoading(true);
    setError('');
    try {
      if (!code) throw new Error('Invalid page');
      // Save invite code so the re-mounted component can join after sign-in.
      sessionStorage.setItem('pendingJoinCode', code.toUpperCase());
      await onVerifyOtp(email.trim(), otp);
      // Component unmounts here as App transitions to authenticated routes.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect code. Try again.');
      setDigits(['', '', '', '', '', '']);
      sessionStorage.removeItem('pendingJoinCode');
      setTimeout(() => boxRefs.current[0]?.focus(), 60);
      setLoading(false);
    }
  }

  function onDigitChange(i: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < 5) boxRefs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) void handleOtpVerify(next.join(''));
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      boxRefs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      boxRefs.current[5]?.focus();
      void handleOtpVerify(pasted);
    }
  }

  function resetSignin() {
    setOtpStep('email');
    setDigits(['', '', '', '', '', '']);
    setError('');
  }

  // ── Loading / joining states ────────────────────────────────────────────────

  if (view === 'loading' || view === 'joining') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bone)]">
        <span className="text-stone-500 font-editorial italic text-lg">
          {view === 'joining' ? 'Joining workspace…' : 'Loading…'}
        </span>
      </div>
    );
  }

  // ── Error / not-found state ─────────────────────────────────────────────────

  if (view === 'error' || !orgPreview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[var(--bone)]">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Brand />
          </div>
          <div className="bg-white border border-stone-200 p-8 text-center">
            <h2 className="font-display text-2xl mb-2">Invite not found</h2>
            <p className="text-stone-500 text-sm mb-6">
              This invite link is invalid or has expired. Ask your admin to send a new one.
            </p>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-stone-500 hover:text-stone-900 underline"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Org initials ────────────────────────────────────────────────────────────

  const initials = orgPreview.orgName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'ORG';

  const typePill = orgPreview.orgType === 'membership' ? 'Membership org' : 'Project / Nonprofit';

  // ── Shared back-button logic ────────────────────────────────────────────────

  function backToPreview() {
    resetSignin();
    setView('preview');
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[var(--bone)]">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          {view === 'pending-submitted' ? null : view === 'preview' ? (
            <button
              onClick={() => navigate('/')}
              className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              onClick={backToPreview}
              className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        <div className="bg-white border border-stone-200 p-8">

          {/* ── Preview ── */}
          {view === 'preview' && (
            <>
              {/* Org logo */}
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                {orgPreview.orgLogoUrl ? (
                  <img src={orgPreview.orgLogoUrl} alt={orgPreview.orgName} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-16 h-16 bg-stone-900 text-stone-50 flex items-center justify-center text-xl font-bold">
                    {initials}
                  </div>
                )}
              </div>

              <h2 className="font-display text-2xl text-center mb-1">{orgPreview.orgName}</h2>
              <p className="text-xs text-center text-stone-400 uppercase tracking-widest mb-1">{typePill}</p>
              {orgPreview.orgTagline && (
                <p className="text-sm text-center text-stone-500 mb-2 px-2">{orgPreview.orgTagline}</p>
              )}
              <p className="text-sm text-center text-stone-400 mb-4">
                {orgPreview.memberCount} {orgPreview.memberCount === 1 ? 'member' : 'members'}
              </p>

              {/* Personalisation for token invites */}
              {token && (orgPreview.inviteeName || orgPreview.inviteeEmail) && (
                <div className="bg-stone-50 border border-stone-200 px-4 py-3 mb-6 text-center">
                  <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Invitation for</p>
                  {orgPreview.inviteeName && (
                    <p className="text-sm font-medium text-stone-800">{orgPreview.inviteeName}</p>
                  )}
                  {orgPreview.inviteeEmail && (
                    <p className="text-xs text-stone-500">{orgPreview.inviteeEmail}</p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 text-center mb-4" role="alert">{error}</p>
              )}

              {user ? (
                /* Authenticated — token invite gets active membership, shared link gets pending */
                <button
                  onClick={token ? handleAcceptInvite : handleJoinAuthenticated}
                  disabled={loading}
                  className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading ? 'Joining…' : token ? 'Accept Invitation' : `Join ${orgPreview.orgName}`}
                </button>
              ) : (
                /* Unauthenticated — invite token or request-to-join */
                <div className="space-y-3">
                  <button
                    onClick={() => { setError(''); token ? void handleAcceptInvite() : setView('signin'); }}
                    disabled={loading}
                    className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
                  >
                    {loading ? 'Joining…' : token ? 'Accept Invitation' : 'Request to Join'}
                  </button>
                  <button
                    onClick={() => { setError(''); resetSignin(); setView('signin'); }}
                    className="w-full text-sm text-stone-500 hover:text-stone-900 py-1.5"
                  >
                    Already a member? Sign in →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Sign in (OTP) ── */}
          {view === 'signin' && (
            <>
              <h2 className="font-display text-2xl mb-1">
                {otpStep === 'email' ? 'Sign in to continue' : 'Check your email'}
              </h2>
              <p className="text-stone-500 text-sm mb-6">
                {otpStep === 'email'
                  ? `Enter your email to join ${orgPreview.orgName}.`
                  : <>We sent a 6-digit code to <strong>{email}</strong>. Enter it below.</>
                }
              </p>

              {error && (
                <p className="text-sm text-red-600 mb-4" role="alert">{error}</p>
              )}

              {otpStep === 'email' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-600 block mb-1.5">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                        className="w-full pl-10 pr-3 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
                  >
                    {loading ? 'Sending…' : 'Send 6-digit code'}
                  </button>
                </form>
              ) : (
                <>
                  {loading && digits.every((d) => d === '') ? (
                    <p className="text-center text-sm text-stone-500 py-6">Sending code…</p>
                  ) : (
                    <div className="flex gap-2 justify-between mb-6">
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { boxRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={d}
                          onChange={(e) => onDigitChange(i, e.target.value)}
                          onKeyDown={(e) => onKeyDown(i, e)}
                          onPaste={onPaste}
                          disabled={loading}
                          aria-label={`Digit ${i + 1}`}
                          className="w-11 h-14 text-center text-2xl font-bold border-2 border-stone-300 focus:border-stone-900 focus:outline-none disabled:opacity-50 rounded-sm"
                        />
                      ))}
                    </div>
                  )}
                  {loading && digits.some((d) => d !== '') && (
                    <p className="text-center text-sm text-stone-500 mb-4">Verifying…</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSendOtp({ preventDefault: () => {} } as React.FormEvent)}
                    disabled={loading}
                    className="w-full py-2 text-sm text-stone-500 hover:text-stone-900 underline disabled:opacity-40"
                  >
                    Didn't receive it? Resend code
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Pending submitted (shared-link join confirmed) ── */}
          {view === 'pending-submitted' && (
            <>
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl text-center mb-2">Request sent</h2>
              <p className="text-stone-500 text-sm text-center mb-6">
                Your request to join <strong>{orgPreview?.orgName}</strong> is pending admin approval.
                You'll receive an email once you're approved.
              </p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800"
              >
                Done
              </button>
            </>
          )}

          {/* ── Collect name (new user, shared-link path) ── */}
          {view === 'collect-name' && (
            <>
              <h2 className="font-display text-2xl mb-1">One more thing</h2>
              <p className="text-stone-500 text-sm mb-6">
                Tell us your name so the org admins know who you are.
              </p>

              {error && (
                <p className="text-sm text-red-600 mb-4" role="alert">{error}</p>
              )}

              <form onSubmit={handleSubmitName} className="space-y-4">
                <div>
                  <label className="text-xs text-stone-600 block mb-1.5">Your full name</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Full name"
                    autoFocus
                    required
                    className="w-full px-3 py-2.5 border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newUserName.trim()}
                  className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading ? 'Submitting…' : 'Submit request'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
