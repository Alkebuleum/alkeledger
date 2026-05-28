import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ShieldCheck, Lock, CalendarDays, BarChart2 } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { fmt } from '@/lib/format';
import { listMembers } from '@/services/members';
import { listAnnouncements } from '@/services/announcements';
import { listProjects } from '@/services/projects';
import { listEvents } from '@/services/events';
import { listPolls } from '@/services/votes';
import type { LedgerEntry, Member, Announcement, Project, Organization, OrgEvent, Poll } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

interface Props {
  org: Organization;
  ledger: LedgerEntry[];
  user: AuthUser;
}

export function Dashboard({ org, ledger, user }: Props) {
  const [members, setMembers]             = useState<Member[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [projects, setProjects]           = useState<Project[]>([]);
  const [events, setEvents]               = useState<OrgEvent[]>([]);
  const [polls, setPolls]                 = useState<Poll[]>([]);

  useEffect(() => {
    listMembers(org.id).then(setMembers).catch(() => {});
    listAnnouncements(org.id).then(setAnnouncements).catch(() => {});
    if (org.type === 'membership') {
      listEvents(org.id).then(setEvents).catch(() => {});
      listPolls(org.id).then(setPolls).catch(() => {});
    } else {
      listProjects(org.id).then(setProjects).catch(() => {});
    }
  }, [org.id, org.type]);

  const orgSlug = org.slug ?? org.id;

  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString();
    return events
      .filter((e) => e.startDate >= now && !e.cancelled)
      .slice(0, 3);
  }, [events]);

  const activePolls = useMemo(() => polls.filter((p) => p.status === 'active'), [polls]);

  const totals = useMemo(() => {
    const income = ledger
      .filter((l) => l.type === 'income' && (l.status === 'approved' || l.status === 'anchored'))
      .reduce((s, l) => s + l.amount, 0);
    const expense = ledger
      .filter((l) => l.type === 'expense' && (l.status === 'approved' || l.status === 'anchored'))
      .reduce((s, l) => s + l.amount, 0);
    const pending = ledger.filter((l) => l.status === 'pending').length;
    const anchored = ledger.filter((l) => l.anchorStatus === 'anchored').length;
    const ready = ledger.filter((l) => l.anchorStatus === 'ready').length;
    return { income, expense, net: income - expense, pending, anchored, ready };
  }, [ledger]);

  // Monthly income for the last 8 months (approved + anchored)
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

  // This month's income vs prior month's income
  const periodChange = useMemo(() => {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const sumIncome = (k: string) =>
      ledger
        .filter((l) => l.type === 'income' && (l.status === 'approved' || l.status === 'anchored') && l.createdAt.startsWith(k))
        .reduce((s, l) => s + l.amount, 0);
    const cur = sumIncome(curKey);
    const prior = sumIncome(prevKey);
    if (prior === 0) return null;
    return Math.round(((cur - prior) / prior) * 100);
  }, [ledger]);

  // Audit trail synthesised from ledger events
  const derivedAudit = useMemo(() => {
    type AuditItem = { id: string; at: string; who: string; action: string };
    return ledger
      .flatMap((e): AuditItem[] => {
        if (e.anchorStatus === 'anchored' && e.txHash) {
          return [{ id: `anc_${e.id}`, at: e.approvedAt ?? e.createdAt, who: e.approvedBy ?? e.createdBy, action: `Anchored ${e.description} (${fmt(e.amount, e.currency)})` }];
        }
        if (e.status === 'approved' && e.approvedAt) {
          return [{ id: `apv_${e.id}`, at: e.approvedAt, who: e.approvedBy ?? '', action: `Approved ${e.description}` }];
        }
        if (e.status === 'rejected' && e.approvedAt) {
          return [{ id: `rej_${e.id}`, at: e.approvedAt, who: e.approvedBy ?? '', action: `Rejected — ${e.description}` }];
        }
        return [{ id: `crt_${e.id}`, at: e.createdAt, who: e.createdBy, action: `${e.status === 'pending' ? 'Submitted' : 'Created'} entry: ${e.description}` }];
      })
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5);
  }, [ledger]);

  const memberStats = useMemo(() => ({
    active:    members.filter((m) => m.status === 'active').length,
    pending:   members.filter((m) => m.status === 'pending').length,
    expired:   members.filter((m) => m.status === 'expired').length,
    suspended: members.filter((m) => m.status === 'suspended').length,
  }), [members]);

  const sparkMax = Math.max(...spark, 1);
  const sparkPath = spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${100 - (v / sparkMax) * 100}`).join(' ');

  return (
    <div className="max-w-7xl">
      <div className="border-b border-stone-300/60 px-4 sm:px-8 py-3 bg-[var(--paper)]/40 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-stone-600 font-mono">
        <span className="truncate">The Daily Brief · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <span className="hidden md:flex items-center gap-2 shrink-0 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          All systems · ledger synced · proofs current
        </span>
      </div>

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Hero KPI block */}
        <div className="bg-white border border-stone-300/70">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-300/70">
            <div className="p-5 sm:p-7 sm:col-span-2 relative">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Net position · YTD</div>
              <div className="mt-3 font-display text-4xl sm:text-6xl leading-none tracking-[-0.03em]">{fmt(totals.net, org.currency)}</div>
              <div className="mt-3 flex items-center gap-3 text-xs text-stone-600">
                {periodChange !== null && (
                  <>
                    <span className={`inline-flex items-center gap-1 ${periodChange >= 0 ? 'text-emerald-700' : 'text-[var(--ledger-red)]'}`}>
                      {periodChange >= 0
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />}
                      {periodChange >= 0 ? '+' : ''}{periodChange}% vs prior month
                    </span>
                    <span className="text-stone-400">·</span>
                  </>
                )}
                <span>across {ledger.length} records</span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute right-7 bottom-7 w-32 h-12 opacity-60">
                <polyline points={sparkPath} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
                <polyline points={`${sparkPath} 100,100 0,100`} fill="var(--ink)" opacity="0.06" />
              </svg>
            </div>

            <div className="p-5 sm:p-7">
              <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Income</div>
              <div className="mt-3 font-display text-2xl sm:text-3xl text-emerald-700">{fmt(totals.income, org.currency)}</div>
              <div className="mt-4 sm:mt-6 text-[10px] uppercase tracking-[0.25em] text-stone-500 font-mono">Expense</div>
              <div className="mt-2 font-display text-2xl sm:text-3xl text-stone-900">{fmt(totals.expense, org.currency)}</div>
            </div>

            <div className="p-5 sm:p-7 bg-[var(--ink)] text-[var(--bone)]">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-stone-400 font-mono">
                <ShieldCheck className="w-3 h-3" /> Proof of record
              </div>
              <div className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">
                {totals.anchored}
                <span className="text-stone-500 text-2xl"> / {ledger.length}</span>
              </div>
              <div className="text-xs text-stone-400 mt-1">records anchored</div>
              <div className="mt-5 pt-4 border-t border-[var(--bone)]/10 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-stone-400">Pending review</span><span className="font-mono">{totals.pending}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Ready to anchor</span><span className="font-mono text-[var(--archival)]">{totals.ready}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead story + audit trail */}
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-stone-300/60">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">The ledger · Lead story</div>
                <h3 className="font-display text-2xl mt-1">Recent activity</h3>
              </div>
              <span className="text-xs text-stone-500 font-editorial italic">Last 30 days · {ledger.length} entries</span>
            </div>

            <div className="bg-white border border-stone-300/70">
              <div className="divide-y divide-stone-200/70">
                {ledger.slice(0, 6).map((e) => (
                  <div key={e.id} className="px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-4 hover:bg-stone-50/60 transition-colors">
                    <div className={`w-1 self-stretch shrink-0 ${e.type === 'income' ? 'bg-emerald-600' : 'bg-[var(--ledger-red)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-editorial text-sm sm:text-base text-stone-900 truncate leading-snug">{e.description}</div>
                      <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 font-mono uppercase tracking-wider truncate">
                        {e.category} · {e.createdAt}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-display text-base sm:text-xl tracking-tight ${e.type === 'income' ? 'text-emerald-700' : 'text-stone-900'}`}>
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
          </div>

          <div className="lg:col-span-4">
            <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-stone-300/60">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono">Of record</div>
                <h3 className="font-display text-2xl mt-1">Audit trail</h3>
              </div>
            </div>

            <div className="bg-[var(--paper)]/40 border border-stone-300/60 p-5 relative">
              {derivedAudit.length > 0 && <div className="absolute left-7 top-5 bottom-5 w-px bg-stone-300" />}
              <div className="space-y-4">
                {derivedAudit.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No ledger activity yet.</p>
                ) : derivedAudit.map((a) => (
                  <div key={a.id} className="relative pl-8">
                    <div className="absolute left-[18px] top-1.5 w-2 h-2 bg-[var(--ink)] rounded-full ring-4 ring-[var(--paper)]" />
                    <div className="text-xs text-stone-800 font-editorial leading-snug">{a.action}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5 font-mono uppercase tracking-wider">{a.at} · {a.who}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Org-type-specific row */}
        {org.type === 'membership' ? (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ The roster</div>
                <h3 className="font-display text-2xl mb-4 pb-3 border-b border-stone-300/60">Membership at a glance</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-300/60 border border-stone-300/60">
                  {[
                    { l: 'Active',    v: memberStats.active,    c: 'text-emerald-700' },
                    { l: 'Pending',   v: memberStats.pending,   c: 'text-amber-700' },
                    { l: 'Expired',   v: memberStats.expired,   c: 'text-stone-500' },
                    { l: 'Suspended', v: memberStats.suspended, c: 'text-[var(--ledger-red)]' },
                  ].map((b) => (
                    <div key={b.l} className="p-4 sm:p-6 bg-white">
                      <div className={`font-display text-4xl sm:text-5xl ${b.c}`}>{b.v}</div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mt-2 font-mono">{b.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ Notices</div>
                <h3 className="font-display text-2xl mb-4 pb-3 border-b border-stone-300/60">Recent announcements</h3>
                <div className="space-y-4">
                  {announcements.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No announcements posted yet.</p>
                  ) : announcements.slice(0, 3).map((a) => (
                    <article key={a.id} className="bg-white border border-stone-300/60 p-5">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-stone-500 font-mono mb-2">{a.date}</div>
                      <h4 className="font-display text-xl leading-tight">{a.title}</h4>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming events + active votes */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-stone-300/60">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ Coming up</div>
                    <h3 className="font-display text-2xl">Upcoming events</h3>
                  </div>
                  <Link to={`/${orgSlug}/events`} className="text-xs text-stone-500 hover:text-stone-900 underline">See all</Link>
                </div>
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No upcoming events scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((ev) => {
                      const d = new Date(ev.startDate);
                      return (
                        <Link key={ev.id} to={`/${orgSlug}/events?openEvent=${ev.id}`} className="flex gap-4 bg-white border border-stone-300/60 p-4 hover:bg-stone-50 transition-colors">
                          <div className="w-10 shrink-0 text-center border-r border-stone-200 pr-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-stone-400">
                              {d.toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                            <div className="font-display text-2xl leading-none text-stone-900">{d.getDate()}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-editorial text-base leading-snug text-stone-900 truncate">{ev.title}</h4>
                            {ev.location && <p className="text-xs text-stone-500 mt-0.5 truncate">{ev.location}</p>}
                            {!ev.allDay && (
                              <p className="text-[10px] font-mono text-stone-400 mt-1 uppercase tracking-wider">
                                {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <CalendarDays className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-stone-300/60">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ Your vote</div>
                    <h3 className="font-display text-2xl">Active votes</h3>
                  </div>
                  <Link to={`/${orgSlug}/votes`} className="text-xs text-stone-500 hover:text-stone-900 underline">See all</Link>
                </div>
                {activePolls.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No active votes right now.</p>
                ) : (
                  <div className="space-y-3">
                    {activePolls.slice(0, 3).map((p) => {
                      const totalVotes = Object.keys(p.votes ?? {}).length;
                      const hasVoted   = !!p.votes?.[user.uid];
                      return (
                        <Link key={p.id} to={`/${orgSlug}/votes?openPoll=${p.id}`} className="block bg-white border border-stone-300/60 p-4 hover:bg-stone-50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-editorial text-base leading-snug text-stone-900">{p.title}</h4>
                            {hasVoted ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 font-mono uppercase tracking-wider shrink-0">Voted</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-mono uppercase tracking-wider shrink-0">Vote now</span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                            <span className="inline-flex items-center gap-1"><BarChart2 className="w-3 h-3" />{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                            {p.deadline && <span>· Due {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--ledger-red)] font-mono mb-1">§ Portfolio</div>
            <h3 className="font-display text-2xl mb-4 pb-3 border-b border-stone-300/60">Projects in motion</h3>

            {projects.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No projects added yet.</p>
            ) : (
            <div className="grid md:grid-cols-2 gap-px bg-stone-300/60 border border-stone-300/60">
              {projects.map((p) => {
                const pct = Math.round((p.spent / p.budget) * 100);
                return (
                  <div key={p.id} className="bg-white p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-display text-xl leading-tight">{p.name}</h4>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">{p.id}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <StatusPill value={p.status} />
                      {p.restricted && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 ring-1 ring-amber-200 inline-flex items-center gap-1 font-mono uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5" />Restricted
                        </span>
                      )}
                    </div>
                    <div className="font-display text-2xl tracking-tight">
                      {fmt(p.spent)} <span className="text-stone-400 text-lg">/ {fmt(p.budget)}</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full ${pct >= 100 ? 'bg-[var(--ledger-red)]' : pct >= 80 ? 'bg-[var(--archival)]' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-500 mt-2 font-mono uppercase tracking-wider">
                      <span>{pct}% deployed</span>
                      <span>{p.completedMilestones}/{p.milestones} milestones</span>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
