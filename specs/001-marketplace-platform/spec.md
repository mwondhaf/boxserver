# Feature Specification: Multi-Vendor Delivery Marketplace Platform

**Feature Branch**: `001-marketplace-platform`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "look at /Users/mwondha/Documents/dev/ts/web/boxkubox/boxconv and get good specs" — replicate the functional behaviour of the existing BoxConv marketplace.

## Overview

The platform is a multi-vendor delivery marketplace operating in Uganda (UGX currency, Africa/Kampala timezone). It connects four kinds of actors: **customers** who order goods, **vendors** (grocery stores and food restaurants) who sell and fulfil, **riders** who deliver, and **platform admins** who operate the marketplace. It additionally supports **guest** ordering (e.g. via chat channels) and **peer-to-peer parcel delivery** that is independent of any vendor.

This specification defines functional parity with the existing system: the marketplace must reproduce the same user-visible behaviour, business rules, money flows, and lifecycle states, regardless of the underlying technology.

## Clarifications

### Session 2026-06-13

- Q: How should live updates (order status, rider location) be delivered now that the realtime backend is gone? → A: Push over a persistent connection (WebSocket/SSE).
- Q: What posture for external money services (commission/payout ledger and mobile money) in v1? → A: Integrate both live behind injectable service interfaces.
- Q: Fresh database or migrate existing data? → A: Greenfield database with seed data; no migration of legacy data in v1.
- Q: What is the immediate planning scope across the 12 user stories? → A: All 12 stories (full parity); priorities sequence the work, they do not cut scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accounts, Roles & Vendor Teams (Priority: P1)

A person signs up and is recognised as a customer by default. Operators can be granted a platform admin or rider role. A vendor is represented as an organization that can have multiple member users with distinct responsibilities (owner, admin, member). A user acting on behalf of a vendor does so within the context of that organization.

**Why this priority**: Every other capability depends on knowing who the actor is and what they are allowed to do. Without identity, roles, and vendor-team scoping, nothing else can be built or tested.

**Independent Test**: Create users, grant a rider role and an admin role, create a vendor organization with an owner and add a second member; verify each actor only sees and can act on what their role permits.

**Acceptance Scenarios**:

1. **Given** a newly registered user with no special role, **When** they sign in, **Then** they are treated as a customer and can browse and order but cannot access vendor, rider, or admin areas.
2. **Given** a vendor organization with an owner, **When** the owner invites a teammate as a member, **Then** the teammate can manage that vendor's catalog and orders but cannot change payout/banking settings or delete the organization.
3. **Given** a user with the rider role, **When** they sign in, **Then** they can access rider delivery functions and cannot access vendor or admin functions.
4. **Given** any request that acts on a specific actor's data, **When** it is processed, **Then** the acting identity is taken from the authenticated session and never trusted from client-supplied input.

---

### User Story 2 - Vendor Catalog & Storefront Browsing (Priority: P1)

Customers browse vendors by category and location, open a vendor storefront, search and filter products, and view product detail including price, availability, images, and (for food vendors) customisation options. Vendors manage their own catalog: products, vendor-specific variants (unit, SKU, stock, availability), prices (including sale and tiered pricing), images, curated collections, and — for food vendors — modifier groups and options.

**Why this priority**: A marketplace with identities but no browsable catalog delivers no value. This is the visible front of the MVP.

**Independent Test**: As a vendor, publish a product with a priced, in-stock variant; as a customer, find that vendor by category, search the product, and see correct price and availability.

**Acceptance Scenarios**:

1. **Given** an active vendor with available, approved variants, **When** a customer opens the storefront, **Then** only available items are shown with their customer-facing price.
2. **Given** a food vendor, **When** a product has a required modifier group, **Then** the customer must choose within the group's min/max selection rules before the item can be added to cart, and option surcharges are reflected in price.
3. **Given** a vendor marks a variant out of stock or unavailable, **When** a customer views it, **Then** it is shown as unavailable and cannot be ordered.
4. **Given** a busy or inactive vendor (paused or outside business hours), **When** a customer tries to order, **Then** ordering is blocked with a clear reason.
5. **Given** tiered pricing or a sale price on a variant, **When** the customer views and adds it, **Then** the correct price for the chosen quantity is applied.

---

### User Story 3 - Cart, Pricing & Checkout (Priority: P1)

A customer (or guest) builds a cart scoped to a single vendor, applies a promo code if any, chooses a fulfillment type (platform delivery, vendor self-delivery, or self-pickup) and a delivery address, sees a transparent price breakdown (items subtotal, markup, service fee, small-order fee, delivery fee, discounts, total), chooses a payment method, and places the order. Carts expire after inactivity; guest carts are tracked by session.

**Why this priority**: Converting browsing into a paid order is the core revenue event. It ties together pricing rules, fees, promotions, delivery quotes, and payment.

**Independent Test**: Build a cart, apply a valid promo, select platform delivery to a valid address, and place a mobile-money order; verify the breakdown matches the configured fee and pricing rules and the order is created in a pending/awaiting-payment state.

**Acceptance Scenarios**:

1. **Given** category markup is enabled, **When** a customer views the cart, **Then** customer-facing prices include the configured per-category markup; when markup is disabled, raw vendor prices are shown and platform revenue comes from service/small-order fees instead.
2. **Given** a cart below the vendor's minimum order amount, **When** the customer attempts checkout, **Then** checkout is blocked with the minimum-order message.
3. **Given** a cart below the platform small-order threshold, **When** fees are calculated, **Then** the small-order fee is added per platform settings.
4. **Given** platform delivery is chosen, **When** the customer enters a delivery address inside a serviceable zone, **Then** a delivery fee is quoted from the zone's pricing rule (base + per-km + surge, floored at min fee); if outside any active/serviceable zone, ordering is blocked with a reason.
5. **Given** a valid promo code that meets its rules and usage limits, **When** applied, **Then** the discount is reflected and usage is recorded; an expired, inactive, over-limit, or non-matching code is rejected.
6. **Given** a chosen payment method that is enabled in platform settings, **When** the order is placed, **Then** the order is created with the matching payment status (awaiting until captured).

---

### User Story 4 - Order Lifecycle & Fulfillment (Priority: P1)

An order moves through a defined lifecycle: pending → confirmed → preparing → ready for pickup → out for delivery → delivered → completed, with cancellation and refund paths. The vendor confirms and prepares orders; for food vendors a prep-time clock gates when a rider is dispatched. Item-level issues are handled via availability flags and swap proposals the customer can accept or reject within a deadline. Every status, payment, and item change is recorded in an audit log with actor and role. Unconfirmed orders auto-cancel after a timeout (with restock and, if already paid, refund).

**Why this priority**: Fulfillment is the operational heart of the marketplace and the precondition for paying vendors and riders.

**Independent Test**: Place a paid order, have the vendor confirm and prepare it, propose a swap for an unavailable item, have the customer accept it, then progress the order to delivered/completed; verify each transition is recorded with the correct actor.

**Acceptance Scenarios**:

1. **Given** a new paid order, **When** the vendor confirms it, **Then** status advances and the event is logged with the vendor as actor.
2. **Given** an item becomes unavailable, **When** the vendor proposes a swap, **Then** the customer sees the proposed alternative and price and must respond before the swap deadline; on acceptance the order totals update, on rejection/expiry the item is handled as refunded/removed.
3. **Given** a food order, **When** the vendor starts preparing, **Then** the rider is not offered the delivery until the order is within the rider lead time of its estimated ready time.
4. **Given** an order the vendor has not confirmed within the configured timeout, **When** the auto-cancel sweep runs, **Then** the order is cancelled, items are restocked, and a paid order is refunded with its commission split reversed.
5. **Given** any order, **When** its status, payment status, fulfillment status, or items change, **Then** an audit event is recorded with before/after values, actor identity, and role.

---

### User Story 5 - Rider Delivery & Dispatch (Priority: P2)

Riders register and are approved by admins (with Uganda-specific compliance: NIN, driving permit, vehicle, helmet, insurance), are assigned to stages/hubs, and set themselves online/offline/busy. Dispatch offers a delivery (order or parcel) to a specific eligible rider who can accept it. The rider navigates to pickup, enters the vendor-held pickup code (or sender code for parcels) to confirm pickup, delivers, optionally captures proof of delivery, and the customer can enter a delivery code. Riders share live location while on an active job, can report incidents, and accrue ratings and earnings.

**Why this priority**: Delivery completes the order journey, but the marketplace can demonstrate value (and self-/pickup delivery) before platform dispatch exists, so this follows the ordering core.

**Independent Test**: Approve a rider, set them online, offer them a ready order, accept, confirm pickup via code, mark delivered, and verify earnings and rating eligibility are recorded.

**Acceptance Scenarios**:

1. **Given** a rider application, **When** an admin approves it, **Then** the rider becomes active and can go online; a suspended/inactive rider cannot accept work.
2. **Given** a ready delivery, **When** dispatch offers it to an online rider, **Then** only the offered rider can accept it within the offer window; if not accepted it can be re-offered.
3. **Given** an accepted order, **When** the rider enters the correct vendor pickup code, **Then** the order is marked picked up; an incorrect code is rejected.
4. **Given** an active delivery, **When** the rider updates location, **Then** the customer/vendor can see live tracking and the rider's status reflects busy.
5. **Given** a completed delivery, **When** the customer rates the rider, **Then** the rating updates the rider's running average and counts.
6. **Given** an in-progress delivery problem, **When** the rider reports an incident, **Then** it is logged for admin review and may release the delivery.

---

### User Story 6 - Delivery Zones, Fare & Quotes (Priority: P2)

Admins define geographic delivery zones (center, max distance, serviceability, temporary suspension) and pricing rules (base fee, per-km rate, min fee, surge multiplier, optional day/hour windows). The system computes delivery fees by locating the address's zone, measuring distance (mapping provider with haversine fallback), and applying the matching rule. Quotes are cached with an expiry and linked to the order/parcel they are used for.

**Why this priority**: Accurate, zone-aware delivery pricing underpins both checkout (US3) and dispatch economics (US5); it is foundational to delivery but separable from the catalog MVP.

**Independent Test**: Configure a zone and pricing rule, request a quote for an address inside the zone, and verify the fee equals base + per-km×distance × surge, floored at min fee; request one outside any zone and verify it is rejected.

**Acceptance Scenarios**:

1. **Given** an address inside an active, non-suspended zone, **When** a quote is requested, **Then** the fee uses that zone's active rule and respects any day/hour window.
2. **Given** an address beyond all zones' max distance, **When** a quote is requested, **Then** no serviceable quote is returned.
3. **Given** a zone temporarily suspended (e.g. weather), **When** a customer in it orders, **Then** ordering is blocked with the suspension message.
4. **Given** a quote, **When** it is older than its expiry, **Then** it can no longer be used to place an order and must be re-quoted.

---

### User Story 7 - Financial Splits, Wallets & Payouts (Priority: P2)

When an order's (or parcel's) payment is captured, the platform records the financial event with an external ledger: the order value is split into a platform commission and the vendor's remainder, and the delivery fee is split into a platform cut and the rider's earnings. Commission is determined by precedence (vendor-level override → delivery-zone mapping → order-level fallback). Each vendor, rider, and customer is mapped to a wallet, auto-created on first need. Captured events are idempotent (no duplicate splits), failed syncs retry automatically, quarantined events (inactive wallet) reprocess once the wallet is active, and refunds reverse the split. Payouts to riders are batched per earnings period.

**Why this priority**: This is how the marketplace makes money and pays its participants; it depends on completed orders/deliveries (US3–US6).

**Independent Test**: Capture payment on an order, verify a single split is recorded with commission to platform and remainder to vendor and the rider's delivery share, then cancel/refund and verify the split reverses exactly once.

**Acceptance Scenarios**:

1. **Given** a captured order, **When** the split is recorded, **Then** the vendor wallet receives order value minus commission and the rider wallet receives delivery fee minus platform cut, using the highest-precedence commission rule that applies.
2. **Given** a sync that already succeeded, **When** it is retried, **Then** no duplicate split is created (idempotent by correlation key).
3. **Given** a sync that failed due to a transient error, **When** the retry sweep runs, **Then** it self-heals without manual intervention.
4. **Given** an event quarantined because a wallet was inactive, **When** the wallet becomes active, **Then** the event reprocesses and settles.
5. **Given** an auto-cancelled paid order, **When** the refund is issued, **Then** the customer is refunded and the commission split is reversed; a refund that fails is retried until it lands.
6. **Given** a freelance rider with completed deliveries in a period, **When** a payout batch is created, **Then** it covers that period's deliveries; in-house (salaried) riders' per-order earnings are not surfaced as payouts.

---

### User Story 8 - Mobile Money Payments (Priority: P2)

Customers pay (and the platform disburses) via Ugandan mobile money (MTN, Airtel; UGX only). An inbound collection request moves through initiated → pending → success/failed/expired, driven by provider callbacks, and is linked to its order, parcel, or subscription. Order-first checkout that is never paid is swept and cancelled (with restock) after a timeout.

**Why this priority**: Mobile money is the primary payment rail; it directly enables payment capture (US7) but is separable from cash-on-delivery flows.

**Independent Test**: Initiate a mobile-money collection for an order, simulate a success callback, and verify the payment and order move to captured; simulate a failure and verify the order remains unpaid and is eventually swept.

**Acceptance Scenarios**:

1. **Given** a customer chooses mobile money, **When** they confirm on their phone, **Then** the payment transitions to success and the linked order is marked captured.
2. **Given** a collection that the customer never approves, **When** it expires, **Then** the payment is marked expired and the abandoned order is cancelled and restocked.
3. **Given** a successful payment, **When** the provider callback is received more than once, **Then** the order is captured only once.

---

### User Story 9 - Peer-to-Peer Parcel Delivery (Priority: P3)

A sender requests a parcel delivery independent of any vendor: pickup and dropoff details, package description, size category, fragile flag, and declared value. Pricing combines a package fee (size fee × fragile multiplier + insurance on declared value) with a zone delivery fee. The parcel is dispatched to a rider like an order, uses pickup and delivery codes, supports proof of delivery, and produces a financial split (package fee → platform, delivery fee → rider).

**Why this priority**: Parcels reuse rider, zone, fare, and financial machinery but serve a distinct use case that is not required for the food/grocery MVP.

**Independent Test**: Create a parcel with a declared value and fragile flag, verify the quoted fare equals package fee + insurance + zone delivery fee, dispatch and complete it, and verify the split records package fee to platform and delivery fee to rider.

**Acceptance Scenarios**:

1. **Given** package size, fragile flag, and declared value, **When** a parcel quote is requested, **Then** the total fare equals (size fee × fragile multiplier + insurance) + zone delivery fee.
2. **Given** a created parcel, **When** it is dispatched and the rider confirms pickup with the sender code, **Then** it advances to in transit and on delivery to delivered.
3. **Given** a delivered parcel, **When** the split is recorded, **Then** the package fee is platform revenue and the delivery fee is the rider's earnings.

---

### User Story 10 - Promotions, Campaigns & Referrals (Priority: P3)

Admins and vendors run promotions (standard or buy-get) with discount application methods (fixed/percentage; targeting items, shipping, or order; allocation each/across), eligibility rules (product, category, customer, cart total, quantity, zone, time/day), usage limits (overall and per-customer), and optional campaign budgets. Customers have referral codes; a successful referral that meets the minimum qualifying order is rewarded, with platform-configurable reward amounts and per-code limits, optionally boosted during an active campaign.

**Why this priority**: Growth and marketing levers add value but are not required to operate the core marketplace.

**Independent Test**: Create a percentage promo limited to a category with a per-customer usage cap, apply it within rules, exceed the cap on a second order, and verify the second application is rejected; separately, complete a qualifying referral and verify the reward is granted.

**Acceptance Scenarios**:

1. **Given** a promotion with eligibility rules and usage limits, **When** a cart matches the rules and is within limits, **Then** the discount applies and usage/budget counters increment; otherwise it is rejected.
2. **Given** a buy-get promotion, **When** the buy condition is met, **Then** the get benefit is applied per its quantity rules.
3. **Given** a referred customer who places a qualifying first order, **When** the order completes, **Then** the referrer's reward is recorded per current settings (including any active-campaign boost) and per-code limits are enforced.

---

### User Story 11 - Prepaid Subscription Plans (Priority: P3)

Food/grocery vendors publish finite prepaid plans (e.g. a 4-cycle weekly pack) with included items, cadence, price per cycle, and bookable delivery windows with capacity. A customer pays the grand total upfront; each cycle a scheduled process mints an order, records the per-cycle financial split, and decrements remaining cycles. Plan and slot details are snapshotted so vendor edits don't break in-flight subscriptions. Subscriptions can be paused, skipped, resumed, cancelled (with refund of remaining cycles), or completed.

**Why this priority**: Recurring revenue is valuable but advanced; it depends on orders, payments, and financial splits being solid first.

**Independent Test**: Publish a 4-cycle plan, subscribe and pay upfront, run the cycle process once, and verify an order is minted, a cycle marked fulfilled, and remaining cycles decremented; cancel mid-plan and verify the remaining-cycle refund.

**Acceptance Scenarios**:

1. **Given** a subscriber who has paid upfront, **When** a cycle becomes due, **Then** an order is created from the snapshotted items, the cycle is fulfilled, and remaining cycles decrease by one.
2. **Given** a slot with limited capacity, **When** it is full, **Then** new subscribers cannot select that slot.
3. **Given** an active subscription, **When** the customer pauses/skips, **Then** the next due cycle is skipped or deferred per the request and resumes correctly.
4. **Given** a mid-plan cancellation, **When** processed, **Then** the customer is refunded for unfulfilled cycles only.

---

### User Story 12 - Platform Administration & Operations (Priority: P3)

Admins configure platform-wide settings (enabled payment methods and instructions, service toggles for grocery/parcels, markup/service-fee/small-order-fee policy, referral policy, support contact details), manage the master product catalog and category pricing rules, approve vendors and riders, manage delivery zones and commission mappings, and view operational dashboards and reports (orders, revenue, vendor and rider performance).

**Why this priority**: Operators need control and visibility, but defaults can run the marketplace; admin tooling layers on top of the functional core.

**Independent Test**: As an admin, toggle a payment method off and verify it disappears from checkout options; change the small-order-fee threshold and verify a new order's fee reflects it; view an orders dashboard and confirm it reflects recent activity.

**Acceptance Scenarios**:

1. **Given** an admin disables a payment method, **When** a customer checks out, **Then** that method is no longer offered.
2. **Given** an admin sets a category markup percentage, **When** a customer views a product in that category (markup enabled), **Then** the displayed price includes the markup.
3. **Given** recent orders and deliveries, **When** an admin opens the dashboard/reports, **Then** they see accurate aggregate metrics for the chosen period.

---

### Edge Cases

- A customer's cart spans a vendor that becomes inactive/busy before checkout → checkout is blocked with a clear reason.
- A delivery quote expires between cart review and order placement → the customer is re-quoted before the order is accepted.
- A promo code's campaign budget is exhausted mid-checkout → the discount is rejected and the customer is informed.
- A mobile-money callback arrives after the order was already auto-cancelled → the late payment is reconciled (refunded) rather than silently capturing a cancelled order.
- A rider goes offline or reports an incident mid-delivery → the delivery is released/re-offered and the customer is kept informed.
- A vendor edits a subscription plan after customers have subscribed → in-flight subscriptions use their snapshot, unaffected by the edit.
- Concurrent stock decrement on the last unit of a variant → only one order succeeds; the other sees it as unavailable.
- A guest order with only a session id and phone → ownership is proven by the session for the duration of the chat, without a registered account.

## Requirements *(mandatory)*

### Functional Requirements

**Identity & Authorization**

- **FR-001**: The system MUST authenticate users and treat a user with no special role as a customer by default.
- **FR-002**: The system MUST support platform admin and rider roles, and vendor organizations with member roles of owner, admin, and member.
- **FR-003**: The system MUST scope all vendor data and actions to the vendor organization the actor belongs to, and MUST prevent cross-vendor access.
- **FR-004**: The system MUST restrict payout/banking settings and organization deletion to the vendor owner, and MUST prevent vendor admins/members from altering protected order/financial fields.
- **FR-005**: The system MUST derive the acting identity from the authenticated session and MUST NOT accept caller identity as request input.

**Catalog & Storefront**

- **FR-006**: Vendors MUST be able to manage products, vendor-specific variants (unit, SKU, stock, availability, approval), prices (regular, sale, tiered by quantity), images, and curated collections.
- **FR-007**: Food vendors MUST be able to define modifier groups (required, min/max selections) and options (with surcharges and availability) attached to products.
- **FR-008**: Customers MUST be able to discover vendors by category and location, open a storefront, search/filter products, and view only available, approved items with correct customer-facing prices.
- **FR-009**: The system MUST block ordering from a vendor that is inactive, busy/paused, or outside its business hours, with a clear reason.
- **FR-010**: The system MUST enforce modifier selection rules before an item can be added to a food cart and reflect option surcharges in the line price.
- **FR-059**: The system SHOULD surface time-of-day product recommendations (pre-computed hourly), with admin-configurable per-category time boosts.

**Cart, Pricing & Checkout**

- **FR-011**: The system MUST maintain a cart scoped to a single vendor, support guest carts identified by session, and expire carts after inactivity (`cartTtlHours`).
- **FR-012**: The system MUST compute the price breakdown including item subtotal, per-category markup (when enabled), service fee, small-order fee, delivery fee, discounts, taxes, and total, in the smallest currency unit (UGX).
- **FR-013**: The system MUST support fulfillment types platform-delivery, vendor self-delivery, and self-pickup, applying the appropriate delivery fee/instructions for each.
- **FR-014**: The system MUST enforce a vendor's minimum order amount and the platform small-order-fee threshold.
- **FR-015**: The system MUST only offer payment methods that are enabled in platform settings and create the order with the corresponding payment status.
- **FR-016**: The system MUST support customer and guest checkout, capturing inline delivery location for guests without a saved address.
- **FR-058**: Customers MUST be able to create, list, update, delete, and set a default saved delivery address (label, location, geolocation, directions); guest checkout MAY instead supply an inline delivery location without a saved address.

**Orders & Fulfillment**

- **FR-017**: The system MUST model the order lifecycle (pending, confirmed, preparing, ready for pickup, out for delivery, delivered, completed, cancelled, refunded) and enforce valid transitions.
- **FR-018**: The system MUST allow vendors to confirm, prepare, and progress orders, and MUST gate food-order rider dispatch by the prep-time clock and the configured rider lead time (`riderLeadTimeMinutes`).
- **FR-019**: The system MUST support item availability flags and vendor-proposed swaps that the customer accepts or rejects before a deadline, updating totals accordingly.
- **FR-020**: The system MUST record an immutable audit event for every order/payment/fulfillment/item change, including actor identity, role, reason, and monetary snapshots.
- **FR-021**: The system MUST auto-cancel orders left unconfirmed beyond the configured timeout (`unconfirmedOrderTimeoutMinutes`), restock items, and refund already-paid orders.

**Riders & Dispatch**

- **FR-022**: The system MUST support rider registration with Uganda compliance data (NIN, driving permit + expiry, vehicle details, helmet verification, insurance) and admin approval, suspension, and deactivation.
- **FR-023**: The system MUST support rider stages/hubs and many-to-many rider–stage assignments with a primary stage.
- **FR-024**: The system MUST let riders set online/offline/busy status and MUST offer a delivery to a specific eligible rider with an acceptance window (`riderOfferWindowSeconds`) and re-offer capability.
- **FR-025**: The system MUST verify pickup via a vendor-held pickup code (sender code for parcels) and support an optional delivery code and proof-of-delivery capture.
- **FR-026**: The system MUST track rider live location during active jobs and expose it to the customer/vendor (delivery transport is governed by FR-056).
- **FR-027**: The system MUST capture rider ratings (overall plus optional sub-ratings) and maintain running averages, and MUST let riders report incidents for admin review that may release a delivery.
- **FR-028**: The system MUST distinguish freelance (per-delivery earnings) from in-house (salaried, earnings hidden) riders.

**Delivery Zones, Fare & Quotes**

- **FR-029**: Admins MUST be able to define delivery zones (center, max distance, active/suspended state) and pricing rules (base fee, per-km rate, min fee, surge, optional day/hour windows).
- **FR-030**: The system MUST compute a delivery fee by locating the address's zone, measuring distance (mapping provider with haversine fallback), and applying the matching rule, floored at the min fee.
- **FR-031**: The system MUST reject orders to addresses outside any serviceable zone or to suspended zones, with a clear reason.
- **FR-032**: The system MUST cache quotes with an expiry and refuse to place orders on expired quotes.

**Financial Splits, Wallets & Payouts**

- **FR-033**: On payment capture the system MUST record a financial split: order value into platform commission + vendor remainder, and delivery fee into platform cut + rider earnings.
- **FR-034**: The system MUST select the commission rule by precedence: vendor-level override → delivery-zone mapping → order-level fallback.
- **FR-035**: The system MUST map vendors, riders, and customers to wallets, auto-creating them on first need and logging auto-creation outcomes.
- **FR-036**: The system MUST make capture/sync idempotent via a correlation key, automatically retry transient failures, reprocess quarantined events when wallets become active, and reverse splits on refund (retrying failed refunds).
- **FR-037**: The system MUST batch rider payouts per earnings period and MUST NOT surface per-order earnings/payouts for in-house riders.

**Payments (Mobile Money)**

- **FR-038**: The system MUST support inbound mobile-money collection and outbound disbursement (MTN, Airtel; UGX) with the lifecycle initiated → pending → success/failed/expired, driven by provider callbacks and linked to order/parcel/subscription.
- **FR-039**: The system MUST sweep and cancel (with restock) order-first checkouts that are never paid past the timeout, and MUST reconcile late callbacks against already-cancelled orders.
- **FR-040**: The system MUST capture an order/parcel only once even if a success callback is received multiple times.

**Parcels**

- **FR-041**: The system MUST support vendor-independent parcel delivery requests with pickup/dropoff details, size category, fragile flag, and declared value.
- **FR-042**: The system MUST price a parcel as package fee (size fee × fragile multiplier + insurance on declared value) plus zone delivery fee, and MUST split package fee → platform and delivery fee → rider on capture.
- **FR-043**: The system MUST run parcels through the same dispatch, pickup/delivery code, proof-of-delivery, and audit flow as orders.

**Promotions, Campaigns & Referrals**

- **FR-044**: The system MUST support standard and buy-get promotions with application methods (fixed/percentage; target items/shipping/order; allocation each/across), eligibility rules, and usage limits (overall and per customer).
- **FR-045**: The system MUST support optional campaign budgets (spend or usage based) that gate promotion availability when exhausted.
- **FR-046**: The system MUST issue per-customer referral codes, reward qualifying referrals per platform settings (including active-campaign boosts), and enforce per-code limits.

**Subscriptions**

- **FR-047**: Vendors MUST be able to publish finite prepaid plans with included items, cadence, per-cycle price, and capacity-limited delivery slots.
- **FR-048**: The system MUST charge the grand total upfront, snapshot plan and slot details, and on each due cycle mint an order, record its split, and decrement remaining cycles.
- **FR-049**: The system MUST support pause, skip, resume, cancel (refunding only unfulfilled cycles), and completion of subscriptions.

**Platform Administration**

- **FR-050**: Admins MUST be able to configure platform settings: payment-method toggles and instructions, service toggles (grocery, parcels), markup/service-fee/small-order-fee policy, referral policy, and support contact details.
- **FR-051**: Admins MUST be able to manage the master catalog, category pricing rules, vendor and rider approvals, delivery zones, and commission mappings.
- **FR-052**: Admins MUST be able to view operational dashboards and reports (orders, revenue, vendor and rider performance) for a chosen period.

**Cross-Cutting**

- **FR-053**: The system MUST generate human-readable sequential display identifiers for orders and parcels.
- **FR-054**: The system MUST notify the relevant actors on key lifecycle events (order placed, confirmed, out for delivery, delivered; rider offered a job; payment outcome).
- **FR-055**: The system MUST default monetary values to UGX in the smallest unit and operate in the Africa/Kampala timezone unless configured otherwise.
- **FR-056**: The system MUST push live updates for order/parcel status changes and rider location to subscribed actors over a persistent connection (WebSocket/SSE), so clients reflect changes without polling or manual refresh.
- **FR-057**: The system MUST integrate the external commission/payout ledger and the external mobile-money provider through replaceable service interfaces, against the live external services in v1, while remaining able to swap implementations without changing business logic.
- **FR-060**: The system MUST rate-limit authentication and external webhook endpoints and verify webhook signatures, to resist brute-force and replay abuse.

### Key Entities *(include if feature involves data)*

- **User / Actor**: A person with a role (customer by default; rider or admin when granted). Identity and credentials are managed by the authentication system.
- **Organization (Vendor)**: A grocery or food business with members (owner/admin/member), location, business hours, fulfillment options, payout details, and a platform type that changes checkout/menu behaviour.
- **Product / Variant / Price**: A catalog item; vendor-specific variants carry stock, availability, and SKU; prices support regular, sale, and quantity-tiered amounts.
- **Modifier Group / Option**: Food customisation attached to a product with selection rules and per-option surcharges; snapshotted onto order items.
- **Category / Brand / Collection**: Classification and curation of products, including per-category pricing/markup rules.
- **Cart / Cart Item**: An ephemeral, single-vendor selection (user- or session-owned) with modifier selections, expiring after inactivity.
- **Order / Order Item / Order Event**: A placed purchase with lifecycle/payment/fulfillment status, fee breakdown, item snapshots, swap state, and an audit trail.
- **Customer Address**: A saved or inline delivery location with geolocation and directions.
- **Rider**: A delivery person with compliance data, vehicle, employment type, performance metrics, payout preferences, and stage assignments.
- **Stage**: A rider hub/gathering point tied to a zone, with capacity.
- **Parcel / Parcel Event**: A vendor-independent delivery with pickup/dropoff, package attributes, pricing, codes, and an audit trail.
- **Delivery Zone / Pricing Rule / Delivery Quote**: Geographic coverage, fee formula, and cached fee calculations linked to orders/parcels.
- **Wallet Mapping / Order Confirmation / Auto-Create Log**: Links actors to ledger wallets and records captured financial splits idempotently.
- **Mobile Money Payment**: An inbound/outbound transaction with a status lifecycle linked to an order, parcel, or subscription.
- **Promotion / Campaign / Application Method / Rule / Usage**: Discount definitions, budgets, eligibility, and usage tracking.
- **Referral Code / Referral**: Customer referral codes and the reward relationships they create.
- **Subscription Plan / Slot / Subscription / Cycle**: Prepaid finite plans, bookable delivery windows, customer agreements (snapshotted), and per-cycle fulfillment records.
- **Platform Settings**: Singleton platform-wide configuration governing fees, payment methods, services, referrals, and support.
- **Counter**: Source of sequential display identifiers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can go from opening a vendor storefront to a placed, paid order in under 3 minutes.
- **SC-002**: 100% of placed orders show a price breakdown whose components (markup, fees, delivery, discount) sum exactly to the charged total, with no rounding discrepancies.
- **SC-003**: 100% of captured orders and parcels produce exactly one financial split (no duplicate or missing splits), and 100% of refunds reverse their split exactly once.
- **SC-004**: 100% of delivery fees for in-zone addresses match the configured zone pricing rule; 100% of out-of-zone/suspended-zone requests are blocked with a reason.
- **SC-005**: Every order/parcel status, payment, fulfillment, and item change is captured in the audit trail with the correct actor and role (no untracked transitions).
- **SC-006**: Unconfirmed orders are auto-cancelled (with restock and, if paid, refund) within the configured timeout window in 100% of cases.
- **SC-007**: A rider can be offered, accept, pick up (via code), and deliver an order with each step recorded and pushed to the customer over a live connection within 5 seconds of the change, without a manual refresh.
- **SC-008**: Promotion and referral limits (overall, per-customer, per-code, campaign budget) are never exceeded across concurrent use.
- **SC-009**: A subscriber's prepaid cycles each mint exactly one order on schedule, and a mid-plan cancellation refunds only unfulfilled cycles.
- **SC-010**: Cross-vendor and cross-role access attempts are denied in 100% of cases; no action succeeds against data outside the actor's scope.

## Assumptions

- **Parity over redesign**: The goal is to reproduce the existing BoxConv behaviour and business rules; user-visible behaviour is the fixed contract and any intentional deviation will be documented in the affected requirement.
- **Currency & locale**: Default currency is UGX (smallest-unit integers, no decimals) and default timezone is Africa/Kampala; the model allows other values but only UG is in scope for v1.
- **External services are integrated, not rebuilt**: The financial ledger (commission split + payouts), mobile-money provider (MTN/Airtel), object storage for images/documents, distance/mapping provider, search, notifications, and support/CRM are treated as external dependencies the platform integrates with. Their internal implementations are out of scope; this spec defines the platform's behaviour at the integration boundary (including idempotency, retries, and fallbacks).
- **Live external money services in v1**: The commission/payout ledger and the mobile-money provider are wired to their live services in v1, accessed through replaceable service interfaces so implementations can be swapped (e.g. for verification) without changing business logic (see FR-057).
- **Greenfield data**: v1 starts from a fresh database with seed data; no migration of legacy data is in scope. Any future data migration is a separate effort.
- **Authentication provider**: A session-based authentication system manages users, credentials, and vendor-team memberships/roles; this spec relies on it for identity and does not redefine credential storage.
- **Search & recommendations**: Vendor/product search and time-of-day recommendations reproduce the existing capability (search by name with filters; pre-computed hourly recommendations) but the specific search engine is an implementation detail.
- **Guest ordering**: Guest orders (e.g. via chat/WhatsApp) are supported with session-proven ownership and inline delivery details, without requiring account registration.
- **Distance fallback**: When the mapping provider is unavailable, straight-line (haversine) distance is used as a fallback for fare calculation.
- **No automated UX/unit tests**: Per the project constitution, acceptance scenarios are behavioural descriptions for manual/integration verification, not mandates for automated unit or UI test suites.
- **Full parity is in scope for v1**: All 12 user stories (P1–P3) are in scope for this feature. Priorities sequence the work — P1 (identity, catalog, checkout, order lifecycle) first, then P2 (delivery/dispatch, zones/fares, financial splits, mobile money), then P3 (parcels, promotions/referrals, subscriptions, full admin tooling) — but no story is cut from scope. Planning and tasks cover all 12.
