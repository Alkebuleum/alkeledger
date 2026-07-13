import { useState, useRef } from 'react';
import { ShieldCheck, CheckCircle2, Trash2, Save, ImagePlus, Bell } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Panel } from '@/components/Panel';
import { Row } from '@/components/Row';
import { useRole, can } from '@/hooks/useRole';
import { uploadOrgLogo } from '@/lib/storage';
import type { Organization, MemberType, DuesRates } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
  onDelete: () => Promise<void>;
  onSaveSettings: (s: { allowedMemberTypes?: MemberType[]; duesRates?: DuesRates; tagline?: string; logoUrl?: string }) => Promise<void>;
}

const DEFAULT_TYPES: MemberType[] = ['individual', 'organization'];

export function Settings({ org, user, onDelete, onSaveSettings }: Props) {
  const role = useRole(org.id, user.uid);
  const isAdmin = can.invite(role);
  const isOwner = can.configure(role);

  // Profile state
  const [taglineVal, setTaglineVal] = useState(org.tagline ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(org.logoUrl ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Membership settings state
  const [allowedTypes, setAllowedTypes] = useState<MemberType[]>(
    org.allowedMemberTypes ?? DEFAULT_TYPES
  );
  const [indRate, setIndRate] = useState<string>(
    org.duesRates?.individual != null ? String(org.duesRates.individual) : ''
  );
  const [orgRate, setOrgRate] = useState<string>(
    org.duesRates?.organization != null ? String(org.duesRates.organization) : ''
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Org deletion state
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [error, setError] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setSavedProfile(false);
    setProfileError('');
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setSavedProfile(false);
    setProfileError('');
    try {
      let logoUrl = org.logoUrl;
      if (logoFile) logoUrl = await uploadOrgLogo(org.id, logoFile);
      await onSaveSettings({ tagline: taglineVal, logoUrl });
      setLogoFile(null);
      setSavedProfile(true);
    } catch {
      setProfileError('Failed to save profile. Try again.');
    }
    setSavingProfile(false);
  };

  const toggleType = (t: MemberType) => {
    setAllowedTypes((prev) => {
      if (prev.includes(t)) {
        if (prev.length === 1) return prev; // must keep at least one
        return prev.filter((x) => x !== t);
      }
      return [...prev, t];
    });
    setSaved(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaved(false);
    const ind = parseFloat(indRate);
    const org2 = parseFloat(orgRate);
    await onSaveSettings({
      allowedMemberTypes: allowedTypes,
      duesRates: {
        individual: isNaN(ind) ? 0 : ind,
        organization: isNaN(org2) ? 0 : org2,
      },
    });
    setSaving(false);
    setSaved(true);
  };

  const handleDelete = async () => {
    if (confirmName !== org.name) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
      setDeleting(false);
    }
  };

  const { permission, requestPush } = usePushNotifications(user);
  const [pushRequesting, setPushRequesting] = useState(false);
  const [pushResult, setPushResult] = useState<'ok' | 'denied' | null>(null);

  const handleEnablePush = async () => {
    setPushRequesting(true);
    const ok = await requestPush();
    setPushResult(ok ? 'ok' : 'denied');
    setPushRequesting(false);
  };

  const roles = org.type === 'membership'
    ? ['Owner', 'Admin', 'Treasurer', 'Auditor', 'Member']
    : ['Owner', 'Admin', 'Finance Officer', 'Project Manager', 'Auditor', 'Viewer'];

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Panel title="Workspace">
        <div className="space-y-4 text-sm">
          <Row label="Organization name" value={org.name} />
          <Row label="Type" value={org.type === 'membership' ? 'Membership' : org.type === 'cooperative' ? 'Community Cooperative' : 'Project / Nonprofit'} />
          <Row label="Default currency" value={org.currency} />
          <Row label="Created" value={org.createdAt} />
          <Row label="Workspace ID" value={<span className="font-mono text-xs">{org.id}</span>} />
          {org.slug && <Row label="URL slug" value={<span className="font-mono text-xs">/{org.slug}</span>} />}
          {org.inviteCode && <Row label="Invite code" value={<span className="font-mono font-bold tracking-widest">{org.inviteCode}</span>} />}
        </div>
      </Panel>

      {/* Profile — tagline + logo, available to all admins */}
      {isAdmin && (
        <Panel title="Profile">
          <div className="space-y-5 text-sm">
            {/* Logo */}
            <div>
              <p className="text-xs text-stone-600 mb-2">Organization logo</p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border border-stone-200 rounded flex items-center justify-center bg-stone-50 overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl font-bold text-stone-400">
                      {org.logoInitials || org.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-stone-300 rounded-md hover:border-stone-500 text-stone-600"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {logoPreview ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p className="text-xs text-stone-400 mt-1.5">PNG, JPG, SVG · Max 2 MB</p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">Tagline</label>
              <input
                type="text"
                value={taglineVal}
                onChange={(e) => { setTaglineVal(e.target.value); setSavedProfile(false); }}
                placeholder="A short description of your organization"
                maxLength={120}
                className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <p className="text-xs text-stone-400 mt-1">Shown on your join page and public listings.</p>
            </div>

            {profileError && <p className="text-xs text-red-600">{profileError}</p>}

            <div className="flex items-center gap-3 pt-1 border-t border-stone-100">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800 disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
              {savedProfile && <span className="text-xs text-emerald-600">Saved</span>}
            </div>
          </div>
        </Panel>
      )}

      {/* Membership settings — only for membership orgs, admin+ */}
      {org.type === 'membership' && isAdmin && (
        <Panel title="Membership settings">
          <div className="space-y-6 text-sm">
            {/* Accepted member types */}
            <div>
              <p className="text-stone-600 mb-3">Which types of members can join this workspace?</p>
              <div className="flex gap-3">
                {(['individual', 'organization'] as MemberType[]).map((t) => {
                  const active = allowedTypes.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`flex-1 px-4 py-3 border text-sm font-medium transition-colors ${
                        active
                          ? 'bg-stone-900 text-stone-50 border-stone-900'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {t === 'individual' ? 'Individual' : 'Organization'}
                      <span className={`block text-[11px] font-normal mt-0.5 ${active ? 'text-stone-400' : 'text-stone-400'}`}>
                        {t === 'individual' ? 'Person joining as themselves' : 'Company / entity with a contact rep'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {allowedTypes.length === 1 && (
                <p className="text-xs text-stone-400 mt-2">
                  At least one type must be allowed.
                </p>
              )}
            </div>

            {/* Dues rates */}
            <div>
              <p className="text-stone-600 mb-1">Annual dues by member type</p>
              <p className="text-xs text-stone-400 mb-3">
                Same amount by default. Leave blank for free / to be set individually.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {allowedTypes.includes('individual') && (
                  <div>
                    <label className="text-xs text-stone-600 block mb-1">Individual ({org.currency})</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                        {org.currency === 'USD' ? '$' : org.currency === 'EUR' ? '€' : org.currency === 'GBP' ? '£' : ''}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={indRate}
                        onChange={(e) => { setIndRate(e.target.value); setSaved(false); }}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>
                  </div>
                )}
                {allowedTypes.includes('organization') && (
                  <div>
                    <label className="text-xs text-stone-600 block mb-1">Organization ({org.currency})</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                        {org.currency === 'USD' ? '$' : org.currency === 'EUR' ? '€' : org.currency === 'GBP' ? '£' : ''}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={orgRate}
                        onChange={(e) => { setOrgRate(e.target.value); setSaved(false); }}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-stone-100">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800 disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save settings'}
              </button>
              {saved && <span className="text-xs text-emerald-600">Saved</span>}
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Roles & access">
        <p className="text-sm text-stone-600 mb-3">Roles control what each user can see, create, and approve.</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {roles.map((r) => (
            <div key={r} className="px-3 py-2 bg-stone-50 rounded-md ring-1 ring-stone-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-stone-500" /> {r}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Notifications">
        <div className="space-y-3 text-sm">
          <p className="text-stone-600">Get browser push notifications when new events or proposals are posted.</p>
          {permission === 'granted' ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Push notifications enabled on this device</span>
            </div>
          ) : permission === 'denied' ? (
            <p className="text-xs text-stone-500">
              Push notifications are blocked in your browser settings. Enable them in your browser's site permissions to receive notifications.
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleEnablePush}
                disabled={pushRequesting}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded-md hover:bg-stone-800 disabled:opacity-40"
              >
                <Bell className="w-3.5 h-3.5" />
                {pushRequesting ? 'Enabling…' : 'Enable push notifications'}
              </button>
              {pushResult === 'denied' && (
                <span className="text-xs text-red-600">Permission denied — check browser settings.</span>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Blockchain anchoring">
        <div className="space-y-3 text-sm">
          <Row label="Network" value="Alkebuleum (placeholder)" />
          <Row
            label="Status"
            value={
              <span className="text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            }
          />
          <Row label="Mode" value="Mock — proofs are simulated" />
        </div>
      </Panel>

      {isOwner && (
        <div className="border border-red-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
              <p className="text-xs text-stone-500 mt-0.5">Permanently delete this workspace and all its data.</p>
            </div>
            {!showDanger && (
              <button
                onClick={() => setShowDanger(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete workspace
              </button>
            )}
          </div>

          {showDanger && (
            <div className="space-y-3 pt-1 border-t border-red-100">
              <p className="text-sm text-stone-700">
                This will delete <strong>{org.name}</strong> and all its members, ledger entries, and records. This cannot be undone.
              </p>
              <div>
                <label className="text-xs text-stone-600">
                  Type <span className="font-mono font-semibold">{org.name}</span> to confirm
                </label>
                <input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={org.name}
                  className="mt-1.5 w-full px-3 py-2 border border-red-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDanger(false); setConfirmName(''); setError(''); }}
                  className="px-3 py-1.5 text-sm text-stone-600 border border-stone-300 rounded hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  disabled={confirmName !== org.name || deleting}
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
