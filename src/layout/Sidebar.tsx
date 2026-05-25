import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Wallet, BookOpen, Megaphone, FileText, Inbox,
  BarChart3, Settings, FolderKanban, PieChart, ArrowDownToLine, ArrowUpFromLine,
  ShieldCheck, Globe, FileCheck, LogOut, X, Plus,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
import { OrgSwitcher } from './OrgSwitcher';
import type { Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

export type PageId =
  | 'dashboard' | 'members' | 'dues' | 'ledger' | 'announcements' | 'requests'
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
  slug: string;
  onSwitchOrg: (id: string) => void;
  page: PageId;
  onExit: () => void;
  onClose?: () => void;
  onNewOrg?: () => void;
  user: AuthUser;
}

export function Sidebar({ org, orgs, slug, onSwitchOrg, page, onExit, onClose, onNewOrg, user }: Props) {
  const nav: NavItem[] = useMemo(() => {
    const common: NavItem[] = [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
    const tail: NavItem[] = [
      { id: 'documents', label: 'Documents', icon: FileText },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'anchors', label: 'Proof & Anchoring', icon: ShieldCheck },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    if (org.type === 'membership') {
      return [
        ...common,
        { id: 'members', label: 'Members', icon: Users },
        { id: 'dues', label: 'Dues', icon: Wallet },
        { id: 'ledger', label: 'Ledger', icon: BookOpen },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'requests', label: 'Requests', icon: Inbox },
        ...tail,
      ];
    }

    return [
      ...common,
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'budgets', label: 'Budgets', icon: PieChart },
      { id: 'income', label: 'Income', icon: ArrowDownToLine },
      { id: 'expenses', label: 'Expenses', icon: ArrowUpFromLine },
      { id: 'approvals', label: 'Approvals', icon: FileCheck },
      ...tail.slice(0, 1),
      { id: 'transparency', label: 'Transparency Page', icon: Globe },
      ...tail.slice(1),
    ];
  }, [org.type]);

  return (
    <aside className="w-64 h-full border-r border-stone-200 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-stone-200 flex items-center justify-between">
        <Brand small />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-stone-400 hover:text-stone-900 p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <OrgSwitcher orgs={orgs} current={org} onSwitch={onSwitchOrg} />

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const to = item.id === 'dashboard' ? `/${slug}` : `/${slug}/${item.id}`;
          const active = page === item.id;
          return (
            <Link
              key={item.id}
              to={to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? 'bg-stone-900 text-stone-50' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-stone-200 space-y-1">
        {onNewOrg && (
          <button
            onClick={onNewOrg}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md"
          >
            <Plus className="w-3.5 h-3.5" /> New workspace
          </button>
        )}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-semibold shrink-0">
            {user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-stone-900 truncate">{user.displayName}</div>
            <div className="text-[11px] text-stone-500 truncate">{user.email}</div>
          </div>
          <button onClick={onExit} className="text-stone-400 hover:text-stone-900 shrink-0" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
