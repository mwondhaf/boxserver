import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { orders, orderItems, orderItemEvents } from '../../db/schema/orders';
import { productVariants } from '../../db/schema/catalog';
import { EventBus } from '../../realtime/event-bus';
import type { ActorContext } from '../../auth/session.guard';
import type { ProposeSwapDto, RespondSwapDto } from './dto/orders.dto';

const SWAP_DEADLINE_MINUTES = 10;

@Injectable()
export class OrderSwapService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly eventBus: EventBus,
  ) {}

  async markUnavailable(orderId: string, itemId: string, actor: ActorContext) {
    const item = await this.assertItem(orderId, itemId);

    await this.db
      .update(orderItems)
      .set({ itemStatus: 'unavailable' })
      .where(eq(orderItems.id, itemId));

    await this.db.insert(orderItemEvents).values({
      orderId,
      orderItemId: itemId,
      eventType: 'item.unavailable',
      actorUserId: actor.userId || null,
      actorRole: 'vendor',
    });

    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    this.eventBus.emit('order.item_swap_proposed', {
      orderId,
      itemId,
      organizationId: order?.organizationId,
    });

    return { success: true };
  }

  async proposeSwap(orderId: string, actor: ActorContext, dto: ProposeSwapDto) {
    const item = await this.assertItem(orderId, dto.orderItemId);
    if (item.itemStatus !== 'unavailable') {
      throw new BadRequestException(
        'Item must be marked unavailable before proposing swap',
      );
    }

    const variant = await this.db.query.productVariants.findFirst({
      where: eq(productVariants.id, dto.proposedVariantId),
      with: {
        product: { columns: { name: true } },
        priceSet: { with: { amounts: true } },
      },
    });
    if (!variant) throw new NotFoundException('Proposed variant not found');

    const proposedPrice = variant.priceSet?.amounts[0]?.amount ?? 0;
    const deadlineAt = new Date(Date.now() + SWAP_DEADLINE_MINUTES * 60_000);

    await this.db
      .update(orderItems)
      .set({
        itemStatus: 'swap_proposed',
        proposedVariantId: dto.proposedVariantId,
        proposedTitle: dto.proposedTitle ?? variant.product?.name ?? null,
        proposedImageR2Key: dto.proposedImageR2Key,
        proposedPrice,
        swapDeadlineAt: deadlineAt,
        swapReportedBy: actor.userId || null,
      })
      .where(eq(orderItems.id, dto.orderItemId));

    await this.db.insert(orderItemEvents).values({
      orderId,
      orderItemId: dto.orderItemId,
      eventType: 'item.swap_proposed',
      actorUserId: actor.userId || null,
      actorRole: 'vendor',
    });

    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    this.eventBus.emit('order.item_swap_proposed', {
      orderId,
      itemId: dto.orderItemId,
      userId: order?.userId,
      organizationId: order?.organizationId,
    });

    return { success: true, deadlineAt };
  }

  async respondSwap(orderId: string, actor: ActorContext, dto: RespondSwapDto) {
    const item = await this.assertItem(orderId, dto.orderItemId);

    if (item.itemStatus !== 'swap_proposed') {
      throw new BadRequestException('No pending swap proposal');
    }
    if (item.swapDeadlineAt && item.swapDeadlineAt < new Date()) {
      throw new BadRequestException('Swap deadline has passed');
    }

    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (order?.userId !== actor.userId) {
      throw new ForbiddenException('Not your order');
    }

    if (dto.action === 'accept') {
      await this.db
        .update(orderItems)
        .set({
          itemStatus: 'swap_accepted',
          variantId: item.proposedVariantId!,
          title: item.proposedTitle ?? item.title,
          unitPrice: item.proposedPrice ?? item.unitPrice,
          subtotal: (item.proposedPrice ?? item.unitPrice) * item.quantity,
        })
        .where(eq(orderItems.id, dto.orderItemId));
    } else {
      await this.db
        .update(orderItems)
        .set({ itemStatus: 'swap_rejected' })
        .where(eq(orderItems.id, dto.orderItemId));
    }

    await this.db.insert(orderItemEvents).values({
      orderId,
      orderItemId: dto.orderItemId,
      eventType: `item.swap_${dto.action}ed`,
      actorUserId: actor.userId || null,
      actorRole: 'customer',
    });

    this.eventBus.emit('order.swap_resolved', {
      orderId,
      itemId: dto.orderItemId,
      action: dto.action,
      organizationId: order?.organizationId,
    });

    return { success: true, action: dto.action };
  }

  private async assertItem(orderId: string, itemId: string) {
    const item = await this.db.query.orderItems.findFirst({
      where: eq(orderItems.id, itemId),
    });
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Order item not found');
    }
    return item;
  }
}
