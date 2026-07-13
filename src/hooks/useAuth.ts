import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  type AuthProvider,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { USE_MOCK_DATA, app, auth, db } from '@/lib/firebase';

function friendlySsoError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for sign-in yet.';
      case 'auth/cancelled-popup-request':
      case 'auth/popup-closed-by-user':
      case 'auth/user-cancelled':
        return '';
      default:
        return 'Sign-in failed. Please try again.';
    }
  }
  return err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
}

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
}

const MOCK_USER: AuthUser = {
  uid: 'mock_user_eleanor',
  displayName: 'Eleanor Vance',
  email: 'e.vance@alkeledger.app',
};

async function ensureUserDoc(user: User): Promise<AuthUser> {
  if (!db) throw new Error('Firestore not initialized');
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const displayName =
    (snap.data()?.name as string | undefined) ??
    user.displayName ??
    (user.email?.split('@')[0] ?? 'User');
  if (!snap.exists()) {
    await setDoc(ref, {
      name: displayName,
      email: user.email ?? '',
      createdAt: serverTimestamp(),
    });
  }
  return { uid: user.uid, displayName, email: user.email ?? '' };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(USE_MOCK_DATA ? MOCK_USER : null);
  const [loading, setLoading] = useState(!USE_MOCK_DATA);
  const [ssoError, setSsoError] = useState('');

  useEffect(() => {
    if (USE_MOCK_DATA || !auth) return;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const authUser = await ensureUserDoc(fbUser);
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (USE_MOCK_DATA || !auth) return;
    getRedirectResult(auth).catch((err) => setSsoError(friendlySsoError(err)));
  }, []);

  function isStandalonePwa(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  // Popups resolve via postMessage and work reliably almost everywhere. Redirect
  // requires persisting state across a full navigation to `authDomain` and back,
  // which browsers increasingly break with third-party storage partitioning
  // (silent failure — getRedirectResult just never resolves with a user). We only
  // pay that cost where popups themselves are unreliable: installed/standalone PWAs.
  async function signInWithSso(provider: AuthProvider): Promise<void> {
    if (!auth) throw new Error('Firebase not initialized');
    setSsoError('');
    if (isStandalonePwa()) {
      await signInWithRedirect(auth, provider);
      return;
    }
    try {
      const credential = await signInWithPopup(auth, provider);
      const authUser = await ensureUserDoc(credential.user);
      setUser(authUser);
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      const message = friendlySsoError(err);
      if (message) throw new Error(message);
    }
  }

  async function signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithSso(provider);
  }

  async function requestOtp(email: string): Promise<void> {
    if (!app) throw new Error('Firebase not initialized');
    const fn = httpsCallable<{ email: string }, { success: true }>(
      getFunctions(app),
      'requestOtp'
    );
    const result = await fn({ email: email.trim().toLowerCase() });
    if (!result.data.success) throw new Error('Failed to send code');
  }

  async function verifyOtp(email: string, code: string): Promise<void> {
    if (!app || !auth) throw new Error('Firebase not initialized');
    const fn = httpsCallable<{ email: string; code: string }, { customToken: string }>(
      getFunctions(app),
      'verifyOtp'
    );
    const result = await fn({ email: email.trim().toLowerCase(), code });
    const credential = await signInWithCustomToken(auth, result.data.customToken);
    const authUser = await ensureUserDoc(credential.user);
    setUser(authUser);
  }

  async function signInWithToken(customToken: string): Promise<void> {
    if (!app || !auth) throw new Error('Firebase not initialized');
    const credential = await signInWithCustomToken(auth, customToken);
    const authUser = await ensureUserDoc(credential.user);
    setUser(authUser);
  }

  async function signOut(): Promise<void> {
    if (auth) await fbSignOut(auth);
    setUser(null);
  }

  return {
    user,
    loading,
    requestOtp,
    verifyOtp,
    signInWithToken,
    signInWithGoogle,
    ssoError,
    signOut,
  };
}
