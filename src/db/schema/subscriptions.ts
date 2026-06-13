import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations, users, customerAddresses } from './identity';
import { productVariants } from './catalog';
import { orders } from './orders';

export const subscriptionCadenceEnum = pgEnum('subscription_cadence', [
  'weekly',
  'biweekly',
  'monthly',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'awaiting_payment',
  'active',
  'paused',
  'canceled',
  'completed',
]);

export const subscriptionCycleStatusEnum = pgEnum('subscription_cycle_status', [
  'scheduled',
  'skipped',
  'fulfilled',
  'failed',
]);

export const subscriptionPlans = pgTable('subscription_plans', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  coverR2Key: text('cover_r2_key'),
  cadence: subscriptionCadenceEnum('cadence').notNull(),
  totalCycles: integer('total_cycles').notNull(),
  bundlePricePerCycle: integer('bundle_price_per_cycle').notNull(),
  markupPerCycle: integer('markup_per_cycle'),
  autoRenew: boolean('auto_renew').default(false),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptionPlanItems = pgTable('subscription_plan_items', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  planId: varchar('plan_id', { length: 36 })
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: 'cascade' }),
  variantId: varchar('variant_id', { length: 36 })
    .notNull()
    .references(() => productVariants.id),
  quantity: integer('quantity').notNull().default(1),
  isSwappable: boolean('is_swappable').notNull().default(false),
});

export const subscriptionPlanSlots = pgTable('subscription_plan_slots', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  planId: varchar('plan_id', { length: 36 })
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week'),
  dayOfMonth: integer('day_of_month'),
  startHour: integer('start_hour'),
  endHour: integer('end_hour'),
  capacity: integer('capacity'),
  isActive: boolean('is_active').notNull().default(true),
  label: text('label'),
});

export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  planId: varchar('plan_id', { length: 36 })
    .notNull()
    .references(() => subscriptionPlans.id),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id),
  customerUserId: varchar('customer_user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  customerAddressId: varchar('customer_address_id', { length: 36 }).references(
    () => customerAddresses.id,
  ),
  status: subscriptionStatusEnum('status').notNull().default('awaiting_payment'),

  // Snapshots
  planName: text('plan_name').notNull(),
  slotSnapshot: text('slot_snapshot'),
  itemsSnapshot: text('items_snapshot'),

  // Prepaid economics
  totalCycles: integer('total_cycles').notNull(),
  cyclesRemaining: integer('cycles_remaining').notNull(),
  bundlePricePerCycle: integer('bundle_price_per_cycle').notNull(),
  itemsTotalPrepaid: integer('items_total_prepaid').notNull(),
  deliveryFeePerCycle: integer('delivery_fee_per_cycle').notNull().default(0),
  deliveryTotalPrepaid: integer('delivery_total_prepaid').notNull().default(0),
  markupPerCycle: integer('markup_per_cycle'),
  grandTotalPrepaid: integer('grand_total_prepaid').notNull(),

  paymentId: varchar('payment_id', { length: 36 }),

  // Scheduling
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  pausedUntil: timestamp('paused_until', { withTimezone: true }),
  skipNextRun: boolean('skip_next_run').default(false),

  // Cancellation
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
  refundAmount: integer('refund_amount'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptionCycles = pgTable('subscription_cycles', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  subscriptionId: varchar('subscription_id', { length: 36 })
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  cycleNumber: integer('cycle_number').notNull(),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  orderId: varchar('order_id', { length: 36 }).references(() => orders.id),
  status: subscriptionCycleStatusEnum('status').notNull().default('scheduled'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type SubscriptionCycle = typeof subscriptionCycles.$inferSelect;
