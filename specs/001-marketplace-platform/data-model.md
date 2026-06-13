# Phase 1 Data Model: BoxServer Marketplace

PostgreSQL via Drizzle ORM. **All reads use the Relational Query Builder** — every relationship below is declared in `src/db/relations.ts` so nested data is fetched with `with`, never manual joins (Constitution Principle II). Money is `bigint`/`integer` in UGX smallest unit. Timestamps are `timestamptz`. Each table has a branded `id`.

Conventions:
- `FK →` denotes a foreign key + a declared RQB relation.
- `enum(...)` denotes a `pgEnum`.
- Identity (users, sessions, organizations, members) is owned by **Better Auth**; we reference `userId`/`organizationId` as the stable keys and store our business-specific data alongside.

---

## Domain: Identity & Vendors (`identity` module)

### users *(Better Auth core; extended)*
- `id`, `email`, `name`, `image`, `phone?`
- `platformRole` enum(`customer`,`rider`,`admin`) — default `customer`
- Relations: has-many `customerAddresses`, `orders` (as customer), `referralCode`.

### organizations (Vendors) *(Better Auth org + business extension)*
- `id` (Better Auth org id), `name`, `slug`, `logo?`, `coverPhoto?`, `email?`, `phone?`
- `type` enum(`grocery`,`food`) default `grocery`
- Business: `tin?`, contact person fields, payout fields (`payoutMethod`, mobile-money/bank), location (`country`,`cityOrDistrict`,`town`,`street`,`lat`,`lng`,`geohash`,`googlePlacesId`)
- Operations: `businessHours` (jsonb), `timezone` default `Africa/Kampala`, `isBusy`, `isActive`, fulfillment flags (`platformDeliveryEnabled`,`selfDeliveryEnabled`,`selfPickupEnabled`,`selfDeliveryFee?`,`selfDeliveryRadius?`,`selfDeliveryEstimate?`,`pickupInstructions?`,`estimatedPrepTime?`), `minimumOrderAmount?`, `commissionRuleId?` (BoxWallet override), `categoryId?`
- FK → `organizationCategories`. Relations: has-many `products`, `productVariants`, `orders`, `variantCollections`, `subscriptionPlans`, `members` (via Better Auth).
- **Validation**: only `owner` may edit payout/bank fields and delete org (FR-004); `isBusy`/inactive/out-of-hours blocks ordering (FR-009).

### organizationCategories
- `id`, `name`, `slug`, `parentId?` (self FK). Relations: self parent/children, has-many `organizations`.

### organizationCustomers *(denormalization only — repeat-customer index per vendor; no dedicated endpoint)*
- `id`, FK → `organizations`, `userId`. Links repeat customers to a vendor.

---

## Domain: Catalog (`catalog`, `categories` modules)

### categories
- `id`, `name`, `slug`, `description?`, `parentId?` (self FK), `thumbnailR2Key?`, `bannerR2Key?`, `isActive`
- Relations: self parent/children, has-many `products`, `categoryPricingRules`, `categoryTimeBoosts`.

### categoryPricingRules
- `id`, FK → `categories`, `markupPercentage`, `isActive`, `note?`. Drives customer-facing markup (FR-012; toggled by `platformSettings.markupEnabled`).

### brands
- `id`, `name`, `slug`, `description?`, `logoR2Key?`. Relations: has-many `products`.

### products *(master catalog)*
- `id`, `name`, `slug`, `description?`, FK → `brands?`, FK → `categories`, FK → `organizations?`, `isActive`, `isApproved?`
- Relations: has-many `productImages`, `productTags`, `productVariants`, `menuModifierGroups`, many-to-many `categories` via `productCategories`.

### productImages
- `id`, FK → `products`, `r2Key`, `alt?`, `isPrimary`.

### productTags
- `id`, FK → `products`, `value`.

### productCategories *(join entity, modeled as RQB many-to-many)*
- `id`, FK → `products`, FK → `categories`.

### productVariants *(vendor-specific listing)*
- `id`, FK → `products`, FK → `organizations`, `sku`, `unit`, `weightGrams?`, `barcode?`, `stockQuantity`, `isAvailable`, `isApproved`
- Relations: has-one `priceSet`, has-many `cartItems`, `variantCollectionItems`.
- **Validation**: only available + approved variants are orderable (FR-008); stock decremented atomically at order placement (last-unit edge case).

### priceSets / moneyAmounts
- `priceSets`: `id`, FK → `productVariants`, FK → `organizations`.
- `moneyAmounts`: `id`, FK → `priceSets`, `currency` default `UGX`, `amount`, `saleAmount?`, `minQuantity?`, `maxQuantity?` (tiered pricing, FR-006).

### Food customisation
- **menuModifierGroups**: `id`, FK → `products`, FK → `organizations`, `name`, `required`, `minSelections`, `maxSelections`, `sortOrder?`. Has-many `menuModifierOptions`.
- **menuModifierOptions**: `id`, FK → `menuModifierGroups`, `name`, `priceAdd`, `isAvailable`, `sortOrder?`.
- **Validation**: selection within min/max enforced before add-to-cart for food vendors (FR-010).

### variantCollections / variantCollectionItems
- Vendor-curated, ordered groups of variants for the storefront. `isActive`, `sortOrder`.

---

## Domain: Customers & Cart (`cart` module)

### customerAddresses
- `id`, `userId`, `name`, `phone?`, `city?`,`town?`,`street?`, `addressType?` enum(`hotel`,`apartment`,`home`,`office`), `buildingName?`,`apartmentNo?`, `lat?`,`lng?`,`geohash?`, `directions?`, `isDefault`.

### carts
- `id`, `userId?` (null for guest), `sessionId?` (guest), FK → `organizations`, `currencyCode` default `UGX`, `expiresAt`
- **Single-vendor scope** (FR-011); expired carts swept. Relations: has-many `cartItems`.

### cartItems
- `id`, FK → `carts`, FK → `productVariants`, `quantity`. Has-many `cartItemModifiers`.

### cartItemModifiers
- `id`, FK → `cartItems`, FK → `menuModifierOptions`, `quantity`.

---

## Domain: Orders & Fulfillment (`orders`, `checkout` modules)

### orders
- `id`, `displayId` (sequential, from `counters`), FK → `organizations`
- `status` enum(`pending`,`confirmed`,`preparing`,`ready_for_pickup`,`out_for_delivery`,`delivered`,`completed`,`cancelled`,`refunded`)
- `fulfillmentStatus` enum(`not_fulfilled`,`fulfilled`,`shipped`,`returned`)
- `paymentStatus` enum(`awaiting`,`captured`,`refunded`,`canceled`)
- `fulfillmentType` enum(`delivery`,`pickup`,`self_delivery`)
- `paymentMethod?` enum(`cash_on_delivery`,`mobile_money`,`card`,`wallet`)
- Customer: `userId?`; guest fields (`isGuest`,`guestName`,`guestPhone`,`guestSessionId`,`guestSource`, inline `deliveryLat/Lng/Phone/Description`)
- FK → `customerAddresses?`, FK → `deliveryZones?`, FK → `deliveryQuotes?` (via `deliveryQuoteId`)
- Rider snapshot: `riderId?`,`riderName?`,`riderPhone?`, `offeredToRiderId?`,`offeredAt?`
- Totals (UGX): `subtotal?`,`total`,`taxTotal`,`discountTotal`,`deliveryTotal`,`serviceFeeTotal?`,`smallOrderFeeTotal?`,`deliverySubsidyTotal?`,`markupTotal?`,`riderDeliveryFee?`, `currencyCode`
- Financial: `commissionRuleId?`, `refundPending?`, `refundIdempotencyKey?`
- Food: `prepStartedAt?` (anchors prep clock for dispatch gating, FR-018)
- Codes: `vendorPickupCode?`, `proofOfDeliveryR2Key?`
- Relations: has-many `orderItems`, `orderEvents`, `orderItemEvents`, `promotionUsages`; has-one `boxWalletOrderConfirmation`.
- **State transitions**: pending→confirmed→preparing→ready_for_pickup→out_for_delivery→delivered→completed; cancellation/refund from most states (FR-017). Auto-cancel if unconfirmed past timeout → restock + refund (FR-021).

### orderItems
- `id`, FK → `orders`, FK → `products`, FK → `productVariants`, `title` (snapshot), `quantity`, `unitPrice` (marked-up), `vendorUnitPrice?`, `markupAmount?`, `subtotal`, `taxTotal`
- Swap fields: `itemStatus?` enum(`available`,`unavailable`,`swap_proposed`,`swap_accepted`,`swap_rejected`,`refunded`), `proposedVariantId?`, proposed price/title/image, `swapDeadlineAt?`, `swapReportedBy?`
- Has-many `orderItemModifiers` (snapshot: `name`,`priceAdd`,`quantity`).

### orderEvents *(immutable audit log)*
- `id`, FK → `orders`, `actorUserId?`, `eventType`, from/to status fields, `reason?`, `actorName?`, `actorRole?` enum(`customer`,`vendor`,`rider`,`admin`,`system`), monetary snapshots, `metadata?` jsonb. Append-only (FR-020).

### orderItemEvents
- Audit log for item add/exchange/remove with snapshots.

### counters
- `id`, `name` (`orders`,`parcels`), `value`. Source of sequential `displayId` (FR-053).

---

## Domain: Riders & Dispatch (`riders`, `dispatch` modules)

### riders
- `id`, `userId`, `riderCode`, `name`, `accountStatus` enum(`pending`,`active`,`suspended`,`inactive`)
- Contact + compliance (UG): `phoneNumber`, `email?`, next-of-kin, `nationalId?`, `drivingPermitNumber?`,`drivingPermitExpiry?`, `tin?`, `helmetVerified`, insurance fields
- Vehicle: `vehicleType` enum(`walking`,`bicycle`,`scooter`,`motorbike`,`car`,`van`,`truck`) + plate/make/model/color/year
- Location (home/base) + media (`photoR2Key?`, doc R2 keys)
- Payout prefs; `employmentType?` enum(`freelance`,`inhouse`)
- Metrics (denormalized): `ratingSum`,`ratingCount`,`completedDeliveries`,`canceledDeliveries`,`totalEarnings`
- `currentStageId?`, approval/suspension audit fields
- Relations: has-many `riderStageMemberships`, `riderRatings`, `riderPayouts`, `riderIncidents`; has-one current `riderLocation`.
- **Validation**: only `active` riders accept work (FR-022); admin approve/suspend/deactivate.

### riderLocations
- `id`, `userId` (rider), `lat`,`lng`,`geohash?`, `status` enum(`offline`,`online`,`busy`), `lastUpdatedAt`, `activeOrderId?`, `activeParcelId?`. Pushed over realtime (FR-026).

### stages
- `id`, `name`, `code`, `address`, `district?`, `lat`,`lng`,`geohash?`, FK → `deliveryZones?`, `capacity?`, `isActive`, contact. Rider hubs (FR-023).

### riderStageMemberships *(rider ↔ stage many-to-many)*
- `id`, FK → `riders`, FK → `stages`, `isActive`, `isPrimary`, `joinedAt`, `leftAt?`, `assignedBy?`.

### riderRatings
- `id`, FK → `riders`, FK → `orders?`/`parcels?`, `customerUserId`, `rating` (1–5), `comment?`, optional sub-ratings. Updates rider running average (FR-027).

### riderIncidents
- `id`, `deliveryKind` enum(`order`,`parcel`), `deliveryId`, `riderUserId`, `category` enum(...), `description`, `photoR2Keys?`, `status` enum(`open`,`under_review`,`resolved`,`dismissed`), `resolutionNote?`, `autoCanceledDelivery?` (FR-027).

### riderPayouts
- `id`, FK → `riders`, `amount`,`currency`, `payoutMethod`, payment details, `status` enum(`pending`,`processing`,`completed`,`failed`), period + `deliveryCount`, transaction/audit fields. Batched per period (FR-037).

---

## Domain: Zones, Fare & Quotes (`zones` module)

### deliveryZones
- `id`, `name`, `city`, `country` default `UG`, `centerLat`,`centerLng`, `maxDistanceMeters`, `color?`, `active`, `suspendedReason?`,`suspendedAt?`. Relations: has-many `pricingRules`, `stages`, has-one `zoneCommissionMapping`.

### pricingRules
- `id`, FK → `deliveryZones?` (null = all zones), `name`, `baseFee`,`ratePerKm`,`minFee`,`surgeMultiplier`, `daysOfWeek?`,`startHour?`,`endHour?`, `status` enum(`active`,`inactive`). Fare formula (FR-030).

### zoneCommissionMappings
- `id`, FK → `deliveryZones`, `boxWalletCommissionRuleId`, `ruleName?`. Commission precedence middle tier (FR-034).

### deliveryQuotes
- `id`, pickup/dropoff lat/lng, `distanceMeters`, `distanceSource` enum(`google`,`mapbox`,`haversine`), `estimatedDurationSeconds?`, fee breakdown (`baseFee`,`ratePerKm`,`distanceFee`,`surgeMultiplier`,`minFee`,`deliveryFee`), zone/rule refs, `expiresAt`, `usedAt?`; parcel-specific fields (`sizeCategory?`, `packageFee?`,`fragileFee?`,`insuranceFee?`,`totalPackageFee?`,`totalFare?`,`commissionRuleId?`); FK → `orders?`/`parcels?` (FR-032).

---

## Domain: Financial & Wallets (`financial` module)

### boxWalletMappings
- `id`, `entityType` enum(`vendor`,`rider`,`customer`,`platform`), `organizationId?`|`riderId?`|`userId?`, `boxWalletId`, `entityName`, `autoCreated`. Auto-created on first need (FR-035).

### boxWalletOrderConfirmations
- `id`, FK → `orders`, `boxWalletOrderId`, `boxWalletStatus` (`processed`|`quarantined`|`already_synced`), `correlationId` (idempotency key, FR-036). Unique on `correlationId`.

### boxWalletParcelConfirmations
- `id`, FK → `parcels`, `boxWalletOrderId`, `boxWalletStatus`, `correlationId`, fee breakdown (`packageFee`,`deliveryFee`,`totalFare`).

### boxWalletAutoCreateLog
- Audit of wallet auto-create outcomes (`event` enum, entity refs, `error?`).

---

## Domain: Payments / Mobile Money (`payments` module)

### mobileMoneyPayments
- `id`, `boxWalletPaymentId?`, `direction` enum(`inbound`,`outbound`), `status` enum(`initiated`,`pending`,`success`,`failed`,`expired`), `phoneNumber`, `amount`, `currency`=`UGX`, `provider?` (`mtn`/`airtel`), Relworx refs (`customerReference?`,`internalReference?`), `charge?`, `description?`, `failureReason?`, FK → `orders?`/`parcels?`, `customerUserId?`, `entityType?`, `initiatedAt`,`completedAt?`. Webhook-driven, idempotent on reference (FR-038/FR-040).

---

## Domain: Parcels (`parcels` module)

### parcels
- `id`, `displayId`, `senderUserId`, pickup + dropoff details (name/phone/address/lat/lng/geohash/notes), package (`description`,`weight?`,`sizeCategory` enum(`small`,`medium`,`large`,`extra_large`),`fragile`,`valueAmount?`,`valueCurrency`)
- `status` enum(`draft`,`pending`,`picked_up`,`in_transit`,`delivered`,`canceled`,`failed`), rider snapshot + offer fields
- Pricing: FK → `deliveryQuotes?`, `priceAmount?`,`packageFeeAmount?`,`deliveryFeeAmount?`,`commissionRuleId?`,`riderDeliveryFee?`, `paymentStatus` enum(`pending`,`paid`,`refunded`), `paymentMethod?`
- Codes (`pickupCode?`,`deliveryCode?`), `proofOfDeliveryR2Key?`, timestamps. Relations: has-many `parcelEvents`; has-one `boxWalletParcelConfirmation` (FR-041/FR-042/FR-043).

### parcelEvents
- Audit log (`eventType`,`status?`,`description?`,`actorUserId?`,`metadata?`).

### parcelPricingRules
- `id`, `sizeCategory`, `name`, `description?`, `packageFee`, `fragileMultiplier`, `insuranceRatePercent`, `insuranceMinFee`, `maxWeightKg?`, `status`. Drives package fee (FR-042).

---

## Domain: Promotions & Referrals (`promotions`, `referrals` modules)

### campaigns / campaignBudgets / campaignBudgetUsages
- `campaigns`: `id`, `name`, `description?`, `campaignIdentifier?`, `startsAt?`,`endsAt?`, FK → `organizations?`, `deletedAt?`.
- `campaignBudgets`: FK → `campaigns`, `type` enum(`spend`,`usage`), `currencyCode`, `limitAmount?`, `usedAmount`.
- Gates promo availability when exhausted (FR-045).

### promotions / applicationMethods / promotionRules / promotionRuleValues / promotionUsages
- `promotions`: `id`, `code`, `type` enum(`standard`,`buyget`), `status` enum(`draft`,`active`,`inactive`,`expired`), `isAutomatic?`,`isTaxInclusive?`, FK → `campaigns?`/`organizations?`, windows, `usageLimit?`,`usageCount`,`customerUsageLimit?`.
- `applicationMethods`: `type` enum(`fixed`,`percentage`), `targetType` enum(`items`,`shipping`,`order`), `allocation?` enum(`each`,`across`), `value`, buy-get fields, `vendorPaysDelivery?`.
- `promotionRules` + `promotionRuleValues`: eligibility attribute/operator/values.
- `promotionUsages`: FK → `promotions`,`orders`, `customerUserId`, `discountAmount` (FR-044).

### referralCodes / referrals
- `referralCodes`: `id`, `userId`, `code`, `rewardAmount`,`rewardCurrency`, `totalReferrals`,`maxReferrals?`, `isActive`, FK → `campaigns?`.
- `referrals`: `referrerUserId`,`refereeUserId`, FK → `referralCodes`, `status` enum(`pending`,`qualified`,`rewarded`,`rejected`), `qualifyingOrderId?`, reward fields (FR-046).

---

## Domain: Subscriptions (`subscriptions` module)

### subscriptionPlans / subscriptionPlanItems / subscriptionPlanSlots
- `subscriptionPlans`: FK → `organizations`, `name`,`slug`,`description?`,`coverR2Key?`, `cadence` enum(`weekly`,`biweekly`,`monthly`), `totalCycles`, `bundlePricePerCycle`, `markupPerCycle?`, `autoRenew?`, `isActive`.
- `subscriptionPlanItems`: FK → `subscriptionPlans`,`productVariants`, `quantity`, `isSwappable`.
- `subscriptionPlanSlots`: FK → `subscriptionPlans`, day-of-week/month, window hours, `capacity?`, `isActive`, `label?` (FR-047).

### subscriptions / subscriptionCycles
- `subscriptions`: FK → `subscriptionPlans`,`organizations`, `customerUserId`, FK → `customerAddresses`, `status` enum(`awaiting_payment`,`active`,`paused`,`canceled`,`completed`), **plan + slot snapshots** (so vendor edits don't affect live subs), prepaid economics (`totalCycles`,`cyclesRemaining`,`bundlePricePerCycle`,`itemsTotalPrepaid`,`deliveryFeePerCycle`,`deliveryTotalPrepaid`,`markupPerCycle?`,`grandTotalPrepaid`), `paymentId?`, scheduling (`nextRunAt`,`lastRunAt?`,`pausedUntil?`,`skipNextRun?`), cancellation/refund fields.
- `subscriptionCycles`: FK → `subscriptions`, `cycleNumber`, `scheduledFor`, FK → `orders?`, `status` enum(`scheduled`,`skipped`,`fulfilled`,`failed`), `failureReason?` (FR-048/FR-049).

---

## Domain: Platform & Operations (`platform-settings`, `admin`, `notifications` modules)

### platformSettings *(singleton, `key='platform'`)*
- Payment-method toggles + instructions (mobile money / COD / card / wallet)
- Service toggles (`serviceGroceryEnabled`,`serviceParcelsEnabled`)
- Referral settings; support contact info
- Fee policy (`markupEnabled`, `serviceFeeEnabled`+type/amount/cap, `smallOrderFeeEnabled`+threshold/amount)
- Operational timing: `unconfirmedOrderTimeoutMinutes` (default 60, FR-021), `riderOfferWindowSeconds` (default 60, FR-024), `riderLeadTimeMinutes` (default 15, FR-018), `cartTtlHours` (default 24, FR-011)
- Audit (`updatedAt`,`updatedBy`). Governs checkout options + fees (FR-050).

### timeOfDayRecommendations / categoryTimeBoosts
- Pre-computed hourly recommendations (`timeSlot`, `variantIds[]`, `scores[]`, labels) recomputed by cron; admin `categoryTimeBoosts` (boost multiplier per slot). (Search/recs parity.)

### Reporting (read models, `admin` module)
- No new tables; dashboards/reports (FR-052) are **read-only raw-SQL aggregations** over orders/payments/riders (see plan Complexity Tracking — the single sanctioned exception to RQB-only reads).

---

## Cross-cutting validation rules

- **Money**: all monetary fields integer UGX smallest unit; price breakdown components sum exactly to `total` (SC-002).
- **Identity**: no table accepts a caller-supplied actor id on writes; actor derived from session (Principle III, FR-005).
- **Idempotency**: `correlationId` unique per confirmation; mobile-money reference unique (SC-003, FR-040).
- **Scoping**: vendor-owned tables (`products`,`productVariants`,`orders`,`variantCollections`,`subscriptionPlans`,…) carry `organizationId` and every query filters by the actor's active org (SC-010).
- **Audit**: order/parcel state changes always append an event row (FR-020, SC-005).
