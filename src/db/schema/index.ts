// Schema registry — domain schema files are exported here (not a barrel re-export of business logic).
// Each domain adds its tables to this file so drizzle-kit and the RQB can find them.
export * from './counters';
export * from './identity';
export * from './categories';
export * from './catalog';
export * from './cart';
export * from './orders';
export * from './riders';
export * from './zones';
export * from './financial';
export * from './payments';
export * from './parcels';
export * from './promotions';
export * from './referrals';
export * from './subscriptions';
export * from './recommendations';
export * from './platform-settings';
export * from './notifications';
