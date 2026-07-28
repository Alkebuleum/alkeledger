# Scribb Frontend Billing and Organization Onboarding Integration

## Responsibility boundary

Work only inside the Scribb frontend repository.

Do not:

* Modify the Scribb backend repository
* Recreate Stripe logic in the frontend
* Create Stripe Checkout Sessions directly
* Use Stripe secret keys
* Call the Stripe webhook
* Change Nginx or server configuration
* Directly assign paid plans in Firestore
* Directly write billing or subscription status fields

The backend is already deployed at:

```text
https://api.scribb.net
```

Use the existing frontend framework, routing, state management, Firebase Authentication, styling system, and component patterns. Do not introduce a new framework or redesign unrelated parts of Scribb.

---

# Business model

Scribb has two customer paths.

## Start Free

For organizations that currently use spreadsheets, messages, email, or manual records.

Price:

```text
$0
```

No card is required.

## Switch & Save

For organizations moving from another paid membership-management platform.

Prices:

```text
Monthly: $9.99
Annual: $104.99
Optional migration service: $49.99 one time
```

The migration service is available only with the Standard paid plan.

---

# API configuration

Add an environment variable using the frontend project’s existing environment-variable convention.

For Vite:

```env
VITE_SCRIBB_API_BASE_URL=https://api.scribb.net
```

For Next.js:

```env
NEXT_PUBLIC_SCRIBB_API_BASE_URL=https://api.scribb.net
```

Do not hardcode the API URL throughout the codebase. Create one API client configuration.

Example:

```ts
export const SCRIBB_API_BASE_URL =
  import.meta.env.VITE_SCRIBB_API_BASE_URL ??
  "https://api.scribb.net";
```

Adapt this to the actual frontend framework.

---

# Firebase authentication requirement

Every protected API request must include the current Firebase user’s ID token.

Use the existing Firebase Authentication instance.

Example:

```ts
import { getAuth } from "firebase/auth";

async function getAuthorizationHeader(): Promise<Record<string, string>> {
  const user = getAuth().currentUser;

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const idToken = await user.getIdToken();

  return {
    Authorization: `Bearer ${idToken}`
  };
}
```

Do not store Firebase ID tokens permanently in local storage.

Retrieve a current token before protected API requests.

---

# Shared API helper

Create a reusable authenticated request helper.

Example:

```ts
interface ApiErrorPayload {
  success?: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ScribbApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ScribbApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function scribbApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = getAuth().currentUser;

  if (!user) {
    throw new ScribbApiError(
      401,
      "AUTH_REQUIRED",
      "You must be signed in."
    );
  }

  const idToken = await user.getIdToken();

  const response = await fetch(
    `${SCRIBB_API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        ...options.headers
      }
    }
  );

  const result = (await response.json()) as
    | T
    | ApiErrorPayload;

  if (!response.ok) {
    const errorResult = result as ApiErrorPayload;

    throw new ScribbApiError(
      response.status,
      errorResult.error?.code ?? "API_REQUEST_FAILED",
      errorResult.error?.message ??
        "The request could not be completed.",
      errorResult.error?.details
    );
  }

  return result as T;
}
```

Adapt imports and environment access to the current frontend architecture.

---

# Replace direct organization creation

Find the existing frontend workflow that creates documents directly in the Firestore `organizations` collection.

Replace that organization-creation write with:

```text
POST /api/v1/organizations
```

The frontend must no longer create the main organization record directly in Firestore during onboarding.

The backend now creates:

* The organization document
* The owner membership
* The Free or paid billing state
* The Stripe Checkout Session when payment is required

Do not create a duplicate owner membership from the frontend after the API succeeds.

---

# Organization onboarding request

Endpoint:

```text
POST https://api.scribb.net/api/v1/organizations
```

Headers:

```text
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
```

Request:

```ts
type OrganizationPlan = "free" | "standard";
type BillingInterval = "monthly" | "annual";

interface CreateOrganizationRequest {
  name: string;
  type: string;
  currency: string;
  tagline?: string;
  selectedPlan: OrganizationPlan;
  billingInterval: BillingInterval;
  migrationRequested: boolean;
  idempotencyKey: string;
}
```

Example Free request:

```json
{
  "name": "Example Community Association",
  "type": "membership",
  "currency": "USD",
  "tagline": "Serving our community together",
  "selectedPlan": "free",
  "billingInterval": "monthly",
  "migrationRequested": false,
  "idempotencyKey": "1a45d51e-3671-46e8-b37e-1fe5bb28d16e"
}
```

Example paid request:

```json
{
  "name": "Example Community Association",
  "type": "membership",
  "currency": "USD",
  "tagline": "Serving our community together",
  "selectedPlan": "standard",
  "billingInterval": "annual",
  "migrationRequested": true,
  "idempotencyKey": "8d30bb2d-f461-4307-889b-fe2e37d87f30"
}
```

Use:

```ts
crypto.randomUUID()
```

to generate the idempotency key.

Generate one key when the onboarding submission begins. Keep the same key while retrying that same submission. Do not generate a new key every time a network retry occurs.

---

# Organization onboarding response

```ts
interface CheckoutResult {
  sessionId: string;
  url: string;
  billingInterval: "monthly" | "annual";
  migrationRequested: boolean;
}

interface CreateOrganizationResponse {
  success: true;
  existing: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationStatus:
      | "active"
      | "pending_payment"
      | string;
    planCode:
      | "free"
      | "standard_monthly"
      | "standard_annual"
      | string;
    billingStatus:
      | "not_required"
      | "checkout_pending"
      | "active"
      | string;
  };
  checkout: CheckoutResult | null;
}
```

## Free-plan behavior

When:

```ts
response.organization.planCode === "free"
```

and:

```ts
response.checkout === null
```

the workspace is ready.

Navigate the user into the newly created workspace using:

```ts
response.organization.id
```

Do not request payment.

## Paid-plan behavior

When:

```ts
response.checkout?.url
```

exists, redirect the browser to Stripe-hosted Checkout:

```ts
window.location.assign(response.checkout.url);
```

Do not embed Stripe Checkout manually.

Do not activate the workspace from the frontend.

The Stripe webhook activates the paid workspace after payment succeeds.

---

# Onboarding interface

Update the organization-creation flow to include a plan-selection step.

## Option 1: Start Free

Display:

```text
Start Free

For organizations getting organized for the first time.

$0
No card required.
```

Suggested capabilities:

* Basic organization workspace
* Up to 50 members
* Two administrators
* Basic member records
* Documents and meeting notes
* Basic reports

Primary button:

```text
Create Free Workspace
```

Send:

```json
{
  "selectedPlan": "free",
  "billingInterval": "monthly",
  "migrationRequested": false
}
```

The billing interval has no financial effect for the Free plan, but the API requires a valid value.

## Option 2: Switch & Save

Display:

```text
Switch & Save

For organizations moving from another membership platform.

$9.99 monthly
or
$104.99 annually
```

Allow the user to select:

* Monthly
* Annual

Show annual savings clearly but do not invent a discount percentage that conflicts with the actual prices.

Add an optional migration selection:

```text
Add migration and setup assistance — $49.99 one time
```

Primary button:

```text
Continue to Secure Checkout
```

Send:

```json
{
  "selectedPlan": "standard",
  "billingInterval": "monthly or annual",
  "migrationRequested": true or false
}
```

Do not allow migration with the Free plan.

---

# Loading and duplicate-submission behavior

When the user submits organization onboarding:

* Disable the submit button
* Show a clear loading state
* Prevent double clicks
* Preserve the idempotency key during retries
* Do not create an organization directly in Firestore
* Do not navigate until the API responds
* Re-enable the form when a recoverable error occurs

Suggested loading messages:

Free:

```text
Creating your Scribb workspace…
```

Paid:

```text
Preparing secure checkout…
```

---

# Checkout return pages

Ensure these frontend routes exist:

```text
/onboarding/payment-success
/onboarding/payment-cancelled
```

Stripe returns the Checkout Session ID as:

```text
/onboarding/payment-success?session_id=cs_...
```

## Payment-success page

Do not treat the browser redirect as proof of payment.

The page should:

1. Show a payment-processing state.
2. Identify the pending organization from onboarding state or persisted organization ID.
3. Poll the billing-status endpoint.
4. Continue until the backend reports `active` or a reasonable timeout is reached.
5. Navigate to the workspace when active.
6. Provide a retry/check-again action when activation is delayed.

Suggested initial message:

```text
Payment received. We’re activating your Scribb workspace.
```

Suggested delayed message:

```text
Stripe is still confirming your subscription. Your workspace will become available as soon as confirmation is complete.
```

Do not rely on the `session_id` alone to grant access.

## Payment-cancelled page

Display:

```text
Checkout was not completed.

Your organization has not been activated on a paid plan. You can return and complete payment or choose the Free plan.
```

Provide:

* Resume paid setup
* Return to plan selection
* Choose Free plan, when supported by the current onboarding state

Do not create another organization automatically.

---

# Billing-status endpoint

Endpoint:

```text
GET /api/v1/organizations/:organizationId/billing
```

Example:

```text
GET https://api.scribb.net/api/v1/organizations/abc123/billing
```

Response:

```ts
interface OrganizationBillingResponse {
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
```

Use this endpoint for:

* Payment-success polling
* Organization Billing settings
* Plan badges
* Renewal date
* Cancellation status
* Payment-problem notices

Do not expose Stripe Customer IDs or Subscription IDs in the interface.

---

# Access-state behavior

Use `organization.organizationStatus` and `billing.status` from the backend.

## Active

Examples:

```text
organizationStatus = active
billing.status = active
```

Allow paid workspace access.

For Free:

```text
organizationStatus = active
billing.status = not_required
```

Allow Free workspace access.

## Pending payment

```text
organizationStatus = pending_payment
billing.status = checkout_pending
```

Do not present the organization as a fully active paid workspace.

Show:

```text
Payment is required to activate this workspace.
```

Provide a Continue Payment action.

## Billing attention

Possible values include:

```text
billing_attention
past_due
payment_failed
```

Preserve access according to the existing product policy, but show a prominent billing notice and a Manage Billing action.

Do not delete workspace data.

## Billing restricted or canceled

Possible values include:

```text
billing_restricted
canceled
```

Show the organization and records safely, but restrict paid-only operations according to the existing entitlement system.

Do not delete records from the frontend.

---

# Existing-organization upgrade endpoint

For an existing Free organization upgrading later, use:

```text
POST /api/v1/billing/checkout-session
```

Request:

```ts
interface CreateCheckoutSessionRequest {
  organizationId: string;
  billingInterval: "monthly" | "annual";
  migrationRequested: boolean;
}
```

Example:

```json
{
  "organizationId": "abc123",
  "billingInterval": "monthly",
  "migrationRequested": false
}
```

Response:

```ts
interface CheckoutSessionResponse {
  success: true;
  checkout: {
    sessionId: string;
    url: string;
    billingInterval: "monthly" | "annual";
    migrationRequested: boolean;
  };
}
```

Redirect to:

```ts
window.location.assign(response.checkout.url);
```

Only organization owners can use this endpoint.

Handle this backend error:

```text
SUBSCRIPTION_ALREADY_EXISTS
```

When received, do not start another Checkout. Refresh the organization’s billing status instead.

---

# Customer Portal

Add a **Manage Billing** button for paid organization owners.

Endpoint:

```text
POST /api/v1/billing/customer-portal
```

Request:

```json
{
  "organizationId": "abc123"
}
```

Response:

```ts
interface CustomerPortalResponse {
  success: true;
  portal: {
    url: string;
  };
}
```

Redirect:

```ts
window.location.assign(response.portal.url);
```

Only display Manage Billing for:

* Organization owner
* Organization with a Stripe billing account

Handle:

```text
STRIPE_CUSTOMER_NOT_FOUND
```

by hiding the portal action or showing that no paid billing account exists.

The Customer Portal handles:

* Payment-method updates
* Invoice history
* Receipt downloads
* Subscription cancellation

Do not build custom card-management forms.

---

# Billing settings interface

Inside Organization Settings, add a Billing section showing:

* Current plan
* Monthly or annual billing
* Billing status
* Next renewal/current period end
* Whether cancellation is scheduled
* Migration-service status
* Upgrade button for Free organizations
* Manage Billing button for paid owners

Suggested labels:

```text
Free
Standard Monthly
Standard Annual
```

Suggested status labels:

```text
Active
Payment Pending
Payment Past Due
Cancellation Scheduled
Canceled
```

When:

```ts
cancelAtPeriodEnd === true
```

display:

```text
Your subscription will end on [currentPeriodEnd].
```

Format the date using the user’s locale.

---

# Direct Firestore restrictions

The frontend may continue using Firestore for existing Scribb operational data according to the existing architecture.

However, the frontend must not write or overwrite:

```text
organizations/{id}.organizationStatus
organizations/{id}.billing
organizations/{id}.billing.planCode
organizations/{id}.billing.status
organizations/{id}.billing.stripeCustomerId
organizations/{id}.billing.stripeSubscriptionId
organizations/{id}.billing.currentPeriodEnd
organizations/{id}.billing.cancelAtPeriodEnd
```

Do not set a user or organization to a paid plan based on:

* A button click
* A local state change
* A URL query parameter
* A successful browser redirect
* A Checkout Session ID
* A Firestore client write

Only the backend webhook determines successful paid activation.

---

# Error handling

Handle these API error codes with user-friendly messages:

## `AUTH_TOKEN_REQUIRED` or `AUTH_TOKEN_INVALID`

```text
Your session has expired. Please sign in again.
```

## `INVALID_ORGANIZATION_REQUEST`

Show field-level validation messages where possible.

## `ORGANIZATION_OWNER_REQUIRED`

```text
Only the organization owner can manage billing.
```

## `ORGANIZATION_ACCESS_DENIED`

```text
You do not have access to this organization.
```

## `SUBSCRIPTION_ALREADY_EXISTS`

```text
This organization already has an active or unresolved subscription.
```

Then refresh billing status.

## `STRIPE_CUSTOMER_NOT_FOUND`

```text
No paid billing account exists for this organization.
```

## `INTERNAL_SERVER_ERROR`

```text
Scribb could not complete the request. Please try again.
```

Do not display raw server stack traces, Firebase tokens, Stripe identifiers, or secret values.

---

# Required implementation sequence

1. Add the API base URL environment variable.
2. Add the authenticated API helper.
3. Find and replace direct organization creation.
4. Add Free versus Switch & Save plan selection.
5. Integrate `POST /api/v1/organizations`.
6. Add payment-success and payment-cancelled routes.
7. Add billing-status polling.
8. Add organization Billing settings.
9. Integrate existing-workspace upgrades.
10. Integrate Stripe Customer Portal.
11. Add loading, retry, and error states.
12. Verify no frontend code writes protected billing fields.

---

# Acceptance tests

## Free organization

1. Sign in.
2. Select Start Free.
3. Create an organization.
4. Confirm no Stripe page appears.
5. Confirm the API returns an organization ID.
6. Confirm the workspace opens.
7. Confirm billing status is `not_required`.
8. Confirm plan is `free`.

## Monthly paid organization

1. Sign in.
2. Select Switch & Save.
3. Select monthly.
4. Submit onboarding.
5. Confirm Stripe Checkout opens.
6. Complete a sandbox payment.
7. Return to the payment-success page.
8. Confirm the page polls billing status.
9. Confirm billing becomes `active`.
10. Confirm plan is `standard_monthly`.
11. Confirm the workspace opens only after activation.

## Annual paid organization

Repeat the paid test using annual billing.

Confirm:

```text
planCode = standard_annual
billingInterval = annual
```

## Migration purchase

1. Select Standard.
2. Enable migration service.
3. Complete Checkout.
4. Confirm `migrationRequested = true`.
5. Confirm `migrationStatus = pending`.

## Canceled Checkout

1. Begin paid onboarding.
2. Cancel Stripe Checkout.
3. Confirm the paid workspace is not activated.
4. Confirm the cancellation page appears.
5. Confirm no duplicate organization is created when retrying with the same idempotency key.

## Customer Portal

1. Open Billing settings as an owner.
2. Click Manage Billing.
3. Confirm Stripe Customer Portal opens.
4. Confirm invoices and payment-method management are available.
5. Confirm a non-owner cannot open the portal.

## Security

1. Call the API without a Firebase token.
2. Confirm it returns `401`.
3. Attempt to manage another owner’s organization.
4. Confirm it returns `403`.
5. Confirm the frontend contains no Stripe secret keys.
6. Confirm the frontend never calls the Stripe webhook.
7. Confirm paid activation does not depend on the success-page redirect.

---

# Definition of done

The frontend integration is complete when:

* Organization creation no longer writes the main organization directly from the frontend.
* Free organizations are created through the backend without payment.
* Paid organizations are created through the backend as pending payment.
* Stripe Checkout opens using the URL returned by the backend.
* Paid access is granted only after backend billing status becomes active.
* Existing Free organizations can upgrade.
* Owners can open Stripe Customer Portal.
* Billing settings show accurate backend status.
* Protected billing fields are never written by the frontend.
* All existing non-billing Scribb functionality continues to work.
* No backend files or repositories were modified.
