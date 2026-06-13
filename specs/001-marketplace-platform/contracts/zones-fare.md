# Contract: Delivery Zones, Fare & Quotes (US6)

Public quoting + admin zone/pricing configuration.

## Quotes (used by checkout & parcels)
- `POST /quotes/delivery` — `public`/`customer` — `{ pickup{lat,lng}, dropoff{lat,lng} }` → resolves zone (geohash + max-distance), measures distance (provider, haversine fallback), applies active rule (day/hour window aware), returns `{ deliveryFee, breakdown, zone, expiresAt, quoteId }`. Out-of-zone/suspended → 422 with reason. (FR-030, FR-031)
- `POST /quotes/parcel` — `{ pickup, dropoff, sizeCategory, fragile, declaredValue? }` → adds package fee (size × fragile multiplier + insurance) to zone delivery fee. (FR-042)
- `GET /quotes/:id` — fetch a quote; expired → 410. (FR-032)

## Admin zone config
- `GET/POST/PATCH/DELETE /admin/zones[...]` — `admin` — zones: center, `maxDistanceMeters`, active, suspend (`suspendedReason`). (FR-029, FR-031)
- `GET/POST/PATCH/DELETE /admin/pricing-rules[...]` — `admin` — base/perKm/min/surge + day/hour windows; zone-scoped or global. (FR-029)
- `GET/POST/PATCH/DELETE /admin/parcel-pricing-rules[...]` — `admin` — package fee, fragile multiplier, insurance rate/min, max weight. (FR-042)
- `GET/PUT /admin/zones/:id/commission-mapping` — `admin` — map zone → BoxWallet commission rule. (FR-034)

**Validation**: fare = `max(minFee, baseFee + ratePerKm×km) × surge`; quote `expiresAt` enforced at order placement (FR-032).
