import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { orders } from './orders';

export const walletEntityTypeEnum = pgEnum('wallet_entity_type', [
  'vendor',
  'rider',
  'customer',
  'platform',
]);

export const boxWalletStatusEnum = pgEnum('box_wallet_status', [
  'processed',
  'quarantined',
  'already_synced',
]);

export const boxWalletMappings = pgTable('box_wallet_mappings', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  entityType: walletEntityTypeEnum('entity_type').notNull(),
  organizationId: varchar('organization_id', { length: 36 }),
  riderId: varchar('rider_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }),
  boxWalletId: text('box_wallet_id').notNull(),
  entityName: text('entity_name').notNull(),
  autoCreated: text('auto_created').default('false'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const boxWalletOrderConfirmations = pgTable(
  'box_wallet_order_confirmations',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: varchar('order_id', { length: 36 })
      .notNull()
      .references(() => orders.id),
    boxWalletOrderId: text('box_wallet_order_id').notNull(),
    boxWalletStatus: boxWalletStatusEnum('box_wallet_status').notNull(),
    correlationId: text('correlation_id').notNull().unique(),
    vendorAmount: integer('vendor_amount'),
    riderAmount: integer('rider_amount'),
    platformAmount: integer('platform_amount'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const boxWalletParcelConfirmations = pgTable(
  'box_wallet_parcel_confirmations',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    parcelId: varchar('parcel_id', { length: 36 }).notNull(),
    boxWalletOrderId: text('box_wallet_order_id').notNull(),
    boxWalletStatus: boxWalletStatusEnum('box_wallet_status').notNull(),
    correlationId: text('correlation_id').notNull().unique(),
    packageFee: integer('package_fee'),
    deliveryFee: integer('delivery_fee'),
    totalFare: integer('total_fare'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const boxWalletAutoCreateLog = pgTable('box_wallet_auto_create_log', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  event: text('event').notNull(),
  entityType: walletEntityTypeEnum('entity_type').notNull(),
  organizationId: varchar('organization_id', { length: 36 }),
  riderId: varchar('rider_id', { length: 36 }),
  userId: varchar('user_id', { length: 36 }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BoxWalletMapping = typeof boxWalletMappings.$inferSelect;
export type BoxWalletOrderConfirmation =
  typeof boxWalletOrderConfirmations.$inferSelect;
