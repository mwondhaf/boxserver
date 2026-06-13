# API Contracts: BoxServer Marketplace

REST over HTTPS (JSON) + a WebSocket/SSE realtime channel. Conventions that apply to **every** endpoint:

- **Auth**: a Better Auth session cookie is required unless marked `public`. The acting identity (`userId`, `platformRole`, active `organizationId`, `orgRole`) is derived server-side from the session — **never** sent in the request body (Constitution Principle III, FR-005).
- **Authorization**: each route declares the role(s) allowed. Vendor routes additionally scope every read/write to the actor's active organization. Enforced by a NestJS `SessionGuard` + ability/policy layer.
- **Validation**: request bodies/params are `class-validator` DTOs behind a global `ValidationPipe({ whitelist:true, transform:true })`. Unknown fields are stripped (prevents over-posting protected fields, FR-004).
- **Money**: integers, UGX smallest unit.
- **IDs**: branded string IDs (`Id<'table'>`).
- **Errors**: normalized `{ statusCode, error, message, details? }` via a global exception filter.
- **Pagination**: list endpoints accept `?limit` (bounded, default 20, max 100) + `?cursor`; never unbounded reads.
- **Reads**: server implementations fetch related data via Drizzle RQB `with` — no manual joins (Principle II).

Role legend: `public` · `customer` · `vendor:member` · `vendor:admin` · `vendor:owner` · `rider` · `admin`.

## Contract files (by capability / user story)

| File | User story | Roles |
|------|-----------|-------|
| [auth-and-identity.md](./auth-and-identity.md) | US1 | all |
| [catalog.md](./catalog.md) | US2 | public read, vendor write |
| [cart-checkout.md](./cart-checkout.md) | US3 | customer/guest |
| [orders-fulfillment.md](./orders-fulfillment.md) | US4 | customer, vendor |
| [riders-dispatch.md](./riders-dispatch.md) | US5 | rider, admin |
| [zones-fare.md](./zones-fare.md) | US6 | public quote, admin config |
| [financial-wallet.md](./financial-wallet.md) | US7 | system, admin |
| [payments-momo.md](./payments-momo.md) | US8 | customer, webhook |
| [parcels.md](./parcels.md) | US9 | customer/sender, rider |
| [promotions-referrals.md](./promotions-referrals.md) | US10 | vendor, admin, customer |
| [subscriptions.md](./subscriptions.md) | US11 | vendor, customer |
| [admin-platform.md](./admin-platform.md) | US12 | admin |
| [realtime-events.md](./realtime-events.md) | cross-cutting | scoped channels |

Each endpoint row uses the form `METHOD /path — role(s) — purpose (FR refs)`.
