/**
 * Manages Nuru wallet connection state for Scribb.
 *
 * On mount: restores a previously saved connection from localStorage.
 * If running inside the Nuru dApp browser (window.ethereum._isNuruWallet),
 * auto-connects via the injected provider without any modal.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type NuruConnection,
  loadConnection,
  clearConnection,
  saveConnection,
} from '@/lib/nuruConnect';

export interface NuruWalletState {
  connected:     boolean;
  aaWallet:      string | null;
  signer:        string | null;
  ain:           string | null;
  primaryHandle: string | null;
  isNuroBrowser: boolean;
}

const INITIAL: NuruWalletState = {
  connected:     false,
  aaWallet:      null,
  signer:        null,
  ain:           null,
  primaryHandle: null,
  isNuroBrowser: false,
};

export function useNuruWallet() {
  const [state, setState] = useState<NuruWalletState>(INITIAL);

  const injectedEth  = typeof window !== 'undefined' ? (window as any).ethereum : null;
  const isNuroBrowser = injectedEth?._isNuruWallet === true;

  function applyConnection(conn: NuruConnection) {
    setState({
      connected:     true,
      aaWallet:      conn.aaWallet,
      signer:        conn.signer,
      ain:           conn.ain || null,
      primaryHandle: conn.primaryHandle || null,
      isNuroBrowser,
    });
  }

  // Restore saved connection or auto-connect if inside Nuru browser
  useEffect(() => {
    if (isNuroBrowser) {
      (async () => {
        try {
          const accounts: string[] = await injectedEth.request({ method: 'eth_accounts' });
          if (!accounts?.[0]) return;
          const eoa = accounts[0];
          try {
            const identity = await injectedEth.request({ method: 'nuru_getIdentity' });
            const aaWallet = identity?.aaWallet ? String(identity.aaWallet) : eoa;
            const conn: NuruConnection = {
              aaWallet,
              signer:        eoa,
              ain:           identity?.ain           ? String(identity.ain).toUpperCase() : '',
              primaryHandle: identity?.primaryHandle ? String(identity.primaryHandle) : '',
            };
            saveConnection(conn);
            applyConnection(conn);
          } catch {
            applyConnection({ aaWallet: eoa, signer: eoa, ain: '', primaryHandle: '' });
          }
        } catch { /* not connected */ }
      })();
      return;
    }

    const saved = loadConnection();
    if (saved) applyConnection(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setConnected = useCallback((conn: NuruConnection) => {
    applyConnection(conn);
  }, [isNuroBrowser]); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    clearConnection();
    setState({ ...INITIAL, isNuroBrowser });
  }, [isNuroBrowser]);

  return { ...state, isNuroBrowser, setConnected, disconnect };
}
