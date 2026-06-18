import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { organizations } from '../../db/schema/identity';
import { zoneCommissionMappings } from '../../db/schema/zones';

export interface CommissionResult {
  commissionRuleId: string;
  source: 'vendor_override' | 'zone_mapping' | 'order_fallback';
}

@Injectable()
export class CommissionService {
  private readonly defaultRuleId = 'default-commission';

  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async resolveRule(
    organizationId: string,
    zoneId?: string | null,
  ): Promise<CommissionResult> {
    // 1. Vendor override
    const org = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { commissionRuleId: true },
    });
    if (org?.commissionRuleId) {
      return {
        commissionRuleId: org.commissionRuleId,
        source: 'vendor_override',
      };
    }

    // 2. Zone mapping
    if (zoneId) {
      const mapping = await this.db.query.zoneCommissionMappings.findFirst({
        where: eq(zoneCommissionMappings.zoneId, zoneId),
      });
      if (mapping) {
        return {
          commissionRuleId: mapping.boxWalletCommissionRuleId,
          source: 'zone_mapping',
        };
      }
    }

    // 3. Order fallback
    return { commissionRuleId: this.defaultRuleId, source: 'order_fallback' };
  }
}
