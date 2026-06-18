import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import slugify from 'slugify';
import { and, eq, isNull, or } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import {
  products,
  productVariants,
  priceSets,
  moneyAmounts,
  menuModifierGroups,
  menuModifierOptions,
  variantCollections,
} from '../../db/schema/catalog';
import type { ActorContext } from '../../auth/session.guard';
import { StorageService } from '../../common/storage/storage.service';
import type {
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  SetVariantPricesDto,
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  CreateCollectionDto,
} from './dto/catalog.dto';

@Injectable()
export class VendorCatalogService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly storage: StorageService,
  ) {}

  private requireOrg(actor: ActorContext): string {
    if (!actor.activeOrgId)
      throw new ForbiddenException('No active organization');
    return actor.activeOrgId;
  }

  private isPlatformAdmin(actor: ActorContext): boolean {
    return actor.platformRole === 'admin';
  }

  /**
   * Builds a "this product, scoped to the caller" filter.
   * Platform admins may act on any product even without an active org;
   * everyone else is restricted to products in their active organization.
   */
  private productScope(actor: ActorContext, productId: string) {
    if (this.isPlatformAdmin(actor)) {
      return eq(products.id, productId);
    }
    const orgId = this.requireOrg(actor);
    return and(eq(products.id, productId), eq(products.organizationId, orgId));
  }

  // Products
  async listVariants(actor: ActorContext) {
    const orgId = this.requireOrg(actor);
    const variants = await this.db.query.productVariants.findMany({
      where: eq(productVariants.organizationId, orgId),
      with: {
        product: { with: { images: true } },
        priceSet: { with: { amounts: true } },
      },
    });

    return variants.map((v) => {
      const primaryImage =
        v.product?.images?.find((img) => img.isPrimary) ??
        v.product?.images?.[0];
      return {
        ...v,
        product: v.product
          ? {
              id: v.product.id,
              name: v.product.name,
              imageUrl: primaryImage?.r2Key
                ? this.storage.getPublicUrl(primaryImage.r2Key)
                : null,
            }
          : null,
      };
    });
  }

  async deleteVariant(actor: ActorContext, variantId: string) {
    const orgId = this.requireOrg(actor);
    await this.db
      .delete(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.organizationId, orgId),
        ),
      );
    return { deleted: variantId };
  }

  async createProduct(actor: ActorContext, dto: CreateProductDto) {
    const orgId = this.requireOrg(actor);
    const slug = slugify(dto.name, { lower: true, strict: true });
    const [product] = await this.db
      .insert(products)
      .values({ ...dto, slug, organizationId: orgId })
      .returning();
    return product;
  }

  async listProducts(actor: ActorContext) {
    if (this.isPlatformAdmin(actor) && !actor.activeOrgId) {
      const rows = await this.db.query.products.findMany({
        with: {
          images: true,
          category: true,
          brand: true,
          variants: { with: { priceSet: { with: { amounts: true } } } },
        },
      });
      return rows.map((p) => ({
        ...p,
        images: p.images.map((img) => ({
          ...img,
          publicUrl: this.storage.getPublicUrl(img.r2Key),
        })),
      }));
    }

    const orgId = this.requireOrg(actor);
    // Return vendor's own products + approved platform products (organizationId = null)
    const rows = await this.db.query.products.findMany({
      where: or(
        eq(products.organizationId, orgId),
        and(
          isNull(products.organizationId),
          eq(products.isApproved, true),
          eq(products.isActive, true),
        ),
      ),
      with: {
        images: true,
        category: true,
        brand: true,
        // Only return the vendor's own variants so "variantCount" reflects their listings
        variants: {
          where: eq(productVariants.organizationId, orgId),
        },
      },
    });

    return rows.map((p) => ({
      ...p,
      images: p.images.map((img) => ({
        ...img,
        publicUrl: this.storage.getPublicUrl(img.r2Key),
      })),
    }));
  }

  async getProduct(actor: ActorContext, productId: string) {
    if (this.isPlatformAdmin(actor)) {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, productId),
        with: {
          images: true,
          tags: true,
          category: true,
          variants: { with: { priceSet: { with: { amounts: true } } } },
          modifierGroups: { with: { options: true } },
        },
      });
      if (!product) throw new NotFoundException('Product not found');
      return {
        ...product,
        images: product.images.map((img) => ({
          ...img,
          publicUrl: this.storage.getPublicUrl(img.r2Key),
        })),
      };
    }

    const orgId = this.requireOrg(actor);
    // Vendors can view their own products + approved platform products
    const product = await this.db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        or(
          eq(products.organizationId, orgId),
          and(isNull(products.organizationId), eq(products.isApproved, true)),
        ),
      ),
      with: {
        images: true,
        tags: true,
        category: true,
        // Only show the vendor's own listings for this product
        variants: {
          where: eq(productVariants.organizationId, orgId),
          with: { priceSet: { with: { amounts: true } } },
        },
        modifierGroups: { with: { options: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...product,
      images: product.images.map((img) => ({
        ...img,
        publicUrl: this.storage.getPublicUrl(img.r2Key),
      })),
    };
  }

  async updateProduct(
    actor: ActorContext,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const [updated] = await this.db
      .update(products)
      .set(dto)
      .where(this.productScope(actor, productId))
      .returning();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  async deleteProduct(actor: ActorContext, productId: string) {
    await this.db.delete(products).where(this.productScope(actor, productId));
    return { deleted: productId };
  }

  // Variants
  async createVariant(actor: ActorContext, dto: CreateVariantDto) {
    const orgId = this.requireOrg(actor);
    const [variant] = await this.db
      .insert(productVariants)
      .values({ ...dto, organizationId: orgId })
      .returning();

    // Create empty price set
    if (variant) {
      await this.db
        .insert(priceSets)
        .values({ variantId: variant.id, organizationId: orgId });
    }
    return variant;
  }

  async updateVariant(
    actor: ActorContext,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const orgId = this.requireOrg(actor);
    const [updated] = await this.db
      .update(productVariants)
      .set(dto)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.organizationId, orgId),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException('Variant not found');
    return updated;
  }

  // Prices
  async setVariantPrice(
    actor: ActorContext,
    variantId: string,
    dto: SetVariantPricesDto,
  ) {
    const orgId = this.requireOrg(actor);
    const priceSet = await this.db.query.priceSets.findFirst({
      where: eq(priceSets.variantId, variantId),
      with: { variant: true },
    });
    if (!priceSet || priceSet.variant?.organizationId !== orgId) {
      throw new NotFoundException('Price set not found');
    }

    // Replace the full set of amounts for this price set with the provided
    // tiers. moneyAmounts.priceSetId has no unique constraint and a variant may
    // carry several tiered prices, so we delete-then-insert the whole set.
    await this.db
      .delete(moneyAmounts)
      .where(eq(moneyAmounts.priceSetId, priceSet.id));

    if (dto.prices.length === 0) {
      return [];
    }

    const amounts = await this.db
      .insert(moneyAmounts)
      .values(
        dto.prices.map((tier) => ({
          priceSetId: priceSet.id,
          amount: tier.amount,
          saleAmount: tier.saleAmount ?? null,
          currency: tier.currency ?? 'UGX',
          minQuantity: tier.minQuantity ?? null,
          maxQuantity: tier.maxQuantity ?? null,
        })),
      )
      .returning();

    return amounts;
  }

  // Modifiers
  async createModifierGroup(actor: ActorContext, dto: CreateModifierGroupDto) {
    const orgId = this.requireOrg(actor);
    const [group] = await this.db
      .insert(menuModifierGroups)
      .values({ ...dto, organizationId: orgId })
      .returning();
    return group;
  }

  async createModifierOption(
    actor: ActorContext,
    dto: CreateModifierOptionDto,
  ) {
    const orgId = this.requireOrg(actor);
    const group = await this.db.query.menuModifierGroups.findFirst({
      where: and(
        eq(menuModifierGroups.id, dto.modifierGroupId),
        eq(menuModifierGroups.organizationId, orgId),
      ),
    });
    if (!group) throw new NotFoundException('Modifier group not found');

    const [option] = await this.db
      .insert(menuModifierOptions)
      .values(dto)
      .returning();
    return option;
  }

  // Collections
  async createCollection(actor: ActorContext, dto: CreateCollectionDto) {
    const orgId = this.requireOrg(actor);
    const [collection] = await this.db
      .insert(variantCollections)
      .values({ ...dto, organizationId: orgId })
      .returning();
    return collection;
  }

  async listCollections(actor: ActorContext) {
    const orgId = this.requireOrg(actor);
    return this.db.query.variantCollections.findMany({
      where: eq(variantCollections.organizationId, orgId),
      with: {
        items: {
          with: {
            variant: { with: { priceSet: { with: { amounts: true } } } },
          },
        },
      },
    });
  }
}
