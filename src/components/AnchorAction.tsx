import { useState } from 'react';
import { Wallet, Link2 } from 'lucide-react';
import { useNuruWallet } from '@/hooks/useNuruWallet';
import { NuruConnectModal } from '@/components/NuruConnectModal';
import type { LedgerEntry } from '@/types';

function truncateAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  entry: LedgerEntry;
  onAnchor: (id: string) => void | Promise<void>;
}

export function AnchorAction({ entry, onAnchor }: Props) {
  const wallet = useNuruWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [anchorError, setAnchorError] = useState('');

  async function handleAnchor() {
    setAnchoring(true);
    setAnchorError('');
    try {
      await onAnchor(entry.id);
    } catch (err) {
      setAnchorError(err instanceof Error ? err.message : 'Could not anchor this record. Try again.');
    }
    setAnchoring(false);
  }

  return (
    <>
      {entry.anchorStatus === 'ready' && (
        <div className="mt-4 pt-4 border-t border-[#EAE6D9]">
          {wallet.connected ? (
            <>
              <div className="flex items-center gap-2 mb-2 font-plex text-[10.5px] text-[#8A8F99]">
                <Wallet className="w-3.5 h-3.5" />
                {truncateAddr(wallet.aaWallet!)}
              </div>
              <button
                onClick={handleAnchor}
                disabled={anchoring}
                className="w-full flex items-center justify-center gap-2 bg-[#8A1E2D] text-[#EFE9DC] rounded-[5px] text-[13.5px] font-medium py-2.5 hover:bg-[#761826] disabled:opacity-50 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                {anchoring ? 'Anchoring…' : 'Anchor to Alkebuleum'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="w-full flex items-center justify-center gap-2 border border-[#DCD6C6] text-[#171B21] rounded-[5px] text-[13.5px] font-medium py-2.5 hover:bg-[#F6F4ED] transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect Nuru wallet to anchor
            </button>
          )}
          {anchorError && <div className="mt-2 text-[12px] text-[#8A1E2D]">{anchorError}</div>}
        </div>
      )}

      {entry.status === 'anchored' && (
        <div className="flex items-center gap-2 mt-4 font-plex text-[10.5px] text-[#3E6257] tracking-[0.06em]">
          ✓ VERIFIED · ANCHORED TO ALKEBULEUM
        </div>
      )}

      {showWalletModal && (
        <NuruConnectModal
          onConnected={(conn) => { wallet.setConnected(conn); setShowWalletModal(false); }}
          onClose={() => setShowWalletModal(false)}
        />
      )}
    </>
  );
}
