import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Brand } from '@/components/Brand';

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
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-[var(--bone)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <button
            onClick={step === 'code'
              ? () => { setStep('email'); setDigits(['','','','','','']); setError(''); }
              : onBack}
            className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'code' ? 'Change email' : 'Back'}
          </button>
        </div>

        <div className="bg-white border border-stone-200 p-8">
          {step === 'code' ? (
            <>
              <h2 className="font-display text-2xl mb-1">Check your email</h2>
              <p className="text-stone-500 text-sm mb-6">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
              </p>

              {error && (
                <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>
              )}

              {loading && step === 'code' && digits.every((d) => d === '') ? (
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
                <p className="text-center text-sm text-stone-500">Verifying…</p>
              )}

              <button
                type="button"
                onClick={() => handleSendCode({ preventDefault: () => {} } as React.FormEvent)}
                disabled={loading}
                className="w-full mt-2 py-2 text-sm text-stone-500 hover:text-stone-900 underline disabled:opacity-40"
              >
                Didn't receive it? Resend code
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl mb-1">Sign in</h2>
              <p className="text-stone-500 text-sm mb-6">
                We'll send a 6-digit code to your email — no password needed.
              </p>

              <form onSubmit={handleSendCode} className="space-y-4">
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

                {error && (
                  <p className="text-sm text-red-600" role="alert">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
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
