import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations, users, customerAddresses } from './identity';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
]);

export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'not_fulfilled',
  'fulfilled',
  'shipped',
  'returned',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'awaiting',
  'captured',
  'refunded',
  'canceled',
]);

export const fulfillmentTypeEnum = pgEnum('fulfillment_type', [
  'delivery',
  'pickup',
  'self_delivery',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash_on_delivery',
  'mobile_money',
  'card',
  'wallet',
]);

export const actorRoleEnum = pgEnum('actor_role', [
  'customer',
  'vendor',
  'rider',
  'admin',
  'system',
]);

export const itemStatusEnum = pgEnum('item_status', [
  'available',
  'unavailable',
  'swap_proposed',
  'swap_accepted',
  'swap_rejected',
  'refunded',
]);

export const orders = pgTable(
  'orders',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    displayId: integer('display_id').notNull(),
    organizationId: varchar('organization_id', { length: 36 })
      .notNull()
      .references(() => organizations.id),
    status: orderStatusEnum('status').notNull().default('pending'),
    fulfillmentStatus: fulfillmentStatusEnum('fulfillment_status')
      .notNull()
      .default('not_fulfilled'),
    paymentStatus: paymentStatusEnum('payment_status')
      .notNull()
      .default('awaiting'),
    fulfillmentType: fulfillmentTypeEnum('fulfillment_type').notNull(),
    paymentMethod: paymentMethodEnum('payment_method'),

    // Customer
    userId: varchar('user_id', { length: 36 }).references(() => users.id),
    isGuest: boolean('is_guest').notNull().default(false),
    guestName: text('guest_name'),
    guestPhone: text('guest_phone'),
    guestSessionId: text('guest_session_id'),
    guestSource: text('guest_source'),
    deliveryLat: numeric('delivery_lat', { precision: 10, scale: 7 }),
    deliveryLng: numeric('delivery_lng', { precision: 10, scale: 7 }),
    deliveryPhone: text('delivery_phone'),
    deliveryDescription: text('delivery_description'),
    customerAddressId: varchar('customer_address_id', {
      length: 36,
    }).references(() => customerAddresses.id),

    // Zone/quote refs
    deliveryZoneId: varchar('delivery_zone_id', { length: 36 }),
    deliveryQuoteId: varchar('delivery_quote_id', { length: 36 }),

    // Rider
    riderId: varchar('rider_id', { length: 36 }),
    riderName: text('rider_name'),
    riderPhone: text('rider_phone'),
    offeredToRiderId: varchar('offered_to_rider_id', { length: 36 }),
    offeredAt: timestamp('offered_at', { withTimezone: true }),

    // Totals (integer UGX)
    subtotal: integer('subtotal'),
    total: integer('total').notNull().default(0),
    taxTotal: integer('tax_total').notNull().default(0),
    discountTotal: integer('discount_total').notNull().default(0),
    deliveryTotal: integer('delivery_total').notNull().default(0),
    serviceFeeTotal: integer('service_fee_total'),
    smallOrderFeeTotal: integer('small_order_fee_total'),
    deliverySubsidyTotal: integer('delivery_subsidy_total'),
    markupTotal: integer('markup_total'),
    riderDeliveryFee: integer('rider_delivery_fee'),
    currencyCode: text('currency_code').notNull().default('UGX'),

    // Financial
    commissionRuleId: text('commission_rule_id'),
    refundPending: boolean('refund_pending').notNull().default(false),
    refundIdempotencyKey: text('refund_idempotency_key'),

    // Food prep
    prepStartedAt: timestamp('prep_started_at', { withTimezone: true }),

    // Codes
    vendorPickupCode: text('vendor_pickup_code'),
    proofOfDeliveryR2Key: text('proof_of_delivery_r2_key'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('orders_org_idx').on(t.organizationId),
    index('orders_user_idx').on(t.userId),
    index('orders_status_idx').on(t.status),
  ],
);

export const orderItems = pgTable('order_items', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: varchar('order_id', { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 36 }).notNull(),
  variantId: varchar('variant_id', { length: 36 }).notNull(),
  title: text('title').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  vendorUnitPrice: integer('vendor_unit_price'),
  markupAmount: integer('markup_amount'),
  subtotal: integer('subtotal').notNull(),
  taxTotal: integer('tax_total').notNull().default(0),
  itemStatus: itemStatusEnum('item_status'),
  proposedVariantId: varchar('proposed_variant_id', { length: 36 }),
  proposedPrice: integer('proposed_price'),
  proposedTitle: text('proposed_title'),
  proposedImageR2Key: text('proposed_image_r2_key'),
  swapDeadlineAt: timestamp('swap_deadline_at', { withTimezone: true }),
  swapReportedBy: varchar('swap_reported_by', { length: 36 }),
});

export const orderItemModifiers = pgTable('order_item_modifiers', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderItemId: varchar('order_item_id', { length: 36 })
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priceAdd: integer('price_add').notNull().default(0),
  quantity: integer('quantity').notNull().default(1),
});

export const orderEvents = pgTable('order_events', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: varchar('order_id', { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  actorUserId: varchar('actor_user_id', { length: 36 }),
  eventType: text('event_type').notNull(),
  fromStatus: orderStatusEnum('from_status'),
  toStatus: orderStatusEnum('to_status'),
  reason: text('reason'),
  actorName: text('actor_name'),
  actorRole: actorRoleEnum('actor_role'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderItemEvents = pgTable('order_item_events', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: varchar('order_id', { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  orderItemId: varchar('order_item_id', { length: 36 }).references(
    () => orderItems.id,
  ),
  eventType: text('event_type').notNull(),
  actorUserId: varchar('actor_user_id', { length: 36 }),
  actorRole: actorRoleEnum('actor_role'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
