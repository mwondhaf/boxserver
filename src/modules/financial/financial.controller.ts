import { Controller, Get, Param, Post } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { boxWalletMappings, boxWalletOrderConfirmations } from '../../db/schema/financial';
import { SplitService } from './split.service';
import { WalletService } from './wallet.service';
import { RequireRole } from '../../auth/ability/policies.guard';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';

@ApiTags('Admin — Financial')
@ApiCookieAuth('session')
@RequireRole('admin')
@Controller('a/financial')
export class AdminFinancialController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly split: SplitService,
  ) {}

  @Get('confirmations')
  @ApiOperation({ summary: 'List wallet split confirmations', description: 'Returns all BoxWallet commission split records. Pending items indicate failed splits that need retry.' })
  @ApiResponse({ status: 200, description: 'Array of wallet confirmation records' })
  listConfirmations() {
    return this.db.query.boxWalletOrderConfirmations.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  @Post('confirmations/:orderId/retry')
  @ApiOperation({ summary: 'Retry a failed commission split', description: 'Re-triggers the BoxWallet API call to split commissions for an order whose initial split failed.' })
  @ApiParam({ name: 'orderId', example: 'order_01abc' })
  @ApiResponse({ status: 201, description: 'Split retried' })
  retry(@Param('orderId') orderId: string) {
    return this.split.confirmSplit(orderId);
  }

  @Get('wallets')
  @ApiOperation({ summary: 'List vendor BoxWallet mappings', description: 'Returns the mapping between vendor organisations and their BoxWallet wallet IDs.' })
  @ApiResponse({ status: 200, description: 'Array of wallet mappings' })
  listWallets() {
    return this.db.query.boxWalletMappings.findMany();
  }
}

@ApiTags('Financial')
@ApiCookieAuth('session')
@Controller('me/wallet')
export class VendorWalletController {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly wallets: WalletService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get my vendor wallet', description: 'Returns the BoxWallet wallet details for the authenticated vendor\'s organisation.' })
  @ApiResponse({ status: 200, description: 'Wallet mapping or { message: "No wallet found" }' })
  async getWallet(@Actor() actor: ActorContext) {
    const wallet = await this.db.query.boxWalletMappings.findFirst({
      where: eq(boxWalletMappings.organizationId, actor.activeOrgId ?? ''),
    });
    return wallet ?? { message: 'No wallet found' };
  }
}
