import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { orders } from '../../db/schema/orders';
import { riders } from '../../db/schema/riders';
import { organizations } from '../../db/schema/identity';
import { boxWalletOrderConfirmations } from '../../db/schema/financial';
import { WalletService } from './wallet.service';
import { CommissionService } from './commission.service';
import type { LedgerClient } from './ledger/ledger-client';
import { LEDGER_CLIENT } from './ledger/ledger-client';

@Injectable()
export class SplitService {
  private readonly log = new Logger(SplitService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    @Inject(LEDGER_CLIENT) private readonly ledger: LedgerClient,
    private readonly wallets: WalletService,
    private readonly commission: CommissionService,
  ) {}

  async confirmSplit(orderId: string): Promise<void> {
    const correlationId = `order-split-${orderId}`;

    // Idempotency: check if already processed
    const existing = await this.db.query.boxWalletOrderConfirmations.findFirst({
      where: eq(boxWalletOrderConfirmations.correlationId, correlationId),
    });
    if (existing?.boxWalletStatus === 'processed') {
      this.log.log(`Split for order ${orderId} already processed`);
      return;
    }

    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new Error(`Order ${orderId} not found`);

    const org = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, order.organizationId),
      columns: { id: true, name: true },
    });
    if (!org) throw new Error(`Organization ${order.organizationId} not found`);

    // Resolve wallets
    const vendorWalletId = await this.wallets.getOrCreateVendorWallet(org.id, org.name);
    const platformWalletId = await this.wallets.getPlatformWalletId();

    // Resolve rider wallet if applicable
    let riderWalletId: string | undefined;
    let riderAmount = 0;

    if (order.riderId) {
      const rider = await this.db.query.riders.findFirst({
        where: eq(riders.id, order.riderId),
        columns: { id: true, name: true },
      });
      if (rider) {
        riderWalletId = await this.wallets.getOrCreateRiderWallet(rider.id, rider.name);
        riderAmount = order.deliveryTotal ?? 0;
      }
    }

    const commissionResult = await this.commission.resolveRule(
      order.organizationId,
      order.deliveryZoneId,
    );

    // Simplified split: vendor gets subtotal - markup, platform gets markup + service fee
    const vendorAmount = (order.subtotal ?? 0) - (order.markupTotal ?? 0);
    const platformAmount = (order.markupTotal ?? 0) + (order.serviceFeeTotal ?? 0);

    const result = await this.ledger.confirmSplit({
      correlationId,
      orderId,
      vendorWalletId,
      riderWalletId,
      platformWalletId,
      vendorAmount,
      riderAmount,
      platformAmount,
      currency: 'UGX',
    });

    await this.db
      .insert(boxWalletOrderConfirmations)
      .values({
        orderId,
        boxWalletOrderId: result.boxWalletOrderId,
        boxWalletStatus: result.status,
        correlationId,
        vendorAmount,
        riderAmount,
        platformAmount,
      })
      .onConflictDoUpdate({
        target: boxWalletOrderConfirmations.correlationId,
        set: {
          boxWalletStatus: result.status,
          boxWalletOrderId: result.boxWalletOrderId,
        },
      });

    await this.db
      .update(orders)
      .set({ commissionRuleId: commissionResult.commissionRuleId })
      .where(eq(orders.id, orderId));

    this.log.log(`Split for order ${orderId}: ${result.status}`);
  }
}
