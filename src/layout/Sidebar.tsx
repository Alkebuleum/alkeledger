import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Wallet, BookOpen, Megaphone, FileText, Inbox,
  BarChart3, BarChart2, Settings, FolderKanban, PieChart, ArrowDownToLine, ArrowUpFromLine,
  ShieldCheck, Globe, FileCheck, LogOut, X, Plus, CalendarDays,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
import { OrgSwitcher } from './OrgSwitcher';
import { useRole, can } from '@/hooks/useRole';
import type { Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

export type PageId =
  | 'dashboard' | 'members' | 'dues' | 'ledger' | 'announcements' | 'events' | 'votes' | 'requests'
  | 'projects' | 'budgets' | 'income' | 'expenses' | 'approvals'
  | 'documents' | 'reports' | 'transparency' | 'anchors' | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
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

  const nav: NavItem[] = useMemo(() => {
    const common: NavItem[] = [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    const memberTail: NavItem[] = [{ id: 'documents', label: 'Documents', icon: FileText }];
    const adminTail: NavItem[] = [
      { id: 'reports',  label: 'Reports',          icon: BarChart3   },
      { id: 'anchors',  label: 'Proof & Anchoring', icon: ShieldCheck },
      { id: 'settings', label: 'Settings',          icon: Settings    },
    ];
    const tail = isAdmin ? [...memberTail, ...adminTail] : memberTail;

    if (org.type === 'membership') {
      return [
        ...common,
        { id: 'members',       label: 'Members',       icon: Users        },
        { id: 'dues',          label: 'Dues',           icon: Wallet       },
        { id: 'ledger',        label: 'Ledger',         icon: BookOpen     },
        { id: 'announcements', label: 'Announcements',  icon: Megaphone    },
        { id: 'events',        label: 'Events',         icon: CalendarDays },
        { id: 'votes',         label: 'Votes',          icon: BarChart2    },
        { id: 'requests',      label: 'Requests',       icon: Inbox        },
        ...tail,
      ];
    }

    return [
      ...common,
      { id: 'projects',     label: 'Projects',         icon: FolderKanban    },
      { id: 'budgets',      label: 'Budgets',           icon: PieChart        },
      { id: 'income',       label: 'Income',            icon: ArrowDownToLine },
      { id: 'expenses',     label: 'Expenses',          icon: ArrowUpFromLine },
      { id: 'approvals',    label: 'Approvals',         icon: FileCheck       },
      ...memberTail,
      { id: 'transparency', label: 'Transparency Page', icon: Globe           },
      ...(isAdmin ? adminTail : []),
    ];
  }, [org.type, isAdmin]);

  const initials = user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="w-64 h-full border-r border-stone-200 bg-white flex flex-col">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <Brand small />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <OrgSwitcher orgs={orgs} pendingOrgs={pendingOrgs} current={org} onSwitch={onSwitchOrg} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const to     = item.id === 'dashboard' ? `/${slug}` : `/${slug}/${item.id}`;
          const active = page === item.id;
          const badge  = unreadCounts?.[item.id] ?? 0;
          return (
            <Link
              key={item.id}
              to={to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#0E1015] text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className={`min-w-[18px] h-5 text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none ${
                  active ? 'bg-white/20 text-white' : 'bg-[#B23A2A] text-white'
                }`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-stone-100 space-y-1">
        {onNewOrg && (
          <button
            onClick={onNewOrg}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New workspace
          </button>
        )}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#0E1015] text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-stone-900 truncate">{user.displayName}</div>
            <div className="text-[11px] text-stone-400 truncate">{user.email}</div>
          </div>
          <button onClick={onExit} className="text-stone-400 hover:text-stone-700 shrink-0 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
