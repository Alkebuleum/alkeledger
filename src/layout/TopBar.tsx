import { Search, Plus, Menu } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import type { Organization, AppNotif } from '@/types';
import type { PageId } from './Sidebar';

interface Props {
  org: Organization;
  page: PageId;
  onNewEntry: () => void;
  onMenuToggle: () => void;
  notifs: AppNotif[];
  totalUnread: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function TopBar({ org, page: _page, onNewEntry, onMenuToggle, notifs, totalUnread, onMarkRead, onMarkAllRead }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#DCD6C6] bg-[#F6F4ED]/90 backdrop-blur-md shrink-0">
      <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 text-[#5A5F67] hover:bg-[#EFECE2] rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#171B21] truncate">{org.name}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-[#8A8F99] hover:bg-[#EFECE2] rounded-lg border border-[#DCD6C6] bg-[#FDFCF8] transition-colors">
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
          <button className="sm:hidden p-2 text-[#8A8F99] hover:bg-[#EFECE2] rounded-lg border border-[#DCD6C6] bg-[#FDFCF8] transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <NotificationBell
            notifs={notifs}
            totalUnread={totalUnread}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
          />
          <button
            onClick={onNewEntry}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#8A1E2D] text-[#EFE9DC] text-sm font-medium rounded-lg hover:bg-[#761826] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New entry</span>
          </button>
        </div>
      </div>
    </header>
  );
}
