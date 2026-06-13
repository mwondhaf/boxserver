# Contract: Riders & Dispatch (US5)

Rider profile/operations + admin approval + dispatch offer/accept. Works for both orders and parcels (delivery `kind`).

## Rider onboarding & profile
- `POST /rider/apply` — `customer`+ — submit rider registration (compliance: NIN, permit+expiry, vehicle, helmet, insurance; presigned doc uploads). Creates `accountStatus=pending`. (FR-022)
- `GET /rider/me` — `rider` — own profile, metrics, stage memberships.
- `PATCH /rider/me` — update editable profile/payout fields.

## Availability & location
- `POST /rider/status` — `rider` — `{ status: offline|online|busy }`. (FR-024)
- `POST /rider/location` — `rider` — `{ lat, lng }` while on an active job; pushed to subscribers over realtime. (FR-026)

## Dispatch (offer/accept)
- `GET /rider/offers` — `rider` (active) — current delivery offered to this rider within the window. (FR-024)
- `POST /rider/offers/:deliveryId/accept` — accept the offered order/parcel; only the offered rider, within window. (FR-024)
- `POST /rider/deliveries/:deliveryId/pickup` — `{ code }` — confirm pickup via vendor/sender code; wrong code → 422. (FR-025)
- `POST /rider/deliveries/:deliveryId/deliver` — `{ deliveryCode?, proofOfDeliveryR2Key? }` — mark delivered. (FR-025)
- `POST /rider/deliveries/:deliveryId/incident` — `{ category, description, photoR2Keys? }` — report incident; may release delivery. (FR-027)

## Ratings
- `POST /orders/:id/rating` / `POST /parcels/:id/rating` — `customer` — `{ rating 1-5, comment?, subRatings? }`; updates rider running average. (FR-027)

## Admin rider management
- `GET /admin/riders?status&q&cursor` — `admin` — list/search.
- `POST /admin/riders/:id/approve` — pending→active. (FR-022)
- `POST /admin/riders/:id/suspend` · `/deactivate` — with reason. (FR-022)
- `GET/POST/PATCH /admin/stages[...]` — manage stages/hubs. (FR-023)
- `POST /admin/riders/:id/stages` — assign stage membership (primary?). (FR-023)
- `GET /admin/rider-incidents?status` · `POST /admin/rider-incidents/:id/resolve` — review incidents. (FR-027)

**Validation**: suspended/inactive riders cannot accept work (FR-022); freelance vs in-house affects earnings visibility (FR-028, see financial-wallet).
