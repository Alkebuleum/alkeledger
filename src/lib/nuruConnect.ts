/**
 * Nuru wallet connection via Firestore QR handshake.
 *
 * Same protocol as JollofSwap:
 *   1. Write a pending doc to connect_requests/{connectId}
 *   2. Show QR encoding  nuru://connect?c={connectId}
 *   3. Nuru scans → writes aaWallet, signer, ain, primaryHandle to the doc
 *   4. We resolve with the connection; Nuru cleans up the doc
 *
 * When USE_MOCK_DATA is true (no Firebase), connect() resolves immediately
 * with a fake address so the UI is still testable locally.
 */

import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, USE_MOCK_DATA } from '@/lib/firebase';

const COLLECTION  = 'connect_requests';
const STORAGE_KEY = 'nuru_conn_v1';
const TIMEOUT_MS  = 180_000;

export interface NuruConnection {
  aaWallet:      string;
  signer:        string;
  ain:           string;
  primaryHandle: string;
}

function genConnectId(): string {
  return 'conn_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function saveConnection(conn: NuruConnection): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conn)); } catch { /* ignore */ }
}

export function loadConnection(): NuruConnection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NuruConnection) : null;
  } catch { return null; }
}

export function clearConnection(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Initiate a Nuru connection via Firestore QR handshake.
 * Calls onQr(connectId) as soon as the pending doc is written so the UI can
 * render the QR immediately. Resolves when Nuru approves.
 */
export async function nuruConnect(onQr: (connectId: string) => void): Promise<NuruConnection> {
  // Mock path — no Firebase configured
  if (USE_MOCK_DATA || !db) {
    const fakeId = genConnectId();
    onQr(fakeId);
    await new Promise((r) => setTimeout(r, 2000));
    const conn: NuruConnection = {
      aaWallet:      '0x4a2F8c1bE930dA77C3F8e14B2Dc0a9FF',
      signer:        '0x9b3E5dA0Cc140bA8cF6D1E7AB231200A',
      ain:           'AIN-0042',
      primaryHandle: 'demo.nuru',
    };
    saveConnection(conn);
    return conn;
  }

  const connectId = genConnectId();
  const ref = doc(db, COLLECTION, connectId);

  await setDoc(ref, { status: 'pending', createdAt: serverTimestamp() });
  onQr(connectId);

  return new Promise<NuruConnection>((resolve, reject) => {
    let unsub: (() => void) | undefined;

    const timer = setTimeout(() => {
      unsub?.();
      deleteDoc(ref).catch(() => {});
      reject(new Error('Nuru did not respond in time. Make sure Nuru is open and try again.'));
    }, TIMEOUT_MS);

    unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (!data) return;
        if (data.status === 'connected' && data.aaWallet && data.signer) {
          clearTimeout(timer);
          unsub!();
          const conn: NuruConnection = {
            aaWallet:      data.aaWallet as string,
            signer:        data.signer   as string,
            ain:           (data.ain           as string) ?? '',
            primaryHandle: (data.primaryHandle as string) ?? '',
          };
          saveConnection(conn);
          resolve(conn);
        } else if (data.status === 'rejected') {
          clearTimeout(timer);
          unsub!();
          deleteDoc(ref).catch(() => {});
          reject(new Error('Connection rejected in Nuru.'));
        }
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
