# Implementation Plan: Multi-Vendor Delivery Marketplace Platform

**Branch**: `001-marketplace-platform` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-marketplace-platform/spec.md`

## Summary

Rebuild the BoxConv multi-vendor delivery marketplace as **BoxServer**: a NestJS API + a TanStack Router client, achieving functional parity with the existing Convex/Clerk system. Identity moves to **Better Auth** (with its organization plugin for vendor teams), persistence to **Drizzle ORM on PostgreSQL** accessed exclusively through the **Relational Query Builder** (no manual joins), client state to **Legend State**, and the realtime behaviour Convex provided for free is reproduced with **server-pushed WebSocket/SSE** updates. The external money services — the BoxWallet commission/payout ledger and the Relworx mobile-money provider — are wired live behind replaceable service interfaces. All 12 user stories (P1–P3) are in scope; the work is sequenced by priority but nothing is cut. Data is greenfield (fresh Postgres + seed).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), Node.js 22

**Primary Dependencies**:
- API: NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`), `@nestjs/websockets` + `@nestjs/platform-socket.io` (or native SSE) for realtime
- Auth: Better Auth (server + organization plugin), mounted as a NestJS route handler; client `better-auth/client`
- Data: Drizzle ORM + `drizzle-kit` (migrations), `pg` (node-postgres), PostgreSQL 16
- Validation: `class-validator` + `class-transformer` (DTOs) via a global ValidationPipe — DTO validation at every boundary (Principle IV)
- Client: TanStack Router (SSR-capable), Legend State (`@legendapp/state`), TanStack Query for non-realtime server state
- Integrations: BoxWallet HTTP client (commission/payout ledger), Relworx HTTP client (MTN/Airtel mobile money), object storage (S3-compatible / Cloudflare R2), distance provider (Google/Mapbox) with haversine fallback

**Storage**: PostgreSQL (greenfield). Drizzle schema is the source of truth; relations declared for RQB. Optional Redis for cart TTL/expiry and realtime fan-out (deferred unless needed).

**Testing**: Per Constitution Principle V — **no unit or UX tests authored**. Quality gates are TypeScript strict compilation, DTO validation, Drizzle schema types, and lint/format. The stock Jest scaffold is left unused (not removed).

**Target Platform**: Linux server (containerised) for the API; SSR web client.

**Project Type**: Web application — backend (NestJS) + frontend (TanStack Router), in a monorepo layout.

**Performance Goals**: Live status/location updates pushed within 5s of change (SC-007); storefront-to-paid-order under 3 min (SC-001). Standard web API latency expectations otherwise; no extreme throughput target stated.

**Constraints**: UGX smallest-unit integer money, Africa/Kampala timezone (FR-055); financial split idempotency and exactly-once capture (SC-003, FR-036/FR-040); cross-vendor/cross-role isolation (SC-010).

**Scale/Scope**: Replicates ~50 entity groups across 12 domains; single-region Uganda operation for v1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Mandated Stack | API=NestJS, Auth=Better Auth, DB=Drizzle/Postgres, client=TanStack Router, state=Legend State; no overlapping substitutes | ✅ PASS — exactly this stack; no second ORM/auth/state lib introduced |
| II. Drizzle RQB, No Manual Joins | All multi-table reads via `db.query.*` + `with`; relations declared in schema; no `.leftJoin/.innerJoin`/raw join SQL | ✅ PASS — design mandates RQB; raw SQL only for aggregate dashboards (see Complexity Tracking) |
| III. Server-Derived, Role-Scoped Authz | Identity from Better Auth session; never `userId` as input; admin/vendor(org)/rider; server-side policy layer | ✅ PASS — NestJS guards + CASL-style ability layer derive actor from session |
| IV. Validated API Contracts | Every endpoint has a validated DTO; typed IDs; no `any` across boundary | ✅ PASS — global ValidationPipe; DTOs per endpoint |
| V. No Unit or UX Tests | No unit/UI test tasks; rely on types + contracts + lint + manual/integration verification | ✅ PASS — Testing context says no authored tests |
| VI. Functional Parity with BoxConv | Preserve vendors/teams, catalog, orders, fares, wallet/payouts, parcels, promos, subscriptions, search | ✅ PASS — all 12 stories in scope; deviations documented in spec |

**Initial gate: PASS.** No unjustified violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-marketplace-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (REST + realtime + integration contracts)
│   ├── README.md
│   ├── auth-and-identity.md
│   ├── catalog.md
│   ├── cart-checkout.md
│   ├── orders-fulfillment.md
│   ├── riders-dispatch.md
│   ├── zones-fare.md
│   ├── financial-wallet.md
│   ├── payments-momo.md
│   ├── parcels.md
│   ├── promotions-referrals.md
│   ├── subscriptions.md
│   ├── admin-platform.md
│   └── realtime-events.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks (NOT here)
```

### Source Code (repository root)

Monorepo with the NestJS API at the repo root (existing scaffold) and the client under `web/`. Server code is organised by domain module (NestJS) — one module per spec capability area — keeping admin/vendor/rider concerns separable per the constitution.

```text
src/                              # NestJS API (existing scaffold root)
├── main.ts
├── app.module.ts
├── db/                           # Drizzle: schema + relations + client + migrations
│   ├── schema/                   # one file per domain; relations co-located
│   ├── relations.ts              # RQB relations wiring
│   ├── drizzle.module.ts         # provides the typed db instance (DI)
│   └── seed/                     # greenfield seed data
├── auth/                         # Better Auth handler, guards, session → actor context
│   ├── better-auth.ts
│   ├── session.guard.ts
│   └── ability/                  # CASL-style policy layer (admin/vendor/rider/owner)
├── common/                       # ValidationPipe, money/UGX utils, geohash, error filters
├── realtime/                     # WebSocket/SSE gateway + event bus + channel auth
└── modules/
    ├── identity/                 # users, roles, organizations (vendor teams), members
    ├── catalog/                  # products, variants, prices, images, collections, modifiers
    ├── categories/               # categories, brands, category pricing rules
    ├── cart/                     # carts, cart items, modifier selections
    ├── checkout/                 # pricing engine, fees, fulfillment, order placement
    ├── orders/                   # lifecycle, items, swaps, events (audit), auto-cancel
    ├── riders/                   # profiles, compliance, stages, ratings, incidents, status
    ├── dispatch/                 # offer/accept, pickup/delivery codes, proof of delivery
    ├── zones/                    # delivery zones, pricing rules, quotes, distance provider
    ├── financial/                # BoxWallet client, wallet mappings, splits, payouts
    ├── payments/                 # Relworx mobile money, callbacks, sweeps
    ├── parcels/                  # P2P parcels, parcel pricing rules, parcel events
    ├── promotions/               # promotions, campaigns, application methods, rules, usage
    ├── referrals/                # referral codes, referrals, rewards
    ├── subscriptions/            # plans, slots, subscriptions, cycles (cron-driven)
    ├── platform-settings/        # singleton settings
    ├── admin/                    # dashboards, reports, approvals
    ├── notifications/            # actor notifications on lifecycle events
    └── scheduling/               # cron jobs (sweeps, retries, subscription cycles, recommendations)

web/                              # TanStack Router client
├── src/
│   ├── routes/                   # _authed/_admin, _authed/_vendor, _authed/_rider, storefront
│   ├── features/{admin,vendor,rider,customer}/   # components, hooks, pages (no barrel files)
│   ├── state/                    # Legend State stores (UI/client state)
│   └── lib/                      # api client, auth client, realtime client
└── ...

test/                            # e2e scaffold only; no authored unit/UI tests (Principle V)
```

**Structure Decision**: Web-application monorepo. The NestJS API stays at the repo root (reusing the existing scaffold); the TanStack Router client lives under `web/`. Server modules map 1:1 to spec capability areas so each user story lands in a bounded module set. No barrel files anywhere (constitution + BoxConv lesson).

## Complexity Tracking

> Only rows that deviate from a strict reading of the constitution.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Raw SQL for admin dashboards/reports (FR-052) | Aggregations (SUM/COUNT/GROUP BY over orders, revenue, rider performance) are not expressible via Drizzle RQB's `db.query.*` relational reads | Forcing RQB would mean fetching rows and aggregating in app memory — incorrect at scale and slower. Principle II explicitly permits raw SQL for aggregates RQB cannot express; usage confined to the `admin` module's read-only reporting services |
| Optional Redis (cart TTL + realtime fan-out) | Cart expiry sweeps and multi-instance WebSocket fan-out are awkward with Postgres-only | Single-instance in-memory works for v1; Redis is introduced only if/when the API is horizontally scaled. Flagged, not yet a dependency |
