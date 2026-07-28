import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Users, FolderKanban, Handshake, Check, Hash, Gift, ArrowLeftRight } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { Row } from '@/components/Row';
import { describeApiError } from '@/lib/scribbApi';
import type { OrgType, ParticipationModel, VotingModel } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';
import type { OnboardingInput } from '@/hooks/useOrg';

interface Props {
  onCreate: (input: OnboardingInput) => Promise<void>;
  onJoin?: (code: string) => Promise<void>;
  onCancel?: () => void;
  user: AuthUser;
}

type Mode = 'create' | 'join';
type PlanChoice = 'free' | 'paid';

const TAGLINES: Record<OrgType, string> = {
  membership: 'Membership organization',
  project: 'Project / nonprofit',
  cooperative: 'Community cooperative',
};

export function OrgSetup({ onCreate, onJoin, onCancel, user }: Props) {
  const [mode, setMode]           = useState<Mode>('create');
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState('');
  const [type, setType]           = useState<OrgType | null>(null);
  const [currency, setCurrency]   = useState('USD');
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // Organization details
  const [country, setCountry]           = useState('');
  const [region, setRegion]             = useState('');
  const [website, setWebsite]           = useState('');
  const [estimatedMembers, setEstimatedMembers] = useState('');
  const [primaryAdminName, setPrimaryAdminName]   = useState(user.displayName ?? '');
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState(user.email ?? '');

  // Cooperative-specific setup
  const [participationModel, setParticipationModel] = useState<ParticipationModel>('unit');
  const [votingModel, setVotingModel]                = useState<VotingModel>('oneMemberOneVote');
  const [positionLabel, setPositionLabel]            = useState('Participation Unit');

  // Plan choice
  const [planChoice, setPlanChoice] = useState<PlanChoice | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [migrationRequested, setMigrationRequested] = useState(false);
  const [migrationPlatformName, setMigrationPlatformName] = useState('');
  const [migrationApproxMembers, setMigrationApproxMembers] = useState('');
  const [migrationCurrentPrice, setMigrationCurrentPrice] = useState('');
  const [migrationDesiredDate, setMigrationDesiredDate] = useState('');
  const [migrationNeedsHistorical, setMigrationNeedsHistorical] = useState(true);

  // Generated once, reused across retries of the same submission (never regenerated
  // on a network retry) so the backend's idempotency check can dedupe correctly.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const isCooperative = type === 'cooperative';
  const stepBasics = 1;
  const stepDetails = 2;
  const stepType = 3;
  const stepGovernance = isCooperative ? 4 : null;
  const stepPlan = isCooperative ? 5 : 4;
  const reviewStep = isCooperative ? 6 : 5;
  const totalSteps = reviewStep;

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const code = searchParams.get('invite');
    if (code) { setInviteCode(code.toUpperCase()); setMode('join'); }
  }, []);

  const initials =
    name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'NEW';

  const handleCreate = async () => {
    if (!type || !planChoice) return;
    const isPaid = planChoice === 'paid';
    setSaving(true); setError('');
    try {
      await onCreate({
        name, type, currency, tagline: TAGLINES[type],
        selectedPlan: isPaid ? 'standard' : 'free',
        // The API requires a valid billingInterval even for Free — it just has no
        // financial effect there.
        billingInterval: billingCycle,
        migrationRequested: isPaid && migrationRequested,
        idempotencyKey,
        logoInitials: initials,
        country: country.trim() || undefined,
        region: region.trim() || undefined,
        website: website.trim() || undefined,
        estimatedMembers: estimatedMembers.trim() ? parseInt(estimatedMembers, 10) : undefined,
        primaryAdminName: primaryAdminName.trim() || undefined,
        primaryAdminEmail: primaryAdminEmail.trim() || undefined,
        ...(isPaid && migrationRequested
          ? {
              migrationRequest: {
                requested: true,
                platformName: migrationPlatformName.trim() || undefined,
                approxMembers: migrationApproxMembers.trim() ? parseInt(migrationApproxMembers, 10) : undefined,
                currentPrice: migrationCurrentPrice.trim() || undefined,
                desiredMigrationDate: migrationDesiredDate || undefined,
                needsHistoricalMigration: migrationNeedsHistorical,
              },
            }
          : {}),
        ...(isCooperative
          ? { cooperativeConfig: { participationModel, votingModel, positionLabel: positionLabel.trim() || 'Participation Unit' } }
          : {}),
      });
    } catch (e) {
      setError(describeApiError(e));
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

  const canContinue =
    (step === stepBasics && !!name.trim()) ||
    (step === stepDetails && !!primaryAdminName.trim() && !!primaryAdminEmail.trim()) ||
    (step === stepType && !!type) ||
    (step === stepGovernance) ||
    (step === stepPlan && !!planChoice);

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
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      s < step ? 'bg-[#2F5D50] text-white' : s === step ? 'bg-[#0E1015] text-white' : 'bg-stone-100 text-stone-400'
                    }`}>
                      {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                    {s < totalSteps && <div className={`h-px w-8 ${s < step ? 'bg-[#2F5D50]' : 'bg-stone-200'}`} />}
                  </div>
                ))}
                <span className="ml-2 text-sm text-stone-400">Step {step} of {totalSteps}</span>
              </div>

              <h1 className="font-display text-2xl font-semibold text-stone-900 mb-6">
                {step === stepBasics && 'Name your workspace'}
                {step === stepDetails && 'Tell us about your organization'}
                {step === stepType && 'What kind of organization?'}
                {step === stepGovernance && 'Participation & governance'}
                {step === stepPlan && 'Choose your plan'}
                {step === reviewStep && 'Review and create'}
              </h1>

              {step === stepBasics && (
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

              {step === stepDetails && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Country</label>
                      <input
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. Kenya"
                        className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">State / region</label>
                      <input
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="e.g. Nairobi County"
                        className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Website <span className="text-stone-400 font-normal">(optional)</span></label>
                      <input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://"
                        className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Estimated members</label>
                      <input
                        type="number"
                        min={0}
                        value={estimatedMembers}
                        onChange={(e) => setEstimatedMembers(e.target.value)}
                        placeholder="e.g. 120"
                        className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Primary administrator name</label>
                      <input
                        value={primaryAdminName}
                        onChange={(e) => setPrimaryAdminName(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Primary administrator email</label>
                      <input
                        type="email"
                        value={primaryAdminEmail}
                        onChange={(e) => setPrimaryAdminEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === stepType && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <TypeCard
                    active={type === 'membership'}
                    onClick={() => setType('membership')}
                    icon={Users}
                    title="Membership"
                    body="Associations, clubs, professional societies, alumni groups, councils, unions, chambers."
                    bullets={['Member directory', 'Dues tracking', 'Member portal', 'Events & proposals']}
                  />
                  <TypeCard
                    active={type === 'project'}
                    onClick={() => setType('project')}
                    icon={FolderKanban}
                    title="Project / Nonprofit"
                    body="Nonprofits, NGOs, grant-funded projects, foundations, public programs, startup projects."
                    bullets={['Project budgets', 'Grants & donations', 'Restricted funds', 'Public transparency']}
                  />
                  <TypeCard
                    active={type === 'cooperative'}
                    onClick={() => setType('cooperative')}
                    icon={Handshake}
                    title="Community Cooperative"
                    body="Member-governed groups that pool money, skills, or materials and jointly fund and manage projects over time."
                    bullets={['Participation positions', 'Shared treasury', 'Governance & voting', 'Project portfolio']}
                  />
                </div>
              )}

              {step === stepGovernance && isCooperative && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">What does a position represent?</label>
                    <input
                      value={positionLabel}
                      onChange={(e) => setPositionLabel(e.target.value)}
                      placeholder="e.g. Participation Unit, Membership Share"
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Participation model</label>
                    <select
                      value={participationModel}
                      onChange={(e) => setParticipationModel(e.target.value as ParticipationModel)}
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] bg-white transition-colors"
                    >
                      <option value="equal">Equal membership — every member holds one position</option>
                      <option value="unit">Unit-based — members hold varying units by contribution</option>
                      <option value="contribution">Contribution-based — position calculated from contributions</option>
                      <option value="hybrid">Hybrid — some rights equal, others unit/contribution-based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Voting model</label>
                    <select
                      value={votingModel}
                      onChange={(e) => setVotingModel(e.target.value as VotingModel)}
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] bg-white transition-colors"
                    >
                      <option value="oneMemberOneVote">One member, one vote</option>
                      <option value="unitWeighted">Unit-weighted — voting power based on units held</option>
                      <option value="contributionWeighted">Contribution-weighted</option>
                      <option value="hybrid">Hybrid — mixed by decision type</option>
                    </select>
                  </div>
                  <p className="text-xs text-stone-400">
                    These can be refined later in Settings as the cooperative's rules mature.
                  </p>
                </div>
              )}

              {step === stepPlan && (
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <PlanCard
                      active={planChoice === 'free'}
                      onClick={() => setPlanChoice('free')}
                      icon={Gift}
                      title="Start Free"
                      price="$0"
                      body="Start organizing your members and institutional records. No card required."
                      cta="Create Free Workspace"
                      bullets={[
                        'Up to 50 members',
                        'Up to 2 administrators',
                        'Basic membership records',
                        'Basic document storage',
                        'Meeting notes',
                        'Basic reports',
                        'Scribb branding',
                      ]}
                    />
                    <PlanCard
                      active={planChoice === 'paid'}
                      onClick={() => setPlanChoice('paid')}
                      icon={ArrowLeftRight}
                      title="Scribb Standard"
                      price={billingCycle === 'annual' ? '$104.99/yr' : '$9.99/mo'}
                      body="Membership categories, dues tracking, compliance tools, and advanced reporting for growing organizations."
                      cta="Continue to Secure Checkout"
                      bullets={[
                        'Up to 500 members',
                        'Up to 5 administrators',
                        'Membership categories & dues tracking',
                        'Meetings and attendance',
                        'Board resolutions',
                        'Committees and projects',
                        'Advanced reports & compliance calendar',
                        'Record exports',
                        'Standard support',
                      ]}
                    />
                  </div>

                  {planChoice === 'paid' && (
                    <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-4">
                      <div>
                        <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit mb-1.5">
                          {(['monthly', 'annual'] as const).map((cycle) => (
                            <button
                              key={cycle}
                              onClick={() => setBillingCycle(cycle)}
                              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                billingCycle === cycle ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                              }`}
                            >
                              {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                            </button>
                          ))}
                        </div>
                        {billingCycle === 'annual' && (
                          <p className="text-xs text-[#2F5D50] font-medium">$104.99/yr — save ~12% vs. paying monthly</p>
                        )}
                      </div>
                      <label className="flex items-center gap-2.5 text-sm font-medium text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={migrationRequested}
                          onChange={(e) => setMigrationRequested(e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300"
                        />
                        Add migration and setup assistance — $49.99 one time
                      </label>

                      {migrationRequested && (
                        <div className="grid sm:grid-cols-2 gap-4 pt-1">
                          <p className="text-xs text-stone-500 sm:col-span-2">
                            A few optional details to help our migration team prepare:
                          </p>
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1.5">Current platform name</label>
                            <input
                              value={migrationPlatformName}
                              onChange={(e) => setMigrationPlatformName(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1.5">Approximate number of members</label>
                            <input
                              type="number"
                              min={0}
                              value={migrationApproxMembers}
                              onChange={(e) => setMigrationApproxMembers(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1.5">Current monthly or annual price</label>
                            <input
                              value={migrationCurrentPrice}
                              onChange={(e) => setMigrationCurrentPrice(e.target.value)}
                              placeholder="e.g. $75/month"
                              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1.5">Desired migration date</label>
                            <input
                              type="date"
                              value={migrationDesiredDate}
                              onChange={(e) => setMigrationDesiredDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E1015]/10 focus:border-[#0E1015] transition-colors"
                            />
                          </div>
                          <label className="flex items-center gap-2.5 text-xs font-medium text-stone-600 cursor-pointer sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={migrationNeedsHistorical}
                              onChange={(e) => setMigrationNeedsHistorical(e.target.checked)}
                              className="w-4 h-4 rounded border-stone-300"
                            />
                            Historical records need to be migrated
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === reviewStep && (
                <div className="space-y-4 text-sm">
                  <Row label="Workspace name" value={name || '—'} />
                  <Row label="Organization type" value={type === 'membership' ? 'Membership' : type === 'project' ? 'Project / Nonprofit' : type === 'cooperative' ? 'Community Cooperative' : '—'} />
                  <Row label="Default currency" value={currency} />
                  <Row label="Owner" value={user.displayName} />
                  {country && <Row label="Country" value={country} />}
                  {region && <Row label="State / region" value={region} />}
                  {estimatedMembers && <Row label="Estimated members" value={estimatedMembers} />}
                  {isCooperative && (
                    <>
                      <Row label="Position label" value={positionLabel || 'Participation Unit'} />
                      <Row label="Participation model" value={participationModel} />
                      <Row label="Voting model" value={votingModel} />
                    </>
                  )}
                  <Row label="Plan" value={
                    planChoice === 'paid'
                      ? `Scribb Standard — ${billingCycle === 'annual' ? '$104.99/yr' : '$9.99/mo'}`
                      : 'Scribb Free'
                  } />
                  {planChoice === 'paid' && migrationRequested && (
                    <Row label="Migration" value={migrationPlatformName ? `From ${migrationPlatformName}` : 'Requested'} />
                  )}
                  {error && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => step > 1 && setStep(step - 1)}
                  className={`text-sm transition-colors ${step === 1 ? 'invisible' : 'text-stone-500 hover:text-stone-900'}`}
                >
                  ← Back
                </button>
                {step < reviewStep ? (
                  <button
                    disabled={!canContinue}
                    onClick={() => setStep(step + 1)}
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
                    {saving
                      ? (planChoice === 'paid' ? 'Preparing secure checkout…' : 'Creating your Scribb workspace…')
                      : (planChoice === 'paid' ? 'Continue to Secure Checkout' : 'Create Free Workspace')}
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

interface PlanCardProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  price: string;
  body: string;
  cta: string;
  bullets: string[];
}

function PlanCard({ active, onClick, icon: Icon, title, price, body, cta, bullets }: PlanCardProps) {
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
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-lg font-semibold">{title}</span>
        <span className={`text-sm ${active ? 'text-white/70' : 'text-stone-400'}`}>{price}</span>
      </div>
      <p className={`text-xs mb-3 leading-relaxed ${active ? 'text-white/70' : 'text-stone-500'}`}>{body}</p>
      <ul className="text-xs space-y-1.5 mb-4">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <Check className={`w-3 h-3 flex-shrink-0 ${active ? 'text-white/80' : 'text-[#2F5D50]'}`} />
            {b}
          </li>
        ))}
      </ul>
      <div className={`text-xs font-semibold ${active ? 'text-white' : 'text-stone-700'}`}>{cta}</div>
    </button>
  );
}
