# Phase 0 Research: BoxServer Marketplace Platform

All NEEDS CLARIFICATION items were resolved either by the project constitution (fixed stack) or the 2026-06-13 clarification session (realtime, integrations, data, scope). This document records the resulting technical decisions.

## 1. Mapping Convex realtime → server-pushed updates

**Decision**: Use a NestJS WebSocket gateway (Socket.IO) for client-bound live updates, fed by an internal event bus. Order/parcel status changes and rider-location pings are emitted to authorized, scoped channels (`order:{id}`, `vendor:{orgId}`, `rider:{riderId}`, `customer:{userId}`). SSE is the fallback transport for one-way streams where the client cannot hold a socket.

**Rationale**: Convex pushed query results automatically; the closest parity is server-initiated push (FR-056, SC-007 ≤5s). An internal event bus decouples domain services (which write to Postgres) from the transport, so business logic never imports the gateway. Channel authorization reuses the same ability layer as REST.

**Alternatives considered**: Client polling (rejected — fails the no-manual-refresh requirement and adds load); Postgres LISTEN/NOTIFY as the only mechanism (kept as an option for cross-instance fan-out, but app-level event bus is simpler for v1 single instance); third-party realtime SaaS (rejected — adds an external dependency the constitution would treat as overlapping infra).

## 2. Better Auth for identity + vendor teams

**Decision**: Better Auth with email/password + the **organization plugin**. Platform roles (admin, rider, customer-default) are modeled as a user-level role/attribute; vendors are Better Auth **organizations** with member roles owner/admin/member. The Better Auth handler is mounted in NestJS; a `SessionGuard` resolves the session into a request-scoped `ActorContext` (userId, platformRole, activeOrgId, orgRole).

**Rationale**: Directly mirrors BoxConv's Clerk model (platformRole metadata + Clerk organizations with org:owner/admin/member). The organization plugin gives memberships, invitations, and active-organization switching out of the box, matching FR-002/FR-003/FR-004. Identity is always taken from the session (Principle III, FR-005).

**Alternatives considered**: Custom roles/members tables (rejected — reinvents the organization plugin; more surface to secure); JWT-only without sessions (rejected — Better Auth sessions integrate with the org plugin and cookie security per the Better Auth security skill).

## 3. Drizzle RQB modeling (no manual joins)

**Decision**: One Drizzle schema file per domain under `src/db/schema/`, with relations declared centrally (`relations.ts`) so every read uses `db.query.<table>.findMany/findFirst({ with: {...} })`. Typed branded IDs per table. Money stored as `integer`/`bigint` (UGX smallest unit). Enums via `pgEnum`. Geospatial: store `lat`/`lng` + a `geohash` text column with a btree index (parity with BoxConv; avoids a PostGIS dependency for v1).

**Rationale**: Principle II mandates RQB and forbids manual joins; declaring relations once makes nested reads type-safe and consistent. BoxConv already used lat/lng/geohash, so we keep the same approach for zone lookups and "nearby vendor/rider" queries.

**Alternatives considered**: PostGIS for spatial queries (deferred — geohash + bounding-box is enough for v1 zones); decimal money (rejected — UGX has no minor unit; integer avoids float error, SC-002); manual joins for performance (rejected by constitution — RQB first; raw SQL only for aggregates).

## 4. Money flows: BoxWallet ledger integration

**Decision**: A `FinancialModule` exposes a `LedgerClient` interface with a live BoxWallet HTTP implementation (injectable, swappable). Capture is triggered when an order/parcel `paymentStatus` becomes `captured`. Idempotency uses a stored `correlationId` per order/parcel; the confirmation record table enforces exactly-once. Commission precedence is resolved in a pure `resolveCommissionRule()` function: vendor override → zone mapping → order fallback. Wallet mappings auto-create on first need with an audit log. Failed syncs, quarantined (inactive-wallet) events, and failed refunds are retried by scheduled sweeps.

**Rationale**: Reproduces `convex/boxwallet.ts` behaviour and the BoxWallet integration doc (POST /orders/confirmations, 201/409 duplicate handling, splits, quarantine reprocess). The interface seam satisfies FR-057 and lets verification run against a mock without touching business logic.

**Alternatives considered**: Re-implementing the ledger in-app (rejected — out of scope per spec; BoxWallet is the system of record for splits/payouts); synchronous capture inside the payment callback only (rejected — needs retry/quarantine sweeps for durability).

## 5. Mobile money: Relworx integration

**Decision**: A `PaymentsModule` with a `MobileMoneyClient` interface (live Relworx implementation). Inbound collections follow initiated → pending → success/failed/expired, advanced by a Relworx webhook endpoint (HTTP controller) that is idempotent on the provider reference. A scheduled sweep cancels-and-restocks order-first checkouts unpaid past the timeout and reconciles late callbacks against already-cancelled orders (refund path).

**Rationale**: Mirrors `convex/mobileMoneyPayments.ts` + `checkout.sweepAbandonedMomoOrders`. Webhook idempotency delivers FR-040 (capture once); the sweep delivers FR-039.

**Alternatives considered**: Polling Relworx for status (rejected — webhook is push and lower latency; sweep is the safety net only); capturing optimistically before callback (rejected — risks crediting unpaid orders).

## 6. Distance / fare calculation

**Decision**: A `DistanceProvider` interface with a primary implementation (Google/Mapbox driving distance) and a **haversine fallback** when the provider is unavailable. Fare = `max(minFee, baseFee + ratePerKm × distanceKm) × surgeMultiplier`, with optional day/hour window gating, scoped to the address's active, non-suspended zone (located via geohash/bounding-box then max-distance check). Quotes are persisted with `expiresAt` and linked to the order/parcel on use.

**Rationale**: Reproduces `convex/lib/fare.ts` + `deliveryQuotes`/`pricingRules`/`deliveryZones`. The fallback satisfies the Distance-fallback assumption and FR-030.

**Alternatives considered**: Haversine only (rejected — under-prices real driving routes); no quote caching (rejected — checkout needs a stable, expiring quote, FR-032).

## 7. Scheduled jobs

**Decision**: `@nestjs/schedule` cron providers in a `SchedulingModule`, delegating to domain services. Jobs (parity with `convex/crons.ts` + subscription/recommendation crons): abandoned-momo sweep, BoxWallet failed-sync retry, quarantined-order reprocess, stale-unconfirmed-order auto-cancel (restock + refund), failed-refund retry, subscription cycle runner, hourly time-of-day recommendation recompute, quote/cart expiry cleanup.

**Rationale**: NestJS schedule is the idiomatic in-process scheduler; jobs call the same services as the API so logic isn't duplicated.

**Alternatives considered**: External queue/worker (BullMQ) — deferred until horizontal scale is needed (pairs with the optional-Redis note in plan Complexity Tracking).

## 8. Validation & API contract style

**Decision**: REST controllers with `class-validator` DTOs and a global `ValidationPipe({ whitelist: true, transform: true })`. Typed route params via branded `Id<'table'>` helpers. Errors normalized by a global exception filter into a consistent shape. No identity in DTOs — actor comes from `ActorContext` (Principle III).

**Rationale**: Principle IV (validated contracts) is the primary correctness mechanism given no unit tests (Principle V). Whitelisting strips unknown fields, preventing over-posting of protected fields (FR-004).

**Alternatives considered**: Zod via a custom pipe (viable; class-validator chosen for first-class NestJS ergonomics and decorator parity with DTO classes); GraphQL (rejected — REST + WS matches the spec's request/response + push shape and is simpler to scope per story).

## 9. Object storage for images & documents

**Decision**: An S3-compatible `StorageService` (Cloudflare R2 parity with BoxConv's R2 usage) issuing presigned upload URLs; the DB stores object keys (`r2Key`) and public URLs are derived. Used for product/category images, rider compliance docs, and proof-of-delivery photos.

**Rationale**: Parity with BoxConv (`convex/r2.ts`, `*R2Key` fields). Presigned uploads keep large blobs off the API.

**Alternatives considered**: Storing blobs in Postgres (rejected — bloats DB, poor CDN story).

## Resolved unknowns

| Topic | Resolution | Source |
|-------|-----------|--------|
| Realtime mechanism | WebSocket/SSE push via event bus | Clarification 2026-06-13 |
| External money services | BoxWallet + Relworx live, behind interfaces | Clarification 2026-06-13 |
| Data origin | Greenfield Postgres + seed | Clarification 2026-06-13 |
| Scope | All 12 stories, sequenced by priority | Clarification 2026-06-13 |
| Stack | NestJS / Better Auth / Drizzle / TanStack Router / Legend State | Constitution v1.0.0 |
| Tests | None authored (types + contracts + lint) | Constitution Principle V |
