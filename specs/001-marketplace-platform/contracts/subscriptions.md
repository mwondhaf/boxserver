# Contract: Prepaid Subscription Plans (US11)

Vendor publishes finite prepaid plans; customer pays upfront; a cron mints an order per cycle.

## Vendor (org-scoped)
- `GET/POST/PATCH/DELETE /vendor/subscription-plans[...]` — `vendor:admin`+ — name, cadence, totalCycles, bundlePricePerCycle, markup, autoRenew, isActive. (FR-047)
- `POST /vendor/subscription-plans/:id/items` — included variants + quantity + `isSwappable`. (FR-047)
- `GET/POST/PATCH /vendor/subscription-plans/:id/slots` — delivery windows with `capacity`. (FR-047)
- `GET /vendor/subscriptions?planId&status` — view subscribers.

## Customer
- `GET /storefront/vendors/:slug/subscription-plans` — `public` — browse active plans.
- `POST /subscriptions` — `customer` — `{ planId, addressId, slotId, preferredDeliveryHour? }` → computes grand total (items + delivery/cycle), snapshots plan+slot, status `awaiting_payment`; pay upfront via momo. (FR-048)
  - Full slot capacity → 409. (FR-048)
- `GET /subscriptions` / `GET /subscriptions/:id` — own subscriptions + cycles.
- `POST /subscriptions/:id/pause` · `/resume` · `/skip-next` — schedule controls. (FR-049)
- `POST /subscriptions/:id/cancel` — refund unfulfilled cycles only. (FR-049, SC-009)

## System (scheduled — subscription cycle runner)
- For each due `active` subscription: mint an order from snapshotted items, record per-cycle split, create `subscriptionCycle(fulfilled)`, decrement `cyclesRemaining`; reaching 0 → `completed`. Failures → `subscriptionCycle(failed)` with reason. (FR-048, SC-009)

**Validation**: in-flight subscriptions use snapshots, unaffected by later plan/slot edits (FR-048, edge case); exactly one order per cycle (SC-009).
