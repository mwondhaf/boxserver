import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { timeOfDayRecommendations } from '../../db/schema/recommendations';

@Injectable()
export class RecommendationsCron {
  private readonly log = new Logger(RecommendationsCron.name);

  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  @Cron(CronExpression.EVERY_HOUR)
  async recomputeRecommendations(): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getHours();

      // Find top variants for this hour based on order history
      const topVariants = await this.db.execute(sql`
        SELECT oi.variant_id, COUNT(*) as order_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE EXTRACT(HOUR FROM o.created_at) = ${hour}
          AND o.created_at >= NOW() - INTERVAL '30 days'
          AND o.status NOT IN ('cancelled', 'refunded')
        GROUP BY oi.variant_id
        ORDER BY order_count DESC
        LIMIT 20
      `);

      const rows = topVariants.rows as Array<{
        variant_id: string;
        order_count: string;
      }>;
      const variantIds = rows.map((r) => r.variant_id);
      const scores = rows.map((r) => r.order_count);

      await this.db
        .insert(timeOfDayRecommendations)
        .values({
          timeSlot: hour,
          variantIds,
          scores: scores.map((s) => s.toString()),
          label: `Hour ${hour} recommendations`,
          recomputedAt: now,
        })
        .onConflictDoUpdate({
          target: [timeOfDayRecommendations.timeSlot],
          set: {
            variantIds,
            scores: scores.map((s) => s.toString()),
            recomputedAt: now,
          },
        });

      this.log.log(
        `Recommendations recomputed for hour ${hour}: ${variantIds.length} variants`,
      );
    } catch (err) {
      this.log.error('Recommendations recompute failed', err);
    }
  }
}
