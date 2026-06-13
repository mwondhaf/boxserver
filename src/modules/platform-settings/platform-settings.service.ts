import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type Redis from 'ioredis';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { REDIS_TOKEN } from '../../common/redis/redis.module';
import {
  platformSettings,
  type PlatformSettings,
  type NewPlatformSettings,
} from '../../db/schema/platform-settings';

const CACHE_KEY = 'platform:settings';
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  private inProcess: PlatformSettings | null = null;

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    @Inject(REDIS_TOKEN) private readonly redis: Redis | null,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.getSettings();
  }

  async getSettings(): Promise<PlatformSettings> {
    // 1. In-process memory (sub-microsecond)
    if (this.inProcess) return this.inProcess;

    // 2. Redis (sub-millisecond across restarts / instances)
    if (this.redis) {
      const cached = await this.redis.get(CACHE_KEY);
      if (cached) {
        this.inProcess = JSON.parse(cached) as PlatformSettings;
        return this.inProcess;
      }
    }

    // 3. Postgres
    const rows = await this.db.query.platformSettings.findMany({
      where: eq(platformSettings.key, 'platform'),
      limit: 1,
    });

    let setting = rows[0];

    if (!setting) {
      const defaults: NewPlatformSettings = {
        key: 'platform',
        unconfirmedOrderTimeoutMinutes: 60,
        riderOfferWindowSeconds: 60,
        riderLeadTimeMinutes: 15,
        cartTtlHours: 24,
      };
      const inserted = await this.db
        .insert(platformSettings)
        .values(defaults)
        .returning();
      setting = inserted[0];
      if (!setting) throw new Error('Failed to seed platform settings');
    }

    this.inProcess = setting;
    await this.redis?.set(CACHE_KEY, JSON.stringify(setting), 'EX', CACHE_TTL);
    return setting;
  }

  async updateSettings(
    patch: Partial<NewPlatformSettings>,
    updatedBy: string,
  ): Promise<PlatformSettings> {
    const current = await this.getSettings();

    const updated = await this.db
      .update(platformSettings)
      .set({ ...patch, updatedBy, updatedAt: new Date() })
      .where(eq(platformSettings.id, current.id))
      .returning();

    const setting = updated[0];
    if (!setting) throw new Error('Platform settings not found for update');

    this.inProcess = setting;
    await this.redis?.set(CACHE_KEY, JSON.stringify(setting), 'EX', CACHE_TTL);
    return setting;
  }

  invalidateCache(): void {
    this.inProcess = null;
    void this.redis?.del(CACHE_KEY);
  }
}
