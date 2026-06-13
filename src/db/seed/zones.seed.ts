import type { Db } from '../client';
import { deliveryZones, pricingRules } from '../schema/zones';

export async function seedZones(db: Db): Promise<void> {
  const zoneData = [
    {
      name: 'Kampala Central',
      city: 'Kampala',
      country: 'UG',
      centerLat: '0.3176',
      centerLng: '32.5825',
      maxDistanceMeters: 10000,
      active: true,
    },
    {
      name: 'Kampala Suburbs',
      city: 'Kampala',
      country: 'UG',
      centerLat: '0.3476',
      centerLng: '32.6025',
      maxDistanceMeters: 20000,
      active: true,
    },
    {
      name: 'Entebbe',
      city: 'Entebbe',
      country: 'UG',
      centerLat: '0.0500',
      centerLng: '32.4637',
      maxDistanceMeters: 12000,
      active: true,
    },
  ];

  for (const zone of zoneData) {
    const [inserted] = await db
      .insert(deliveryZones)
      .values(zone)
      .onConflictDoNothing()
      .returning();

    if (!inserted) continue;

    const isKampala = zone.name.startsWith('Kampala');
    await db
      .insert(pricingRules)
      .values([
        {
          zoneId: inserted.id,
          name: `${zone.name} — Standard`,
          baseFee: isKampala ? 3000 : 5000,
          ratePerKm: isKampala ? 500 : 800,
          minFee: isKampala ? 3000 : 5000,
          surgeMultiplier: '1.00',
          status: 'active',
        },
        {
          zoneId: inserted.id,
          name: `${zone.name} — Peak Hours`,
          baseFee: isKampala ? 4000 : 6000,
          ratePerKm: isKampala ? 700 : 1000,
          minFee: isKampala ? 4000 : 6000,
          surgeMultiplier: '1.50',
          startHour: 17,
          endHour: 20,
          status: 'active',
        },
      ])
      .onConflictDoNothing();
  }
}
