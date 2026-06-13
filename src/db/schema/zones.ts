import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { orders } from './orders';

export const pricingRuleStatusEnum = pgEnum('pricing_rule_status', [
  'active',
  'inactive',
]);

export const distanceSourceEnum = pgEnum('distance_source', [
  'google',
  'mapbox',
  'haversine',
]);

export const deliveryZones = pgTable(
  'delivery_zones',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    city: text('city').notNull(),
    country: text('country').notNull().default('UG'),
    centerLat: numeric('center_lat', { precision: 10, scale: 7 }).notNull(),
    centerLng: numeric('center_lng', { precision: 10, scale: 7 }).notNull(),
    maxDistanceMeters: integer('max_distance_meters').notNull(),
    color: text('color'),
    active: boolean('active').notNull().default(true),
    suspendedReason: text('suspended_reason'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  },
  (t) => [index('delivery_zones_city_idx').on(t.city)],
);

export const pricingRules = pgTable('pricing_rules', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  zoneId: varchar('zone_id', { length: 36 }).references(
    () => deliveryZones.id,
    { onDelete: 'cascade' },
  ),
  name: text('name').notNull(),
  baseFee: integer('base_fee').notNull(),
  ratePerKm: integer('rate_per_km').notNull(),
  minFee: integer('min_fee').notNull(),
  surgeMultiplier: numeric('surge_multiplier', {
    precision: 4,
    scale: 2,
  })
    .notNull()
    .default('1.00'),
  daysOfWeek: text('days_of_week').array(),
  startHour: integer('start_hour'),
  endHour: integer('end_hour'),
  status: pricingRuleStatusEnum('status').notNull().default('active'),
});

export const zoneCommissionMappings = pgTable('zone_commission_mappings', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  zoneId: varchar('zone_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => deliveryZones.id, { onDelete: 'cascade' }),
  boxWalletCommissionRuleId: text('box_wallet_commission_rule_id').notNull(),
  ruleName: text('rule_name'),
});

export const deliveryQuotes = pgTable('delivery_quotes', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  pickupLat: numeric('pickup_lat', { precision: 10, scale: 7 }),
  pickupLng: numeric('pickup_lng', { precision: 10, scale: 7 }),
  dropoffLat: numeric('dropoff_lat', { precision: 10, scale: 7 }),
  dropoffLng: numeric('dropoff_lng', { precision: 10, scale: 7 }),
  distanceMeters: integer('distance_meters').notNull(),
  distanceSource: distanceSourceEnum('distance_source').notNull(),
  estimatedDurationSeconds: integer('estimated_duration_seconds'),

  // Fee breakdown
  baseFee: integer('base_fee').notNull(),
  ratePerKm: integer('rate_per_km').notNull(),
  distanceFee: integer('distance_fee').notNull(),
  surgeMultiplier: numeric('surge_multiplier', { precision: 4, scale: 2 })
    .notNull()
    .default('1.00'),
  minFee: integer('min_fee').notNull(),
  deliveryFee: integer('delivery_fee').notNull(),

  zoneId: varchar('zone_id', { length: 36 }),
  ruleId: varchar('rule_id', { length: 36 }),

  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),

  // Parcel-specific
  sizeCategory: text('size_category'),
  packageFee: integer('package_fee'),
  fragileFee: integer('fragile_fee'),
  insuranceFee: integer('insurance_fee'),
  totalPackageFee: integer('total_package_fee'),
  totalFare: integer('total_fare'),
  commissionRuleId: text('commission_rule_id'),

  orderId: varchar('order_id', { length: 36 }).references(() => orders.id),
  parcelId: varchar('parcel_id', { length: 36 }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type PricingRule = typeof pricingRules.$inferSelect;
export type DeliveryQuote = typeof deliveryQuotes.$inferSelect;
export type NewDeliveryQuote = typeof deliveryQuotes.$inferInsert;
