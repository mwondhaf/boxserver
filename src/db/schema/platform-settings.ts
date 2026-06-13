import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const platformSettings = pgTable('platform_settings', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull().unique().default('platform'),

  // Payment method toggles
  mobileMoneyCodEnabled: boolean('mobile_money_cod_enabled')
    .notNull()
    .default(true),
  cardEnabled: boolean('card_enabled').notNull().default(false),
  walletEnabled: boolean('wallet_enabled').notNull().default(false),
  cashOnDeliveryEnabled: boolean('cash_on_delivery_enabled')
    .notNull()
    .default(true),
  mobileMoneyInstructions: text('mobile_money_instructions'),

  // Service toggles
  serviceGroceryEnabled: boolean('service_grocery_enabled')
    .notNull()
    .default(true),
  serviceParcelsEnabled: boolean('service_parcels_enabled')
    .notNull()
    .default(true),

  // Referral settings
  referralEnabled: boolean('referral_enabled').notNull().default(false),
  referralRewardAmount: integer('referral_reward_amount').notNull().default(0),

  // Support
  supportPhone: text('support_phone'),
  supportEmail: text('support_email'),

  // Fee policy
  markupEnabled: boolean('markup_enabled').notNull().default(false),
  serviceFeeEnabled: boolean('service_fee_enabled').notNull().default(false),
  serviceFeeType: text('service_fee_type').default('percentage'),
  serviceFeeAmount: integer('service_fee_amount').notNull().default(0),
  serviceFeeCap: integer('service_fee_cap'),
  smallOrderFeeEnabled: boolean('small_order_fee_enabled')
    .notNull()
    .default(false),
  smallOrderFeeThreshold: integer('small_order_fee_threshold')
    .notNull()
    .default(0),
  smallOrderFeeAmount: integer('small_order_fee_amount').notNull().default(0),

  // Operational timing
  unconfirmedOrderTimeoutMinutes: integer('unconfirmed_order_timeout_minutes')
    .notNull()
    .default(60),
  riderOfferWindowSeconds: integer('rider_offer_window_seconds')
    .notNull()
    .default(60),
  riderLeadTimeMinutes: integer('rider_lead_time_minutes')
    .notNull()
    .default(15),
  cartTtlHours: integer('cart_ttl_hours').notNull().default(24),

  // Extra jsonb for flexibility
  extra: jsonb('extra'),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$onUpdateFn(() => new Date()),
  updatedBy: varchar('updated_by', { length: 36 }),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type NewPlatformSettings = typeof platformSettings.$inferInsert;
