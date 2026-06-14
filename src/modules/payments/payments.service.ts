import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { mobileMoneyPayments } from '../../db/schema/payments';
import { orders } from '../../db/schema/orders';
import { EventBus } from '../../realtime/event-bus';
import type { MomoClient } from './momo/momo-client';
import { MOMO_CLIENT } from './momo/momo-client';
import type { ActorContext } from '../../auth/session.guard';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollectPaymentDto {
  @ApiProperty({ example: 'order_01abc' })
  @IsString() orderId!: string;

  @ApiProperty({ example: '+256700000000', description: 'Mobile money number to charge' })
  @IsString() phoneNumber!: string;

  @ApiProperty({ example: 15000, description: 'Amount in UGX' })
  @IsNumber() @Min(1) amount!: number;

  @ApiPropertyOptional({ example: 'Payment for order #1042' })
  @IsString() @IsOptional() description?: string;
}

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    @Inject(MOMO_CLIENT) private readonly momo: MomoClient,
    private readonly eventBus: EventBus,
  ) {}

  async collect(actor: ActorContext, dto: CollectPaymentDto) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, dto.orderId),
    });
    if (!order) throw new BadRequestException('Order not found');
    if (order.paymentStatus !== 'awaiting') {
      throw new BadRequestException('Order payment already processed');
    }

    const internalRef = `pay-${dto.orderId}-${Date.now()}`;

    const result = await this.momo.collect({
      phoneNumber: dto.phoneNumber,
      amount: dto.amount,
      currency: 'UGX',
      reference: internalRef,
      description: dto.description ?? `Payment for order ${order.displayId}`,
    });

    const [payment] = await this.db
      .insert(mobileMoneyPayments)
      .values({
        direction: 'inbound',
        status: result.status as typeof mobileMoneyPayments.$inferInsert['status'],
        phoneNumber: dto.phoneNumber,
        amount: dto.amount,
        currency: 'UGX',
        provider: 'relworx',
        customerReference: result.providerReference,
        internalReference: internalRef,
        orderId: dto.orderId,
        customerUserId: actor.userId || null,
      })
      .returning();

    return payment;
  }

  async getStatus(paymentId: string) {
    const payment = await this.db.query.mobileMoneyPayments.findFirst({
      where: eq(mobileMoneyPayments.id, paymentId),
    });
    if (!payment) throw new BadRequestException('Payment not found');

    if (payment.customerReference) {
      const status = await this.momo.getStatus(payment.customerReference);
      await this.db
        .update(mobileMoneyPayments)
        .set({
          status: status.status as typeof mobileMoneyPayments.$inferInsert['status'],
          charge: status.charge,
        })
        .where(eq(mobileMoneyPayments.id, paymentId));

      return { ...payment, status: status.status };
    }

    return payment;
  }

  async handleWebhook(providerRef: string, status: string) {
    const payment = await this.db.query.mobileMoneyPayments.findFirst({
      where: eq(mobileMoneyPayments.customerReference, providerRef),
    });

    if (!payment) {
      this.log.warn(`Webhook for unknown payment reference: ${providerRef}`);
      return;
    }

    if (payment.status === 'success') {
      this.log.log(`Payment ${providerRef} already captured`);
      return;
    }

    const newStatus = status === 'SUCCESS' ? 'success' : 'failed';

    await this.db
      .update(mobileMoneyPayments)
      .set({
        status: newStatus as typeof mobileMoneyPayments.$inferInsert['status'],
        completedAt: new Date(),
      })
      .where(eq(mobileMoneyPayments.id, payment.id));

    if (newStatus === 'success' && payment.orderId) {
      await this.db
        .update(orders)
        .set({ paymentStatus: 'captured' })
        .where(eq(orders.id, payment.orderId));

      this.eventBus.emit('order.payment_captured', {
        orderId: payment.orderId,
        paymentId: payment.id,
      });
      this.eventBus.emit('notification', {
        channel: `user:${payment.customerUserId}`,
        type: 'payment.success',
        payload: { orderId: payment.orderId },
      });
    }
  }
}
