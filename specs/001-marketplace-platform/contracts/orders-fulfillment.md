# Contract: Order Lifecycle & Fulfillment (US4)

Customer view + vendor operations. Every state change appends an `orderEvent` (FR-020) and emits a realtime event.

## Customer
- `GET /orders?cursor` — `customer` — own orders (own `userId`).
- `GET /orders/:id` — `customer` (owner) — order detail with items, modifiers, events, delivery status.
- `POST /orders/:id/cancel` — `customer` — cancel while still cancellable; triggers refund path if paid.
- `POST /orders/:id/items/:itemId/swap-response` — `customer` — `{ accept: boolean }` before `swapDeadlineAt`; updates totals. (FR-019)

## Vendor (org-scoped)
- `GET /vendor/orders?status&cursor` — `vendor:member`+ — org orders.
- `GET /vendor/orders/:id` — order detail.
- `POST /vendor/orders/:id/confirm` — confirm (pending→confirmed). (FR-018)
- `POST /vendor/orders/:id/prepare` — start preparing; sets `prepStartedAt` (anchors food dispatch gate). (FR-018)
- `POST /vendor/orders/:id/ready` — mark ready_for_pickup.
- `POST /vendor/orders/:id/items/:itemId/unavailable` — flag item unavailable. (FR-019)
- `POST /vendor/orders/:id/items/:itemId/propose-swap` — `{ proposedVariantId }`, sets `swapDeadlineAt`. (FR-019)
- `GET /vendor/orders/:id/pickup-code` — reveal `vendorPickupCode` to read to the rider. (FR-025)

## Status & transitions
- Enforced server-side: pending→confirmed→preparing→ready_for_pickup→out_for_delivery→delivered→completed; cancel/refund paths. Invalid transitions → 409. (FR-017)
- Food orders are not offered to a rider until within rider lead time of estimated ready time (`prepStartedAt + estimatedPrepTime`). (FR-018)

## System (scheduled)
- Auto-cancel sweep: orders unconfirmed past timeout → cancelled + restock + (if paid) refund with split reversal. (FR-021, see financial-wallet)

**Validation**: every transition logs actor + role (SC-005); swap response after deadline rejected (FR-019).
