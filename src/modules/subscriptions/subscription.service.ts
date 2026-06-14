import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  subscriptions,
  subscriptionPlans,
  subscriptionCycles,
} from '../../db/schema/subscriptions';
import type { ActorContext } from '../../auth/session.guard';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({ example: 'plan_01abc', description: 'Subscription plan ID' })
  @IsString() planId!: string;

  @ApiPropertyOptional({ example: 'addr_01abc', description: 'Delivery address ID for recurring deliveries' })
  @IsString() @IsOptional() customerAddressId?: string;

  @ApiPropertyOptional({ example: 'slot_01abc', description: 'Preferred delivery time slot ID' })
  @IsString() @IsOptional() slotId?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: 'No longer needed' })
  @IsString() @IsOptional() reason?: string;
}

@Injectable()
export class SubscriptionService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async subscribe(actor: ActorContext, dto: SubscribeDto) {
    const plan = await this.db.query.subscriptionPlans.findFirst({
      where: and(
        eq(subscriptionPlans.id, dto.planId),
        eq(subscriptionPlans.isActive, true),
      ),
      with: { items: true, slots: true },
    });
    if (!plan) throw new NotFoundException('Plan not available');

    const grandTotal = plan.bundlePricePerCycle * plan.totalCycles;
    const itemsSnapshot = JSON.stringify(plan.items);
    const slotSnapshot = dto.slotId
      ? JSON.stringify(plan.slots.find((s) => s.id === dto.slotId))
      : null;

    const nextRunAt = this.computeNextRun(plan.cadence);

    const [sub] = await this.db
      .insert(subscriptions)
      .values({
        planId: plan.id,
        organizationId: plan.organizationId,
        customerUserId: actor.userId,
        customerAddressId: dto.customerAddressId,
        status: 'awaiting_payment',
        planName: plan.name,
        slotSnapshot,
        itemsSnapshot,
        totalCycles: plan.totalCycles,
        cyclesRemaining: plan.totalCycles,
        bundlePricePerCycle: plan.bundlePricePerCycle,
        itemsTotalPrepaid: plan.bundlePricePerCycle * plan.totalCycles,
        deliveryFeePerCycle: 0,
        deliveryTotalPrepaid: 0,
        markupPerCycle: plan.markupPerCycle,
        grandTotalPrepaid: grandTotal,
        nextRunAt,
      })
      .returning();

    return sub;
  }

  async listMySubscriptions(actor: ActorContext) {
    return this.db.query.subscriptions.findMany({
      where: eq(subscriptions.customerUserId, actor.userId),
      with: { plan: true, cycles: { orderBy: (t, { desc }) => [desc(t.createdAt)] } },
    });
  }

  async pause(id: string, actor: ActorContext, until?: Date) {
    const sub = await this.assertOwner(id, actor.userId);
    if (sub.status !== 'active') throw new BadRequestException('Only active subscriptions can be paused');

    const pausedUntil = until ?? new Date(Date.now() + 7 * 24 * 3600_000);
    await this.db
      .update(subscriptions)
      .set({ status: 'paused', pausedUntil, updatedAt: new Date() })
      .where(eq(subscriptions.id, id));

    return { success: true };
  }

  async resume(id: string, actor: ActorContext) {
    const sub = await this.assertOwner(id, actor.userId);
    if (sub.status !== 'paused') throw new BadRequestException('Subscription is not paused');

    await this.db
      .update(subscriptions)
      .set({ status: 'active', pausedUntil: null, updatedAt: new Date() })
      .where(eq(subscriptions.id, id));

    return { success: true };
  }

  async skipNextRun(id: string, actor: ActorContext) {
    await this.assertOwner(id, actor.userId);
    await this.db
      .update(subscriptions)
      .set({ skipNextRun: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, id));
    return { success: true };
  }

  async cancel(id: string, actor: ActorContext, dto: CancelSubscriptionDto) {
    const sub = await this.assertOwner(id, actor.userId);
    if (['canceled', 'completed'].includes(sub.status)) {
      throw new BadRequestException('Subscription already ended');
    }

    // Partial refund: cycles remaining * price per cycle
    const refundAmount = sub.cyclesRemaining * sub.bundlePricePerCycle;

    await this.db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        cancelReason: dto.reason,
        refundAmount,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id));

    return { success: true, refundAmount };
  }

  private async assertOwner(id: string, userId: string) {
    const sub = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, id),
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.customerUserId !== userId) throw new ForbiddenException('Not your subscription');
    return sub;
  }

  private computeNextRun(cadence: string): Date {
    const now = new Date();
    if (cadence === 'weekly') return new Date(now.getTime() + 7 * 24 * 3600_000);
    if (cadence === 'biweekly') return new Date(now.getTime() + 14 * 24 * 3600_000);
    return new Date(now.getTime() + 30 * 24 * 3600_000);
  }
}
