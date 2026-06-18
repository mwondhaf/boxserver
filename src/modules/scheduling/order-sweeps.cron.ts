import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, lt, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { orders, orderEvents } from '../../db/schema/orders';
import { productVariants } from '../../db/schema/catalog';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { EventBus } from '../../realtime/event-bus';

@Injectable()
export class OrderSweepsCron {
  private readonly log = new Logger(OrderSweepsCron.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly settings: PlatformSettingsService,
    private readonly eventBus: EventBus,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cancelUnconfirmedOrders(): Promise<void> {
    const s = await this.settings.getSettings();
    const cutoff = new Date(
      Date.now() - s.unconfirmedOrderTimeoutMinutes * 60_000,
    );

    const stale = await this.db.query.orders.findMany({
      where: and(eq(orders.status, 'pending'), lt(orders.createdAt, cutoff)),
      with: { items: true },
    });

    for (const order of stale) {
      try {
        await this.db.transaction(async (tx) => {
          // Restock items
          for (const item of order.items) {
            await tx
              .update(productVariants)
              .set({
                stockQuantity: sql`${productVariants.stockQuantity} + ${item.quantity}`,
              })
              .where(eq(productVariants.id, item.variantId));
          }

          await tx
            .update(orders)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(orders.id, order.id));

          await tx.insert(orderEvents).values({
            orderId: order.id,
            eventType: 'order.auto_cancelled',
            actorRole: 'system',
            fromStatus: 'pending',
            toStatus: 'cancelled',
            reason: 'Unconfirmed order timeout',
          });
        });

        this.eventBus.emit('order.status_changed', {
          orderId: order.id,
          organizationId: order.organizationId,
          fromStatus: 'pending',
          toStatus: 'cancelled',
          userId: order.userId,
        });

        this.log.log(`Auto-cancelled order ${order.id}`);
      } catch (err) {
        this.log.error(`Failed to auto-cancel order ${order.id}`, err);
      }
    }
  }
}
