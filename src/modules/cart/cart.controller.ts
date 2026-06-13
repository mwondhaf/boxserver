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
import { CartService } from './cart.service';
import { Actor } from '../../auth/actor.decorator';
import type { ActorContext } from '../../auth/session.guard';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Post('org/:orgId')
  getOrCreate(
    @Actor() actor: ActorContext,
    @Param('orgId') orgId: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.service.getOrCreateCart(actor, orgId, sessionId);
  }

  @Get(':cartId')
  get(@Param('cartId') cartId: string, @Actor() actor: ActorContext) {
    return this.service.getCart(cartId, actor);
  }

  @Post(':cartId/items')
  addItem(
    @Param('cartId') cartId: string,
    @Actor() actor: ActorContext,
    @Body() dto: AddCartItemDto,
  ) {
    return this.service.addItem(cartId, actor, dto);
  }

  @Patch(':cartId/items/:itemId')
  updateItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Actor() actor: ActorContext,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.service.updateItem(cartId, itemId, actor, dto);
  }

  @Delete(':cartId')
  clear(@Param('cartId') cartId: string, @Actor() actor: ActorContext) {
    return this.service.clearCart(cartId, actor);
  }
}
