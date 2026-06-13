import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: varchar('parent_id', { length: 36 }),
  thumbnailR2Key: text('thumbnail_r2_key'),
  bannerR2Key: text('banner_r2_key'),
  isActive: boolean('is_active').notNull().default(true),
});

export const categoryPricingRules = pgTable('category_pricing_rules', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  categoryId: varchar('category_id', { length: 36 })
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  markupPercentage: integer('markup_percentage').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  note: text('note'),
});

export const brands = pgTable(
  'brands',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    logoR2Key: text('logo_r2_key'),
  },
  (t) => [index('brands_slug_idx').on(t.slug)],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
