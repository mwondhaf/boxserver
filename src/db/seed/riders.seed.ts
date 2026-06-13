import type { Db } from '../client';

// Rider seed requires a user to exist first (created via Better Auth signup).
// A demo active rider is created after identity setup completes.
export async function seedRiders(_db: Db): Promise<void> {
  // Placeholder — actual rider seed is done after identity + auth setup.
}
