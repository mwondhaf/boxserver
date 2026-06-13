import type { Db } from '../client';
import { organizationCategories } from '../schema/identity';

export async function seedIdentity(db: Db): Promise<void> {
  // Seed organization categories
  await db
    .insert(organizationCategories)
    .values([
      { name: 'Food & Restaurants', slug: 'food-restaurants' },
      { name: 'Grocery & Supermarkets', slug: 'grocery-supermarkets' },
      { name: 'Pharmacy', slug: 'pharmacy' },
      { name: 'Electronics', slug: 'electronics' },
    ])
    .onConflictDoNothing();
}
