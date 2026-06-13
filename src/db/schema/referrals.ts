import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './identity';
import { campaigns } from './promotions';

export const referralStatusEnum = pgEnum('referral_status', [
  'pending',
  'qualified',
  'rewarded',
  'rejected',
]);

export const referralCodes = pgTable('referral_codes', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  rewardAmount: integer('reward_amount').notNull(),
  rewardCurrency: text('reward_currency').notNull().default('UGX'),
  totalReferrals: integer('total_referrals').notNull().default(0),
  maxReferrals: integer('max_referrals'),
  isActive: boolean('is_active').notNull().default(true),
  campaignId: varchar('campaign_id', { length: 36 }).references(
    () => campaigns.id,
  ),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const referrals = pgTable('referrals', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  referrerUserId: varchar('referrer_user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  refereeUserId: varchar('referee_user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  referralCodeId: varchar('referral_code_id', { length: 36 })
    .notNull()
    .references(() => referralCodes.id),
  status: referralStatusEnum('status').notNull().default('pending'),
  qualifyingOrderId: varchar('qualifying_order_id', { length: 36 }),
  rewardAmount: integer('reward_amount'),
  rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
