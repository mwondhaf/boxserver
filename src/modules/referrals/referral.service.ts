import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { referralCodes, referrals } from '../../db/schema/referrals';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import type { ActorContext } from '../../auth/session.guard';

function generateCode(userId: string): string {
  return `REF-${userId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

@Injectable()
export class ReferralService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly settings: PlatformSettingsService,
  ) {}

  async getMyCode(actor: ActorContext) {
    const existing = await this.db.query.referralCodes.findFirst({
      where: eq(referralCodes.userId, actor.userId),
    });
    if (existing) return existing;

    const s = await this.settings.getSettings();
    if (!s.referralEnabled) {
      throw new BadRequestException('Referrals are not enabled');
    }

    const code = generateCode(actor.userId);
    const [created] = await this.db
      .insert(referralCodes)
      .values({
        userId: actor.userId,
        code,
        rewardAmount: s.referralRewardAmount,
      })
      .returning();

    return created;
  }

  async redeem(actor: ActorContext, code: string) {
    const s = await this.settings.getSettings();
    if (!s.referralEnabled) {
      throw new BadRequestException('Referrals are not enabled');
    }

    const refCode = await this.db.query.referralCodes.findFirst({
      where: eq(referralCodes.code, code),
    });
    if (!refCode) throw new NotFoundException('Referral code not found');
    if (!refCode.isActive) throw new BadRequestException('Referral code is inactive');
    if (refCode.userId === actor.userId) throw new BadRequestException('Cannot use your own referral code');

    // Check capacity
    if (refCode.maxReferrals && refCode.totalReferrals >= refCode.maxReferrals) {
      throw new BadRequestException('Referral code capacity reached');
    }

    // Check if already used
    const existingReferral = await this.db.query.referrals.findFirst({
      where: and(
        eq(referrals.refereeUserId, actor.userId),
        eq(referrals.referralCodeId, refCode.id),
      ),
    });
    if (existingReferral) throw new ConflictException('Already redeemed this referral code');

    const [referral] = await this.db
      .insert(referrals)
      .values({
        referrerUserId: refCode.userId,
        refereeUserId: actor.userId,
        referralCodeId: refCode.id,
        status: 'pending',
        rewardAmount: refCode.rewardAmount,
      })
      .returning();

    await this.db
      .update(referralCodes)
      .set({ totalReferrals: sql`${referralCodes.totalReferrals} + 1` })
      .where(eq(referralCodes.id, refCode.id));

    return referral;
  }

  async rewardOnQualifyingOrder(refereeUserId: string, orderId: string) {
    const pendingReferral = await this.db.query.referrals.findFirst({
      where: and(
        eq(referrals.refereeUserId, refereeUserId),
        eq(referrals.status, 'pending'),
      ),
    });
    if (!pendingReferral) return;

    await this.db
      .update(referrals)
      .set({
        status: 'rewarded',
        qualifyingOrderId: orderId,
        rewardedAt: new Date(),
      })
      .where(eq(referrals.id, pendingReferral.id));
  }

  async listMyReferrals(actor: ActorContext) {
    return this.db.query.referrals.findMany({
      where: eq(referrals.referrerUserId, actor.userId),
    });
  }
}
