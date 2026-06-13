---
description: "Task list for Multi-Vendor Delivery Marketplace Platform"
---

# Tasks: Multi-Vendor Delivery Marketplace Platform

**Input**: Design documents from `/specs/001-marketplace-platform/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Per Constitution Principle V, **no unit or UX tests are authored**. There are no test tasks. Quality gates are TypeScript strict compilation, DTO validation, Drizzle schema types, and lint/format (run `npm run build` + `npm run lint`).

**Organization**: Tasks are grouped by the 12 user stories (P1–P3). All 12 are in v1 scope; priorities sequence the work. Each user-story phase is an independently demonstrable increment.

**Conventions** (constitution): no barrel files; all multi-table reads via Drizzle RQB `with` (no manual joins; raw SQL only for admin reports); identity always from the Better Auth session, never request input; money is integer UGX.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US12 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Install API dependencies (drizzle-orm, drizzle-kit, pg, better-auth, class-validator, class-transformer, @nestjs/config, @nestjs/schedule, @nestjs/websockets, @nestjs/platform-socket.io) in `package.json`
- [X] T002 [P] Configure Drizzle (`drizzle.config.ts`) and add `db:push`/`db:migrate`/`db:seed` scripts to `package.json`
- [X] T003 [P] Enforce TypeScript strict mode in `tsconfig.json` and confirm ESLint/Prettier config in `eslint.config.mjs`/`.prettierrc`
- [X] T004 [P] Add typed env/config module in `src/common/config/config.module.ts` (DATABASE_URL, auth, BoxWallet, Relworx, storage, distance, currency/timezone defaults)
- [X] T005 [P] Scaffold the TanStack Router client under `web/` with Legend State, the Better Auth client, an API client, and a realtime client in `web/src/lib/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create the Drizzle client and `DrizzleModule` (DI provider for the typed `db`) in `src/db/client.ts` and `src/db/drizzle.module.ts`
- [X] T007 Create the schema registry + RQB relations aggregator in `src/db/schema/index.ts` and `src/db/relations.ts` (drizzle schema object, not a feature barrel)
- [X] T008 Configure Better Auth (email/password + organization plugin) in `src/auth/better-auth.ts` and mount the handler at `/api/auth/*` in `src/auth/auth.module.ts`
- [X] T009 Implement `SessionGuard` and the `@Actor()` param decorator resolving session → `ActorContext` in `src/auth/session.guard.ts` and `src/auth/actor.decorator.ts`
- [X] T010 Implement the CASL-style ability/policy layer (admin/vendor-owner/admin/member/rider) in `src/auth/ability/ability.factory.ts` and a `PoliciesGuard` in `src/auth/ability/policies.guard.ts`
- [X] T011 [P] Add the global `ValidationPipe({whitelist,transform})`, exception filter, and response envelope in `src/common/validation` and `src/common/filters`
- [X] T012 [P] Add money/UGX helpers, geohash util, and branded `Id<'table'>` types in `src/common/money.ts`, `src/common/geo.ts`, `src/common/ids.ts`
- [X] T013 [P] Add the `counters` table + sequential `displayId` service in `src/db/schema/counters.ts` and `src/common/counters/counters.service.ts`
- [X] T014 [P] Implement the in-process event bus in `src/realtime/event-bus.ts`
- [X] T015 Implement the realtime WebSocket gateway (Socket.IO) with channel authorization (reusing the ability layer) + SSE fallback in `src/realtime/realtime.gateway.ts` and `src/realtime/realtime.module.ts`
- [X] T016 [P] Implement the S3/R2 `StorageService` (presigned uploads) in `src/common/storage/storage.service.ts`
- [X] T017 [P] Create the `SchedulingModule` base with `@nestjs/schedule` in `src/modules/scheduling/scheduling.module.ts`
- [X] T018 Add the `platformSettings` schema + `PlatformSettingsService` (singleton read + default seed) in `src/db/schema/platform-settings.ts` and `src/modules/platform-settings/platform-settings.service.ts` (consumed by checkout fees/payment toggles)
- [X] T019 [P] Create the seed framework + base seed (currency/timezone defaults, platform settings) in `src/db/seed/index.ts`

**Checkpoint**: Foundation ready — user stories can begin

---

## Phase 3: User Story 1 - Accounts, Roles & Vendor Teams (Priority: P1) 🎯 MVP

**Goal**: Identity with default-customer role, platform admin/rider roles, and vendor organizations with owner/admin/member teams.

**Independent Test**: Create users, grant rider + admin roles, create a vendor org with an owner, add a member; verify each actor only accesses what their role permits.

- [X] T020 [P] [US1] Add identity schema (users extension `platformRole`, `organizations` business fields, `organizationCategories`, `organizationCustomers`, `customerAddresses`) + relations in `src/db/schema/identity.ts`
- [X] T021 [US1] Implement DTOs (create/update org, payout, invitation, member role) in `src/modules/identity/dto/`
- [X] T022 [US1] Implement `OrganizationsService` (RQB reads, org-scoped) in `src/modules/identity/organizations.service.ts`
- [X] T023 [US1] Implement `OrganizationsController` (`/organizations`, members, invitations, `/payout` owner-only, delete owner-only) in `src/modules/identity/organizations.controller.ts`
- [X] T024 [P] [US1] Implement `MeController` (`GET /me` → ActorContext) and admin user-role controller (`/admin/users`) in `src/modules/identity/me.controller.ts` and `src/modules/identity/admin-users.controller.ts`
- [X] T025 [US1] Refine ability rules for owner/admin/member + platform roles in `src/auth/ability/ability.factory.ts` (cross-org denial, protected payout/delete)
- [X] T026 [P] [US1] Seed a demo vendor organization + owner + organization categories in `src/db/seed/identity.seed.ts`
- [X] T027 [US1] Register `IdentityModule` in `src/app.module.ts`

**Checkpoint**: Auth + roles + vendor teams fully functional and isolation-testable

---

## Phase 4: User Story 2 - Vendor Catalog & Storefront Browsing (Priority: P1)

**Goal**: Public storefront browsing + vendor catalog management (products, variants, prices, images, collections, food modifiers).

**Independent Test**: Vendor publishes a priced, in-stock variant; customer finds the vendor by category, searches it, and sees correct price/availability.

- [X] T028 [P] [US2] Add categories/brands schema (`categories`, `categoryPricingRules`, `brands`) + relations in `src/db/schema/categories.ts`
- [X] T029 [P] [US2] Add catalog schema (`products`, `productImages`, `productTags`, `productCategories`, `productVariants`, `priceSets`, `moneyAmounts`, `variantCollections`, `variantCollectionItems`, `menuModifierGroups`, `menuModifierOptions`) + relations in `src/db/schema/catalog.ts`
- [X] T030 [US2] Implement catalog DTOs (product, variant, price set, collection, modifier group/option) in `src/modules/catalog/dto/`
- [X] T031 [P] [US2] Implement the markup/price-resolution helper (per-category markup, sale, tiered) in `src/modules/catalog/pricing.helper.ts`
- [X] T032 [US2] Implement `VendorCatalogService` (org-scoped CRUD via RQB) in `src/modules/catalog/vendor-catalog.service.ts`
- [X] T033 [US2] Implement `StorefrontService` (vendors by category/location/name, product detail with variants/prices/images/modifiers via RQB `with`) in `src/modules/catalog/storefront.service.ts`
- [X] T034 [US2] Implement `StorefrontController` (public) in `src/modules/catalog/storefront.controller.ts`
- [X] T035 [US2] Implement `VendorCatalogController` (+ presigned image upload) in `src/modules/catalog/vendor-catalog.controller.ts`
- [X] T036 [P] [US2] Implement `AdminCatalogController` (master products/brands/categories, approval, category pricing rules) in `src/modules/catalog/admin-catalog.controller.ts`
- [X] T037 [P] [US2] Seed demo products/variants/prices (+ food modifiers) for the demo vendor in `src/db/seed/catalog.seed.ts`
- [X] T038 [US2] Register `CatalogModule` + `CategoriesModule` in `src/app.module.ts`

**Checkpoint**: Browsable storefront + vendor catalog management work end to end

---

## Phase 5: User Story 3 - Cart, Pricing & Checkout (Priority: P1)

**Goal**: Single-vendor cart (user + guest), transparent price breakdown, fulfillment selection, order placement.

**Independent Test**: Build a cart, get a quote with fees, place a cash-on-delivery order; breakdown sums to total and the order is created `pending`/`awaiting`.

- [X] T039 [P] [US3] Add cart schema (`carts`, `cartItems`, `cartItemModifiers`) + relations in `src/db/schema/cart.ts`
- [X] T040 [US3] Implement cart/checkout DTOs (add/update item, quote, place order, guest location) in `src/modules/cart/dto/` and `src/modules/checkout/dto/`
- [X] T041 [US3] Implement `CartService` (single-vendor scope, guest session, modifier min/max validation, expiry) in `src/modules/cart/cart.service.ts`
- [X] T042 [US3] Implement the `PricingEngine` (subtotal, per-category markup, service fee, small-order fee, minimum-order check, taxes, total) reading `PlatformSettingsService` in `src/modules/checkout/pricing-engine.service.ts`
- [X] T043 [US3] Implement `CheckoutService.quote()` (breakdown + delivery-quote placeholder for pickup/self-delivery; platform-delivery fee integrates with US6) in `src/modules/checkout/checkout.service.ts`
- [X] T043a [US3] Implement `CustomerAddressesService` + `CustomerAddressesController` (CRUD + set-default, RQB, owner-scoped) in `src/modules/cart/customer-addresses.service.ts` and `src/modules/cart/customer-addresses.controller.ts` (FR-058)
- [X] T044 [US3] Implement `CheckoutService.placeOrder()` (atomic stock decrement, item/modifier/price snapshots, payment-method gating, emit `order.created`) in `src/modules/checkout/checkout.service.ts`
- [X] T045 [US3] Implement `CartController` and `CheckoutController` in `src/modules/cart/cart.controller.ts` and `src/modules/checkout/checkout.controller.ts`
- [X] T046 [US3] Register `CartModule` + `CheckoutModule` in `src/app.module.ts`

**Checkpoint**: Customer/guest can place an order with a correct, transparent breakdown (cash on delivery)

---

## Phase 6: User Story 4 - Order Lifecycle & Fulfillment (Priority: P1)

**Goal**: Full order lifecycle with vendor operations, swaps, audit log, prep-time dispatch gating, and auto-cancel sweep.

**Independent Test**: Place a paid order, vendor confirms/prepares, proposes a swap, customer accepts, progress to delivered/completed; each transition is audited.

- [X] T047 [P] [US4] Add orders schema (`orders`, `orderItems`, `orderItemModifiers`, `orderEvents`, `orderItemEvents`) + relations in `src/db/schema/orders.ts`
- [X] T048 [US4] Implement order DTOs (confirm/prepare/ready, item unavailable, propose swap, swap response, cancel) in `src/modules/orders/dto/`
- [X] T049 [US4] Implement the `OrderStateMachine` (valid transitions, invalid → 409) in `src/modules/orders/order-state-machine.ts`
- [X] T050 [US4] Implement `OrdersService` (lifecycle, audit-event append on every change, prep clock anchor, RQB reads) in `src/modules/orders/orders.service.ts`
- [X] T051 [US4] Implement `OrderSwapService` (unavailable flag, propose swap + deadline, accept/reject/expiry recompute totals) in `src/modules/orders/order-swap.service.ts`
- [X] T052 [US4] Implement `VendorOrdersController` (confirm/prepare/ready/pickup-code/swap) and `CustomerOrdersController` (list/detail/cancel/swap-response) in `src/modules/orders/`
- [X] T053 [US4] Emit realtime events (`order.status_changed`, `order.item_swap_proposed`, `order.swap_resolved`, `vendor:{orgId}` board) from `OrdersService` via the event bus; also emit the corresponding `notification` event (FR-054)
- [X] T054 [US4] Implement the auto-cancel sweep (unconfirmed past timeout → cancel + restock; refund hook deferred to US7) in `src/modules/scheduling/order-sweeps.cron.ts`
- [X] T055 [US4] Register `OrdersModule` in `src/app.module.ts`

**Checkpoint**: P1 MVP complete — browse → order → fulfill → deliver, fully audited & realtime

---

## Phase 7: User Story 5 - Rider Delivery & Dispatch (Priority: P2)

**Goal**: Rider onboarding/approval, stages, online/offline status, offer/accept dispatch, pickup/delivery codes, location, ratings, incidents.

**Independent Test**: Approve a rider, set online, offer a ready order, accept, pickup via code, deliver; earnings/rating eligibility recorded.

- [X] T056 [P] [US5] Add riders schema (`riders`, `riderLocations`, `stages`, `riderStageMemberships`, `riderRatings`, `riderIncidents`, `riderPayouts`) + relations in `src/db/schema/riders.ts`
- [X] T057 [US5] Implement rider DTOs (apply/compliance, status, location, pickup/deliver, incident, rating, admin approve/suspend, stage assign) in `src/modules/riders/dto/`
- [X] T058 [US5] Implement `RiderService` (apply with presigned docs, profile, online/offline/busy, location updates) in `src/modules/riders/rider.service.ts`
- [X] T059 [US5] Implement `DispatchService` (offer to eligible rider with window + re-offer, accept, pickup-code verify, deliver + proof) in `src/modules/dispatch/dispatch.service.ts`
- [X] T060 [P] [US5] Implement `RiderRatingsService` (running average) and `RiderIncidentsService` (report, may release delivery) in `src/modules/riders/`
- [X] T061 [US5] Implement controllers: `RiderController`, `DispatchController`, `AdminRidersController`, `StagesController`, `RiderIncidentsAdminController` in `src/modules/riders/` and `src/modules/dispatch/`
- [X] T062 [US5] Emit realtime events (`delivery.offered`, `delivery.offer_expired`, `order.rider_assigned`, `rider.location` throttled) from dispatch/rider services; also emit the corresponding `notification` event (FR-054)
- [X] T063 [US5] Wire dispatch into the order lifecycle (food prep-time gating before offer; status → out_for_delivery/delivered) in `src/modules/dispatch/dispatch.service.ts`
- [X] T064 [P] [US5] Seed a demo active rider + stage in `src/db/seed/riders.seed.ts`
- [X] T065 [US5] Register `RidersModule` + `DispatchModule` in `src/app.module.ts`

**Checkpoint**: Platform-rider delivery works for orders end to end

---

## Phase 8: User Story 6 - Delivery Zones, Fare & Quotes (Priority: P2)

**Goal**: Admin zones + pricing rules; zone-aware fare with distance provider + haversine fallback; cached expiring quotes.

**Independent Test**: Configure a zone+rule, quote an in-zone address (fee = base + perKm×km × surge, floored at min), reject out-of-zone.

- [X] T066 [P] [US6] Add zones schema (`deliveryZones`, `pricingRules`, `zoneCommissionMappings`, `deliveryQuotes`) + relations in `src/db/schema/zones.ts`
- [X] T067 [US6] Implement the `DistanceProvider` interface + Google/Mapbox impl + haversine fallback in `src/modules/zones/distance/`
- [X] T068 [US6] Implement `FareService` (zone resolution via geohash/max-distance, rule selection with day/hour window, fare formula) in `src/modules/zones/fare.service.ts`
- [X] T069 [US6] Implement `QuoteService` (create/cache with expiry, parcel package-fee variant, expiry enforcement) in `src/modules/zones/quote.service.ts`
- [X] T070 [US6] Implement controllers: `QuotesController` (public) and admin zones/pricing-rules/parcel-pricing-rules/commission-mapping in `src/modules/zones/`
- [X] T071 [US6] Integrate platform-delivery quoting into `CheckoutService` (out-of-zone/suspended block, expired-quote 409 at placement) in `src/modules/checkout/checkout.service.ts`
- [X] T072 [P] [US6] Seed delivery zones + pricing rules in `src/db/seed/zones.seed.ts`
- [X] T073 [US6] Register `ZonesModule` in `src/app.module.ts`

**Checkpoint**: Accurate zone-aware delivery fees flow into checkout

---

## Phase 9: User Story 7 - Financial Splits, Wallets & Payouts (Priority: P2)

**Goal**: Idempotent commission/delivery splits on capture via the live ledger, wallet auto-create, commission precedence, refunds/reversals, retries, rider payouts.

**Independent Test**: Capture an order → one split (commission→platform, remainder→vendor, delivery→rider); refund → exactly-once reversal.

- [X] T074 [P] [US7] Add financial schema (`boxWalletMappings`, `boxWalletOrderConfirmations`, `boxWalletParcelConfirmations`, `boxWalletAutoCreateLog`) + relations + unique `correlationId` in `src/db/schema/financial.ts`
- [X] T075 [US7] Implement the `LedgerClient` interface + live BoxWallet HTTP impl in `src/modules/financial/ledger/`
- [X] T076 [P] [US7] Implement `CommissionService` (precedence: vendor override → zone mapping → order fallback) in `src/modules/financial/commission.service.ts`
- [X] T077 [P] [US7] Implement `WalletService` (auto-create on first need + audit log) in `src/modules/financial/wallet.service.ts`
- [X] T078 [US7] Implement `SplitService` (confirm on capture, idempotent on `correlationId`, 409 no-op) in `src/modules/financial/split.service.ts`
- [X] T079 [US7] Implement `RefundService` (reverse split, `refundPending` flag) and wire the order auto-cancel refund hook (completes T054) in `src/modules/financial/refund.service.ts`
- [X] T080 [US7] Implement scheduled sweeps (retry failed syncs, reprocess quarantined, retry failed refunds) in `src/modules/scheduling/financial-sweeps.cron.ts`
- [X] T081 [US7] Implement controllers: admin financial confirmations/retry/wallets, vendor wallet, rider earnings (in-house hidden), admin payouts lifecycle in `src/modules/financial/`
- [X] T082 [US7] Subscribe `SplitService` to the order-captured event (trigger split) via the event bus in `src/modules/financial/financial.module.ts`
- [X] T083 [US7] Register `FinancialModule` in `src/app.module.ts`

**Checkpoint**: Money splits, refunds, and payouts work with exactly-once guarantees

---

## Phase 10: User Story 8 - Mobile Money Payments (Priority: P2)

**Goal**: Relworx inbound collection + outbound disbursement, webhook-driven idempotent capture, abandoned-checkout sweep, late-callback reconciliation.

**Independent Test**: Initiate a collection, simulate success callback → order captured once; simulate failure → unpaid + swept.

- [X] T084 [P] [US8] Add payments schema (`mobileMoneyPayments`) + relations + unique provider reference in `src/db/schema/payments.ts`
- [X] T085 [US8] Implement the `MobileMoneyClient` interface + live Relworx impl (collect + disburse) in `src/modules/payments/momo/`
- [X] T086 [US8] Implement `PaymentsService` (collect, status, link to order/parcel/subscription) in `src/modules/payments/payments.service.ts`
- [X] T087 [US8] Implement the signature-verified, idempotent Relworx webhook controller (success → capture once → emit order-captured) in `src/modules/payments/relworx-webhook.controller.ts`; also emit the corresponding payment-outcome `notification` event (FR-054)
- [X] T088 [US8] Implement the `PaymentsController` (collect, status) in `src/modules/payments/payments.controller.ts`
- [X] T089 [US8] Implement scheduled abandoned-momo sweep + late-callback reconciliation (refund) in `src/modules/scheduling/payment-sweeps.cron.ts`
- [X] T090 [US8] Register `PaymentsModule` in `src/app.module.ts`

**Checkpoint**: Mobile-money payments capture orders and trigger splits reliably

---

## Phase 11: User Story 9 - Peer-to-Peer Parcel Delivery (Priority: P3)

**Goal**: Vendor-independent parcels reusing zones/fare, dispatch, payments, and financial split.

**Independent Test**: Create a fragile parcel with declared value, verify fare = package fee + insurance + zone delivery fee, dispatch & complete, split package→platform / delivery→rider.

- [X] T091 [P] [US9] Add parcels schema (`parcels`, `parcelEvents`, `parcelPricingRules`) + relations in `src/db/schema/parcels.ts`
- [X] T092 [US9] Implement parcel DTOs (quote, create, cancel) in `src/modules/parcels/dto/`
- [X] T093 [US9] Implement `ParcelService` (create with quote from US6, pickup/delivery codes, lifecycle, events) in `src/modules/parcels/parcel.service.ts`
- [X] T094 [US9] Integrate parcels into `DispatchService` (`kind=parcel`) and `SplitService` (parcel confirmation: package→platform, delivery→rider) in `src/modules/parcels/parcel.service.ts`
- [X] T095 [US9] Implement `ParcelsController` (sender) + parcel ratings + admin parcel-pricing-rules in `src/modules/parcels/`
- [X] T096 [US9] Emit parcel realtime events (`parcel.status_changed`, `parcel.rider_assigned`) and register `ParcelsModule` in `src/app.module.ts`

**Checkpoint**: P2P parcel delivery works end to end

---

## Phase 12: User Story 10 - Promotions, Campaigns & Referrals (Priority: P3)

**Goal**: Promotions (standard/buy-get) with application methods, eligibility rules, usage/budget limits; referral codes + qualifying rewards.

**Independent Test**: Create a per-customer-capped category promo, apply within rules, exceed cap on 2nd order (rejected); complete a qualifying referral (rewarded).

- [X] T097 [P] [US10] Add promotions schema (`campaigns`, `campaignBudgets`, `campaignBudgetUsages`, `promotions`, `applicationMethods`, `promotionRules`, `promotionRuleValues`, `promotionUsages`) + relations in `src/db/schema/promotions.ts`
- [X] T098 [P] [US10] Add referrals schema (`referralCodes`, `referrals`) + relations in `src/db/schema/referrals.ts`
- [X] T099 [US10] Implement the `PromotionEngine` (rule match, overall + per-customer limits, campaign budget, buy-get) in `src/modules/promotions/promotion-engine.service.ts`
- [X] T100 [US10] Integrate the `PromotionEngine` into `CheckoutService.quote()`/`placeOrder()` (apply, record usage, increment budget atomically) in `src/modules/checkout/checkout.service.ts`
- [X] T101 [P] [US10] Implement `ReferralService` (code issue, redeem, reward on qualifying first order with active-campaign boost + per-code cap) in `src/modules/referrals/referral.service.ts`
- [X] T102 [US10] Implement controllers: vendor/admin promotions + campaigns/budgets, customer/admin referrals + referral settings in `src/modules/promotions/` and `src/modules/referrals/`
- [X] T103 [US10] Register `PromotionsModule` + `ReferralsModule` in `src/app.module.ts`

**Checkpoint**: Discounts and referral rewards work with limits enforced under concurrency

---

## Phase 13: User Story 11 - Prepaid Subscription Plans (Priority: P3)

**Goal**: Vendor finite prepaid plans with capacity slots; upfront payment; cron mints one order per cycle; pause/skip/resume/cancel with partial refund; snapshots.

**Independent Test**: Publish a 4-cycle plan, subscribe + pay, run cycle once (1 order minted, cycle fulfilled, remaining−1); cancel mid-plan refunds unfulfilled cycles only.

- [X] T104 [P] [US11] Add subscriptions schema (`subscriptionPlans`, `subscriptionPlanItems`, `subscriptionPlanSlots`, `subscriptions`, `subscriptionCycles`) + relations in `src/db/schema/subscriptions.ts`
- [X] T105 [US11] Implement `SubscriptionPlanService` (vendor plans, items, capacity slots) in `src/modules/subscriptions/subscription-plan.service.ts`
- [X] T106 [US11] Implement `SubscriptionService` (subscribe with plan/slot snapshot + grand-total compute, upfront pay via US8, slot-capacity check, pause/skip/resume/cancel+partial refund) in `src/modules/subscriptions/subscription.service.ts`
- [X] T107 [US11] Implement the cycle runner cron (mint order from snapshot, record split, create cycle, decrement remaining, complete at 0, failures→failed) in `src/modules/scheduling/subscription-cycle.cron.ts`
- [X] T108 [US11] Implement controllers: vendor plans/slots, public plan browse, customer subscriptions + lifecycle in `src/modules/subscriptions/`
- [X] T109 [US11] Register `SubscriptionsModule` in `src/app.module.ts`

**Checkpoint**: Prepaid subscriptions mint scheduled orders correctly

---

## Phase 14: User Story 12 - Platform Administration & Operations (Priority: P3)

**Goal**: Admin platform settings management, governance, approvals, recommendations, and dashboards/reports.

**Independent Test**: Disable a payment method (gone from checkout); set small-order-fee threshold (reflected in a new order); view an orders dashboard with accurate aggregates.

- [X] T110 [P] [US12] Add recommendations schema (`timeOfDayRecommendations`, `categoryTimeBoosts`) + relations in `src/db/schema/recommendations.ts`
- [X] T111 [US12] Implement `AdminSettingsController` (`GET/PATCH /admin/settings`, audited) over `PlatformSettingsService` in `src/modules/platform-settings/admin-settings.controller.ts`
- [X] T112 [US12] Implement `AdminReportsService` (read-only raw-SQL aggregations — the sanctioned RQB exception) for dashboard/orders/vendors/riders in `src/modules/admin/admin-reports.service.ts`
- [X] T113 [US12] Implement `AdminDashboardController` + reports endpoints in `src/modules/admin/admin-dashboard.controller.ts`
- [X] T114 [P] [US12] Implement the hourly recommendation recompute cron + `categoryTimeBoosts` admin endpoints in `src/modules/scheduling/recommendations.cron.ts` and `src/modules/admin/`
- [X] T115 [US12] Register `AdminModule` + `RecommendationsModule` in `src/app.module.ts`

**Checkpoint**: Admins can configure, govern, and observe the platform

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning multiple stories

- [X] T116 [P] Wire the `NotificationsModule` to consume the lifecycle `notification` events already emitted by US4/US5/US8 (order placed/confirmed/out-for-delivery/delivered, rider offered, payment outcome) and deliver them to `user:{userId}` realtime + a notification log, in `src/modules/notifications/` (FR-054)
- [X] T117 [P] Add rate limiting on auth + webhook routes, verify webhook signatures, and harden session/cookie security in `src/auth/` and `src/modules/payments/` (FR-060)
- [X] T118 [P] Normalize user-facing rejection reasons (vendor closed, out-of-zone, min-order, quote expired, over-limit) in `src/common/errors/`
- [X] T119 [P] Expand seed data to a full demo (admin, multiple vendors incl. food, riders, zones, promotions) in `src/db/seed/`
- [~] T120 [P] Build the TanStack Router client routes/features for customer/vendor/rider/admin with Legend State stores + realtime subscriptions in `web/src/` [out-of-scope for boxserver — belongs in the boxconv web package]
- [X] T121 Run the quickstart verification flows (P1 order flow, P2 money flow) and confirm `npm run build` + `npm run lint` pass clean

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1)** → no deps.
- **Foundational (P2)** → depends on Setup; **blocks all user stories**.
- **User stories** → all depend on Foundational. Within the priority bands there are cross-story dependencies (below); independent slices are noted.

### Cross-story dependencies (beyond Foundational)

- **US3** (checkout) needs **US2** (catalog) and reads `PlatformSettingsService` (foundational T018). Platform-delivery fee fully lands when **US6** is done (T071); until then US3 supports pickup/self-delivery.
- **US4** (orders) needs **US3** (placed orders). Auto-cancel refund (T079) completes once **US7** lands.
- **US5** (dispatch) needs **US4** (orders to deliver).
- **US6** (zones/fare) is independent but feeds **US3** (T071) and **US9**.
- **US7** (financial) needs **US4** and the capture trigger from **US8**; commission mapping from **US6**.
- **US8** (mobile money) needs **US4**; emits the capture event consumed by **US7**.
- **US9** (parcels) reuses **US5/US6/US7/US8**.
- **US10** (promos/referrals) integrates into **US3/US4**.
- **US11** (subscriptions) reuses **US3/US4/US7/US8**.
- **US12** (admin) reads across all; reports are independent read models.

### Recommended order

P1: US1 → US2 → US3 → US4 (MVP). P2: US6 → US5 → US8 → US7 (then backfill T071, T079). P3: US10 → US9 → US11 → US12. Polish last.

### Parallel opportunities

- All Setup tasks marked **[P]** (T002–T005) after T001.
- Foundational **[P]**: T011, T012, T013, T014, T016, T017, T019 (after T006–T010 as appropriate).
- Schema tasks across stories are **[P]** with each other (different files): T020, T028, T029, T039, T047, T056, T066, T074, T084, T091, T097, T098, T104, T110.
- Within a story, schema → service → controller → module-registration is sequential.

---

## Implementation Strategy

### MVP first (P1)

1. Setup + Foundational.
2. US1 → US2 → US3 → US4. **STOP & VALIDATE**: browse → order → fulfill → deliver (cash on delivery), audited and realtime. Demo.

### Incremental delivery

3. P2 band (US6, US5, US8, US7) → operational end-to-end marketplace with platform delivery, mobile money, and money splits. Backfill T071 (delivery quote in checkout) and T079 (auto-cancel refund).
4. P3 band (US9, US10, US11, US12) → parcels, growth levers, subscriptions, admin tooling.
5. Polish → notifications, security hardening, client UI, full seed, verification.

### Quality gates (every phase)

- `npm run build` (TypeScript strict) and `npm run lint` must pass. No unit/UX tests are authored (Constitution Principle V); verify behaviour via the quickstart scenarios.

---

## Notes

- **[P]** = different files, no incomplete dependencies.
- **[Story]** label maps each task to its user story for traceability.
- Every multi-table read uses Drizzle RQB `with` — no manual joins (raw SQL only in T112 admin reports, justified in plan Complexity Tracking).
- No endpoint accepts caller identity as input — always from the session.
- Commit after each task or logical group.
