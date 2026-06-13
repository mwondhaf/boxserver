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
import { organizations } from './identity';
import { orders } from './orders';

export const promotionTypeEnum = pgEnum('promotion_type', [
  'standard',
  'buyget',
]);

export const promotionStatusEnum = pgEnum('promotion_status', [
  'draft',
  'active',
  'inactive',
  'expired',
]);

export const campaignBudgetTypeEnum = pgEnum('campaign_budget_type', [
  'spend',
  'usage',
]);

export const campaigns = pgTable('campaigns', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  campaignIdentifier: text('campaign_identifier'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  organizationId: varchar('organization_id', { length: 36 }).references(
    () => organizations.id,
  ),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const campaignBudgets = pgTable('campaign_budgets', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  campaignId: varchar('campaign_id', { length: 36 })
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  type: campaignBudgetTypeEnum('type').notNull(),
  currencyCode: text('currency_code').notNull().default('UGX'),
  limitAmount: integer('limit_amount'),
  usedAmount: integer('used_amount').notNull().default(0),
});

export const campaignBudgetUsages = pgTable('campaign_budget_usages', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  budgetId: varchar('budget_id', { length: 36 })
    .notNull()
    .references(() => campaignBudgets.id, { onDelete: 'cascade' }),
  orderId: varchar('order_id', { length: 36 }).references(() => orders.id),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const promotions = pgTable('promotions', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  type: promotionTypeEnum('type').notNull().default('standard'),
  status: promotionStatusEnum('status').notNull().default('draft'),
  isAutomatic: boolean('is_automatic').default(false),
  isTaxInclusive: boolean('is_tax_inclusive').default(false),
  campaignId: varchar('campaign_id', { length: 36 }).references(
    () => campaigns.id,
  ),
  organizationId: varchar('organization_id', { length: 36 }).references(
    () => organizations.id,
  ),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').notNull().default(0),
  customerUsageLimit: integer('customer_usage_limit'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const applicationMethods = pgTable('application_methods', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  promotionId: varchar('promotion_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => promotions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  targetType: text('target_type').notNull(),
  allocation: text('allocation'),
  value: integer('value').notNull(),
  buyQuantity: integer('buy_quantity'),
  getQuantity: integer('get_quantity'),
  getDiscountType: text('get_discount_type'),
  getDiscountValue: integer('get_discount_value'),
  vendorPaysDelivery: boolean('vendor_pays_delivery').default(false),
});

export const promotionRules = pgTable('promotion_rules', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  promotionId: varchar('promotion_id', { length: 36 })
    .notNull()
    .references(() => promotions.id, { onDelete: 'cascade' }),
  attribute: text('attribute').notNull(),
  operator: text('operator').notNull(),
});

export const promotionRuleValues = pgTable('promotion_rule_values', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ruleId: varchar('rule_id', { length: 36 })
    .notNull()
    .references(() => promotionRules.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
});

export const promotionUsages = pgTable('promotion_usages', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  promotionId: varchar('promotion_id', { length: 36 })
    .notNull()
    .references(() => promotions.id),
  orderId: varchar('order_id', { length: 36 }).references(() => orders.id),
  customerUserId: varchar('customer_user_id', { length: 36 }).notNull(),
  discountAmount: integer('discount_amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Promotion = typeof promotions.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
