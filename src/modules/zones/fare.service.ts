import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { deliveryZones, pricingRules } from '../../db/schema/zones';
import { haversineMeters } from '../../common/geo';

export interface FareResult {
  zoneId: string;
  ruleId: string;
  distanceMeters: number;
  distanceSource: 'haversine';
  baseFee: number;
  ratePerKm: number;
  distanceFee: number;
  surgeMultiplier: number;
  minFee: number;
  deliveryFee: number;
}

@Injectable()
export class FareService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async computeFare(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ): Promise<FareResult> {
    const zones = await this.db.query.deliveryZones.findMany({
      where: eq(deliveryZones.active, true),
      with: { pricingRules: { where: eq(pricingRules.status, 'active') } },
    });

    // Find zone that covers the dropoff point
    let matchedZone: (typeof zones)[0] | undefined;
    let distanceFromCenter = Infinity;

    for (const zone of zones) {
      const d = haversineMeters(
        Number(zone.centerLat),
        Number(zone.centerLng),
        dropoffLat,
        dropoffLng,
      );
      if (d <= zone.maxDistanceMeters && d < distanceFromCenter) {
        matchedZone = zone;
        distanceFromCenter = d;
      }
    }

    if (!matchedZone) {
      throw new BadRequestException(
        'Delivery location is outside all active zones',
      );
    }

    if (matchedZone.suspendedAt) {
      throw new BadRequestException(
        `Zone '${matchedZone.name}' is currently suspended: ${matchedZone.suspendedReason ?? 'no reason given'}`,
      );
    }

    // Select rule matching current day/hour window
    const now = new Date();
    const nowHour = now.getHours();
    const nowDay = now.getDay().toString();

    const rule =
      matchedZone.pricingRules.find((r) => {
        const dayMatch = !r.daysOfWeek || r.daysOfWeek.includes(nowDay);
        const hourMatch =
          r.startHour === null ||
          r.endHour === null ||
          (r.startHour !== null &&
            r.endHour !== null &&
            nowHour >= r.startHour &&
            nowHour < r.endHour);
        return dayMatch && hourMatch;
      }) ?? matchedZone.pricingRules[0];

    if (!rule) {
      throw new BadRequestException('No pricing rule available for this zone');
    }

    const distanceMeters = haversineMeters(
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
    );
    const distanceKm = distanceMeters / 1000;
    const surgeMultiplier = Number(rule.surgeMultiplier);
    const distanceFee = Math.round(rule.ratePerKm * distanceKm);
    const rawFee = Math.round((rule.baseFee + distanceFee) * surgeMultiplier);
    const deliveryFee = Math.max(rawFee, rule.minFee);

    return {
      zoneId: matchedZone.id,
      ruleId: rule.id,
      distanceMeters: Math.round(distanceMeters),
      distanceSource: 'haversine',
      baseFee: rule.baseFee,
      ratePerKm: rule.ratePerKm,
      distanceFee,
      surgeMultiplier,
      minFee: rule.minFee,
      deliveryFee,
    };
  }
}
