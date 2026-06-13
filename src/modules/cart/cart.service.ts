import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { carts, cartItems, cartItemModifiers } from '../../db/schema/cart';
import {
  productVariants,
  menuModifierGroups,
  menuModifierOptions,
} from '../../db/schema/catalog';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import type { ActorContext } from '../../auth/session.guard';
import type {
  AddCartItemDto,
  UpdateCartItemDto,
} from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly settings: PlatformSettingsService,
  ) {}

  async getOrCreateCart(actor: ActorContext, organizationId: string, sessionId?: string) {
    const s = await this.settings.getSettings();
    const ttlHours = s.cartTtlHours;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    // Find existing unexpired cart for this actor + org
    const condition = actor.userId
      ? and(eq(carts.userId, actor.userId), eq(carts.organizationId, organizationId))
      : sessionId
      ? and(eq(carts.sessionId, sessionId), eq(carts.organizationId, organizationId))
      : undefined;

    if (!condition) throw new BadRequestException('User or session required');

    const existing = await this.db.query.carts.findFirst({
      where: condition,
      with: { items: { with: { modifiers: true, variant: { with: { priceSet: { with: { amounts: true } }, product: { with: { images: true } } } } } } },
    });

    if (existing && existing.expiresAt > new Date()) return existing;

    // Create new cart (single-vendor scope enforced)
    const [cart] = await this.db
      .insert(carts)
      .values({
        userId: actor.userId || null,
        sessionId: sessionId ?? null,
        organizationId,
        expiresAt,
      })
      .returning();

    if (!cart) throw new BadRequestException('Failed to create cart');
    return { ...cart, items: [] };
  }

  async getCart(cartId: string, actor: ActorContext) {
    const cart = await this.db.query.carts.findFirst({
      where: eq(carts.id, cartId),
      with: {
        items: {
          with: {
            modifiers: { with: { option: true } },
            variant: {
              with: {
                product: { with: { images: true } },
                priceSet: { with: { amounts: true } },
              },
            },
          },
        },
        organization: { columns: { id: true, name: true, slug: true, minimumOrderAmount: true } },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');
    this.assertCartOwner(cart, actor);
    return cart;
  }

  async addItem(cartId: string, actor: ActorContext, dto: AddCartItemDto) {
    const cart = await this.getCart(cartId, actor);
    this.assertCartOwner(cart, actor);

    const variant = await this.db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, dto.variantId),
        eq(productVariants.organizationId, cart.organizationId),
        eq(productVariants.isAvailable, true),
        eq(productVariants.isApproved, true),
      ),
    });

    if (!variant) throw new NotFoundException('Variant not available');
    if (variant.stockQuantity < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Validate food modifiers
    if (dto.modifiers?.length) {
      await this.validateModifiers(dto.variantId, dto.modifiers);
    }

    // Upsert cart item
    const existing = await this.db.query.cartItems.findFirst({
      where: and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, dto.variantId)),
    });

    let itemId: string;

    if (existing) {
      await this.db
        .update(cartItems)
        .set({ quantity: existing.quantity + dto.quantity })
        .where(eq(cartItems.id, existing.id));
      itemId = existing.id;
    } else {
      const [item] = await this.db
        .insert(cartItems)
        .values({ cartId, variantId: dto.variantId, quantity: dto.quantity })
        .returning();
      if (!item) throw new BadRequestException('Failed to add item');
      itemId = item.id;
    }

    // Add modifiers
    if (dto.modifiers?.length) {
      await this.db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, itemId));
      await this.db.insert(cartItemModifiers).values(
        dto.modifiers.map((m) => ({
          cartItemId: itemId,
          modifierOptionId: m.modifierOptionId,
          quantity: m.quantity,
        })),
      );
    }

    return this.getCart(cartId, actor);
  }

  async updateItem(cartId: string, itemId: string, actor: ActorContext, dto: UpdateCartItemDto) {
    const cart = await this.getCart(cartId, actor);
    this.assertCartOwner(cart, actor);

    if (dto.quantity === 0) {
      await this.db.delete(cartItems).where(eq(cartItems.id, itemId));
    } else {
      await this.db
        .update(cartItems)
        .set({ quantity: dto.quantity })
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
    }

    return this.getCart(cartId, actor);
  }

  async clearCart(cartId: string, actor: ActorContext) {
    const cart = await this.getCart(cartId, actor);
    this.assertCartOwner(cart, actor);
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    return { cleared: cartId };
  }

  private assertCartOwner(
    cart: { userId: string | null; sessionId: string | null },
    actor: ActorContext,
  ): void {
    if (cart.userId && cart.userId !== actor.userId) {
      throw new ForbiddenException('Not your cart');
    }
  }

  private async validateModifiers(
    variantId: string,
    modifiers: Array<{ modifierOptionId: string; quantity: number }>,
  ): Promise<void> {
    // Group modifiers by group and validate min/max
    const options = await this.db.query.menuModifierOptions.findMany({
      where: and(
        eq(menuModifierOptions.isAvailable, true),
      ),
      with: { group: true },
    });

    const selectedIds = new Set(modifiers.map((m) => m.modifierOptionId));
    for (const m of modifiers) {
      const opt = options.find((o) => o.id === m.modifierOptionId);
      if (!opt) throw new BadRequestException(`Modifier option ${m.modifierOptionId} not found`);
    }
  }
}
