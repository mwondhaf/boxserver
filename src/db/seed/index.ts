import 'dotenv/config';
import { createDb } from '../client';
import { seedPlatformSettings } from './platform-settings.seed';
import { seedIdentity } from './identity.seed';
import { seedCatalog } from './catalog.seed';
import { seedOrders, seedVendorOrdersByEmail } from './orders.seed';
import { seedZones } from './zones.seed';
import { seedRiders } from './riders.seed';
import { seedPromotions } from './promotions.seed';

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const db = createDb(databaseUrl);

  console.log('Seeding platform settings...');
  await seedPlatformSettings(db);

  console.log('Seeding identity (categories)...');
  await seedIdentity(db);

  console.log('Seeding catalog (vendors + products)...');
  await seedCatalog(db);

  console.log('Seeding demo orders...');
  await seedOrders(db);

  console.log('Seeding demo orders for signed-up vendor (vend@mail.com)...');
  await seedVendorOrdersByEmail(db, 'vend@mail.com');

  console.log('Seeding delivery zones + pricing rules...');
  await seedZones(db);

  console.log('Seeding promotions...');
  await seedPromotions(db);

  console.log(
    'Seeding demo rider (requires user sign-up first — skipped if no users)...',
  );
  await seedRiders(db);

  console.log('\nSeed complete.');
  console.log('\nDemo data created:');
  console.log(
    '  Vendors: Spice Garden Restaurant (food), Fresh Mart (grocery)',
  );
  console.log('  Zones: Kampala Central, Kampala Suburbs, Entebbe');
  console.log(
    '  Promos: WELCOME20 (20% off), SAVE2000 (UGX 2k off), FREESHIP (free delivery)',
  );
  console.log('\nNext steps:');
  console.log('  1. Sign up an admin user via POST /api/auth/sign-up/email');
  console.log('     then update their platform_role to "admin" in the DB');
  console.log('  2. Sign up a rider user and apply via POST /api/riders/apply');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
