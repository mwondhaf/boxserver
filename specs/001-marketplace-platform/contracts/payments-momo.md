# Contract: Mobile Money Payments (US8)

Inbound collection + outbound disbursement via Relworx (MTN/Airtel, UGX), behind the `MobileMoneyClient` interface. Webhook-driven, idempotent.

## Customer
- `POST /payments/momo/collect` — `customer`/guest — `{ orderId | parcelId | subscriptionId, phoneNumber, provider }` → initiates a collection (`initiated`→`pending`), returns `{ paymentId, status }`. Customer approves on phone. (FR-038)
- `GET /payments/:id` — `customer` (owner) — payment status.

## Webhook (provider callback)
- `POST /webhooks/relworx` — `public` (signature-verified) — advances payment to `success|failed|expired`. On `success`, marks linked order/parcel `captured` exactly once and triggers the financial split. Idempotent on provider reference (repeat callbacks are no-ops). (FR-038, FR-040, SC-003)

## System (scheduled)
- Abandoned-checkout sweep: order-first checkouts unpaid past timeout → payment `expired`, order cancelled + restocked. (FR-039)
- Late-callback reconciliation: a `success` arriving after the order was cancelled → refund rather than capture. (FR-039, edge case)

## Outbound (disbursement)
- Used internally for payouts/refunds via `MobileMoneyClient.disburse(...)`; no direct public route.

**Validation**: capture-once invariant under duplicate callbacks (FR-040); UGX only.
