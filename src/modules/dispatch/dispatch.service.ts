import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { orders, orderEvents } from '../../db/schema/orders';
import { riders, riderLocations } from '../../db/schema/riders';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { EventBus } from '../../realtime/event-bus';
import { assertValidTransition } from '../orders/order-state-machine';
import type { ActorContext } from '../../auth/session.guard';

@Injectable()
export class DispatchService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly settings: PlatformSettingsService,
    private readonly eventBus: EventBus,
  ) {}

  async offerToRider(orderId: string, riderId: string) {
    const s = await this.settings.getSettings();
    const windowMs = s.riderOfferWindowSeconds * 1000;
    const expiresAt = new Date(Date.now() + windowMs);

    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new NotFoundException('Order not found');

    assertValidTransition(order.status, 'out_for_delivery');

    await this.db
      .update(orders)
      .set({ offeredToRiderId: riderId, offeredAt: new Date() })
      .where(eq(orders.id, orderId));

    const rider = await this.db.query.riders.findFirst({
      where: eq(riders.id, riderId),
    });

    this.eventBus.emit('delivery.offered', {
      orderId,
      riderId,
      riderUserId: rider?.userId,
      expiresAt,
    });

    this.eventBus.emit('notification', {
      channel: `rider:${rider?.userId}`,
      type: 'delivery.offered',
      payload: { orderId, expiresAt },
    });

    // Schedule expiry check via event bus (in production: use scheduler)
    setTimeout(async () => {
      await this.checkOfferExpiry(orderId, riderId);
    }, windowMs);

    return { success: true, expiresAt };
  }

  async acceptDelivery(orderId: string, actor: ActorContext) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new NotFoundException('Order not found');

    const rider = await this.db.query.riders.findFirst({
      where: eq(riders.userId, actor.userId),
    });
    if (!rider) throw new NotFoundException('Rider profile not found');

    if (order.offeredToRiderId !== rider.id) {
      throw new BadRequestException('Delivery not offered to you');
    }

    await this.db
      .update(orders)
      .set({
        riderId: rider.id,
        riderName: rider.name,
        riderPhone: rider.phoneNumber,
        offeredToRiderId: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await this.db
      .update(riderLocations)
      .set({ activeOrderId: orderId })
      .where(eq(riderLocations.userId, actor.userId));

    this.eventBus.emit('order.rider_assigned', {
      orderId,
      riderId: rider.id,
      organizationId: order.organizationId,
      userId: order.userId,
    });

    return { success: true };
  }

  async confirmPickup(orderId: string, actor: ActorContext, code: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.vendorPickupCode !== code) {
      throw new BadRequestException('Invalid pickup code');
    }

    await this.db
      .update(orders)
      .set({ status: 'out_for_delivery', updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await this.db.insert(orderEvents).values({
      orderId,
      eventType: 'order.out_for_delivery',
      actorUserId: actor.userId,
      actorRole: 'rider',
      fromStatus: 'ready_for_pickup',
      toStatus: 'out_for_delivery',
    });

    this.eventBus.emit('order.status_changed', {
      orderId,
      organizationId: order.organizationId,
      fromStatus: 'ready_for_pickup',
      toStatus: 'out_for_delivery',
      userId: order.userId,
    });

    return { success: true };
  }

  async confirmDelivery(orderId: string, actor: ActorContext, proofR2Key?: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          status: 'delivered',
          paymentStatus: 'captured',
          proofOfDeliveryR2Key: proofR2Key ?? null,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(orderEvents).values({
        orderId,
        eventType: 'order.delivered',
        actorUserId: actor.userId,
        actorRole: 'rider',
        fromStatus: 'out_for_delivery',
        toStatus: 'delivered',
      });

      // Update rider stats
      const rider = await tx.query.riders.findFirst({
        where: eq(riders.userId, actor.userId),
      });
      if (rider) {
        await tx
          .update(riders)
          .set({
            completedDeliveries: sql`${riders.completedDeliveries} + 1`,
          })
          .where(eq(riders.id, rider.id));
      }

      // Clear active order from location
      await tx
        .update(riderLocations)
        .set({ activeOrderId: null, status: 'online' })
        .where(eq(riderLocations.userId, actor.userId));
    });

    this.eventBus.emit('order.status_changed', {
      orderId,
      organizationId: order.organizationId,
      fromStatus: 'out_for_delivery',
      toStatus: 'delivered',
      userId: order.userId,
    });

    return { success: true };
  }

  private async checkOfferExpiry(orderId: string, riderId: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order || order.offeredToRiderId !== riderId) return;

    await this.db
      .update(orders)
      .set({ offeredToRiderId: null, offeredAt: null })
      .where(eq(orders.id, orderId));

    this.eventBus.emit('delivery.offer_expired', { orderId, riderId });
  }
}
