# Contract: Peer-to-Peer Parcel Delivery (US9)

Vendor-independent delivery. Reuses zones/fare (zones-fare), dispatch (riders-dispatch), payments (payments-momo), and financial split (financial-wallet).

## Sender (customer)
- `POST /parcels/quote` — see `POST /quotes/parcel` (zones-fare). (FR-042)
- `POST /parcels` — `customer` — `{ pickup{...}, dropoff{...}, package{description,sizeCategory,fragile,weight?,declaredValue?}, quoteId, paymentMethod }` → creates parcel (`pending`), generates pickup/delivery codes. (FR-041)
- `GET /parcels?cursor` — own parcels.
- `GET /parcels/:id` — detail + events + live status.
- `POST /parcels/:id/cancel` — cancel while cancellable.

## Rider
- Handled via the shared dispatch contract (`/rider/offers`, `/rider/deliveries/:id/pickup|deliver|incident`) with `kind=parcel`. (FR-043)

## Status
- draft→pending→picked_up→in_transit→delivered; canceled/failed paths. (FR-041)

## Financial
- On capture: package fee → platform, delivery fee → rider, recorded via `LedgerClient` with parcel `correlationId`. (FR-042, SC-003)

**Validation**: total fare = package fee (size × fragile multiplier + insurance) + zone delivery fee (FR-042); same audit/proof-of-delivery flow as orders (FR-043).
