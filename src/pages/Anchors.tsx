import { useState } from 'react';
import { Link2, Clock, CheckCircle2, ShieldCheck, Wallet, X, Copy } from 'lucide-react';
import { fmt } from '@/lib/format';
import { useNuruWallet } from '@/hooks/useNuruWallet';
import { NuruConnectModal } from '@/components/NuruConnectModal';
import type { LedgerEntry } from '@/types';

interface Props {
  ledger: LedgerEntry[];
  onAnchor: (id: string) => void | Promise<void>;
}

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Anchors({ ledger, onAnchor }: Props) {
  const ready       = ledger.filter((l) => l.anchorStatus === 'ready');
  const anchored    = ledger.filter((l) => l.anchorStatus === 'anchored');
  const notAnchored = ledger.filter((l) => l.anchorStatus === 'not_anchored').length;
  const failed      = ledger.filter((l) => l.anchorStatus === 'failed').length;

  const wallet = useNuruWallet();
  const [showModal, setShowModal] = useState(false);
  const [copied,    setCopied]    = useState(false);

  async function copyAddr() {
    if (!wallet.aaWallet) return;
    await navigator.clipboard.writeText(wallet.aaWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-7xl">
      <div className="p-8 space-y-8">
        {/* Hero band */}
        <div className="bg-[var(--ink)] text-[var(--bone)] relative overflow-hidden">
          <div className="absolute inset-0 ledger-rule opacity-20 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

          <div className="relative px-10 py-10 grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-7">
              {/* Chain status */}
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 font-mono mb-4 flex items-center gap-2">
                {wallet.connected ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Alkebuleum mainnet · connected
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-stone-500 rounded-full" />
                    Alkebuleum mainnet · wallet not connected
                  </>
                )}
              </div>

              <h2 className="font-display text-5xl md:text-6xl leading-[0.95] font-medium">
                Proof, set in <em className="font-editorial italic font-light text-emerald-300">stone.</em>
              </h2>
              <p className="mt-5 font-editorial text-lg text-stone-300 leading-snug max-w-xl">
                When an approval is granted, the record is hashed and queued for anchoring. The hash — and only the hash — is committed to the chain. Your books stay yours.
              </p>

              {/* Wallet connect / status area */}
              <div className="mt-6">
                {wallet.connected ? (
                  <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-md px-4 py-2.5">
                    <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                      {wallet.primaryHandle && (
                        <span className="text-xs text-stone-400 leading-none mb-0.5">{wallet.primaryHandle}</span>
                      )}
                      <span className="font-mono text-sm text-emerald-300">{truncateAddr(wallet.aaWallet!)}</span>
                      {wallet.ain && (
                        <span className="text-[10px] font-mono text-stone-500 mt-0.5">{wallet.ain}</span>
                      )}
                    </div>
                    <button onClick={copyAddr} title="Copy address" className="text-stone-400 hover:text-stone-200 transition-colors ml-1">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copied && <span className="text-[10px] text-emerald-400 font-mono">Copied!</span>}
                    <span className="w-px h-4 bg-white/10" />
                    <button onClick={wallet.disconnect} title="Disconnect" className="text-stone-500 hover:text-stone-300 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-900 text-sm font-semibold rounded-md transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Nuru wallet
                  </button>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="md:col-span-5 grid grid-cols-2 gap-px bg-[var(--bone)]/10">
              <div className="bg-[var(--ink)] p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-mono">Anchored</div>
                <div className="font-display text-5xl text-emerald-300 mt-2">{anchored.length}</div>
              </div>
              <div className="bg-[var(--ink)] p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-mono">Ready</div>
                <div className="font-display text-5xl text-[var(--archival)] mt-2">{ready.length}</div>
              </div>
              <div className="bg-[var(--ink)] p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-mono">Pending</div>
                <div className="font-display text-5xl text-stone-300 mt-2">{notAnchored}</div>
              </div>
              <div className="bg-[var(--ink)] p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-mono">Failed</div>
                <div className="font-display text-5xl text-[var(--ledger-red)] mt-2">{failed}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet required notice */}
        {!wallet.connected && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md px-5 py-4">
            <Wallet className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Connect your Nuru wallet to anchor records to the Alkebuleum blockchain. You can browse the queue and anchored history without connecting.
            </p>
          </div>
        )}

        {/* How it works */}
        <div>
          <div className="flex items-baseline gap-4 mb-5 pb-3 border-b border-stone-300/60">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">The mechanism</span>
            <span className="flex-1 h-px bg-stone-300/60" />
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-stone-300/60 border border-stone-300/60">
            {[
              { n: 'I',   t: 'Hash on approval',  d: 'A canonical SHA-256 hash is generated at the moment a record is approved.' },
              { n: 'II',  t: 'Commit to chain',    d: 'The hash is written to the Alkebuleum blockchain. Private record data never leaves your workspace.' },
              { n: 'III', t: 'Verifiable forever', d: 'Anyone holding the record can re-hash it and confirm the original has not changed since.' },
            ].map((s, i) => (
              <div key={i} className="bg-white p-6">
                <div className="font-editorial italic text-5xl text-[var(--ledger-red)] mb-3">{s.n}.</div>
                <h4 className="font-display text-xl mb-2">{s.t}</h4>
                <p className="text-sm text-stone-600 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ready to anchor */}
        <div>
          <div className="flex items-baseline gap-4 mb-5 pb-3 border-b border-stone-300/60">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">In the queue</span>
            <h3 className="font-display text-2xl">Ready to anchor</h3>
            <span className="flex-1 h-px bg-stone-300/60" />
            {ready.length > 0 && (
              <button
                onClick={() => wallet.connected && ready.forEach((r) => onAnchor(r.id))}
                disabled={!wallet.connected}
                title={wallet.connected ? undefined : 'Connect your Nuru wallet first'}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--bone)] text-xs font-medium tracking-wide uppercase rounded-md flex items-center gap-2 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Link2 className="w-3.5 h-3.5" /> Anchor all · {ready.length}
              </button>
            )}
          </div>

          {ready.length === 0 ? (
            <div className="bg-[var(--paper)]/40 border border-dashed border-stone-300 p-12 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-700 mb-3" />
              <p className="font-editorial italic text-stone-600">The queue is empty. All approved records have been anchored.</p>
            </div>
          ) : (
            <div className="bg-white border border-stone-300/60">
              {ready.map((e, i) => (
                <div key={e.id} className={`px-5 py-4 flex items-center gap-4 ${i > 0 ? 'border-t border-stone-200' : ''} hover:bg-stone-50/60`}>
                  <div className="w-8 h-8 bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-editorial text-base text-stone-900 truncate leading-snug">{e.description}</div>
                    <div className="text-[11px] font-mono text-stone-500 mt-0.5">hash · {e.hash}</div>
                  </div>
                  <div className="font-display text-xl tracking-tight text-stone-900">{fmt(e.amount)}</div>
                  <button
                    onClick={() => wallet.connected && onAnchor(e.id)}
                    disabled={!wallet.connected}
                    title={wallet.connected ? undefined : 'Connect your Nuru wallet first'}
                    className="px-4 py-2 bg-[var(--ink)] text-[var(--bone)] text-xs font-medium uppercase tracking-wide rounded-md hover:bg-stone-800 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Link2 className="w-3 h-3" /> Anchor
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anchored records */}
        <div>
          <div className="flex items-baseline gap-4 mb-5 pb-3 border-b border-stone-300/60">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--ledger-red)] font-mono">Of record</span>
            <h3 className="font-display text-2xl">Anchored records</h3>
            <span className="flex-1 h-px bg-stone-300/60" />
            <span className="text-xs text-stone-500 font-editorial italic">{anchored.length} verified on Alkebuleum</span>
          </div>

          {anchored.length === 0 ? (
            <div className="bg-[var(--paper)]/40 border border-dashed border-stone-300 p-12 text-center">
              <p className="font-editorial italic text-stone-600">Anchored records will appear here.</p>
            </div>
          ) : (
            <div className="bg-white border border-stone-300/60">
              {anchored.map((e, i) => (
                <div key={e.id} className={`px-5 py-4 flex items-center gap-4 ${i > 0 ? 'border-t border-stone-200' : ''}`}>
                  <div className="w-8 h-8 bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-editorial text-base text-stone-900 truncate leading-snug">{e.description}</div>
                    <div className="text-[11px] font-mono text-stone-500 mt-0.5 truncate">
                      hash <span className="text-stone-700">{e.hash}</span> · tx{' '}
                      <span className="text-emerald-700">{e.txHash}</span>
                    </div>
                  </div>
                  <div className="font-display text-xl tracking-tight text-stone-900">{fmt(e.amount)}</div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 font-mono">verified</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connect modal */}
      {showModal && (
        <NuruConnectModal
          onConnected={(conn) => { wallet.setConnected(conn); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
