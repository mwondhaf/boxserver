import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type Redis from 'ioredis';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { REDIS_TOKEN } from '../../common/redis/redis.module';
import { organizations } from '../../db/schema/identity';
import {
  products,
  productVariants,
  variantCollections,
} from '../../db/schema/catalog';
import type { StorefrontQueryDto } from './dto/catalog.dto';

const TTL = {
  vendorList: 60,    // 60 s — refreshes quickly as vendors go busy/offline
  vendorPage: 120,   // 2 min — menu changes are less frequent
  productList: 60,
  product: 120,
};

@Injectable()
export class StorefrontService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    @Inject(REDIS_TOKEN) private readonly redis: Redis | null,
  ) {}

  private async cached<T>(
    key: string,
    ttl: number,
    fetch: () => Promise<T>,
  ): Promise<T> {
    if (this.redis) {
      const hit = await this.redis.get(key);
      if (hit) return JSON.parse(hit) as T;
    }
    const data = await fetch();
    await this.redis?.set(key, JSON.stringify(data), 'EX', ttl);
    return data;
  }

  async listVendors(query: StorefrontQueryDto) {
    const key = `sf:vendors:${query.categoryId ?? 'all'}:${query.limit ?? 20}`;
    return this.cached(key, TTL.vendorList, () => {
      const conditions = [eq(organizations.isActive, true)];
      if (query.categoryId) conditions.push(eq(organizations.categoryId, query.categoryId));
      return this.db.query.organizations.findMany({
        where: and(...conditions),
        with: { category: true },
        limit: query.limit ?? 20,
      });
    });
  }

  async getVendor(slug: string) {
    const key = `sf:vendor:${slug}`;
    const result = await this.cached(key, TTL.vendorPage, async () => {
      const org = await this.db.query.organizations.findFirst({
        where: and(eq(organizations.slug, slug), eq(organizations.isActive, true)),
        with: {
          category: true,
          variantCollections: {
            where: eq(variantCollections.isActive, true),
            with: {
              items: {
                with: {
                  variant: {
                    with: {
                      product: { with: { images: true } },
                      priceSet: { with: { amounts: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      return org ?? null;
    });

    if (!result) throw new NotFoundException('Vendor not found');
    return result;
  }

  async listVendorProducts(organizationId: string, query: StorefrontQueryDto) {
    const key = `sf:products:${organizationId}:${query.limit ?? 20}`;
    return this.cached(key, TTL.productList, () =>
      this.db.query.products.findMany({
        where: and(
          eq(products.organizationId, organizationId),
          eq(products.isActive, true),
          eq(products.isApproved, true),
        ),
        with: {
          images: true,
          variants: {
            where: and(
              eq(productVariants.organizationId, organizationId),
              eq(productVariants.isAvailable, true),
            ),
            with: { priceSet: { with: { amounts: true } } },
          },
          modifierGroups: { with: { options: true } },
        },
        limit: query.limit ?? 20,
      }),
    );
  }

  async getProduct(productId: string) {
    const key = `sf:product:${productId}`;
    const result = await this.cached(key, TTL.product, async () => {
      const product = await this.db.query.products.findFirst({
        where: and(eq(products.id, productId), eq(products.isActive, true)),
        with: {
          images: true,
          tags: true,
          category: true,
          brand: true,
          variants: {
            with: { priceSet: { with: { amounts: true } } },
          },
          modifierGroups: { with: { options: true } },
        },
      });
      return product ?? null;
    });

    if (!result) throw new NotFoundException('Product not found');
    return result;
  }

  async invalidateVendor(slug: string, organizationId: string): Promise<void> {
    await this.redis?.del(`sf:vendor:${slug}`);
    await this.redis?.del(`sf:products:${organizationId}:20`);
    // pattern-delete vendor list variants
    const keys = await this.redis?.keys('sf:vendors:*');
    if (keys?.length) await this.redis?.del(...keys);
  }
}
