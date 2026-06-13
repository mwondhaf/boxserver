import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const platformRoleEnum = pgEnum('platform_role', [
  'customer',
  'rider',
  'admin',
]);

export const payoutMethodEnum = pgEnum('payout_method', [
  'mobile_money',
  'bank',
]);

export const vendorTypeEnum = pgEnum('vendor_type', ['grocery', 'food']);

// Better Auth users table (extended with platform fields)
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  phone: text('phone'),
  platformRole: platformRoleEnum('platform_role').notNull().default('customer'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Better Auth sessions
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  activeOrganizationId: varchar('active_organization_id', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Better Auth accounts
export const accounts = pgTable('accounts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Better Auth verification table
export const verifications = pgTable('verifications', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Organization vendor categories (hierarchical)
export const organizationCategories = pgTable('organization_categories', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  parentId: varchar('parent_id', { length: 36 }),
});

// Better Auth organizations (vendors)
export const organizations = pgTable(
  'organizations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique(),
    logo: text('logo'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb('metadata'),

    // Business extension
    type: vendorTypeEnum('type').notNull().default('grocery'),
    coverPhoto: text('cover_photo'),
    email: text('email'),
    phone: text('phone'),
    tin: text('tin'),
    contactPerson: text('contact_person'),
    contactPhone: text('contact_phone'),

    // Payout
    payoutMethod: payoutMethodEnum('payout_method'),
    payoutMobileNumber: text('payout_mobile_number'),
    payoutBankName: text('payout_bank_name'),
    payoutBankAccount: text('payout_bank_account'),
    payoutBankBranch: text('payout_bank_branch'),

    // Location
    country: text('country').default('UG'),
    cityOrDistrict: text('city_or_district'),
    town: text('town'),
    street: text('street'),
    lat: numeric('lat', { precision: 10, scale: 7 }),
    lng: numeric('lng', { precision: 10, scale: 7 }),
    geohash: text('geohash'),
    googlePlacesId: text('google_places_id'),

    // Operations
    businessHours: jsonb('business_hours'),
    timezone: text('timezone').default('Africa/Kampala'),
    isBusy: boolean('is_busy').notNull().default(false),
    isActive: boolean('is_active').notNull().default(false),
    platformDeliveryEnabled: boolean('platform_delivery_enabled')
      .notNull()
      .default(true),
    selfDeliveryEnabled: boolean('self_delivery_enabled')
      .notNull()
      .default(false),
    selfPickupEnabled: boolean('self_pickup_enabled').notNull().default(false),
    selfDeliveryFee: numeric('self_delivery_fee', { precision: 15, scale: 0 }),
    selfDeliveryRadius: numeric('self_delivery_radius', {
      precision: 10,
      scale: 2,
    }),
    selfDeliveryEstimate: text('self_delivery_estimate'),
    pickupInstructions: text('pickup_instructions'),
    estimatedPrepTime: text('estimated_prep_time'),
    minimumOrderAmount: numeric('minimum_order_amount', {
      precision: 15,
      scale: 0,
    }),
    commissionRuleId: text('commission_rule_id'),
    categoryId: varchar('category_id', { length: 36 }),
  },
  (t) => [index('organizations_geohash_idx').on(t.geohash)],
);

// Better Auth members
export const members = pgTable('members', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Better Auth invitations
export const invitations = pgTable('invitations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  inviterId: varchar('inviter_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Repeat customer index per vendor
export const organizationCustomers = pgTable('organization_customers', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const customerAddresses = pgTable('customer_addresses', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  city: text('city'),
  town: text('town'),
  street: text('street'),
  addressType: text('address_type'),
  buildingName: text('building_name'),
  apartmentNo: text('apartment_no'),
  lat: numeric('lat', { precision: 10, scale: 7 }),
  lng: numeric('lng', { precision: 10, scale: 7 }),
  geohash: text('geohash'),
  directions: text('directions'),
  isDefault: boolean('is_default').notNull().default(false),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Member = typeof members.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
