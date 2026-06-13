import { integer, pgTable, text, varchar } from 'drizzle-orm/pg-core';

export const counters = pgTable('counters', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  value: integer('value').notNull().default(0),
});

export type Counter = typeof counters.$inferSelect;
export type NewCounter = typeof counters.$inferInsert;
