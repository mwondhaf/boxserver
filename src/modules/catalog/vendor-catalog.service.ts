import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
import type {
  CreateProductDto,
  UpdateProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  CreatePriceDto,
  CreateModifierGroupDto,
  CreateModifierOptionDto,
  CreateCollectionDto,
} from './dto/catalog.dto';

@Injectable()
export class VendorCatalogService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  private requireOrg(actor: ActorContext): string {
    if (!actor.activeOrgId)
      throw new ForbiddenException('No active organization');
    return actor.activeOrgId;
  }

  // Products
  async createProduct(actor: ActorContext, dto: CreateProductDto) {
    const orgId = this.requireOrg(actor);
    const [product] = await this.db
      .insert(products)
      .values({ ...dto, organizationId: orgId })
      .returning();
    return product;
  }

  async listProducts(actor: ActorContext) {
    const orgId = this.requireOrg(actor);
    return this.db.query.products.findMany({
      where: eq(products.organizationId, orgId),
      with: { images: true, variants: { with: { priceSet: { with: { amounts: true } } } } },
    });
  }

  async getProduct(actor: ActorContext, productId: string) {
    const orgId = this.requireOrg(actor);
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.organizationId, orgId)),
      with: {
        images: true,
        tags: true,
        variants: { with: { priceSet: { with: { amounts: true } } } },
        modifierGroups: { with: { options: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(actor: ActorContext, productId: string, dto: UpdateProductDto) {
    const orgId = this.requireOrg(actor);
    const [updated] = await this.db
      .update(products)
      .set(dto)
      .where(and(eq(products.id, productId), eq(products.organizationId, orgId)))
      .returning();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  async deleteProduct(actor: ActorContext, productId: string) {
    const orgId = this.requireOrg(actor);
    await this.db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.organizationId, orgId)));
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

  async updateVariant(actor: ActorContext, variantId: string, dto: UpdateVariantDto) {
    const orgId = this.requireOrg(actor);
    const [updated] = await this.db
      .update(productVariants)
      .set(dto)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.organizationId, orgId)))
      .returning();
    if (!updated) throw new NotFoundException('Variant not found');
    return updated;
  }

  // Prices
  async setVariantPrice(actor: ActorContext, variantId: string, dto: CreatePriceDto) {
    const orgId = this.requireOrg(actor);
    const priceSet = await this.db.query.priceSets.findFirst({
      where: eq(priceSets.variantId, variantId),
      with: { variant: true },
    });
    if (!priceSet || priceSet.variant?.organizationId !== orgId) {
      throw new NotFoundException('Price set not found');
    }

    const [amount] = await this.db
      .insert(moneyAmounts)
      .values({ priceSetId: priceSet.id, ...dto, currency: dto.currency ?? 'UGX' })
      .onConflictDoUpdate({
        target: [moneyAmounts.priceSetId],
        set: { amount: dto.amount, saleAmount: dto.saleAmount ?? null },
      })
      .returning();

    return amount;
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

  async createModifierOption(actor: ActorContext, dto: CreateModifierOptionDto) {
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
      with: { items: { with: { variant: { with: { priceSet: { with: { amounts: true } } } } } } },
    });
  }
}
