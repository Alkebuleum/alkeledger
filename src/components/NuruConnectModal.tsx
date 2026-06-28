import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Wallet } from 'lucide-react';
import { nuruConnect, type NuruConnection, saveConnection } from '@/lib/nuruConnect';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.alkebuleum.nuru';

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isIOS = /iPhone|iPad|iPod/i.test(ua);

interface Props {
  onConnected: (conn: NuruConnection) => void;
  onClose: () => void;
}

export function NuruConnectModal({ onConnected, onClose }: Props) {
  const injectedEth   = typeof window !== 'undefined' ? (window as any).ethereum : null;
  const isNuroBrowser = injectedEth?._isNuruWallet === true;
  const showDownload  = !isIOS && !isNuroBrowser;

  // QR / Firebase path state
  const [connectId,  setConnectId]  = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Injected browser path state
  const [injLoading, setInjLoading] = useState(false);
  const [injError,   setInjError]   = useState<string | null>(null);

  // Reset on unmount
  useEffect(() => () => { setConnectId(null); }, []);

  // ── Injected Nuru browser connect ──────────────────────────────────────────
  async function handleInjectedConnect() {
    setInjError(null); setInjLoading(true);
    try {
      const accounts: string[] = await injectedEth.request({ method: 'eth_requestAccounts' });
      const address = accounts?.[0];
      if (!address) throw new Error('No account returned');
      let conn: NuruConnection = { aaWallet: address, signer: address, ain: '', primaryHandle: '' };
      try {
        const identity = await injectedEth.request({ method: 'nuru_getIdentity' });
        conn = {
          aaWallet:      identity?.aaWallet ? String(identity.aaWallet) : address,
          signer:        address,
          ain:           identity?.ain           ? String(identity.ain).toUpperCase() : '',
          primaryHandle: identity?.primaryHandle ? String(identity.primaryHandle) : '',
        };
      } catch { /* fall through with EOA */ }
      saveConnection(conn);
      onConnected(conn);
    } catch (e: any) {
      setInjError(e?.message ?? 'Connection cancelled');
    } finally {
      setInjLoading(false);
    }
  }

  // ── Firebase QR connect ────────────────────────────────────────────────────
  async function handleQrConnect() {
    setError(null); setConnectId(null); setLoading(true);
    try {
      const conn = await nuruConnect((id) => { setConnectId(id); setLoading(false); });
      onConnected(conn);
    } catch (e: any) {
      const msg = e?.message ?? '';
      setError(
        msg.includes('rejected') ? 'Connection rejected in Nuru. Try again.'
        : msg.includes('time')   ? 'Connection timed out. Make sure Nuru is open and try again.'
        : 'Connection failed. Try again.',
      );
    } finally {
      setConnectId(null); setLoading(false);
    }
  }

  const qrValue = connectId ? `nuru://connect?c=${connectId}` : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-display text-base text-stone-900 font-semibold">Connect Nuru</div>
              <div className="text-xs text-stone-500 mt-0.5">
                {isNuroBrowser ? 'Direct browser connection' : 'Scan QR with your Nuru app'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-6 pt-2 space-y-4">
          {/* ── Nuru browser: direct inject ── */}
          {isNuroBrowser && (
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">
              <p className="text-sm text-stone-600 mb-3 leading-relaxed">
                You're inside the Nuru app — connect directly with one tap.
              </p>
              <button
                onClick={handleInjectedConnect}
                disabled={injLoading}
                className="w-full py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-md hover:bg-stone-800 disabled:opacity-50"
              >
                {injLoading ? 'Connecting…' : 'Connect Directly'}
              </button>
              {injError && (
                <p className="mt-2.5 text-xs text-red-600">{injError}</p>
              )}
            </div>
          )}

          {/* ── External browser: QR ── */}
          {!isNuroBrowser && (
            <div className="rounded-xl bg-stone-50 border border-stone-200 p-4">
              {/* Step 1 — prompt */}
              {!connectId && !loading && (
                <>
                  <p className="text-sm text-stone-600 mb-3 leading-relaxed">
                    Open <strong className="text-stone-900">Nuru</strong> on your phone and tap the scan icon to connect.
                  </p>
                  <button
                    onClick={handleQrConnect}
                    className="w-full py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-md hover:bg-stone-800"
                  >
                    Get Connection QR
                  </button>
                  {showDownload && (
                    <p className="mt-3 text-xs text-stone-500 text-center">
                      Don't have Nuru?{' '}
                      <a href={PLAY_STORE} target="_blank" rel="noopener noreferrer" className="text-stone-700 font-semibold underline">
                        Download on Android
                      </a>
                    </p>
                  )}
                  {isIOS && (
                    <p className="mt-3 text-xs text-stone-500 text-center">iOS app coming soon.</p>
                  )}
                </>
              )}

              {/* Generating spinner */}
              {loading && !connectId && (
                <div className="flex items-center justify-center gap-2.5 py-5 text-stone-500">
                  <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                  <span className="text-sm">Generating QR…</span>
                </div>
              )}

              {/* Step 2 — QR code */}
              {connectId && (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl bg-white p-3 border border-stone-200">
                    <QRCodeSVG value={qrValue} size={192} bgColor="#ffffff" fgColor="#0c0a09" level="M" />
                  </div>
                  <p className="text-xs text-stone-500 text-center leading-relaxed">
                    Scan with Nuru → tap <strong className="text-stone-800">Connect</strong> to approve.
                  </p>
                  <div className="flex items-center gap-2 text-stone-400 text-xs">
                    <div className="w-3.5 h-3.5 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
                    Waiting for Nuru…
                  </div>
                  {showDownload && (
                    <p className="text-xs text-stone-400 text-center">
                      Need Nuru?{' '}
                      <a href={PLAY_STORE} target="_blank" rel="noopener noreferrer" className="text-stone-500 font-semibold underline">
                        Download on Android
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 mb-2">{error}</p>
                  <button
                    onClick={handleQrConnect}
                    className="text-sm font-semibold text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
