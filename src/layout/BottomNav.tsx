import { Link } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Wallet, MoreHorizontal,
  FolderKanban, FileCheck, Layers, BarChart2,
} from 'lucide-react';
import type { PageId } from './Sidebar';
import type { Organization } from '@/types';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
}

interface Props {
  org: Organization;
  page: PageId;
  slug: string;
  onMore: () => void;
  unreadCounts?: Partial<Record<PageId, number>>;
}

export function BottomNav({ org, page, slug, onMore, unreadCounts }: Props) {
  const items: NavItem[] =
    org.type === 'membership'
      ? [
          { id: 'dashboard', label: 'Home',    icon: LayoutDashboard, href: `/${slug}` },
          { id: 'ledger',    label: 'Ledger',  icon: BookOpen,        href: `/${slug}/ledger` },
          { id: 'members',   label: 'Members', icon: Users,           href: `/${slug}/members` },
          { id: 'dues',      label: 'Dues',    icon: Wallet,          href: `/${slug}/dues` },
        ]
      : org.type === 'cooperative'
      ? [
          { id: 'dashboard', label: 'Home',      icon: LayoutDashboard, href: `/${slug}` },
          { id: 'positions', label: 'Positions',  icon: Layers,          href: `/${slug}/positions` },
          { id: 'proposals', label: 'Proposals',  icon: BarChart2,       href: `/${slug}/proposals` },
          { id: 'projects',  label: 'Projects',   icon: FolderKanban,   href: `/${slug}/projects` },
        ]
      : [
          { id: 'dashboard', label: 'Home',      icon: LayoutDashboard, href: `/${slug}` },
          { id: 'ledger',    label: 'Ledger',    icon: BookOpen,        href: `/${slug}/ledger` },
          { id: 'projects',  label: 'Projects',  icon: FolderKanban,   href: `/${slug}/projects` },
          { id: 'approvals', label: 'Approvals', icon: FileCheck,      href: `/${slug}/approvals` },
        ];

  return (
    <nav
      className="lg:hidden shrink-0 border-t border-stone-200 bg-white flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const active = page === item.id;
        const badge = unreadCounts?.[item.id] ?? 0;
        return (
          <Link
            key={item.id}
            to={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 transition-colors ${
              active ? 'text-[#0E1015]' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <div className="relative">
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.5} />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-[#B23A2A] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        onClick={onMore}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-stone-400 hover:text-stone-600 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">More</span>
      </button>
    </nav>
  );
}
