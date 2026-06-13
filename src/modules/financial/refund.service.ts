import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { orders } from '../../db/schema/orders';
import { boxWalletOrderConfirmations } from '../../db/schema/financial';
import type { LedgerClient } from './ledger/ledger-client';
import { LEDGER_CLIENT } from './ledger/ledger-client';

@Injectable()
export class RefundService {
  private readonly log = new Logger(RefundService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    @Inject(LEDGER_CLIENT) private readonly ledger: LedgerClient,
  ) {}

  async reverseOrderSplit(orderId: string, reason: string): Promise<void> {
    const correlationId = `order-split-${orderId}`;

    const confirmation = await this.db.query.boxWalletOrderConfirmations.findFirst({
      where: eq(boxWalletOrderConfirmations.correlationId, correlationId),
    });

    if (!confirmation || confirmation.boxWalletStatus !== 'processed') {
      this.log.log(`No processed split for order ${orderId} — skipping refund`);
      await this.db
        .update(orders)
        .set({ refundPending: false })
        .where(eq(orders.id, orderId));
      return;
    }

    try {
      await this.ledger.reverseSplit(correlationId, reason);
      await this.db
        .update(orders)
        .set({ refundPending: false, paymentStatus: 'refunded' })
        .where(eq(orders.id, orderId));
      this.log.log(`Refund processed for order ${orderId}`);
    } catch (err) {
      // Mark pending for retry sweep
      await this.db
        .update(orders)
        .set({ refundPending: true })
        .where(eq(orders.id, orderId));
      this.log.error(`Refund failed for order ${orderId}`, err);
    }
  }
}
