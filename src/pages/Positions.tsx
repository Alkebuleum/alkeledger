import { useEffect, useState } from 'react';
import { Plus, X, Pencil, ShieldAlert, Layers, Ban } from 'lucide-react';
import { usePositions } from '@/hooks/usePositions';
import { listMembers } from '@/services/members';
import { can, useRole } from '@/hooks/useRole';
import { fmt } from '@/lib/format';
import type { Member, Organization, Position, ParticipationModel } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

const MODEL_LABELS: Record<ParticipationModel, string> = {
  equal: 'Equal membership',
  unit: 'Unit-based participation',
  contribution: 'Contribution-based participation',
  hybrid: 'Hybrid participation',
};

export function Positions({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const isAdmin = can.manage(role);
  const config = org.cooperativeConfig;

  const { positions, loading, createPosition, updatePosition, deletePosition } = usePositions(org.id);
  const [members, setMembers] = useState<Member[]>([]);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);

  useEffect(() => { listMembers(org.id).then(setMembers); }, [org.id]);

  const activePositions = positions.filter((p) => p.status === 'active');
  const totalIssued = activePositions.reduce((sum, p) => sum + p.units, 0);
  const positionLabel = config?.positionLabel ?? 'Participation Unit';

  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">§ Positions</div>
          <h2 className="font-display text-2xl mt-0.5">Participation Positions</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {MODEL_LABELS[config?.participationModel ?? 'unit']} · {positionLabel}s
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowIssueForm(true)}
            className="px-3 py-2 bg-stone-900 text-stone-50 text-sm font-medium flex items-center gap-1.5 hover:bg-stone-800 rounded"
          >
            <Plus className="w-4 h-4" /> Issue position
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label={`${positionLabel}s issued`} value={totalIssued.toLocaleString()} />
        <SummaryCard
          label="Authorized total"
          value={config?.totalAuthorizedUnits ? config.totalAuthorizedUnits.toLocaleString() : 'Unlimited'}
        />
        <SummaryCard label="Position holders" value={activePositions.length.toLocaleString()} />
      </div>

      {/* Compliance notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 flex-none mt-0.5" />
        <p className="text-amber-900 text-sm leading-relaxed">
          Participation positions are not automatically securities, investments, or a guarantee of financial
          return. The cooperative is responsible for defining the legal and economic nature of these positions
          and should obtain appropriate legal, tax, and cooperative advice.
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-stone-400 text-sm">Loading…</div>
      ) : positions.length === 0 ? (
        <div className="py-16 text-center text-stone-400 bg-white rounded-xl ring-1 ring-stone-200">
          <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No positions issued yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {positions.map((p) => {
              const pct = totalIssued > 0 ? (p.units / totalIssued) * 100 : 0;
              return (
                <div key={p.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-stone-900">{p.memberName}</span>
                      {p.status === 'inactive' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-500 border border-stone-200">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500">
                      {p.units.toLocaleString()} {positionLabel}{p.units === 1 ? '' : 's'}
                      {p.status === 'active' && totalIssued > 0 && (
                        <span> · {pct.toFixed(1)}% of issued</span>
                      )}
                      {config?.unitValue && (
                        <span> · {fmt(p.units * config.unitValue, org.currency)} value</span>
                      )}
                      <span> · Issued {p.issuedAt} by {p.issuedBy}</span>
                    </div>
                    {p.contributionNote && (
                      <p className="mt-2 text-sm text-stone-600 leading-relaxed">{p.contributionNote}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => setEditing(p)}
                        className="p-1.5 rounded-md text-stone-300 hover:text-stone-700 hover:bg-stone-100"
                        title="Edit position"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {p.status === 'active' && (
                        <button
                          onClick={() => updatePosition(p.id, { status: 'inactive' })}
                          className="p-1.5 rounded-md text-stone-300 hover:text-red-500 hover:bg-red-50"
                          title="Revoke position"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showIssueForm && (
        <PositionModal
          org={org}
          user={user}
          members={members}
          onClose={() => setShowIssueForm(false)}
          onSave={async (data) => { await createPosition(data); setShowIssueForm(false); }}
        />
      )}

      {editing && (
        <PositionModal
          org={org}
          user={user}
          members={members}
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await updatePosition(editing.id, { units: data.units, contributionNote: data.contributionNote, status: data.status });
            setEditing(null);
          }}
          onDelete={async () => { await deletePosition(editing.id); setEditing(null); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-stone-200 p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-xl font-display mt-1 text-stone-900">{value}</div>
    </div>
  );
}

function PositionModal({
  org, user, members, editing, onClose, onSave, onDelete,
}: {
  org: Organization;
  user: AuthUser;
  members: Member[];
  editing?: Position;
  onClose: () => void;
  onSave: (data: Omit<Position, 'id' | 'orgId' | 'issuedAt'>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const config = org.cooperativeConfig;
  const isEqual = config?.participationModel === 'equal';
  const positionLabel = config?.positionLabel ?? 'Participation Unit';

  const [memberId, setMemberId] = useState(editing?.memberId ?? '');
  const [units, setUnits] = useState(editing ? editing.units.toString() : isEqual ? '1' : '');
  const [contributionNote, setContributionNote] = useState(editing?.contributionNote ?? '');
  const [saving, setSaving] = useState(false);

  const selectedMember = members.find((m) => m.id === memberId);

  const handleSave = async () => {
    if (!editing && !selectedMember) return;
    const unitsNum = parseFloat(units);
    if (!unitsNum || unitsNum <= 0) return;
    setSaving(true);
    await onSave({
      memberId: editing?.memberId ?? selectedMember!.id,
      memberName: editing?.memberName ?? selectedMember!.name,
      units: unitsNum,
      contributionNote: contributionNote.trim() || undefined,
      status: editing?.status ?? 'active',
      issuedBy: editing?.issuedBy ?? user.displayName,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">{editing ? 'Edit position' : 'Issue position'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {editing ? (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium text-stone-900">
              {editing.memberName}
            </div>
          ) : (
            <div>
              <label className="text-xs text-stone-600 block mb-1.5">Member <span className="text-red-400">*</span></label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
              >
                <option value="">Select a member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">
              {positionLabel}s <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={units}
              disabled={isEqual}
              onChange={(e) => setUnits(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 disabled:bg-stone-50 disabled:text-stone-400"
            />
            {isEqual && (
              <p className="text-[11px] text-stone-400 mt-1.5">
                This cooperative uses equal membership — every member holds exactly one position.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1.5">Contribution note (optional)</label>
            <textarea
              value={contributionNote}
              onChange={(e) => setContributionNote(e.target.value)}
              rows={3}
              placeholder="What this position represents or was earned for…"
              className="w-full px-3 py-2.5 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between gap-3">
          {editing && onDelete ? (
            <button onClick={onDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
          ) : (
            <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (!editing && !selectedMember) || !units}
            className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 rounded"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Issue position'}
          </button>
        </div>
      </div>
    </div>
  );
}
