import type { Db } from '../client';
import { organizations } from '../schema/identity';
import {
  products,
  productVariants,
  priceSets,
  moneyAmounts,
  menuModifierGroups,
  menuModifierOptions,
} from '../schema/catalog';

const FOOD_ORG_ID = 'seed-org-spice-garden-001';
const GROCERY_ORG_ID = 'seed-org-fresh-mart-001';

async function seedOrganizations(db: Db): Promise<void> {
  await db
    .insert(organizations)
    .values([
      {
        id: FOOD_ORG_ID,
        name: 'Spice Garden Restaurant',
        slug: 'spice-garden',
        type: 'food',
        phone: '+256700000001',
        email: 'hello@spicegarden.ug',
        cityOrDistrict: 'Kampala',
        town: 'Nakasero',
        lat: '0.3163',
        lng: '32.5819',
        isActive: true,
        minimumOrderAmount: '15000',
        estimatedPrepTime: '25-35 mins',
        platformDeliveryEnabled: true,
        selfPickupEnabled: true,
        timezone: 'Africa/Kampala',
        businessHours: {
          mon: { open: '09:00', close: '21:00' },
          tue: { open: '09:00', close: '21:00' },
          wed: { open: '09:00', close: '21:00' },
          thu: { open: '09:00', close: '21:00' },
          fri: { open: '09:00', close: '22:00' },
          sat: { open: '10:00', close: '22:00' },
          sun: { open: '10:00', close: '20:00' },
        },
      },
      {
        id: GROCERY_ORG_ID,
        name: 'Fresh Mart',
        slug: 'fresh-mart',
        type: 'grocery',
        phone: '+256700000002',
        email: 'orders@freshmart.ug',
        cityOrDistrict: 'Kampala',
        town: 'Kololo',
        lat: '0.3350',
        lng: '32.5900',
        isActive: true,
        minimumOrderAmount: '10000',
        platformDeliveryEnabled: true,
        selfPickupEnabled: true,
        timezone: 'Africa/Kampala',
        businessHours: {
          mon: { open: '08:00', close: '20:00' },
          tue: { open: '08:00', close: '20:00' },
          wed: { open: '08:00', close: '20:00' },
          thu: { open: '08:00', close: '20:00' },
          fri: { open: '08:00', close: '21:00' },
          sat: { open: '08:00', close: '21:00' },
          sun: { open: '09:00', close: '18:00' },
        },
      },
    ])
    .onConflictDoNothing();
}

type ProductInput = {
  name: string;
  slug: string;
  description?: string;
  orgId: string;
  variants: Array<{
    unit: string;
    stockQuantity: number;
    price: number;
    salePrice?: number;
    modifierGroups?: Array<{
      name: string;
      required: boolean;
      options: Array<{ name: string; priceAdd: number }>;
    }>;
  }>;
};

async function seedProduct(db: Db, input: ProductInput): Promise<void> {
  const [product] = await db
    .insert(products)
    .values({
      name: input.name,
      slug: input.slug,
      description: input.description,
      organizationId: input.orgId,
      isActive: true,
      isApproved: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!product) return;

  for (const v of input.variants) {
    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: product.id,
        organizationId: input.orgId,
        unit: v.unit,
        stockQuantity: v.stockQuantity,
        isAvailable: true,
        isApproved: true,
      })
      .returning();

    if (!variant) continue;

    const [priceSet] = await db
      .insert(priceSets)
      .values({ variantId: variant.id, organizationId: input.orgId })
      .returning();

    if (!priceSet) continue;

    await db.insert(moneyAmounts).values({
      priceSetId: priceSet.id,
      amount: v.price,
      saleAmount: v.salePrice ?? null,
    });

    if (v.modifierGroups) {
      for (const mg of v.modifierGroups) {
        const [group] = await db
          .insert(menuModifierGroups)
          .values({
            productId: product.id,
            organizationId: input.orgId,
            name: mg.name,
            required: mg.required,
            maxSelections: mg.options.length,
          })
          .returning();

        if (!group) continue;

        await db.insert(menuModifierOptions).values(
          mg.options.map((o) => ({
            modifierGroupId: group.id,
            name: o.name,
            priceAdd: o.priceAdd,
          })),
        );
      }
    }
  }
}

export async function seedCatalog(db: Db): Promise<void> {
  await seedOrganizations(db);

  // --- Spice Garden (food) ---
  const foodItems: ProductInput[] = [
    {
      name: 'Chicken Pilau',
      slug: 'chicken-pilau',
      description: 'Fragrant basmati rice cooked with whole spices and chicken',
      orgId: FOOD_ORG_ID,
      variants: [
        {
          unit: 'plate',
          stockQuantity: 50,
          price: 18000,
          modifierGroups: [
            {
              name: 'Extras',
              required: false,
              options: [
                { name: 'Extra chicken', priceAdd: 5000 },
                { name: 'Kachumbari', priceAdd: 1000 },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Rolex',
      slug: 'rolex',
      description: 'Ugandan street-food wrap — chapati rolled with egg, veggies',
      orgId: FOOD_ORG_ID,
      variants: [
        { unit: 'single', stockQuantity: 100, price: 5000 },
        { unit: 'double egg', stockQuantity: 100, price: 7000 },
        { unit: 'special', stockQuantity: 50, price: 9000 },
      ],
    },
    {
      name: 'Matoke & Groundnut Stew',
      slug: 'matoke-groundnut-stew',
      description: 'Steamed green bananas with rich groundnut stew',
      orgId: FOOD_ORG_ID,
      variants: [{ unit: 'plate', stockQuantity: 40, price: 14000 }],
    },
    {
      name: 'Grilled Tilapia',
      slug: 'grilled-tilapia',
      description: 'Fresh Lake Victoria tilapia, charcoal-grilled with lemon',
      orgId: FOOD_ORG_ID,
      variants: [
        { unit: 'half (500g)', stockQuantity: 20, price: 22000 },
        { unit: 'full (1kg)', stockQuantity: 15, price: 40000 },
      ],
    },
    {
      name: 'Fresh Juice',
      slug: 'fresh-juice',
      description: 'Cold-pressed seasonal fruit juice',
      orgId: FOOD_ORG_ID,
      variants: [
        { unit: '400ml mango', stockQuantity: 30, price: 5000 },
        { unit: '400ml passion', stockQuantity: 30, price: 5000 },
        { unit: '400ml pineapple', stockQuantity: 30, price: 5000 },
      ],
    },
  ];

  for (const item of foodItems) {
    await seedProduct(db, item);
  }

  // --- Fresh Mart (grocery) ---
  const groceryItems: ProductInput[] = [
    {
      name: 'Fresh Milk',
      slug: 'fresh-milk',
      orgId: GROCERY_ORG_ID,
      variants: [
        { unit: '500ml', stockQuantity: 100, price: 3500 },
        { unit: '1L', stockQuantity: 100, price: 6500 },
      ],
    },
    {
      name: 'Bread (White)',
      slug: 'bread-white',
      orgId: GROCERY_ORG_ID,
      variants: [{ unit: 'loaf', stockQuantity: 80, price: 4500 }],
    },
    {
      name: 'Eggs',
      slug: 'eggs',
      orgId: GROCERY_ORG_ID,
      variants: [
        { unit: 'tray (30)', stockQuantity: 50, price: 18000 },
        { unit: '6-pack', stockQuantity: 100, price: 4500 },
      ],
    },
    {
      name: 'Rice (Basmati)',
      slug: 'rice-basmati',
      orgId: GROCERY_ORG_ID,
      variants: [
        { unit: '1kg bag', stockQuantity: 60, price: 8000 },
        { unit: '5kg bag', stockQuantity: 30, price: 36000 },
      ],
    },
    {
      name: 'Cooking Oil',
      slug: 'cooking-oil',
      orgId: GROCERY_ORG_ID,
      variants: [
        { unit: '500ml', stockQuantity: 80, price: 7500 },
        { unit: '1L', stockQuantity: 60, price: 14000 },
        { unit: '2L', stockQuantity: 40, price: 26000 },
      ],
    },
    {
      name: 'Tomatoes',
      slug: 'tomatoes',
      orgId: GROCERY_ORG_ID,
      variants: [{ unit: '500g', stockQuantity: 120, price: 3000 }],
    },
    {
      name: 'Avocado',
      slug: 'avocado',
      orgId: GROCERY_ORG_ID,
      variants: [
        { unit: 'single', stockQuantity: 200, price: 1500 },
        { unit: 'bag of 4', stockQuantity: 80, price: 5000 },
      ],
    },
  ];

  for (const item of groceryItems) {
    await seedProduct(db, item);
  }
}
