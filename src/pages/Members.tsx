import { useEffect, useState } from 'react';
import { Plus, X, Mail, UserCheck, UserX, Wallet, Trash2, Copy, CheckCheck, Clock } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { Panel } from '@/components/Panel';
import {
  listMembers, updateMemberRole, updateMemberStatus, setDuesPaid, removeMember, inviteMembers,
  listPendingInvites, revokeInvite,
} from '@/services/members';
import type { PendingInvite } from '@/services/members';
import { can, useRole } from '@/hooks/useRole';
import type { Member, MemberStatus, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  user: AuthUser;
}

const ROLES = ['member', 'treasurer', 'admin', 'owner'] as const;

export function Members({ org, user }: Props) {
  const role = useRole(org.id, user.uid);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');

  const reload = () => {
    setLoading(true);
    Promise.all([
      listMembers(org.id),
      listPendingInvites(org.id),
    ]).then(([m, inv]) => { setMembers(m); setInvites(inv); setLoading(false); });
  };

  useEffect(() => { reload(); }, [org.id]);

  const active    = members.filter((m) => m.status === 'active');
  const pending   = members.filter((m) => m.status === 'pending');
  const suspended = members.filter((m) => m.status !== 'active' && m.status !== 'pending');

  const handleRoleChange = async (m: Member, newRole: string) => {
    setError('');
    try { await updateMemberRole(org.id, m.id, newRole); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update role.'); }
  };

  const handleStatusChange = async (m: Member, status: MemberStatus) => {
    setError('');
    try { await updateMemberStatus(org.id, m.id, status); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to update status.'); }
  };

  const handleRevokeInvite = async (invite: PendingInvite) => {
    if (!confirm(`Revoke invite for ${invite.email}?`)) return;
    await revokeInvite(invite.token);
    reload();
  };

  const handleRemove = async (m: Member) => {
    if (!confirm(`Remove ${m.name} from this workspace?`)) return;
    setError('');
    try { await removeMember(org.id, m.id); reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to remove member.'); }
  };

  const handleDues = async (m: Member) => {
    await setDuesPaid(org.id, m.id, !m.duesPaid);
    reload();
  };

  const isAdmin = can.invite(role);

  return (
    <div className="p-4 sm:p-8 max-w-5xl space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Pending approvals */}
      {pending.length > 0 && isAdmin && (
        <Panel title={`Pending approval (${pending.length})`}>
          <div className="divide-y divide-stone-100">
            {pending.map((m) => (
              <div key={m.id} className="px-5 py-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <Avatar name={m.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-900 text-sm">{m.name}</div>
                  <div className="text-xs text-stone-500">{m.email}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleStatusChange(m, 'active')}
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleRemove(m)}
                    className="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 hover:bg-stone-200 flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Pending invites */}
      {invites.length > 0 && isAdmin && (
        <Panel title={`Pending invites (${invites.length})`}>
          <div className="divide-y divide-stone-100">
            {invites.map((inv) => {
              const daysLeft = Math.ceil((inv.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={inv.token} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-900">{inv.name || inv.email}</div>
                    <div className="text-xs text-stone-500">{inv.email} · expires in {daysLeft}d</div>
                  </div>
                  <button
                    onClick={() => handleRevokeInvite(inv)}
                    className="text-stone-300 hover:text-red-500 p-1"
                    title="Revoke invite"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Member directory */}
      <Panel
        title={`Member directory (${active.length} active)`}
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              {org.inviteCode && (
                <button
                  onClick={() => setShowCode(true)}
                  className="px-3 py-1.5 text-xs border border-stone-300 text-stone-700 hover:bg-stone-100 flex items-center gap-1.5"
                >
                  <Hash className="w-3 h-3" /> Code
                </button>
              )}
              <button
                onClick={() => setShowInvite(true)}
                className="px-3 py-1.5 bg-stone-900 text-stone-50 text-xs font-medium flex items-center gap-1.5 hover:bg-stone-800"
              >
                <Plus className="w-3.5 h-3.5" /> Invite
              </button>
            </div>
          ) : null
        }
      >
        {loading ? (
          <div className="py-10 text-center text-stone-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-widest text-stone-500">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Role</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Joined</th>
                  <th className="text-left px-5 py-3 font-medium">Dues</th>
                  {isAdmin && <th className="px-5 py-3 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[...active, ...suspended].map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} size="sm" />
                        <div>
                          <div className="text-stone-900">{m.name}</div>
                          <div className="text-[11px] text-stone-500">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {isAdmin && m.id !== user.uid ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m, e.target.value)}
                          className="text-xs border border-stone-200 rounded px-1.5 py-1 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      ) : (
                        <span className="text-stone-600 capitalize">{m.role}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isAdmin && m.id !== user.uid ? (
                        <select
                          value={m.status}
                          onChange={(e) => handleStatusChange(m, e.target.value as MemberStatus)}
                          className="text-xs border border-stone-200 rounded px-1.5 py-1 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
                        >
                          {(['active', 'suspended', 'expired'] as MemberStatus[]).map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusPill value={m.status} />
                      )}
                    </td>
                    <td className="px-5 py-3 text-stone-600">{m.joined}</td>
                    <td className="px-5 py-3">
                      {isAdmin ? (
                        <button
                          onClick={() => handleDues(m)}
                          className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${m.duesPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                        >
                          <Wallet className="w-3 h-3" />
                          {m.duesPaid ? 'Paid' : 'Unpaid'}
                        </button>
                      ) : (
                        <span className={`text-xs ${m.duesPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {m.duesPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-right">
                        {m.id !== user.uid && (
                          <button
                            onClick={() => handleRemove(m)}
                            className="text-stone-300 hover:text-red-500 p-1"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {active.length === 0 && suspended.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-5 py-10 text-center text-stone-400 text-sm">
                      No members yet. Invite people to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          org={org}
          onClose={() => setShowInvite(false)}
          onDone={reload}
        />
      )}

      {/* Invite code modal */}
      {showCode && org.inviteCode && (
        <InviteCodeModal
          code={org.inviteCode}
          onClose={() => setShowCode(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Hash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-amber-100 text-amber-800', 'bg-blue-100 text-blue-800', 'bg-emerald-100 text-emerald-800', 'bg-purple-100 text-purple-800'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function InviteModal({ org, onClose, onDone }: { org: Organization; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState([{ name: '', email: '' }]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: string[]; errors: string[] } | null>(null);

  const addRow = () => setRows((r) => [...r, { name: '', email: '' }]);
  const update = (i: number, field: 'name' | 'email', val: string) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const send = async () => {
    setSending(true);
    const res = await inviteMembers(org.id, org.name, org.inviteCode ?? '', rows.filter((r) => r.email));
    setResult(res);
    setSending(false);
    onDone();
  };

  return (
    <Modal title="Invite members" onClose={onClose}>
      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-700">✓ {result.sent} invitation{result.sent !== 1 ? 's' : ''} sent.</p>
          {result.skipped.length > 0 && <p className="text-sm text-stone-500">Skipped (already members): {result.skipped.join(', ')}</p>}
          {result.errors.length > 0 && <p className="text-sm text-red-600">Errors: {result.errors.join(', ')}</p>}
          <button onClick={onClose} className="mt-4 w-full py-2 bg-stone-900 text-stone-50 text-sm">Done</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Enter names and emails. Each person will receive an email with your workspace invite code <strong>{org.inviteCode}</strong>.
          </p>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) => update(i, 'name', e.target.value)}
                  className="px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={row.email}
                  onChange={(e) => update(i, 'email', e.target.value)}
                  className="px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>
            ))}
          </div>

          <button onClick={addRow} className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add another
          </button>

          <div className="flex justify-between pt-2 border-t border-stone-100">
            <button onClick={onClose} className="text-sm text-stone-600 hover:text-stone-900">Cancel</button>
            <button
              onClick={send}
              disabled={sending || rows.every((r) => !r.email)}
              className="px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> {sending ? 'Sending…' : 'Send invites'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InviteCodeModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Modal title="Workspace invite code" onClose={onClose}>
      <p className="text-sm text-stone-600 mb-4">Share this code with anyone you want to invite. They can enter it on the AlkeLedger setup page.</p>
      <div className="bg-stone-900 text-stone-50 px-6 py-5 text-center rounded-sm mb-4">
        <div className="font-display text-5xl tracking-[.3em]">{code}</div>
        <div className="text-xs text-stone-400 mt-2 uppercase tracking-[.2em]">Invite code</div>
      </div>
      <button
        onClick={copy}
        className="w-full py-2.5 border border-stone-300 text-sm text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2"
      >
        {copied ? <><CheckCheck className="w-4 h-4 text-emerald-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy code</>}
      </button>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
