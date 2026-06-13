import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';

@Injectable()
export class AdminReportsService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async getDashboardSummary() {
    const result = await this.db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE status NOT IN ('cancelled', 'refunded')) as active_orders,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE) as orders_today,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status NOT IN ('cancelled', 'refunded')) as revenue_today,
        (SELECT COUNT(*) FROM riders WHERE account_status = 'active') as active_riders,
        (SELECT COUNT(*) FROM organizations WHERE is_active = true) as active_vendors
    `);
    return result.rows[0];
  }

  async getOrderStats(days = 7) {
    const result = await this.db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total) as revenue,
        AVG(total) as avg_order_value,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    return result.rows;
  }

  async getVendorStats() {
    const result = await this.db.execute(sql`
      SELECT
        o.id, o.name, o.slug,
        COUNT(ord.id) as total_orders,
        COALESCE(SUM(ord.total), 0) as total_revenue,
        AVG(ord.total) as avg_order_value
      FROM organizations o
      LEFT JOIN orders ord ON ord.organization_id = o.id AND ord.status NOT IN ('cancelled', 'refunded')
      GROUP BY o.id, o.name, o.slug
      ORDER BY total_revenue DESC
      LIMIT 50
    `);
    return result.rows;
  }

  async getRiderStats() {
    const result = await this.db.execute(sql`
      SELECT
        r.id, r.name, r.rider_code,
        r.completed_deliveries, r.rating_sum, r.rating_count,
        CASE WHEN r.rating_count > 0 THEN ROUND(r.rating_sum::numeric / r.rating_count, 2) ELSE 0 END as avg_rating
      FROM riders r
      WHERE r.account_status = 'active'
      ORDER BY r.completed_deliveries DESC
      LIMIT 50
    `);
    return result.rows;
  }
}
