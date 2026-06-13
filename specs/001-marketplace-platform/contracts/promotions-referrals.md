# Contract: Promotions, Campaigns & Referrals (US10)

## Promotions & campaigns (vendor + admin)
- `GET/POST/PATCH/DELETE /vendor/promotions[...]` — `vendor:admin`+ (org-scoped) — code, type (standard|buyget), status, windows, usage limits, customer usage limit. (FR-044)
- `POST /vendor/promotions/:id/application-method` — fixed|percentage; target items|shipping|order; allocation each|across; buy-get qty rules; `vendorPaysDelivery?`. (FR-044)
- `POST /vendor/promotions/:id/rules` — eligibility rule (`attribute`, `operator`, `values[]`). (FR-044)
- `GET/POST/PATCH /admin/campaigns[...]` + `/admin/campaigns/:id/budget` — `admin` — campaign + budget (spend|usage). (FR-045)
- `GET/POST/PATCH /admin/promotions[...]` — `admin` — platform-wide promotions.

## Promotion application (used by checkout)
- Validation engine (invoked from `/checkout/quote` and `/checkout/orders`): matches rules, checks overall + per-customer usage limits and campaign budget; on apply, increments `usageCount`, writes `promotionUsage`, increments budget usage. Over-limit/expired/inactive/non-matching → rejected with reason. (FR-044, FR-045, SC-008)

## Referrals (customer)
- `GET /referrals/code` — `customer` — own referral code (created on demand). (FR-046)
- `POST /referrals/redeem` — `customer` — `{ code }` at/after sign-up; records `referral(pending)`.
- Reward on qualifying first order: a completed order ≥ `referralMinOrderTotal` moves referral to `rewarded` per current settings (incl. active-campaign boost), enforcing `maxReferrals` per code. (FR-046, SC-008)
- `GET /admin/referrals` / `GET /admin/referral-settings` / `PATCH /admin/referral-settings` — `admin`.

**Validation**: usage/budget/per-code limits never exceeded under concurrency (SC-008).
