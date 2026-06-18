import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { and, eq, lt, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  subscriptions,
  subscriptionCycles,
} from '../../db/schema/subscriptions';
import { orders, orderItems } from '../../db/schema/orders';
import { CountersService } from '../../common/counters/counters.service';
import { EventBus } from '../../realtime/event-bus';

@Injectable()
export class SubscriptionCycleCron {
  private readonly log = new Logger(SubscriptionCycleCron.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly counters: CountersService,
    private readonly eventBus: EventBus,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runDueCycles(): Promise<void> {
    const now = new Date();

    const dueSubs = await this.db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.status, 'active'),
        lt(subscriptions.nextRunAt, now),
      ),
    });

    for (const sub of dueSubs) {
      try {
        if (sub.skipNextRun) {
          await this.db
            .update(subscriptions)
            .set({
              skipNextRun: false,
              nextRunAt: this.nextRun(sub.nextRunAt ?? now, sub.planId),
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));
          continue;
        }

        await this.runCycle(sub, now);
      } catch (err) {
        this.log.error(`Subscription cycle failed for ${sub.id}`, err);
        await this.db.insert(subscriptionCycles).values({
          subscriptionId: sub.id,
          cycleNumber: sub.totalCycles - sub.cyclesRemaining + 1,
          scheduledFor: now,
          status: 'failed',
          failureReason: String(err),
        });
      }
    }
  }

  private async runCycle(sub: typeof subscriptions.$inferSelect, now: Date) {
    const items = sub.itemsSnapshot
      ? (JSON.parse(sub.itemsSnapshot) as Array<{
          variantId: string;
          quantity: number;
        }>)
      : [];

    const displayId = await this.counters.nextValue('orders');
    const cycleNumber = sub.totalCycles - sub.cyclesRemaining + 1;

    await this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          displayId,
          organizationId: sub.organizationId,
          fulfillmentType: 'delivery',
          paymentMethod: 'wallet',
          userId: sub.customerUserId,
          customerAddressId: sub.customerAddressId,
          subtotal: sub.bundlePricePerCycle,
          total: sub.bundlePricePerCycle,
          taxTotal: 0,
          discountTotal: 0,
          deliveryTotal: sub.deliveryFeePerCycle,
          status: 'confirmed',
          paymentStatus: 'captured',
        })
        .returning();

      if (order) {
        // Insert order items from snapshot
        for (const item of items) {
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: '',
            variantId: item.variantId,
            title: 'Subscription item',
            quantity: item.quantity,
            unitPrice: 0,
            subtotal: 0,
            taxTotal: 0,
          });
        }

        await tx.insert(subscriptionCycles).values({
          subscriptionId: sub.id,
          cycleNumber,
          scheduledFor: now,
          orderId: order.id,
          status: 'fulfilled',
        });

        const remaining = sub.cyclesRemaining - 1;
        const nextStatus = remaining <= 0 ? 'completed' : 'active';
        const nextRunAt = remaining > 0 ? this.nextRun(now, sub.planId) : null;

        await tx
          .update(subscriptions)
          .set({
            cyclesRemaining: remaining,
            status: nextStatus,
            lastRunAt: now,
            nextRunAt,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id));

        this.eventBus.emit('subscription.cycle_fulfilled', {
          subscriptionId: sub.id,
          orderId: order.id,
          cycleNumber,
        });
      }
    });
  }

  private nextRun(from: Date, planId: string): Date {
    // Default weekly; cadence is in plan, simplified here
    return new Date(from.getTime() + 7 * 24 * 3600_000);
  }
}
