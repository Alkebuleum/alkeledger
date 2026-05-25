import { useState } from 'react';
import { ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';
import { Panel } from '@/components/Panel';
import { Row } from '@/components/Row';
import { useRole, can } from '@/hooks/useRole';
import type { Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
  onDelete: () => Promise<void>;
}

export function Settings({ org, user, onDelete }: Props) {
  const role = useRole(org.id, user.uid);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [error, setError] = useState('');

  const roles = org.type === 'membership'
    ? ['Owner', 'Admin', 'Treasurer', 'Auditor', 'Member']
    : ['Owner', 'Admin', 'Finance Officer', 'Project Manager', 'Auditor', 'Viewer'];

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

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Panel title="Workspace">
        <div className="space-y-4 text-sm">
          <Row label="Organization name" value={org.name} />
          <Row label="Type" value={org.type === 'membership' ? 'Membership' : 'Project / Nonprofit'} />
          <Row label="Default currency" value={org.currency} />
          <Row label="Created" value={org.createdAt} />
          <Row label="Workspace ID" value={<span className="font-mono text-xs">{org.id}</span>} />
          {org.slug && <Row label="URL slug" value={<span className="font-mono text-xs">/{org.slug}</span>} />}
          {org.inviteCode && <Row label="Invite code" value={<span className="font-mono font-bold tracking-widest">{org.inviteCode}</span>} />}
        </div>
      </Panel>

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

      {can.configure(role) && (
        <div className="border border-red-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
              <p className="text-xs text-stone-500 mt-0.5">Permanently delete this workspace and all its data.</p>
            </div>
            {!showDanger && (
              <button
                onClick={() => setShowDanger(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded hover:bg-red-50"
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
