import { useState } from 'react';
import { Award } from 'lucide-react';
import { fmtDate, recordTypeOf } from '@/lib/format';
import { CopyHashButton } from '@/components/CopyHashButton';
import { useRole, can } from '@/hooks/useRole';
import type { LedgerEntry, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
  ledger: LedgerEntry[];
  onIssue: () => void;
  onRevoke: (id: string) => Promise<void>;
}

type Filter = 'all' | 'active' | 'expiring' | 'revoked';

function daysUntil(iso: string): number {
  // expiresAt is a plain YYYY-MM-DD (from a <input type="date">) with no
  // timezone — parse it as local midnight like "today", not UTC midnight,
  // or the day count skews by the viewer's UTC offset.
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today  = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function credentialState(e: LedgerEntry): 'active' | 'expiring' | 'revoked' {
  if (e.revokedAt) return 'revoked';
  if (e.expiresAt && daysUntil(e.expiresAt) <= 30) return 'expiring';
  return 'active';
}

function StateChip({ e }: { e: LedgerEntry }) {
  const state = credentialState(e);
  if (state === 'revoked') {
    return (
      <span className="inline-flex items-center gap-1 font-plex text-[9.5px] tracking-[0.09em] px-2 py-0.5 rounded-[3px] bg-[#8A1E2D] text-[#EFE9DC]">
        ■ REVOKED
      </span>
    );
  }
  if (state === 'expiring') {
    const d = daysUntil(e.expiresAt!);
    return (
      <span className="inline-flex items-center gap-1 font-plex text-[9.5px] tracking-[0.09em] px-2 py-0.5 rounded-[3px] border border-dashed border-[#DCD6C6] text-[#8A8F99]">
        ◦ {d < 0 ? 'EXPIRED' : `EXPIRES IN ${d} DAYS`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-plex text-[9.5px] tracking-[0.09em] px-2 py-0.5 rounded-[3px] bg-[rgba(62,98,87,0.12)] text-[#3E6257] border border-[rgba(62,98,87,0.35)]">
      ✓ ACTIVE
    </span>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'revoked',  label: 'Revoked' },
];

export function Credentials({ org, user, ledger, onIssue, onRevoke }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const role = useRole(org.id, user.uid);
  const isAdmin = can.manage(role);

  const credentials = ledger.filter((e) => recordTypeOf(e) === 'credential');
  const filtered = filter === 'all' ? credentials : credentials.filter((e) => credentialState(e) === filter);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await onRevoke(id);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1160px]">
      <div className="flex items-end justify-between gap-3 flex-wrap mb-1">
        <div>
          <h1 className="font-serif font-semibold text-[27px] text-[#171B21] tracking-[-0.01em]">Credentials</h1>
          <div className="font-plex text-[11px] text-[#8A8F99] tracking-[0.04em] mt-1">
            {credentials.length} ISSUED · EACH ONE A SEALED ENTRY IN THE LEDGER
          </div>
        </div>
        <button
          onClick={onIssue}
          className="inline-flex items-center gap-2 border border-[#DCD6C6] text-[#171B21] text-sm font-medium px-4 py-2 rounded-md hover:bg-[#F6F4ED] transition-colors"
        >
          + Issue credential
        </button>
      </div>

      <div className="flex items-center gap-2 mt-5 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#171B21] border border-[#171B21] text-[#EFE9DC]'
                : 'border border-[#DCD6C6] text-[#5A5F67] hover:bg-[#FDFCF8]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg py-16 text-center">
          <Award className="w-7 h-7 mx-auto text-[#8A8F99] mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#5A5F67]">No credentials match this filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((e) => {
            const state = credentialState(e);
            return (
              <div key={e.id} className="bg-[#FDFCF8] border border-[#DCD6C6] rounded-lg p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`w-[22px] h-1 rounded-sm ${state === 'revoked' ? 'bg-[#8A8F99]' : 'bg-[#171B21]'}`} />
                  <StateChip e={e} />
                </div>
                <h3 className={`font-serif text-[18px] font-semibold leading-[1.3] ${state === 'revoked' ? 'text-[#8A8F99] line-through' : 'text-[#171B21]'}`}>
                  {e.description}
                </h3>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-6 h-6 rounded-full bg-[#232935] text-[#EFE9DC] flex items-center justify-center text-[9.5px] font-semibold shrink-0">
                    {(e.holderName ?? org.name).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[13px] font-medium text-[#171B21]">{e.holderName ?? org.name}</span>
                </div>
                <div className="border-t border-[#EAE6D9] mt-3.5 pt-3 font-plex text-[10.5px] text-[#8A8F99] leading-[1.9]">
                  <div>issued {fmtDate(e.createdAt)}</div>
                  <div>{e.expiresAt ? `expires ${fmtDate(e.expiresAt)}` : 'until revoked'}</div>
                  {e.revokedAt && <div className="text-[#8A1E2D]">revoked {fmtDate(e.revokedAt)}{e.revokedBy ? ` · ${e.revokedBy}` : ''}</div>}
                </div>
                <div className="flex gap-1.5 mt-3.5">
                  {e.hash && <CopyHashButton hash={e.hash} />}
                  {isAdmin && state !== 'revoked' && (
                    <button
                      onClick={() => handleRevoke(e.id)}
                      disabled={revokingId === e.id}
                      className="px-3 py-2.5 rounded-[5px] text-[13.5px] font-medium border border-[#DCD6C6] text-[#8A1E2D] hover:bg-[#F6F4ED] disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {revokingId === e.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
