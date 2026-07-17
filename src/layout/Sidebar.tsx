import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Wallet, BookOpen, FileText, Inbox,
  BarChart2, BarChart3, Settings, FolderKanban, PieChart, ArrowDownToLine, ArrowUpFromLine,
  Globe, LogOut, X, Plus, CalendarDays, BadgeCheck, Award, FileCheck, Receipt, Scale, ChevronRight, Layers,
} from 'lucide-react';
import { LedgerMark } from '@/components/LedgerMark';
import { OrgSwitcher } from './OrgSwitcher';
import { useRole, can } from '@/hooks/useRole';
import type { Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

export type PageId =
  | 'dashboard' | 'members' | 'dues' | 'ledger' | 'calendar' | 'proposals' | 'requests'
  | 'projects' | 'budgets' | 'income' | 'expenses' | 'approvals' | 'positions'
  | 'transactions' | 'documents' | 'decisions'
  | 'files' | 'verify' | 'credentials' | 'reports' | 'transparency' | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  children?: NavItem[];
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

interface Props {
  org: Organization;
  orgs: Organization[];
  pendingOrgs?: Organization[];
  slug: string;
  onSwitchOrg: (id: string) => void;
  page: PageId;
  onExit: () => void;
  onClose?: () => void;
  onNewOrg?: () => void;
  user: AuthUser;
  unreadCounts?: Partial<Record<PageId, number>>;
}

export function Sidebar({ org, orgs, pendingOrgs, slug, onSwitchOrg, page, onExit, onClose, onNewOrg, user, unreadCounts }: Props) {
  const role = useRole(org.id, user.uid);
  const isAdmin = can.manage(role);

  const groups: NavGroup[] = useMemo(() => {
    const general: NavItem[] = org.type === 'membership'
      ? [
          { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
          { id: 'dues',          label: 'Dues',           icon: Wallet          },
          { id: 'requests',      label: 'Requests',       icon: Inbox           },
          { id: 'proposals',     label: 'Proposals',      icon: BarChart2       },
          { id: 'calendar',      label: 'Calendar',       icon: CalendarDays    },
        ]
      : org.type === 'cooperative'
      ? [
          { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
          { id: 'positions',  label: 'Positions',   icon: Layers          },
          { id: 'proposals',  label: 'Proposals',   icon: BarChart2       },
          { id: 'projects',   label: 'Projects',    icon: FolderKanban    },
          { id: 'requests',   label: 'Requests',    icon: Inbox           },
          { id: 'calendar',   label: 'Calendar',    icon: CalendarDays    },
        ]
      : [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'projects',  label: 'Projects',   icon: FolderKanban    },
          { id: 'budgets',   label: 'Budgets',    icon: PieChart        },
          { id: 'income',    label: 'Income',     icon: ArrowDownToLine },
          { id: 'expenses',  label: 'Expenses',   icon: ArrowUpFromLine },
          { id: 'approvals', label: 'Approvals',  icon: FileCheck       },
        ];

    const organization: NavItem[] = [
      { id: 'files',   label: 'Files',  icon: FileText },
      { id: 'members', label: 'People', icon: Users    },
      ...(isAdmin
        ? [
            { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
            ...(org.type === 'project' || org.type === 'cooperative' ? [{ id: 'transparency' as const, label: 'Transparency Page', icon: Globe }] : []),
            { id: 'settings' as const, label: 'Settings', icon: Settings },
          ]
        : []),
    ];

    return [
      { label: null,           items: general },
      { label: 'Organization', items: organization },
    ];
  }, [org.type, isAdmin]);

  // Ledger/proof-of-record tooling — not every org wants to anchor and verify
  // records, so this lives last, tucked under a collapsed "Advanced" disclosure
  // instead of a normal always-open group.
  const advancedItems: NavItem[] = [
    {
      id: 'ledger', label: 'Ledger', icon: BookOpen,
      children: [
        { id: 'transactions', label: 'Transactions', icon: Receipt },
        { id: 'credentials',  label: 'Credentials',  icon: Award   },
        { id: 'documents',    label: 'Documents',    icon: FileText },
        { id: 'decisions',    label: 'Decisions',    icon: Scale   },
      ],
    },
    { id: 'verify', label: 'Verify a record', icon: BadgeCheck },
  ];

  function containsPage(items: NavItem[], id: PageId): boolean {
    return items.some((item) => item.id === id || item.children?.some((c) => c.id === id));
  }

  const [expanded, setExpanded] = useState<Set<PageId>>(() => {
    const initial = new Set<PageId>();
    for (const group of groups) {
      for (const item of group.items) {
        if (item.children && (item.id === page || item.children.some((c) => c.id === page))) {
          initial.add(item.id);
        }
      }
    }
    return initial;
  });

  const [advancedOpen, setAdvancedOpen] = useState(() => containsPage(advancedItems, page));

  // Navigating (not just clicking) to a parent or one of its children keeps that
  // section expanded, without fighting a manual collapse made while already there.
  useEffect(() => {
    for (const group of groups) {
      for (const item of group.items) {
        if (item.children && (item.id === page || item.children.some((c) => c.id === page))) {
          setExpanded((prev) => (prev.has(item.id) ? prev : new Set(prev).add(item.id)));
        }
      }
    }
    if (containsPage(advancedItems, page)) {
      setAdvancedOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function toggleExpanded(id: PageId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderItem(item: NavItem) {
    const to        = item.id === 'dashboard' ? `/${slug}` : `/${slug}/${item.id}`;
    const active    = page === item.id;
    const badge     = unreadCounts?.[item.id] ?? 0;
    const isOpen    = item.children ? expanded.has(item.id) : false;
    return (
      <div key={item.id}>
        <Link
          to={to}
          onClick={() => { if (item.children) toggleExpanded(item.id); }}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            active
              ? 'bg-[rgba(239,233,220,0.1)] text-[#EFE9DC]'
              : 'text-[#A9AEB8] hover:bg-[rgba(239,233,220,0.06)] hover:text-[#EFE9DC]'
          }`}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {badge > 0 && (
            <span className={`min-w-[18px] h-5 text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none ${
              active ? 'bg-[#EFE9DC]/20 text-[#EFE9DC]' : 'bg-[#8A1E2D] text-[#EFE9DC]'
            }`}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          {item.children && (
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          )}
        </Link>
        {item.children && isOpen && (
          <div className="ml-4 pl-3 border-l border-[rgba(239,233,220,0.1)] space-y-0.5 mt-0.5">
            {item.children.map((child) => {
              const childActive = page === child.id;
              return (
                <Link
                  key={child.id}
                  to={`/${slug}/${child.id}`}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                    childActive
                      ? 'bg-[rgba(239,233,220,0.1)] text-[#EFE9DC]'
                      : 'text-[#8A8F99] hover:bg-[rgba(239,233,220,0.06)] hover:text-[#EFE9DC]'
                  }`}
                >
                  <child.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const initials = user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="w-64 h-full border-r border-[rgba(239,233,220,0.1)] bg-[#171B21] flex flex-col">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-[rgba(239,233,220,0.1)] flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-serif text-lg font-semibold text-[#EFE9DC]">
          <LedgerMark vellum />
          Scribb
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-[#8A8F99] hover:text-[#EFE9DC] p-1 rounded-lg hover:bg-[rgba(239,233,220,0.08)] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <OrgSwitcher orgs={orgs} pendingOrgs={pendingOrgs} current={org} onSwitch={onSwitchOrg} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label ?? 'general'}>
            {group.label && (
              <div className="px-3 pt-4 pb-1.5 font-plex text-[9.5px] uppercase tracking-[0.18em] text-[#5F6570]">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(renderItem)}
            </div>
          </div>
        ))}

        {/* Advanced: Ledger / proof-of-record tooling. Collapsed by default —
            most orgs never need this; it's here for the ones that do. */}
        <div>
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 pt-4 pb-1.5 font-plex text-[9.5px] uppercase tracking-[0.18em] text-[#5F6570] hover:text-[#8A8F99] transition-colors"
          >
            <span className="flex-1 text-left">Advanced</span>
            <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${advancedOpen ? 'rotate-90' : ''}`} />
          </button>
          {advancedOpen && (
            <div className="space-y-0.5">
              {advancedItems.map(renderItem)}
            </div>
          )}
        </div>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-[rgba(239,233,220,0.1)] space-y-1">
        {onNewOrg && (
          <button
            onClick={onNewOrg}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#8A8F99] hover:text-[#EFE9DC] hover:bg-[rgba(239,233,220,0.06)] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New workspace
          </button>
        )}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#8A1E2D] text-[#EFE9DC] flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#EFE9DC] truncate">{user.displayName}</div>
            <div className="text-[11px] text-[#5F6570] truncate">{user.email}</div>
          </div>
          <button onClick={onExit} className="text-[#5F6570] hover:text-[#EFE9DC] shrink-0 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
