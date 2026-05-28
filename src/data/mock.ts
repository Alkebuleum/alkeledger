/**
 * In-memory mock data. Used when VITE_USE_MOCK_DATA=true or when Firebase
 * is not configured. The services layer transparently switches to this
 * source so pages and hooks don't need to know.
 */

import type {
  Announcement,
  AuditLogEntry,
  DocumentRecord,
  LedgerEntry,
  Member,
  MemberRequest,
  Organization,
  Poll,
  Project,
} from '@/types';

export const MOCK_ORGS: Organization[] = [
  {
    id: 'org_meridian',
    name: 'Meridian Architects Guild',
    type: 'membership',
    createdAt: '2024-02-14',
    currency: 'USD',
    logoInitials: 'MA',
    tagline: 'Professional society · est. 1987',
  },
  {
    id: 'org_riverkeep',
    name: 'Riverkeep Foundation',
    type: 'project',
    createdAt: '2023-09-01',
    currency: 'USD',
    logoInitials: 'RK',
    tagline: 'Watershed restoration nonprofit',
  },
];

export const MOCK_MEMBERS: Member[] = [
  { id: 'm1', orgId: 'org_meridian', name: 'Eleanor Vance',   email: 'e.vance@meridian.org',   status: 'active',    joined: '2019-03-12', duesPaid: true,  role: 'Member',     memberType: 'individual' },
  { id: 'm2', orgId: 'org_meridian', name: 'Hideo Tanaka',    email: 'h.tanaka@meridian.org',  status: 'active',    joined: '2021-06-04', duesPaid: true,  role: 'Member',     memberType: 'organization', orgName: 'Tanaka Design Studio', orgTitle: 'Principal' },
  { id: 'm3', orgId: 'org_meridian', name: 'Priya Raman',     email: 'p.raman@meridian.org',   status: 'pending',   joined: '2026-04-22', duesPaid: false, role: 'Applicant',  memberType: 'organization', orgName: 'Raman & Associates' },
  { id: 'm4', orgId: 'org_meridian', name: 'Marcus Okafor',   email: 'm.okafor@meridian.org',  status: 'active',    joined: '2018-01-30', duesPaid: true,  role: 'Treasurer',  memberType: 'individual' },
  { id: 'm5', orgId: 'org_meridian', name: 'Sofia Albright',  email: 's.albright@meridian.org',status: 'expired',   joined: '2017-08-11', duesPaid: false, role: 'Member',     memberType: 'individual' },
  { id: 'm6', orgId: 'org_meridian', name: 'Jonas Wells',     email: 'j.wells@meridian.org',   status: 'suspended', joined: '2020-11-02', duesPaid: false, role: 'Member',     memberType: 'organization', orgName: 'Wells Architecture Group', orgTitle: 'Director' },
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', orgId: 'org_riverkeep', name: 'Cedar Creek Restoration', budget: 240000, spent: 168400, status: 'active',   restricted: true,  milestones: 4, completedMilestones: 2 },
  { id: 'p2', orgId: 'org_riverkeep', name: 'Community Water Testing', budget: 65000,  spent: 41200,  status: 'active',   restricted: false, milestones: 3, completedMilestones: 1 },
  { id: 'p3', orgId: 'org_riverkeep', name: 'Youth Stewards Program',  budget: 38000,  spent: 38000,  status: 'complete', restricted: true,  milestones: 5, completedMilestones: 5 },
  { id: 'p4', orgId: 'org_riverkeep', name: 'Riverside Reforestation', budget: 120000, spent: 22500,  status: 'planning', restricted: true,  milestones: 6, completedMilestones: 0 },
];

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: 'le_001', orgId: 'org_riverkeep', type: 'income',  amount: 50000, currency: 'USD', category: 'Grant',      description: 'EPA watershed grant — Q2 disbursement', projectId: 'p1', status: 'anchored',  createdBy: 'M. Okafor', approvedBy: 'E. Vance', createdAt: '2026-04-02', approvedAt: '2026-04-03', hash: '0x9f2c…a41b', anchorStatus: 'anchored', txHash: '0x7a3e…0b91' },
  { id: 'le_002', orgId: 'org_riverkeep', type: 'expense', amount: 12480, currency: 'USD', category: 'Equipment',  description: 'Water quality sensors (12 units)',        projectId: 'p2', status: 'approved',  createdBy: 'P. Raman',  approvedBy: 'E. Vance', createdAt: '2026-04-15', approvedAt: '2026-04-16', hash: '0x3b1d…ee22', anchorStatus: 'ready' },
  { id: 'le_003', orgId: 'org_riverkeep', type: 'expense', amount: 4200,  currency: 'USD', category: 'Contractor', description: 'Hydrology survey — May',                  projectId: 'p1', status: 'pending',   createdBy: 'H. Tanaka',                         createdAt: '2026-05-08',                                                       anchorStatus: 'not_anchored' },
  { id: 'le_004', orgId: 'org_riverkeep', type: 'income',  amount: 8500,  currency: 'USD', category: 'Donation',   description: 'Wellspring Trust donation',               projectId: 'p4', status: 'approved',  createdBy: 'M. Okafor', approvedBy: 'E. Vance', createdAt: '2026-05-01', approvedAt: '2026-05-02', hash: '0x88c0…12fd', anchorStatus: 'anchored', txHash: '0x55ab…ff03' },
  { id: 'le_005', orgId: 'org_riverkeep', type: 'expense', amount: 980,   currency: 'USD', category: 'Travel',     description: 'Site visit, Cedar Creek',                 projectId: 'p1', status: 'draft',     createdBy: 'J. Wells',                          createdAt: '2026-05-19',                                                       anchorStatus: 'not_anchored' },
  { id: 'le_006', orgId: 'org_riverkeep', type: 'expense', amount: 2100,  currency: 'USD', category: 'Outreach',   description: 'Community workshop catering',             projectId: 'p2', status: 'rejected',  createdBy: 'P. Raman',  approvedBy: 'E. Vance', createdAt: '2026-05-10', approvedAt: '2026-05-11',                                                  anchorStatus: 'not_anchored' },
  { id: 'le_101', orgId: 'org_meridian',  type: 'income',  amount: 350,   currency: 'USD', category: 'Dues',       description: 'Annual dues — E. Vance',                  memberId: 'm1', status: 'anchored',  createdBy: 'M. Okafor', approvedBy: 'M. Okafor',createdAt: '2026-01-12', approvedAt: '2026-01-12', hash: '0x2a4f…77bc', anchorStatus: 'anchored', txHash: '0x91de…aa20' },
  { id: 'le_102', orgId: 'org_meridian',  type: 'income',  amount: 350,   currency: 'USD', category: 'Dues',       description: 'Annual dues — H. Tanaka',                 memberId: 'm2', status: 'approved',  createdBy: 'M. Okafor', approvedBy: 'M. Okafor',createdAt: '2026-02-04', approvedAt: '2026-02-04', hash: '0x66bb…1109', anchorStatus: 'ready' },
  { id: 'le_103', orgId: 'org_meridian',  type: 'expense', amount: 1200,  currency: 'USD', category: 'Venue',      description: 'Quarterly meeting venue',                                  status: 'pending',   createdBy: 'M. Okafor',                         createdAt: '2026-05-12',                                                       anchorStatus: 'not_anchored' },
];

export const MOCK_DOCUMENTS: DocumentRecord[] = [
  { id: 'd1', orgId: 'org_meridian',  name: 'Bylaws (2025 revision).pdf',       size: '480 KB', uploaded: '2025-11-02', category: 'Policy' },
  { id: 'd2', orgId: 'org_meridian',  name: 'Code of Professional Conduct.pdf', size: '212 KB', uploaded: '2024-06-14', category: 'Policy' },
  { id: 'd3', orgId: 'org_meridian',  name: 'Q1 2026 Meeting Minutes.pdf',      size: '88 KB',  uploaded: '2026-03-30', category: 'Minutes' },
  { id: 'd4', orgId: 'org_riverkeep', name: 'Cedar Creek — Scope of Work.pdf',  size: '1.2 MB', uploaded: '2026-01-20', category: 'Project' },
  { id: 'd5', orgId: 'org_riverkeep', name: 'EPA Grant Agreement.pdf',          size: '640 KB', uploaded: '2026-03-15', category: 'Grant' },
  { id: 'd6', orgId: 'org_riverkeep', name: 'Annual Report 2025.pdf',           size: '3.4 MB', uploaded: '2026-02-28', category: 'Report' },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', orgId: 'org_meridian', title: 'Annual General Meeting — June 18', body: 'Join us at the downtown hall, 6 PM. Voting on the 2026 board.', date: '2026-05-14', priority: 'important', createdBy: 'Marcus Okafor' },
  { id: 'a2', orgId: 'org_meridian', title: '2026 Dues Reminder',                body: 'Dues for the current cycle are due May 31. Pay via the portal.', date: '2026-05-02', priority: 'urgent',    createdBy: 'Marcus Okafor' },
];

export const MOCK_REQUESTS: MemberRequest[] = [
  { id: 'r1', orgId: 'org_meridian', from: 'Sofia Albright', subject: 'Reinstate membership', status: 'open',    date: '2026-05-18' },
  { id: 'r2', orgId: 'org_meridian', from: 'Hideo Tanaka',   subject: 'Receipt for 2025 dues', status: 'closed', date: '2026-04-30' },
];

export const MOCK_POLLS: Poll[] = [
  {
    id: 'pol_001',
    orgId: 'org_meridian',
    title: 'Should we raise the annual dues for 2027?',
    description: 'The board is proposing an increase from $350 to $400 for individual members to cover rising venue costs. Please vote below.',
    options: [
      { id: 'o1', text: 'Yes, approve the increase' },
      { id: 'o2', text: 'No, keep dues at $350' },
      { id: 'o3', text: 'Need more information first' },
    ],
    voteType: 'single',
    status: 'active',
    deadline: '2026-06-15',
    createdBy: 'Marcus Okafor',
    createdAt: '2026-05-20',
    votes: {
      'm1': { optionIds: ['o1'], votedAt: '2026-05-21T10:00:00Z', voterName: 'Eleanor Vance' },
      'm2': { optionIds: ['o2'], votedAt: '2026-05-22T14:30:00Z', voterName: 'Hideo Tanaka' },
    },
  },
  {
    id: 'pol_002',
    orgId: 'org_meridian',
    title: 'Which day works best for the Q3 General Meeting?',
    options: [
      { id: 'o4', text: 'Saturday, July 12' },
      { id: 'o5', text: 'Wednesday, July 16' },
      { id: 'o6', text: 'Saturday, July 19' },
    ],
    voteType: 'single',
    status: 'draft',
    createdBy: 'Eleanor Vance',
    createdAt: '2026-05-24',
    votes: {},
  },
];

export const MOCK_AUDIT: AuditLogEntry[] = [
  { id: 'au1', at: '2026-05-19 14:22', who: 'E. Vance',  action: 'Approved ledger entry le_002 ($12,480)' },
  { id: 'au2', at: '2026-05-19 09:10', who: 'M. Okafor', action: 'Anchored le_004 to Alkebuleum (tx 0x55ab…ff03)' },
  { id: 'au3', at: '2026-05-18 17:55', who: 'J. Wells',  action: 'Created draft entry le_005 ($980)' },
  { id: 'au4', at: '2026-05-18 11:02', who: 'E. Vance',  action: 'Rejected le_006 — missing receipt' },
  { id: 'au5', at: '2026-05-17 16:40', who: 'P. Raman',  action: 'Submitted le_003 for approval' },
];
