# BoxServer

A multi-vendor delivery marketplace platform for Uganda. BoxServer connects **customers**, **vendors** (grocery stores and food restaurants), **riders**, and **platform admins** in a single marketplace, and also supports **guest ordering** and **peer-to-peer parcel delivery**.

This repository contains the **NestJS API**. The TanStack Router web client lives in `web/`.

## What the system does

### 1. Identity, roles and vendor teams
- Users sign up and are treated as **customers** by default.
- Platform operators can be granted **admin** or **rider** roles.
- A **vendor** is a Better Auth **organization** with members who have distinct responsibilities:
  - **owner** — can edit payout/banking settings and delete the organization.
  - **admin** — can manage most of the vendor's catalog and orders.
  - **member** — can manage catalog and orders but cannot touch protected financial/organization settings.
- Every request derives the actor (`userId`, `platformRole`, active `organizationId`, `orgRole`) from the authenticated session. The client never sends identity in request bodies.

### 2. Vendor catalog and storefront
- Vendors manage their own **products**, **variants** (unit, SKU, stock, availability), **prices** (regular, sale, quantity-tiered), **images**, **collections**, and — for food vendors — **modifier groups/options**.
- Customers discover vendors by **category** and **location**, open a storefront, search/filter products, and view only **available, approved** items with correct customer-facing prices.
- Ordering is blocked with a clear reason when a vendor is inactive, busy/paused, or outside business hours.

### 3. Cart, pricing and checkout
- Carts are scoped to a **single vendor**, support registered users and **guest carts** (tracked by session), and expire after inactivity.
- Checkout produces a transparent price breakdown in **UGX smallest-unit integers**:
  - item subtotal
  - per-category markup (when enabled)
  - service fee
  - small-order fee
  - delivery fee
  - discounts
  - taxes
  - total
- Customers choose a fulfillment type: **platform delivery**, **vendor self-delivery**, or **self-pickup**.
- Delivery fees are quoted from zone pricing rules (base + per-km × distance × surge, floored at min fee). Out-of-zone or suspended-zone orders are rejected.
- Promo codes apply only when their eligibility rules, usage limits, and campaign budgets are satisfied.

### 4. Order lifecycle and fulfillment
- Orders follow a strict lifecycle:
  `pending → confirmed → preparing → ready_for_pickup → out_for_delivery → delivered → completed`
  with `cancelled` and `refunded` paths.
- Vendors confirm and prepare orders. Food orders gate rider dispatch by the prep-time clock and a configured rider lead time.
- Vendors can propose **item swaps** for unavailable items; customers accept or reject before a deadline.
- Every status, payment, fulfillment, and item change is recorded as an immutable audit event with actor identity, role, and monetary snapshots.
- Unconfirmed orders auto-cancel after a timeout, restock items, and refund already-paid orders.

### 5. Rider delivery and dispatch
- Riders register with Uganda-specific compliance data (NIN, driving permit, vehicle, helmet verification, insurance) and are approved by admins.
- Riders belong to **stages/hubs** and set themselves **online/offline/busy**.
- Dispatch offers a delivery to a specific eligible rider within an acceptance window; if not accepted, it can be re-offered.
- Pickup is verified by a vendor-held pickup code (sender code for parcels). Optional delivery code and proof-of-delivery capture are supported.
- Riders share live location during active jobs; customers and vendors see live tracking over a persistent connection.
- Riders accrue ratings and earnings; incidents can be reported for admin review and may release a delivery.

### 6. Delivery zones, fares and quotes
- Admins define geographic delivery zones (center, max distance, active/suspended state) and pricing rules (base fee, per-km rate, min fee, surge multiplier, optional day/hour windows).
- Quotes are computed by locating the address's zone, measuring distance (mapping provider with haversine fallback), and applying the matching rule.
- Quotes expire and are linked to the order/parcel they are used for.

### 7. Financial splits, wallets and payouts
- On payment capture, each order/parcel produces **exactly one financial split** recorded in an external ledger (BoxWallet):
  - order value → platform commission + vendor remainder
  - delivery fee → platform cut + rider earnings
- Commission is selected by precedence: **vendor-level override → delivery-zone mapping → order-level fallback**.
- Vendors, riders, and customers are mapped to wallets, auto-created on first need.
- Capture/sync is **idempotent** by correlation key; transient failures retry automatically; quarantined events reprocess once wallets become active; refunds reverse the split exactly once.
- Rider payouts are batched per earnings period. In-house (salaried) riders do not surface per-order earnings/payouts.

### 8. Mobile money payments
- Customers pay (and the platform disburses) via Ugandan mobile money (**MTN, Airtel**; UGX only) through Relworx.
- A collection request moves through: `initiated → pending → success/failed/expired`, driven by provider callbacks.
- Payments are linked to their order, parcel, or subscription.
- Order-first checkouts that are never paid are swept and cancelled after a timeout.
- Duplicate success callbacks capture an order only once.

### 9. Peer-to-peer parcel delivery
- Senders request parcel delivery independent of any vendor: pickup/dropoff details, package size category, fragile flag, and declared value.
- Pricing = package fee (size fee × fragile multiplier + insurance) + zone delivery fee.
- Parcels flow through the same dispatch, pickup/delivery code, proof-of-delivery, and audit machinery as orders.
- On capture, the package fee is platform revenue and the delivery fee is rider earnings.

### 10. Promotions, campaigns and referrals
- Admins and vendors run promotions (standard or buy-get) with fixed/percentage discounts, application targets (items, shipping, order), allocation methods (each/across), eligibility rules, and usage limits.
- Campaigns can have spend- or usage-based budgets that gate availability.
- Customers have referral codes. Successful referrals that meet the minimum qualifying order are rewarded according to platform settings, optionally boosted by an active campaign.

### 11. Prepaid subscription plans
- Food/grocery vendors publish finite prepaid plans (e.g. a 4-cycle weekly pack) with included items, cadence, per-cycle price, and capacity-limited delivery windows.
- Customers pay the grand total upfront. Plan and slot details are snapshotted so vendor edits do not affect in-flight subscriptions.
- Each cycle, a scheduled process mints an order, records the per-cycle financial split, and decrements remaining cycles.
- Subscriptions can be paused, skipped, resumed, cancelled (refunding only unfulfilled cycles), or completed.

### 12. Platform administration
- Admins configure platform-wide settings: enabled payment methods and instructions, service toggles (grocery/parcels), markup/service-fee/small-order-fee policy, referral policy, and support contacts.
- Admins manage the master catalog, category pricing rules, vendor and rider approvals, delivery zones, and commission mappings.
- Admins view operational dashboards and reports (orders, revenue, vendor and rider performance) for a chosen period.

### Realtime
- Live updates for order/parcel status changes and rider location are pushed to subscribed actors over a **WebSocket/SSE** connection within seconds of the change.

## Tech stack

| Layer | Technology |
|-------|------------|
| API framework | NestJS 11 + Express |
| Auth | Better Auth with organization plugin |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM (Relational Query Builder; raw SQL only for admin aggregates) |
| Validation | class-validator / class-transformer DTOs |
| Realtime | WebSocket/SSE |
| External money | BoxWallet ledger client, Relworx mobile-money client |
| Client | TanStack Router + Legend State + TanStack Query (in `web/`) |
| Money | Integer UGX smallest unit |
| Timezone | Africa/Kampala |

## Project layout

```text
src/
├── main.ts                    # NestJS bootstrap
├── app.module.ts              # root module
├── auth/                      # Better Auth handler, session guard, actor context, ability/policy layer
├── common/                    # validation pipe, money/UGX utils, geohash, error filters, config, Redis
├── db/                        # Drizzle schema, relations, client, migrations, seeders
├── realtime/                  # WebSocket/SSE gateway, event bus
└── modules/                   # one NestJS module per domain
    ├── identity/              # users, organizations, members
    ├── catalog/               # products, variants, prices, modifiers, collections
    ├── cart/                  # carts, items, modifiers, saved addresses
    ├── checkout/              # pricing engine, fees, fulfillment, order placement
    ├── orders/                # lifecycle, swaps, audit events
    ├── riders/                # profiles, compliance, stages, ratings, incidents
    ├── dispatch/              # offer/accept, pickup/delivery codes
    ├── zones/                 # zones, pricing rules, quotes
    ├── financial/             # BoxWallet client, wallet mappings, splits, payouts, refunds
    ├── payments/              # Relworx mobile money, callbacks, sweeps
    ├── parcels/               # P2P parcel requests, pricing, dispatch
    ├── promotions/            # promotions, campaigns, application engine
    ├── referrals/             # referral codes, rewards
    ├── subscriptions/         # plans, slots, subscriptions, cycles
    ├── platform-settings/     # singleton platform configuration
    ├── admin/                 # dashboards, reports, approvals
    ├── notifications/         # actor notifications on lifecycle events
    └── scheduling/            # cron jobs (sweeps, retries, cycles, recommendations)

web/                           # TanStack Router client
specs/001-marketplace-platform/# feature specs, data model, contracts, plan
```

## Getting started

### Prerequisites
- Node.js 22+
- PostgreSQL 16 (local or Docker)
- Access/keys for external services (BoxWallet ledger, Relworx mobile money, object storage, distance provider) — or their sandbox equivalents

### Environment
Create `.env` at the repo root. See `specs/001-marketplace-platform/quickstart.md` for the full variable list.

### Install and set up the database
```bash
npm install
npm run db:push     # create schema via drizzle-kit
npm run db:seed     # seed categories, zones, pricing rules, demo vendor + products, demo rider
```

### Run
```bash
# API (includes REST, /api/auth, and WebSocket gateway)
npm run start:dev

# Client
npm run dev   # inside web/
```

### Quality gates
Per project constitution, **no unit or UX tests are authored**. Quality relies on:
```bash
npm run build   # TypeScript strict compilation
npm run lint    # eslint + prettier
```

## Key conventions

- **No barrel files** — import directly.
- **No manual SQL joins** — multi-table reads use Drizzle RQB `with`.
- **Identity is session-derived** — never accept `userId` or role in request bodies.
- **Money is integer UGX** — no decimals.
- **Validate at every boundary** — every endpoint uses a `class-validator` DTO behind a global `ValidationPipe`.

## Documentation

- Feature spec: `specs/001-marketplace-platform/spec.md`
- Implementation plan: `specs/001-marketplace-platform/plan.md`
- Data model: `specs/001-marketplace-platform/data-model.md`
- API contracts: `specs/001-marketplace-platform/contracts/`
- Developer quickstart: `specs/001-marketplace-platform/quickstart.md`
