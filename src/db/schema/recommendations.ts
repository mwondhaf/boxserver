import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { categories } from './categories';

export const timeOfDayRecommendations = pgTable(
  'time_of_day_recommendations',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    timeSlot: integer('time_slot').notNull(),
    variantIds: text('variant_ids').array().notNull().default([]),
    scores: numeric('scores', { precision: 10, scale: 4 })
      .array()
      .notNull()
      .default([]),
    label: text('label'),
    recomputedAt: timestamp('recomputed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('uq_time_of_day_recommendations_time_slot').on(t.timeSlot)],
);

export const categoryTimeBoosts = pgTable('category_time_boosts', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  categoryId: varchar('category_id', { length: 36 })
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  timeSlot: integer('time_slot').notNull(),
  boostMultiplier: numeric('boost_multiplier', { precision: 4, scale: 2 })
    .notNull()
    .default('1.00'),
});

export type TimeOfDayRecommendation =
  typeof timeOfDayRecommendations.$inferSelect;
export type CategoryTimeBoost = typeof categoryTimeBoosts.$inferSelect;
