import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgs } from '@/hooks/useOrg';
import { useLedger } from '@/hooks/useLedger';
import { AppShell } from '@/layout/AppShell';
import type { PageId } from '@/layout/Sidebar';
import { Landing } from '@/pages/Landing';
import { SignIn } from '@/pages/SignIn';
import { OrgSetup } from '@/pages/OrgSetup';
import { Dashboard } from '@/pages/Dashboard';
import { Ledger } from '@/pages/Ledger';
import { Members } from '@/pages/Members';
import { Dues } from '@/pages/Dues';
import { Announcements } from '@/pages/Announcements';
import { Requests } from '@/pages/Requests';
import { Projects } from '@/pages/Projects';
import { Budgets } from '@/pages/Budgets';
import { Approvals } from '@/pages/Approvals';
import { Documents } from '@/pages/Documents';
import { Reports } from '@/pages/Reports';
import { Transparency } from '@/pages/Transparency';
import { Anchors } from '@/pages/Anchors';
import { Settings } from '@/pages/Settings';
import { NewEntryModal } from '@/modals/NewEntryModal';
import type { LedgerEntry, LedgerStatus } from '@/types';

type UIStage = 'landing' | 'signin' | 'setup';

export default function App() {
  const { user, loading: authLoading, requestOtp, verifyOtp, signOut } = useAuth();
  const { orgs, currentOrg, currentOrgId, setCurrentOrgId, addOrg, joinOrg, loading: orgsLoading } = useOrgs(user);
  const { entries: ledger, createEntry, setStatus, anchor } = useLedger(currentOrgId);

  const [uiStage, setUiStage] = useState<UIStage>('landing');
  const [page, setPage] = useState<PageId>('dashboard');
  const [showNewEntry, setShowNewEntry] = useState(false);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-editorial italic">
        Loading…
      </div>
    );
  }

  // ── Unauthenticated ─────────────────────────────────────────────────────────
  if (!user) {
    if (uiStage === 'signin') {
      return (
        <SignIn
          onBack={() => setUiStage('landing')}
          onRequestOtp={requestOtp}
          onVerifyOtp={verifyOtp}
        />
      );
    }
    return (
      <Landing
        onStart={() => setUiStage('signin')}
        onDemo={() => setUiStage('signin')}
      />
    );
  }

  // ── Authenticated: org loading ───────────────────────────────────────────────
  if (orgsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-editorial italic">
        Loading workspace…
      </div>
    );
  }

  // ── Authenticated: no orgs yet → setup ─────────────────────────────────────
  if (orgs.length === 0 || uiStage === 'setup') {
    return (
      <OrgSetup
        onCreate={async (org) => {
          await addOrg(org);
          setUiStage('landing'); // clear setup stage
          setPage('dashboard');
        }}
        onJoin={async (code) => {
          await joinOrg(code);
          setUiStage('landing');
          setPage('dashboard');
        }}
        onCancel={orgs.length > 0 ? () => setUiStage('landing') : undefined}
        user={user}
      />
    );
  }

  // ── Authenticated: no org selected ──────────────────────────────────────────
  if (!currentOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-editorial italic">
        No organization selected.
      </div>
    );
  }

  const handleSaveEntry = async (entry: LedgerEntry) => {
    await createEntry(entry);
    setShowNewEntry(false);
  };

  return (
    <>
      <AppShell
        org={currentOrg}
        orgs={orgs}
        onSwitchOrg={setCurrentOrgId}
        page={page}
        setPage={setPage}
        onNewEntry={() => setShowNewEntry(true)}
        onExit={signOut}
        onNewOrg={() => setUiStage('setup')}
        user={user}
      >
        <PageRouter
          page={page}
          orgId={currentOrgId!}
          ledger={ledger}
          org={currentOrg}
          user={user}
          onApprove={setStatus}
          onAnchor={anchor}
        />
      </AppShell>

      {showNewEntry && (
        <NewEntryModal
          org={currentOrg}
          user={user}
          onClose={() => setShowNewEntry(false)}
          onSave={handleSaveEntry}
        />
      )}
    </>
  );
}

interface RouterProps {
  page: PageId;
  orgId: string;
  ledger: LedgerEntry[];
  org: NonNullable<ReturnType<typeof useOrgs>['currentOrg']>;
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  onApprove: (entryId: string, status: LedgerStatus) => Promise<void>;
  onAnchor: (entryId: string) => Promise<void>;
}

function PageRouter({ page, ledger, org, user, onApprove, onAnchor }: RouterProps) {
  switch (page) {
    case 'dashboard':     return <Dashboard org={org} ledger={ledger} />;
    case 'ledger':        return <Ledger ledger={ledger} />;
    case 'members':       return <Members org={org} user={user} />;
    case 'dues':          return <Dues org={org} ledger={ledger} user={user} />;
    case 'announcements': return <Announcements org={org} user={user} />;
    case 'requests':      return <Requests org={org} user={user} />;
    case 'projects':      return <Projects org={org} />;
    case 'budgets':       return <Budgets org={org} />;
    case 'income':        return <Ledger ledger={ledger.filter((l) => l.type === 'income')} />;
    case 'expenses':      return <Ledger ledger={ledger.filter((l) => l.type === 'expense')} />;
    case 'approvals':     return <Approvals ledger={ledger} onDecide={onApprove} />;
    case 'documents':     return <Documents org={org} />;
    case 'reports':       return <Reports org={org} ledger={ledger} />;
    case 'transparency':  return <Transparency org={org} ledger={ledger} />;
    case 'anchors':       return <Anchors ledger={ledger} onAnchor={onAnchor} />;
    case 'settings':      return <Settings org={org} />;
    default:              return <Dashboard org={org} ledger={ledger} />;
  }
}
