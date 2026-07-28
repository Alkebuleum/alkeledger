export type OrgType = 'membership' | 'project' | 'cooperative';

export type ParticipationModel = 'equal' | 'unit' | 'contribution' | 'hybrid';
export type VotingModel = 'oneMemberOneVote' | 'unitWeighted' | 'contributionWeighted' | 'hybrid';

export interface CooperativeConfig {
  participationModel: ParticipationModel;
  positionLabel: string;        // e.g. "Participation Unit", "Membership Share"
  votingModel: VotingModel;
  totalAuthorizedUnits?: number;
  unitValue?: number;           // price / contribution requirement per unit
}

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

export type PlanCode = 'free' | 'standard_monthly' | 'standard_annual';

export type OrganizationStatus = 'draft' | 'pending_payment' | 'active' | 'suspended' | 'archived';

export type BillingStatus = 'not_required' | 'checkout_pending' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export interface MigrationRequest {
  requested: boolean;
  platformName?: string;
  approxMembers?: number;
  currentPrice?: string;
  desiredMigrationDate?: string;
  needsHistoricalMigration?: boolean;
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
  logoUrl?: string;
  cooperativeConfig?: CooperativeConfig;
  planCode?: PlanCode;
  organizationStatus?: OrganizationStatus;
  billingStatus?: BillingStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  stripePriceId?: string;
  subscriptionCurrentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  migrationRequest?: MigrationRequest;
  trialEndsAt?: string;
  country?: string;
  region?: string;
  website?: string;
  estimatedMembers?: number;
  primaryAdminName?: string;
  primaryAdminEmail?: string;
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

export type PositionStatus = 'active' | 'inactive';

export interface Position {
  id: string;
  orgId: string;
  memberId: string;
  memberName: string;
  units: number;
  contributionNote?: string;   // free-text: what the units represent/were earned for
  status: PositionStatus;
  issuedBy: string;
  issuedAt: string;
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

export type RecordType = 'decision' | 'transaction' | 'credential' | 'document';

export interface LedgerEntry {
  id: string;
  orgId: string;
  recordType?: RecordType; // absent on legacy entries — treat as 'transaction'
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
  // recordType === 'credential'
  holderId?: string;
  holderName?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  // recordType === 'document'
  fileHash?: string;
  // recordType === 'decision'
  pollId?: string;
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
  imageUrl?: string;
  imageStoragePath?: string;
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

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotifType = 'event' | 'poll' | 'dues' | 'request' | 'membership';

export interface AppNotif {
  id: string;
  orgId: string;
  type: NotifType;
  title: string;
  body?: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export type PollStatus = 'draft' | 'active' | 'closed';
export type VoteType = 'single' | 'multiple';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollVote {
  optionIds: string[];
  votedAt: string;
  voterName: string;
}

export interface Poll {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  options: PollOption[];
  voteType: VoteType;
  status: PollStatus;
  deadline?: string;
  createdBy: string;
  createdByUid?: string;
  createdAt: string;
  votes?: Record<string, PollVote>;
  // Cooperative proposal fields (optional — only set for cooperative-workspace proposals)
  proposalCategory?: string;
  requestedBudget?: number;
  fundingSource?: string;
  timelineNote?: string;
}
