// Sign-in hand-off from the Nuru app. Inside Nuru the person is already
// signed in; Nuru gives this page a one-time code — through its in-app
// browser bridge (window.ethereum, isNuru) on phones, or in the address on
// the web (#nuru_code=…). The signInWithNuru function redeems it with Nuru
// for the person's verified email and returns a token for that email's
// Scribb account. Nothing here touches a wallet: the bridge is only Nuru's
// channel into the page.

import type { FirebaseApp } from 'firebase/app';
import { signInWithCustomToken, type Auth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Signed out on purpose inside Nuru: don't sign straight back in.
const SKIP_KEY = 'scribb_no_nuru_handoff';

type NuruProvider = { isNuru?: boolean; request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

function nuruProvider(): NuruProvider | null {
  const eth = (window as unknown as { ethereum?: NuruProvider }).ethereum;
  return eth && eth.isNuru ? eth : null;
}

export function isInsideNuru(): boolean {
  return typeof window !== 'undefined' && nuruProvider() !== null;
}

/** The code in the address (web), removed from it at once. */
function takeCodeFromUrl(): string | null {
  const m = /[#&]nuru_code=([0-9a-fA-F]{32})/.exec(window.location.hash || '');
  if (!m) return null;
  const rest = window.location.hash.replace(/[#&]?nuru_code=[^&]*/, '').replace(/^#&?$/, '');
  window.history.replaceState(null, '', window.location.pathname + window.location.search + (rest && rest !== '#' ? rest : ''));
  return m[1].toLowerCase();
}

async function askNuru(): Promise<string | null> {
  const p = nuruProvider();
  if (!p) return null;
  try {
    const res = (await Promise.race([
      p.request({ method: 'nuru_appSession', params: [{ app: 'scribb' }] }),
      new Promise((resolve) => setTimeout(() => resolve(null), 15000)),
    ])) as { code?: string } | null;
    return res && typeof res.code === 'string' ? res.code : null;
  } catch {
    return null; // an older Nuru without the hand-off: normal sign-in
  }
}

function skipped(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

let attempt: Promise<boolean> | null = null;

/**
 * Once per page load: signs in with Nuru's hand-off when there is one and
 * nobody is signed in here yet. True if it signed someone in.
 */
export function tryNuruHandoff(app: FirebaseApp, auth: Auth): Promise<boolean> {
  attempt ??= (async () => {
    const fromUrl = takeCodeFromUrl();
    await auth.authStateReady();
    if (auth.currentUser) return false; // already signed in here: never switch accounts
    if (!fromUrl && (skipped() || !isInsideNuru())) return false;
    const code = fromUrl ?? (await askNuru());
    if (!code) return false;
    const fn = httpsCallable<{ code: string }, { customToken: string }>(getFunctions(app), 'signInWithNuru');
    const res = await fn({ code });
    await signInWithCustomToken(auth, res.data.customToken);
    return true;
  })().catch((e) => {
    console.warn('[nuru] hand-off failed', e);
    return false;
  });
  return attempt;
}

/** Signing out inside Nuru: stay signed out (until they sign in again here). */
export function noteSignedOut(): void {
  if (!isInsideNuru()) return;
  try {
    localStorage.setItem(SKIP_KEY, '1');
  } catch {
    /* private mode */
  }
}

/** A manual sign-in: the hand-off may run again next time. */
export function clearSignedOut(): void {
  try {
    localStorage.removeItem(SKIP_KEY);
  } catch {
    /* private mode */
  }
}
