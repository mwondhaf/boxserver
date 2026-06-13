# Contract: Platform Administration & Operations (US12)

All `admin`.

## Platform settings (singleton)
- `GET /admin/settings` — current platform settings.
- `PATCH /admin/settings` — payment-method toggles + instructions, service toggles (grocery/parcels), markup/service-fee/small-order-fee policy, referral policy, support contact. Audited (`updatedBy`). (FR-050)
  - Disabling a payment method removes it from checkout options (FR-050, US12 AS1).
  - Markup % + `markupEnabled` change customer-facing prices (US12 AS2).

## Catalog & pricing governance
- Master catalog, brands, categories, category pricing rules — see catalog.md (admin section). (FR-051)
- Category time boosts: `GET/POST/PATCH /admin/category-time-boosts`.

## Approvals & operations
- Vendor approval/activation (organizations); rider approval/suspension (riders-dispatch). (FR-051)
- Zones, pricing rules, commission mappings (zones-fare). (FR-051)

## Dashboards & reports *(read-only; sanctioned raw-SQL aggregation — see plan Complexity Tracking)*
- `GET /admin/dashboard?from&to` — KPIs: order count, GMV, revenue (commission + fees), active vendors/riders. (FR-052)
- `GET /admin/reports/orders?from&to&groupBy` — order/revenue breakdowns. (FR-052)
- `GET /admin/reports/vendors?from&to` — vendor performance. (FR-052)
- `GET /admin/reports/riders?from&to` — rider performance (deliveries, ratings, earnings). (FR-052)

**Validation**: settings changes take effect on subsequent checkouts (US12 AS1–AS2); reports reflect accurate aggregates for the period (US12 AS3, SC). 
