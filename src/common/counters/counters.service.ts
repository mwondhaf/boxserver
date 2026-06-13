import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { counters } from '../../db/schema/counters';

@Injectable()
export class CountersService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async nextValue(name: string): Promise<number> {
    const result = await this.db
      .insert(counters)
      .values({ name, value: 1 })
      .onConflictDoUpdate({
        target: counters.name,
        set: { value: sql`${counters.value} + 1` },
      })
      .returning({ value: counters.value });

    const row = result[0];
    if (!row) throw new Error(`Counter '${name}' failed to increment`);
    return row.value;
  }
}
