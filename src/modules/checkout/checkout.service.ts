import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../db/drizzle.module';
import type { Db } from '../../db/client';
import { carts, cartItems, cartItemModifiers } from '../../db/schema/cart';
import { orders, orderItems, orderItemModifiers } from '../../db/schema/orders';
import {
  productVariants,
  moneyAmounts,
  priceSets,
} from '../../db/schema/catalog';
import { categoryPricingRules } from '../../db/schema/categories';
import { organizations } from '../../db/schema/identity';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { PricingEngine } from './pricing-engine.service';
import { CountersService } from '../../common/counters/counters.service';
import { EventBus } from '../../realtime/event-bus';
import { QuoteService } from '../zones/quote.service';
import type { ActorContext } from '../../auth/session.guard';
import type { QuoteDto, PlaceOrderDto } from './dto/checkout.dto';

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly settings: PlatformSettingsService,
    private readonly pricing: PricingEngine,
    private readonly counters: CountersService,
    private readonly eventBus: EventBus,
    private readonly quoteService: QuoteService,
  ) {}

  async quote(actor: ActorContext, dto: QuoteDto) {
    const cart = await this.getCartWithItems(dto.cartId);
    const s = await this.settings.getSettings();
    const org = await this.getOrg(cart.organizationId);

    const lines = await this.resolveLines(cart, s.markupEnabled);
    const deliveryFee = await this.resolveDeliveryFee(dto, org);

    const breakdown = this.pricing.compute({
      lines,
      deliveryFee,
      settings: s,
      minimumOrderAmount: org.minimumOrderAmount
        ? Number(org.minimumOrderAmount)
        : null,
    });

    if (
      org.minimumOrderAmount &&
      breakdown.subtotal < Number(org.minimumOrderAmount)
    ) {
      throw new BadRequestException(
        `Minimum order amount is ${org.minimumOrderAmount} UGX`,
      );
    }

    return breakdown;
  }

  async placeOrder(actor: ActorContext, dto: PlaceOrderDto) {
    const s = await this.settings.getSettings();

    // Payment method gate
    this.gatePaymentMethod(dto.paymentMethod, s);

    const cart = await this.getCartWithItems(dto.cartId);
    const org = await this.getOrg(cart.organizationId);
    const lines = await this.resolveLines(cart, s.markupEnabled);
    const deliveryFee = await this.resolveDeliveryFee(dto, org);

    const breakdown = this.pricing.compute({ lines, deliveryFee, settings: s });

    const displayId = await this.counters.nextValue('orders');

    const isGuest = !actor.userId;
    const vendorPickupCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    // Atomic: decrement stock + insert order
    const [order] = await this.db.transaction(async (tx) => {
      // Decrement stock
      for (const line of lines) {
        await tx
          .update(productVariants)
          .set({
            stockQuantity: sql`${productVariants.stockQuantity} - ${line.quantity}`,
          })
          .where(
            and(
              eq(productVariants.id, line.variantId),
              sql`${productVariants.stockQuantity} >= ${line.quantity}`,
            ),
          );
      }

      // Insert order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          displayId,
          organizationId: cart.organizationId,
          fulfillmentType:
            dto.fulfillmentType as (typeof orders.$inferInsert)['fulfillmentType'],
          paymentMethod:
            dto.paymentMethod as (typeof orders.$inferInsert)['paymentMethod'],
          userId: actor.userId || null,
          isGuest,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          customerAddressId: dto.customerAddressId,
          subtotal: breakdown.subtotal,
          total: breakdown.total,
          taxTotal: breakdown.taxTotal,
          discountTotal: breakdown.discountTotal,
          deliveryTotal: breakdown.deliveryFee,
          serviceFeeTotal: breakdown.serviceFee || null,
          smallOrderFeeTotal: breakdown.smallOrderFee || null,
          markupTotal: breakdown.markupTotal || null,
          deliveryQuoteId: dto.deliveryQuoteId,
          vendorPickupCode,
          status: 'pending',
          paymentStatus:
            dto.paymentMethod === 'cash_on_delivery' ? 'awaiting' : 'awaiting',
        })
        .returning();

      if (!newOrder) throw new BadRequestException('Failed to create order');

      // Insert order items with snapshots
      for (const line of breakdown.lines) {
        const cartLine = lines.find((l) => l.unitPrice === line.unitPrice);
        if (!cartLine) continue;

        const [item] = await tx
          .insert(orderItems)
          .values({
            orderId: newOrder.id,
            productId: cartLine.productId,
            variantId: cartLine.variantId,
            title: cartLine.title,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vendorUnitPrice: line.vendorUnitPrice,
            markupAmount: line.markupAmount,
            subtotal: line.subtotal,
            taxTotal: line.taxTotal,
          })
          .returning();

        // Snapshot modifiers
        if (item && cartLine.modifiers?.length) {
          await tx.insert(orderItemModifiers).values(
            cartLine.modifiers.map((m) => ({
              orderItemId: item.id,
              name: m.name,
              priceAdd: m.priceAdd,
              quantity: m.quantity,
            })),
          );
        }
      }

      // Clear cart
      await tx.delete(carts).where(eq(carts.id, dto.cartId));

      return [newOrder] as const;
    });

    // Mark delivery quote as used
    if (dto.deliveryQuoteId) {
      await this.quoteService.useQuote(dto.deliveryQuoteId).catch(() => null);
    }

    this.eventBus.emit('order.created', {
      orderId: order.id,
      organizationId: cart.organizationId,
    });

    return order;
  }

  private async getCartWithItems(cartId: string) {
    const cart = await this.db.query.carts.findFirst({
      where: eq(carts.id, cartId),
      with: {
        items: {
          with: {
            modifiers: { with: { option: true } },
            variant: {
              with: {
                product: true,
                priceSet: { with: { amounts: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) throw new NotFoundException('Cart not found');
    if (!cart.items.length) throw new BadRequestException('Cart is empty');
    return cart;
  }

  private async getOrg(orgId: string) {
    const org = await this.db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.isActive || org.isBusy) {
      throw new ConflictException(
        org.isBusy ? 'Vendor is busy' : 'Vendor is inactive',
      );
    }
    return org;
  }

  private async resolveLines(
    cart: {
      items: Array<{
        variantId: string;
        quantity: number;
        variant: {
          id: string;
          product?: { id?: string; name?: string } | null;
          priceSet: {
            amounts: Array<{ amount: number; saleAmount?: number | null }>;
          } | null;
        } | null;
        modifiers: Array<{
          option: { name: string; priceAdd: number } | null;
          quantity: number;
        }>;
      }>;
    },
    markupEnabled: boolean,
  ) {
    return cart.items.map((item) => {
      const amounts = item.variant?.priceSet?.amounts ?? [];
      const baseAmount = amounts[0]?.amount ?? 0;
      const saleAmount = amounts[0]?.saleAmount;
      const unitPrice = saleAmount ?? baseAmount;
      const modifiersTotal = item.modifiers.reduce(
        (s, m) => s + (m.option?.priceAdd ?? 0) * m.quantity,
        0,
      );
      const totalUnitPrice = unitPrice + modifiersTotal;

      return {
        variantId: item.variantId,
        productId: item.variant?.product?.id ?? '',
        title: item.variant?.product?.name ?? 'Unknown',
        quantity: item.quantity,
        unitPrice: totalUnitPrice,
        vendorUnitPrice: baseAmount,
        markupAmount: 0, // simplified; full markup via pricing.helper in production
        modifiers: item.modifiers
          .filter((m) => m.option)
          .map((m) => ({
            name: m.option!.name,
            priceAdd: m.option!.priceAdd,
            quantity: m.quantity,
          })),
      };
    });
  }

  private async resolveDeliveryFee(
    dto: QuoteDto,
    org: { selfDeliveryFee?: string | null },
  ): Promise<number> {
    if (dto.fulfillmentType === 'pickup') return 0;
    if (dto.fulfillmentType === 'self_delivery') {
      return org.selfDeliveryFee ? Number(org.selfDeliveryFee) : 0;
    }
    // Platform delivery — validate and return the quoted fee
    if (dto.deliveryQuoteId) {
      const quote = await this.quoteService.getQuote(dto.deliveryQuoteId);
      if (!quote) throw new BadRequestException('Delivery quote not found');
      if (quote.expiresAt < new Date()) {
        throw new BadRequestException('Delivery quote has expired');
      }
      return quote.deliveryFee;
    }
    return 0;
  }

  private gatePaymentMethod(
    method: string,
    s: {
      cashOnDeliveryEnabled: boolean;
      mobileMoneyCodEnabled: boolean;
      cardEnabled: boolean;
      walletEnabled: boolean;
    },
  ): void {
    if (method === 'cash_on_delivery' && !s.cashOnDeliveryEnabled) {
      throw new BadRequestException('Cash on delivery is not available');
    }
    if (method === 'mobile_money' && !s.mobileMoneyCodEnabled) {
      throw new BadRequestException('Mobile money is not available');
    }
    if (method === 'card' && !s.cardEnabled) {
      throw new BadRequestException('Card payment is not available');
    }
    if (method === 'wallet' && !s.walletEnabled) {
      throw new BadRequestException('Wallet payment is not available');
    }
  }
}
