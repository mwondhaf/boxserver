import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  orders,
  orderItems,
  orderEvents,
  type Order,
} from '../../db/schema/orders';
import { productVariants } from '../../db/schema/catalog';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { EventBus } from '../../realtime/event-bus';
import { assertValidTransition, canCancel } from './order-state-machine';
import type { ActorContext } from '../../auth/session.guard';
import type {
  ConfirmOrderDto,
  CancelOrderDto,
  PickupCodeDto,
} from './dto/orders.dto';

type OrderStatus = Order['status'];

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly settings: PlatformSettingsService,
    private readonly eventBus: EventBus,
  ) {}

  async getOrder(id: string, actor: ActorContext) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: { with: { modifiers: true } },
        events: { orderBy: (t, { desc }) => [desc(t.createdAt)] },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async listCustomerOrders(actor: ActorContext) {
    if (!actor.userId) throw new BadRequestException('Authentication required');
    return this.db.query.orders.findMany({
      where: eq(orders.userId, actor.userId),
      orderBy: [desc(orders.createdAt)],
      with: { items: true },
    });
  }

  async listAllOrders(status?: string) {
    const condition = status
      ? eq(orders.status, status as OrderStatus)
      : undefined;
    return this.db.query.orders.findMany({
      where: condition,
      orderBy: [desc(orders.createdAt)],
      limit: 200,
      with: {
        items: true,
        organization: { columns: { id: true, name: true, slug: true } },
      },
    });
  }

  async listVendorOrders(actor: ActorContext, status?: string) {
    if (!actor.activeOrgId)
      throw new BadRequestException('No active organization');
    const condition = status
      ? and(
          eq(orders.organizationId, actor.activeOrgId),
          eq(orders.status, status as OrderStatus),
        )
      : eq(orders.organizationId, actor.activeOrgId);

    return this.db.query.orders.findMany({
      where: condition,
      orderBy: [desc(orders.createdAt)],
      with: { items: { with: { modifiers: true } } },
    });
  }

  async confirmOrder(id: string, actor: ActorContext, dto: ConfirmOrderDto) {
    return this.transition(id, actor, 'confirmed', {
      actorRole: 'vendor',
      reason: dto.estimatedMinutes
        ? `ETA ${dto.estimatedMinutes} min`
        : undefined,
    });
  }

  async markPreparing(id: string, actor: ActorContext) {
    const order = await this.assertVendorOrder(id, actor);
    // Anchor prep clock
    await this.db
      .update(orders)
      .set({ prepStartedAt: new Date() })
      .where(eq(orders.id, id));
    return this.transition(id, actor, 'preparing', { actorRole: 'vendor' });
  }

  async markReady(id: string, actor: ActorContext) {
    return this.transition(id, actor, 'ready_for_pickup', {
      actorRole: 'vendor',
    });
  }

  async verifyPickupCode(id: string, actor: ActorContext, dto: PickupCodeDto) {
    const order = await this.assertVendorOrder(id, actor);
    if (order.vendorPickupCode !== dto.code) {
      throw new BadRequestException('Invalid pickup code');
    }
    return this.transition(id, actor, 'completed', { actorRole: 'vendor' });
  }

  async customerCancel(id: string, actor: ActorContext, dto: CancelOrderDto) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== actor.userId)
      throw new ForbiddenException('Not your order');
    if (!canCancel(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in status '${order.status}'`,
      );
    }
    return this.transition(id, actor, 'cancelled', {
      actorRole: 'customer',
      reason: `${dto.reason}${dto.note ? ': ' + dto.note : ''}`,
    });
  }

  async vendorCancel(id: string, actor: ActorContext, dto: CancelOrderDto) {
    await this.assertVendorOrder(id, actor);
    return this.transition(id, actor, 'cancelled', {
      actorRole: 'vendor',
      reason: dto.reason,
    });
  }

  private async transition(
    id: string,
    actor: ActorContext,
    to: OrderStatus,
    meta: { actorRole: string; reason?: string },
  ) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!order) throw new NotFoundException('Order not found');

    assertValidTransition(order.status, to);

    await this.db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status: to, updatedAt: new Date() })
        .where(eq(orders.id, id));
      await tx.insert(orderEvents).values({
        orderId: id,
        actorUserId: actor.userId || null,
        actorName: actor.name || null,
        actorRole:
          meta.actorRole as (typeof orderEvents.$inferInsert)['actorRole'],
        eventType: `order.${to}`,
        fromStatus: order.status,
        toStatus: to,
        reason: meta.reason,
      });
    });

    this.eventBus.emit('order.status_changed', {
      orderId: id,
      organizationId: order.organizationId,
      fromStatus: order.status,
      toStatus: to,
      userId: order.userId,
    });
    this.eventBus.emit('notification', {
      channel: `user:${order.userId}`,
      type: 'order.status_changed',
      payload: { orderId: id, status: to },
    });
    this.eventBus.emit('notification', {
      channel: `vendor:${order.organizationId}`,
      type: 'order.status_changed',
      payload: { orderId: id, status: to },
    });

    return this.getOrder(id, actor);
  }

  private async assertVendorOrder(id: string, actor: ActorContext) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.organizationId !== actor.activeOrgId) {
      throw new ForbiddenException('Not your order');
    }
    return order;
  }
}
