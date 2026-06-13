import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { mobileMoneyPayments } from '../../db/schema/payments';
import { orders } from '../../db/schema/orders';
import { PaymentsService } from '../payments/payments.service';

const ABANDONED_THRESHOLD_MINUTES = 30;

@Injectable()
export class PaymentSweepsCron {
  private readonly log = new Logger(PaymentSweepsCron.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly payments: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweepAbandonedPayments(): Promise<void> {
    const cutoff = new Date(Date.now() - ABANDONED_THRESHOLD_MINUTES * 60_000);

    const abandoned = await this.db.query.mobileMoneyPayments.findMany({
      where: and(
        eq(mobileMoneyPayments.status, 'pending'),
        lt(mobileMoneyPayments.initiatedAt, cutoff),
        eq(mobileMoneyPayments.direction, 'inbound'),
      ),
    });

    for (const payment of abandoned) {
      try {
        if (payment.customerReference) {
          const status = await this.payments.getStatus(payment.id);
          this.log.log(`Reconciled payment ${payment.id}: ${status.status}`);
        }
      } catch (err) {
        this.log.error(`Failed to reconcile payment ${payment.id}`, err);
      }
    }
  }
}
