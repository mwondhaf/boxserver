# Quickstart: BoxServer Marketplace

Developer setup for the BoxServer API (NestJS) + client (TanStack Router). Greenfield Postgres; no legacy data migration.

## Prerequisites
- Node.js 22+, npm
- PostgreSQL 16 (local or Docker)
- Access/keys for external services (BoxWallet ledger, Relworx mobile money, object storage, distance provider) — or their sandbox equivalents

## 1. Environment
Create `.env` at the repo root:
```
DATABASE_URL=postgres://user:pass@localhost:5432/boxserver
BETTER_AUTH_SECRET=<random-32+ char>
BETTER_AUTH_URL=http://localhost:3000
BOXWALLET_BASE_URL=https://px.boxkubox.com/api/v1
BOXWALLET_API_KEY=<key>
RELWORX_API_KEY=<key>
RELWORX_WEBHOOK_SECRET=<secret>
STORAGE_ENDPOINT=<s3/r2 endpoint>
STORAGE_BUCKET=boxserver
DISTANCE_PROVIDER_KEY=<google/mapbox key>
DEFAULT_CURRENCY=UGX
DEFAULT_TIMEZONE=Africa/Kampala
```

## 2. Install & database
```bash
npm install
# create schema (drizzle-kit) and seed
npm run db:push        # or db:migrate
npm run db:seed        # categories, zones, pricing rules, a demo vendor + products, a demo rider
```

## 3. Create platform users
Platform roles (`admin`, `rider`, `customer`) cannot be set at signup — use the CLI:

```bash
# Admin (default role when --role is omitted)
npm run db:create-user -- --name "Alice Admin" --email alice@boxkubox.com --password "s3cr3t" --role admin

# Rider
npm run db:create-user -- --name "Bob Rider" --email bob@boxkubox.com --password "s3cr3t" --role rider
```

The script calls Better Auth's internal `signUpEmail` (correct password hashing, creates both `users` and `accounts` rows), then sets `platform_role` in the DB. Requires `DATABASE_URL` in `.env`.

## 4. Run
```bash
npm run start:dev      # NestJS API on :3000 (REST + /api/auth + WS gateway)
# in web/
npm run dev            # TanStack Router client
```

## 5. Quality gates (no unit/UX tests — Constitution Principle V)
```bash
npm run build          # tsc strict — type safety is a primary gate
npm run lint           # eslint + prettier — must pass before "done"
```

## 6. Verify a core flow (manual, P1)
1. Sign up (customer) at the client; create a vendor org → you become owner.
2. As vendor: add a product + an available, priced variant.
3. As customer: open the storefront, add to cart, `POST /checkout/quote`, then `POST /checkout/orders` (cash on delivery).
4. As vendor: confirm → prepare → ready. Watch the order's realtime status update on the customer view without refreshing (SC-007).
5. Confirm the price breakdown sums to the charged total (SC-002).

## 7. Verify money flow (P2)
1. Place a mobile-money order; approve via the Relworx sandbox callback (`POST /webhooks/relworx`).
2. Confirm the order is `captured` exactly once and a single financial split is recorded (`GET /admin/financial/confirmations`) (SC-003).
3. Cancel a paid order → verify refund + split reversal.

## Conventions reminder
- Import directly — **no barrel files**.
- All multi-table reads use Drizzle RQB `with` — **no manual joins** (raw SQL only for admin reports).
- Never accept actor identity in a request body — derive it from the session.
- Money is integer UGX smallest unit.
