import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ShieldCheck, Lock, CalendarDays, BarChart2,
  ArrowRight, CheckCircle2, AlertCircle, Clock, Users, Wallet,
} from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { fmt } from '@/lib/format';
import { listMembers, getMember } from '@/services/members';
import { listAnnouncements } from '@/services/announcements';
import { listProjects } from '@/services/projects';
import { listEvents } from '@/services/events';
import { listPolls } from '@/services/votes';
import { can, useRole } from '@/hooks/useRole';
import type {
  LedgerEntry, Member, Announcement, Project, Organization, OrgEvent, Poll,
} from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
  user: AuthUser;
}

export function Dashboard({ org, ledger, user }: Props) {
  const role = useRole(org.id, user.uid);
  const isManager = can.manage(role);

  const [members, setMembers]             = useState<Member[]>([]);
  const [myMember, setMyMember]           = useState<Member | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [projects, setProjects]           = useState<Project[]>([]);
  const [events, setEvents]               = useState<OrgEvent[]>([]);
  const [polls, setPolls]                 = useState<Poll[]>([]);

  useEffect(() => {
    listAnnouncements(org.id).then(setAnnouncements).catch(() => {});
    if (org.type === 'membership') {
      listMembers(org.id).then(setMembers).catch(() => {});
      getMember(org.id, user.uid).then(setMyMember).catch(() => {});
      listEvents(org.id).then(setEvents).catch(() => {});
      listPolls(org.id).then(setPolls).catch(() => {});
    } else {
      listProjects(org.id).then(setProjects).catch(() => {});
    }
  }, [org.id, org.type, user.uid]);

  const orgSlug = org.slug ?? org.id;

  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString();
    return events.filter((e) => e.startDate >= now && !e.cancelled).slice(0, 3);
  }, [events]);

  const activePolls   = useMemo(() => polls.filter((p) => p.status === 'active'), [polls]);
  const unvotedPolls  = useMemo(() => activePolls.filter((p) => !p.votes?.[user.uid]), [activePolls, user.uid]);

  // ── Finance metrics (managers/admins only) ────────────────────────────────
  const totals = useMemo(() => {
    const income  = ledger.filter((l) => l.type === 'income'  && (l.status === 'approved' || l.status === 'anchored')).reduce((s, l) => s + l.amount, 0);
    const expense = ledger.filter((l) => l.type === 'expense' && (l.status === 'approved' || l.status === 'anchored')).reduce((s, l) => s + l.amount, 0);
    const pending  = ledger.filter((l) => l.status === 'pending').length;
    const anchored = ledger.filter((l) => l.anchorStatus === 'anchored').length;
    const ready    = ledger.filter((l) => l.anchorStatus === 'ready').length;
    return { income, expense, net: income - expense, pending, anchored, ready };
  }, [ledger]);

  const spark = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ledger
        .filter((l) => l.type === 'income' && (l.status === 'approved' || l.status === 'anchored') && l.createdAt.startsWith(key))
        .reduce((s, l) => s + l.amount, 0);
    });
  }, [ledger]);

  const periodChange = useMemo(() => {
    const now = new Date();
    const curKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const sumIncome = (k: string) =>
      ledger.filter((l) => l.type === 'income' && (l.status === 'approved' || l.status === 'anchored') && l.createdAt.startsWith(k)).reduce((s, l) => s + l.amount, 0);
    const cur   = sumIncome(curKey);
    const prior = sumIncome(prevKey);
    if (prior === 0) return null;
    return Math.round(((cur - prior) / prior) * 100);
  }, [ledger]);

  const derivedAudit = useMemo(() => {
    type AuditItem = { id: string; at: string; who: string; action: string };
    return ledger
      .flatMap((e): AuditItem[] => {
        if (e.anchorStatus === 'anchored' && e.txHash)
          return [{ id: `anc_${e.id}`, at: e.approvedAt ?? e.createdAt, who: e.approvedBy ?? e.createdBy, action: `Anchored: ${e.description} (${fmt(e.amount, e.currency)})` }];
        if (e.status === 'approved' && e.approvedAt)
          return [{ id: `apv_${e.id}`, at: e.approvedAt, who: e.approvedBy ?? '', action: `Approved: ${e.description}` }];
        if (e.status === 'rejected' && e.approvedAt)
          return [{ id: `rej_${e.id}`, at: e.approvedAt, who: e.approvedBy ?? '', action: `Rejected: ${e.description}` }];
        return [{ id: `crt_${e.id}`, at: e.createdAt, who: e.createdBy, action: `${e.status === 'pending' ? 'Submitted' : 'Created'}: ${e.description}` }];
      })
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5);
  }, [ledger]);

  const memberStats = useMemo(() => ({
    active:    members.filter((m) => m.status === 'active').length,
    pending:   members.filter((m) => m.status === 'pending').length,
    duesPaid:  members.filter((m) => m.status === 'active' && m.duesPaid).length,
    duesUnpaid: members.filter((m) => m.status === 'active' && !m.duesPaid).length,
  }), [members]);

  const sparkMax  = Math.max(...spark, 1);
  const sparkPath = spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${100 - (v / sparkMax) * 100}`).join(' ');

  // ── Project org dashboard (unchanged) ────────────────────────────────────
  if (org.type !== 'membership') {
    return (
      <div className="max-w-7xl p-4 sm:p-6 space-y-6">
        <FinanceKPIs totals={totals} periodChange={periodChange} sparkPath={sparkPath} ledger={ledger} org={org} />
        <div className="grid lg:grid-cols-3 gap-4">
          <RecentActivity ledger={ledger} />
          <AuditTrail items={derivedAudit} />
        </div>
        <div className="bg-white rounded-2xl border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="text-base font-semibold text-stone-900">Projects</h2>
          </div>
          {projects.length === 0 ? (
            <p className="px-6 py-8 text-sm text-stone-400 text-center">No projects added yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 divide-x divide-y divide-stone-100">
              {projects.map((p) => {
                const pct = Math.round((p.spent / p.budget) * 100);
                return (
                  <div key={p.id} className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-stone-900 leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <StatusPill value={p.status} />
                        {p.restricted && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                            <Lock className="w-2.5 h-2.5" />Restricted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-display text-2xl font-semibold text-stone-900 mb-3">
                      {fmt(p.spent)} <span className="text-stone-400 text-lg font-normal">/ {fmt(p.budget)}</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-[#B23A2A]' : pct >= 80 ? 'bg-amber-500' : 'bg-[#2F5D50]'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>{pct}% deployed</span>
                      <span>{p.completedMilestones}/{p.milestones} milestones</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Membership org dashboard ──────────────────────────────────────────────
  return (
    <div className="max-w-7xl p-4 sm:p-6 space-y-6">

      {/* ── Personal status card ─────────────────────────────────────────── */}
      <MemberStatusCard member={myMember} org={org} orgSlug={orgSlug} />

      {/* ── Action items: votes needing attention ────────────────────────── */}
      {unvotedPolls.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-900">
              {unvotedPolls.length} vote{unvotedPolls.length !== 1 ? 's' : ''} need{unvotedPolls.length === 1 ? 's' : ''} your response
            </div>
            <div className="text-xs text-amber-700 mt-0.5 truncate">
              {unvotedPolls.map((p) => p.title).join(' · ')}
            </div>
          </div>
          <Link
            to={`/${orgSlug}/votes`}
            className="shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            Vote now
          </Link>
        </div>
      )}

      {/* ── Main member grid ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Upcoming events — spans 2 cols on large */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-100">
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-stone-400" /> Upcoming events
            </h2>
            <Link to={`/${orgSlug}/events`} className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1 transition-colors">
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="px-6 py-8 text-sm text-stone-400 text-center">No upcoming events scheduled.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {upcomingEvents.map((ev) => {
                const d = new Date(ev.startDate);
                return (
                  <Link
                    key={ev.id}
                    to={`/${orgSlug}/events?openEvent=${ev.id}`}
                    className="flex gap-4 px-4 sm:px-6 py-4 hover:bg-stone-50 active:bg-stone-50 transition-colors"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-stone-900 text-white flex flex-col items-center justify-center">
                      <span className="text-[9px] uppercase font-medium text-white/60 leading-none">
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="font-display text-xl font-semibold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2">{ev.title}</div>
                      <div className="flex flex-wrap items-center gap-x-2 mt-1 text-xs text-stone-400">
                        <span>{d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        {!ev.allDay && <span>· {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                        {ev.location && <span>· {ev.location}</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 shrink-0 self-center" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-2xl border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="text-base font-semibold text-stone-900">Announcements</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {announcements.length === 0 ? (
              <p className="px-6 py-6 text-sm text-stone-400 text-center">No announcements yet.</p>
            ) : announcements.slice(0, 4).map((a) => (
              <div key={a.id} className="px-6 py-4">
                <div className="text-xs text-stone-400 mb-1">{a.date}</div>
                <div className="text-sm font-semibold text-stone-900 leading-snug">{a.title}</div>
                {a.body && <div className="text-xs text-stone-500 mt-1 line-clamp-2">{a.body}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active votes ─────────────────────────────────────────────────── */}
      {activePolls.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-stone-400" /> Active votes
            </h2>
            <Link to={`/${orgSlug}/votes`} className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1 transition-colors">
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-stone-100">
            {activePolls.slice(0, 3).map((p) => {
              const totalVotes = Object.keys(p.votes ?? {}).length;
              const hasVoted   = !!p.votes?.[user.uid];
              return (
                <Link key={p.id} to={`/${orgSlug}/votes?openPoll=${p.id}`} className="block px-6 py-5 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm font-medium text-stone-900 leading-snug">{p.title}</div>
                    {hasVoted ? (
                      <span className="text-[10px] px-2 py-0.5 bg-[#EEF4F1] text-[#2F5D50] border border-[#C2D9D1] rounded-full font-medium shrink-0">Voted</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium shrink-0">Vote now</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <span className="inline-flex items-center gap-1"><BarChart2 className="w-3 h-3" />{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                    {p.deadline && <span>· Due {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Admin / manager layer ─────────────────────────────────────────── */}
      {isManager && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Management view</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          {/* Finance KPIs */}
          <FinanceKPIs totals={totals} periodChange={periodChange} sparkPath={sparkPath} ledger={ledger} org={org} />

          {/* Member stats + dues health */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                <Users className="w-3.5 h-3.5" /> Members
              </div>
              <div className="font-display text-3xl font-semibold text-stone-900">{memberStats.active}</div>
              <div className="text-xs text-stone-400 mt-1">active</div>
              {memberStats.pending > 0 && (
                <div className="mt-2 text-xs text-amber-600 font-medium">{memberStats.pending} pending approval</div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                <Wallet className="w-3.5 h-3.5" /> Dues health
              </div>
              <div className="font-display text-3xl font-semibold text-[#2F5D50]">{memberStats.duesPaid}</div>
              <div className="text-xs text-stone-400 mt-1">paid</div>
              {memberStats.duesUnpaid > 0 && (
                <div className="mt-2 text-xs text-amber-600 font-medium">{memberStats.duesUnpaid} unpaid</div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:col-span-2">
              <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">Pending reviews</div>
              <div className="font-display text-3xl font-semibold text-stone-900">{totals.pending}</div>
              <div className="text-xs text-stone-400 mt-1">ledger entries awaiting approval</div>
              {totals.ready > 0 && (
                <div className="mt-2 text-xs text-[#2F5D50] font-medium">{totals.ready} ready to anchor</div>
              )}
            </div>
          </div>

          {/* Recent activity + Audit trail */}
          <div className="grid lg:grid-cols-3 gap-4">
            <RecentActivity ledger={ledger} />
            <AuditTrail items={derivedAudit} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Member status card ────────────────────────────────────────────────────────

function MemberStatusCard({ member, org, orgSlug }: { member: Member | null; org: Organization; orgSlug: string }) {
  if (!member) return null;

  const isActive  = member.status === 'active';
  const duesPaid  = member.duesPaid;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">{org.name}</div>
          <div className="font-display text-2xl font-semibold text-stone-900">{member.name}</div>
          {member.memberType === 'organization' && member.orgName && (
            <div className="text-sm text-stone-500 mt-0.5">{member.orgName}{member.orgTitle ? ` · ${member.orgTitle}` : ''}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
            isActive ? 'bg-[#EEF4F1] text-[#2F5D50]' : 'bg-stone-100 text-stone-500'
          }`}>
            {isActive
              ? <CheckCircle2 className="w-4 h-4" />
              : <Clock className="w-4 h-4" />
            }
            {isActive ? 'Active member' : member.status.charAt(0).toUpperCase() + member.status.slice(1)}
          </div>
          <Link
            to={`/${orgSlug}/dues`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              duesPaid
                ? 'bg-[#EEF4F1] text-[#2F5D50]'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {duesPaid ? 'Dues paid' : 'Dues unpaid'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Finance KPIs ──────────────────────────────────────────────────────────────

function FinanceKPIs({
  totals, periodChange, sparkPath, ledger, org,
}: {
  totals: { income: number; expense: number; net: number; pending: number; anchored: number; ready: number };
  periodChange: number | null;
  sparkPath: string;
  ledger: LedgerEntry[];
  org: Organization;
}) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="sm:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 relative overflow-hidden">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Net position · YTD</div>
        <div className="font-display text-4xl sm:text-5xl font-semibold leading-none tracking-tight text-stone-900">
          {fmt(totals.net, org.currency)}
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm text-stone-500">
          {periodChange !== null && (
            <span className={`inline-flex items-center gap-1 font-medium ${periodChange >= 0 ? 'text-[#2F5D50]' : 'text-[#B23A2A]'}`}>
              {periodChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {periodChange >= 0 ? '+' : ''}{periodChange}% vs last month
            </span>
          )}
          <span>{ledger.length} records</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute right-6 bottom-6 w-28 h-10 opacity-40">
          <polyline points={sparkPath} fill="none" stroke="#0E1015" strokeWidth="2" strokeLinejoin="round" />
          <polyline points={`${sparkPath} 100,100 0,100`} fill="#0E1015" opacity="0.06" />
        </svg>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Income</div>
        <div className="font-display text-3xl font-semibold text-[#2F5D50] leading-none">{fmt(totals.income, org.currency)}</div>
        <div className="mt-4 text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Expenses</div>
        <div className="font-display text-2xl font-semibold text-stone-700 leading-none">{fmt(totals.expense, org.currency)}</div>
      </div>

      <div className="bg-[#0E1015] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" /> Proof of record
        </div>
        <div className="font-display text-4xl font-semibold leading-none">
          {totals.anchored}
          <span className="text-white/30 text-2xl"> / {ledger.length}</span>
        </div>
        <div className="text-xs text-white/40 mt-1 mb-4">records anchored</div>
        <div className="space-y-2 pt-4 border-t border-white/10 text-xs">
          <div className="flex justify-between text-white/50">
            <span>Pending review</span>
            <span className="font-mono text-white/70">{totals.pending}</span>
          </div>
          <div className="flex justify-between text-white/50">
            <span>Ready to anchor</span>
            <span className="font-mono text-[#8CC5B0]">{totals.ready}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Recent activity ───────────────────────────────────────────────────────────

function RecentActivity({ ledger }: { ledger: LedgerEntry[] }) {
  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
        <h2 className="text-base font-semibold text-stone-900">Recent activity</h2>
        <span className="text-xs text-stone-400">{ledger.length} entries</span>
      </div>
      <div className="divide-y divide-stone-100">
        {ledger.length === 0 ? (
          <p className="px-6 py-8 text-sm text-stone-400 text-center">No ledger entries yet.</p>
        ) : ledger.slice(0, 6).map((e) => (
          <div key={e.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-stone-50 transition-colors">
            <div className={`w-2 h-2 rounded-full shrink-0 ${e.type === 'income' ? 'bg-[#2F5D50]' : 'bg-[#B23A2A]'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-stone-900 truncate">{e.description}</div>
              <div className="text-xs text-stone-400 mt-0.5 truncate">{e.category} · {e.createdAt.slice(0, 10)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-sm font-semibold font-mono ${e.type === 'income' ? 'text-[#2F5D50]' : 'text-stone-700'}`}>
                {e.type === 'income' ? '+' : '−'}{fmt(e.amount, e.currency)}
              </div>
            </div>
            <div className="shrink-0 hidden sm:block">
              <StatusPill value={e.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Audit trail ───────────────────────────────────────────────────────────────

function AuditTrail({ items }: { items: { id: string; at: string; who: string; action: string }[] }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200">
      <div className="px-6 py-4 border-b border-stone-100">
        <h2 className="text-base font-semibold text-stone-900">Audit trail</h2>
      </div>
      <div className="px-6 py-5 relative">
        {items.length > 0 && (
          <div className="absolute left-[30px] top-5 bottom-5 w-px bg-stone-200" />
        )}
        <div className="space-y-5">
          {items.length === 0 ? (
            <p className="text-xs text-stone-400">No activity yet.</p>
          ) : items.map((a) => (
            <div key={a.id} className="relative pl-7">
              <div className="absolute left-[-1px] top-1.5 w-2.5 h-2.5 bg-white border-2 border-stone-400 rounded-full" />
              <div className="text-sm text-stone-800 leading-snug">{a.action}</div>
              <div className="text-xs text-stone-400 mt-0.5">{a.at.slice(0, 10)} · {a.who}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
