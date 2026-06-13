import type { Db } from '../client';
import { promotions, applicationMethods } from '../schema/promotions';

export async function seedPromotions(db: Db): Promise<void> {
  // Welcome discount — 20% off first order
  const [welcome] = await db
    .insert(promotions)
    .values({
      code: 'WELCOME20',
      type: 'standard',
      status: 'active',
      usageLimit: 10000,
      customerUsageLimit: 1,
    })
    .onConflictDoNothing()
    .returning();

  if (welcome) {
    await db
      .insert(applicationMethods)
      .values({
        promotionId: welcome.id,
        type: 'percentage',
        targetType: 'subtotal',
        value: 20,
      })
      .onConflictDoNothing();
  }

  // Flat 2000 UGX off
  const [flat] = await db
    .insert(promotions)
    .values({
      code: 'SAVE2000',
      type: 'standard',
      status: 'active',
      usageLimit: 5000,
      customerUsageLimit: 3,
    })
    .onConflictDoNothing()
    .returning();

  if (flat) {
    await db
      .insert(applicationMethods)
      .values({
        promotionId: flat.id,
        type: 'fixed',
        targetType: 'subtotal',
        value: 2000,
      })
      .onConflictDoNothing();
  }

  // Free delivery — 100% off delivery fee
  const [freeDel] = await db
    .insert(promotions)
    .values({
      code: 'FREESHIP',
      type: 'standard',
      status: 'active',
      usageLimit: 2000,
      customerUsageLimit: 2,
    })
    .onConflictDoNothing()
    .returning();

  if (freeDel) {
    await db
      .insert(applicationMethods)
      .values({
        promotionId: freeDel.id,
        type: 'percentage',
        targetType: 'delivery_fee',
        value: 100,
      })
      .onConflictDoNothing();
  }
}
