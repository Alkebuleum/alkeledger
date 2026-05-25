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
  const [mode, setMode] = useState<Mode>('create');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<OrgType | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const code = searchParams.get('invite');
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode('join');
    }
  }, []);

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'NEW';

  const handleCreate = async () => {
    if (!type) return;
    setSaving(true);
    setError('');
    try {
      await onCreate({
        name,
        type,
        currency,
        logoInitials: initials,
        tagline: type === 'membership' ? 'Membership organization' : 'Project / nonprofit',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSaving(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim() || !onJoin) return;
    setSaving(true);
    setError('');
    try {
      await onJoin(inviteCode.trim().toUpperCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid invite code.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-[var(--bone)]">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">Signed in as {user.email}</span>
            {onCancel && (
              <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-900">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('create')}
            className={`px-4 py-2 text-sm font-medium border ${mode === 'create' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'}`}
          >
            Create workspace
          </button>
          <button
            onClick={() => setMode('join')}
            className={`px-4 py-2 text-sm font-medium border ${mode === 'join' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'}`}
          >
            Join with invite code
          </button>
        </div>

        <div className="bg-white border border-stone-200 p-8 shadow-sm">

          {/* ── Join mode ──────────────────────────────────────────────── */}
          {mode === 'join' && (
            <div>
              <h1 className="font-display text-3xl text-stone-900 mb-2">Join a workspace</h1>
              <p className="text-stone-500 text-sm mb-6">
                Enter the 6-character invite code from your organization admin.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="text-sm text-stone-600">Invite code</label>
                  <div className="mt-1.5 relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={8}
                      className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900 font-mono text-lg tracking-widest uppercase"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  disabled={!inviteCode.trim() || saving}
                  onClick={handleJoin}
                  className="w-full py-2.5 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
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
              <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                Step {step} of 3
              </div>
              <h1 className="font-display text-3xl text-stone-900 mb-6">
                {step === 1 && 'Name your workspace'}
                {step === 2 && 'What kind of organization?'}
                {step === 3 && 'Review and create'}
              </h1>

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm text-stone-600">Organization name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Cedar Valley Council"
                      className="mt-1.5 w-full px-3 py-2.5 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-stone-600">Default currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="mt-1.5 w-full px-3 py-2.5 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
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
                  <div className="mt-6 p-4 rounded-md bg-stone-50 ring-1 ring-stone-200 flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 flex-none" />
                    <p className="text-stone-700">
                      Approved records are hashed (SHA-256) and queued for blockchain anchoring. Only the proof goes on-chain — your records stay private.
                    </p>
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => step > 1 && setStep((step - 1) as 1 | 2 | 3)}
                  className={`text-sm ${step === 1 ? 'invisible' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  ← Back
                </button>
                {step < 3 ? (
                  <button
                    disabled={(step === 1 && !name.trim()) || (step === 2 && !type)}
                    onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                    className="px-5 py-2.5 bg-stone-900 text-stone-50 rounded-md text-sm font-medium disabled:opacity-40 hover:bg-stone-800"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    disabled={saving}
                    onClick={handleCreate}
                    className="px-5 py-2.5 bg-stone-900 text-stone-50 rounded-md text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
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
      className={`text-left p-5 rounded-lg ring-1 transition-all ${
        active ? 'ring-stone-900 bg-stone-900 text-stone-50' : 'ring-stone-200 bg-white hover:ring-stone-400'
      }`}
    >
      <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-3 ${active ? 'bg-stone-50 text-stone-900' : 'bg-stone-900 text-stone-50'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-display text-xl mb-1">{title}</div>
      <p className={`text-xs mb-3 ${active ? 'text-stone-300' : 'text-stone-600'}`}>{body}</p>
      <ul className="text-xs space-y-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-1.5">
            <Check className="w-3 h-3" /> {b}
          </li>
        ))}
      </ul>
    </button>
  );
}
