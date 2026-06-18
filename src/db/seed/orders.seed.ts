import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { productVariants } from '../schema/catalog';
import { members, users } from '../schema/identity';
import { orders, orderItems, orderEvents } from '../schema/orders';
import type { Order } from '../schema/orders';

const FOOD_ORG_ID = 'seed-org-spice-garden-001';
const GROCERY_ORG_ID = 'seed-org-fresh-mart-001';

type OrderStatus = Order['status'];

// A realistic spread across the fulfillment lifecycle so every board column and
// the admin "all orders" view has data to show.
const STATUS_PLAN: OrderStatus[] = [
  'pending',
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'completed',
  'completed',
  'cancelled',
];

const GUESTS = [
  { name: 'Amara Nakato', phone: '+256772000111' },
  { name: 'Brian Okello', phone: '+256772000222' },
  { name: 'Cynthia Auma', phone: '+256772000333' },
  { name: 'David Ssali', phone: '+256772000444' },
  { name: 'Esther Naluwu', phone: '+256772000555' },
];

const DELIVERY_FEE = 3000;
const PICKUP_CODE_STATUSES: OrderStatus[] = [
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'completed',
];

type SeedVariant = {
  id: string;
  productId: string;
  title: string;
  price: number;
};

async function loadVariants(db: Db, orgId: string): Promise<SeedVariant[]> {
  const rows = await db.query.productVariants.findMany({
    where: eq(productVariants.organizationId, orgId),
    with: {
      product: { columns: { name: true } },
      priceSet: { with: { amounts: true } },
    },
    limit: 12,
  });

  return rows
    .map((v) => {
      const amount = v.priceSet?.amounts?.[0];
      const price = amount?.saleAmount ?? amount?.amount ?? 0;
      return {
        id: v.id,
        productId: v.productId,
        title: `${v.product?.name ?? 'Item'} (${v.unit})`,
        price,
      };
    })
    .filter((v) => v.price > 0);
}

const DEFAULT_GUEST = { name: 'Walk-in Guest', phone: '+256700000000' };

function pickItems(variants: SeedVariant[], count: number): SeedVariant[] {
  const pool = [...variants];
  const picked: SeedVariant[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [item] = pool.splice(idx, 1);
    if (item) picked.push(item);
  }
  return picked;
}

export async function seedOrdersForOrg(
  db: Db,
  orgId: string,
  startDisplayId: number,
): Promise<number> {
  const variants = await loadVariants(db, orgId);
  if (variants.length === 0) {
    console.warn(`  No priced variants for ${orgId} — skipping orders`);
    return startDisplayId;
  }

  let displayId = startDisplayId;

  for (const [i, status] of STATUS_PLAN.entries()) {
    const guest = GUESTS[i % GUESTS.length] ?? DEFAULT_GUEST;
    const itemCount = 1 + (i % 3);
    const chosen = pickItems(variants, itemCount);

    const items = chosen.map((v) => {
      const quantity = 1 + (i % 2);
      return {
        productId: v.productId,
        variantId: v.id,
        title: v.title,
        quantity,
        unitPrice: v.price,
        subtotal: v.price * quantity,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
    const isCancelled = status === 'cancelled';
    const deliveryTotal = isCancelled ? 0 : DELIVERY_FEE;
    const total = subtotal + deliveryTotal;
    const isPaid =
      status === 'completed' ||
      status === 'delivered' ||
      status === 'out_for_delivery';

    // Stagger creation times so the newest-first ordering is meaningful.
    const createdAt = new Date(Date.now() - i * 45 * 60 * 1000);

    const [order] = await db
      .insert(orders)
      .values({
        displayId: displayId++,
        organizationId: orgId,
        status,
        paymentStatus: isCancelled
          ? 'awaiting'
          : isPaid
            ? 'captured'
            : 'awaiting',
        fulfillmentType: 'delivery',
        paymentMethod: 'cash_on_delivery',
        isGuest: true,
        guestName: guest.name,
        guestPhone: guest.phone,
        deliveryPhone: guest.phone,
        deliveryDescription: 'Near the main stage, blue gate',
        subtotal,
        total,
        deliveryTotal,
        currencyCode: 'UGX',
        vendorPickupCode: PICKUP_CODE_STATUSES.includes(status)
          ? String(1000 + Math.floor(Math.random() * 9000))
          : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    if (!order) continue;

    await db
      .insert(orderItems)
      .values(items.map((it) => ({ ...it, orderId: order.id })));

    await db.insert(orderEvents).values({
      orderId: order.id,
      actorRole: 'system',
      eventType: 'order.created',
      toStatus: status,
      reason: 'Seeded demo order',
      createdAt,
    });
  }

  return displayId;
}

export async function seedOrders(db: Db): Promise<void> {
  const existing = await db.query.orders.findFirst({ columns: { id: true } });
  if (existing) {
    console.log('  Orders already present — skipping order seed');
    return;
  }

  let nextDisplayId = 1001;
  nextDisplayId = await seedOrdersForOrg(db, FOOD_ORG_ID, nextDisplayId);
  await seedOrdersForOrg(db, GROCERY_ORG_ID, nextDisplayId);
}

/**
 * Seeds a spread of demo orders for a real (signed-up) vendor's organisation,
 * looked up by the owner's email. Unlike {@link seedOrders}, this targets an
 * organisation that isn't part of the fixed catalog seed, so it's keyed off the
 * account that actually owns the store. Idempotent per-org: if that vendor
 * already has orders it does nothing, so it's safe to re-run on a live DB.
 */
export async function seedVendorOrdersByEmail(
  db: Db,
  email: string,
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (!user) {
    console.warn(`  No user '${email}' — skipping vendor order seed`);
    return;
  }

  // Prefer the org the user owns; fall back to any membership.
  const membership =
    (await db.query.members.findFirst({
      where: and(eq(members.userId, user.id), eq(members.role, 'owner')),
      columns: { organizationId: true },
    })) ??
    (await db.query.members.findFirst({
      where: eq(members.userId, user.id),
      columns: { organizationId: true },
    }));
  if (!membership) {
    console.warn(`  '${email}' has no organisation — skipping`);
    return;
  }

  const orgId = membership.organizationId;
  const existing = await db.query.orders.findFirst({
    where: eq(orders.organizationId, orgId),
    columns: { id: true },
  });
  if (existing) {
    console.log(`  Vendor '${email}' already has orders — skipping`);
    return;
  }

  const rows = await db
    .select({
      maxDisplayId: sql<number>`coalesce(max(${orders.displayId}), 1000)`,
    })
    .from(orders);
  const startDisplayId = Number(rows[0]?.maxDisplayId ?? 1000) + 1;

  const seeded = await seedOrdersForOrg(db, orgId, startDisplayId);
  if (seeded === startDisplayId) {
    console.warn(
      `  '${email}' org has no priced variants — no orders created`,
    );
  } else {
    console.log(`  Seeded demo orders for vendor '${email}'`);
  }
}
