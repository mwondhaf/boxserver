import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@ApiTags('Cart')
@ApiCookieAuth('session')
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Post('org/:orgId')
  @ApiOperation({ summary: 'Get or create cart for a vendor', description: 'Returns an existing active cart for this vendor, or creates a new one. Pass x-session-id for guest cart persistence across requests.' })
  @ApiParam({ name: 'orgId', example: 'org_01abc', description: 'Vendor organisation ID' })
  @ApiHeader({ name: 'x-session-id', required: false, description: 'Guest session ID for cart persistence without auth' })
  @ApiResponse({ status: 201, description: 'Cart object' })
  getOrCreate(
    @Actor() actor: ActorContext,
    @Param('orgId') orgId: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.service.getOrCreateCart(actor, orgId, sessionId);
  }

  @Get(':cartId')
  @ApiOperation({ summary: 'Get cart', description: 'Returns the cart with all items, quantities, and totals.' })
  @ApiParam({ name: 'cartId', example: 'cart_01abc' })
  @ApiResponse({ status: 200, description: 'Cart detail' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  get(@Param('cartId') cartId: string, @Actor() actor: ActorContext) {
    return this.service.getCart(cartId, actor);
  }

  @Post(':cartId/items')
  @ApiOperation({ summary: 'Add item to cart', description: 'Adds a variant to the cart. Include modifiers array if the product has required modifier groups.' })
  @ApiParam({ name: 'cartId', example: 'cart_01abc' })
  @ApiResponse({ status: 201, description: 'Updated cart' })
  addItem(
    @Param('cartId') cartId: string,
    @Actor() actor: ActorContext,
    @Body() dto: AddCartItemDto,
  ) {
    return this.service.addItem(cartId, actor, dto);
  }

  @Patch(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity', description: 'Set quantity to 0 to remove the item from the cart.' })
  @ApiParam({ name: 'cartId', example: 'cart_01abc' })
  @ApiParam({ name: 'itemId', example: 'citem_01abc' })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  updateItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Actor() actor: ActorContext,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.service.updateItem(cartId, itemId, actor, dto);
  }

  @Delete(':cartId')
  @ApiOperation({ summary: 'Clear cart', description: 'Removes all items from the cart.' })
  @ApiParam({ name: 'cartId', example: 'cart_01abc' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  clear(@Param('cartId') cartId: string, @Actor() actor: ActorContext) {
    return this.service.clearCart(cartId, actor);
  }
}
