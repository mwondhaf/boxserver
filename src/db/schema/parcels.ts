import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { deliveryQuotes } from './zones';

export const parcelStatusEnum = pgEnum('parcel_status', [
  'draft',
  'pending',
  'picked_up',
  'in_transit',
  'delivered',
  'canceled',
  'failed',
]);

export const parcelSizeCategoryEnum = pgEnum('parcel_size_category', [
  'small',
  'medium',
  'large',
  'extra_large',
]);

export const parcelPaymentStatusEnum = pgEnum('parcel_payment_status', [
  'pending',
  'paid',
  'refunded',
]);

export const parcels = pgTable('parcels', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  displayId: integer('display_id').notNull(),
  senderUserId: varchar('sender_user_id', { length: 36 }).notNull(),

  // Pickup
  pickupName: text('pickup_name').notNull(),
  pickupPhone: text('pickup_phone').notNull(),
  pickupAddress: text('pickup_address').notNull(),
  pickupLat: numeric('pickup_lat', { precision: 10, scale: 7 }),
  pickupLng: numeric('pickup_lng', { precision: 10, scale: 7 }),
  pickupGeohash: text('pickup_geohash'),
  pickupNotes: text('pickup_notes'),

  // Dropoff
  dropoffName: text('dropoff_name').notNull(),
  dropoffPhone: text('dropoff_phone').notNull(),
  dropoffAddress: text('dropoff_address').notNull(),
  dropoffLat: numeric('dropoff_lat', { precision: 10, scale: 7 }),
  dropoffLng: numeric('dropoff_lng', { precision: 10, scale: 7 }),
  dropoffGeohash: text('dropoff_geohash'),
  dropoffNotes: text('dropoff_notes'),

  // Package
  description: text('description').notNull(),
  weightKg: numeric('weight_kg', { precision: 6, scale: 2 }),
  sizeCategory: parcelSizeCategoryEnum('size_category').notNull(),
  fragile: boolean('fragile').notNull().default(false),
  valueAmount: integer('value_amount'),
  valueCurrency: text('value_currency').default('UGX'),

  status: parcelStatusEnum('status').notNull().default('draft'),

  // Rider
  riderId: varchar('rider_id', { length: 36 }),
  riderName: text('rider_name'),
  riderPhone: text('rider_phone'),
  offeredToRiderId: varchar('offered_to_rider_id', { length: 36 }),
  offeredAt: timestamp('offered_at', { withTimezone: true }),

  // Pricing
  quoteId: varchar('quote_id', { length: 36 }).references(
    () => deliveryQuotes.id,
  ),
  priceAmount: integer('price_amount'),
  packageFeeAmount: integer('package_fee_amount'),
  deliveryFeeAmount: integer('delivery_fee_amount'),
  commissionRuleId: text('commission_rule_id'),
  riderDeliveryFee: integer('rider_delivery_fee'),
  paymentStatus: parcelPaymentStatusEnum('payment_status')
    .notNull()
    .default('pending'),
  paymentMethod: text('payment_method'),

  // Codes
  pickupCode: text('pickup_code'),
  deliveryCode: text('delivery_code'),
  proofOfDeliveryR2Key: text('proof_of_delivery_r2_key'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const parcelEvents = pgTable('parcel_events', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  parcelId: varchar('parcel_id', { length: 36 })
    .notNull()
    .references(() => parcels.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  status: parcelStatusEnum('status'),
  description: text('description'),
  actorUserId: varchar('actor_user_id', { length: 36 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const parcelPricingRules = pgTable('parcel_pricing_rules', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sizeCategory: parcelSizeCategoryEnum('size_category').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  packageFee: integer('package_fee').notNull(),
  fragileMultiplier: numeric('fragile_multiplier', { precision: 4, scale: 2 })
    .notNull()
    .default('1.00'),
  insuranceRatePercent: numeric('insurance_rate_percent', {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default('0.00'),
  insuranceMinFee: integer('insurance_min_fee').notNull().default(0),
  maxWeightKg: numeric('max_weight_kg', { precision: 6, scale: 2 }),
  status: text('status').notNull().default('active'),
});

export type Parcel = typeof parcels.$inferSelect;
export type NewParcel = typeof parcels.$inferInsert;
export type ParcelEvent = typeof parcelEvents.$inferSelect;
export type ParcelPricingRule = typeof parcelPricingRules.$inferSelect;
