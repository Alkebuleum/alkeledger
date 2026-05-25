import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useMatch } from 'react-router-dom';
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
import type { LedgerEntry, LedgerStatus, Organization } from '@/types';
import type { AuthUser } from '@/hooks/useAuth';

function orgPath(org: Organization) {
  return `/${org.slug ?? org.id}`;
}

export default function App() {
  const { user, loading: authLoading, requestOtp, verifyOtp, signOut } = useAuth();
  const { orgs, addOrg, joinOrg, removeOrg, loading: orgsLoading } = useOrgs(user);
  const navigate = useNavigate();

  if (authLoading || (user && orgsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-editorial italic">
        {orgsLoading ? 'Loading workspace…' : 'Loading…'}
      </div>
    );
  }

  // ── Not signed in ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <Routes>
        <Route
          path="/signin"
          element={
            <SignIn
              onBack={() => navigate('/')}
              onRequestOtp={requestOtp}
              onVerifyOtp={verifyOtp}
            />
          }
        />
        <Route
          path="*"
          element={
            <Landing
              onStart={() => navigate('/signin')}
              onDemo={() => navigate('/signin')}
            />
          }
        />
      </Routes>
    );
  }

  // ── Signed in, no orgs yet ──────────────────────────────────────────────────
  if (orgs.length === 0) {
    return (
      <OrgSetup
        onCreate={async (data) => {
          const org = await addOrg(data);
          navigate(orgPath(org));
        }}
        onJoin={async (code) => {
          const org = await joinOrg(code);
          navigate(orgPath(org));
        }}
        user={user}
      />
    );
  }

  // ── Signed in, has orgs ─────────────────────────────────────────────────────
  return (
    <Routes>
      <Route
        path="/setup"
        element={
          <OrgSetup
            onCreate={async (data) => {
              const org = await addOrg(data);
              navigate(orgPath(org));
            }}
            onJoin={async (code) => {
              const org = await joinOrg(code);
              navigate(orgPath(org));
            }}
            onCancel={() => navigate(-1)}
            user={user}
          />
        }
      />
      <Route
        path="/:slug/*"
        element={
          <OrgShell orgs={orgs} user={user} signOut={signOut} removeOrg={removeOrg} />
        }
      />
      <Route path="*" element={<Navigate to={orgPath(orgs[0])} replace />} />
    </Routes>
  );
}

// ── OrgShell ──────────────────────────────────────────────────────────────────

interface OrgShellProps {
  orgs: Organization[];
  user: AuthUser;
  signOut: () => Promise<void>;
  removeOrg: (orgId: string) => Promise<void>;
}

function OrgShell({ orgs, user, signOut, removeOrg }: OrgShellProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Derive current page from URL: /:slug/:page
  const pageMatch = useMatch('/:slug/:page');
  const pageId = (pageMatch?.params.page ?? 'dashboard') as PageId;

  const org = orgs.find((o) => (o.slug ?? o.id) === slug) ?? null;

  const { entries: ledger, createEntry, setStatus, anchor } = useLedger(org?.id ?? null);
  const [showNewEntry, setShowNewEntry] = useState(false);

  if (!org) {
    return <Navigate to={orgPath(orgs[0])} replace />;
  }

  const handleSwitchOrg = (id: string) => {
    const target = orgs.find((o) => o.id === id);
    if (target) navigate(orgPath(target));
  };

  const handleSaveEntry = async (entry: LedgerEntry) => {
    await createEntry(entry);
    setShowNewEntry(false);
  };

  return (
    <>
      <AppShell
        org={org}
        orgs={orgs}
        onSwitchOrg={handleSwitchOrg}
        page={pageId}
        onNewEntry={() => setShowNewEntry(true)}
        onExit={signOut}
        onNewOrg={() => navigate('/setup')}
        user={user}
      >
        <PageContent
          page={pageId}
          org={org}
          ledger={ledger}
          user={user}
          onApprove={setStatus}
          onAnchor={anchor}
          onDeleteOrg={async () => {
            await removeOrg(org.id);
            const next = orgs.find((o) => o.id !== org.id);
            navigate(next ? orgPath(next) : '/setup');
          }}
        />
      </AppShell>

      {showNewEntry && (
        <NewEntryModal
          org={org}
          user={user}
          onClose={() => setShowNewEntry(false)}
          onSave={handleSaveEntry}
        />
      )}
    </>
  );
}

// ── Page content router ───────────────────────────────────────────────────────

interface PageContentProps {
  page: PageId;
  org: Organization;
  ledger: LedgerEntry[];
  user: AuthUser;
  onApprove: (entryId: string, status: LedgerStatus) => Promise<void>;
  onAnchor: (entryId: string) => Promise<void>;
  onDeleteOrg: () => Promise<void>;
}

function PageContent({ page, ledger, org, user, onApprove, onAnchor, onDeleteOrg }: PageContentProps) {
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
    case 'settings':      return <Settings org={org} user={user} onDelete={onDeleteOrg} />;
    default:              return <Dashboard org={org} ledger={ledger} />;
  }
}
