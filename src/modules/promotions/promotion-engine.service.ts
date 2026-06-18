import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  promotions,
  promotionUsages,
  promotionRules,
  promotionRuleValues,
} from '../../db/schema/promotions';

export interface PromoInput {
  code: string;
  organizationId?: string;
  userId: string;
  subtotal: number;
  cartItemCount: number;
}

export interface PromoResult {
  promotionId: string;
  discountAmount: number;
  type: string;
}

@Injectable()
export class PromotionEngine {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async apply(input: PromoInput): Promise<PromoResult> {
    const now = new Date();

    // Find active promotion by code
    const promo = await this.db.query.promotions.findFirst({
      where: and(
        eq(promotions.code, input.code),
        eq(promotions.status, 'active'),
      ),
      with: {
        applicationMethod: true,
        rules: { with: { values: true } },
      },
    });

    if (!promo) {
      throw new BadRequestException('Invalid or inactive promotion code');
    }

    if (promo.startsAt && promo.startsAt > now) {
      throw new BadRequestException('Promotion has not started yet');
    }
    if (promo.endsAt && promo.endsAt < now) {
      throw new BadRequestException('Promotion has expired');
    }

    // Vendor scope check
    if (promo.organizationId && promo.organizationId !== input.organizationId) {
      throw new BadRequestException('Promotion not valid for this vendor');
    }

    // Per-customer usage limit
    if (promo.customerUsageLimit) {
      const usageCount = await this.db.query.promotionUsages.findMany({
        where: and(
          eq(promotionUsages.promotionId, promo.id),
          eq(promotionUsages.customerUserId, input.userId),
        ),
      });
      if (usageCount.length >= promo.customerUsageLimit) {
        throw new BadRequestException(
          'Promotion usage limit reached for your account',
        );
      }
    }

    // Overall usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      throw new BadRequestException('Promotion is fully redeemed');
    }

    // Calculate discount from application method
    const method = promo.applicationMethod;
    let discountAmount = 0;

    if (method) {
      if (method.type === 'percentage') {
        discountAmount = Math.round((input.subtotal * method.value) / 100);
      } else if (method.type === 'fixed') {
        discountAmount = Math.min(method.value, input.subtotal);
      }
      // buy-get and free_delivery handled by caller
    }

    return {
      promotionId: promo.id,
      discountAmount,
      type: promo.type,
    };
  }

  async recordUsage(
    promotionId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ) {
    await this.db.insert(promotionUsages).values({
      promotionId,
      customerUserId: userId,
      orderId,
      discountAmount,
    });
  }
}
