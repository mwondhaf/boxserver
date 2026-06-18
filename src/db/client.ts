import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';
import * as relations from './relations';

type FullSchema = typeof schema & typeof relations;

export type Db = NodePgDatabase<FullSchema>;

export function createDb(databaseUrl: string): Db {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema: { ...schema, ...relations } });
}
