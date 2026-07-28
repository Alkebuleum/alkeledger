# Scribb Organization Billing and Creation Gate

## Objective

Update Scribb organization onboarding so every new organization selects either:

1. **Start Free**
2. **Switch & Save**

Free organizations can be created without payment.

Paid organizations must complete Stripe Checkout before their workspace becomes active.

---

# Pricing to implement

## Scribb Free

**Price:** $0

Initial limits:

* Up to 50 members
* Up to 2 administrators
* Basic membership records
* Basic document storage
* Meeting notes
* Basic reports
* Scribb branding

No credit card is required.

## Scribb Standard

**Monthly:** $49 per month

Initial limits:

* Up to 500 members
* Up to 5 administrators
* Membership categories
* Dues tracking
* Meetings and attendance
* Board resolutions
* Committees and projects
* Advanced reports
* Compliance calendar
* Record exports
* Standard support

## Switch & Save Migration

**Migration fee:** $299 one time

The migration charge applies only when Scribb will migrate an organization from another paid platform.

Do not automatically charge every paid customer a migration fee.

Create a checkbox or onboarding question:

> Are you switching from another membership-management platform?

When the answer is yes, collect:

* Current platform name
* Approximate number of members
* Current monthly or annual price
* Desired migration date
* Whether historical records must be migrated

For monthly Switch & Save customers, Stripe Checkout can contain:

* $49 recurring subscription
* $299 one-time migration fee

For customers not requesting migration, Checkout should contain only the recurring subscription.

---

# Required onboarding flow

## Step 1: User account

The user must be authenticated before creating an organization.

## Step 2: Organization information

Collect:

* Organization name
* Organization type
* Country
* State or region
* Website, if available
* Estimated number of members
* Primary administrator name
* Primary administrator email

Do not create a fully active organization yet.

Create an onboarding record or draft organization so the information is not lost if the user leaves Checkout.

## Step 3: Choose plan

Display two prominent options:

### Start Free

Supporting text:

> Start organizing your members and institutional records. No card required.

Button:

> Create Free Workspace

### Switch & Save

Supporting text:

> Move from your current membership platform and reduce your recurring software cost.

Button:

> Continue to Paid Setup

## Step 4A: Free workspace creation

When the user selects Start Free:

1. Create the organization.
2. Assign the authenticated user as owner.
3. Set the plan to `free`.
4. Set the billing status to `not_required`.
5. Set the organization status to `active`.
6. Apply Free-plan limits.
7. Redirect the user into the organization setup wizard.

No Stripe Customer should be required at this stage.

## Step 4B: Paid workspace checkout

When the user selects Switch & Save:

1. Create a draft or pending organization.
2. Create or retrieve a Stripe Customer for the authenticated account.
3. Create a Stripe Checkout Session on the backend.
4. Attach Scribb identifiers to Stripe metadata.
5. Redirect the user to Stripe Checkout.
6. Keep the organization unavailable until payment is confirmed.

The Checkout Session metadata should include:

* `user_id`
* `organization_id`
* `selected_plan`
* `migration_requested`
* `onboarding_id`

Never allow the frontend to supply arbitrary Stripe Price IDs.

The backend must map approved internal plan names to Stripe Price IDs.

Example:

* `standard_monthly` → Stripe monthly Price ID
* `standard_annual` → Stripe annual Price ID
* `migration_fee` → Stripe one-time Price ID

## Step 5: Payment confirmation

Do not activate the organization solely because the user reached the Checkout success page.

The Stripe webhook is the source of truth.

On successful payment:

1. Verify the Stripe webhook signature.
2. Confirm that the Checkout Session belongs to the correct Scribb organization.
3. Store the Stripe Customer ID.
4. Store the Stripe Subscription ID.
5. Set the Scribb plan to `standard`.
6. Set the billing status to `active`.
7. Set the organization status to `active`.
8. Assign the user as organization owner.
9. Apply Standard-plan limits.
10. Record that the Checkout Session has already been processed.
11. Redirect the returning user into the organization setup wizard.

The handler must be idempotent. Receiving the same Stripe event more than once must not create duplicate organizations, subscriptions, owners, or payments.

## Step 6: Cancelled checkout

When a user leaves or cancels Stripe Checkout:

* Keep the organization in `pending_payment`.
* Do not provide access to paid features.
* Allow the user to resume checkout.
* Allow the user to change the draft organization to the Free plan.
* Automatically remove abandoned draft organizations after a defined retention period.

---

# Subscription lifecycle

The backend must respond to these Stripe events:

## `checkout.session.completed`

Activate a newly paid organization after verifying the Checkout Session.

## `invoice.paid`

Confirm that the subscription remains in good standing.

## `invoice.payment_failed`

Set the billing status to `past_due`.

Do not immediately delete the organization or its data.

Show the owner a billing notice and link to update the payment method.

## `customer.subscription.updated`

Synchronize subscription status, plan changes, cancellation scheduling, and billing-period information.

## `customer.subscription.deleted`

Set the subscription status to `canceled`.

Downgrade access according to Scribb’s cancellation policy without deleting organizational records.

---

# Recommended organization billing fields

Add or confirm the following fields:

* `plan_code`
* `organization_status`
* `billing_status`
* `stripe_customer_id`
* `stripe_subscription_id`
* `stripe_checkout_session_id`
* `stripe_price_id`
* `subscription_current_period_end`
* `cancel_at_period_end`
* `migration_requested`
* `migration_status`
* `trial_ends_at`
* `created_by_user_id`

Suggested values:

## Organization status

* `draft`
* `pending_payment`
* `active`
* `suspended`
* `archived`

## Billing status

* `not_required`
* `checkout_pending`
* `active`
* `past_due`
* `canceled`
* `incomplete`

## Plan code

* `free`
* `standard_monthly`
* `standard_annual`

---

# Feature enforcement

Do not enforce plans only by hiding frontend buttons.

The backend must enforce:

* Member limits
* Administrator limits
* Storage limits
* Reporting access
* Export access
* Committee and project access
* Compliance features
* AI or records-intelligence usage

The frontend should explain why a restricted feature is unavailable and provide an Upgrade button.

---

# Billing management

Add a Billing page inside Organization Settings.

Show:

* Current plan
* Billing status
* Renewal date
* Member usage
* Administrator usage
* Available upgrade
* Migration status, when applicable

Add a button:

> Manage Billing

This button should create a Stripe Customer Portal session on the backend and redirect the organization owner to Stripe.

Only organization owners or authorized billing administrators may access billing management.

---

# Security requirements

* Stripe secret keys must exist only on the backend.
* Stripe webhook signatures must be verified.
* Stripe Price IDs must be selected by the backend.
* Organization IDs must be validated against the authenticated user.
* Webhook processing must be idempotent.
* Raw card data must never pass through or be stored by Scribb.
* Test and live Stripe keys, prices, products, and webhook secrets must remain separate.
* The frontend repository must not implement backend billing logic.
* The backend repository must not make unrelated frontend changes.

---

# Suggested user experience

## Pricing choice

### Start Free

$0

For associations getting organized for the first time.

**Create Free Workspace**

### Switch & Save

From $49/month

For organizations moving from another paid membership platform.

**Start Paid Setup**

Supporting message:

> Already paying for membership software? Scribb can help migrate the records and functions you use while reducing your recurring cost.

---

# Definition of done

The feature is complete when:

1. A user can create one Free organization without entering payment details.
2. A user can select Standard and complete Stripe Checkout.
3. A paid organization remains inaccessible before payment confirmation.
4. The verified Stripe webhook activates the correct organization.
5. Duplicate webhook delivery does not duplicate the organization or subscription.
6. A failed payment updates the organization to `past_due`.
7. A canceled subscription updates Scribb access correctly.
8. Owners can open the Stripe Customer Portal.
9. Free and Standard limits are enforced by the backend.
10. Test-mode Stripe payments pass successfully.
11. Live-mode configuration can be enabled through environment variables without code changes.
