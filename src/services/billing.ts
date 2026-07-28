import { USE_MOCK_DATA } from '@/lib/firebase';
import { scribbApiRequest } from '@/lib/scribbApi';

// Persisted across the full-page redirect to Stripe Checkout and back, so the
// payment-success/cancelled pages know which organization to poll/resume.
export const PENDING_CHECKOUT_STORAGE_KEY = 'scribbPendingCheckoutOrgId';

// For a paid org, the backend doesn't create the owner membership until the Stripe
// webhook confirms payment — so the org-details/cooperative-config/migration-detail
// metadata patch can't happen until then either (the Firestore rule requires an
// active membership). Stashed here and applied by PaymentSuccess once activation
// is confirmed.
export const PENDING_METADATA_STORAGE_KEY = 'scribbPendingOrgMetadata';

export type OrganizationPlan = 'free' | 'standard';
export type BillingInterval = 'monthly' | 'annual';

export interface CreateOrganizationRequest {
  name: string;
  type: string;
  currency: string;
  tagline?: string;
  selectedPlan: OrganizationPlan;
  billingInterval: BillingInterval;
  migrationRequested: boolean;
  idempotencyKey: string;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
  billingInterval: BillingInterval;
  migrationRequested: boolean;
}

export interface CreateOrganizationResponse {
  success: true;
  existing: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationStatus: 'active' | 'pending_payment' | string;
    planCode: 'free' | 'standard_monthly' | 'standard_annual' | string;
    billingStatus: 'not_required' | 'checkout_pending' | 'active' | string;
  };
  checkout: CheckoutResult | null;
}

export interface CreateCheckoutSessionRequest {
  organizationId: string;
  billingInterval: BillingInterval;
  migrationRequested: boolean;
}

export interface CheckoutSessionResponse {
  success: true;
  checkout: {
    sessionId: string;
    url: string;
    billingInterval: BillingInterval;
    migrationRequested: boolean;
  };
}

export interface CustomerPortalResponse {
  success: true;
  portal: { url: string };
}

export interface OrganizationBillingResponse {
  success: true;
  organization: {
    id: string;
    name: string;
    role: string;
    organizationStatus: string;
  };
  billing: {
    planCode: string;
    status: string;
    billingInterval: string | null;
    stripeSubscriptionStatus: string | null;
    migrationRequested: boolean;
    migrationStatus: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  };
}

// Local, no-backend fallback for VITE_USE_MOCK_DATA=true development.
function mockCreateOrganizationResponse(req: CreateOrganizationRequest): CreateOrganizationResponse {
  const id = 'org_' + Math.random().toString(36).slice(2, 8);
  const isPaid = req.selectedPlan === 'standard';
  return {
    success: true,
    existing: false,
    organization: {
      id,
      name: req.name,
      slug: id,
      organizationStatus: isPaid ? 'pending_payment' : 'active',
      planCode: isPaid ? (req.billingInterval === 'annual' ? 'standard_annual' : 'standard_monthly') : 'free',
      billingStatus: isPaid ? 'checkout_pending' : 'not_required',
    },
    checkout: null, // mock mode never has real Stripe Checkout to redirect to
  };
}

export async function createOrganizationViaApi(
  req: CreateOrganizationRequest
): Promise<CreateOrganizationResponse> {
  if (USE_MOCK_DATA) return mockCreateOrganizationResponse(req);
  return scribbApiRequest<CreateOrganizationResponse>('/api/v1/organizations', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function createCheckoutSession(
  req: CreateCheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  return scribbApiRequest<CheckoutSessionResponse>('/api/v1/billing/checkout-session', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getOrganizationBilling(organizationId: string): Promise<OrganizationBillingResponse> {
  return scribbApiRequest<OrganizationBillingResponse>(`/api/v1/organizations/${organizationId}/billing`);
}

export async function createCustomerPortalSession(organizationId: string): Promise<CustomerPortalResponse> {
  return scribbApiRequest<CustomerPortalResponse>('/api/v1/billing/customer-portal', {
    method: 'POST',
    body: JSON.stringify({ organizationId }),
  });
}

export { describeApiError, ScribbApiError } from '@/lib/scribbApi';
