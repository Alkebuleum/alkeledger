import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import { LedgerMark } from '@/components/LedgerMark';

function getPendingContext(): string | null {
  try {
    const path = sessionStorage.getItem('loginRedirect') ?? '';
    if (/\/proposals(\?|$)/.test(path))     return 'Sign in to cast your vote';
    if (/\/calendar(\?|$)/.test(path))       return 'Sign in to confirm your RSVP';
    if (path && path !== '/')                return 'Sign in to continue';
  } catch { /* storage unavailable */ }
  return null;
}

interface Props {
  onBack: () => void;
  onRequestOtp: (email: string) => Promise<void>;
  onVerifyOtp: (email: string, code: string) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  ssoError?: string;
}

const MINI_LEDGER_ROWS = [
  { text: 'Board resolution 2026-14', hash: '8f3a…c21e', sealed: false },
  { text: 'Credential issued · J. Okafor', hash: '5d17…09bb', sealed: false },
  { text: 'Entry sealed to chain', hash: '', sealed: true },
];

export function SignIn({ onBack, onRequestOtp, onVerifyOtp, onSignInWithGoogle, ssoError }: Props) {
  const [step, setStep]       = useState<'email' | 'code'>('email');
  const [email, setEmail]     = useState('');
  const [digits, setDigits]   = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [context, setContext] = useState<string | null>(null);
  const [visibleRows, setVisibleRows] = useState(0);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { setContext(getPendingContext()); }, []);
  useEffect(() => { if (ssoError) setError(ssoError); }, [ssoError]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisibleRows(MINI_LEDGER_ROWS.length);
      return;
    }
    const timers = MINI_LEDGER_ROWS.map((_, i) =>
      setTimeout(() => setVisibleRows((v) => Math.max(v, i + 1)), 600 + i * 700)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onRequestOtp(email.trim());
      setStep('code');
      setTimeout(() => boxRefs.current[0]?.focus(), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code. Try again.');
    }
    setLoading(false);
  }

  async function handleVerify(code: string) {
    setLoading(true);
    setError('');
    try {
      await onVerifyOtp(email.trim(), code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect code. Please try again.');
      setDigits(['', '', '', '', '', '']);
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
    if (next.every((d) => d !== '')) void handleVerify(next.join(''));
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
      void handleVerify(pasted);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setSsoLoading(true);
    try {
      await onSignInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in. Try again.');
    } finally {
      setSsoLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid min-[880px]:grid-cols-[minmax(380px,44%)_1fr] bg-[#F6F4ED] text-[#171B21] font-sans">

      {/* LEFT / INK */}
      <aside className="hidden min-[880px]:flex flex-col justify-between bg-[#171B21] text-[#EFE9DC] px-11 pt-11 pb-8">
        <button onClick={onBack} className="flex items-center gap-[11px] font-serif text-[21px] font-semibold text-left">
          <LedgerMark vellum />
          Scribb
        </button>

        <div className="max-w-[400px]">
          <h1 className="font-serif font-medium text-[31px] leading-[1.2] tracking-[-0.01em]">
            Your organization's history, <em className="italic text-[#B3453C] font-medium">sealed</em> and ready to prove itself.
          </h1>

          <div className="mt-[34px] bg-[#232935] border border-[rgba(239,233,220,0.1)] rounded-lg overflow-hidden text-[12.5px]">
            <div className="px-3.5 py-2.5 border-b border-[rgba(239,233,220,0.1)] font-plex text-[10.5px] tracking-[0.08em] text-[#7C828D]">
              acme-holdings / record · append-only
            </div>
            {MINI_LEDGER_ROWS.map((row, i) => (
              <div
                key={row.text}
                className={`flex items-center gap-[11px] px-3.5 py-[11px] border-b border-[rgba(239,233,220,0.07)] last:border-none transition-all duration-500 ${
                  i < visibleRows ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[5px]'
                }`}
              >
                <span className={`w-4 h-1 rounded-sm flex-shrink-0 ${row.sealed ? 'bg-[#B3453C]' : 'bg-[#EFE9DC]'}`} />
                <span className="text-[#C9CDD5]">{row.text}</span>
                {row.sealed ? (
                  <span className="ml-auto font-plex text-[9.5px] tracking-[0.1em] px-[7px] py-[3px] rounded-[3px] bg-[#8A1E2D] text-[#EFE9DC]">■ SEALED</span>
                ) : (
                  <span className="ml-auto font-plex text-[10px] text-[#5F6570]">{row.hash}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="font-plex text-[10.5px] text-[#5F6570] tracking-[0.05em]">
          app.scribb.net · record integrity: <span className="text-[#7FA99A]">chain intact ✓</span>
        </div>
      </aside>

      {/* RIGHT / FORM */}
      <main className="flex flex-col items-center justify-center px-6 py-12">
        <button
          onClick={onBack}
          className="min-[880px]:hidden flex items-center gap-2.5 font-serif text-xl font-semibold mb-9"
        >
          <LedgerMark />
          Scribb
        </button>

        <div className="w-full max-w-[392px]">
          {step === 'code' ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif font-semibold text-[27px] tracking-[-0.01em]">Check your email</h2>
                <button
                  onClick={() => { setStep('email'); setDigits(['','','','','','']); setError(''); }}
                  className="text-xs text-[#5A5F67] hover:text-[#171B21] border-b border-transparent hover:border-current transition-colors flex-shrink-0"
                >
                  Change email
                </button>
              </div>
              <p className="text-[#5A5F67] text-sm mt-2 mb-7">
                We sent a 6-digit code to <span className="font-medium text-[#171B21]">{email}</span>
              </p>

              {error && (
                <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-[5px] text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              {loading && digits.every((d) => d === '') ? (
                <p className="text-center text-sm text-[#8A8F99] py-6">Sending code…</p>
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
                      className="w-11 h-14 text-center text-xl font-semibold font-mono text-[#171B21] bg-[#FDFCF8] border border-[#DCD6C6] rounded-[6px] focus:outline-none focus:border-[#171B21] focus:ring-[3px] focus:ring-[rgba(23,27,33,0.08)] disabled:opacity-50 transition-colors"
                    />
                  ))}
                </div>
              )}

              {loading && digits.some((d) => d !== '') && (
                <p className="text-center text-sm text-[#8A8F99] mb-4">Verifying…</p>
              )}

              <button
                type="button"
                onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)}
                disabled={loading}
                className="w-full mt-1 py-2 text-sm text-[#8A8F99] hover:text-[#171B21] disabled:opacity-40 transition-colors"
              >
                Didn't receive it? Resend code
              </button>
            </>
          ) : (
            <>
              <h2 className="font-serif font-semibold text-[27px] tracking-[-0.01em]">
                {context ?? 'Sign in'}
              </h2>
              <p className="text-[#5A5F67] text-sm mt-2 mb-7">
                {context
                  ? "Enter your email to verify it's you — we'll send a 6-digit code."
                  : "We'll send a 6-digit code to your email — no password needed."}
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={ssoLoading || loading}
                className="w-full flex items-center justify-center gap-2.5 font-medium text-sm text-[#171B21] bg-[#FDFCF8] border border-[#DCD6C6] rounded-[5px] py-[11px] mb-6 hover:bg-[#F6F4ED] disabled:opacity-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.8 2.9c2.3-2.1 3.6-5.1 3.6-8.6z"/>
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-3.9 3C3.3 21.3 7.3 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-4-3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l3.9-3z"/>
                  <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.6 1.4l3.4-3.3C17 .9 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3c1-2.9 3.6-4.9 6.7-4.9z"/>
                </svg>
                {ssoLoading ? 'Continuing…' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 mb-6 font-plex text-[10.5px] tracking-[0.14em] text-[#8A8F99]">
                <span className="flex-1 h-px bg-[#DCD6C6]" />
                OR
                <span className="flex-1 h-px bg-[#DCD6C6]" />
              </div>

              <form onSubmit={handleSendCode}>
                <label htmlFor="email" className="block text-[12.5px] font-semibold mb-1.5 tracking-[0.02em]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  autoFocus
                  className="w-full font-sans text-[14.5px] text-[#171B21] bg-[#FDFCF8] border border-[#DCD6C6] rounded-[5px] px-[13px] py-[11px] mb-5 placeholder:text-[#A6AAB2] focus:outline-none focus:border-[#171B21] focus:ring-[3px] focus:ring-[rgba(23,27,33,0.08)] transition-colors"
                />

                {error && (
                  <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-[5px] text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#171B21] text-[#EFE9DC] rounded-[5px] font-medium text-[14.5px] py-[13px] hover:bg-[#232935] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending…' : 'Send 6-digit code →'}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-[#5A5F67]">
                New to Scribb? Sign in and you'll be guided through setup.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
