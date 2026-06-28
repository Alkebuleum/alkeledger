import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Brand } from '@/components/Brand';

function getPendingContext(): string | null {
  try {
    const path = sessionStorage.getItem('loginRedirect') ?? '';
    if (/\/votes(\?|$)/.test(path))         return 'Sign in to cast your vote';
    if (/\/events(\?|$)/.test(path))         return 'Sign in to confirm your RSVP';
    if (/\/announcements(\?|$)/.test(path))  return 'Sign in to view the announcement';
    if (path && path !== '/')                return 'Sign in to continue';
  } catch { /* storage unavailable */ }
  return null;
}

interface Props {
  onBack: () => void;
  onRequestOtp: (email: string) => Promise<void>;
  onVerifyOtp: (email: string, code: string) => Promise<void>;
}

export function SignIn({ onBack, onRequestOtp, onVerifyOtp }: Props) {
  const [step, setStep]       = useState<'email' | 'code'>('email');
  const [email, setEmail]     = useState('');
  const [digits, setDigits]   = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [context, setContext] = useState<string | null>(null);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { setContext(getPendingContext()); }, []);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[#FAF8F4]">
      <div className="w-full max-w-sm">

        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <button
            onClick={step === 'code'
              ? () => { setStep('email'); setDigits(['','','','','','']); setError(''); }
              : onBack}
            className="text-sm text-stone-400 hover:text-stone-700 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {step === 'code' ? 'Change email' : 'Back'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">

          {step === 'code' ? (
            <>
              <h2 className="font-display text-2xl font-semibold text-stone-900 mb-1">Check your email</h2>
              <p className="text-stone-500 text-sm mb-8">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-stone-700">{email}</span>
              </p>

              {error && (
                <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              {loading && digits.every((d) => d === '') ? (
                <p className="text-center text-sm text-stone-400 py-6">Sending code…</p>
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
                      className="w-11 h-14 text-center text-2xl font-bold border-2 border-stone-200 rounded-xl bg-stone-50 focus:bg-white focus:border-[#0E1015] focus:outline-none disabled:opacity-50 transition-colors"
                    />
                  ))}
                </div>
              )}

              {loading && digits.some((d) => d !== '') && (
                <p className="text-center text-sm text-stone-400 mb-4">Verifying…</p>
              )}

              <button
                type="button"
                onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)}
                disabled={loading}
                className="w-full mt-1 py-2 text-sm text-stone-400 hover:text-stone-700 disabled:opacity-40 transition-colors"
              >
                Didn't receive it? Resend code
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold text-stone-900 mb-1">
                {context ?? 'Sign in'}
              </h2>
              <p className="text-stone-500 text-sm mb-7">
                {context
                  ? "Enter your email to verify it's you — we'll send a 6-digit code."
                  : "We'll send a 6-digit code to your email — no password needed."}
              </p>

              <form onSubmit={handleSendCode} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 bg-[#0E1015] text-[#FAF8F4] text-sm font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending…' : 'Send 6-digit code'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-stone-400">
                New to AlkeLedger?{' '}
                <span className="text-stone-600">Sign in and you'll be guided through setup.</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
