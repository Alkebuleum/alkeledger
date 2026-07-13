import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const DISMISSED_KEY = 'pwa-install-dismissed';

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(DISMISSED_KEY) === '1') return false;
  // Don't show if already running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  // Don't show on iOS Safari where the prompt API isn't supported anyway (handled separately)
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  if (isIOS && isSafari) return false;
  return true;
}

export function PWAInstallBanner() {
  const { canInstall, triggerInstall, installed } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShow());
  }, []);

  // Auto-hide once installed
  useEffect(() => {
    if (installed) setVisible(false);
  }, [installed]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  }

  async function handleInstall() {
    const ok = await triggerInstall();
    if (ok) setVisible(false);
  }

  if (!canInstall || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--ink)] text-[var(--bone)] safe-area-inset-bottom">
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        <img src="/icon.png" alt="" className="w-10 h-10 rounded-xl shrink-0 object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Add Scribe to your home screen</p>
          <p className="text-[11px] text-stone-400 mt-0.5 leading-tight">Quick access · works offline</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ledger-red)] text-white text-xs font-semibold rounded-md"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 p-1.5 text-stone-400 hover:text-stone-100 rounded"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
