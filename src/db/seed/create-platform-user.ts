import 'dotenv/config';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../auth/better-auth';
import { createDb } from '../client';
import { users } from '../schema/index';

const VALID_ROLES = ['admin', 'rider', 'customer'] as const;
type PlatformRole = (typeof VALID_ROLES)[number];

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    email: { type: 'string' },
    password: { type: 'string' },
    role: { type: 'string', default: 'admin' },
  },
});

async function main(): Promise<void> {
  const { name, email, password, role } = values;

  if (!name || !email || !password) {
    console.error(
      'Usage: create-platform-user --name "Name" --email email@example.com --password "pass" [--role admin|rider|customer]',
    );
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role as PlatformRole)) {
    console.error(
      `Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`,
    );
    process.exit(1);
  }

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const auth = getAuth(databaseUrl);
  const db = createDb(databaseUrl);

  const result = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  const userId = result.user.id;

  await db
    .update(users)
    .set({ platformRole: role as PlatformRole })
    .where(eq(users.id, userId));

  console.log(`Created ${role} user: ${email} (id: ${userId})`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Failed:', message);
  process.exit(1);
});
