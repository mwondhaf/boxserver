import 'dotenv/config';
import { getAuth } from './better-auth';

/**
 * Entry point for the Better Auth CLI (`@better-auth/cli generate`), wired up via
 * the `auth:generate` npm script.
 *
 * The CLI imports a top-level `auth` instance to introspect the configured
 * plugins, additional fields, and adapter schema, then emits a reference Drizzle
 * schema. Generation does not open a database connection (the pg Pool is lazy),
 * so a placeholder DATABASE_URL is acceptable when one isn't set.
 *
 * NOTE: the generated output is a *reference* only. The auth tables are
 * hand-maintained in `src/db/schema/identity.ts`; diff the generated file against
 * it by hand and apply changes deliberately — do not import the generated file.
 */
export const auth = getAuth(
  process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/boxserver',
);
