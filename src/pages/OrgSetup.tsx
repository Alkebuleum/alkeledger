import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Users, FolderKanban, Check, ShieldCheck, Hash } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Row } from '@/components/Row';
import type { Organization, OrgType } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  onCreate: (org: Omit<Organization, 'id' | 'createdAt'>) => Promise<void>;
  onJoin?: (code: string) => Promise<void>;
  onCancel?: () => void;
  user: AuthUser;
}

type Mode = 'create' | 'join';

export function OrgSetup({ onCreate, onJoin, onCancel, user }: Props) {
  const [mode, setMode]           = useState<Mode>('create');
  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [name, setName]           = useState('');
  const [type, setType]           = useState<OrgType | null>(null);
  const [currency, setCurrency]   = useState('USD');
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const code = searchParams.get('invite');
    if (code) { setInviteCode(code.toUpperCase()); setMode('join'); }
  }, []);

  const initials =
    name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'NEW';

  const handleCreate = async () => {
    if (!type) return;
    setSaving(true); setError('');
    try {
      await onCreate({ name, type, currency, logoInitials: initials, tagline: type === 'membership' ? 'Membership organization' : 'Project / nonprofit' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSaving(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !onJoin) return;
    setSaving(true); setError('');
    try {
      await onJoin(inviteCode.trim().toUpperCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid invite code.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-[#FAF8F4]">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-400">Signed in as {user.email}</span>
            {onCancel && (
              <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Mode switcher — pill tabs */}
        <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6">
          {(['create', 'join'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {m === 'create' ? 'Create workspace' : 'Join with invite code'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-8">

          {/* ── Join mode ──────────────────────────────────────────────── */}
          {mode === 'join' && (
            <div>
              <h1 className="font-display text-2xl font-semibold text-stone-900 mb-1">Join a workspace</h1>
              <p className="text-stone-500 text-sm mb-7">
                Enter the 6-character invite code from your organization admin.
              </p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Invite code</label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={8}
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] font-mono text-lg tracking-widest uppercase transition-colors"
                    />
                  </div>
                </div>
                {error && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                )}
                <button
                  disabled={!inviteCode.trim() || saving}
                  onClick={handleJoin}
                  className="w-full py-3 bg-[#0E1015] text-[#FAF8F4] text-sm font-medium rounded-lg hover:bg-stone-800 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Joining…' : 'Request to join'}
                </button>
                <p className="text-xs text-stone-400 text-center">
                  You'll be added as a pending member until an admin approves you.
                </p>
              </div>
            </div>
          )}

          {/* ── Create mode ─────────────────────────────────────────────── */}
          {mode === 'create' && (
            <>
              {/* Step progress */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      s < step ? 'bg-[#2F5D50] text-white' : s === step ? 'bg-[#0E1015] text-white' : 'bg-stone-100 text-stone-400'
                    }`}>
                      {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                    {s < 3 && <div className={`h-px w-8 ${s < step ? 'bg-[#2F5D50]' : 'bg-stone-200'}`} />}
                  </div>
                ))}
                <span className="ml-2 text-sm text-stone-400">Step {step} of 3</span>
              </div>

              <h1 className="font-display text-2xl font-semibold text-stone-900 mb-6">
                {step === 1 && 'Name your workspace'}
                {step === 2 && 'What kind of organization?'}
                {step === 3 && 'Review and create'}
              </h1>

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Organization name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Cedar Valley Council"
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Default currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] bg-white transition-colors"
                    >
                      <option>USD</option><option>EUR</option><option>GBP</option>
                      <option>NGN</option><option>KES</option><option>ZAR</option>
                      <option>GHS</option><option>XOF</option><option>CAD</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <TypeCard
                    active={type === 'membership'}
                    onClick={() => setType('membership')}
                    icon={Users}
                    title="Membership"
                    body="Associations, clubs, professional societies, alumni groups, councils, unions, chambers."
                    bullets={['Member directory', 'Dues tracking', 'Member portal', 'Announcements']}
                  />
                  <TypeCard
                    active={type === 'project'}
                    onClick={() => setType('project')}
                    icon={FolderKanban}
                    title="Project / Nonprofit"
                    body="Nonprofits, NGOs, grant-funded projects, foundations, public programs, startup projects."
                    bullets={['Project budgets', 'Grants & donations', 'Restricted funds', 'Public transparency']}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 text-sm">
                  <Row label="Workspace name" value={name || '—'} />
                  <Row label="Organization type" value={type === 'membership' ? 'Membership' : type === 'project' ? 'Project / Nonprofit' : '—'} />
                  <Row label="Default currency" value={currency} />
                  <Row label="Owner" value={user.displayName} />
                  <div className="mt-6 p-4 rounded-xl bg-[#EEF4F1] border border-[#C2D9D1] flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#2F5D50] flex-none mt-0.5" />
                    <p className="text-stone-700 text-sm leading-relaxed">
                      Approved records are hashed (SHA-256) and queued for blockchain anchoring. Only the proof goes on-chain — your records stay private.
                    </p>
                  </div>
                  {error && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => step > 1 && setStep((step - 1) as 1 | 2 | 3)}
                  className={`text-sm transition-colors ${step === 1 ? 'invisible' : 'text-stone-500 hover:text-stone-900'}`}
                >
                  ← Back
                </button>
                {step < 3 ? (
                  <button
                    disabled={(step === 1 && !name.trim()) || (step === 2 && !type)}
                    onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                    className="px-6 py-2.5 bg-[#0E1015] text-[#FAF8F4] rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-stone-800 transition-colors"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    disabled={saving}
                    onClick={handleCreate}
                    className="px-6 py-2.5 bg-[#0E1015] text-[#FAF8F4] rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Creating…' : 'Create workspace'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface TypeCardProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  body: string;
  bullets: string[];
}

function TypeCard({ active, onClick, icon: Icon, title, body, bullets }: TypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-xl border-2 transition-all ${
        active ? 'border-[#0E1015] bg-[#0E1015] text-white' : 'border-stone-200 bg-white hover:border-stone-400'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${active ? 'bg-white/15' : 'bg-stone-100'}`}>
        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-stone-700'}`} />
      </div>
      <div className="font-display text-lg font-semibold mb-1">{title}</div>
      <p className={`text-xs mb-3 leading-relaxed ${active ? 'text-white/70' : 'text-stone-500'}`}>{body}</p>
      <ul className="text-xs space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <Check className={`w-3 h-3 flex-shrink-0 ${active ? 'text-white/80' : 'text-[#2F5D50]'}`} />
            {b}
          </li>
        ))}
      </ul>
    </button>
  );
}
