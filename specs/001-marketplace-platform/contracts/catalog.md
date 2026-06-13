# Contract: Catalog & Storefront (US2)

Customer-facing browsing (public) + vendor catalog management (vendor-scoped). Reads return nested data via RQB (`with` variants, prices, images, modifiers).

## Storefront (public)
- `GET /storefront/categories` — `public` — organization categories tree.
- `GET /storefront/vendors?category&lat&lng&q` — `public` — vendors by category/location/name; only `isActive`. (FR-008)
- `GET /storefront/vendors/:slug` — `public` — vendor profile + open/busy state.
- `GET /storefront/vendors/:slug/products?q&categoryId&collectionId&cursor` — `public` — available, approved variants with customer-facing price (markup applied per settings). (FR-008, FR-012)
- `GET /storefront/products/:slug` — `public` — product detail with variants, prices, images, and (food) modifier groups/options. (FR-007)
- `GET /storefront/recommendations?slot` — `public` — time-of-day recommended variants.

## Vendor catalog management (`vendor:member`+ unless noted; org-scoped)
- `GET /vendor/products` · `POST /vendor/products` · `PATCH /vendor/products/:id` · `DELETE /vendor/products/:id` — manage products. (FR-006)
- `POST /vendor/products/:id/images` (presigned) · `DELETE /vendor/product-images/:id`.
- `GET/POST/PATCH/DELETE /vendor/variants[...]` — variants: unit, sku, stock, availability. (FR-006)
- `PUT /vendor/variants/:id/price` — set price set / money amounts (regular, sale, tiered). (FR-006)
- `GET/POST/PATCH/DELETE /vendor/collections[...]` — variant collections (ordered). 
- Food modifiers (`vendor` on food orgs):
  - `GET/POST/PATCH/DELETE /vendor/products/:id/modifier-groups[...]` — group with required + min/max. (FR-007)
  - `GET/POST/PATCH/DELETE /vendor/modifier-groups/:id/options[...]` — options with `priceAdd`, availability.

## Master catalog (admin)
- `GET/POST/PATCH /admin/products[...]`, `/admin/brands`, `/admin/categories`, approval toggles (`isApproved`). (FR-051)

**Validation**: out-of-stock/unavailable variants shown as such and not orderable (FR-008); modifier min/max enforced at add-to-cart (FR-010); writes scoped to active org.
