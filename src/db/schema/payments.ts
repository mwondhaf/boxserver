import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { orders } from './orders';

export const momoDirectionEnum = pgEnum('momo_direction', [
  'inbound',
  'outbound',
]);

export const momoStatusEnum = pgEnum('momo_status', [
  'initiated',
  'pending',
  'success',
  'failed',
  'expired',
]);

export const mobileMoneyPayments = pgTable('mobile_money_payments', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boxWalletPaymentId: text('box_wallet_payment_id'),
  direction: momoDirectionEnum('direction').notNull(),
  status: momoStatusEnum('status').notNull().default('initiated'),
  phoneNumber: text('phone_number').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('UGX'),
  provider: text('provider'),
  customerReference: text('customer_reference').unique(),
  internalReference: text('internal_reference'),
  charge: integer('charge'),
  description: text('description'),
  failureReason: text('failure_reason'),
  orderId: varchar('order_id', { length: 36 }).references(() => orders.id),
  parcelId: varchar('parcel_id', { length: 36 }),
  customerUserId: varchar('customer_user_id', { length: 36 }),
  entityType: text('entity_type'),
  initiatedAt: timestamp('initiated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type MobileMoneyPayment = typeof mobileMoneyPayments.$inferSelect;
export type NewMobileMoneyPayment = typeof mobileMoneyPayments.$inferInsert;
