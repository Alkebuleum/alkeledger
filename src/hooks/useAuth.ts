import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { USE_MOCK_DATA, app, auth, db } from '@/lib/firebase';

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

  async function signOut(): Promise<void> {
    if (auth) await fbSignOut(auth);
    setUser(null);
  }

  return { user, loading, requestOtp, verifyOtp, signOut };
}
