# BoxServer

Multi-vendor food & grocery delivery marketplace for Uganda. Connects **customers**, **vendors** (grocery stores and restaurants), **riders**, and **platform admins** in a single API.

---

## Table of Contents

1. [What BoxServer does](#what-boxserver-does)
2. [Tech stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Step-by-step: bring the system to life](#step-by-step-bring-the-system-to-life)
   - [1. Clone and install](#1-clone-and-install)
   - [2. Create your `.env` file](#2-create-your-env-file)
   - [3. Start the infrastructure (Docker)](#3-start-the-infrastructure-docker)
   - [4. Set up the database](#4-set-up-the-database)
   - [5. Start the API](#5-start-the-api)
   - [6. Explore the API documentation](#6-explore-the-api-documentation)
   - [7. Create your first admin user](#7-create-your-first-admin-user)
5. [Authentication flow](#authentication-flow)
6. [Role guide](#role-guide)
7. [Core workflows](#core-workflows)
8. [Project layout](#project-layout)
9. [Key conventions](#key-conventions)
10. [Quality gates](#quality-gates)

---

## What BoxServer does

| Domain | Capability |
|--------|-----------|
| **Identity** | Users, vendor organisations (multi-user teams), roles, member management |
| **Catalog** | Products, variants, prices, images, modifier groups, collections, categories, brands |
| **Storefront** | Public vendor/product discovery by category and location |
| **Cart** | Per-vendor carts for registered users and guests, modifier selections |
| **Checkout** | Transparent price breakdown (subtotal, delivery, fees, discounts), promo codes |
| **Orders** | Full lifecycle: pending → confirmed → preparing → ready → in_transit → delivered |
| **Dispatch** | Rider assignment, pickup/delivery code verification, proof of delivery |
| **Riders** | Applications, compliance data, stage assignment, live location, ratings |
| **Parcels** | Point-to-point parcel delivery independent of any vendor |
| **Zones** | Geographic delivery zones with configurable pricing rules and fare quotes |
| **Payments** | Ugandan mobile money (MTN/Airtel) via Relworx with webhook reconciliation |
| **Financial** | Commission splits, BoxWallet ledger integration, vendor wallet management |
| **Subscriptions** | Vendor-created recurring delivery plans (weekly / biweekly / monthly) |
| **Promotions** | Discount codes, buy-X-get-Y, free delivery, campaign budgets |
| **Referrals** | Referral codes and rewards |
| **Notifications** | In-app notifications on order/parcel lifecycle events |
| **Realtime** | WebSocket/SSE push for live order status and rider location |
| **Admin** | Platform settings, approvals, delivery zones, dashboard reports |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| API framework | NestJS 11 + Express |
| Auth | Better Auth (email/password + organisation plugin) |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM (Relational Query Builder) |
| Cache / sessions | Redis (optional — degrades gracefully without it) |
| Validation | class-validator / class-transformer |
| Realtime | Socket.io (WebSocket) |
| Payments | Relworx mobile money |
| Wallets | BoxWallet ledger API |
| Storage | S3-compatible (Cloudflare R2 recommended) |
| API docs | Scalar (served at `/reference`) |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 22+ | |
| Docker + Docker Compose | any recent | Used to run Postgres + Redis locally |
| npm | 10+ | Comes with Node |

---

## Step-by-step: bring the system to life

### 1. Clone and install

```bash
git clone <your-repo-url>
cd boxserver
npm install
```

---

### 2. Create your `.env` file

Copy the template below and save it as `.env` in the project root.

```env
# ── Required ───────────────────────────────────────────────────────────────
DATABASE_URL=postgres://boxserver:boxserver@localhost:5432/boxserver
BETTER_AUTH_SECRET=change-me-to-a-random-string-at-least-32-chars

# ── Optional (app works without these, but features degrade) ───────────────

# Public URL of this server (used in auth email links)
BETTER_AUTH_URL=http://localhost:3000

# Redis — enables session caching and rate-limit storage
REDIS_URL=redis://localhost:6379

# BoxWallet — financial commission splits are disabled without this
BOXWALLET_BASE_URL=https://px.boxkubox.com/api/v1
BOXWALLET_API_KEY=

# Relworx — mobile money payments are disabled without this
RELWORX_API_KEY=
RELWORX_WEBHOOK_SECRET=

# S3-compatible storage — presigned image uploads are disabled without this
STORAGE_ENDPOINT=https://<account>.r2.cloudflarestorage.com
STORAGE_BUCKET=boxserver
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=

# Distance provider key — falls back to haversine without this (less accurate)
DISTANCE_PROVIDER_KEY=

# Defaults
DEFAULT_CURRENCY=UGX
DEFAULT_TIMEZONE=Africa/Kampala
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
```

> **Tip:** Generate a strong `BETTER_AUTH_SECRET` with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

### 3. Start the infrastructure (Docker)

The dev Docker Compose file starts Postgres and Redis for you.

```bash
docker compose -f docker-compose.dev.yml up db redis -d
```

Wait a few seconds for Postgres to be ready (health check turns green).

To run the **full stack** in Docker (including the API, with hot-reload):

```bash
docker compose -f docker-compose.dev.yml up --build
```

> **Note:** The first time you run `--build`, Docker installs all npm packages. Subsequent starts are fast because node_modules are cached in the container layer.

---

### 4. Set up the database

Push the schema and seed reference data (categories, zones, pricing rules):

```bash
npm run db:push    # creates all tables from the Drizzle schema
npm run db:seed    # seeds categories, delivery zones, and pricing rules
```

To inspect the database visually:

```bash
npm run db:studio  # opens Drizzle Studio in your browser at http://localhost:4983
```

---

### 5. Start the API

```bash
npm run start:dev
```

You should see:

```
BoxServer running on :3000
```

The API is now available at `http://localhost:3000/api`.

---

### 6. Explore the API documentation

Open your browser and navigate to:

```
http://localhost:3000/reference
```

This opens the **Scalar API Reference** — a beautiful, interactive API explorer. Every endpoint is documented with:

- Required and optional fields with examples
- Authentication requirements
- Response schemas
- Descriptions of what each endpoint does and when to use it

You can also view the raw OpenAPI JSON at `http://localhost:3000/api/openapi-json`.

---

### 7. Create your first admin user

The API uses **Better Auth** for authentication. Sign up and then promote yourself to admin.

**Step 1 — Create an account** (POST to Better Auth sign-up):

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Platform Admin",
    "email": "admin@example.com",
    "password": "your-strong-password"
  }'
```

**Step 2 — Sign in** to get a session cookie:

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-strong-password"
  }'
```

**Step 3 — Get your user ID** (the session cookie is set automatically):

```bash
curl -b cookies.txt http://localhost:3000/api/me
```

**Step 4 — Promote yourself to admin** by updating the database directly (since there's no bootstrap admin yet):

```bash
# Using psql
psql "postgres://boxserver:boxserver@localhost:5432/boxserver" \
  -c "UPDATE \"user\" SET platform_role = 'admin' WHERE email = 'admin@example.com';"
```

You are now a platform admin. All subsequent API calls use the session cookie (`cookies.txt`) stored in step 2.

---

## Authentication flow

BoxServer uses **session cookies** managed by Better Auth. There are no API tokens for browser/mobile clients.

```
1. POST /api/auth/sign-up/email   → create account
2. POST /api/auth/sign-in/email   → receive session cookie (HTTP-only, secure)
3. GET  /api/me                   → verify session, get actor context
4. All API calls                  → cookie is sent automatically by the browser
```

All auth routes live at `/api/auth/*` and are handled directly by Better Auth. See the [Better Auth docs](https://better-auth.com) for the full list of routes (password reset, email verification, organisation management, etc.).

### Vendor organisations

A **vendor** is a Better Auth **organisation**. Create one via the Better Auth API:

```bash
# Create an organisation (makes the caller the owner)
curl -b cookies.txt -X POST http://localhost:3000/api/auth/organization/create \
  -H "Content-Type: application/json" \
  -d '{ "name": "My Store", "slug": "my-store" }'
```

Once created, use the vendor endpoints (`/api/vendor/*`) with the organisation's session active.

---

## Role guide

| Role | How to get it | What they can do |
|------|--------------|-----------------|
| `customer` | Default on sign-up | Browse storefront, place orders, track deliveries, manage parcels |
| `vendor` | Create a Better Auth organisation | Manage catalog, fulfil orders, view wallet |
| `rider` | POST /api/rider/apply + admin approval | Accept dispatches, update location, report incidents |
| `admin` | Database update (first admin) or `PATCH /api/admin/users/:id/role` | Everything |

---

## Core workflows

### Placing an order (customer)

```
1. GET  /api/storefront/vendors          → browse vendors
2. GET  /api/storefront/vendors/:slug    → view vendor
3. GET  /api/storefront/vendors/:orgId/products → browse products
4. POST /api/quotes                      → get delivery fee quote
5. POST /api/cart/org/:orgId             → create/get cart
6. POST /api/cart/:cartId/items          → add items
7. POST /api/checkout/quote              → see full price breakdown
8. POST /api/checkout/place              → place the order
9. GET  /api/orders/:id                  → track order
```

### Vendor order flow

```
1. GET  /api/v/orders?status=pending     → see incoming orders
2. PUT  /api/v/orders/:id/confirm        → accept (set est. prep time)
3. PUT  /api/v/orders/:id/prepare        → mark as preparing
4. PUT  /api/v/orders/:id/ready          → mark ready for pickup
5. POST /api/v/orders/:id/pickup-code    → verify rider's pickup code
```

### Rider delivery flow

```
1. PUT  /api/rider/status                → set online
2. PUT  /api/rider/location              → update GPS position
3. POST /api/dispatch/:orderId/accept    → accept a delivery
4. POST /api/dispatch/:orderId/pickup    → confirm pickup (vendor code)
5. POST /api/dispatch/:orderId/deliver   → confirm delivery (optional photo key)
```

### Adding a product (vendor)

```
1. POST /api/vendor/catalog/products          → create product
2. POST /api/vendor/catalog/variants          → add a variant (1kg, 500g, etc.)
3. POST /api/vendor/catalog/variants/:id/price → set price in UGX
4. POST /api/vendor/catalog/products/:id/image-upload → get upload URL
5. PATCH /api/admin/catalog/products/:id/approve → (admin) approve for storefront
```

---

## Project layout

```text
src/
├── main.ts                    # bootstrap, Swagger, security headers, CORS
├── app.module.ts              # root module wiring
├── auth/                      # Better Auth handler, session guard, actor context
│   └── ability/               # CASL ability factory, policies guard
├── common/                    # validation pipe, exception filter, config, storage, Redis
├── db/                        # Drizzle schema (schema/), client, migrations, seed
├── realtime/                  # Socket.io gateway and event bus
└── modules/
    ├── identity/              # users, organizations, members, invitations
    ├── catalog/               # products, variants, prices, modifiers, images
    ├── cart/                  # carts, cart items, customer addresses
    ├── checkout/              # pricing engine, order placement
    ├── orders/                # order lifecycle, swaps, cancellations
    ├── riders/                # profiles, stages, ratings, incidents
    ├── dispatch/              # rider assignment, pickup/delivery confirmation
    ├── zones/                 # delivery zones, pricing rules, fare quotes
    ├── financial/             # BoxWallet client, commission splits, wallets
    ├── payments/              # Relworx mobile money, webhook handling
    ├── parcels/               # P2P parcel delivery
    ├── promotions/            # promo codes, campaigns
    ├── referrals/             # referral codes and rewards
    ├── subscriptions/         # recurring delivery plans and subscriptions
    ├── notifications/         # user notification inbox
    ├── admin/                 # dashboards, reports, platform settings
    └── scheduling/            # cron jobs (order sweeps, payment retries, cycles)
```

---

## Key conventions

| Convention | Rule |
|-----------|------|
| **No barrel files** | Always import directly from the source file. Barrel files (`index.ts` re-exports) cause OOM crashes during Vite dev. |
| **No manual SQL joins** | Use Drizzle RQB `with:` for relations. Raw SQL only in admin aggregate queries. |
| **Identity from session** | Never accept `userId` in request bodies. Derive it from `ctx.auth` or `req.actor`. |
| **Money is integer UGX** | `3500` means UGX 3,500. Never store floats for money. |
| **Validate at every boundary** | Every endpoint uses `class-validator` DTOs via the global `ValidationPipe`. |
| **No bounded queries** | Use `.take(n)` instead of `.collect()` on large tables. |

---

## Quality gates

No unit or UX tests are authored (per project constitution). Quality is enforced by:

```bash
npm run build   # TypeScript strict compilation — catches type errors
npm run lint    # ESLint + Prettier
```

Run both before committing.
