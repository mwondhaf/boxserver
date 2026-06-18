import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  boxWalletMappings,
  boxWalletAutoCreateLog,
} from '../../db/schema/financial';
import type { LedgerClient } from './ledger/ledger-client';
import { LEDGER_CLIENT } from './ledger/ledger-client';

@Injectable()
export class WalletService {
  private readonly log = new Logger(WalletService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    @Inject(LEDGER_CLIENT) private readonly ledger: LedgerClient,
  ) {}

  async getOrCreateVendorWallet(
    organizationId: string,
    orgName: string,
  ): Promise<string> {
    const existing = await this.db.query.boxWalletMappings.findFirst({
      where: and(
        eq(boxWalletMappings.entityType, 'vendor'),
        eq(boxWalletMappings.organizationId, organizationId),
      ),
    });
    if (existing) return existing.boxWalletId;

    return this.createWallet('vendor', { organizationId }, orgName);
  }

  async getOrCreateRiderWallet(
    riderId: string,
    riderName: string,
  ): Promise<string> {
    const existing = await this.db.query.boxWalletMappings.findFirst({
      where: and(
        eq(boxWalletMappings.entityType, 'rider'),
        eq(boxWalletMappings.riderId, riderId),
      ),
    });
    if (existing) return existing.boxWalletId;

    return this.createWallet('rider', { riderId }, riderName);
  }

  async getPlatformWalletId(): Promise<string> {
    const existing = await this.db.query.boxWalletMappings.findFirst({
      where: eq(boxWalletMappings.entityType, 'platform'),
    });
    if (existing) return existing.boxWalletId;

    return this.createWallet('platform', {}, 'BoxConv Platform');
  }

  private async createWallet(
    entityType: 'vendor' | 'rider' | 'platform',
    ids: { organizationId?: string; riderId?: string; userId?: string },
    entityName: string,
  ): Promise<string> {
    try {
      const result = await this.ledger.createWallet({
        entityType,
        entityId: ids.organizationId ?? ids.riderId ?? 'platform',
        entityName,
        currency: 'UGX',
      });

      await this.db.insert(boxWalletMappings).values({
        entityType,
        organizationId: ids.organizationId ?? null,
        riderId: ids.riderId ?? null,
        userId: ids.userId ?? null,
        boxWalletId: result.walletId,
        entityName,
        autoCreated: 'true',
      });

      await this.db.insert(boxWalletAutoCreateLog).values({
        event: 'wallet_created',
        entityType,
        organizationId: ids.organizationId ?? null,
        riderId: ids.riderId ?? null,
        userId: ids.userId ?? null,
      });

      return result.walletId;
    } catch (err) {
      await this.db.insert(boxWalletAutoCreateLog).values({
        event: 'wallet_create_failed',
        entityType,
        organizationId: ids.organizationId ?? null,
        riderId: ids.riderId ?? null,
        userId: ids.userId ?? null,
        error: String(err),
      });
      throw err;
    }
  }
}
