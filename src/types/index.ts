export type OrgType = 'membership' | 'project';

export type Role =
  | 'owner'
  | 'admin'
  | 'treasurer'
  | 'finance'
  | 'auditor'
  | 'member'
  | 'projectManager'
  | 'viewer';

export type LedgerStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'anchored';

export type AnchorStatus = 'not_anchored' | 'ready' | 'anchored' | 'failed';

export type MemberStatus = 'active' | 'pending' | 'suspended' | 'expired';

export type ProjectStatus = 'planning' | 'active' | 'complete' | 'paused';

export type RequestStatus = 'open' | 'closed';

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

// ─────────────────────────────────────────────────────────────────────────────

export type MemberType = 'individual' | 'organization';

export interface DuesRates {
  individual: number;
  organization: number;
}

export type DuesType = 'annual' | 'quarterly' | 'monthly' | 'emergency' | 'special';
export type DuesPeriodStatus = 'upcoming' | 'active' | 'closed';

export interface DuesPeriod {
  id: string;
  orgId: string;
  name: string;
  type: DuesType;
  amountIndividual: number;
  amountOrganization: number;
  periodStart?: string;   // date range this collection covers (start)
  periodEnd?: string;     // date range this collection covers (end)
  deadline: string;       // when payment must be received by
  status: DuesPeriodStatus;
  createdBy: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  slug?: string;
  name: string;
  type: OrgType;
  createdAt: string;
  currency: string;
  logoInitials: string;
  tagline?: string;
  inviteCode?: string;
  createdBy?: string;
  allowedMemberTypes?: MemberType[];
  duesRates?: DuesRates;
  plan?: 'free' | 'pro';
}

export interface OrgUser {
  uid: string;
  orgId: string;
  role: Role;
  displayName: string;
  email: string;
  joinedAt: string;
}

export interface Member {
  id: string;          // userId
  orgId: string;
  name: string;
  email: string;
  status: MemberStatus;
  joined: string;
  duesPaid: boolean;
  role: string;
  phone?: string;
  memberType?: MemberType;
  orgName?: string;
  orgTitle?: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  budget: number;
  spent: number;
  status: ProjectStatus;
  restricted: boolean;
  milestones: number;
  completedMilestones: number;
}

export interface LedgerEntry {
  id: string;
  orgId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  description: string;
  projectId?: string;
  memberId?: string;
  duesPeriodId?: string;
  receiptUrl?: string;
  status: LedgerStatus;
  createdBy: string;
  createdByUid?: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
  hash?: string;
  anchorStatus: AnchorStatus;
  txHash?: string;
}

export interface DocumentRecord {
  id: string;
  orgId: string;
  name: string;
  size: string;
  uploaded: string;
  category: string;
  url?: string;
  storagePath?: string;
  uploadedBy?: string;
}

export interface Announcement {
  id: string;
  orgId: string;
  title: string;
  body: string;
  date: string;
  priority: AnnouncementPriority;
  pinned?: boolean;
  createdBy: string;
  createdByUid?: string;
}

export interface Benefit {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  maxAmount?: number;
  requiresAmount?: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export type BenefitRequestStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface BenefitRequest {
  id: string;
  orgId: string;
  benefitId: string;
  benefitName: string;
  memberId: string;
  memberName: string;
  amount?: number;
  justification?: string;
  status: BenefitRequestStatus;
  response?: string;
  closedBy?: string;
  closedAt?: string;
  paidAt?: string;
  paidBy?: string;
  paidAmount?: number;
  createdAt: string;
}

export interface MemberRequest {
  id: string;
  orgId: string;
  from: string;
  fromId?: string;
  subject: string;
  message?: string;
  status: RequestStatus;
  date: string;
  response?: string;
  closedBy?: string;
  closedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  who: string;
  action: string;
}

export interface Report {
  id: string;
  orgId: string;
  name: string;
  date: string;
  anchored: boolean;
  url?: string;
}

export type RsvpStatus = 'attending' | 'maybe' | 'declining';

export interface EventRsvp {
  name: string;
  status: RsvpStatus;
  respondedAt: string;
}

export interface OrgEvent {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string;   // YYYY-MM-DDTHH:mm
  endDate?: string;    // YYYY-MM-DDTHH:mm
  allDay?: boolean;
  cancelled?: boolean;
  rsvps?: Record<string, EventRsvp>; // userId → rsvp
  createdBy: string;
  createdByUid?: string;
  createdAt: string;
}

export interface Anchor {
  id: string;
  orgId: string;
  entryId: string;
  hash: string;
  timestamp: string;
  status: AnchorStatus;
  txHash?: string;
  verified: boolean;
}
