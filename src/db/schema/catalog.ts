import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { categories, brands } from './categories';
import { organizations } from './identity';

export const products = pgTable(
  'products',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    brandId: varchar('brand_id', { length: 36 }).references(() => brands.id, {
      onDelete: 'set null',
    }),
    categoryId: varchar('category_id', { length: 36 }).references(
      () => categories.id,
      { onDelete: 'set null' },
    ),
    organizationId: varchar('organization_id', { length: 36 }).references(
      () => organizations.id,
      { onDelete: 'set null' },
    ),
    isActive: boolean('is_active').notNull().default(true),
    isApproved: boolean('is_approved').notNull().default(false),
  },
  (t) => [
    index('products_org_idx').on(t.organizationId),
    index('products_category_idx').on(t.categoryId),
  ],
);

export const productImages = pgTable('product_images', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: varchar('product_id', { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  alt: text('alt'),
  isPrimary: boolean('is_primary').notNull().default(false),
});

export const productTags = pgTable('product_tags', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: varchar('product_id', { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
});

export const productCategories = pgTable('product_categories', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: varchar('product_id', { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  categoryId: varchar('category_id', { length: 36 })
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
});

export const productVariants = pgTable(
  'product_variants',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    productId: varchar('product_id', { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    organizationId: varchar('organization_id', { length: 36 })
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sku: text('sku'),
    unit: text('unit').notNull(),
    weightGrams: integer('weight_grams'),
    barcode: text('barcode'),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    isAvailable: boolean('is_available').notNull().default(true),
    isApproved: boolean('is_approved').notNull().default(false),
  },
  (t) => [index('product_variants_org_idx').on(t.organizationId)],
);

export const priceSets = pgTable('price_sets', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  variantId: varchar('variant_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => productVariants.id, { onDelete: 'cascade' }),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
});

export const moneyAmounts = pgTable('money_amounts', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  priceSetId: varchar('price_set_id', { length: 36 })
    .notNull()
    .references(() => priceSets.id, { onDelete: 'cascade' }),
  currency: text('currency').notNull().default('UGX'),
  amount: integer('amount').notNull(),
  saleAmount: integer('sale_amount'),
  minQuantity: integer('min_quantity'),
  maxQuantity: integer('max_quantity'),
});

export const menuModifierGroups = pgTable('menu_modifier_groups', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: varchar('product_id', { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  required: boolean('required').notNull().default(false),
  minSelections: integer('min_selections').notNull().default(0),
  maxSelections: integer('max_selections').notNull().default(1),
  sortOrder: integer('sort_order'),
});

export const menuModifierOptions = pgTable('menu_modifier_options', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  modifierGroupId: varchar('modifier_group_id', { length: 36 })
    .notNull()
    .references(() => menuModifierGroups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priceAdd: integer('price_add').notNull().default(0),
  isAvailable: boolean('is_available').notNull().default(true),
  sortOrder: integer('sort_order'),
});

export const variantCollections = pgTable('variant_collections', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order'),
});

export const variantCollectionItems = pgTable('variant_collection_items', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  collectionId: varchar('collection_id', { length: 36 })
    .notNull()
    .references(() => variantCollections.id, { onDelete: 'cascade' }),
  variantId: varchar('variant_id', { length: 36 })
    .notNull()
    .references(() => productVariants.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order'),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type MoneyAmount = typeof moneyAmounts.$inferSelect;
export type PriceSet = typeof priceSets.$inferSelect;
