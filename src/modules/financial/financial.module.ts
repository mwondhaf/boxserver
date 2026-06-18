import { Module, OnModuleInit } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { WalletService } from './wallet.service';
import { SplitService } from './split.service';
import { RefundService } from './refund.service';
import { BoxWalletLedgerClient } from './ledger/boxwallet-ledger.client';
import { LEDGER_CLIENT } from './ledger/ledger-client';
import {
  AdminFinancialController,
  VendorWalletController,
} from './financial.controller';
import { FinancialSweepsCron } from '../scheduling/financial-sweeps.cron';
import { EventBus } from '../../realtime/event-bus';

@Module({
  providers: [
    { provide: LEDGER_CLIENT, useClass: BoxWalletLedgerClient },
    CommissionService,
    WalletService,
    SplitService,
    RefundService,
    FinancialSweepsCron,
  ],
  controllers: [AdminFinancialController, VendorWalletController],
  exports: [SplitService, RefundService, WalletService],
})
export class FinancialModule implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly split: SplitService,
    private readonly refund: RefundService,
  ) {}

  onModuleInit() {
    this.eventBus.on<{ orderId: string; toStatus: string }>(
      'order.status_changed',
      async (event) => {
        const { orderId, toStatus } = event.payload;
        if (toStatus === 'delivered') {
          await this.split.confirmSplit(orderId).catch(() => null);
        }
        if (toStatus === 'cancelled') {
          await this.refund
            .reverseOrderSplit(orderId, 'Order cancelled')
            .catch(() => null);
        }
      },
    );
  }
}
