import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { organizations, users } from './identity';
import { productVariants, menuModifierOptions } from './catalog';

export const carts = pgTable('carts', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, {
    onDelete: 'cascade',
  }),
  sessionId: text('session_id'),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  currencyCode: text('currency_code').notNull().default('UGX'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const cartItems = pgTable('cart_items', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cartId: varchar('cart_id', { length: 36 })
    .notNull()
    .references(() => carts.id, { onDelete: 'cascade' }),
  variantId: varchar('variant_id', { length: 36 })
    .notNull()
    .references(() => productVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
});

export const cartItemModifiers = pgTable('cart_item_modifiers', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cartItemId: varchar('cart_item_id', { length: 36 })
    .notNull()
    .references(() => cartItems.id, { onDelete: 'cascade' }),
  modifierOptionId: varchar('modifier_option_id', { length: 36 })
    .notNull()
    .references(() => menuModifierOptions.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
});

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
