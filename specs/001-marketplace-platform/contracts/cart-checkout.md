# Contract: Cart, Pricing & Checkout (US3)

Customer or guest. Carts are single-vendor and expire. Guest carts use a `sessionId` (header `x-cart-session`).

## Saved addresses (customer)
- `GET /addresses` — `customer` — own saved addresses. (FR-058)
- `POST /addresses` · `PATCH /addresses/:id` · `DELETE /addresses/:id` — manage saved addresses. (FR-058)
- `POST /addresses/:id/default` — set the default address. (FR-058)

## Cart
- `GET /cart?organizationId` — `customer`/guest — current cart with line items, modifiers, and a live price breakdown. (FR-011, FR-012)
- `POST /cart/items` — add variant (+ modifier selections). Validates modifier min/max for food. (FR-010)
- `PATCH /cart/items/:id` — change quantity / modifiers.
- `DELETE /cart/items/:id` — remove line.
- `DELETE /cart` — clear cart.

## Pricing preview
- `POST /checkout/quote` — body: `{ organizationId, fulfillmentType, addressId? | inlineLocation?, promoCode? }` — returns breakdown: `{ subtotal, markupTotal, serviceFeeTotal, smallOrderFeeTotal, deliveryQuote?, discountTotal, taxTotal, total }` and a `deliveryQuoteId` when platform delivery. (FR-012, FR-013, FR-014, FR-006)
  - Rejects below `minimumOrderAmount` (FR-014); rejects out-of-zone/suspended-zone (FR-031); applies/validates promo (FR-044/045).

## Place order
- `POST /checkout/orders` — body: `{ organizationId, fulfillmentType, addressId? | guest{name,phone,lat,lng,description}, deliveryQuoteId?, paymentMethod, promoCode? }` — creates the order (status `pending`, paymentStatus `awaiting`), snapshots items/modifiers/prices, decrements stock atomically, records promo usage. (FR-015, FR-016, FR-017)
  - `paymentMethod` must be enabled in platform settings (FR-015).
  - Expired `deliveryQuoteId` → 409, must re-quote (FR-032).
  - For mobile money, returns a payment-initiation handle (see payments-momo).

**Validation**: vendor must be active/not busy/in hours (FR-009); breakdown components sum to `total` (SC-002); guest ownership proven by session (FR-016).
