import { eq } from 'drizzle-orm';
import type { Db } from '../client';
import { platformSettings } from '../schema/platform-settings';

export async function seedPlatformSettings(db: Db): Promise<void> {
  const existing = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.key, 'platform'),
  });
  if (existing) return;

  await db.insert(platformSettings).values({
    key: 'platform',
    cashOnDeliveryEnabled: true,
    mobileMoneyCodEnabled: true,
    serviceGroceryEnabled: true,
    serviceParcelsEnabled: true,
    unconfirmedOrderTimeoutMinutes: 60,
    riderOfferWindowSeconds: 60,
    riderLeadTimeMinutes: 15,
    cartTtlHours: 24,
  });
}
