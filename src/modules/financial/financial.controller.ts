import { Controller, Get, Param, Post } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { boxWalletMappings, boxWalletOrderConfirmations } from '../../db/schema/financial';
import { SplitService } from './split.service';
import { WalletService } from './wallet.service';
import { RequireRole } from '../../auth/ability/policies.guard';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

@RequireRole('admin')
@Controller('a/financial')
export class AdminFinancialController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly split: SplitService,
  ) {}

  @Get('confirmations')
  listConfirmations() {
    return this.db.query.boxWalletOrderConfirmations.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  @Post('confirmations/:orderId/retry')
  retry(@Param('orderId') orderId: string) {
    return this.split.confirmSplit(orderId);
  }

  @Get('wallets')
  listWallets() {
    return this.db.query.boxWalletMappings.findMany();
  }
}

@Controller('me/wallet')
export class VendorWalletController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly wallets: WalletService,
  ) {}

  @Get()
  async getWallet(@Actor() actor: ActorContext) {
    const wallet = await this.db.query.boxWalletMappings.findFirst({
      where: eq(boxWalletMappings.organizationId, actor.activeOrgId ?? ''),
    });
    return wallet ?? { message: 'No wallet found' };
  }
}
