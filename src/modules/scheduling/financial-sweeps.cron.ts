import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { orders } from '../../db/schema/orders';
import { boxWalletOrderConfirmations } from '../../db/schema/financial';
import { SplitService } from '../financial/split.service';
import { RefundService } from '../financial/refund.service';

@Injectable()
export class FinancialSweepsCron {
  private readonly log = new Logger(FinancialSweepsCron.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly split: SplitService,
    private readonly refund: RefundService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryQuarantinedSplits(): Promise<void> {
    const quarantined =
      await this.db.query.boxWalletOrderConfirmations.findMany({
        where: eq(boxWalletOrderConfirmations.boxWalletStatus, 'quarantined'),
      });

    for (const conf of quarantined) {
      try {
        await this.split.confirmSplit(conf.orderId);
      } catch (err) {
        this.log.error(`Failed to retry split for order ${conf.orderId}`, err);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryPendingRefunds(): Promise<void> {
    const pending = await this.db.query.orders.findMany({
      where: and(
        eq(orders.refundPending, true),
        eq(orders.status, 'cancelled'),
      ),
    });

    for (const order of pending) {
      try {
        await this.refund.reverseOrderSplit(
          order.id,
          'Auto-retry refund sweep',
        );
      } catch (err) {
        this.log.error(`Failed to retry refund for order ${order.id}`, err);
      }
    }
  }
}
