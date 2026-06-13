import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import type Redis from 'ioredis';
import { createDb } from '../db/client';
import * as schema from '../db/schema/index';

function createAuthInstance(databaseUrl: string, redis: Redis | null) {
  const db = createDb(databaseUrl);
  return betterAuth({
    appName: 'BoxServer',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        organization: schema.organizations,
        member: schema.members,
        invitation: schema.invitations,
      },
    }),
    ...(redis && {
      secondaryStorage: {
        get: (key: string) => redis.get(key),
        set: (key: string, value: string, ttl?: number) => {
          if (ttl) return redis.set(key, value, 'EX', ttl).then(() => undefined);
          return redis.set(key, value).then(() => undefined);
        },
        delete: (key: string) => redis.del(key).then(() => undefined),
      },
    }),
    emailAndPassword: { enabled: true },
    plugins: [organization()],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    user: {
      additionalFields: {
        phone: { type: 'string', required: false },
        platformRole: {
          type: 'string',
          required: false,
          defaultValue: 'customer',
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuthInstance>;

let _auth: Auth | undefined;

export function initAuth(databaseUrl: string, redis: Redis | null): void {
  if (!_auth) _auth = createAuthInstance(databaseUrl, redis);
}

export function getAuth(databaseUrl: string): Auth {
  if (!_auth) _auth = createAuthInstance(databaseUrl, null);
  return _auth;
}
