import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './identity';
import { deliveryZones } from './zones';

export const riderAccountStatusEnum = pgEnum('rider_account_status', [
  'pending',
  'active',
  'suspended',
  'inactive',
]);

export const vehicleTypeEnum = pgEnum('vehicle_type', [
  'walking',
  'bicycle',
  'scooter',
  'motorbike',
  'car',
  'van',
  'truck',
]);

export const riderLocationStatusEnum = pgEnum('rider_location_status', [
  'offline',
  'online',
  'busy',
]);

export const employmentTypeEnum = pgEnum('employment_type', [
  'freelance',
  'inhouse',
]);

export const riders = pgTable(
  'riders',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    riderCode: text('rider_code').notNull().unique(),
    name: text('name').notNull(),
    accountStatus: riderAccountStatusEnum('account_status')
      .notNull()
      .default('pending'),
    phoneNumber: text('phone_number').notNull(),
    email: text('email'),

    // Next-of-kin
    nextOfKinName: text('next_of_kin_name'),
    nextOfKinPhone: text('next_of_kin_phone'),
    nextOfKinRelation: text('next_of_kin_relation'),

    // Compliance
    nationalId: text('national_id'),
    drivingPermitNumber: text('driving_permit_number'),
    drivingPermitExpiry: timestamp('driving_permit_expiry', {
      withTimezone: true,
    }),
    tin: text('tin'),
    helmetVerified: boolean('helmet_verified').notNull().default(false),
    insuranceProvider: text('insurance_provider'),
    insurancePolicyNumber: text('insurance_policy_number'),
    insuranceExpiry: timestamp('insurance_expiry', { withTimezone: true }),

    // Vehicle
    vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
    vehiclePlate: text('vehicle_plate'),
    vehicleMake: text('vehicle_make'),
    vehicleModel: text('vehicle_model'),
    vehicleColor: text('vehicle_color'),
    vehicleYear: integer('vehicle_year'),

    // Location (home/base)
    homeLat: numeric('home_lat', { precision: 10, scale: 7 }),
    homeLng: numeric('home_lng', { precision: 10, scale: 7 }),

    // Media
    photoR2Key: text('photo_r2_key'),
    nationalIdR2Key: text('national_id_r2_key'),
    drivingPermitR2Key: text('driving_permit_r2_key'),
    insuranceR2Key: text('insurance_r2_key'),

    // Payout
    payoutMethod: text('payout_method'),
    payoutMobileNumber: text('payout_mobile_number'),
    payoutBankName: text('payout_bank_name'),
    payoutBankAccount: text('payout_bank_account'),

    // Employment
    employmentType: employmentTypeEnum('employment_type'),

    // Metrics
    ratingSum: integer('rating_sum').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    completedDeliveries: integer('completed_deliveries').notNull().default(0),
    canceledDeliveries: integer('canceled_deliveries').notNull().default(0),
    totalEarnings: integer('total_earnings').notNull().default(0),

    // Stage
    currentStageId: varchar('current_stage_id', { length: 36 }),

    // Approval audit
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: varchar('approved_by', { length: 36 }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedBy: varchar('suspended_by', { length: 36 }),
    suspensionReason: text('suspension_reason'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('riders_user_id_idx').on(t.userId)],
);

export const riderLocations = pgTable('rider_locations', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
  geohash: text('geohash'),
  status: riderLocationStatusEnum('status').notNull().default('offline'),
  lastUpdatedAt: timestamp('last_updated_at', {
    withTimezone: true,
  }).notNull(),
  activeOrderId: varchar('active_order_id', { length: 36 }),
  activeParcelId: varchar('active_parcel_id', { length: 36 }),
});

export const stages = pgTable('stages', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  address: text('address').notNull(),
  district: text('district'),
  lat: numeric('lat', { precision: 10, scale: 7 }),
  lng: numeric('lng', { precision: 10, scale: 7 }),
  geohash: text('geohash'),
  zoneId: varchar('zone_id', { length: 36 }).references(
    () => deliveryZones.id,
  ),
  capacity: integer('capacity'),
  isActive: boolean('is_active').notNull().default(true),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
});

export const riderStageMemberships = pgTable('rider_stage_memberships', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  riderId: varchar('rider_id', { length: 36 })
    .notNull()
    .references(() => riders.id, { onDelete: 'cascade' }),
  stageId: varchar('stage_id', { length: 36 })
    .notNull()
    .references(() => stages.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').notNull().default(true),
  isPrimary: boolean('is_primary').notNull().default(false),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp('left_at', { withTimezone: true }),
  assignedBy: varchar('assigned_by', { length: 36 }),
});

export const riderRatings = pgTable('rider_ratings', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  riderId: varchar('rider_id', { length: 36 })
    .notNull()
    .references(() => riders.id, { onDelete: 'cascade' }),
  orderId: varchar('order_id', { length: 36 }),
  parcelId: varchar('parcel_id', { length: 36 }),
  customerUserId: varchar('customer_user_id', { length: 36 }).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const riderIncidents = pgTable('rider_incidents', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  deliveryKind: text('delivery_kind').notNull(),
  deliveryId: varchar('delivery_id', { length: 36 }).notNull(),
  riderUserId: varchar('rider_user_id', { length: 36 }).notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  photoR2Keys: text('photo_r2_keys').array(),
  status: text('status').notNull().default('open'),
  resolutionNote: text('resolution_note'),
  autoCanceledDelivery: boolean('auto_canceled_delivery').default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const riderPayouts = pgTable('rider_payouts', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  riderId: varchar('rider_id', { length: 36 })
    .notNull()
    .references(() => riders.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('UGX'),
  payoutMethod: text('payout_method').notNull(),
  payoutDetails: text('payout_details'),
  status: text('status').notNull().default('pending'),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  deliveryCount: integer('delivery_count').notNull().default(0),
  transactionRef: text('transaction_ref'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Rider = typeof riders.$inferSelect;
export type NewRider = typeof riders.$inferInsert;
export type RiderLocation = typeof riderLocations.$inferSelect;
export type Stage = typeof stages.$inferSelect;
